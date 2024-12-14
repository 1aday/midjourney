import axios, { AxiosResponse } from 'axios';

const api = axios.create({
  baseURL: 'https://app-maupcgux.fly.dev',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000, // 30 second timeout
});

async function withRetry<T>(
  apiCall: () => Promise<AxiosResponse<T>>,
  retries = 3
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await apiCall();
      return response.data;
    } catch (error: any) {
      lastError = error;
      if (error.code !== 'ERR_NETWORK' || attempt === retries - 1) {
        throw error;
      }
      // Exponential backoff
      const backoff = Math.min(1000 * (attempt + 1), 3000);
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
  throw lastError;
}

export interface ImagineRequest {
  prompt: string;
  webhook_url?: string;
  webhook_type?: 'progress' | 'result';
  account_hash?: string;
  is_disable_prefilter?: boolean;
}

export interface UpscaleRequest {
  hash: string;
  choice: number; // 1-4
  webhook_url?: string;
  webhook_type?: 'result';
}

export interface VariationRequest {
  hash: string;
  choice: number; // 1-4
  prompt?: string;
  webhook_url?: string;
  webhook_type?: 'result';
}

export interface TaskResponse {
  hash: string;
}

export interface StatusResponse {
  account_hash: string;
  hash: string;
  status: 'sent' | 'waiting' | 'progress' | 'done' | 'error';
  progress?: number;
  result?: {
    url: string;
    proxy_url: string;
    filename: string;
    content_type: string;
    width: number;
    height: number;
    size: number;
  };
  status_reason?: string | null;
  created_at: string;
  prompt?: string;
  type?: string;
  prefilter_result?: any[];
}

export const midjourneyApi = {
  imagine: async (request: ImagineRequest) => {
    try {
      console.log('Sending imagine request:', request);
      const data = await withRetry(() => api.post<TaskResponse>('/midjourney/v2/imagine', request));
      console.log('Imagine response:', data);
      return data;
    } catch (error: any) {
      console.error('Error in imagine request:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      if (error.code === 'ERR_NETWORK') {
        throw new Error('Network error occurred. Please check your connection and try again.');
      }
      throw error;
    }
  },

  getStatus: async (hash: string) => {
    try {
      console.log('Checking status for hash:', hash);
      const response = await api.get<StatusResponse>('/midjourney/v2/status', {
        params: { hash }
      });
      console.log('Status response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error checking status:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  upscale: async (request: UpscaleRequest) => {
    try {
      const response = await api.post<TaskResponse>('/midjourney/v2/upscale', request);
      return response.data;
    } catch (error: any) {
      console.error('Error in upscale request:', error);
      throw error;
    }
  },

  variation: async (request: VariationRequest) => {
    try {
      const response = await api.post<TaskResponse>('/midjourney/v2/variation', request);
      return response.data;
    } catch (error: any) {
      console.error('Error in variation request:', error);
      throw error;
    }
  },
};
