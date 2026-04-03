// Use machine's local IP not localhost
// The previous line was: export const API_URL = 'http://192.168.50.144:8000'

export const API_URL = 'http://192.168.1.40:8000'

export const getAuthHeaders = (token: string) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
})