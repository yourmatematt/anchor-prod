/**
 * Guardian Notification Service for Anchor
 *
 * Sends SMS notifications to guardians via Twilio when interventions trigger.
 * Backported from original anchor codebase, adapted to ESM and anchor-prod's
 * single-user MVP schema.
 *
 * Features:
 * - Twilio SMS (direct HTTP, no SDK dependency)
 * - Rate limiting (1 SMS per guardian per 5 minutes)
 * - Notification logging to Supabase
 * - Conversation summary notifications
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Send SMS via Twilio REST API (no SDK needed)
 */
async function sendSMSViaTwilio(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn('Twilio credentials not configured — SMS not sent');
    return { success: false, reason: 'twilio_not_configured' };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
      }
    );

    const result = await response.json();

    if (response.ok) {
      console.log('SMS sent:', result.sid);
      return { success: true, sid: result.sid };
    } else {
      console.error('Twilio error:', result);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get the guardian for the current user.
 * MVP: single-user, so we grab the first active guardian.
 * Multi-user: pass userId and filter by user_id.
 */
async function getGuardian(userId) {
  // Try anchor-180 schema first (guardians table with user_id)
  let query = supabase.from('guardians').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.limit(1).single();

  if (error) {
    console.warn('No guardian found:', error.message);
    return null;
  }

  return data;
}

/**
 * Build SMS message from classification result
 */
function buildAlertMessage(classification, guardianName) {
  const { score, patterns, context } = classification;
  const amount = context.amount;
  const desc = context.description;
  const timeNote = context.isLateNight ? ' (LATE NIGHT)' : '';

  // Pick primary pattern for message template
  const primary = patterns[0]?.type || 'UNKNOWN';

  const templates = {
    GAMBLING_VENUE: `ANCHOR ALERT: Gambling venue detected — "${desc}"${timeNote}. Risk score: ${score}/100. AI intervention triggered.`,
    CRYPTO_EXCHANGE: `ANCHOR ALERT: Crypto transaction — "${desc}". $${amount}${timeNote}. Risk score: ${score}/100.`,
    CASH_WITHDRAWAL: `ANCHOR ALERT: Cash withdrawal $${amount}${timeNote}. Risk score: ${score}/100. Red flag.`,
    PAYDAY_LOAN: `ANCHOR ALERT: Payday loan detected — "${desc}". $${amount}. Risk score: ${score}/100. Intervention triggered.`,
    LATE_NIGHT_VENUE: `ANCHOR ALERT: Late night venue spend — "${desc}". $${amount}. Risk score: ${score}/100.`,
  };

  return templates[primary] ||
    `ANCHOR ALERT: Suspicious transaction — "${desc}". $${amount}${timeNote}. Risk score: ${score}/100.`;
}

/**
 * Log notification to Supabase
 */
async function logNotification(guardianId, type, message, success, metadata = {}) {
  try {
    await supabase
      .from('guardian_notifications')
      .insert({
        guardian_id: guardianId,
        type: type,
        message: message,
        sent_at: new Date().toISOString(),
        delivery_status: success ? 'delivered' : 'failed',
        metadata: metadata,
      });
  } catch (err) {
    console.error('Failed to log notification:', err);
  }
}

/**
 * Check rate limit: max 1 SMS per 5 minutes per guardian
 */
async function isRateLimited(guardianId) {
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data } = await supabase
    .from('guardian_notifications')
    .select('id')
    .eq('guardian_id', guardianId)
    .gte('sent_at', cutoff)
    .limit(1);

  return (data?.length || 0) > 0;
}

/**
 * Main notification function — called by the core loop
 *
 * @param {Object} classification - Output from risk-classifier
 * @param {string} transactionId - Up Bank transaction ID
 * @param {string} userId - Optional user ID for multi-user
 * @returns {Object} { success, message, guardianName }
 */
export async function notifyGuardian(classification, transactionId, userId = null) {
  try {
    const guardian = await getGuardian(userId);
    if (!guardian) {
      return { success: false, reason: 'no_guardian' };
    }

    if (!guardian.phone) {
      return { success: false, reason: 'no_phone_number' };
    }

    // Rate limit check
    if (await isRateLimited(guardian.id)) {
      console.log('Rate limited for guardian:', guardian.id);
      return { success: false, reason: 'rate_limited' };
    }

    const message = buildAlertMessage(classification, guardian.name);
    const smsResult = await sendSMSViaTwilio(guardian.phone, message);

    await logNotification(
      guardian.id,
      classification.patterns[0]?.type || 'ALERT',
      message,
      smsResult.success,
      { transactionId, score: classification.score, classification: classification.classification }
    );

    return {
      success: smsResult.success,
      message,
      guardianName: guardian.name,
      guardianId: guardian.id,
    };
  } catch (error) {
    console.error('Guardian notification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send conversation outcome summary to guardian
 */
export async function sendConversationSummary(conversationId, outcome, userId = null) {
  try {
    const guardian = await getGuardian(userId);
    if (!guardian || !guardian.phone) {
      return { success: false, reason: 'no_guardian' };
    }

    const outcomeMessages = {
      confirmed_gambling: 'AI conversation complete: Gambling confirmed. Clean streak reset. They need support right now.',
      false_alarm: 'AI conversation complete: False alarm. Transaction was legitimate.',
      needs_follow_up: 'AI conversation flagged for follow-up. Check in with them when you can.',
      concerning: 'AI conversation raised concerns. Consider reaching out.',
      completed: 'AI intervention conversation completed.',
    };

    const message = `ANCHOR UPDATE: ${outcomeMessages[outcome] || outcomeMessages.completed}`;
    const smsResult = await sendSMSViaTwilio(guardian.phone, message);

    await logNotification(
      guardian.id,
      'CONVERSATION_SUMMARY',
      message,
      smsResult.success,
      { conversationId, outcome }
    );

    return { success: smsResult.success, message };
  } catch (error) {
    console.error('Conversation summary error:', error);
    return { success: false, error: error.message };
  }
}

export default { notifyGuardian, sendConversationSummary };
