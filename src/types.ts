export interface ModifiedImage {
  type: 'upscale' | 'variation';
  url: string;
  jobId: string;
}

export interface PromptParameters {
  sref: number | 'random';
  ar: string;
  s: number;
}

export interface Job {
  id: string;
  prompt: string;
  status: 'generating' | 'upscaling' | 'done' | 'error';
  progress: number;
  hash?: string;
  imageUrl?: string;
  parameters?: PromptParameters;
  createdAt: string;  // Changed from Date to string
  error?: string;
  saved?: boolean;
  modifiedImages?: ModifiedImage[];  // Made optional since it's not always present
}

export interface StatusResponse {
  status: 'pending' | 'generating' | 'upscaling' | 'done' | 'error';
  progress: number;
  imageUrl?: string;
  sref_random_key?: string;
  error?: string;
}

// Import and re-export SavedJob type from savedJobs service to ensure consistency
export type { SavedJob } from './services/savedJobs';
