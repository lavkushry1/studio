// Basic setup for making API requests. Expand as needed.

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
  // TODO: Add logic to retrieve and append JWT token if available
  // const token = localStorage.getItem('accessToken'); // Example: Get token
  // if (token) {
  //   headers.append('Authorization', `Bearer ${token}`);
  // }

  const config: RequestInit = {
    method: options.method || 'GET',
    headers: headers,
    body: options.body ? JSON.stringify(options.body) : null,
    ...options, // Allow overriding default options
  };

  try {
    const response = await fetch(url.toString(), config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      // Throw a custom error object for better handling
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Handle cases with no content (e.g., 204 No Content)
    if (response.status === 204) {
      return null as T;
    }

    return await response.json() as T;
  } catch (error) {
    console.error('API request failed:', error);
    // Re-throw the error or handle it based on application needs
    throw error;
  }
}

// Example Usage (can create specific service files like authService.ts, eventService.ts)
/*
export const getEvents = (params?: Record<string, string>) => request<Event[]>('/events', { params });
export const getEventById = (eventId: string) => request<Event>(`/events/${eventId}`);
export const loginUser = (data: LoginInput) => request<AuthResponse>('/auth/login', { method: 'POST', body: data });
*/

export default request;
