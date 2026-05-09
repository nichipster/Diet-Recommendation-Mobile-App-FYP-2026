// Use machine's local IP not localhost
// The previous line was: export const API_URL = 'http://192.168.1.9:8000'
// Add your ip address here in the format <Name> <Ip address>
// Benjamin 192.168.50.144

export const API_URL = 'http://192.168.50.144:8000'

export const getAuthHeadersWithToken = (token?: string | null) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
})

// ✅ Correct — synchronous
export const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});