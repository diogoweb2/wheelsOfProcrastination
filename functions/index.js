// Web push fan-out for Wheels of Procrastination.
//
// The app's in-app banners cover the case where the app is OPEN; these
// functions are what reach a CLOSED app. Each one watches a shared Firestore
// doc, diffs before/after to find what's genuinely new, and pushes to the
// target profile's registered devices (profiles/{id}.pushTokens, written by
// src/push.ts). Dead tokens are pruned as they're discovered.
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

initializeApp()
const db = getFirestore()

const SITE = 'https://spinningwheel-6ff51.web.app'
const PARENT_ID = 'diogo'
const KID_ID = 'ben'

/** Push to every device the given profile registered. Prunes tokens FCM rejects. */
async function pushTo(profileId, { title, body }) {
  const snap = await db.doc(`profiles/${profileId}`).get()
  const entries = snap.get('pushTokens') ?? []
  const tokens = entries.map((t) => t.token).filter(Boolean)
  if (!tokens.length) {
    console.log(`push: ${profileId} has no registered devices`)
    return
  }

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    webpush: {
      notification: { title, body, icon: `${SITE}/pwa-192.png`, badge: `${SITE}/pwa-192.png` },
      fcmOptions: { link: SITE },
    },
  })

  const dead = res.responses
    .map((r, i) =>
      !r.success && /not-registered|invalid-argument|invalid-registration/.test(r.error?.code ?? '')
        ? tokens[i]
        : null,
    )
    .filter(Boolean)
  if (dead.length) {
    await db.doc(`profiles/${profileId}`).update({
      pushTokens: FieldValue.arrayRemove(...entries.filter((t) => dead.includes(t.token))),
    })
  }
  console.log(
    `push: ${profileId} ${res.successCount}/${tokens.length} ok${dead.length ? `, pruned ${dead.length}` : ''}`,
  )
}

/**
 * Free-freeze desk: notify Dad when the kid asks, and the kid when Dad grants.
 * Diffing by id means an unrelated write to the doc (e.g. marking a gift seen)
 * never re-sends an old notification.
 */
export const onFreezeDeskWrite = onDocumentWritten('app/freezeRequests', async (event) => {
  const before = event.data?.before?.data() ?? {}
  const after = event.data?.after?.data() ?? {}

  const knownAsks = new Set((before.requests ?? []).map((r) => r.id))
  for (const r of after.requests ?? []) {
    if (knownAsks.has(r.id) || r.status !== 'pending') continue
    await pushTo(PARENT_ID, {
      title: '🆘 Ben needs a Streak Freeze!',
      body: r.reason ? `"${r.reason}"` : 'His streak is on the line — open Me → Admin to send one.',
    })
  }

  const knownGifts = new Set((before.gifts ?? []).map((g) => g.id))
  for (const g of after.gifts ?? []) {
    if (knownGifts.has(g.id)) continue
    const what = g.count === 1 ? 'a free Streak Freeze' : `${g.count} free Streak Freezes`
    await pushTo(g.toId ?? KID_ID, {
      title: `🧊 ${g.fromName} sent you ${what}!`,
      body: g.message || (g.revived ? `Your ${g.revived}-day streak is back!` : 'Open the app to see it.'),
    })
  }
})

// --- 9:30pm last call ------------------------------------------------------
// Mirrors src/logic/wheel.ts (isAvailableOn / isRequiredOn) and src/logic/dates.ts.
// Kept in sync by hand: these are the only rules the server needs, and pulling
// the real modules would mean bundling the app's TS into the functions build.

const HOME_TZ = 'America/Toronto'

/** YYYY-MM-DD in the home timezone, so "today" matches what the app shows. */
function todayKey(now = new Date()) {
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: HOME_TZ }).format(now)
}

function isWeekendKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return dow === 0 || dow === 6
}

function isAvailableOn(task, today) {
  if (task.startDate && today < task.startDate) return false
  if (task.dayScope === 'weekdays' && isWeekendKey(today)) return false
  if (task.dayScope === 'weekends' && !isWeekendKey(today)) return false
  return true
}

function isRequiredOn(task, today) {
  if (!task.required || task.archived) return false
  if (task.requiredFrom && today < task.requiredFrom) return false
  if (task.requiredUntil && today > task.requiredUntil) return false
  return isAvailableOn(task, today)
}

/**
 * What's still outstanding for a profile today: required checklist items not
 * yet ticked, and tasks sitting on the plate (pendingPicks) that would be
 * penalized at rollover. Picks only count while daily.day is actually today.
 */
function outstanding(data, today) {
  const doneIds = new Set((data.completions ?? []).filter((c) => c.day === today).map((c) => c.taskId))
  const tasks = data.tasks ?? []

  const required = tasks.filter((t) => isRequiredOn(t, today) && !doneIds.has(t.id))
  const picks =
    data.daily?.day === today
      ? (data.daily.pendingPicks ?? []).filter((p) => !doneIds.has(p.taskId))
      : []
  const pickNames = picks
    .map((p) => tasks.find((t) => t.id === p.taskId)?.name)
    .filter(Boolean)

  return { required: required.map((t) => t.name), picks: pickNames }
}

/** "2 must-dos + 1 on the plate" — the shared phrasing for both audiences. */
function summarize({ required, picks }) {
  const bits = []
  if (required.length) bits.push(`${required.length} must-do${required.length === 1 ? '' : 's'}`)
  if (picks.length) bits.push(`${picks.length} on the plate`)
  return bits.join(' + ')
}

/**
 * Nightly last call, 21:30 America/Toronto — before the midnight rollover that
 * burns freezes and penalizes abandoned picks. Each crewmate hears about their
 * own leftovers, and Diogo gets a SECOND ping about Ben's so he can nudge him.
 * Silent when there's nothing left, so the buzz keeps meaning something.
 */
export const nightlyLastCall = onSchedule(
  { schedule: '30 21 * * *', timeZone: HOME_TZ },
  async () => {
    const today = todayKey()
    const load = async (id) => (await db.doc(`profiles/${id}`).get()).data() ?? {}
    const [parent, kid] = await Promise.all([load(PARENT_ID), load(KID_ID)])

    for (const [id, data] of [
      [PARENT_ID, parent],
      [KID_ID, kid],
    ]) {
      const left = outstanding(data, today)
      const summary = summarize(left)
      if (!summary) continue
      const names = [...left.required, ...left.picks].slice(0, 3).join(', ')
      await pushTo(id, {
        title: `⏰ Last call — ${summary} left!`,
        body: `${names}${left.required.length + left.picks.length > 3 ? '…' : ''} · finish before midnight to keep the streak 🔥`,
      })
    }

    // Dad's reminder-to-remind: Ben's leftovers, sent to Diogo.
    const bens = outstanding(kid, today)
    const bensSummary = summarize(bens)
    if (bensSummary) {
      const names = [...bens.required, ...bens.picks].slice(0, 3).join(', ')
      await pushTo(PARENT_ID, {
        title: `👦 Ben still has ${bensSummary}`,
        body: `${names}${bens.required.length + bens.picks.length > 3 ? '…' : ''} · give him a nudge before bed!`,
      })
    }
  },
)

/** Sticker trades: ping whoever has to answer a newly-offered swap. */
export const onStickerTradeWrite = onDocumentWritten('app/stickerTrades', async (event) => {
  const before = event.data?.before?.data() ?? {}
  const after = event.data?.after?.data() ?? {}

  const known = new Set((before.trades ?? []).map((t) => t.id))
  for (const t of after.trades ?? []) {
    if (known.has(t.id) || t.status !== 'pending') continue
    await pushTo(t.toId, {
      title: '🤝 A trade offer!',
      body: `${t.fromName} wants to swap ${t.give.length} for ${t.want.length}. Open the Album tab.`,
    })
  }
})
