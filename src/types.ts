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
  status: 'pending' | 'generating' | 'done' | 'error';
  progress: number;
  hash: string;
  imageUrl?: string;
  modifiedImages: ModifiedImage[];
  parameters: PromptParameters;
  createdAt: Date;
  error?: string;
  isSaved: boolean;
  notes?: string;
  savedJobId?: string;
}
