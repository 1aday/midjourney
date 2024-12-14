import { proxyApi } from './proxy';

export interface SavedJobRequest {
  prompt: string;
  parameters: Record<string, any>;
  image_url: string;
  modified_images: {
    type: 'upscale' | 'variation';
    url: string;
  }[];
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
  saveJob: async (job: Omit<SavedJobRequest, 'original_job_id' | 'created_at'>): Promise<SavedJob> => {
    try {
      const response = await proxyApi.post<SavedJob>('/api/saved-jobs', job);
      return response;
    } catch (error) {
      console.error('Error saving job:', error);
      throw error;
    }
  },

  listSavedJobs: async (): Promise<SavedJob[]> => {
    try {
      const response = await proxyApi.get<SavedJob[]>('/api/saved-jobs');
      return response;
    } catch (error) {
      console.error('Error getting saved jobs:', error);
      throw error;
    }
  },

  deleteSavedJob: async (jobId: string): Promise<void> => {
    try {
      await proxyApi.delete<void>(`/api/saved-jobs/${jobId}`);
    } catch (error) {
      console.error('Error deleting saved job:', error);
      throw error;
    }
  },

  updateJobNotes: async (jobId: string, notes: string): Promise<SavedJob> => {
    try {
      const response = await proxyApi.patch<SavedJob>(`/api/saved-jobs/${jobId}`, { notes });
      return response;
    } catch (error) {
      console.error('Error updating job notes:', error);
      throw error;
    }
  }
};
