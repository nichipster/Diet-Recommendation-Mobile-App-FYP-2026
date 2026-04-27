// constants/mockSubscriptionService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const MOCK_DELAY_MS = 1800;
const FAILURE_RATE = 0.15;

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

// ✅ Now matches realCheckout's signature exactly
export type CheckoutPayload = {
  plan: string;
  card_holder_name: string;
  card_number: string;
  expiry_month: number;
  expiry_year: number;
  cvv: string;
};

export type CheckoutResult = {
  subscription_id: number;
  status: string;
  plan: string;
  role: string;
  valid_until: string;
  amount_paid: number;
  created_at: string;
  error?: string;
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateTxnId() {
  return 'txn_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const KEYS = {
  ROLE: 'mock_user_role',
  VALID_UNTIL: 'mock_subscription_valid_until',
  TRANSACTIONS: 'mock_transactions',
};

// ✅ Signature matches realCheckout
export async function mockCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  await delay(MOCK_DELAY_MS);

  const succeeded = Math.random() > FAILURE_RATE;
  const now = new Date().toISOString();
  const planId: PlanId = payload.plan === 'annual' ? 'premium_annual' : 'premium';
  const card_last4 = payload.card_number.replace(/\s/g, '').slice(-4);

  const txn: MockTransaction = {
    transaction_id: generateTxnId(),
    plan_id: planId,
    amount_paid: planId === 'premium_annual' ? 99.00 : 9.90,
    currency: 'SGD',
    promo_code: null,
    card_last4,
    card_holder: payload.card_holder_name,
    status: succeeded ? 'success' : 'failed',
    created_at: now,
  };

  const existing = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
  const list: MockTransaction[] = existing ? JSON.parse(existing) : [];
  list.unshift(txn);
  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(list));

  if (succeeded) {
    await AsyncStorage.setItem(KEYS.ROLE, planId);
  }

  return {
    subscription_id: Math.floor(Math.random() * 10000),
    status: succeeded ? 'active' : 'failed',
    plan: payload.plan,
    role: succeeded ? 'premium' : 'freemium',
    valid_until: now,
    amount_paid: txn.amount_paid,
    created_at: now,
    error: succeeded ? undefined : 'Card declined.',
  };
}

export async function mockGetMySubscription() {
  await delay(400);
  const role = (await AsyncStorage.getItem(KEYS.ROLE)) as PlanId ?? 'freemium';
  const valid_until = await AsyncStorage.getItem(KEYS.VALID_UNTIL);
  return { role, valid_until };
}

export async function mockCancelSubscription() {
  await delay(800);
  await AsyncStorage.setItem(KEYS.ROLE, 'freemium');
  await AsyncStorage.removeItem(KEYS.VALID_UNTIL);
  return { message: 'Subscription cancelled', role: 'freemium' as PlanId };
}

export async function mockGetTransactions(): Promise<MockTransaction[]> {
  await delay(500);
  const existing = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
  return existing ? JSON.parse(existing) : [];
}

export async function mockResetAll() {
  await AsyncStorage.multiRemove([KEYS.ROLE, KEYS.VALID_UNTIL, KEYS.TRANSACTIONS]);
}