import { supabaseAdmin } from '../lib/supabase-admin'
import { createPlan } from '../lib/plans'
import { joinPlan } from '../lib/participants'

/** A fresh organizer per test, so tests never share plans or quota. */
export async function createOwner() {
  const clerkId = `test_${crypto.randomUUID()}`
  const { error } = await supabaseAdmin.from('users').insert({ clerk_id: clerkId })
  if (error) throw error
  return clerkId
}

/** `count` consecutive YYYY-MM-DD dates starting tomorrow (UTC). */
export function futureDates(count: number, startInDays = 1) {
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.now() + (startInDays + i) * 86_400_000).toISOString().slice(0, 10)
  )
}

/** An owner with a plan of `dateCount` dates, plus the given participants joined. */
export async function setupPlan(dateCount = 3, participantNames: string[] = []) {
  const owner = await createOwner()
  const { plan, planDates } = await createPlan(owner, { title: 'Test plan', dates: futureDates(dateCount) })
  const dates = [...planDates].sort((a, b) => a.date.localeCompare(b.date))
  const participants = []
  for (const name of participantNames) {
    participants.push(await joinPlan(plan.share_id, name))
  }
  return { owner, plan, dates, participants }
}

export async function getDate(planDateId: string) {
  const { data, error } = await supabaseAdmin.from('plan_dates').select().eq('id', planDateId).single()
  if (error) throw error
  return data
}

export async function getParticipant(participantId: string) {
  const { data, error } = await supabaseAdmin.from('participants').select().eq('id', participantId).single()
  if (error) throw error
  return data
}

export async function getPlan(planId: string) {
  const { data, error } = await supabaseAdmin.from('plans').select().eq('id', planId).single()
  if (error) throw error
  return data
}
