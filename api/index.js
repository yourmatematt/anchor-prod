/**
 * Anchor API - Consolidated Express Server
 * Single entry point for Vercel deployment with 12 function limit
 */

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { getAIResponse, analyzeTranscript, formatMessageHistory, TriggerType } from './services/ai-conversation.mjs';
import { classifyTransaction, buildAIContext } from './services/risk-classifier.mjs';
import { notifyGuardian, sendConversationSummary } from './services/guardian-notifier.mjs';

const app = express();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware
app.use(express.json());
app.use(express.raw({ type: 'application/json' }));

// CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// ========================
// HEALTH CHECK ENDPOINT
// ========================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      supabase: !!process.env.SUPABASE_URL,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      upBank: !!process.env.UP_WEBHOOK_SECRET
    }
  });
});

// ========================
// UP BANK WEBHOOK
// ========================

/**
 * Validate Up Bank webhook signature
 */
function validateWebhookSignature(payload, signature, secret) {
  if (!secret) {
    console.warn('No webhook secret configured - skipping signature validation');
    return true; // Allow in development
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Check if payee is on whitelist
 */
async function isWhitelisted(payeeName) {
  if (!payeeName) return false;

  const { data, error } = await supabase
    .from('whitelist')
    .select('*')
    .ilike('payee_name', payeeName)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking whitelist:', error);
    return false;
  }

  return data !== null;
}

/**
 * Log transaction to database
 */
async function logTransaction(transaction, isWhitelisted) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      transaction_id: transaction.id,
      amount: parseFloat(transaction.attributes.amount.value),
      payee_name: transaction.attributes.description,
      description: transaction.attributes.rawText || transaction.attributes.description,
      is_whitelisted: isWhitelisted,
      timestamp: transaction.attributes.createdAt,
      intervention_completed: isWhitelisted
    });

  if (error) {
    console.error('Error logging transaction:', error);
    throw error;
  }

  return data;
}

/**
 * Core loop: process transaction through classify → conversation → guardian
 */
async function runCoreLoop(transaction, whitelisted) {
  const txData = {
    description: transaction.attributes.description,
    amount: parseFloat(transaction.attributes.amount.value),
    timestamp: transaction.attributes.createdAt,
  };

  // Step 1: Classify
  const classification = classifyTransaction(txData, { isWhitelisted: whitelisted });

  console.log('Classification:', {
    score: classification.score,
    classification: classification.classification,
    action: classification.action,
    transactionId: transaction.id,
  });

  // Store classification in DB
  try {
    await supabase
      .from('transactions')
      .update({
        risk_score: classification.score,
        classification: classification.classification,
      })
      .eq('transaction_id', transaction.id);
  } catch (err) {
    console.warn('Failed to update transaction classification:', err);
  }

  // Step 2: AI conversation (score 41-80)
  let conversationResult = null;
  if (classification.triggerAI) {
    const aiContext = buildAIContext(classification);

    // Get real user stats from DB
    const stats = await getUserStats(null);
    const userData = {
      cleanStreak: stats.cleanStreak,
      totalSpend: Math.abs(txData.amount) + stats.totalSpend,
      lastTransaction: `$${Math.abs(txData.amount)} at ${txData.description}`,
    };

    const triggerType = classification.score >= 70 ? TriggerType.IMMEDIATE : TriggerType.PATTERN;
    const triggerTypeStr = classification.score >= 70 ? 'immediate' : 'pattern';

    // Look up DB id for the transaction
    let txDbId = null;
    try {
      const { data: txRow } = await supabase
        .from('transactions')
        .select('id')
        .eq('transaction_id', transaction.id)
        .single();
      txDbId = txRow?.id || null;
    } catch (err) {
      console.warn('Failed to look up transaction DB id:', err);
    }

    // Create conversation in DB
    const dbConvId = await createConversationInDB(triggerTypeStr, txDbId);

    const userMessage = `I just spent $${Math.abs(txData.amount)} at ${txData.description}. ${aiContext.questions[0] || ''}`;
    await saveMessageToDB(dbConvId, 'user', userMessage);

    const aiResponse = await getAIResponse({
      messages: [{ role: 'user', content: userMessage }],
      trigger: triggerType,
      userData,
    });

    await saveMessageToDB(dbConvId, 'assistant', aiResponse);
    await updateConversationInDB(dbConvId, 2, false);

    conversationResult = { response: aiResponse, context: aiContext, conversationId: dbConvId };
  }

  // Step 3: Guardian notification (score 61+)
  let guardianResult = null;
  if (classification.triggerGuardian) {
    guardianResult = await notifyGuardian(classification, transaction.id);
    console.log('Guardian notification:', guardianResult);
  }

  return { classification, conversationResult, guardianResult };
}

app.post('/webhook/up-bank', async (req, res) => {
  try {
    // Get raw body and signature
    const signature = req.headers['x-up-authenticity-signature'];
    const payload = JSON.stringify(req.body);

    // Validate signature (skip in development if no secret)
    if (!validateWebhookSignature(payload, signature, process.env.UP_WEBHOOK_SECRET)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse webhook payload
    const webhookData = req.body;
    const eventType = webhookData.data?.attributes?.eventType;

    if (eventType !== 'TRANSACTION_CREATED') {
      return res.status(200).json({ message: 'Event type not handled' });
    }

    const transactionData = webhookData.data?.relationships?.transaction?.data;
    const transactionId = transactionData?.id;

    if (!transactionData) {
      return res.status(400).json({ error: 'No transaction data found' });
    }

    // Get full transaction details from included data
    const transaction = webhookData.included?.find(item =>
      item.type === 'transactions' && item.id === transactionId
    );

    if (!transaction) {
      return res.status(400).json({ error: 'Transaction details not found' });
    }

    // Check if payee is whitelisted
    const payeeName = transaction.attributes.description;
    const whitelisted = await isWhitelisted(payeeName);

    // Log transaction to database
    await logTransaction(transaction, whitelisted);

    // Run core loop: classify → AI conversation → guardian notification
    const result = await runCoreLoop(transaction, whitelisted);

    return res.status(200).json({
      message: 'Webhook processed',
      whitelisted,
      transactionId,
      score: result.classification.score,
      classification: result.classification.classification,
      action: result.classification.action,
      guardianNotified: result.guardianResult?.success || false,
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================
// TRANSACTIONS API
// ========================
const UP_API_BASE = 'https://api.up.com.au/api/v1';

app.get('/api/transactions', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // Fetch transactions from Up Bank
    const response = await fetch(`${UP_API_BASE}/transactions?page[size]=20`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Up Bank API responded with ${response.status}`);
    }

    const data = await response.json();
    return res.json(data);

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ========================
// WHITELIST API
// ========================
app.get('/api/whitelist', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whitelist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return res.json({ data });
  } catch (error) {
    console.error('Error fetching whitelist:', error);
    return res.status(500).json({ error: 'Failed to fetch whitelist' });
  }
});

app.post('/api/whitelist', async (req, res) => {
  try {
    const { payee_name, category } = req.body;

    if (!payee_name) {
      return res.status(400).json({ error: 'payee_name is required' });
    }

    const { data, error } = await supabase
      .from('whitelist')
      .insert({
        payee_name,
        category: category || 'general',
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      throw error;
    }

    return res.status(201).json({ data: data[0] });
  } catch (error) {
    console.error('Error adding to whitelist:', error);
    return res.status(500).json({ error: 'Failed to add to whitelist' });
  }
});

app.delete('/api/whitelist/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('whitelist')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return res.json({ message: 'Removed from whitelist' });
  } catch (error) {
    console.error('Error removing from whitelist:', error);
    return res.status(500).json({ error: 'Failed to remove from whitelist' });
  }
});

// ========================
// USER STATS HELPER
// ========================

/**
 * Calculate real user stats from the database
 */
async function getUserStats(userId) {
  // Calculate clean streak: days since last non-whitelisted transaction
  const { data: lastGambling } = await supabase
    .from('transactions')
    .select('timestamp')
    .eq('is_whitelisted', false)
    .gte('risk_score', 41)
    .order('timestamp', { ascending: false })
    .limit(1)
    .single();

  let cleanStreak = 0;
  if (lastGambling?.timestamp) {
    const lastDate = new Date(lastGambling.timestamp);
    const now = new Date();
    cleanStreak = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
  } else {
    // No flagged transactions found — streak from first transaction or 0
    const { data: firstTx } = await supabase
      .from('transactions')
      .select('timestamp')
      .order('timestamp', { ascending: true })
      .limit(1)
      .single();

    if (firstTx?.timestamp) {
      cleanStreak = Math.floor((new Date() - new Date(firstTx.timestamp)) / (1000 * 60 * 60 * 24));
    }
  }

  // Calculate today's non-whitelisted spend
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayTxns } = await supabase
    .from('transactions')
    .select('amount')
    .eq('is_whitelisted', false)
    .gte('timestamp', todayStart.toISOString());

  const totalSpend = (todayTxns || []).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return { cleanStreak, totalSpend };
}

// ========================
// CONVERSATION PERSISTENCE
// ========================

// In-memory cache for active conversations (backed by DB)
const activeConversations = new Map();

/**
 * Create a conversation in the DB and return its UUID
 */
async function createConversationInDB(triggerType, transactionDbId) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      transaction_id: transactionDbId || null,
      trigger_type: triggerType || 'immediate',
      started_at: new Date().toISOString(),
      message_count: 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create conversation in DB:', error);
    return null;
  }
  return data.id;
}

/**
 * Save a message to the conversation_messages table
 */
async function saveMessageToDB(conversationDbId, role, content) {
  if (!conversationDbId) return;
  const { error } = await supabase
    .from('conversation_messages')
    .insert({ conversation_id: conversationDbId, role, content });

  if (error) {
    console.error('Failed to save message to DB:', error);
  }
}

/**
 * Update conversation message count and optionally mark completed
 */
async function updateConversationInDB(conversationDbId, messageCount, completed) {
  if (!conversationDbId) return;
  const update = {};
  if (messageCount != null) update.message_count = messageCount;
  if (completed) update.completed_at = new Date().toISOString();
  if (Object.keys(update).length === 0) return;

  await supabase
    .from('conversations')
    .update(update)
    .eq('id', conversationDbId);
}

/**
 * Load conversation messages from DB
 */
async function loadConversationFromDB(conversationDbId) {
  const { data, error } = await supabase
    .from('conversation_messages')
    .select('role, content')
    .eq('conversation_id', conversationDbId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load conversation from DB:', error);
    return [];
  }
  return data || [];
}

// ========================
// CORE LOOP API ENDPOINTS
// ========================

// POST /api/ai/classify - Risk score a transaction
app.post('/api/ai/classify', async (req, res) => {
  try {
    const { description, amount, timestamp } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'description is required' });
    }

    // Check whitelist
    const whitelisted = await isWhitelisted(description);

    const result = classifyTransaction(
      { description, amount: amount || 0, timestamp: timestamp || new Date().toISOString() },
      { isWhitelisted: whitelisted }
    );

    return res.json(result);
  } catch (error) {
    console.error('Classify error:', error);
    return res.status(500).json({ error: 'Classification failed' });
  }
});

// POST /api/ai/conversation - Start or continue an AI intervention conversation
app.post('/api/ai/conversation', async (req, res) => {
  try {
    const { message, conversationId, transactionContext } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    // Determine trigger type from context
    const riskScore = transactionContext?.riskScore || 0;
    const triggerType = riskScore >= 70 ? 'immediate' :
                        riskScore >= 40 ? 'pattern' :
                        'encouragement';

    // Get or create conversation (DB-backed)
    let dbConversationId = conversationId;
    let messages = [];

    if (dbConversationId) {
      // Load existing conversation from DB
      messages = await loadConversationFromDB(dbConversationId);
    }

    if (!dbConversationId) {
      // Create new conversation in DB
      dbConversationId = await createConversationInDB(triggerType, null);
    }

    // Add user message
    messages.push({ role: 'user', content: message });
    await saveMessageToDB(dbConversationId, 'user', message);

    // Get real user stats
    const stats = await getUserStats(null);
    const userData = {
      cleanStreak: stats.cleanStreak,
      totalSpend: transactionContext?.amount || stats.totalSpend,
      lastTransaction: transactionContext?.description || '',
    };

    const triggerEnum = riskScore >= 70 ? TriggerType.IMMEDIATE :
                        riskScore >= 40 ? TriggerType.PATTERN :
                        TriggerType.ENCOURAGEMENT;

    const aiResponse = await getAIResponse({
      messages: formatMessageHistory(messages),
      trigger: triggerEnum,
      userData,
    });

    // Save AI response
    messages.push({ role: 'assistant', content: aiResponse });
    await saveMessageToDB(dbConversationId, 'assistant', aiResponse);
    await updateConversationInDB(dbConversationId, messages.length, false);

    return res.json({
      response: aiResponse,
      conversationId: dbConversationId,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error('Conversation error:', error);
    return res.status(500).json({
      error: 'Conversation failed',
      response: "Sorry mate, something went wrong. Let's try again.",
    });
  }
});

// POST /api/guardian/notify - Send guardian notification
app.post('/api/guardian/notify', async (req, res) => {
  try {
    const { transactionId, classification, userId } = req.body;

    if (!classification) {
      return res.status(400).json({ error: 'classification object is required' });
    }

    const result = await notifyGuardian(classification, transactionId, userId || null);
    return res.json(result);
  } catch (error) {
    console.error('Guardian notify error:', error);
    return res.status(500).json({ error: 'Guardian notification failed' });
  }
});

// POST /api/guardian/conversation-summary - Notify guardian of conversation outcome
app.post('/api/guardian/conversation-summary', async (req, res) => {
  try {
    const { conversationId, outcome, userId } = req.body;

    if (!conversationId || !outcome) {
      return res.status(400).json({ error: 'conversationId and outcome are required' });
    }

    const result = await sendConversationSummary(conversationId, outcome, userId || null);
    return res.json(result);
  } catch (error) {
    console.error('Conversation summary error:', error);
    return res.status(500).json({ error: 'Failed to send conversation summary' });
  }
});

// ========================
// AI CONVERSATION ENDPOINTS (legacy voice endpoints)
// ========================

app.post('/api/voice/process', async (req, res) => {
  try {
    const { userId, text, conversationId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Get or create conversation (DB-backed)
    let dbConversationId = conversationId;
    let messages = [];

    if (dbConversationId) {
      messages = await loadConversationFromDB(dbConversationId);
    }

    if (!dbConversationId) {
      dbConversationId = await createConversationInDB('immediate', null);
    }

    // Add user message
    messages.push({ role: 'user', content: text });
    await saveMessageToDB(dbConversationId, 'user', text);

    // Get real user stats from DB
    const stats = await getUserStats(userId);
    const userData = {
      cleanStreak: stats.cleanStreak,
      totalSpend: stats.totalSpend,
      lastTransaction: text
    };

    // Get AI response
    const aiResponse = await getAIResponse({
      messages: formatMessageHistory(messages),
      trigger: TriggerType.IMMEDIATE,
      userData
    });

    // Save AI response to DB
    messages.push({ role: 'assistant', content: aiResponse });
    await saveMessageToDB(dbConversationId, 'assistant', aiResponse);
    await updateConversationInDB(dbConversationId, messages.length, false);

    return res.json({
      response: aiResponse,
      conversationId: dbConversationId,
      intent: 'support',
      emotion: 'supportive'
    });

  } catch (error) {
    console.error('Voice process error:', error);
    return res.status(500).json({
      error: 'Failed to process voice input',
      response: "Sorry mate, I'm having trouble right now. Let's try again."
    });
  }
});

app.get('/api/voice/suggestions', async (req, res) => {
  try {
    // Return conversation starters based on context
    const suggestions = [
      "I need to talk about what just happened",
      "This spend feels different",
      "I'm not sure if this was necessary",
      "I want to be honest about this"
    ];

    return res.json(suggestions);
  } catch (error) {
    console.error('Suggestions error:', error);
    return res.json([]);
  }
});

app.post('/api/voice/end', async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (conversationId) {
      // Mark conversation as completed in DB
      await updateConversationInDB(conversationId, null, true);

      // Clean up memory cache if present
      activeConversations.delete(conversationId);

      console.log('Conversation ended and saved:', conversationId);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('End conversation error:', error);
    return res.status(500).json({ error: 'Failed to end conversation' });
  }
});

// Voice memo transcription and analysis
app.post('/api/voice/analyze', async (req, res) => {
  try {
    const { transcript, context } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: 'Transcript is required' });
    }

    // Analyze transcript with Claude
    const analysis = await analyzeTranscript(transcript, context);

    return res.json({
      analysis: analysis.suggestion,
      concernLevel: analysis.concernLevel,
      flags: analysis.flags
    });

  } catch (error) {
    console.error('Voice analysis error:', error);
    return res.status(500).json({
      error: 'Failed to analyze voice memo',
      analysis: 'Keep reflecting on your choices.',
      concernLevel: 'low',
      flags: []
    });
  }
});

// ========================
// CATCH-ALL 404
// ========================
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// For Vercel serverless
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Anchor API Server running on http://localhost:${PORT}`);
  });
}