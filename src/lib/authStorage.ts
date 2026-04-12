import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_ACCESS_TOKEN_KEY = '@cooktrack_auth_access_token';

export async function saveAuthAccessToken(token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_ACCESS_TOKEN_KEY, token);
}

export async function clearAuthAccessToken(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
}

export async function readAuthAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
}
