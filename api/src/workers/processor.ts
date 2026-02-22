// api/src/workers/processor.ts
import { Worker, Job } from 'bullmq'
import { connection } from '../services/redis'
import { pdfTools } from '../tools/pdf'
import { imageTools } from '../tools/image'
import { videoTools } from '../tools/video'
import { uploadResult, cleanupSession } from '../services/storage'

const TOOL_MAP: Record<string, Function> = {
  // PDF Tools
  'pdf-to-word':      pdfTools.toWord,
  'pdf-to-excel':     pdfTools.toExcel,
  'pdf-compress':     pdfTools.compress,
  'pdf-merge':        pdfTools.merge,
  'pdf-split':        pdfTools.split,
  'pdf-to-jpg':       pdfTools.toJpg,
  'jpg-to-pdf':       pdfTools.fromJpg,
  'pdf-rotate':       pdfTools.rotate,
  'pdf-watermark':    pdfTools.watermark,
  'pdf-unlock':       pdfTools.unlock,
  'pdf-protect':      pdfTools.protect,
  'pdf-sign':         pdfTools.sign,
  'pdf-ocr':          pdfTools.ocr,
  'pdf-repair':       pdfTools.repair,
  'pdf-flatten':      pdfTools.flatten,

  // Image Tools
  'img-compress':     imageTools.compress,
  'img-resize':       imageTools.resize,
  'img-convert':      imageTools.convert,
  'img-crop':         imageTools.crop,
  'img-watermark':    imageTools.watermark,
  'img-remove-bg':    imageTools.removeBg,

  // Video Tools
  'video-compress':   videoTools.compress,
  'video-convert':    videoTools.convert,
  'video-trim':       videoTools.trim,
}

export const processor = new Worker(
  'tool-matrix-jobs',
  async (job: Job) => {
    const { sessionId, tool, files, options } = job.data

    console.log(`[Worker] Processing job ${job.id}: ${tool}`)

    // Update initial progress
    await job.updateProgress(5)

    // Get the tool handler
    const toolHandler = TOOL_MAP[tool]
    if (!toolHandler) {
      throw new Error(`Unknown tool: ${tool}`)
    }

    // Process files
    const outputFiles = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Progress per file
      const progressStart = 10 + (i / files.length) * 80
      await job.updateProgress(Math.round(progressStart))

      // Run the tool
      const outputBuffer = await toolHandler(file, options, async (p: number) => {
        const fileProgress = progressStart + (p / 100) * (80 / files.length)
        await job.updateProgress(Math.round(fileProgress))
      })

      // Upload result
      const outputFile = await uploadResult(outputBuffer, file, tool, sessionId)
      outputFiles.push(outputFile)
    }

    await job.updateProgress(100)

    // Cleanup temp input files
    await cleanupSession(sessionId, 'input')

    return {
      success: true,
      files: outputFiles,
      processedAt: Date.now()
    }
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 50,
      duration: 60000 // 50 jobs per minute
    }
  }
)

// Events
processor.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`)
})

processor.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message)
})

processor.on('progress', (job, progress) => {
  console.log(`⚡ Job ${job.id}: ${progress}%`)
})
