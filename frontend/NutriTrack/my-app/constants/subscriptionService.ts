import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuthHeaders, API_URL } from './api';

async function getHeaders() {
  const token = await AsyncStorage.getItem('token');
  return getAuthHeaders(token ?? '');
}

export async function checkoutSubscription(payload: {
  plan: string;
  card_holder_name: string;
  card_number: string;
  expiry_month: number;
  expiry_year: number;
  cvv: string;
}) {
  const headers = await getHeaders();
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

export async function getMySubscription() {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/subscriptions/my`, { headers });
  if (!res.ok) throw new Error('Failed to fetch subscription');
  return res.json();
}

export async function cancelSubscription() {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/subscriptions/cancel`, { method: 'POST', headers });
  if (!res.ok) throw new Error('Failed to cancel subscription');
  return res.json();
}

export async function getTransactionHistory() {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}/subscriptions/transactions`, { headers });
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}