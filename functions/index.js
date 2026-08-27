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

/**
 * Roblox bank (§20): tell Ben when time lands in it from somewhere other than
 * his own hands. His profile doc is written constantly, so this diffs the
 * roblox.entries list by id and only pushes rows Dad put there — a purchase he
 * made himself, or time he paid back, is never worth a notification.
 */
export const onRobloxBankWrite = onDocumentWritten(`profiles/${KID_ID}`, async (event) => {
  const before = event.data?.before?.data()?.roblox?.entries ?? []
  const after = event.data?.after?.data()?.roblox?.entries ?? []
  const known = new Set(before.map((e) => e.id))
  for (const e of after) {
    if (known.has(e.id) || (e.kind !== 'grant' && e.kind !== 'official')) continue
    const h = Math.floor(e.minutes / 60)
    const m = e.minutes % 60
    const time = h ? (m ? `${h}h ${m}m` : `${h}h`) : `${m}m`
    await pushTo(KID_ID, {
      title: `🎮 +${time} of Roblox time!`,
      body: e.note ? `${e.by}: "${e.note}"` : 'Open the app to see it.',
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

function dayOfWeekKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function isWeekendKey(key) {
  const dow = dayOfWeekKey(key)
  return dow === 0 || dow === 6
}

/** Does a day key fall on one of these days of the month (1–31)? */
function isMonthDayKey(key, days) {
  const [y, m, d] = key.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return days.some((x) => x === d || (x > last && d === last))
}

/** Season for a day key (northern hemisphere, month-based). */
function seasonOfKey(key) {
  const m = Number(key.split('-')[1]) // 1 = Jan
  if (m === 12 || m <= 2) return 'winter'
  if (m <= 5) return 'spring'
  if (m <= 8) return 'summer'
  return 'fall'
}

function isAvailableOn(task, today) {
  if (task.startDate && today < task.startDate) return false
  if (task.dayScope === 'weekdays' && isWeekendKey(today)) return false
  if (task.dayScope === 'weekends' && !isWeekendKey(today)) return false
  // hand-picked days (weekDays: 0=Sun…6=Sat); an empty list means no restriction
  if (task.dayScope === 'custom' && task.weekDays?.length && !task.weekDays.includes(dayOfWeekKey(today))) return false
  // hand-picked days of the month (monthDays: 1–31); a day past the end of a
  // short month fires on that month's last day, and an empty list = no restriction
  if (task.dayScope === 'monthdays' && task.monthDays?.length && !isMonthDayKey(today, task.monthDays)) return false
  // seasonal quests; an empty list means all year round
  if (task.seasons?.length && !task.seasons.includes(seasonOfKey(today))) return false
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

/**
 * Remote final tests: ping Ben when Dad authorises one on his device, and ping
 * Dad the moment it's over (passed, failed, or walked out of). Diffed by id +
 * status so unrelated writes (a "later" tap, a dismissed banner) stay silent.
 */
export const onFinalTestWrite = onDocumentWritten('app/finalTests', async (event) => {
  const before = new Map(((event.data?.before?.data() ?? {}).tests ?? []).map((t) => [t.id, t]))
  const after = (event.data?.after?.data() ?? {}).tests ?? []

  for (const t of after) {
    const prev = before.get(t.id)
    if (prev?.status === t.status) continue // nothing moved for this one

    if (t.status === 'pending' && !prev) {
      await pushTo(t.targetId, {
        title: '🎓 Your final test is open!',
        body: `${t.fromName} unlocked it — sit with a grown-up and open the app. One shot!`,
      })
    }

    if (t.status === 'done') {
      // a missed warm-up review means the new topic was never even sat
      if (t.reviewFailed) {
        await pushTo(PARENT_ID, {
          title: `🌫️ Ben missed the warm-up — ${t.scorePct}%`,
          body: 'His old topics went rusty, so the final test never started. Open the app to see which ones.',
        })
      } else {
        await pushTo(PARENT_ID, {
          title: t.passed ? `🏴‍☠️ Ben PASSED — ${t.scorePct}%` : `⛈️ Ben missed it — ${t.scorePct}%`,
          body: t.passed
            ? 'Devil Fruit awarded and his next topic just opened. Open the app for the details.'
            : 'He can train and retry another day. Open the app to see where the points went.',
        })
      }
    }

    if (t.status === 'abandoned') {
      await pushTo(PARENT_ID, {
        title: '🚪 Ben left the final test',
        body: 'His single attempt is spent. Authorise a new one if it was an accident.',
      })
    }
  }
})

/**
 * Essays: the loop only works if each side knows the ball is in their court.
 * Ping Dad when one is handed in, ping the writer when the marked-up copy comes
 * back, and ping him again when the grade lands. Diffed by id + status, so
 * autosaving a draft (which writes this doc every few seconds) stays silent.
 */
export const onEssaysWrite = onDocumentWritten('app/essays', async (event) => {
  const beforeDoc = event.data?.before?.data() ?? {}
  const afterDoc = event.data?.after?.data() ?? {}
  const before = new Map((beforeDoc.essays ?? []).map((e) => [e.id, e]))

  for (const e of afterDoc.essays ?? []) {
    const prev = before.get(e.id)
    if (prev?.status === e.status && prev?.round === e.round) continue // nothing moved

    if (e.status === 'submitted') {
      await pushTo(PARENT_ID, {
        title: `✍️ ${e.authorName} handed in an essay`,
        body: `"${e.title || e.topicTitle}" — round ${e.round}. Open the Essays app to mark it up.`,
      })
    }

    if (e.status === 'returned') {
      const open = (e.comments ?? []).filter((c) => c.status === 'open').length
      await pushTo(e.authorId, {
        title: '🔍 Your essay came back!',
        body: `${open} thing${open === 1 ? '' : 's'} to fix on "${e.title}". Nobody fixes it for you — that's the game.`,
      })
    }

    if (e.status === 'graded') {
      await pushTo(e.authorId, {
        title: `🏅 Your essay got ${e.grade}!`,
        body: `+${e.coins ?? 0} Berries for "${e.title}". Open the app to read the feedback.`,
      })
    }
  }

  // New topics going up is worth exactly one buzz, however many landed at once.
  const knownTopics = new Map((beforeDoc.topics ?? []).map((t) => [t.id, t]))
  const fresh = (afterDoc.topics ?? []).filter((t) => !knownTopics.has(t.id) && t.status === 'kept' && t.enabled)
  if (fresh.length) {
    await pushTo(KID_ID, {
      title: `💡 ${fresh.length} new essay topic${fresh.length === 1 ? '' : 's'}!`,
      body: `${fresh.map((t) => t.title).slice(0, 2).join(' · ')}${fresh.length > 2 ? '…' : ''} — pick one and write.`,
    })
  }

  // Ben asking for a topic of his own, and the answer coming back (§19c-1).
  // Both halves are diffed by id + status, so re-saving the desk is silent.
  const asked = (afterDoc.topics ?? []).filter((t) => !knownTopics.has(t.id) && t.status === 'suggested')
  for (const t of asked) {
    await pushTo(PARENT_ID, {
      title: `🙋 ${t.suggestedByName ?? 'Ben'} suggested an essay topic`,
      body: `"${t.title}" — open the Essays app → Topics to approve or turn it down.`,
    })
  }

  for (const t of afterDoc.topics ?? []) {
    const prev = knownTopics.get(t.id)
    if (!prev || prev.status !== 'suggested' || t.status === 'suggested') continue
    if (!t.suggestedById) continue
    await pushTo(
      t.suggestedById,
      t.status === 'kept'
        ? { title: '✅ Your topic got approved!', body: `"${t.title}" is on your Write list — go and write it.` }
        : { title: '💡 Dad turned that topic down', body: `Not "${t.title}" this time. Send him another idea.` },
    )
  }
})

/**
 * Swap tables: ping whoever has to answer a newly-offered swap. All three
 * collections (§14 stickers, §14b One Piece Album, §21g FC Lock) trade by the
 * identical rules over their own doc, so they share one handler and only differ
 * in which tab to send you to.
 */
function tradeWatcher(where) {
  return async (event) => {
    const before = event.data?.before?.data() ?? {}
    const after = event.data?.after?.data() ?? {}

    // Keyed by id AND haggle round: a counter-offer rewrites the same trade, and
    // the person it bounced back to has to hear about it just like the first offer.
    const seen = new Map((before.trades ?? []).map((t) => [t.id, t.round ?? 0]))
    for (const t of after.trades ?? []) {
      if (t.status !== 'pending') continue
      const round = t.round ?? 0
      if (seen.has(t.id) && seen.get(t.id) === round) continue
      // whoever's court it's in now — the addressee, or the proposer after a counter
      const target = (t.turn ?? 'to') === 'to' ? t.toId : t.fromId
      const gems = Math.max(0, Math.round(t.giveGems ?? 0))
      const puts = [
        t.give.length > 0 ? `${t.give.length} card${t.give.length === 1 ? '' : 's'}` : null,
        gems > 0 ? `${gems} Berries` : null,
        t.givePack ? 'a free pack' : null,
      ]
        .filter(Boolean)
        .join(' + ')
      await pushTo(target, {
        title: round > 0 ? '💰 A counter-offer!' : '🤝 A trade offer!',
        body:
          round > 0
            ? `The deal is now ${puts} for ${t.want.length}. Your call — open ${where}.`
            : `${t.fromName} offers ${puts} for ${t.want.length}. Open ${where}.`,
      })
    }
  }
}

export const onStickerTradeWrite = onDocumentWritten('app/stickerTrades', tradeWatcher('the Album tab'))
export const onCardTradeWrite = onDocumentWritten('app/cardTrades', tradeWatcher('the One Piece Album'))
export const onFcTradeWrite = onDocumentWritten('app/fcTrades', tradeWatcher('FC Lock → Trade'))
