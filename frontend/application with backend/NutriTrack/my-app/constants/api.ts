// Use machine's local IP not localhost
export const API_URL = 'http://192.168.50.144:8000'

export const getAuthHeaders = (token: string) => ({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${token}',
})