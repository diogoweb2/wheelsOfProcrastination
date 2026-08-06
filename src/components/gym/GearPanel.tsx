// 🏋️ Gear — the shared basement. Equipment on top, then every exercise that
// equipment makes possible, with what the app has learned about YOU on each row.
//
// The catalog is shared (one basement, one Firestore doc) but the ratings, the
// weights and the rest times are personal, so this screen edits two different
// things at once and says which is which.
import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { BodyPart, Equipment, ExerciseDef, ExerciseRating, GymCatalog } from '../../types'
import { ALL_PARTS, PART_LABEL, RATING_LABEL, allExercises, daysSince } from '../../logic/gym'
import { sfx } from '../../audio'
import { DemoCredit, ExerciseDemo } from './ExerciseDemo'

const RATINGS: ExerciseRating[] = ['hate', 'dislike', 'ok', 'like', 'love']

export function GearPanel() {
  const { data, gymCatalog, gymSaveCatalog } = useStore()
  const [tab, setTab] = useState<'gear' | 'moves'>('gear')

  /** Write-through helper: the catalog doc may not exist yet on a fresh install. */
  function save(patch: (c: GymCatalog) => GymCatalog) {
    gymSaveCatalog(patch(gymCatalog ?? { equipment: [], exercises: [] }))
  }

  return (
    <>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={tab === 'gear' ? 'on' : ''} onClick={() => { sfx.click(); setTab('gear') }}>
          🏋️ Equipment
        </button>
        <button className={tab === 'moves' ? 'on' : ''} onClick={() => { sfx.click(); setTab('moves') }}>
          🤸 Exercises
        </button>
      </div>
      {tab === 'gear' ? <EquipmentList save={save} /> : <ExerciseList save={save} />}
      <p className="muted" style={{ fontSize: 11, marginTop: 16, lineHeight: 1.5 }}>
        The fast way to fill this in: photograph everything in the basement, drop the photos in <code>gym-photos/</code> and run{' '}
        <code>npm run gym:equipment</code>. It identifies each machine and writes every exercise it enables — and it reads your
        comments, so caption a photo in the Photos app (or describe it in <code>gym-photos/notes.txt</code>) to tell it what a
        picture can’t show, like “adjustable 5–52 lb”. Then{' '}
        <code>npm run gym:demos</code> finds an animation for each movement. Not every exercise gets one — the free library is a
        subset and is missing some basics; those just keep their emoji. Personal ratings and weights below are yours alone;{' '}
        {data.gym.brief.kidMode ? 'the equipment list' : 'the equipment and exercise lists'} are shared with the rest of the crew.
      </p>
    </>
  )
}

// --- equipment --------------------------------------------------------------

function EquipmentList({ save }: { save: (p: (c: GymCatalog) => GymCatalog) => void }) {
  const { gymCatalog } = useStore()
  const [adding, setAdding] = useState(false)
  const list = gymCatalog?.equipment ?? []
  const live = list.filter((e) => !e.retired)
  const retired = list.filter((e) => e.retired)

  return (
    <>
      <div className="h2" style={{ marginTop: 0 }}>🏋️ In the basement — {live.length}</div>

      <RoomNote save={save} />

      {live.length === 0 && !adding && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 44 }}>📦</div>
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            No gear registered yet. Everything still works — you just get bodyweight sessions until something is added here.
          </p>
        </div>
      )}

      {live.map((eq) => (
        <div className="card gym-gear-row" key={eq.id}>
          {eq.img ? (
            <img src={eq.img} alt="" width={48} height={48} className="gym-gear-img" />
          ) : (
            <span style={{ fontSize: 30 }}>{eq.emoji}</span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 15 }}>{eq.name}</div>
            {eq.notes && <div className="muted" style={{ fontSize: 12 }}>{eq.notes}</div>}
            <div className="muted" style={{ fontSize: 11 }}>{eq.addedBy === 'ai' ? 'added from a photo' : 'added by hand'}</div>
          </div>
          <button
            className="btn btn--ghost btn--small"
            onClick={() => {
              sfx.click()
              save((c) => ({ ...c, equipment: c.equipment.map((x) => (x.id === eq.id ? { ...x, retired: true } : x)) }))
            }}
          >
            Retire
          </button>
        </div>
      ))}

      {adding ? (
        <EquipmentForm
          onCancel={() => setAdding(false)}
          onSave={(eq) => {
            save((c) => ({ ...c, equipment: [...c.equipment, eq] }))
            setAdding(false)
          }}
        />
      ) : (
        <button className="btn btn--blue" style={{ marginTop: 10 }} onClick={() => { sfx.click(); setAdding(true) }}>
          ➕ Add equipment
        </button>
      )}

      {retired.length > 0 && (
        <>
          <div className="h2">🧊 Retired — {retired.length}</div>
          {retired.map((eq) => (
            <div className="card gym-gear-row" key={eq.id} style={{ opacity: 0.6 }}>
              <span style={{ fontSize: 24 }}>{eq.emoji}</span>
              <div style={{ flex: 1, fontWeight: 800 }}>{eq.name}</div>
              <button
                className="btn btn--ghost btn--small"
                onClick={() => {
                  sfx.click()
                  save((c) => ({ ...c, equipment: c.equipment.map((x) => (x.id === eq.id ? { ...x, retired: false } : x)) }))
                }}
              >
                Restore
              </button>
            </div>
          ))}
        </>
      )}
    </>
  )
}

/**
 * What the owner said about the ROOM, not about any one item — "ceiling is low",
 * "concrete floor, nothing to drop". The AI trainer reads this before every
 * session, so it's editable here rather than only via gym-photos/notes.txt.
 */
function RoomNote({ save }: { save: (p: (c: GymCatalog) => GymCatalog) => void }) {
  const { gymCatalog } = useStore()
  const stored = gymCatalog?.notes ?? ''
  const [text, setText] = useState(stored)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (!dirty) setText(stored)
  }, [stored, dirty])

  return (
    <div className="card">
      <div className="field" style={{ marginBottom: dirty ? 10 : 0 }}>
        <label>📝 About the room</label>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setDirty(true)
          }}
          placeholder="Ceiling is low — no standing overhead work with a bar. Concrete floor, nothing heavy to drop."
          style={{ minHeight: 60 }}
        />
        <span className="muted" style={{ fontSize: 11 }}>
          Anything about the space itself. Your trainer reads this before building every session.
        </span>
      </div>
      {dirty && (
        <button
          className="btn btn--small"
          onClick={() => {
            sfx.gem()
            save((c) => ({ ...c, notes: text.trim() || undefined }))
            setDirty(false)
          }}
        >
          💾 Save
        </button>
      )}
    </div>
  )
}

function EquipmentForm({ onSave, onCancel }: { onSave: (e: Equipment) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏋️')
  const [notes, setNotes] = useState('')

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div className="field">
        <label>What is it?</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Adjustable dumbbells" />
      </div>
      <div className="field">
        <label>Icon</label>
        <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} />
      </div>
      <div className="field">
        <label>Notes for your trainer (optional)</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="5–25 lb, 2.5 lb steps" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn--small"
          style={{ flex: 1 }}
          disabled={!name.trim()}
          onClick={() => {
            sfx.gem()
            onSave({
              id: `eq-${crypto.randomUUID().slice(0, 8)}`,
              name: name.trim(),
              emoji: emoji || '🏋️',
              notes: notes.trim() || undefined,
              addedBy: 'manual',
              createdAt: new Date().toISOString(),
            })
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

// --- exercises --------------------------------------------------------------

function ExerciseList({ save }: { save: (p: (c: GymCatalog) => GymCatalog) => void }) {
  const { data, gymCatalog, gymRateExercise, gymSetExerciseNote } = useStore()
  const [filter, setFilter] = useState<BodyPart | 'all'>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const unit = data.gym.brief.weightUnit ?? 'lb'

  const list = useMemo(() => allExercises(gymCatalog), [gymCatalog])
  const shown = list.filter((e) => !e.retired && (filter === 'all' || e.parts.includes(filter)))
  const retiredCount = list.filter((e) => e.retired).length

  return (
    <>
      <div className="gym-chip-row gym-chip-row--wrap" style={{ marginBottom: 10 }}>
        <button className={`chip chip--tap ${filter === 'all' ? 'on' : ''}`} onClick={() => { sfx.click(); setFilter('all') }}>
          All {list.filter((e) => !e.retired).length}
        </button>
        {ALL_PARTS.filter((p) => list.some((e) => !e.retired && e.parts.includes(p))).map((p) => (
          <button key={p} className={`chip chip--tap ${filter === p ? 'on' : ''}`} onClick={() => { sfx.click(); setFilter(p) }}>
            {PART_LABEL[p]}
          </button>
        ))}
      </div>

      {shown.map((e) => {
        const mem = data.gym.ex[e.id]
        const isOpen = open === e.id
        return (
          <div className="card gym-move-row" key={e.id}>
            <button className="gym-move-head" onClick={() => { sfx.click(); setOpen(isOpen ? null : e.id) }}>
              <ExerciseDemo demo={e.demo} emoji={e.emoji} size={40} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>{e.name}</div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {e.parts.map((p) => PART_LABEL[p]).join(' · ')}
                  {mem?.timesDone ? ` · done ${mem.timesDone}×` : ' · never done'}
                  {mem?.suggestedWeight ? ` · ${mem.suggestedWeight} ${unit}` : ''}
                </div>
              </div>
              {mem?.rating && <span className="chip">{RATING_LABEL[mem.rating].split(' ')[0]}</span>}
              <span className="muted">{isOpen ? '▾' : '▸'}</span>
            </button>

            {isOpen && (
              <div className="gym-move-body">
                {e.demo && (
                  <div className="gym-demo-detail">
                    <ExerciseDemo demo={e.demo} emoji={e.emoji} size={140} autoPlay />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="muted" style={{ fontSize: 11, lineHeight: 1.45 }}>
                        Shown as <strong>“{e.demo.sourceName}”</strong> in ExerciseDB
                        {e.demo.match === 'exact'
                          ? ''
                          : e.demo.match === 'ai'
                            ? ' (matched by AI)'
                            : e.demo.match === 'close'
                              ? ' — an approximation, not this exact movement'
                              : ' (pinned by hand)'}.
                      </div>
                      <button
                        className="btn btn--ghost btn--small"
                        style={{ marginTop: 8 }}
                        onClick={() => {
                          sfx.click()
                          // wrong movement shown = worse than no picture, so this
                          // is a one-tap removal rather than a re-run of the script
                          save((c) => ({
                            ...c,
                            exercises: c.exercises.some((x) => x.id === e.id)
                              ? c.exercises.map((x) => (x.id === e.id ? { ...x, demo: undefined } : x))
                              : [...c.exercises, { ...e, demo: undefined }],
                          }))
                        }}
                      >
                        🚫 Wrong movement — remove it
                      </button>
                    </div>
                  </div>
                )}
                <p className="muted" style={{ fontSize: 12, lineHeight: 1.4 }}>{e.how}</p>

                {mem && (
                  <div className="gym-move-stats">
                    {mem.bestReps ? <span>🏆 best {mem.bestReps} {e.kind === 'timed' ? 's' : 'reps'}</span> : null}
                    {mem.bestWeight ? <span>🏋️ best {mem.bestWeight} {unit}</span> : null}
                    {mem.restLearned ? <span>😮‍💨 you rest {mem.restLearned}s</span> : null}
                    {mem.lastDay ? <span>📅 {daysSince(mem.lastDay)}d ago</span> : null}
                  </div>
                )}

                <div className="field" style={{ marginTop: 10, marginBottom: 8 }}>
                  <label>How do you feel about it?</label>
                  <div className="gym-rate-row">
                    {RATINGS.map((r) => (
                      <button
                        key={r}
                        className={`gym-rate ${mem?.rating === r ? 'on' : ''}`}
                        onClick={() => {
                          sfx.click()
                          gymRateExercise(e.id, mem?.rating === r ? null : r)
                        }}
                      >
                        {RATING_LABEL[r]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 8 }}>
                  <label>Note for your trainer</label>
                  <input
                    type="text"
                    defaultValue={mem?.notes ?? ''}
                    placeholder="hurts my wrist · only on the low bar…"
                    onBlur={(ev) => gymSetExerciseNote(e.id, ev.target.value)}
                  />
                </div>

                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => {
                    sfx.click()
                    // built-in moves live in code, so retiring one means storing an
                    // override with the same id — allExercises lets it win
                    save((c) => ({
                      ...c,
                      exercises: c.exercises.some((x) => x.id === e.id)
                        ? c.exercises.map((x) => (x.id === e.id ? { ...x, retired: true } : x))
                        : [...c.exercises, { ...e, retired: true }],
                    }))
                  }}
                >
                  🗄 Retire this exercise for everyone
                </button>
              </div>
            )}
          </div>
        )
      })}

      {adding ? (
        <ExerciseForm
          onCancel={() => setAdding(false)}
          onSave={(def) => {
            save((c) => ({ ...c, exercises: [...c.exercises, def] }))
            setAdding(false)
          }}
        />
      ) : (
        <button className="btn btn--blue" style={{ marginTop: 10 }} onClick={() => { sfx.click(); setAdding(true) }}>
          ➕ Add an exercise
        </button>
      )}

      {shown.some((e) => e.demo) && <DemoCredit />}

      {retiredCount > 0 && (
        <button
          className="btn btn--ghost btn--small"
          style={{ marginTop: 10, width: '100%' }}
          onClick={() => {
            sfx.click()
            save((c) => ({ ...c, exercises: c.exercises.map((x) => ({ ...x, retired: false })) }))
          }}
        >
          ♻️ Un-retire all {retiredCount}
        </button>
      )}
    </>
  )
}

function ExerciseForm({ onSave, onCancel }: { onSave: (e: ExerciseDef) => void; onCancel: () => void }) {
  const { gymCatalog } = useStore()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🤸')
  const [how, setHow] = useState('')
  const [kind, setKind] = useState<ExerciseDef['kind']>('bodyweight')
  const [parts, setParts] = useState<BodyPart[]>([])
  const [equip, setEquip] = useState<string[]>([])
  const [reps, setReps] = useState(12)
  const [sets, setSets] = useState(3)
  const [rest, setRest] = useState(60)
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2)
  const gear = (gymCatalog?.equipment ?? []).filter((e) => !e.retired)

  const toggle = <T,>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div className="field">
        <label>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cable face pull" />
      </div>
      <div className="field">
        <label>Icon</label>
        <input type="text" value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 2))} />
      </div>
      <div className="field">
        <label>How to do it</label>
        <textarea value={how} onChange={(e) => setHow(e.target.value)} style={{ minHeight: 60 }} />
      </div>
      <div className="field">
        <label>Measured in</label>
        <div className="seg">
          {(['bodyweight', 'weight', 'timed', 'cardio'] as const).map((k) => (
            <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
              {k === 'bodyweight' ? 'Reps' : k === 'weight' ? 'Weight' : k === 'timed' ? 'Seconds' : 'Minutes'}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Body parts (first one is the main target)</label>
        <div className="cat-picker">
          {ALL_PARTS.map((p) => (
            <button key={p} className={`chip ${parts.includes(p) ? 'on' : ''}`} onClick={() => setParts(toggle(parts, p))}>
              {PART_LABEL[p]}
            </button>
          ))}
        </div>
      </div>
      {gear.length > 0 && (
        <div className="field">
          <label>Needs which equipment?</label>
          <div className="cat-picker">
            {gear.map((g) => (
              <button key={g.id} className={`chip ${equip.includes(g.id) ? 'on' : ''}`} onClick={() => setEquip(toggle(equip, g.id))}>
                {g.emoji} {g.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="gym-inputs">
        <div className="field"><label>Sets</label><input type="number" value={sets} onChange={(e) => setSets(Number(e.target.value) || 1)} /></div>
        <div className="field"><label>Reps</label><input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value) || 1)} /></div>
        <div className="field"><label>Rest (s)</label><input type="number" value={rest} onChange={(e) => setRest(Number(e.target.value) || 30)} /></div>
      </div>
      <div className="field">
        <label>How hard is it?</label>
        <div className="seg">
          {([1, 2, 3] as const).map((n) => (
            <button key={n} className={intensity === n ? 'on' : ''} onClick={() => setIntensity(n)}>
              {n === 1 ? 'Light' : n === 2 ? 'Normal' : 'Heavy'}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn--ghost btn--small" style={{ flex: 1 }} onClick={onCancel}>Cancel</button>
        <button
          className="btn btn--small"
          style={{ flex: 1 }}
          disabled={!name.trim() || parts.length === 0}
          onClick={() => {
            sfx.gem()
            onSave({
              id: `mv-${crypto.randomUUID().slice(0, 8)}`,
              name: name.trim(),
              emoji: emoji || '🤸',
              equipmentIds: equip,
              kind,
              parts,
              intensity,
              how: how.trim() || 'No description yet.',
              restSec: rest,
              defaultReps: reps,
              defaultSets: sets,
              kidSafe: intensity < 3 && kind !== 'weight',
              addedBy: 'manual',
              createdAt: new Date().toISOString(),
            })
          }}
        >
          Save
        </button>
      </div>
    </div>
  )
}
