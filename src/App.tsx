import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { midjourneyApi } from './services/midjourney'
import { savedJobsApi } from './services/savedJobs'
import { Loader2, X, Settings, BookmarkPlus, BookmarkCheck, CheckCircle2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Job, PromptParameters } from './types'

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
  const [isOpen, setIsOpen] = useState(false)

  const aspectRatios = [
    "1:1", "16:9", "4:3", "9:16", "3:2"
  ]

  return (
    <div className="mt-2">
      <Button
        variant="outline"
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
                  onClick={() => onParametersChange({...parameters, sref: 'random'})}
                >
                  Random
                </Button>
                <Input
                  type="number"
                  value={parameters.sref === 'random' ? '' : parameters.sref}
                  onChange={(e) => onParametersChange({...parameters, sref: Number(e.target.value)})}
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
                onValueChange={(value) => onParametersChange({...parameters, ar: value})}
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
                onValueChange={([value]) => onParametersChange({...parameters, s: value})}
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
  const [prompt, setPrompt] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [parameters, setParameters] = useState<PromptParameters>(() => {
    const saved = localStorage.getItem('promptParameters')
    const parsed = saved ? JSON.parse(saved) : DEFAULT_PARAMETERS
    return {
      sref: parsed.sref || DEFAULT_PARAMETERS.sref,
      ar: parsed.ar || DEFAULT_PARAMETERS.ar,
      s: typeof parsed.s === 'number' ? parsed.s : DEFAULT_PARAMETERS.s
    }
  })
  const { toast } = useToast()
  const statusPollingIntervals = useRef<{[key: string]: NodeJS.Timeout}>({})

  useEffect(() => {
    localStorage.setItem('promptParameters', JSON.stringify(parameters))
  }, [parameters])

  const handleRemoveParameter = (key: keyof PromptParameters) => {
    setParameters(prev => ({
      ...prev,
      [key]: DEFAULT_PARAMETERS[key]
    }))
  }

  const handleStatusCheck = async (hash: string, jobId: string) => {
    try {
      const status = await midjourneyApi.getStatus(hash)
      console.log('Status check response:', status)

      setJobs(prev => prev.map(job => {
        if (job.id !== jobId) return job

        const newStatus: Job['status'] =
          status.status === 'progress' || status.status === 'sent' || status.status === 'waiting'
            ? 'generating'
            : status.status === 'done'
              ? 'done'
              : status.status === 'error'
                ? 'error'
                : 'pending'

        const updatedJob: Job = {
          ...job,
          status: newStatus,
          progress: status.progress || 0,
          imageUrl: status.result?.url,
          error: status.status_reason || undefined,
          modifiedImages: job.modifiedImages || []
        }

        return updatedJob
      }))

      if (status.status === 'done' || status.status === 'error') {
        clearInterval(statusPollingIntervals.current[jobId])
        delete statusPollingIntervals.current[jobId]

        if (status.status === 'done' && status.result?.url) {
          toast({
            title: 'Image generated successfully!',
            description: 'You can now upscale or create variations.',
          })
        } else if (status.status === 'error') {
          toast({
            title: 'Error generating image',
            description: status.status_reason || 'An unknown error occurred',
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      console.error('Error checking status:', error)
      toast({
        title: 'Error checking status',
        description: 'Failed to check image generation status',
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    return () => {
      Object.values(statusPollingIntervals.current).forEach(clearInterval)
    }
  }, [])

  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        title: 'Please enter a prompt',
        description: 'The prompt cannot be empty',
        variant: 'destructive',
      })
      return
    }

    const fullPrompt = `${prompt} ${Object.entries(parameters)
      .map(([key, value]) => `--${key} ${value}`)
      .join(' ')}`

    const jobId = Date.now().toString()
    const newJob: Job = {
      id: jobId,
      prompt: fullPrompt,
      status: 'pending',
      progress: 0,
      hash: '',
      parameters: {
        sref: parameters.sref,
        ar: parameters.ar,
        s: parameters.s
      },
      createdAt: new Date(),
      isSaved: false,
      modifiedImages: []
    }

    setJobs(prev => [newJob, ...prev])
    setPrompt('')

    try {
      console.log('Making API call to generate image...')
      const response = await midjourneyApi.imagine({ prompt: fullPrompt })
      console.log('API response:', response)

      if (response.hash) {
        setJobs(prev => prev.map(job =>
          job.id === jobId
            ? { ...job, hash: response.hash, status: 'generating' }
            : job
        ))

        const checkStatus = async () => {
          await handleStatusCheck(response.hash, jobId)
        }
        statusPollingIntervals.current[jobId] = setInterval(checkStatus, 5000)
        checkStatus()
      }
    } catch (error) {
      console.error('Error generating image:', error)
      setJobs(prev => prev.map(job =>
        job.id === jobId
          ? { ...job, status: 'error', error: 'Failed to generate image' }
          : job
      ))
      toast({
        title: 'Error',
        description: 'Failed to generate image. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleSaveJob = async (jobId: string) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) return;

      if (job.isSaved) {
        // Unsave the job
        await savedJobsApi.deleteSavedJob(job.savedJobId!);
        setJobs(prev => prev.map(j =>
          j.id === jobId
            ? { ...j, isSaved: false, savedJobId: undefined }
            : j
        ));
        toast({
          title: 'Job unsaved',
          description: 'The job has been removed from your saved jobs.',
        });
      } else {
        // Save the job
        const savedJob = await savedJobsApi.saveJob({
          original_job_id: job.id,
          prompt: job.prompt,
          parameters: job.parameters || {},
          image_url: job.imageUrl!,
          modified_images: job.modifiedImages?.map(img => ({
            type: img.type,
            url: img.url
          })) || [],
          created_at: job.createdAt
        });
        setJobs(prev => prev.map(j =>
          j.id === jobId
            ? { ...j, isSaved: true, savedJobId: savedJob.id }
            : j
        ));
        toast({
          title: 'Job saved',
          description: 'The job has been saved to your collection.',
        });
      }
    } catch (error) {
      console.error('Error saving/unsaving job:', error);
      toast({
        title: 'Error',
        description: 'Failed to save/unsave the job. Please try again.',
        variant: 'destructive',
      });
    }
  }

  const handleUpscale = async (jobId: string, index: number) => {
    try {
      const job = jobs.find(j => j.id === jobId)
      if (!job?.hash) return

      const response = await midjourneyApi.upscale({
        hash: job.hash,
        choice: index
      })

      // Start tracking the upscale job
      const upscaleJobId = `${jobId}-upscale-${index}`
      setJobs(prev => prev.map(j => {
        if (j.id !== jobId) return j
        return {
          ...j,
          modifiedImages: [
            ...(j.modifiedImages || []),
            { type: 'upscale', url: '', jobId: upscaleJobId }
          ]
        }
      }))

      // Poll for upscale status
      const checkStatus = async () => {
        const status = await midjourneyApi.getStatus(response.hash)
        if (status.status === 'done' && status.result?.url) {
          setJobs(prev => prev.map(j => {
            if (j.id !== jobId) return j
            return {
              ...j,
              modifiedImages: j.modifiedImages?.map(img =>
                img.jobId === upscaleJobId
                  ? { ...img, url: status.result!.url }
                  : img
              )
            }
          }))
          if (statusPollingIntervals.current[upscaleJobId]) {
            clearInterval(statusPollingIntervals.current[upscaleJobId])
            delete statusPollingIntervals.current[upscaleJobId]
          }
        }
      }
      checkStatus()
      statusPollingIntervals.current[upscaleJobId] = setInterval(checkStatus, 5000)
    } catch (error) {
      console.error('Error upscaling image:', error)
      toast({
        title: 'Error upscaling image',
        description: 'Failed to upscale the image',
        variant: 'destructive',
      })
    }
  }

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
    if (e.key === 'Enter') {
      handleGenerate()
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Midjourney Image Generator</h1>

      <div className="space-y-4">
        <div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your prompt..."
                className="pr-32"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 items-center">
                {Object.entries(parameters).map(([key, value]) => (
                  <Badge
                    key={key}
                    variant="secondary"
                    className={`cursor-pointer flex items-center gap-1 text-xs ${
                      key === 'sref' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' :
                      key === 'ar' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                      'bg-purple-100 text-purple-800 hover:bg-purple-200'
                    }`}
                  >
                    --{key} {String(value)}
                    <X
                      className="h-2 w-2 hover:text-red-500 transition-colors"
                      onClick={() => handleRemoveParameter(key as keyof PromptParameters)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerate}>Generate</Button>
          </div>
          <ParameterControls
            parameters={parameters}
            onParametersChange={setParameters}
          />
        </div>

        <div className="mt-8">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prompt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
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
                      {job.status === 'generating' && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      <span className="capitalize">{job.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-[200px] flex items-center gap-2">
                        <Progress value={job.progress} className="h-2" />
                        {job.status === 'generating' ? (
                          <span className="text-sm text-gray-600 min-w-[3rem]">{job.progress}%</span>
                        ) : job.status === 'done' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {job.imageUrl && (
                      <img
                        src={job.imageUrl}
                        alt={job.prompt}
                        className="w-48 h-48 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
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
                          className="w-48 h-48 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
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
                          {job.isSaved ? (
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
      </div>
    </div>
  )
}

export default App
