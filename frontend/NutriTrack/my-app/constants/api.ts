// Use machine's local IP not localhost
// The previous line was: export const API_URL = 'http://192.168.1.9:8000'
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = 'http://192.168.1.4:8000'

export const getAuthHeadersWithToken = (token?: string | null) => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
})

// ✅ Correct — synchronous
export const getAuthHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});