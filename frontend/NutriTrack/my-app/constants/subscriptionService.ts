// constants/subscriptionService.ts
import {
  mockCheckout,
  mockGetMySubscription,
  mockCancelSubscription,
  mockGetTransactions,
} from './mockSubscriptionService';

// ─── Toggle this when backend is ready ───────────────────────────────────────
const USE_MOCK = false; // ← flip to false when backend is live
// ─────────────────────────────────────────────────────────────────────────────

import { getAuthHeaders, API_URL } from './api';

async function realCheckout(payload: {
  plan: string;
  card_holder_name: string;
  card_number: string;
  expiry_month: number;
  expiry_year: number;
  cvv: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/subscriptions/checkout`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
      console.log('CHECKOUT ERROR BODY:', JSON.stringify(err));

    throw new Error(err.detail ?? 'Payment failed');
  }
  return res.json();
}
async function realGetMySubscription() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/subscriptions/my`, { headers });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function realCancelSubscription() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/subscriptions/cancel`, { method: 'POST', headers });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

async function realGetTransactions() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/subscriptions/transactions`, { headers });
  if (!res.ok) throw new Error('Failed');
  return res.json();
}

// ─── Exports (used by all components) ────────────────────────────────────────
export const checkoutSubscription = USE_MOCK ? mockCheckout        : realCheckout;
export const getMySubscription    = USE_MOCK ? mockGetMySubscription : realGetMySubscription;
export const cancelSubscription   = USE_MOCK ? mockCancelSubscription : realCancelSubscription;
export const getTransactionHistory = USE_MOCK ? mockGetTransactions  : realGetTransactions;