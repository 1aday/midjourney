import { proxyApi } from './proxy';

// Type definitions
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
  sref_random_key?: string;  // Added field for random sref value
}

export const midjourneyApi = {
  imagine: async (request: ImagineRequest): Promise<TaskResponse> => {
    try {
      console.log('Sending imagine request:', request);
      const response = await proxyApi.post<TaskResponse>('/midjourney/v2/imagine', request);
      console.log('Imagine response:', response);
      return response;
    } catch (error: any) {
      console.error('Error in imagine request:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status,
      });
      throw error;
    }
  },

  getStatus: async (hash: string): Promise<StatusResponse> => {
    try {
      console.log('Checking status for hash:', hash);
      const response = await proxyApi.get<StatusResponse>('/midjourney/v2/status', {
        params: { hash }
      });
      console.log('Status response:', response);
      return response;
    } catch (error: any) {
      console.error('Error checking status:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status,
      });
      throw error;
    }
  },

  upscale: async (request: UpscaleRequest): Promise<TaskResponse> => {
    try {
      console.log('Sending upscale request:', request);
      const response = await proxyApi.post<TaskResponse>('/midjourney/v2/upscale', request);
      console.log('Upscale response:', response);
      return response;
    } catch (error: any) {
      console.error('Error in upscale request:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status,
      });
      throw error;
    }
  },

  variation: async (request: VariationRequest): Promise<TaskResponse> => {
    try {
      console.log('Sending variation request:', request);
      const response = await proxyApi.post<TaskResponse>('/midjourney/v2/variation', request);
      console.log('Variation response:', response);
      return response;
    } catch (error: any) {
      console.error('Error in variation request:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status,
      });
      throw error;
    }
  },
};
