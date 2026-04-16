// constants/subscriptionService.ts
import {
  mockCheckout,
  mockGetMySubscription,
  mockCancelSubscription,
  mockGetTransactions,
} from './mockSubscriptionService';

// ─── Toggle this when backend is ready ───────────────────────────────────────
const USE_MOCK = true; // ← flip to false when backend is live
// ─────────────────────────────────────────────────────────────────────────────

import { getAuthHeaders, API_URL } from './api';

async function realCheckout(payload: Parameters<typeof mockCheckout>[0]) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/subscriptions/checkout`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Payment failed');
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