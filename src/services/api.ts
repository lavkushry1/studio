// Basic setup for making API requests. Expand as needed.
import { getAccessToken } from '@/hooks/useAuth'; // Import function to get token

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'; // Use environment variable

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
  // Add other custom options if needed
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);

  // Append query parameters if provided
  if (options.params) {
    Object.keys(options.params).forEach(key => url.searchParams.append(key, options.params![key]));
  }

  // Add default headers, authentication token, etc.
  const headers = new Headers(options.headers || {});
  headers.append('Content-Type', 'application/json');

  // Retrieve and append JWT token if available
  const token = getAccessToken(); // Get token using the helper function
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    method: options.method || 'GET',
    headers: headers,
    body: options.body ? JSON.stringify(options.body) : null,
    ...options, // Allow overriding default options
  };

  try {
    const response = await fetch(url.toString(), config);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: response.statusText || `HTTP error! Status: ${response.status}` };
      }
      // Throw a custom error object for better handling
      throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
    }

    // Handle cases with no content (e.g., 204 No Content)
    if (response.status === 204) {
      return null as T;
    }

     // Check if response is JSON before parsing
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return await response.json() as T;
    } else {
        // Handle non-JSON responses if necessary, or return as is/throw error
         console.warn(`Received non-JSON response from ${url.toString()}`);
         return null as T; // Or handle appropriately
    }


  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    // Re-throw the error or handle it based on application needs
    throw error;
  }
}

export default request;
