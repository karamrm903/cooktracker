import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * Returns the base API URL based on the environment and platform.
 * Dynamically detects the host machine's IP for physical device testing.
 */
export function getBaseUrl(): string {
  // Use environment variable if set
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Detect IP if running in development (useful for physical devices)
  if (__DEV__) {
    try {
      const hostUri =
        Constants.expoConfig?.hostUri || (Constants as any).manifest?.hostUri;
      if (hostUri) {
        const ip = hostUri.split(":")[0];
        return `http://${ip}:3001`;
      }
    } catch (e) {
      console.warn("Failed to detect host IP, falling back to defaults");
    }

    // Default fallbacks for emulators/simulators
    return Platform.OS === "android"
      ? "http://10.0.2.2:3001"
      : "http://localhost:3001";
  }
}

/**
 * Common headers for API requests.
 */
export async function getAuthHeaders(
  session: any,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return headers;
}

/**
 * Standardized error handling for fetch responses.
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    // Server returned non-JSON (HTML error page, empty body, crash)
    throw new Error(
      `Server returned ${response.status}: ${text.slice(0, 200) || "(empty body)"}`,
    );
  }

  if (!response.ok) {
    throw new Error(
      data.error || data.message || `API Error: ${response.status}`,
    );
  }

  return data as T;
}
