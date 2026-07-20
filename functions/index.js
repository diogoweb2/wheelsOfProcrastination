// Web push fan-out for Wheels of Procrastination.
//
// The app's in-app banners cover the case where the app is OPEN; these
// functions are what reach a CLOSED app. Each one watches a shared Firestore
// doc, diffs before/after to find what's genuinely new, and pushes to the
// target profile's registered devices (profiles/{id}.pushTokens, written by
// src/push.ts). Dead tokens are pruned as they're discovered.
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
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
