/**
 * Production-safe logging utility
 * Only logs in development mode to avoid console spam in production
 * Structured logging for production monitoring
 */

const isDevelopment = process.env.NODE_ENV === "development"

interface LogContext {
  [key: string]: any
}

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  error: (...args: any[]) => {
    // Always log errors, but sanitize in production
    if (isDevelopment) {
      console.error(...args)
    } else {
      // In production, only log error messages, not full objects
      const sanitized = args.map((arg) => {
        if (arg instanceof Error) {
          return { message: arg.message, name: arg.name }
        }
        if (typeof arg === "object" && arg !== null) {
          // Remove sensitive fields
          const { stack, ...rest } = arg as any
          return rest
        }
        return arg
      })
      console.error(...sanitized)
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args)
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args)
    }
  },
  // Structured logging for job events
  job: {
    start: (jobId: string, userId: string, context?: LogContext) => {
      const logData = {
        type: "job.start",
        jobId,
        userId,
        timestamp: new Date().toISOString(),
        ...context,
      }
      if (isDevelopment) {
        console.log("[Job Start]", logData)
      } else {
        console.log(JSON.stringify(logData))
      }
    },
    stop: (jobId: string, userId: string, reason: string, context?: LogContext) => {
      const logData = {
        type: "job.stop",
        jobId,
        userId,
        reason,
        timestamp: new Date().toISOString(),
        ...context,
      }
      if (isDevelopment) {
        console.log("[Job Stop]", logData)
      } else {
        console.log(JSON.stringify(logData))
      }
    },
    fail: (jobId: string, userId: string, error: string, context?: LogContext) => {
      const logData = {
        type: "job.fail",
        jobId,
        userId,
        error,
        timestamp: new Date().toISOString(),
        ...context,
      }
      if (isDevelopment) {
        console.error("[Job Fail]", logData)
      } else {
        console.error(JSON.stringify(logData))
      }
    },
    complete: (jobId: string, userId: string, context?: LogContext) => {
      const logData = {
        type: "job.complete",
        jobId,
        userId,
        timestamp: new Date().toISOString(),
        ...context,
      }
      if (isDevelopment) {
        console.log("[Job Complete]", logData)
      } else {
        console.log(JSON.stringify(logData))
      }
    },
    pause: (jobId: string, userId: string) => {
      const logData = {
        type: "job.pause",
        jobId,
        userId,
        timestamp: new Date().toISOString(),
      }
      if (isDevelopment) {
        console.log("[Job Pause]", logData)
      } else {
        console.log(JSON.stringify(logData))
      }
    },
    resume: (jobId: string, userId: string) => {
      const logData = {
        type: "job.resume",
        jobId,
        userId,
        timestamp: new Date().toISOString(),
      }
      if (isDevelopment) {
        console.log("[Job Resume]", logData)
      } else {
        console.log(JSON.stringify(logData))
      }
    },
  },
}

