// hooks/useToolProcess.ts
import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

type JobStatus = 'idle' | 'uploading' | 'queued' | 'active' | 'completed' | 'failed'

interface UseToolProcessReturn {
  status: JobStatus
  progress: number
  result: any
  error: string | null
  startProcess: (files: File[], tool: string, options: object) => Promise<void>
  reset: () => void
}

export function useToolProcess(): UseToolProcessReturn {
  const [status, setStatus] = useState<JobStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL!)
    setSocket(newSocket)
    return () => { newSocket.disconnect() }
  }, [])

  const startProcess = useCallback(async (
    files: File[],
    tool: string,
    options: object
  ) => {
    try {
      setStatus('uploading')
      setProgress(0)
      setError(null)

      // Build form data
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      formData.append('tool', tool)
      formData.append('options', JSON.stringify(options))

      // Upload & create job
      const res = await fetch('/api/process', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      const { jobId } = data
      setStatus('queued')

      // Subscribe to WebSocket updates
      socket?.emit('subscribe:job', jobId)

      socket?.on('job:progress', ({ jobId: jId, progress: p }) => {
        if (jId === jobId) {
          setStatus('active')
          setProgress(p)
        }
      })

      socket?.on('job:completed', ({ jobId: jId, result: r }) => {
        if (jId === jobId) {
          setStatus('completed')
          setProgress(100)
          setResult(r)
        }
      })

      socket?.on('job:failed', ({ jobId: jId, error: e }) => {
        if (jId === jobId) {
          setStatus('failed')
          setError(e)
        }
      })

    } catch (err: any) {
      setStatus('failed')
      setError(err.message)
    }
  }, [socket])

  const reset = useCallback(() => {
    setStatus('idle')
    setProgress(0)
    setResult(null)
    setError(null)
  }, [])

  return { status, progress, result, error, startProcess, reset }
}
