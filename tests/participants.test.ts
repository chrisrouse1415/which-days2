import { describe, expect, test } from 'bun:test'
import { supabaseAdmin } from '../lib/supabase-admin'
import { joinPlan, toggleDone } from '../lib/participants'
import { updatePlanStatus } from '../lib/plans'
import { MAX_PARTICIPANTS_PER_PLAN } from '../lib/constants'
import {
  DuplicateNameError,
  PlanFullError,
  PlanNotActiveError,
  PlanNotFoundError,
  ValidationError,
} from '../lib/errors'
import { getParticipant, setupPlan } from './helpers'

describe('joinPlan', () => {
  test('joins with a trimmed name', async () => {
    const { plan } = await setupPlan()
    const participant = await joinPlan(plan.share_id, '  Alex  ')
    expect(participant.display_name).toBe('Alex')
    expect(participant.plan_id).toBe(plan.id)
    expect(participant.is_done).toBe(false)
  })

  test('rejects a blank or over-long name', async () => {
    const { plan } = await setupPlan()
    await expect(joinPlan(plan.share_id, '   ')).rejects.toBeInstanceOf(ValidationError)
    await expect(joinPlan(plan.share_id, 'x'.repeat(51))).rejects.toBeInstanceOf(ValidationError)
  })

  test('rejects a name already taken in the same plan', async () => {
    const { plan } = await setupPlan(3, ['Sam'])
    await expect(joinPlan(plan.share_id, 'Sam')).rejects.toBeInstanceOf(DuplicateNameError)
  })

  test('the same name can join a different plan', async () => {
    await setupPlan(3, ['Sam'])
    const { plan } = await setupPlan()
    expect((await joinPlan(plan.share_id, 'Sam')).display_name).toBe('Sam')
  })

  test('rejects an unknown share link', async () => {
    await expect(joinPlan('zzzzzzzzzz', 'Alex')).rejects.toBeInstanceOf(PlanNotFoundError)
  })

  test('rejects joining a locked plan', async () => {
    const { owner, plan } = await setupPlan()
    await updatePlanStatus(plan.id, owner, 'locked')
    await expect(joinPlan(plan.share_id, 'Alex')).rejects.toBeInstanceOf(PlanNotActiveError)
  })

  test('rejects joining once the plan is full', async () => {
    const { plan } = await setupPlan()
    const rows = Array.from({ length: MAX_PARTICIPANTS_PER_PLAN }, (_, i) => ({
      plan_id: plan.id,
      display_name: `Person ${i}`,
    }))
    const { error } = await supabaseAdmin.from('participants').insert(rows)
    expect(error).toBeNull()
    await expect(joinPlan(plan.share_id, 'One too many')).rejects.toBeInstanceOf(PlanFullError)
  })
})

describe('toggleDone', () => {
  test('flips done on and off', async () => {
    const { participants } = await setupPlan(3, ['Alex'])
    const [alex] = participants
    expect(await toggleDone(alex.id)).toEqual({ is_done: true })
    expect((await getParticipant(alex.id)).is_done).toBe(true)
    expect(await toggleDone(alex.id)).toEqual({ is_done: false })
    expect((await getParticipant(alex.id)).is_done).toBe(false)
  })

  test('is blocked once the plan is locked', async () => {
    const { owner, plan, participants } = await setupPlan(3, ['Alex'])
    await updatePlanStatus(plan.id, owner, 'locked')
    await expect(toggleDone(participants[0].id)).rejects.toBeInstanceOf(PlanNotActiveError)
  })
})
