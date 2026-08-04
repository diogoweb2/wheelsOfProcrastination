import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { PARENT_ID } from '../store/storage'
import type { DayScope, Effort, Priority, Season, Task } from '../types'
import { REQUIRED_REWARD, isEffectivelyUrgent, rewardFor } from '../logic/economy'
import { sfx } from '../audio'
import { crewSays } from '../logic/crewLines'
import { dayKey, daysUntil, seasonLabel, weekDayLabel } from '../logic/dates'
import { cooldownUntil, isAvailableOn, isUnlockedOn } from '../logic/wheel'
import { VOICE_EXAMPLES, VOICE_PHRASES, describeParsed, parseSpokenTask } from '../logic/voiceTask'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

export function TasksScreen({ goSpin }: { goSpin: () => void }) {
  const { data, activeProfileId, addTask, updateTask, deleteTask, manualPick, completedTodayIds, finishSeriesEarly } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  // "Organize" = group the log by category, so you can clear a whole batch of
  // quests of the same kind in one sitting.
  const [byCategory, setByCategory] = useState(false)
  // Grouped is the default view as soon as anything carries a category — but only
  // until the user says otherwise; after that their choice sticks for the session.
  const chosenView = useRef(false)
  const [category, setCategory] = useState('')
  // Bulk tagging: tick a pile of quests, stamp one category on all of them.
  const [tagMode, setTagMode] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  // Quests whose categories the sheet is currently editing (one row, or the whole tick list).
  const [placing, setCatIds] = useState<string[] | null>(null)

  const today = dayKey()
  const doneIds = completedTodayIds()
  const pendingIds = new Set(data.daily.pendingPicks.map((p) => p.taskId))
  const active = data.tasks.filter((t) => !t.archived)
  const needle = query.trim().toLowerCase()
  const urgentFirst = [...active]
    .filter((t) => !needle || t.name.toLowerCase().includes(needle))
    .sort((a, b) => {
      const ua = isEffectivelyUrgent(a) ? 0 : 1
      const ub = isEffectivelyUrgent(b) ? 0 : 1
      return ua - ub || a.name.localeCompare(b.name)
    })
  // Every category any active quest names, for the group headers and the filter row.
  const allCategories = [...new Set(active.flatMap((t) => t.categories ?? []))].sort((a, b) => a.localeCompare(b))
  const shown = byCategory && category ? urgentFirst.filter((t) => t.categories?.includes(category)) : urgentFirst
  const untagged = shown.filter((t) => !t.categories?.length)
  const tagged = shown.filter((t) => t.categories?.length)

  // Data arrives async, so this can't just be the useState seed.
  useEffect(() => {
    if (!chosenView.current && allCategories.length > 0) setByCategory(true)
  }, [allCategories.length])

  // "Done early" is offered once a split quest is under way, on its next
  // remaining part only — tapping it drops that part and everything after it.
  const doneEver = new Set(data.completions.map((c) => c.taskId))
  const earlyFinishIds = new Set<string>()
  for (const [, parts] of groupBySeries(data.tasks)) {
    if (!parts.some((p) => doneEver.has(p.id))) continue
    const next = parts.filter((p) => !doneEver.has(p.id) && !p.archived).sort((a, b) => (a.seriesPart ?? 0) - (b.seriesPart ?? 0))[0]
    if (next) earlyFinishIds.add(next.id)
  }

  function pick(task: Task) {
    const result = manualPick(task.id)
    if (result !== 'ok') {
      sfx.error()
      setToast(
        result === 'full'
          ? 'Your plate already has 3 quests. Finish one before grabbing more, greedy-guts!'
          : "That one isn't up for grabs today.",
      )
      window.setTimeout(() => setToast(null), 3000)
      return
    }
    sfx.click()
    goSpin()
  }

  function taskRow(t: Task) {
    const urgent = isEffectivelyUrgent(t)
    // Tag mode turns the whole log into a checklist: tick several quests, then
    // stamp one category on all of them at once.
    if (tagMode) {
      const on = picked.has(t.id)
      return (
        <div
          key={t.id}
          className={`task-row effort-${t.effort}${on ? ' task-row--picked' : ''}`}
          onClick={() => {
            sfx.click()
            setPicked((cur) => {
              const next = new Set(cur)
              if (next.has(t.id)) next.delete(t.id)
              else next.add(t.id)
              return next
            })
          }}
        >
          <div className="dot" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name">{t.name}</div>
            <div className="meta">
              {t.categories?.length ? (
                t.categories.map((loc) => (
                  <span key={loc} className="chip chip--cat">🏷️ {loc}</span>
                ))
              ) : (
                <span className="chip">🤷 no category</span>
              )}
            </div>
          </div>
          <span className="chip" style={on ? { background: 'var(--gold)', color: '#2a1c00' } : undefined}>
            {on ? '✓' : '○'}
          </span>
        </div>
      )
    }
    const doneToday = doneIds.has(t.id)
    const due = t.dueDate ? daysUntil(t.dueDate) : null
    const notStarted = t.startDate ? daysUntil(t.startDate) > 0 : false
    const available = isAvailableOn(t, today, data.completions, data.tasks)
    const locked = !isUnlockedOn(t, today, data.completions, data.tasks)
    const gate = locked ? data.tasks.find((x) => x.id === t.afterTaskId) : undefined
    const backOn = cooldownUntil(t, data.completions, today)
    const cooling = backOn && today < backOn ? backOn : null
    return (
        <div key={t.id} className={`task-row effort-${t.effort}`} style={urgent ? { borderColor: 'var(--orange)' } : undefined}>
          <div className="dot" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="name">{t.name}</div>
            <div className="meta">
              <span className="chip chip--effort">{t.effort}</span>
              {t.required && <span className="chip chip--required">✅ must-do</span>}
              {t.required && t.requiredUntil && <span className="chip">🏁 until {t.requiredUntil}</span>}
              {urgent && <span className="chip chip--urgent">⚡ urgent</span>}
              {t.repeats && <span className="chip">🔁</span>}
              {t.dayScope === 'weekdays' && <span className="chip">💼 weekdays</span>}
              {t.dayScope === 'weekends' && <span className="chip">🏖️ weekends</span>}
              {t.dayScope === 'custom' && t.weekDays?.length ? (
                <span className="chip">🗓️ {t.weekDays.map(weekDayLabel).join('/')}</span>
              ) : null}
              {t.seasons?.length ? <span className="chip">{t.seasons.map(seasonLabel).join(' ')}</span> : null}
              {t.required && t.onWheel && <span className="chip">🎡 + wheel</span>}
              {notStarted && <span className="chip">🕒 starts {t.startDate}</span>}
              {gate && <span className="chip">🔒 after "{gate.name}"</span>}
              {t.seriesTotal ? <span className="chip">🧩 part {t.seriesPart}/{t.seriesTotal}</span> : null}
              {t.cooldownDays ? <span className="chip">⏳ every {t.cooldownDays}d</span> : null}
              {t.categories?.map((loc) => (
                <span key={loc} className="chip chip--cat">🏷️ {loc}</span>
              ))}
              {cooling && <span className="chip">😴 back {cooling}</span>}
              {due !== null && (
                <span className="chip" style={due <= 2 ? { color: 'var(--orange)' } : undefined}>
                  📅 {due < 0 ? `${-due}d overdue!` : due === 0 ? 'today!' : `${due}d left`}
                </span>
              )}
            </div>
          </div>
          {doneToday ? (
            <span className="chip" style={{ background: 'var(--green)', color: '#10230a' }}>
              ✓ done
            </span>
          ) : pendingIds.has(t.id) ? (
            <span className="chip" style={{ background: 'var(--purple)', color: '#fff' }}>
              🎯 on plate
            </span>
          ) : t.required && !t.onWheel ? (
            // must-dos are ticked off in the checklist beside the wheel, never picked
            <span className="chip chip--required">✅ checklist</span>
          ) : !available ? (
            <span className="chip" title="Not on today's wheel">
              💤 not today
            </span>
          ) : (
            <button className="btn btn--small" style={urgent ? undefined : { background: 'var(--blue)', boxShadow: '0 3px 0 var(--blue-dark)' }} onClick={() => pick(t)}>
              {urgent ? 'Do it!' : 'Pick it'}
            </button>
          )}
          {earlyFinishIds.has(t.id) && (
            <button
              className="btn--ghost btn btn--small"
              style={{ padding: '8px 10px' }}
              title="Finished early — drop the parts left"
              onClick={() => {
                const dropped = finishSeriesEarly(t.seriesId!)
                sfx.gem()
                setToast(`🏁 Called it early — ${dropped} part${dropped > 1 ? 's' : ''} dropped.`)
                window.setTimeout(() => setToast(null), 3000)
              }}
            >
              🏁
            </button>
          )}
          <button
            className="btn--ghost btn btn--small"
            style={{ padding: '8px 10px' }}
            title="Category"
            onClick={() => setCatIds([t.id])}
          >
            📍
          </button>
          <button
            className="btn--ghost btn btn--small"
            style={{ padding: '8px 10px' }}
            onClick={() => {
              setEditing(t)
              setFormOpen(true)
            }}
          >
            ✎
          </button>
        </div>
      )
  }

  return (
    <div className="screen">
      <div className="h1">Your quest log</div>
      <p className="muted" style={{ marginBottom: 12 }}>
        {active.length === 0 ? 'No quests yet. The sea is calling — add one!' : crewToneForCount(active.length)}
      </p>

      <button
        className="btn"
        onClick={() => {
          sfx.click()
          setEditing(null)
          setFormOpen(true)
        }}
      >
        + Add task
      </button>

      {/* Organize = "what can I do right where I am?" — group the log by category,
          or tag a whole pile of quests with a category in one go. */}
      {active.length > 0 && (
        <div className="cat-tools">
          <button
            className={`btn btn--small${byCategory ? '' : ' btn--ghost'}`}
            style={byCategory ? { background: 'var(--purple)', boxShadow: '0 3px 0 #3d1f66' } : undefined}
            onClick={() => {
              sfx.click()
              chosenView.current = true
              setByCategory((o) => !o)
              setCategory('')
            }}
          >
            🏷️ {byCategory ? 'Organized by category' : 'Organize by category'}
          </button>
          <button
            className={`btn btn--small${tagMode ? '' : ' btn--ghost'}`}
            style={tagMode ? { background: 'var(--gold)', color: '#2a1c00', boxShadow: '0 3px 0 #8a6200' } : undefined}
            onClick={() => {
              sfx.click()
              setTagMode((o) => !o)
              setPicked(new Set())
            }}
          >
            🏷️ {tagMode ? 'Done tagging' : 'Tag categories'}
          </button>
        </div>
      )}

      {tagMode && (
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Tap every quest in the same category, then hit the button at the bottom.
        </p>
      )}

      {byCategory && allCategories.length === 0 && (
        <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          No categories yet — tap 🏷️ Tag categories and stamp a bunch of quests at once.
        </p>
      )}

      {byCategory && allCategories.length > 0 && (
        <div className="seg seg--days" style={{ marginTop: 8, flexWrap: 'wrap' }}>
          <button className={category === '' ? 'on' : ''} onClick={() => setCategory('')}>
            All
          </button>
          {allCategories.map((p) => (
            <button key={p} className={category === p ? 'on' : ''} onClick={() => setCategory(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      {active.length > 4 && (
        <div className="search-row">
          <span aria-hidden>🔍</span>
          <input
            type="search"
            value={query}
            placeholder="Search your quests…"
            aria-label="Search quests"
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-clear" aria-label="Clear search" onClick={() => setQuery('')}>
              ✕
            </button>
          )}
        </div>
      )}

      <div className="h2">
        {tagMode
          ? `Still to tag (${untagged.length})`
          : needle
            ? `Found ${shown.length} of ${active.length}`
            : `Active (${active.length})`}
      </div>
      {needle && shown.length === 0 && (
        <p className="muted">No quest matches “{query.trim()}”. Even Zoro couldn't find it.</p>
      )}
      {/* Tagging is a "what's still missing?" sweep, so the untagged quests come
          first and everything already sorted drops into a section below. */}
      {tagMode ? (
        <>
          {untagged.map(taskRow)}
          {untagged.length === 0 && <p className="muted">Everything's tagged. Nice sweep! 🏷️</p>}
          {tagged.length > 0 && (
            <div className="cat-group">
              <div className="cat-head">
                <span>✅ Already tagged</span>
                <span className="muted">{tagged.length}</span>
              </div>
              {tagged.map(taskRow)}
            </div>
          )}
        </>
      ) : byCategory
        ? groupByCategory(shown).map(([label, list]) => (
            <div key={label} className="cat-group">
              <div className="cat-head">
                <span>{label === NO_CATEGORY ? '🤷 No category yet' : `🏷️ ${label}`}</span>
                <span className="muted">{list.length}</span>
              </div>
              {list.map(taskRow)}
            </div>
          ))
        : shown.map(taskRow)}


      {active.some((t) => isEffectivelyUrgent(t) && !doneIds.has(t.id)) && (
        <p className="muted" style={{ marginTop: 4 }}>
          ⚡ {crewSays('urgentPick')}
        </p>
      )}

      {tagMode && picked.size > 0 && (
        <div className="tag-bar">
          <button className="btn" onClick={() => setCatIds([...picked])}>
            🏷️ Set category for {picked.size} quest{picked.size > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {placing && (
        <CategorySheet
          tasks={data.tasks.filter((t) => placing.includes(t.id))}
          knownCategories={allCategories}
          onClose={() => setCatIds(null)}
          onApply={(categories, mode) => {
            for (const t of data.tasks.filter((x) => placing.includes(x.id))) {
              const merged =
                mode === 'replace'
                  ? categories
                  : [...(t.categories ?? []), ...categories.filter((l) => !t.categories?.some((x) => x.toLowerCase() === l.toLowerCase()))]
              updateTask(t.id, { categories: merged.length ? merged : undefined })
            }
            sfx.gem()
            setToast(`📍 ${placing.length} quest${placing.length > 1 ? 's' : ''} sorted.`)
            window.setTimeout(() => setToast(null), 2500)
            setCatIds(null)
            setPicked(new Set())
          }}
        />
      )}

      {toast && (
        <div className="bubble bubble--above" style={{ position: 'fixed', bottom: 96, left: 16, right: 16, zIndex: 60 }}>
          {toast}
        </div>
      )}

      {formOpen && (
        <TaskForm
          initial={editing}
          allTasks={data.tasks}
          knownCategories={allCategories}
          // Diogo lives in the Advanced drawer (categories, dates, chaining) — open it for him.
          advancedByDefault={activeProfileId === PARENT_ID}
          onClose={() => setFormOpen(false)}
          onSave={(v) => {
            if (editing) updateTask(editing.id, v)
            else addTask(v)
            sfx.gem()
            setFormOpen(false)
          }}
          onDelete={
            editing
              ? () => {
                  deleteTask(editing.id)
                  setFormOpen(false)
                }
              : undefined
          }
        />
      )}
    </div>
  )
}

const NO_CATEGORY = ' none'

/**
 * Quests bucketed by category, alphabetically, with the category-less ones last.
 * A quest with two categories shows up under both — that's the point.
 */
function groupByCategory(tasks: Task[]): [string, Task[]][] {
  const out = new Map<string, Task[]>()
  for (const t of tasks) {
    for (const loc of t.categories?.length ? t.categories : [NO_CATEGORY]) {
      const list = out.get(loc)
      if (list) list.push(t)
      else out.set(loc, [t])
    }
  }
  return [...out.entries()].sort(([a], [b]) => (a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : a.localeCompare(b)))
}

/** All parts of every auto-split quest, keyed by series id. */
function groupBySeries(tasks: Task[]): Map<string, Task[]> {
  const out = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!t.seriesId) continue
    const list = out.get(t.seriesId)
    if (list) list.push(t)
    else out.set(t.seriesId, [t])
  }
  return out
}

function crewToneForCount(n: number): string {
  if (n <= 3) return `${n} quest${n > 1 ? 's' : ''} ready. Small crew, big dreams!`
  if (n <= 8) return 'A solid lineup of adventures. Let\'s go!'
  return 'Whoa, that\'s a LOT of quests. The wheel will pick — trust it!'
}

/**
 * Type-a-category box with autocomplete: as you type it offers the categories
 * already in use (substring match, ones you've picked filtered out), so
 * "bas" → "Basement" in one tap and nobody ends up with three spellings of it.
 * Enter or Add takes the first suggestion when there is one, else the raw text.
 */
function CategoryInput(props: {
  known: string[]
  chosen: string[]
  value: string
  onValue: (v: string) => void
  onAdd: (v: string) => void
}) {
  const { known, chosen, value, onValue, onAdd } = props
  const needle = value.trim().toLowerCase()
  const suggestions = known
    .filter((k) => !chosen.some((c) => c.toLowerCase() === k.toLowerCase()))
    .filter((k) => needle && k.toLowerCase().includes(needle) && k.toLowerCase() !== needle)
    .slice(0, 6)

  function commit(v: string) {
    if (!v.trim()) return
    onAdd(v)
    onValue('')
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div className="mic-row">
        <input
          type="text"
          value={value}
          maxLength={24}
          autoComplete="off"
          placeholder='e.g. "Basement", "Computer"'
          onChange={(e) => onValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            commit(suggestions[0] ?? value)
          }}
        />
        <button className="btn btn--small" disabled={!value.trim()} onClick={() => commit(suggestions[0] ?? value)}>
          Add
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="cat-picker" style={{ marginTop: 6 }}>
          {suggestions.map((s) => (
            <button key={s} className="chip chip--cat on" onClick={() => commit(s)}>
              🏷️ {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Quick category editor, straight from the log — no full task form. One quest
 * starts pre-filled with its own categories and saving replaces them; a bulk
 * selection starts empty and adds on top of whatever each quest already has
 * (with "Replace" there for a clean sweep).
 */
function CategorySheet(props: {
  tasks: Task[]
  knownCategories: string[]
  onClose: () => void
  onApply: (categories: string[], mode: 'add' | 'replace') => void
}) {
  const { tasks, knownCategories, onClose, onApply } = props
  const single = tasks.length === 1 ? tasks[0] : null
  const [sel, setSel] = useState<string[]>(single?.categories ?? [])
  const [draft, setDraft] = useState('')

  function toggle(raw: string) {
    const loc = raw.trim().slice(0, 24)
    if (!loc) return
    setSel((cur) =>
      cur.some((x) => x.toLowerCase() === loc.toLowerCase())
        ? cur.filter((x) => x.toLowerCase() !== loc.toLowerCase())
        : [...cur, loc],
    )
  }

  return (
    <div className="overlay overlay--center" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="h1" style={{ marginBottom: 4 }}>
          🏷️ Pick a category
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          {single ? single.name : `${tasks.length} quests selected`}
        </p>

        <div className="cat-picker">
          {[...new Set([...knownCategories, ...sel])].map((p) => (
            <button
              key={p}
              className={`chip chip--cat${sel.some((x) => x.toLowerCase() === p.toLowerCase()) ? ' on' : ''}`}
              onClick={() => toggle(p)}
            >
              🏷️ {p}
            </button>
          ))}
        </div>

        <CategoryInput known={knownCategories} chosen={sel} value={draft} onValue={setDraft} onAdd={toggle} />

        <button className="btn" style={{ marginTop: 14 }} disabled={sel.length === 0} onClick={() => onApply(sel, single ? 'replace' : 'add')}>
          {single ? 'Save' : `Add to ${tasks.length} quests`}
        </button>
        {!single && (
          <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={() => onApply(sel, 'replace')}>
            Replace their categories {sel.length === 0 ? '(clears them)' : ''}
          </button>
        )}
        {single && single.categories?.length ? (
          <button className="btn btn--ghost" style={{ marginTop: 8, color: 'var(--red)' }} onClick={() => onApply([], 'replace')}>
            Clear categories
          </button>
        ) : null}
        <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function TaskForm(props: {
  initial: Task | null
  onSave: (v: {
    name: string
    repeats: boolean
    effort: Effort
    priority: Priority
    dueDate?: string
    startDate?: string
    dayScope: DayScope
    weekDays?: number[]
    required?: boolean
    onWheel?: boolean
    requiredFrom?: string
    requiredUntil?: string
    afterTaskId?: string
    cooldownDays?: number
    parts?: number
    categories?: string[]
    seasons?: Season[]
  }) => void
  allTasks: Task[]
  /** Categories already used elsewhere — offered as one-tap chips. */
  knownCategories: string[]
  /** Start with the Advanced drawer open (the parent uses it on every quest). */
  advancedByDefault?: boolean
  onClose: () => void
  onDelete?: () => void
}) {
  const { initial, allTasks, knownCategories, advancedByDefault, onSave, onClose, onDelete } = props
  const [name, setName] = useState(initial?.name ?? '')
  const [repeats, setRepeats] = useState(initial?.repeats ?? false)
  const [effort, setEffort] = useState<Effort>(initial?.effort ?? 'low')
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'normal')
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [startDate, setStartDate] = useState(initial?.startDate ?? '')
  const [dayScope, setDayScope] = useState<DayScope>(initial?.dayScope ?? 'all')
  const [weekDays, setWeekDays] = useState<number[]>(initial?.weekDays ?? [])
  const [required, setRequired] = useState(initial?.required ?? false)
  const [onWheel, setOnWheel] = useState(initial?.onWheel ?? false)
  const [requiredFrom, setRequiredFrom] = useState(initial?.requiredFrom ?? '')
  const [requiredUntil, setRequiredUntil] = useState(initial?.requiredUntil ?? '')
  const [afterTaskId, setAfterTaskId] = useState(initial?.afterTaskId ?? '')
  const [cooldownDays, setCooldownDays] = useState(initial?.cooldownDays ? String(initial.cooldownDays) : '')
  const [categories, setLocations] = useState<string[]>(initial?.categories ?? [])
  const [seasons, setSeasons] = useState<Season[]>(initial?.seasons ?? [])
  const [draftCategory, setDraftCategory] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function toggleCategory(raw: string) {
    const loc = raw.trim().slice(0, 24)
    if (!loc) return
    setLocations((cur) =>
      // case-insensitive so "Basement" and "basement" never both exist
      cur.some((x) => x.toLowerCase() === loc.toLowerCase())
        ? cur.filter((x) => x.toLowerCase() !== loc.toLowerCase())
        : [...cur, loc],
    )
  }
  // Everything except this quest itself can act as its unlock gate.
  const gateOptions = allTasks.filter((t) => t.id !== initial?.id && !t.archived)
  // Chaining, splitting, dates and day scope are the advanced corner of this
  // form — folded away by default so the everyday "name + must-do + effort"
  // path stays short enough for a kid. Opens itself when a quest already uses it.
  const [parts, setParts] = useState('')
  const partCount = Math.min(20, Math.max(1, Math.floor(Number(parts) || 1)))
  const [advancedOpen, setAdvancedOpen] = useState(
    advancedByDefault ||
    Boolean(
      initial?.dueDate ||
        initial?.startDate ||
        initial?.requiredFrom ||
        initial?.requiredUntil ||
        initial?.afterTaskId ||
        initial?.categories?.length ||
        initial?.seasons?.length ||
        (initial?.dayScope && initial.dayScope !== 'all'),
    ),
  )

  // Dictation: speak the whole quest, the keyword parser fills the form, you review.
  const [heard, setHeard] = useState('')
  const [parsedSummary, setParsedSummary] = useState('')
  const [voiceHelpOpen, setVoiceHelpOpen] = useState(false)
  const speech = useSpeechRecognition({
    onResult: (transcript, isFinal) => {
      setHeard(transcript)
      if (!isFinal) return
      const p = parseSpokenTask(transcript)
      if (p.name) setName(p.name)
      if (p.repeats !== undefined) setRepeats(p.repeats)
      if (p.cooldownDays !== undefined) setCooldownDays(p.cooldownDays ? String(p.cooldownDays) : '')
      if (p.effort) setEffort(p.effort)
      if (p.priority) setPriority(p.priority)
      if (p.required !== undefined) setRequired(p.required)
      if (p.dayScope) setDayScope(p.dayScope)
      if (p.weekDays?.length) setWeekDays(p.weekDays)
      if (p.dueDate) {
        // Must-dos use the requiredUntil window instead of a due date.
        if (p.required) setRequiredUntil(p.dueDate)
        else setDueDate(p.dueDate)
        setAdvancedOpen(true)
      }
      setParsedSummary(describeParsed(p))
    },
  })

  const preview = rewardFor(
    {
      id: '',
      name,
      repeats,
      effort,
      priority,
      dueDate: dueDate || undefined,
      dayScope,
      createdAt: '',
      archived: false,
      spinsSinceLastPicked: 0,
      timesPicked: 0,
    },
    false,
  )

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="h1" style={{ marginBottom: 14 }}>
          {initial ? 'Edit quest' : 'New quest'}
        </div>

        <div className="field">
          <label>What must be done?</label>
          <div className="mic-row">
            <input type="text" value={name} maxLength={60} placeholder='e.g. "Read for 10 min"' onChange={(e) => setName(e.target.value)} />
            {speech.supported && (
              <button
                className={`mic-btn${speech.listening ? ' listening' : ''}`}
                aria-label={speech.listening ? 'Stop listening' : 'Say the quest out loud'}
                onClick={() => {
                  sfx.click()
                  if (speech.listening) {
                    speech.stop()
                  } else {
                    setHeard('')
                    setParsedSummary('')
                    speech.start()
                  }
                }}
              >
                {speech.listening ? '🔴' : '🎤'}
              </button>
            )}
            {speech.supported && (
              <button
                className="mic-btn mic-btn--help"
                aria-label="What can I say?"
                onClick={() => {
                  sfx.click()
                  setVoiceHelpOpen(true)
                }}
              >
                ❓
              </button>
            )}
          </div>
          {speech.supported && (
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              {speech.error
                ? speech.error
                : speech.listening
                  ? heard || 'Listening… try "cut the grass every two weeks, high effort"'
                  : parsedSummary
                    ? `Heard: ${parsedSummary}`
                    : 'Tap 🎤 and say the whole quest — I\'ll fill the rest in.'}
            </p>
          )}
        </div>

        <div className="field">
          <label>Must-do? (a non-negotiable, not a wheel pick)</label>
          <div className="seg">
            <button className={!required ? 'on' : ''} onClick={() => setRequired(false)}>
              🎡 On the wheel
            </button>
            <button className={required ? 'on' : ''} onClick={() => setRequired(true)}>
              ✅ Must-do
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            {required
              ? `Lives in the must-do checklist beside the wheel. Pays 🪙${REQUIRED_REWARD[effort]} per tick — and costs 🪙${REQUIRED_REWARD[effort]} for every day you skip it.`
              : 'Normal quest — the wheel can land on it.'}
          </p>
          {required && (
            <>
              <div className="seg" style={{ marginTop: 10 }}>
                <button className={!onWheel ? 'on' : ''} onClick={() => setOnWheel(false)}>
                  Checklist only
                </button>
                <button className={onWheel ? 'on' : ''} onClick={() => setOnWheel(true)}>
                  ➕ Also on the wheel
                </button>
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {onWheel
                  ? `Both: tick it in the checklist, or let the wheel land on it for the full 🪙${preview}.`
                  : 'Only the checklist — the wheel never picks it.'}
              </p>
            </>
          )}
        </div>

        <div className="field">
          <label>Repeats? (habit)</label>
          <div className="seg">
            <button className={!repeats ? 'on' : ''} onClick={() => setRepeats(false)}>
              One-shot 💨
            </button>
            <button className={repeats ? 'on' : ''} onClick={() => setRepeats(true)}>
              Every day 🔁
            </button>
          </div>
          {repeats && (
            <>
              <label style={{ marginTop: 10 }}>Rest days after doing it (0 = every day)</label>
              <input
                type="number"
                min={0}
                max={365}
                inputMode="numeric"
                placeholder="e.g. 15"
                value={cooldownDays}
                onChange={(e) => setCooldownDays(e.target.value)}
              />
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {Number(cooldownDays) > 0
                  ? `Once you tick it off it takes a nap and comes back ${cooldownDays} days later. Perfect for "cut the grass".`
                  : 'No rest — it can show up again tomorrow.'}
              </p>
            </>
          )}
        </div>

        <div className="field">
          <label>Effort</label>
          <div className="seg">
            {(['low', 'medium', 'high'] as Effort[]).map((e) => (
              <button key={e} className={effort === e ? 'on' : ''} onClick={() => setEffort(e)}>
                {e === 'low' ? '🔵 low' : e === 'medium' ? '🟡 med' : '🔴 high'}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Priority (everything here is important)</label>
          <div className="seg">
            <button className={priority === 'normal' ? 'on' : ''} onClick={() => setPriority('normal')}>
              Normal
            </button>
            <button className={priority === 'urgent' ? 'on' : ''} onClick={() => setPriority('urgent')}>
              ⚡ High
            </button>
          </div>
        </div>

        {/* Everything power-user lives behind one button: chaining, splitting,
            dates and day scope. The everyday path stays name + must-do + effort. */}
        <div className="field">
          <button className="dates-toggle" onClick={() => setAdvancedOpen((o) => !o)}>
            <span>⚙️ Advanced</span>
            <span className="muted">{advancedOpen ? '▲' : '▼'}</span>
          </button>

          {advancedOpen && (
            <div className="dates-body">
              <label>Categories (as many as you like)</label>
              {(knownCategories.length > 0 || categories.length > 0) && (
                <div className="cat-picker">
                  {[...new Set([...knownCategories, ...categories])].map((p) => (
                    <button
                      key={p}
                      className={`chip chip--cat${categories.some((x) => x.toLowerCase() === p.toLowerCase()) ? ' on' : ''}`}
                      onClick={() => toggleCategory(p)}
                    >
                      🏷️ {p}
                    </button>
                  ))}
                </div>
              )}
              <CategoryInput known={knownCategories} chosen={categories} value={draftCategory} onValue={setDraftCategory} onAdd={toggleCategory} />
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {categories.length
                  ? `Grouped under ${categories.join(' + ')} in the quest log.`
                  : 'No category yet — tap 🏷️ Organize in the quest log to sort quests by category.'}
              </p>

              <div style={{ height: 12 }} />
              <label>Locked until another quest is done? (optional)</label>
              <select value={afterTaskId} onChange={(e) => setAfterTaskId(e.target.value)}>
                <option value="">🔓 No — available right away</option>
                {gateOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    🔒 After "{t.name}"
                  </option>
                ))}
              </select>
              {afterTaskId && (
                <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                  Hidden from the wheel and the must-do list until that quest is completed once.
                </p>
              )}

              {/* Auto-split: one big job → N chained sessions. New quests only —
                  re-splitting an existing one would orphan its history. */}
              {!initial && !repeats && (
                <>
                  <label style={{ marginTop: 12 }}>Split into parts (a big job, one session at a time)</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    inputMode="numeric"
                    placeholder="e.g. 6"
                    value={parts}
                    onChange={(e) => setParts(e.target.value)}
                  />
                  <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    {partCount > 1
                      ? `Creates ${partCount} quests — "${(name.trim() || 'Your quest')} (1/${partCount})" … (${partCount}/${partCount}). Each one unlocks when the one before it is done, and you can call it early any time to drop the rest.`
                      : 'One quest, as usual.'}
                  </p>
                </>
              )}

              <div style={{ height: 12 }} />
              {required ? (
                <>
                  <label>Starts on — ignored until this day</label>
                  <input type="date" value={requiredFrom} onChange={(e) => setRequiredFrom(e.target.value)} />
                  {requiredFrom && (
                    <button className="btn btn--ghost btn--small" style={{ marginTop: 6 }} onClick={() => setRequiredFrom('')}>
                      Clear
                    </button>
                  )}

                  <label style={{ marginTop: 12 }}>Last day — required every day up to here</label>
                  <input type="date" value={requiredUntil} onChange={(e) => setRequiredUntil(e.target.value)} />
                  {requiredUntil ? (
                    <button className="btn btn--ghost btn--small" style={{ marginTop: 6 }} onClick={() => setRequiredUntil('')}>
                      Clear (require it forever)
                    </button>
                  ) : (
                    <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                      No last day — required every day, indefinitely.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <label>Starts on — hidden from the wheel until this day</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  {startDate && (
                    <button className="btn btn--ghost btn--small" style={{ marginTop: 6 }} onClick={() => setStartDate('')}>
                      Clear
                    </button>
                  )}

                  <label style={{ marginTop: 12 }}>Deadline — it gets scarier as it nears</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                  {dueDate && (
                    <button className="btn btn--ghost btn--small" style={{ marginTop: 6 }} onClick={() => setDueDate('')}>
                      Clear
                    </button>
                  )}
                </>
              )}

              <label style={{ marginTop: 12 }}>Which days? (the wheel obeys)</label>
              <div className="seg">
                <button className={dayScope === 'all' ? 'on' : ''} onClick={() => setDayScope('all')}>
                  All days
                </button>
                <button className={dayScope === 'weekdays' ? 'on' : ''} onClick={() => setDayScope('weekdays')}>
                  💼 Weekdays
                </button>
                <button className={dayScope === 'weekends' ? 'on' : ''} onClick={() => setDayScope('weekends')}>
                  🏖️ Weekends
                </button>
                <button className={dayScope === 'custom' ? 'on' : ''} onClick={() => setDayScope('custom')}>
                  🗓️ Pick days
                </button>
              </div>
              {dayScope === 'custom' && (
                <>
                  {/* Monday first — the week people actually plan in. */}
                  <div className="seg seg--days" style={{ marginTop: 10 }}>
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <button
                        key={d}
                        className={weekDays.includes(d) ? 'on' : ''}
                        onClick={() => setWeekDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()))}
                      >
                        {weekDayLabel(d).slice(0, 2)}
                      </button>
                    ))}
                  </div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    {weekDays.length === 0
                      ? 'Pick at least one day, or it counts as every day.'
                      : `${required ? 'Must-do on' : 'On the wheel on'} ${weekDays.map(weekDayLabel).join(', ')} only.`}
                  </p>
                </>
              )}

              {/* Seasons stack on top of the day scope: "every day, but only in summer". */}
              <label style={{ marginTop: 12 }}>Which seasons?</label>
              <div className="seg seg--days">
                {(['winter', 'spring', 'summer', 'fall'] as Season[]).map((s) => (
                  <button
                    key={s}
                    className={seasons.includes(s) ? 'on' : ''}
                    onClick={() => setSeasons((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                  >
                    {seasonLabel(s)}
                  </button>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {seasons.length === 0 || seasons.length === 4
                  ? 'All year round.'
                  : `Only shows up in ${seasons.map((s) => seasonLabel(s).split(' ')[1].toLowerCase()).join(', ')} — hidden the rest of the year.`}
              </p>
            </div>
          )}
        </div>

        <p className="muted" style={{ marginBottom: 12 }}>
          {required
            ? `Pays 🪙${REQUIRED_REWARD[effort]} per tick, −🪙${REQUIRED_REWARD[effort]} per skipped day.`
            : `Pays 🪙${preview} per completion${priority === 'urgent' ? ' (urgency bonus included)' : ''}.`}
        </p>

        <button
          className="btn"
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              name,
              repeats,
              effort,
              priority,
              dueDate: dueDate || undefined,
              startDate: startDate || undefined,
              dayScope,
              weekDays: dayScope === 'custom' && weekDays.length ? weekDays : undefined,
              required,
              onWheel: required && onWheel ? true : undefined,
              // the window only means anything for a requirement
              requiredFrom: required ? requiredFrom || undefined : undefined,
              requiredUntil: required ? requiredUntil || undefined : undefined,
              afterTaskId: afterTaskId || undefined,
              cooldownDays: repeats && Number(cooldownDays) > 0 ? Number(cooldownDays) : undefined,
              // undefined clears the field on edit, so dropping every category sticks
              categories: categories.length ? categories : undefined,
              // all four = no restriction, so store nothing
              seasons: seasons.length && seasons.length < 4 ? seasons : undefined,
              // splitting only ever happens on creation
              parts: !initial && !repeats && partCount > 1 ? partCount : undefined,
            })
          }
        >
          {initial
            ? 'Save'
            : partCount > 1
              ? `Add ${partCount} parts`
              : required
                ? 'Add to must-dos'
                : 'Add to the wheel'}
        </button>
        {onDelete &&
          (confirmDelete ? (
            <button className="btn btn--red" style={{ marginTop: 8 }} onClick={onDelete}>
              Yes, delete forever (history stays)
            </button>
          ) : (
            <button className="btn btn--ghost" style={{ marginTop: 8, color: 'var(--red)' }} onClick={() => setConfirmDelete(true)}>
              Delete task
            </button>
          ))}
        <button className="btn btn--ghost" style={{ marginTop: 8 }} onClick={onClose}>
          Cancel
        </button>
      </div>

      {voiceHelpOpen && <VoiceHelp onClose={() => setVoiceHelpOpen(false)} />}
    </div>
  )
}

// Cheat sheet for dictation — everything parseSpokenTask() understands.
function VoiceHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="overlay overlay--center voice-help-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="h1" style={{ marginBottom: 4 }}>
          🎤 What can I say?
        </div>
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
          Say the whole quest in one go. I'll pull out the settings and whatever's left becomes the name.
        </p>

        <div className="voice-help-examples">
          {VOICE_EXAMPLES.map((ex) => (
            <div key={ex} className="voice-help-example">“{ex}”</div>
          ))}
        </div>

        {VOICE_PHRASES.map((group) => (
          <div key={group.title} className="voice-help-group">
            <div className="voice-help-title">
              {group.emoji} {group.title}
            </div>
            <ul>
              {group.phrases.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ))}

        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          Nothing saves until you tap the save button — check what I filled in first!
        </p>
        <button className="btn btn--blue" style={{ marginTop: 12 }} onClick={onClose}>
          Got it!
        </button>
      </div>
    </div>
  )
}
