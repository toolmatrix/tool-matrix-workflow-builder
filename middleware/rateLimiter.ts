// middleware/rateLimiter.ts
const limits = {
  free: {
    filesPerDay: 20,
    maxFileSize: 20 * 1024 * 1024,  // 20MB
    maxFiles: 5,
    concurrentJobs: 1
  },
  pro: {
    filesPerDay: 500,
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 20,
    concurrentJobs: 5
  },
  unlimited: {
    filesPerDay: Infinity,
    maxFileSize: 500 * 1024 * 1024, // 500MB
    maxFiles: 100,
    concurrentJobs: 20
  }
}
