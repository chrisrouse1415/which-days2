type LogContext = {
  route?: string
  planId?: string
  participantId?: string
  shareId?: string
  userId?: string
  planDateId?: string
  [key: string]: unknown
}

function serializeError(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    }
  }
  return { name: 'UnknownError', message: String(err) }
}

function log(level: 'info' | 'warn' | 'error', message: string, context?: LogContext, error?: unknown) {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  }
  if (error !== undefined) {
    entry.error = serializeError(error)
  }
  const output = JSON.stringify(entry)
  if (level === 'error') {
    console.error(output)
  } else if (level === 'warn') {
    console.warn(output)
  } else {
    console.log(output)
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext, error?: unknown) => log('error', message, context, error),
}
