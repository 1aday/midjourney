import React, { useState, useRef, useEffect } from 'react'
import { Input } from './components/ui/input'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { Label } from './components/ui/label'
import { Slider } from './components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select'
import { Loader2, X, CheckCircle2, BookmarkPlus, BookmarkCheck, Settings } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/table'
import { useToast } from './components/ui/use-toast'
import { midjourneyApi } from './services/midjourney'
import { savedJobsApi } from './services/savedJobs'
import { proxyApi } from './services/proxy'
import { Job, SavedJob, PromptParameters } from './types'

const DEFAULT_PARAMETERS: PromptParameters = {
  sref: 'random',
  ar: '16:9',
  s: 1000
}

interface ParameterControlsProps {
  parameters: PromptParameters;
  onParametersChange: (params: PromptParameters) => void;
}

const ParameterControls: React.FC<ParameterControlsProps> = ({ parameters, onParametersChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Cleanup effect to prevent state updates when unmounting
  useEffect(() => {
    return () => {
      setIsOpen(false);
    };
  }, []);

  // Memoize handlers to prevent unnecessary re-renders
  const handleParameterChange = useCallback((newParams: PromptParameters) => {
    onParametersChange(newParams);
  }, [onParametersChange]);

  // Memoize static data
  const aspectRatios = useMemo(() => [
    "1:1", "16:9", "4:3", "9:16", "3:2"
  ], []);

  return (
    <div className="mt-2">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full"
      >
        <Settings className="w-4 h-4 mr-2" />
        Settings
      </Button>

      {isOpen && (
        <div className="p-4 mt-2 border rounded-lg">
          <div className="space-y-4">
            {/* sref control */}
            <div>
              <Label>Style Reference</Label>
              <div className="flex gap-2">
                <Button
                  variant={parameters.sref === 'random' ? 'default' : 'outline'}
                  onClick={() => handleParameterChange({...parameters, sref: 'random'})}
                >
                  Random
                </Button>
                <Input
                  type="number"
                  value={parameters.sref === 'random' ? '' : parameters.sref}
                  onChange={(e) => handleParameterChange({...parameters, sref: Number(e.target.value)})}
                  placeholder="Enter number"
                  className="w-32"
                />
              </div>
            </div>

            {/* ar control */}
            <div>
              <Label>Aspect Ratio</Label>
              <Select
                value={parameters.ar}
                onValueChange={(value) => handleParameterChange({...parameters, ar: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select aspect ratio" />
                </SelectTrigger>
                <SelectContent>
                  {aspectRatios.map(ratio => (
                    <SelectItem key={ratio} value={ratio}>
                      {ratio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* s control */}
            <div>
              <Label>Style (0-1000)</Label>
              <Slider
                min={0}
                max={1000}
                step={1}
                value={[parameters.s]}
                onValueChange={([value]) => handleParameterChange({...parameters, s: value})}
              />
              <div className="text-right text-sm text-gray-500">
                {parameters.s}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  const { toast } = useToast()
  const statusPollingIntervals = useRef<Record<string, NodeJS.Timeout>>({});
  const [jobs, setJobs] = useState<Job[]>([])
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [activeTab, setActiveTab] = useState<'recent' | 'saved'>('recent')
  const [input, setInput] = useState('')
  const [parameters, setParameters] = useState<PromptParameters>(() => {
    const saved = localStorage.getItem('promptParameters')
    const parsed = saved ? JSON.parse(saved) : DEFAULT_PARAMETERS
    return parsed
  })

  // Keep server warm by polling health endpoint
  useEffect(() => {
    const keepWarm = () => {
      proxyApi.get('/health').catch(() => {}); // Silently handle errors
    };
    const interval = setInterval(keepWarm, 25000); // Poll every 25s
    return () => clearInterval(interval);
  }, []);

  const fetchSavedJobs = async () => {
    try {
      const jobs = await savedJobsApi.listSavedJobs()
      setSavedJobs(jobs)
    } catch (error: any) {
      console.error('Error fetching saved jobs:', error)
      toast({
        title: "Error",
        description: "Failed to fetch saved jobs: " + error.message,
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    fetchSavedJobs()
  }, [])

  const handleSaveJob = async (jobId: string) => {
    try {
      const jobToSave = jobs.find(j => j.id === jobId);
      if (!jobToSave) {
        throw new Error('Job not found');
      }

      const savedJobRequest = {
        prompt: jobToSave.prompt,
        parameters: jobToSave.parameters || {},
        image_url: jobToSave.imageUrl || '',
        modified_images: jobToSave.modifiedImages?.map(img => ({
          type: img.type,
          url: img.url
        })) || []
      };

      await savedJobsApi.saveJob(savedJobRequest);
      toast({
        title: "Job saved successfully",
        description: "You can find it in the Saved Jobs tab",
      });
    } catch (error) {
      console.error('Error saving job:', error);
      toast({
        title: "Error saving job",
        description: "Please try again later",
        variant: "destructive",
      });
    }
  }

  const handleRemoveParameter = (key: keyof PromptParameters) => {
    setParameters(prev => ({
      ...prev,
      [key]: DEFAULT_PARAMETERS[key]
    }))
  }

  const handleStatusCheck = async (jobId: string, hash: string) => {
    try {
      // Clear existing timeout if any
      if (statusPollingIntervals.current[jobId]) {
        clearTimeout(statusPollingIntervals.current[jobId]);
      }

      const status = await midjourneyApi.getStatus(hash);

      setJobs(prev => prev.map(job => {
        if (job.id === jobId) {
          const newStatus: Job['status'] =
            status.status === 'done' ? 'done' :
            status.status === 'error' ? 'error' :
            'generating';

          const updatedJob: Job = {
            ...job,
            status: newStatus,
            progress: status.progress || 0,
            hash,
            imageUrl: status.result?.url,
            error: status.status_reason || undefined
          };

          if (status.status === 'done' && status.sref_random_key && job.parameters?.sref === 'random') {
            const srefValue = parseInt(status.sref_random_key, 10);
            if (!isNaN(srefValue)) {
              updatedJob.parameters = {
                ...job.parameters,
                sref: srefValue
              };
            }
          }

          return updatedJob;
        }
        return job;
      }));

      if (status.status !== 'done' && status.status !== 'error') {
        statusPollingIntervals.current[jobId] = setTimeout(() => handleStatusCheck(jobId, hash), 2000);
      } else {
        delete statusPollingIntervals.current[jobId];
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setJobs(prev => prev.map(job =>
        job.id === jobId
          ? { ...job, status: 'error', error: 'Failed to check status' }
          : job
      ));
      delete statusPollingIntervals.current[jobId];
    }
  };

  useEffect(() => {
    return () => {
      Object.values(statusPollingIntervals.current).forEach((interval) => {
        if (interval) clearInterval(interval);
      });
    };
  }, []);

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast({
        title: 'Please enter a prompt',
        description: 'The prompt cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    // Extract base prompt without parameters
    const basePrompt = input.replace(/\s*--\w+\s+[^\s]+/g, '').trim();

    // Add current parameters
    const paramStrings = [];
    if (parameters.sref) paramStrings.push(`--sref ${parameters.sref}`);
    if (parameters.ar) paramStrings.push(`--ar ${parameters.ar}`);
    if (parameters.s) paramStrings.push(`--s ${parameters.s}`);

    const fullPrompt = `${basePrompt} ${paramStrings.join(' ')}`.trim();

    const jobId = crypto.randomUUID(); // Use UUID instead of timestamp
    const newJob: Job = {
      id: jobId,
      prompt: fullPrompt,
      status: 'generating',
      progress: 0,
      parameters: {
        sref: parameters.sref,
        ar: parameters.ar,
        s: parameters.s
      },
      createdAt: new Date().toISOString(),
      saved: false,
      modifiedImages: []  // Initialize as empty array
    };

    setJobs(prev => [newJob, ...prev]);
    setInput('');

    try {
      console.log('Making API call to generate image...');
      const response = await midjourneyApi.imagine({ prompt: fullPrompt });
      console.log('API response:', response);

      if (response.hash) {
        setJobs(prev => prev.map(job =>
          job.id === jobId
            ? { ...job, hash: response.hash, status: 'generating' }
            : job
        ));

        const checkStatus = async () => {
          await handleStatusCheck(jobId, response.hash);
        };
        checkStatus();
      }
    } catch (error) {
      console.error('Error generating image:', error);
      setJobs(prev => prev.map(job =>
        job.id === jobId
          ? { ...job, status: 'error', error: 'Failed to generate image' }
          : job
      ));
      toast({
        title: 'Error',
        description: 'Failed to generate image. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleUpscale = async (jobId: string, choice: number) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job?.hash) {
        toast({
          title: "Error",
          description: "Cannot upscale: job not found or missing hash",
          variant: "destructive",
        });
        return;
      }

      // Clear any existing interval for this upscale job
      const upscaleJobId = `${jobId}-upscale-${choice}`;
      if (statusPollingIntervals.current[upscaleJobId]) {
        clearInterval(statusPollingIntervals.current[upscaleJobId]);
        delete statusPollingIntervals.current[upscaleJobId];
      }

      // Update job status to upscaling
      setJobs(prev =>
        prev.map(j =>
          j.id === jobId
            ? {
                ...j,
                status: 'upscaling',
                progress: 0,
                modifiedImages: (j.modifiedImages || []).filter(img => img.jobId !== upscaleJobId)
              }
            : j
        )
      );

      // Make upscale request
      const response = await midjourneyApi.upscale({
        hash: job.hash,
        choice
      });

      // Start polling for status
      const checkStatus = async () => {
        try {
          const status = await midjourneyApi.getStatus(response.hash);

          setJobs(prev =>
            prev.map(j =>
              j.id === jobId
                ? {
                    ...j,
                    status: status.status === 'done' ? 'done' : 'upscaling',
                    progress: status.progress || 0,
                    modifiedImages: [
                      ...(j.modifiedImages || []).filter(img => img.jobId !== upscaleJobId),
                      ...(status.status === 'done' && status.result?.url
                        ? [{ type: 'upscale' as const, url: status.result.url, jobId: upscaleJobId }]
                        : [])
                    ]
                  }
                : j
            )
          );

          if (status.status === 'done') {
            clearInterval(statusPollingIntervals.current[upscaleJobId]);
            delete statusPollingIntervals.current[upscaleJobId];
          } else if (status.status === 'error') {
            clearInterval(statusPollingIntervals.current[upscaleJobId]);
            delete statusPollingIntervals.current[upscaleJobId];
            throw new Error(status.status_reason || 'Unknown error occurred during upscaling');
          }
        } catch (error: any) {
          console.error('Error checking upscale status:', error);
          clearInterval(statusPollingIntervals.current[upscaleJobId]);
          delete statusPollingIntervals.current[upscaleJobId];
          toast({
            title: "Error",
            description: "Failed to check upscale status: " + (error.message || 'Unknown error'),
            variant: "destructive",
          });
        }
      };

      // Initial check and set up interval
      await checkStatus();
      statusPollingIntervals.current[upscaleJobId] = setInterval(checkStatus, 5000);
    } catch (error: any) {
      console.error('Error upscaling image:', error);
      toast({
        title: "Error",
        description: "Failed to upscale image: " + (error.message || 'Unknown error'),
        variant: "destructive",
      });
    }
  };

  const handleVariation = async (jobId: string, index: number) => {
    try {
      const job = jobs.find(j => j.id === jobId)
      if (!job?.hash) return

      const response = await midjourneyApi.variation({
        hash: job.hash,
        choice: index
      })

      // Start tracking the variation job
      const variationJobId = `${jobId}-variation-${index}`
      setJobs(prev => prev.map(j => {
        if (j.id !== jobId) return j
        return {
          ...j,
          modifiedImages: [
            ...(j.modifiedImages || []),
            { type: 'variation', url: '', jobId: variationJobId }
          ]
        }
      }))

      // Poll for variation status
      const checkStatus = async () => {
        const status = await midjourneyApi.getStatus(response.hash)
        if (status.status === 'done' && status.result?.url) {
          setJobs(prev => prev.map(j => {
            if (j.id !== jobId) return j
            return {
              ...j,
              modifiedImages: j.modifiedImages?.map(img =>
                img.jobId === variationJobId
                  ? { ...img, url: status.result!.url }
                  : img
              )
            }
          }))
          if (statusPollingIntervals.current[variationJobId]) {
            clearInterval(statusPollingIntervals.current[variationJobId])
            delete statusPollingIntervals.current[variationJobId]
          }
        }
      }
      checkStatus()
      statusPollingIntervals.current[variationJobId] = setInterval(checkStatus, 5000)
    } catch (error) {
      console.error('Error creating variation:', error)
      toast({
        title: 'Error creating variation',
        description: 'Failed to create image variation',
        variant: 'destructive',
      })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Midjourney Image Generator</h1>

      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your prompt..."
              className="pr-32"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              {Object.entries(parameters).map(([key, value]) => value && (
                <Badge
                  key={key}
                  className={`cursor-pointer flex items-center gap-1 text-xs ${
                    key === 'sref' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                    key === 'ar' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                    'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  --{key} {String(value)}
                  <X
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => handleRemoveParameter(key as keyof PromptParameters)}
                  />
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerate}>Generate</Button>
            <ParameterControls
              parameters={parameters}
              onParametersChange={setParameters}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab as (value: string) => void} className="w-full">
          <TabsList>
            <TabsTrigger value="recent">Recent Jobs</TabsTrigger>
            <TabsTrigger value="saved">Saved Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="recent">
            <div className="mt-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Modified Images</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map(job => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.prompt}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {job.status === 'generating' ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-gray-600 min-w-[3rem]">{job.progress}%</span>
                            </>
                          ) : job.status === 'done' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.imageUrl && (
                          <img
                            src={job.imageUrl}
                            alt={job.prompt}
                            className="w-48 h-48 object-cover rounded shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                            onClick={() => window.open(job.imageUrl, '_blank')}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {job.modifiedImages?.map((img, i) => (
                            <img
                              key={i}
                              src={img.url}
                              alt={`${job.prompt} - ${img.type}`}
                              className="w-48 h-48 object-cover rounded shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
                              onClick={() => window.open(img.url, '_blank')}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.status === 'done' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSaveJob(job.id)}
                            >
                              {job.saved ? (
                                <>
                                  <BookmarkCheck className="h-4 w-4 mr-1" />
                                  Saved
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="h-4 w-4 mr-1" />
                                  Save
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpscale(job.id, 1)}
                            >
                              U1
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpscale(job.id, 2)}
                            >
                              U2
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpscale(job.id, 3)}
                            >
                              U3
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVariation(job.id, 1)}
                            >
                              V1
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="saved">
            <div className="mt-8">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Modified Images</TableHead>
                    <TableHead>Parameters</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {savedJobs.map(job => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.prompt}</TableCell>
                      <TableCell>
                        <img
                          src={job.image_url}
                          alt={job.prompt}
                          className="w-48 h-48 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(job.image_url, '_blank')}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {job.modified_images?.map((img, i) => (
                            <img
                              key={i}
                              src={img.url}
                              alt={`${job.prompt} - ${img.type}`}
                              className="w-48 h-48 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(img.url, '_blank')}
                            />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(job.parameters).map(([key, value]) => value && (
                            <Badge
                              key={key}
                              variant="secondary"
                              className={
                                key === 'sref' ? 'bg-blue-100 text-blue-800' :
                                key === 'ar' ? 'bg-green-100 text-green-800' :
                                'bg-purple-100 text-purple-800'
                              }
                            >
                              --{key} {String(value)}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSaveJob(job.original_job_id)}
                        >
                          <BookmarkCheck className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default App
