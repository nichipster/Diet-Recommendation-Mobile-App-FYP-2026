// Use machine's local IP not localhost
// The previous line was: export const API_URL = 'http://192.168.50.144:8000'

export const API_URL = 'http://192.168.1.2:8000'

export const getAuthHeaders = (token?: string | null) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
})

// New subscription functions — ready to plug in when backend is live

export async function checkoutSubscription(payload: {
  plan_id: 'premium' | 'premium_annual';
  promo_code: string | null;
  payment_method: { card_last4: string; card_brand: string; card_holder: string };
  amount_paid: number;
  currency: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/subscriptions/checkout`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Payment failed');
  return res.json(); // returns { transaction_id, status, role, valid_until }
}

export async function getMySubscription() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/subscriptions/my`, { headers });
  if (!res.ok) throw new Error('Failed to fetch subscription');
  return res.json();
}

export async function cancelSubscription() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/subscriptions/cancel`, {
    method: 'POST', headers,
  });
  if (!res.ok) throw new Error('Failed to cancel');
  return res.json();
}

export async function getTransactionHistory() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/subscriptions/transactions`, { headers });
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}