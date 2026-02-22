// api/src/routes/process.ts
import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { jobQueue } from '../services/queue'
import { uploadToStorage } from '../services/storage'
import { validateTool } from '../utils/validators'

const router = express.Router()
const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } })

// POST /api/process
router.post('/process', upload.array('files', 20), async (req, res) => {
  try {
    const { tool, options } = req.body
    const files = req.files as Express.Multer.File[]

    // Validate
    if (!validateTool(tool)) {
      return res.status(400).json({ error: 'Invalid tool specified' })
    }

    if (!files?.length) {
      return res.status(400).json({ error: 'No files provided' })
    }

    // Upload files to temp storage
    const sessionId = uuidv4()
    const uploadedFiles = await Promise.all(
      files.map(file => uploadToStorage(file, sessionId))
    )

    // Create job
    const job = await jobQueue.add(tool, {
      sessionId,
      tool,
      files: uploadedFiles,
      options: JSON.parse(options || '{}'),
      createdAt: Date.now()
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 7200 },  // 2 hours
      removeOnFail: { age: 86400 }       // 24 hours
    })

    res.json({
      success: true,
      jobId: job.id,
      sessionId,
      status: 'queued',
      message: 'Files uploaded. Processing started.'
    })

  } catch (error) {
    console.error('Process error:', error)
    res.status(500).json({ error: 'Processing failed. Please try again.' })
  }
})

// GET /api/status/:jobId
router.get('/status/:jobId', async (req, res) => {
  const { jobId } = req.params
  const job = await jobQueue.getJob(jobId)

  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  const state = await job.getState()
  const progress = job.progress

  const response: any = {
    jobId,
    status: state,
    progress: typeof progress === 'number' ? progress : 0
  }

  if (state === 'completed') {
    response.result = job.returnvalue
    response.downloadUrls = job.returnvalue?.files
  }

  if (state === 'failed') {
    response.error = job.failedReason
  }

  res.json(response)
})

export default router
