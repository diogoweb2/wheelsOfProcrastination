// The head-to-head race that sits on top of a collection.
//
// Both crewmates run the same track, each riding their own profile icon, and
// whoever is nearer the finish flag wears the crown. Shared by the sticker
// album (§15b) and the Card Binder (§15b-2) — it only needs two progress
// readings and what the finish line is called, so there is no reason for each
// collection to grow its own.
import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { VictoryParty } from './VictoryParty'
import { sfx } from '../audio'

const RACE_MS = 1500

/**
 * Drives the start-of-race animation: 0 → 1 over RACE_MS on mount, so both
 * runners leave the starting line together every time the page opens.
 */
function useRaceIntro() {
  const [t, setT] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setT(1)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / RACE_MS)
      setT(p)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return t
}

export interface RaceProgress {
  owned: number
  total: number
  pct: number
}

/** Ease-out so the runners burst off the line and settle into their spot. */
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)

/**
 * Per-device memory of which victory has already thrown its party. Keyed by
 * album size too: growing the catalog starts a new edition, so completing that
 * one is a fresh win and earns its own party.
 */
const partySeenKey = (scope: string, viewerId: string, winnerId: string, total: number) =>
  `wop-party-seen:${scope}:${viewerId}:${winnerId}:${total}`

export function AlbumRace({
  mine,
  theirs,
  /** What one collectible is called in the caption: "sticker", "card". */
  noun = 'sticker',
  /** Keeps one collection's victory party from swallowing the other's. */
  scope = 'album',
}: {
  mine: RaceProgress
  theirs: RaceProgress | null
  noun?: string
  scope?: string
}) {
  const profiles = useStore((s) => s.profiles)
  const activeProfileId = useStore((s) => s.activeProfileId)
  const t = useRaceIntro()
  const racing = t < 1
  const [party, setParty] = useState<{ name: string; emoji: string } | null>(null)

  const me = profiles.find((p) => p.id === activeProfileId)
  const mate = profiles.find((p) => p.id !== activeProfileId)

  // Whoever glues in the last sticker wins the race — and the party.
  const winner =
    mine.pct === 100 && (!theirs || mine.owned >= theirs.owned)
      ? { id: activeProfileId ?? 'me', name: me?.name ?? 'You', emoji: me?.emoji ?? '👒' }
      : theirs?.pct === 100
        ? { id: mate?.id ?? 'mate', name: mate?.name ?? 'Crewmate', emoji: mate?.emoji ?? '🏴‍☠️' }
        : null

  // The party fires itself once per device, after the runners have settled.
  const viewer = activeProfileId ?? 'guest'
  useEffect(() => {
    if (!winner || racing) return
    const key = partySeenKey(scope, viewer, winner.id, mine.total)
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    setParty({ name: winner.name, emoji: winner.emoji })
  }, [winner?.id, racing, viewer, scope, mine.total]) // eslint-disable-line react-hooks/exhaustive-deps

  // the mate's world may not have landed yet — until it does, nobody leads
  const lead = theirs ? mine.owned - theirs.owned : null
  const runners = [
    { key: 'me', name: me?.name ?? 'You', emoji: me?.emoji ?? '👒', p: mine, lag: 0, crown: lead !== null && lead > 0 },
    { key: 'mate', name: mate?.name ?? 'Crewmate', emoji: mate?.emoji ?? '🏴‍☠️', p: theirs, lag: 0.12, crown: lead !== null && lead < 0 },
  ]

  let caption: string
  if (racing) caption = 'Ready… set… GO!'
  else if (lead === null) caption = `Waiting for ${mate?.name ?? 'your crewmate'}…`
  else if (lead === 0) caption = `Neck and neck — ${mine.owned} stickers each!`
  else {
    const ahead = lead > 0 ? me?.name ?? 'You' : mate?.name ?? 'Crewmate'
    const gap = Math.abs(lead)
    caption = `${ahead} leads by ${gap} ${noun}${gap === 1 ? '' : 's'}`
  }

  return (
    <div className="album-race">
      {party && <VictoryParty name={party.name} emoji={party.emoji} onDone={() => setParty(null)} />}

      <div className="album-race-head">
        <span>🏁 Race to {mine.total}</span>
        <span className="album-race-caption">{caption}</span>
      </div>

      {runners.map((r) => {
        // each lane runs its own clock so the two icons don't move in lockstep
        const laneT = easeOut(Math.max(0, Math.min(1, (t - r.lag) / (1 - r.lag))))
        const at = (r.p?.pct ?? 0) * laneT
        return (
          <div
            key={r.key}
            className={`race-lane ${!racing && r.crown ? 'is-leading' : ''} ${racing ? 'is-racing' : ''}`}
          >
            <div className="race-lane-top">
              <span className="race-name">
                {!racing && r.crown && <span className="race-crown">👑</span>}
                {r.name}
              </span>
              <span className="race-count">
                {r.p ? `${Math.round(r.p.owned * laneT)} / ${r.p.total} · ${Math.round(r.p.pct * laneT)}%` : '— / —'}
              </span>
            </div>
            <div className="race-track">
              <div className="race-fill" style={{ width: `${at}%` }} />
              <div className="race-runner" style={{ left: `${at}%` }}>
                {r.emoji}
              </div>
            </div>
          </div>
        )
      })}

      {winner && (
        <button
          className="party-replay"
          onClick={() => { sfx.click(); setParty({ name: winner.name, emoji: winner.emoji }) }}
        >
          🎉 Replay victory party
        </button>
      )}
    </div>
  )
}
