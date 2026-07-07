// Domain error classes shared by lib/ and API routes.

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class PlanNotFoundError extends Error {
  constructor(message = 'Plan not found') {
    super(message)
    this.name = 'PlanNotFoundError'
  }
}

export class PlanNotActiveError extends Error {
  constructor(message = 'Plan is no longer active') {
    super(message)
    this.name = 'PlanNotActiveError'
  }
}

export class NotOwnerError extends Error {
  constructor(message = 'You do not own this plan') {
    super(message)
    this.name = 'NotOwnerError'
  }
}

export class QuotaExceededError extends Error {
  constructor(message = 'Plan quota exceeded') {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

export class DuplicateNameError extends Error {
  constructor(message = 'That name is already taken') {
    super(message)
    this.name = 'DuplicateNameError'
  }
}

export class ParticipantNotFoundError extends Error {
  constructor(message = 'Participant not found') {
    super(message)
    this.name = 'ParticipantNotFoundError'
  }
}

export class PlanFullError extends Error {
  constructor(message = 'This plan is full') {
    super(message)
    this.name = 'PlanFullError'
  }
}

export class UndoExpiredError extends Error {
  constructor(message = 'Undo window has expired') {
    super(message)
    this.name = 'UndoExpiredError'
  }
}

export class UndoNotAllowedError extends Error {
  constructor(message = 'You cannot undo this action') {
    super(message)
    this.name = 'UndoNotAllowedError'
  }
}

export class DateLockedError extends Error {
  constructor(message = 'This date is locked') {
    super(message)
    this.name = 'DateLockedError'
  }
}

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthRequiredError'
  }
}
