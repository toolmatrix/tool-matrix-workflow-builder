// api/src/services/websocket.ts
import { Server } from 'socket.io'
import { QueueEvents } from 'bullmq'
import { connection } from './redis'

export function initWebSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.FRONTEND_URL }
  })

  const queueEvents = new QueueEvents('tool-matrix-jobs', { connection })

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`)

    // Client subscribes to job updates
    socket.on('subscribe:job', (jobId: string) => {
      socket.join(`job:${jobId}`)
      console.log(`Socket ${socket.id} watching job ${jobId}`)
    })

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`)
    })
  })

  // Broadcast job events
  queueEvents.on('progress', ({ jobId, data }) => {
    io.to(`job:${jobId}`).emit('job:progress', {
      jobId,
      progress: data
    })
  })

  queueEvents.on('completed', ({ jobId, returnvalue }) => {
    io.to(`job:${jobId}`).emit('job:completed', {
      jobId,
      result: JSON.parse(returnvalue)
    })
  })

  queueEvents.on('failed', ({ jobId, failedReason }) => {
    io.to(`job:${jobId}`).emit('job:failed', {
      jobId,
      error: failedReason
    })
  })

  return io
}
