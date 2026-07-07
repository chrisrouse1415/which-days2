import type { NextApiResponse } from 'next'
import { logger } from './logger'
import {
  AuthRequiredError,
  DateLockedError,
  DuplicateNameError,
  NotOwnerError,
  ParticipantNotFoundError,
  PlanFullError,
  PlanNotActiveError,
  PlanNotFoundError,
  QuotaExceededError,
  UndoExpiredError,
  UndoNotAllowedError,
  ValidationError,
} from './errors'

type LogContext = Record<string, unknown> & { route: string }

/**
 * Map a domain error to an HTTP response. Unknown errors are logged
 * and returned as an opaque 500.
 */
export function sendApiError(res: NextApiResponse, error: unknown, context: LogContext) {
  if (error instanceof ValidationError) {
    return res.status(400).json({ error: error.message })
  }
  if (error instanceof AuthRequiredError) {
    return res.status(401).json({ error: error.message })
  }
  if (error instanceof UndoNotAllowedError) {
    return res.status(403).json({ error: error.message })
  }
  // NotOwnerError maps to 404 so plan IDs can't be probed for existence
  if (
    error instanceof PlanNotFoundError ||
    error instanceof NotOwnerError ||
    error instanceof ParticipantNotFoundError
  ) {
    return res.status(404).json({ error: 'Not found' })
  }
  if (
    error instanceof DuplicateNameError ||
    error instanceof QuotaExceededError ||
    error instanceof PlanFullError
  ) {
    return res.status(409).json({ error: error.message })
  }
  if (
    error instanceof PlanNotActiveError ||
    error instanceof UndoExpiredError ||
    error instanceof DateLockedError
  ) {
    return res.status(410).json({ error: error.message })
  }

  logger.error('Unexpected API error', context, error)
  return res.status(500).json({ error: 'Internal server error' })
}
