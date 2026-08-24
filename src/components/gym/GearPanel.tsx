// 🏋️ Gear — the shared basement. Equipment on top, then every exercise that
// equipment makes possible, with what the app has learned about YOU on each row.
//
// The catalog is shared (one basement, one Firestore doc) but the ratings, the
// weights and the rest times are personal, so this screen edits two different
// things at once and says which is which.
import { useMemo, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import type { BodyPart, Equipment, ExerciseDef, ExerciseRating, GymCatalog } from '../../types'
import { ALL_PARTS, PART_LABEL, RATING_LABEL, allExercises, daysSince } from '../../logic/gym'
import { sfx } from '../../audio'
import { DemoCredit, ExerciseDemo } from './ExerciseDemo'
import { shrinkPhoto, type ShrunkPhoto } from '../../logic/photo'
import { identifyEquipment, visionReady } from '../../logic/gymVision'
import { uploadGymImage } from '../../store/cloud'

const RATINGS: ExerciseRating[] = ['hate', 'dislike', 'ok', 'like', 'love']

export function GearPanel() {
  const { gymCatalog, gymSaveCatalog } = useStore()
  const [tab, setTab] = useState<'gear' | 'moves'>('gear')

  /** Write-through helper: the catalog doc may not exist yet on a fresh install. */
  function save(patch: (c: GymCatalog) => GymCatalog) {
    const next = patch(gymCatalog ?? { equipment: [], exercises: [] })
    // gear no longer retires, so anything left flagged from before is swept out
    // on the next write rather than lingering invisibly in the document
    gymSaveCatalog({ ...next, equipment: next.equipment.filter((e) => !e.retired) })
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
        the equipment and exercise lists are shared with the rest of the crew.
      </p>
    </>
  )
}

// --- equipment --------------------------------------------------------------

function EquipmentList({ save }: { save: (p: (c: GymCatalog) => GymCatalog) => void }) {
  const { gymCatalog } = useStore()
  const [adding, setAdding] = useState(false)
  // Equipment is deleted outright, never retired: gear that left the basement
  // is not history worth keeping, and anything already flagged retired is
  // treated as gone. (Exercises still retire — those ARE worth keeping.)
  const live = (gymCatalog?.equipment ?? []).filter((e) => !e.retired)

  return (
    <>
      <div className="h2" style={{ marginTop: 0 }}>🏋️ In the basement — {live.length}</div>

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
              // exercises that needed this piece go with it — they can't be done
              // any more, and they are re-addable by hand if the gear comes back
              const orphans = (gymCatalog?.exercises ?? []).filter((x) => x.equipmentIds.includes(eq.id))
              const tail = orphans.length ? ` and ${orphans.length} exercise${orphans.length > 1 ? 's' : ''} that need it` : ''
              if (!confirm(`Delete ${eq.name}${tail}?`)) return
              sfx.click()
              save((c) => ({
                ...c,
                equipment: c.equipment.filter((x) => x.id !== eq.id),
                exercises: c.exercises.filter((x) => !x.equipmentIds.includes(eq.id)),
              }))
            }}
          >
            Delete
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

    </>
  )
}

/**
 * Add one piece of gear — by photographing it, or by typing it in.
 *
 * The camera is the fast path and it is the in-app twin of
 * `npm run gym:equipment`: shoot it and the model names and describes it.
 * Equipment only — no exercises. What one machine makes possible depends on
 * everything else in the room (a bench with plates is not the same bench), and
 * on what you actually want to train, so exercises are written by hand: ➕ Add
 * exercise here, or the catalog file (BUSINESS_REQUIREMENTS.md §18k).
 * Nothing is written until Save, and every field stays editable, because a
 * vision model looking at a dim basement will sometimes be wrong.
 *
 * Without an OpenRouter key the camera still works — you just get the photo as
 * the item's thumbnail and fill the fields in yourself.
 */
function EquipmentForm({ onSave, onCancel }: { onSave: (e: Equipment) => void; onCancel: () => void }) {
  const { aiConfig } = useStore()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏋️')
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<ShrunkPhoto | null>(null)
  const [identified, setIdentified] = useState(false)
  const [busy, setBusy] = useState<'shrinking' | 'looking' | 'saving' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // the id is minted up front so the photo can be stored under it before saving
  const idRef = useRef(`eq-${crypto.randomUUID().slice(0, 8)}`)
  const canIdentify = visionReady(aiConfig)

  async function onPick(file: File | undefined) {
    if (!file) return
    setError(null)
    setBusy('shrinking')
    try {
      // shrink FIRST: the full-size photo never leaves the phone
      const shrunk = await shrinkPhoto(file)
      setPhoto(shrunk)
      if (!canIdentify) return
      setBusy('looking')
      const found = await identifyEquipment(aiConfig, shrunk.visionDataUrl, notes)
      setIdentified(true)
      // never clobber something you already typed
      setName((n) => n.trim() || found.name)
      setEmoji(found.emoji)
      setNotes((n) => n.trim() || found.notes)
      sfx.gem()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      sfx.error()
    } finally {
      setBusy(null)
    }
  }

  async function submit() {
    setBusy('saving')
    setError(null)
    try {
      const id = idRef.current
      const img = photo ? await uploadGymImage(`equipment/${id}.webp`, photo.thumb) : undefined
      const now = new Date().toISOString()
      const equipment: Equipment = {
        id,
        name: name.trim(),
        emoji: emoji || '🏋️',
        notes: notes.trim() || undefined,
        img,
        addedBy: identified ? 'ai' : 'manual',
        createdAt: now,
      }
      sfx.gem()
      onSave(equipment)
    } catch (e) {
      // an upload failure must not lose what you typed
      setError(e instanceof Error ? e.message : String(e))
      sfx.error()
      setBusy(null)
    }
  }

  const working = busy !== null

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          void onPick(e.target.files?.[0])
          e.target.value = '' // so re-picking the same file fires again
        }}
      />

      <div className="gym-shoot">
        {photo ? (
          <img src={photo.previewUrl} alt="" className="gym-shoot-img" width={72} height={72} />
        ) : (
          <span className="gym-shoot-empty" aria-hidden>📷</span>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <button className="btn btn--blue btn--small" style={{ width: '100%' }} disabled={working} onClick={() => { sfx.click(); fileRef.current?.click() }}>
            {busy === 'shrinking' ? '⏳ Shrinking…' : busy === 'looking' ? '🧠 Looking at it…' : photo ? '🔄 Retake' : '📷 Take a photo'}
          </button>
          <span className="muted" style={{ display: 'block', fontSize: 11, marginTop: 5, lineHeight: 1.35 }}>
            {canIdentify
              ? 'It gets named and described. Exercises come later, from the whole room at once.'
              : 'Saved as this item’s picture. Add an OpenRouter key in Settings → About to have it identified too.'}
          </span>
        </div>
      </div>

      {error && (
        <p className="gym-shoot-error" role="alert">
          {error}
        </p>
      )}

      <div className="field">
        <label>What is it?</label>
        {/* the icon lives beside the name, not on its own row: the model picks it
            from the photo, so it is a thing you correct, not a thing you fill in */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            aria-label="Icon"
            style={{ width: 58, textAlign: 'center', flex: '0 0 auto' }}
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Adjustable dumbbells"
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
      </div>
      <div className="field">
        <label>Notes for your trainer (optional)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="5–25 lb, 2.5 lb steps"
        />
        <span className="muted" style={{ fontSize: 11 }}>
          What the photo can’t show. Write it before shooting and the model is told to trust it over the picture.
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn--ghost btn--small" style={{ flex: 1 }} disabled={working} onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn--small" style={{ flex: 1 }} disabled={!name.trim() || working} onClick={() => void submit()}>
          {busy === 'saving' ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// --- exercises --------------------------------------------------------------

const KINDS = ['bodyweight', 'weight', 'timed', 'cardio'] as const
const KIND_LABEL: Record<ExerciseDef['kind'], string> = {
  bodyweight: 'Reps',
  weight: 'Weight',
  timed: 'Seconds',
  cardio: 'Minutes',
}
/** The word for what `defaultReps` counts under a given kind. */
function amountWord(kind: ExerciseDef['kind']): string {
  return kind === 'timed' ? 'seconds' : kind === 'cardio' ? 'minutes' : 'reps'
}
/** Reps and seconds are not the same number: 12 reps ≈ 40s, 40s ≈ 12 reps. */
function convertAmount(n: number, from: ExerciseDef['kind'], to: ExerciseDef['kind']): number {
  const secs = (k: ExerciseDef['kind']) => k === 'timed'
  const mins = (k: ExerciseDef['kind']) => k === 'cardio'
  if (mins(from) === mins(to) && secs(from) === secs(to)) return n
  if (mins(to)) return Math.max(1, Math.round(secs(from) ? n / 60 : 5))
  if (secs(to)) return Math.max(5, Math.round(mins(from) ? n * 60 : n * 3.5))
  return Math.max(1, Math.round(secs(from) ? n / 3.5 : mins(from) ? n * 17 : n))
}

function ExerciseList({ save }: { save: (p: (c: GymCatalog) => GymCatalog) => void }) {
  const { data, gymCatalog, gymRateExercise, gymSetExerciseNote } = useStore()
  const [filter, setFilter] = useState<BodyPart | 'all'>('all')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const unit = data.gym.brief.weightUnit ?? 'lb'

  const list = useMemo(() => allExercises(gymCatalog), [gymCatalog])
  // typing beats tapping once the list is long — match the name first, then the
  // body parts, so "legs" finds the squats even if the word isn't in the name
  const q = query.trim().toLowerCase()
  const matches = (e: ExerciseDef) =>
    !q || e.name.toLowerCase().includes(q) || e.parts.some((p) => PART_LABEL[p].toLowerCase().includes(q))
  const shown = list.filter((e) => !e.retired && (filter === 'all' || e.parts.includes(filter)) && matches(e))
  const retiredCount = list.filter((e) => e.retired).length

  // built-in moves live in code, so editing one means storing an override with
  // the same id — allExercises lets the stored copy win
  const patch = (e: ExerciseDef, fields: Partial<ExerciseDef>) =>
    save((c) => ({
      ...c,
      exercises: c.exercises.some((x) => x.id === e.id)
        ? c.exercises.map((x) => (x.id === e.id ? { ...x, ...fields } : x))
        : [...c.exercises, { ...e, ...fields }],
    }))

  return (
    <>
      <div className="field" style={{ marginBottom: 10 }}>
        <input
          type="search"
          value={query}
          placeholder="🔎 Search exercises…"
          onChange={(ev) => setQuery(ev.target.value)}
        />
      </div>

      <div className="gym-chip-row gym-chip-row--wrap" style={{ marginBottom: 10 }}>
        <button className={`chip chip--tap ${filter === 'all' ? 'on' : ''}`} onClick={() => { sfx.click(); setFilter('all') }}>
          All {list.filter((e) => !e.retired && matches(e)).length}
        </button>
        {ALL_PARTS.filter((p) => list.some((e) => !e.retired && e.parts.includes(p) && matches(e))).map((p) => (
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
                        Shown as <strong>“{e.demo.sourceName}”</strong> in {e.demo.source}
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
                          patch(e, { demo: undefined })
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

                <div className="field" style={{ marginBottom: 8 }}>
                  <label>Measured in</label>
                  <div className="seg">
                    {KINDS.map((k) => (
                      <button
                        key={k}
                        className={e.kind === k ? 'on' : ''}
                        onClick={() => {
                          sfx.click()
                          if (k === e.kind) return
                          // the unit changes what the number MEANS, so carry the
                          // typical amount over as a sane default for the new unit
                          patch(e, { kind: k, defaultReps: convertAmount(e.defaultReps, e.kind, k) })
                        }}
                      >
                        {KIND_LABEL[k]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 8 }}>
                  <label>Typical {amountWord(e.kind)} per set{e.perSide ? ', per side' : ''}</label>
                  <input
                    type="number"
                    defaultValue={e.defaultReps}
                    key={`${e.id}-${e.kind}-${e.defaultReps}`}
                    onBlur={(ev) => {
                      const n = Math.max(1, Math.round(Number(ev.target.value) || 0))
                      if (n !== e.defaultReps) patch(e, { defaultReps: n })
                    }}
                  />
                  <span className="muted" style={{ fontSize: 11 }}>
                    What the coach starts from — it still scales the number to the day.
                  </span>
                </div>

                <button
                  className={`btn btn--small ${e.perSide ? '' : 'btn--ghost'}`}
                  style={{ marginBottom: 8 }}
                  onClick={() => {
                    sfx.click()
                    // the library gets this right most of the time but not always,
                    // and only the person doing the movement can settle it
                    patch(e, { perSide: !e.perSide })
                  }}
                >
                  {e.perSide ? '↔️ Reps are per side' : '↔️ Same reps both sides at once'}
                </button>

                <button
                  className="btn btn--ghost btn--small"
                  onClick={() => {
                    sfx.click()
                    patch(e, { retired: true })
                  }}
                >
                  🗄 Retire this exercise for everyone
                </button>
              </div>
            )}
          </div>
        )
      })}

      {q && shown.length === 0 && (
        <p className="muted" style={{ fontSize: 12, textAlign: 'center', padding: '12px 0' }}>
          Nothing matches “{query.trim()}”.{filter !== 'all' ? ' Try the All chip.' : ' Add it below?'}
        </p>
      )}

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
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
            aria-label="Icon"
            style={{ width: 58, textAlign: 'center', flex: '0 0 auto' }}
          />
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Cable face pull" style={{ flex: 1, minWidth: 0 }} />
        </div>
      </div>
      <div className="field">
        <label>How to do it</label>
        <textarea value={how} onChange={(e) => setHow(e.target.value)} style={{ minHeight: 60 }} />
      </div>
      <div className="field">
        <label>Measured in</label>
        <div className="seg">
          {KINDS.map((k) => (
            <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
              {KIND_LABEL[k]}
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
        <div className="field"><label>{amountWord(kind) === 'reps' ? 'Reps' : amountWord(kind) === 'seconds' ? 'Seconds' : 'Minutes'}</label><input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value) || 1)} /></div>
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
