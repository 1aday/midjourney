import axios from 'axios';

// Use environment-aware backend URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

interface AxiosResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
}

// Create base axios instance
const axiosInstance = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    'Content-Type': 'application/json',
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=120',
  },
  timeout: 120000, // 2 minute timeout for long-running operations
  validateStatus: (status) => status < 500, // Only treat 500+ as errors
  maxRedirects: 5,
  timeoutErrorMessage: 'Request timed out. The server might be starting up, please try again.',
});

// Add response interceptor for better error handling
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CONNECTION_CLOSED') {
      error.message = 'Connection failed. The server might be starting up, please try again.';
    }
    return Promise.reject(error);
  }
);

// Retry mechanism with exponential backoff
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 200
): Promise<T> {
  try {
    const response = await fn();
    return response;
  } catch (error: unknown) {
    if (retries === 0) {
      throw error;
    }

    // Check if error is network-related
    const axiosError = error as { code?: string };
    if (axiosError.code &&
        axiosError.code !== 'ERR_NETWORK' &&
        axiosError.code !== 'ERR_CONNECTION_CLOSED') {
      throw error;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2);
  }
}

// Enhanced proxy API with retry mechanism
export const proxyApi = {
  get: <T>(url: string, config = {}) =>
    withRetry<T>(() => Promise.resolve(axiosInstance.get<T>(url, config)).then((res: AxiosResponse<T>) => res.data)),
  post: <T>(url: string, data?: any, config = {}) =>
    withRetry<T>(() => Promise.resolve(axiosInstance.post<T>(url, data, config)).then((res: AxiosResponse<T>) => res.data)),
  put: <T>(url: string, data?: any, config = {}) =>
    withRetry<T>(() => Promise.resolve(axiosInstance.put<T>(url, data, config)).then((res: AxiosResponse<T>) => res.data)),
  patch: <T>(url: string, data?: any, config = {}) =>
    withRetry<T>(() => Promise.resolve(axiosInstance.patch<T>(url, data, config)).then((res: AxiosResponse<T>) => res.data)),
  delete: <T>(url: string, config = {}) =>
    withRetry<T>(() => Promise.resolve(axiosInstance.delete<T>(url, config)).then((res: AxiosResponse<T>) => res.data)),
};
