// Web push fan-out for Wheels of Procrastination.
//
// The app's in-app banners cover the case where the app is OPEN; these
// functions are what reach a CLOSED app. Each one watches a shared Firestore
// doc, diffs before/after to find what's genuinely new, and pushes to the
// target profile's registered devices (profiles/{id}.pushTokens, written by
// src/push.ts — browsers and the Android shell in android/ both land there).
// Dead tokens are pruned as they're discovered.
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

initializeApp()
const db = getFirestore()

const SITE = 'https://spinningwheel-6ff51.web.app'
const PARENT_ID = 'diogo'
const KID_ID = 'ben'

/**
 * Push to every device the given profile registered. Prunes tokens FCM rejects.
 *
 * Two kinds of device are on that list now: browsers (webpush) and the Android
 * shell (a plain FCM token). A message carrying only a `webpush` block is
 * invalid for the second kind, so the payload leads with a platform-neutral
 * notification and lets the webpush block override it for browsers.
 *
 * Dad hears about St. Eugene 7 and nothing else (§10). The handlers below
 * already skip him, but trades and freeze gifts pick their target at runtime,
 * so the rule is enforced here too: a push to him without `steugene` is dropped.
 */
async function pushTo(profileId, { title, body, link = SITE, steugene = false }) {
  if (profileId === PARENT_ID && !steugene) {
    console.log(`push: ${profileId} only hears about St. Eugene — dropped "${title}"`)
    return
  }
  const snap = await db.doc(`profiles/${profileId}`).get()
  const entries = snap.get('pushTokens') ?? []
  const tokens = entries.map((t) => t.token).filter(Boolean)
  if (!tokens.length) {
    console.log(`push: ${profileId} has no registered devices`)
    return
  }

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { link }, // Android reads this off the tap intent to pick the screen
    android: {
      priority: 'high',
      notification: { channelId: 'crew_pings', color: '#f2d38a' },
    },
    webpush: {
      notification: { title, body, icon: `${SITE}/pwa-192.png`, badge: `${SITE}/pwa-192.png` },
      fcmOptions: { link },
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
 * Free-freeze desk: notify the kid when Dad grants. (Dad is no longer pinged
 * when Ben asks — §10.) Diffing by id means an unrelated write to the doc
 * (e.g. marking a gift seen) never re-sends an old notification.
 */
export const onFreezeDeskWrite = onDocumentWritten('app/freezeRequests', async (event) => {
  const before = event.data?.before?.data() ?? {}
  const after = event.data?.after?.data() ?? {}

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

/**
 * Remote final tests: ping Ben when Dad authorises one on his device. The result
 * is not pushed to Dad (§10) — he reads it in the app. Diffed by id + status so
 * unrelated writes (a "later" tap, a dismissed banner) stay silent.
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
  }
})

/**
 * Essays: the loop only works if each side knows the ball is in their court.
 * Ping the writer when the marked-up copy comes back, and again when the grade
 * lands. (Dad is not pinged on a hand-in — §10.) Diffed by id + status, so
 * autosaving a draft (which writes this doc every few seconds) stays silent.
 */
export const onEssaysWrite = onDocumentWritten('app/essays', async (event) => {
  const beforeDoc = event.data?.before?.data() ?? {}
  const afterDoc = event.data?.after?.data() ?? {}
  const before = new Map((beforeDoc.essays ?? []).map((e) => [e.id, e]))

  for (const e of afterDoc.essays ?? []) {
    const prev = before.get(e.id)
    if (prev?.status === e.status && prev?.round === e.round) continue // nothing moved

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

  // The answer to a topic Ben suggested coming back (§19c-1). Diffed by id +
  // status, so re-saving the desk is silent.
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

/**
 * 🏫 St. Eugene 7 (§24h): Ben asks for more content, Dad decides.
 *
 * Nothing is generated until Dad taps Allow, so this notification IS the
 * feature — without it the ask sits in a doc nobody opens and he concludes the
 * button does nothing. Diffed by id, so the verdict write never re-pushes the
 * original ask.
 */
export const onStEugeneWrite = onDocumentWritten('app/steugene', async (event) => {
  const before = event.data?.before?.data() ?? {}
  const after = event.data?.after?.data() ?? {}

  const known = new Set((before.requests ?? []).map((r) => r.id))
  const decided = new Map((before.requests ?? []).map((r) => [r.id, r.status]))

  for (const r of after.requests ?? []) {
    // A brand-new ask → tell Dad.
    if (!known.has(r.id) && r.status === 'pending') {
      await pushTo(PARENT_ID, {
        title: `🏫 Ben wants ${r.want === 'questions' ? 'more questions' : 'another explanation'}`,
        body: `${r.subtopicTitle} — open St. Eugene 7 → Desk to allow or deny.`,
        link: `${SITE}/steugene7/desk`,
        steugene: true,
      })
      continue
    }
    // A verdict on an ask that was pending → tell Ben.
    if (decided.get(r.id) === 'pending' && r.status !== 'pending') {
      const body =
        r.status === 'approved'
          ? `${r.made} new card${r.made === 1 ? '' : 's'} on ${r.subtopicTitle}.`
          : r.status === 'denied'
            ? `Not right now — ask again later.`
            : `It did not work this time.`
      await pushTo(KID_ID, { title: r.status === 'approved' ? '✅ Dad said yes' : '🏫 Dad answered', body, link: `${SITE}/steugene7/subjects` })
    }
  }
})

export const onStickerTradeWrite = onDocumentWritten('app/stickerTrades', tradeWatcher('the Album tab'))
export const onCardTradeWrite = onDocumentWritten('app/cardTrades', tradeWatcher('the One Piece Album'))
export const onFcTradeWrite = onDocumentWritten('app/fcTrades', tradeWatcher('FC Lock → Trade'))
