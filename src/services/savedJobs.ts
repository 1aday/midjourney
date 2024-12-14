import axios from 'axios';

const api = axios.create({
  baseURL: 'https://app-maupcgux.fly.dev',
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface SavedJobRequest {
  original_job_id: string;
  prompt: string;
  parameters: Record<string, any>;
  image_url: string;
  modified_images: {
    type: 'upscale' | 'variation';
    url: string;
  }[];
  created_at: Date;
  notes?: string;
}

export interface SavedJob {
  id: string;
  original_job_id: string;
  prompt: string;
  parameters: Record<string, any>;
  image_url: string;
  modified_images: {
    type: 'upscale' | 'variation';
    url: string;
  }[];
  created_at: Date;
  saved_at: Date;
  notes?: string;
}

export const savedJobsApi = {
  saveJob: async (job: SavedJobRequest): Promise<SavedJob> => {
    const response = await api.post<SavedJob>('/api/saved-jobs', job);
    return response.data;
  },

  listSavedJobs: async (): Promise<SavedJob[]> => {
    const response = await api.get<SavedJob[]>('/api/saved-jobs');
    return response.data;
  },

  deleteSavedJob: async (jobId: string): Promise<void> => {
    await api.delete(`/api/saved-jobs/${jobId}`);
  },

  updateJobNotes: async (jobId: string, notes: string): Promise<SavedJob> => {
    const response = await api.patch<SavedJob>(`/api/saved-jobs/${jobId}`, { notes });
    return response.data;
  }
};
