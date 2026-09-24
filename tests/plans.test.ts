import { describe, expect, test } from 'bun:test'
import { supabaseAdmin } from '../lib/supabase-admin'
import { toggleUnavailable } from '../lib/availability'
import { toggleDone } from '../lib/participants'
import { checkQuota } from '../lib/quota'
import {
  createPlan,
  editPlan,
  forceReopenDate,
  getOwnerPlans,
  getPlanWithMatrix,
  pickDate,
  resetPlan,
  updatePlanStatus,
} from '../lib/plans'
import { MAX_DATES, MAX_PLANS } from '../lib/constants'
import { NotOwnerError, QuotaExceededError, ValidationError } from '../lib/errors'
import { createOwner, futureDates, getDate, getParticipant, getPlan, setupPlan } from './helpers'

describe('createPlan', () => {
  test('creates a plan with its dates in order and a share link', async () => {
    const owner = await createOwner()
    const dates = futureDates(3)
    const result = await createPlan(owner, { title: '  Team dinner ', dates: [dates[2], dates[0], dates[1]] })
    expect(result.plan.title).toBe('Team dinner')
    expect(result.plan.status).toBe('active')
    expect(result.planDates.map((d) => d.date)).toEqual(dates)
    expect(result.planDates.every((d) => d.status === 'viable')).toBe(true)
    expect(result.shareUrl).toBe(`/plan/${result.plan.share_id}`)
  })

  test('rejects bad input', async () => {
    const owner = await createOwner()
    const [d1] = futureDates(1)
    const cases = [
      { title: '   ', dates: [d1] },
      { title: 'x'.repeat(101), dates: [d1] },
      { title: 'No dates', dates: [] },
      { title: 'Duplicate', dates: [d1, d1] },
      { title: 'Bad format', dates: ['24/12/2030'] },
      { title: 'Too many', dates: futureDates(MAX_DATES + 1) },
      { title: 'In the past', dates: ['2020-01-01'] },
    ]
    for (const input of cases) {
      await expect(createPlan(owner, input)).rejects.toBeInstanceOf(ValidationError)
    }
  })
})

describe('plan quota', () => {
  test(`allows ${MAX_PLANS} plans, then refuses more`, async () => {
    const owner = await createOwner()
    for (let i = 0; i < MAX_PLANS; i++) {
      await createPlan(owner, { title: `Plan ${i}`, dates: futureDates(1) })
    }
    expect(await checkQuota(owner)).toEqual({ planCount: MAX_PLANS, maxPlans: MAX_PLANS, canCreate: false })
    await expect(createPlan(owner, { title: 'One more', dates: futureDates(1) })).rejects.toBeInstanceOf(
      QuotaExceededError
    )
  })

  test('locked plans count toward the quota, deleted ones free a slot', async () => {
    const owner = await createOwner()
    const ids: string[] = []
    for (let i = 0; i < MAX_PLANS; i++) {
      ids.push((await createPlan(owner, { title: `Plan ${i}`, dates: futureDates(1) })).plan.id)
    }
    await updatePlanStatus(ids[0], owner, 'locked')
    expect((await checkQuota(owner)).canCreate).toBe(false)

    await updatePlanStatus(ids[1], owner, 'deleted')
    expect((await checkQuota(owner)).canCreate).toBe(true)
  })
})

describe('ownership', () => {
  test("another user can't manage someone else's plan", async () => {
    const { plan, dates } = await setupPlan()
    const stranger = await createOwner()
    await expect(updatePlanStatus(plan.id, stranger, 'locked')).rejects.toBeInstanceOf(NotOwnerError)
    await expect(pickDate(plan.id, dates[0].id, stranger)).rejects.toBeInstanceOf(NotOwnerError)
    await expect(resetPlan(plan.id, stranger)).rejects.toBeInstanceOf(NotOwnerError)
    await expect(getPlanWithMatrix(plan.id, stranger)).rejects.toBeInstanceOf(NotOwnerError)
  })
})

describe('plan status', () => {
  test('a deleted plan stays deleted', async () => {
    const { owner, plan } = await setupPlan()
    await updatePlanStatus(plan.id, owner, 'deleted')
    await expect(updatePlanStatus(plan.id, owner, 'active')).rejects.toBeInstanceOf(ValidationError)
    await expect(updatePlanStatus(plan.id, owner, 'locked')).rejects.toBeInstanceOf(ValidationError)
  })

  test('only a locked plan can be unlocked', async () => {
    const { owner, plan } = await setupPlan()
    await expect(updatePlanStatus(plan.id, owner, 'active')).rejects.toBeInstanceOf(ValidationError)
  })

  test('deleted plans drop off the dashboard list', async () => {
    const { owner, plan } = await setupPlan()
    await updatePlanStatus(plan.id, owner, 'deleted')
    expect(await getOwnerPlans(owner)).toEqual([])
  })
})

describe('picking a day', () => {
  test('locks the day and the plan', async () => {
    const { owner, plan, dates } = await setupPlan()
    await pickDate(plan.id, dates[1].id, owner)
    expect((await getDate(dates[1].id)).status).toBe('locked')
    expect((await getPlan(plan.id)).status).toBe('locked')

    const [summary] = await getOwnerPlans(owner)
    expect(summary.pickedDate).toBe(dates[1].date)
  })

  test("can't pick a day that's been crossed off", async () => {
    const { owner, plan, dates, participants } = await setupPlan(3, ['Alex'])
    await toggleUnavailable(participants[0].id, dates[0].id)
    await expect(pickDate(plan.id, dates[0].id, owner)).rejects.toBeInstanceOf(ValidationError)
    expect((await getPlan(plan.id)).status).toBe('active')
  })

  test('unlocking the plan un-picks the day', async () => {
    const { owner, plan, dates } = await setupPlan()
    await pickDate(plan.id, dates[0].id, owner)
    await updatePlanStatus(plan.id, owner, 'active')
    expect((await getPlan(plan.id)).status).toBe('active')
    expect((await getDate(dates[0].id)).status).toBe('viable')
  })
})

describe('editPlan', () => {
  test('adds and removes dates, and asks done participants to review', async () => {
    const { owner, plan, dates, participants } = await setupPlan(3, ['Alex', 'Sam'])
    const [alex, sam] = participants
    await toggleDone(alex.id)

    const [newDate] = futureDates(1, 10)
    const result = await editPlan(plan.id, owner, {
      title: 'Renamed',
      dates: [dates[0].date, dates[1].date, newDate],
    })

    expect(result.plan.title).toBe('Renamed')
    expect(result.dates.map((d) => d.date)).toEqual([dates[0].date, dates[1].date, newDate])
    expect((await getParticipant(alex.id)).needs_review).toBe(true)
    // Sam wasn't done, so has nothing to re-check
    expect((await getParticipant(sam.id)).needs_review).toBe(false)
  })

  test('changing only the title does not flag anyone', async () => {
    const { owner, plan, participants } = await setupPlan(3, ['Alex'])
    await toggleDone(participants[0].id)
    await editPlan(plan.id, owner, { title: 'Just a rename' })
    expect((await getParticipant(participants[0].id)).needs_review).toBe(false)
  })

  test("can't add a date in the past", async () => {
    const { owner, plan, dates } = await setupPlan()
    await expect(
      editPlan(plan.id, owner, { dates: [...dates.map((d) => d.date), '2020-01-01'] })
    ).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('resetPlan', () => {
  test('removes everyone and reopens every day', async () => {
    const { owner, plan, dates, participants } = await setupPlan(3, ['Alex'])
    await toggleUnavailable(participants[0].id, dates[0].id)

    const result = await resetPlan(plan.id, owner)
    expect(result.participants).toEqual([])
    expect(result.dates.every((d) => d.status === 'viable')).toBe(true)
  })
})

describe('forceReopenDate', () => {
  test('clears everyone’s marks on that day and asks done participants to review', async () => {
    const { owner, plan, dates, participants } = await setupPlan(3, ['Alex', 'Sam'])
    const [alex, sam] = participants
    await toggleUnavailable(alex.id, dates[0].id)
    await toggleUnavailable(sam.id, dates[0].id)
    await toggleDone(alex.id)

    const result = await forceReopenDate(plan.id, dates[0].id, owner)
    expect(result.reopenVersion).toBe(1)
    expect(result.reviewFlaggedCount).toBe(1)
    expect((await getDate(dates[0].id)).status).toBe('reopened')

    const { count } = await supabaseAdmin
      .from('availability')
      .select('*', { count: 'exact', head: true })
      .eq('plan_date_id', dates[0].id)
    expect(count).toBe(0)
  })

  test('only crossed-off days can be reopened', async () => {
    const { owner, plan, dates } = await setupPlan()
    await expect(forceReopenDate(plan.id, dates[0].id, owner)).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('getPlanWithMatrix', () => {
  test("shows each person's answer for each day", async () => {
    const { owner, plan, dates, participants } = await setupPlan(2, ['Alex', 'Sam'])
    const [alex, sam] = participants
    await toggleUnavailable(alex.id, dates[0].id)

    const { matrix } = await getPlanWithMatrix(plan.id, owner)
    expect(matrix[dates[0].id]).toEqual({ [alex.id]: 'unavailable', [sam.id]: 'available' })
    expect(matrix[dates[1].id]).toEqual({ [alex.id]: 'available', [sam.id]: 'available' })
  })
})
