import { describe, expect, test } from 'bun:test'
import { supabaseAdmin } from '../lib/supabase-admin'
import { toggleUnavailable, undoUnavailable } from '../lib/availability'
import { toggleDone } from '../lib/participants'
import { pickDate } from '../lib/plans'
import {
  ParticipantNotFoundError,
  PlanNotActiveError,
  UndoExpiredError,
  UndoNotAllowedError,
  ValidationError,
} from '../lib/errors'
import { getDate, setupPlan } from './helpers'

describe('marking a day unavailable', () => {
  test('crosses the day off for everyone', async () => {
    const { dates, participants } = await setupPlan(3, ['Alex'])
    const result = await toggleUnavailable(participants[0].id, dates[0].id)
    expect(result.dateStatus).toBe('eliminated')
    expect((await getDate(dates[0].id)).status).toBe('eliminated')
    // Other days are untouched
    expect((await getDate(dates[1].id)).status).toBe('viable')
  })

  test('rejects a day from a different plan', async () => {
    const { participants } = await setupPlan(3, ['Alex'])
    const other = await setupPlan()
    await expect(toggleUnavailable(participants[0].id, other.dates[0].id)).rejects.toBeInstanceOf(
      ValidationError
    )
  })

  test('rejects an unknown participant', async () => {
    const { dates } = await setupPlan()
    await expect(toggleUnavailable(crypto.randomUUID(), dates[0].id)).rejects.toBeInstanceOf(
      ParticipantNotFoundError
    )
  })

  test('is blocked while the participant is marked done', async () => {
    const { dates, participants } = await setupPlan(3, ['Alex'])
    await toggleDone(participants[0].id)
    await expect(toggleUnavailable(participants[0].id, dates[0].id)).rejects.toBeInstanceOf(
      PlanNotActiveError
    )
  })

  test('is blocked once the organizer has picked a day', async () => {
    const { owner, plan, dates, participants } = await setupPlan(3, ['Alex'])
    await pickDate(plan.id, dates[0].id, owner)
    // Plan is now locked, so every day is frozen
    await expect(toggleUnavailable(participants[0].id, dates[1].id)).rejects.toBeInstanceOf(
      PlanNotActiveError
    )
    expect((await getDate(dates[1].id)).status).toBe('viable')
  })
})

describe('undo', () => {
  test('restores the day when nobody else crossed it off', async () => {
    const { dates, participants } = await setupPlan(3, ['Alex'])
    const { eventLogId } = await toggleUnavailable(participants[0].id, dates[0].id)
    const result = await undoUnavailable(participants[0].id, eventLogId)
    expect(result.dateStatus).toBe('viable')
    expect((await getDate(dates[0].id)).status).toBe('viable')
  })

  test('keeps the day crossed off if someone else also marked it', async () => {
    const { dates, participants } = await setupPlan(3, ['Alex', 'Sam'])
    const [alex, sam] = participants
    const { eventLogId } = await toggleUnavailable(alex.id, dates[0].id)
    await toggleUnavailable(sam.id, dates[0].id)
    const result = await undoUnavailable(alex.id, eventLogId)
    expect(result.dateStatus).toBe('eliminated')
    expect((await getDate(dates[0].id)).status).toBe('eliminated')
  })

  test("can't undo someone else's mark", async () => {
    const { dates, participants } = await setupPlan(3, ['Alex', 'Sam'])
    const [alex, sam] = participants
    const { eventLogId } = await toggleUnavailable(alex.id, dates[0].id)
    await expect(undoUnavailable(sam.id, eventLogId)).rejects.toBeInstanceOf(UndoNotAllowedError)
  })

  test('is refused after the undo window has passed', async () => {
    const { dates, participants } = await setupPlan(3, ['Alex'])
    const { eventLogId } = await toggleUnavailable(participants[0].id, dates[0].id)
    await supabaseAdmin
      .from('event_log')
      .update({ undo_deadline: new Date(Date.now() - 1000).toISOString() })
      .eq('id', eventLogId)
    await expect(undoUnavailable(participants[0].id, eventLogId)).rejects.toBeInstanceOf(UndoExpiredError)
  })

  test('only works once', async () => {
    const { dates, participants } = await setupPlan(3, ['Alex'])
    const { eventLogId } = await toggleUnavailable(participants[0].id, dates[0].id)
    await undoUnavailable(participants[0].id, eventLogId)
    await expect(undoUnavailable(participants[0].id, eventLogId)).rejects.toBeInstanceOf(UndoExpiredError)
  })

  test('marking done closes any open undo windows', async () => {
    const { dates, participants } = await setupPlan(3, ['Alex'])
    const alex = participants[0]
    const { eventLogId } = await toggleUnavailable(alex.id, dates[0].id)
    await toggleDone(alex.id)
    await toggleDone(alex.id)
    await expect(undoUnavailable(alex.id, eventLogId)).rejects.toBeInstanceOf(UndoExpiredError)
    expect((await getDate(dates[0].id)).status).toBe('eliminated')
  })
})
