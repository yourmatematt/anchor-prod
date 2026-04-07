/**
 * Risk Classification Service for Anchor
 *
 * Classifies transactions with a 0-100 risk score.
 * Backported pattern detection from original anchor codebase,
 * adapted for the CEO-specified core loop thresholds:
 *   0-40:   auto-approve
 *   41-60:  AI conversation
 *   61-80:  AI conversation + guardian notification
 *   81-100: auto-deny + guardian notification
 *
 * Classifications: WHITELIST, LEGITIMATE, SOCIAL, DISCRETIONARY, SUSPICIOUS, GAMBLING
 */

// Known payday loan providers (Australia)
const PAYDAY_LOAN_PROVIDERS = [
  'beforepay', 'mypay', 'nimble', 'wage advance', 'wagepay',
  'zipmoney', 'zip pay', 'cash converters', 'money3', 'ferratum',
  'wallet wizard', 'quick cash', 'instant loan', 'cash advance',
];

// Known gambling venues and platforms (Australia)
const GAMBLING_KEYWORDS = [
  // Online betting
  'sportsbet', 'tab.com', 'ladbrokes', 'unibet', 'bet365',
  'pointsbet', 'neds', 'betfair', 'draftkings', 'fanduel',
  // Casinos
  'crown casino', 'star casino', 'treasury casino',
  'casino canberra', 'adelaide casino', 'crown perth',
  // Generic gambling
  'poker machine', 'pokie', 'gaming machine', 'tabcorp', 'keno', 'lotto',
];

// Venue keywords (context-dependent - only flag if late night)
const VENUE_KEYWORDS = ['hotel', 'club', 'rsl', 'leagues club', 'bowling club'];

// Crypto exchanges
const CRYPTO_EXCHANGES = [
  'coinspot', 'binance', 'coinbase', 'swyftx', 'btc markets',
  'independent reserve', 'kraken', 'crypto.com', 'crypto',
  'bitcoin', 'btc', 'ethereum', 'eth',
];

/**
 * Classify a transaction and return risk score + classification
 *
 * @param {Object} transaction - Up Bank transaction object
 * @param {Object} context - Additional context (whitelist status, user stats, etc.)
 * @returns {Object} { score, classification, patterns, action }
 */
export function classifyTransaction(transaction, context = {}) {
  const description = (transaction.description || '').toLowerCase();
  const amount = Math.abs(transaction.amount || 0);
  const timestamp = transaction.timestamp || new Date().toISOString();
  const hour = new Date(timestamp).getHours();
  const day = new Date(timestamp).toLocaleDateString('en-US', { weekday: 'long' });
  const isLateNight = hour >= 22 || hour <= 5;

  // If whitelisted, score 0
  if (context.isWhitelisted) {
    return {
      score: 0,
      classification: 'WHITELIST',
      patterns: [],
      riskFactors: [],
      action: 'auto-approve',
      triggerAI: false,
      triggerGuardian: false,
    };
  }

  let score = 0;
  const patterns = [];
  const riskFactors = [];

  // --- Gambling merchant detection (+50) ---
  for (const keyword of GAMBLING_KEYWORDS) {
    if (description.includes(keyword)) {
      score += 50;
      patterns.push({ type: 'GAMBLING_VENUE', keyword, severity: 'critical' });
      riskFactors.push('gambling_merchant');
      break;
    }
  }

  // --- Venue keywords at late night (+35) ---
  if (!patterns.some(p => p.type === 'GAMBLING_VENUE')) {
    for (const keyword of VENUE_KEYWORDS) {
      if (description.includes(keyword) && isLateNight) {
        score += 35;
        patterns.push({ type: 'LATE_NIGHT_VENUE', keyword, severity: 'high' });
        riskFactors.push('late_night_venue');
        break;
      }
    }
  }

  // --- Crypto exchange detection (+45) ---
  for (const exchange of CRYPTO_EXCHANGES) {
    if (description.includes(exchange)) {
      score += 45;
      patterns.push({ type: 'CRYPTO_EXCHANGE', keyword: exchange, severity: 'critical' });
      riskFactors.push('crypto_exchange');
      break;
    }
  }

  // --- Payday loan detection (+50) ---
  for (const provider of PAYDAY_LOAN_PROVIDERS) {
    if (description.includes(provider)) {
      score += 50;
      patterns.push({ type: 'PAYDAY_LOAN', keyword: provider, severity: 'critical' });
      riskFactors.push('payday_loan');
      break;
    }
  }

  // --- ATM / Cash withdrawal (+35 base) ---
  const isATM = description.includes('atm') || description.includes('withdrawal') ||
                description.includes('cash out') || description.includes('cashout');
  if (isATM && amount > 50) {
    score += 35;
    patterns.push({ type: 'CASH_WITHDRAWAL', severity: amount > 100 ? 'high' : 'medium' });
    riskFactors.push('cash_withdrawal');
    if (isLateNight) {
      score += 15;
      riskFactors.push('late_night_cash');
    }
  }

  // --- Time-based risk factors ---
  if (isLateNight && !riskFactors.includes('late_night_cash') && !riskFactors.includes('late_night_venue')) {
    score += 10;
    riskFactors.push('late_night');
  }

  const isTuesday = day === 'Tuesday';
  const isFriday = day === 'Friday';
  const isWeekend = day === 'Saturday' || day === 'Sunday';

  if (isTuesday && hour >= 18) {
    score += 15;
    riskFactors.push('tuesday_evening');
  }
  if ((isFriday || isWeekend) && hour >= 20) {
    score += 10;
    riskFactors.push('weekend_night');
  }

  // --- Amount-based risk factors ---
  if (amount > 200) {
    score += 10;
    riskFactors.push('large_amount');
  }
  if (amount % 50 === 0 && amount >= 50) {
    score += 5;
    riskFactors.push('round_number');
  }

  // Cap at 100
  score = Math.min(score, 100);

  // Determine classification
  let classification;
  if (score >= 70) classification = 'GAMBLING';
  else if (score >= 50) classification = 'SUSPICIOUS';
  else if (score >= 30) classification = 'DISCRETIONARY';
  else if (score >= 15) classification = 'SOCIAL';
  else classification = 'LEGITIMATE';

  // Determine action based on CEO-specified thresholds
  let action;
  let triggerAI = false;
  let triggerGuardian = false;

  if (score <= 40) {
    action = 'auto-approve';
  } else if (score <= 60) {
    action = 'ai-conversation';
    triggerAI = true;
  } else if (score <= 80) {
    action = 'ai-conversation+guardian';
    triggerAI = true;
    triggerGuardian = true;
  } else {
    action = 'auto-deny+guardian';
    triggerGuardian = true;
  }

  return {
    score,
    classification,
    patterns,
    riskFactors,
    action,
    triggerAI,
    triggerGuardian,
    context: {
      amount,
      description: transaction.description,
      timestamp,
      isLateNight,
      day,
      hour,
    },
  };
}

/**
 * Build AI context from classification result for conversation endpoint
 */
export function buildAIContext(classResult) {
  const questions = [];

  for (const pattern of classResult.patterns) {
    switch (pattern.type) {
      case 'GAMBLING_VENUE':
        questions.push('What happened?', 'How much did you actually lose?', 'Are you safe right now?');
        break;
      case 'CRYPTO_EXCHANGE':
        questions.push('Why are you buying crypto?', 'Is this for gambling or trading?');
        break;
      case 'CASH_WITHDRAWAL':
        questions.push('What do you need cash for?', 'Are you planning to gamble?');
        break;
      case 'PAYDAY_LOAN':
        questions.push('Why did you need a payday loan?', 'Is this connected to gambling losses?');
        break;
      case 'LATE_NIGHT_VENUE':
        questions.push('Where are you right now?', 'What are you doing at a venue this late?');
        break;
    }
  }

  if (questions.length === 0) {
    questions.push('What was this transaction for?', 'Was this planned or impulse?');
  }

  return {
    riskScore: classResult.score,
    classification: classResult.classification,
    patterns: classResult.patterns.map(p => p.type),
    riskFactors: classResult.riskFactors,
    questions,
    amount: classResult.context.amount,
    description: classResult.context.description,
    isLateNight: classResult.context.isLateNight,
  };
}

export default { classifyTransaction, buildAIContext };
