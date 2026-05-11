// Use machine's local IP not localhost
// The previous line was: export const API_URL = 'http://192.168.1.9:8000'
// Add your ip address here in the format <Name> <Ip address>
// Benjamin 192.168.50.144

export const API_URL = 'https://diet-recommendation-mobile-app-fyp-2026-1.onrender.com'

export const getAuthHeadersWithToken = (token?: string | null) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
})

// ✅ Correct — synchronous
export const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});
