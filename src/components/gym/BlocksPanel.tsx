// 🧱 Blocks — every training block you have, and the editor for them.
//
// The Train tab answers "what's next?" and deliberately shows nothing else. The
// Plan tab shows the block you are ON. This tab is the library: past blocks,
// the current one, anything drafted for later — and it is the only place a
// rotation can be CHANGED.
//
// Why editing lives here and not in Train: a block is a promise you made to
// yourself eight weeks ago. Editing it mid-session is how a programme quietly
// becomes "whatever I felt like", which is exactly what §18m replaced. So it
// takes a deliberate trip to another tab — and every edit is saved straight
// away, because a half-typed rotation nobody pressed Save on is worse than a
// rotation with a typo in it.
import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { BlockExercise, BlockSession, ExerciseDef, TrainingBlock } from '../../types'
import { PART_LABEL, allExercises, exerciseById } from '../../logic/gym'
import {
  blockAge,
  blockPos as blockPosOf,
  blockSessionsDone,
  blockWeeks,
  copyBlock,
  emptyBlock,
  emptySession,
  slotLine,
} from '../../logic/gymBlock'
import { sfx } from '../../audio'
import { VideoButton } from './ExerciseVideo'

export function BlocksPanel() {
  const { data, gymAddBlock, gymSetActiveBlock } = useStore()
  const gym = data.gym
  const [openId, setOpenId] = useState<string | null>(gym.activeBlockId)

  const blocks = gym.blocks
  const active = blocks.find((b) => b.id === gym.activeBlockId) ?? null

  return (
    <>
      <div className="h2">🧱 Training blocks</div>

      <div className="card">
        <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
          A block is a fixed rotation of sessions you repeat for a couple of dozen sessions — the Train tab just hands you
          the next one. Everything here is editable: rename a session, change a rep range, add or drop an exercise, reorder
          the rotation. Edits save as you make them and apply to the next session you start, never to one already running.
          When a block is done, change 2–4 movements and keep the patterns: you want progressive exposure, not novelty.
        </p>
      </div>

      {blocks.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>🧱</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6, lineHeight: 1.45 }}>
            No blocks yet. Until there is one, the Train tab builds a session from your history each time.
          </p>
        </div>
      )}

      {blocks.map((block) => (
        <BlockCard
          key={block.id}
          block={block}
          isActive={block.id === gym.activeBlockId}
          open={openId === block.id}
          onToggle={() => setOpenId(openId === block.id ? null : block.id)}
        />
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          className="btn btn--ghost btn--small"
          style={{ flex: 1 }}
          onClick={() => {
            sfx.gem()
            const b = emptyBlock(`Block ${blocks.length + 1}`)
            gymAddBlock(b)
            setOpenId(b.id)
          }}
        >
          ➕ New empty block
        </button>
        {active && (
          <button
            className="btn btn--ghost btn--small"
            style={{ flex: 1 }}
            title="Same rotation, counter back to zero — then swap the 2–4 movements you want to change"
            onClick={() => {
              sfx.gem()
              const b = copyBlock(active)
              gymAddBlock(b)
              setOpenId(b.id)
            }}
          >
            📋 Copy “{active.name}”
          </button>
        )}
      </div>

      {active === null && blocks.length > 0 && (
        <div className="card" style={{ marginTop: 10 }}>
          <p className="muted" style={{ fontSize: 12, lineHeight: 1.45 }}>
            No block is being followed right now, so Train builds a free session from your history. Press ▶️ Follow on one of
            them to go back on programme.
          </p>
        </div>
      )}

      {active && (
        <button
          className="btn btn--ghost btn--small"
          style={{ width: '100%', marginTop: 10 }}
          onClick={() => {
            if (!confirm('Train off-programme until you pick a block again?')) return
            sfx.click()
            gymSetActiveBlock(null)
          }}
        >
          🎲 Stop following a block
        </button>
      )}
    </>
  )
}

/** One block: the header numbers, then every session, then the dangerous buttons. */
function BlockCard({
  block,
  isActive,
  open,
  onToggle,
}: {
  block: TrainingBlock
  isActive: boolean
  open: boolean
  onToggle: () => void
}) {
  const { data, gymSaveBlock, gymDeleteBlock, gymSetActiveBlock } = useStore()
  const gym = data.gym
  const weeks = blockWeeks(block)
  const done = blockSessionsDone(gym, block)
  const age = blockAge(block, done)
  const pos = isActive ? blockPosOf(gym) : -1
  const [adding, setAdding] = useState<string | null>(null)

  const patch = (p: Partial<TrainingBlock>) => gymSaveBlock({ ...block, ...p })
  const patchSession = (id: string, p: Partial<BlockSession>) =>
    patch({ sessions: block.sessions.map((s) => (s.id === id ? { ...s, ...p } : s)) })

  const moveSession = (i: number, dir: -1 | 1) => {
    const to = i + dir
    if (to < 0 || to >= block.sessions.length) return
    const next = [...block.sessions]
    ;[next[i], next[to]] = [next[to], next[i]]
    patch({ sessions: next })
  }

  return (
    <div className={`card gym-block-row ${isActive ? 'gym-block-row--next' : ''}`}>
      <button className="gym-block-head" onClick={onToggle}>
        <span style={{ fontSize: 26 }}>{isActive ? '🎯' : '🧱'}</span>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <span style={{ display: 'block', fontWeight: 900, fontSize: 15 }}>{block.name}</span>
          <span className="muted" style={{ display: 'block', fontSize: 11 }}>
            {block.sessions.length} in the rotation · {done} done · week {weeks + 1}
            {isActive ? ' · being followed' : ''}
            {age !== 'fresh' ? (age === 'due' ? ' · due a refresh' : ' · had its run') : ''}
          </span>
        </span>
        <span className="muted">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <>
          <div className="field" style={{ marginTop: 12 }}>
            <label>Name</label>
            <input type="text" value={block.name} onChange={(e) => patch({ name: e.target.value })} />
          </div>
          <div className="field">
            <label>What it is for</label>
            <input
              type="text"
              value={block.goal ?? ''}
              placeholder="Strength and pickleball durability"
              onChange={(e) => patch({ goal: e.target.value })}
            />
          </div>
          <div className="gym-inputs">
            <div className="field">
              <label>Review after (sessions)</label>
              <input
                type="number"
                value={block.reviewSessions}
                onChange={(e) => patch({ reviewSessions: Math.max(1, Number(e.target.value) || 24) })}
              />
            </div>
            <div className="field">
              <label>Retire after (sessions)</label>
              <input
                type="number"
                value={block.retireSessions}
                onChange={(e) => patch({ retireSessions: Math.max(1, Number(e.target.value) || 42) })}
              />
            </div>
            <div className="field">
              <label>Started</label>
              <input
                type="date"
                value={block.startedAt.slice(0, 10)}
                onChange={(e) => {
                  // display only — the warning runs on sessions finished — but a
                  // block you started before you typed it in should say so
                  const d = new Date(`${e.target.value}T12:00:00`)
                  if (!Number.isNaN(d.getTime())) patch({ startedAt: d.toISOString() })
                }}
              />
            </div>
          </div>
          <p className="muted" style={{ fontSize: 11, marginTop: -4, marginBottom: 8, lineHeight: 1.4 }}>
            Counted in sessions you FINISH, not weeks owned: eight weeks is 16 sessions at twice a week and 40 at five, and
            only one of those is a block's worth of training. 24 is four full trips round a six-session rotation.
          </p>

          {block.sessions.map((s, i) => (
            <SessionEditor
              key={s.id}
              session={s}
              index={i}
              isNext={i === pos}
              adding={adding === s.id}
              setAdding={(v) => setAdding(v ? s.id : null)}
              onPatch={(p) => patchSession(s.id, p)}
              onMove={(dir) => moveSession(i, dir)}
              onDelete={() => {
                if (!confirm(`Delete “${s.name}” from ${block.name}?`)) return
                sfx.click()
                patch({ sessions: block.sessions.filter((x) => x.id !== s.id) })
              }}
            />
          ))}

          <button
            className="btn btn--ghost btn--small"
            style={{ width: '100%', marginTop: 10 }}
            onClick={() => {
              sfx.gem()
              patch({ sessions: [...block.sessions, emptySession(`Session ${block.sessions.length + 1}`)] })
            }}
          >
            ➕ Add a session
          </button>

          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {!isActive && (
              <button
                className="btn btn--small"
                style={{ flex: 1 }}
                disabled={block.sessions.length === 0}
                onClick={() => {
                  sfx.fanfare()
                  gymSetActiveBlock(block.id)
                }}
              >
                ▶️ Follow this block
              </button>
            )}
            <button
              className="btn btn--ghost btn--small"
              style={{ flex: 1 }}
              onClick={() => {
                if (!confirm(`Delete ${block.name}? Sessions you already logged against it are kept.`)) return
                sfx.click()
                gymDeleteBlock(block.id)
              }}
            >
              🗑 Delete block
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** One session of a rotation: its name, its slots, and how to change them. */
function SessionEditor({
  session,
  index,
  isNext,
  adding,
  setAdding,
  onPatch,
  onMove,
  onDelete,
}: {
  session: BlockSession
  index: number
  isNext: boolean
  adding: boolean
  setAdding: (v: boolean) => void
  onPatch: (p: Partial<BlockSession>) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
}) {
  const { gymCatalog } = useStore()
  const [open, setOpen] = useState(false)

  const patchSlot = (i: number, p: Partial<BlockExercise>) =>
    onPatch({ exercises: session.exercises.map((e, n) => (n === i ? { ...e, ...p } : e)) })

  const moveSlot = (i: number, dir: -1 | 1) => {
    const to = i + dir
    if (to < 0 || to >= session.exercises.length) return
    const next = [...session.exercises]
    ;[next[i], next[to]] = [next[to], next[i]]
    onPatch({ exercises: next })
  }

  return (
    <div className="gym-block-session">
      <button
        className="gym-block-head"
        onClick={() => {
          sfx.click()
          setOpen(!open)
        }}
      >
        <span style={{ fontSize: 22 }}>{session.emoji}</span>
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
          <span style={{ display: 'block', fontWeight: 900, fontSize: 13 }}>
            S{index + 1} · {session.name}
          </span>
          <span className="muted" style={{ display: 'block', fontSize: 11 }}>
            {session.exercises.length} exercise{session.exercises.length === 1 ? '' : 's'}
            {isNext ? ' · up next' : ''}
          </span>
        </span>
        <span className="muted">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Name</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={session.emoji}
                onChange={(e) => onPatch({ emoji: e.target.value.slice(0, 2) })}
                aria-label="Icon"
                style={{ width: 58, textAlign: 'center', flex: '0 0 auto' }}
              />
              <input
                type="text"
                value={session.name}
                onChange={(e) => onPatch({ name: e.target.value })}
                style={{ flex: 1, minWidth: 0 }}
              />
            </div>
          </div>

          {session.exercises.map((slot, i) => (
            <SlotEditor
              key={`${slot.exId}-${i}`}
              slot={slot}
              def={exerciseById(gymCatalog, slot.exId)}
              onPatch={(p) => patchSlot(i, p)}
              onMove={(dir) => moveSlot(i, dir)}
              onDelete={() => onPatch({ exercises: session.exercises.filter((_, n) => n !== i) })}
            />
          ))}

          {adding ? (
            <ExercisePicker
              onPick={(def) => {
                sfx.gem()
                // sensible starting numbers straight off the catalog row, so a
                // freshly added slot is already prescribable without editing
                const timed = def.kind === 'timed'
                onPatch({
                  exercises: [
                    ...session.exercises,
                    {
                      exId: def.id,
                      sets: def.defaultSets,
                      repLow: def.defaultReps,
                      repHigh: Math.round(def.defaultReps * (timed ? 1.5 : 1.4)),
                    },
                  ],
                })
                setAdding(false)
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button className="btn btn--ghost btn--small" style={{ width: '100%', marginTop: 8 }} onClick={() => setAdding(true)}>
              ➕ Add an exercise
            </button>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn--ghost btn--small" onClick={() => onMove(-1)}>↑</button>
            <button className="btn btn--ghost btn--small" onClick={() => onMove(1)}>↓</button>
            <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={onDelete}>
              🗑 Delete session
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** One exercise slot: sets × a rep range, plus the two things a range can't say. */
function SlotEditor({
  slot,
  def,
  onPatch,
  onMove,
  onDelete,
}: {
  slot: BlockExercise
  def: ExerciseDef | undefined
  onPatch: (p: Partial<BlockExercise>) => void
  onMove: (dir: -1 | 1) => void
  onDelete: () => void
}) {
  const { gymCatalog } = useStore()
  const [open, setOpen] = useState(false)
  const unit = def?.kind === 'timed' ? 'seconds' : def?.kind === 'cardio' ? 'minutes' : 'reps'

  return (
    <div className="gym-slot">
      <div className="gym-move-top">
        <button
          className="gym-block-head"
          onClick={() => {
            sfx.click()
            setOpen(!open)
          }}
        >
          <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <span style={{ display: 'block', fontWeight: 800, fontSize: 13 }}>
              {def ? `${def.emoji} ${def.name}` : '❓ not in the catalog'}
              {slot.quality ? ' ⚡' : ''}
            </span>
            <span className="muted" style={{ display: 'block', fontSize: 11 }}>
              {slotLine(slot, gymCatalog)}
              {def ? ` · ${def.parts.map((p) => PART_LABEL[p]).slice(0, 2).join(', ')}` : ' · fix or remove this slot'}
            </span>
          </span>
          <span className="muted">{open ? '▾' : '▸'}</span>
        </button>
        {/* a slot names a movement, so it offers the movement's video too — a
            button inside the row's button would be invalid HTML, hence the wrap */}
        {def && <VideoButton exId={def.id} name={def.name} />}
      </div>

      {open && (
        <>
          <div className="gym-inputs" style={{ marginTop: 8 }}>
            <div className="field">
              <label>Sets</label>
              <input
                type="number"
                value={slot.sets}
                onChange={(e) => onPatch({ sets: Math.max(1, Number(e.target.value) || 1) })}
              />
            </div>
            <div className="field">
              <label>Min {unit}</label>
              <input
                type="number"
                value={slot.repLow}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 1)
                  onPatch({ repLow: v, repHigh: Math.max(v, slot.repHigh) })
                }}
              />
            </div>
            <div className="field">
              <label>Max {unit}</label>
              <input
                type="number"
                value={slot.repHigh}
                onChange={(e) => onPatch({ repHigh: Math.max(slot.repLow, Number(e.target.value) || slot.repLow) })}
              />
            </div>
          </div>

          <button
            className="gym-toggle"
            onClick={() => {
              sfx.click()
              onPatch({ quality: !slot.quality })
            }}
          >
            <span className={`gym-toggle-box ${slot.quality ? 'on' : ''}`}>{slot.quality ? '✓' : ''}</span>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={{ display: 'block', fontWeight: 900, fontSize: 13 }}>⚡ Stop on quality, not on the count</span>
              <span className="muted" style={{ display: 'block', fontSize: 11, lineHeight: 1.4 }}>
                Jumps, throws, sprints: the set ends when height, speed or landing goes, whatever the reps say.
              </span>
            </span>
          </button>

          <div className="field" style={{ marginTop: 8 }}>
            <label>Note on the card</label>
            <input
              type="text"
              value={slot.note ?? ''}
              placeholder="Chin-ups instead are fine — same slot."
              onChange={(e) => onPatch({ note: e.target.value || undefined })}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn btn--ghost btn--small" onClick={() => onMove(-1)}>↑</button>
            <button className="btn btn--ghost btn--small" onClick={() => onMove(1)}>↓</button>
            <button
              className="btn btn--ghost btn--small"
              style={{ flex: 1 }}
              onClick={() => {
                sfx.click()
                onDelete()
              }}
            >
              🗑 Remove
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Pick an exercise out of the shared catalog — searchable, because there are 63 of them. */
function ExercisePicker({ onPick, onCancel }: { onPick: (def: ExerciseDef) => void; onCancel: () => void }) {
  const { gymCatalog } = useStore()
  const [q, setQ] = useState('')
  const all = useMemo(() => allExercises(gymCatalog).filter((e) => !e.retired), [gymCatalog])
  const needle = q.trim().toLowerCase()
  const hits = needle
    ? all.filter((e) => e.name.toLowerCase().includes(needle) || e.parts.some((p) => PART_LABEL[p].toLowerCase().includes(needle)))
    : all

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="field">
        <label>Add which exercise?</label>
        <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="row, core, band…" autoFocus />
      </div>
      <div className="gym-pick-list">
        {hits.slice(0, 40).map((e) => (
          <button key={e.id} className="btn btn--ghost btn--small" onClick={() => onPick(e)}>
            {e.emoji} {e.name}
            <span className="muted" style={{ fontSize: 10, marginLeft: 6 }}>{PART_LABEL[e.parts[0]]}</span>
          </button>
        ))}
        {hits.length === 0 && <p className="muted" style={{ fontSize: 12 }}>Nothing matches. Add it in the Gear tab first.</p>}
      </div>
      <button className="btn btn--ghost btn--small" style={{ width: '100%', marginTop: 8 }} onClick={onCancel}>
        ✕ Cancel
      </button>
    </div>
  )
}
