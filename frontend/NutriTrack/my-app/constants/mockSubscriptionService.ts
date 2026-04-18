// constants/mockSubscriptionService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Config ──────────────────────────────────────────────────────────────────
const MOCK_DELAY_MS = 1800;
const VALID_PROMO_CODES: Record<string, number> = {
  SAVE30: 30,
  NUTRIFIT: 20,
  LAUNCH10: 10,
};

// Simulate a random failure rate (0 = never fail, 0.2 = 20% fail)
const FAILURE_RATE = 0.15;

// ─── Types ───────────────────────────────────────────────────────────────────
export type PlanId = 'freemium' | 'premium' | 'premium_annual';

export type MockTransaction = {
  transaction_id: string;
  plan_id: PlanId;
  amount_paid: number;
  currency: string;
  promo_code: string | null;
  card_last4: string;
  card_holder: string;
  status: 'success' | 'failed';
  created_at: string;
};

export type CheckoutPayload = {
  plan_id: PlanId;
  promo_code: string | null;
  payment_method: {
    card_last4: string;
    card_brand: string;
    card_holder: string;
  };
  amount_paid: number;
  currency: string;
};

export type CheckoutResult = {
  transaction_id: string;
  status: 'success' | 'failed';
  plan_id: PlanId;
  role: PlanId;
  valid_until: string;
  amount_paid: number;
  created_at: string;
  error?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateTxnId() {
  return 'txn_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function validUntil(planId: PlanId): string {
  const d = new Date();
  if (planId === 'premium_annual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

// ─── Mock Storage Keys ────────────────────────────────────────────────────────
const KEYS = {
  ROLE: 'mock_user_role',
  VALID_UNTIL: 'mock_subscription_valid_until',
  TRANSACTIONS: 'mock_transactions',
};

// ─── Mock API Functions ───────────────────────────────────────────────────────

/**
 * POST /subscriptions/checkout
 * Validates promo server-side, logs transaction, updates role.
 */
export async function mockCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  await delay(MOCK_DELAY_MS);

  // Server-side promo validation (ignore client-sent amount, recalculate)
  let finalAmount = payload.amount_paid;
  if (payload.promo_code) {
    const discount = VALID_PROMO_CODES[payload.promo_code.toUpperCase()];
    if (!discount) {
      return {
        transaction_id: generateTxnId(),
        status: 'failed',
        plan_id: payload.plan_id,
        role: 'freemium',
        valid_until: '',
        amount_paid: 0,
        created_at: new Date().toISOString(),
        error: 'Invalid promo code',
      };
    }
    // recalculate server-side (you'd use real prices here)
    const RAW_PRICES: Record<string, number> = { premium: 6.99, premium_annual: 59.99 };
    const raw = RAW_PRICES[payload.plan_id] ?? payload.amount_paid;
    finalAmount = parseFloat((raw * (1 - discount / 100)).toFixed(2));
  }

  // Simulate random payment failure
  const succeeded = Math.random() > FAILURE_RATE;
  const txnId = generateTxnId();
  const now = new Date().toISOString();

  const txn: MockTransaction = {
    transaction_id: txnId,
    plan_id: payload.plan_id,
    amount_paid: finalAmount,
    currency: payload.currency,
    promo_code: payload.promo_code,
    card_last4: payload.payment_method.card_last4,
    card_holder: payload.payment_method.card_holder,
    status: succeeded ? 'success' : 'failed',
    created_at: now,
  };

  // Persist transaction log
  const existing = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
  const list: MockTransaction[] = existing ? JSON.parse(existing) : [];
  list.unshift(txn);
  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list));

  if (succeeded) {
    // Update role in mock "DB"
    await AsyncStorage.setItem(KEYS.ROLE, payload.plan_id);
    await AsyncStorage.setItem(KEYS.VALID_UNTIL, validUntil(payload.plan_id));
  }

  return {
    transaction_id: txnId,
    status: txn.status,
    plan_id: payload.plan_id,
    role: succeeded ? payload.plan_id : 'freemium',
    valid_until: succeeded ? validUntil(payload.plan_id) : '',
    amount_paid: finalAmount,
    created_at: now,
    error: succeeded ? undefined : 'Card declined. Please try a different card.',
  };
}

/**
 * GET /subscriptions/my
 */
export async function mockGetMySubscription() {
  await delay(400);
  const role = (await AsyncStorage.getItem(KEYS.ROLE)) as PlanId ?? 'freemium';
  const valid_until = await AsyncStorage.getItem(KEYS.VALID_UNTIL);
  return { role, valid_until };
}

/**
 * POST /subscriptions/cancel
 */
export async function mockCancelSubscription() {
  await delay(800);
  await AsyncStorage.setItem(KEYS.ROLE, 'freemium');
  await AsyncStorage.removeItem(KEYS.VALID_UNTIL);
  return { message: 'Subscription cancelled', role: 'freemium' as PlanId };
}

/**
 * GET /subscriptions/transactions
 */
export async function mockGetTransactions(): Promise<MockTransaction[]> {
  await delay(500);
  const existing = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
  return existing ? JSON.parse(existing) : [];
}

/**
 * Utility: reset everything (useful for testing from scratch)
 */
export async function mockResetAll() {
  await AsyncStorage.multiRemove([KEYS.ROLE, KEYS.VALID_UNTIL, KEYS.TRANSACTIONS]);
}