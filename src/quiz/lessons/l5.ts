// LEVEL 5 — Agent architectures.
// Composing the Level 3 loop into systems. The recurring theme: every pattern
// here buys capability with predictability, and the winning move is usually the
// smallest pattern that solves the problem.
import type { QuizLesson } from '../../types'

export const L5_LESSONS: QuizLesson[] = [
  {
    id: 'l5-workflow-patterns',
    title: 'The four workflow patterns you will use constantly',
    emoji: '🧱',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'Before reaching for an autonomous agent, know the composable workflow patterns. They cover a startling share of real problems, and unlike an agent they are predictable to price, test and debug.',
      },
      { kind: 'h', text: '1. Prompt chaining' },
      {
        kind: 'flow',
        steps: [
          { emoji: '📝', label: 'Outline', sub: 'call 1' },
          { emoji: '✅', label: 'Gate', sub: 'check it', tone: 'muted' },
          { emoji: '📄', label: 'Draft', sub: 'call 2' },
          { emoji: '✨', label: 'Polish', sub: 'call 3' },
        ],
        caption: 'Break one hard task into a fixed sequence of easy ones. Each step gets a simpler job and a shorter prompt, so each is more reliable. Put a programmatic **gate** between steps to fail fast.',
      },
      { kind: 'h', text: '2. Routing' },
      {
        kind: 'flow',
        steps: [
          { emoji: '📨', label: 'Input', tone: 'muted' },
          { emoji: '🚦', label: 'Classify', sub: 'cheap, fast model' },
          { emoji: '🎯', label: 'Specialised handler', sub: 'the right prompt/model' },
        ],
        caption: 'Classify first, then dispatch to a prompt built for that case. Lets you send easy traffic to a small model and hard traffic to a big one — usually the single biggest cost win available.',
      },
      { kind: 'h', text: '3. Parallelisation' },
      {
        kind: 'compare',
        left: {
          title: 'Sectioning',
          emoji: '🍰',
          tone: 'neutral',
          items: ['Split into independent subtasks', 'Run at the same time', 'Merge the pieces', 'e.g. review 8 files at once'],
        },
        right: {
          title: 'Voting',
          emoji: '🗳️',
          tone: 'neutral',
          items: ['Same task, N times', 'Different prompts or temperature', 'Take majority or best', 'e.g. "is this content safe?" ×3'],
        },
        caption: 'Both trade tokens for either latency (sectioning) or confidence (voting).',
      },
      { kind: 'h', text: '4. Orchestrator–worker' },
      {
        kind: 'p',
        text: 'Same shape as sectioning, but the subtasks are **not known in advance** — a lead model decides at runtime how to split the work, dispatches workers, and synthesises their results. This is the first genuinely agentic pattern, and it gets its own lesson next.',
      },
      {
        kind: 'note',
        note: 'react',
        text: 'You already compose exactly like this. Chaining is a **pipeline**. Routing is a **switch on a discriminated union**. Sectioning is `Promise.all`. Voting is retry-with-quorum. The novelty is not the topology — it is that each node is non-deterministic, which is why the gates between nodes matter so much more than usual.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Most "we need an agent" problems are actually a **router plus a chain**. Try that first: it is cheaper, faster, testable, and it will not surprise you at 2am.',
      },
    ],
  },

  {
    id: 'l5-orchestrator-worker',
    title: 'Orchestrator and subagents',
    emoji: '🎼',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'When a task is too big for one context window, or needs genuinely different modes of work, you split it: a **lead agent** decomposes the goal and delegates to **subagents**, each with its own fresh context, its own tools, and one narrow job.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '🎯', label: 'Goal', tone: 'muted' },
          { emoji: '🎼', label: 'Lead agent', sub: 'plans + delegates' },
          { emoji: '👷', label: 'Subagents', sub: 'clean window each' },
          { emoji: '🧵', label: 'Synthesise', sub: 'lead combines results' },
        ],
        caption: 'The subagents run in parallel and return summaries, not transcripts. The lead never sees their intermediate mess.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine a research lead with three assistants. Each is sent to a different archive, each reads a hundred documents, and each comes back with a one-page brief. The lead never reads the hundred documents — that is the entire point. **Context isolation is the product**; parallel speed is a bonus.',
      },
      { kind: 'h', text: 'Why this actually helps' },
      {
        kind: 'list',
        items: [
          '**Context isolation.** A subagent burns 100k tokens exploring and returns 500 tokens of findings. The lead’s window stays clean, so it can keep coordinating for far longer than a single agent could.',
          '**Parallelism.** Independent subtasks run concurrently. For research-shaped work this is often a several-fold wall-clock win.',
          '**Specialisation.** Each subagent gets only the tools and instructions for its job, which cuts wrong-tool errors sharply.',
          '**Failure containment.** One subagent going off the rails costs one subagent, not the whole run.',
        ],
      },
      { kind: 'h', text: 'What it costs' },
      {
        kind: 'bars',
        items: [
          { label: 'Single call', pct: 8, note: '1×' },
          { label: 'Agent loop', pct: 40, note: '~4× tokens' },
          { label: 'Multi-agent', pct: 100, note: '~15× tokens' },
        ],
        caption: 'Order-of-magnitude figures reported by teams running these in production. Multi-agent is not a mild overhead — it is a different price bracket, justified only when the task value is high and it is genuinely parallelisable.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'The delegation prompt is where these systems die. "Research the competitors" produces three subagents doing overlapping, unfocused work. Each task handed to a subagent needs an **objective, an output format, a scope boundary, and the tools to use** — and the lead must be told explicitly how to divide the work so subagents do not duplicate each other.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Reach for subagents when the sub-task is **read-heavy, parallelisable, and summarisable**. Avoid them when subtasks depend on each other’s intermediate state — coordination through a lead is a lossy, expensive channel.',
      },
    ],
  },

  {
    id: 'l5-evaluator-optimizer',
    title: 'Self-critique loops: generate, judge, revise',
    emoji: '♻️',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'One model generates; another (or the same one, in a fresh role) evaluates against criteria; the generator revises. Loop until the evaluator is satisfied or you hit a cap. It is the reviewer pattern, and it works for the same reason code review does.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '✍️', label: 'Generate', sub: 'attempt' },
          { emoji: '⚖️', label: 'Evaluate', sub: 'against explicit criteria' },
          { emoji: '🔧', label: 'Revise', sub: 'with the critique in context' },
        ],
        loop: 'until it passes, or after N rounds — always cap it',
        caption: 'The critique goes into the next generation as context. That is the mechanism: the second attempt is conditioned on a written diagnosis of the first.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine writing a cover letter. Your first draft, reread ten minutes later, is obviously improvable — not because you got smarter, but because reading and writing are different tasks. Splitting them into two roles is what makes the improvement reliable rather than accidental.',
      },
      { kind: 'h', text: 'When it pays' },
      {
        kind: 'compare',
        left: {
          title: 'Works well',
          emoji: '✅',
          tone: 'good',
          items: [
            'Clear criteria you can write down',
            'An **objective** signal exists: tests, compiler, linter, schema',
            'Quality matters more than latency',
            'e.g. code that must pass a test suite',
          ],
        },
        right: {
          title: 'Works badly',
          emoji: '⚠️',
          tone: 'bad',
          items: [
            'Vague criteria ("make it better")',
            'Only the model’s own opinion as a signal',
            'Latency-sensitive paths',
            'Simple tasks — it just adds cost and churn',
          ],
        },
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Self-critique with **no external signal** hits a ceiling fast, and can make things worse: models are poor at spotting their own errors and will happily "improve" a correct answer into a wrong one. Ground the evaluator in something real — run the tests, validate the schema, check the retrieved source. An evaluator with a compiler behind it is worth ten without one.',
      },
      {
        kind: 'note',
        note: 'react',
        text: 'This is your **red-green-refactor** loop with a language model in the chair. And the lesson transfers exactly: the loop is only as good as the test. Vague acceptance criteria produce vague iteration, whether the developer is human or not.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Always cap the rounds (2–3 is usually where returns die), and give the evaluator **an external signal** wherever one exists.',
      },
    ],
  },

  {
    id: 'l5-multiagent-tradeoffs',
    title: 'The multi-agent trap',
    emoji: '🕸️',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'Multi-agent diagrams are seductive: a Planner, a Researcher, a Writer, a Critic, all chatting. They demo beautifully and fail in production for reasons worth knowing *before* you build one.',
      },
      { kind: 'h', text: 'Four failure modes' },
      {
        kind: 'table',
        head: ['Failure', 'What it looks like'],
        rows: [
          ['**Lossy handoff**', 'Agents communicate in natural language. Every hop drops nuance — it is a game of telephone where each player is also improvising.'],
          ['**Conflicting actions**', 'Two agents edit the same file, or both "helpfully" send the customer an email. Without shared state and locking, they fight.'],
          ['**Error compounding**', 'Five agents at 90% reliability chained together give you ~59%. Reliability multiplies, and it multiplies downward.'],
          ['**Cost and latency explosion**', 'Every agent re-reads the context, re-thinks, re-explains. Token use grows multiplicatively, not additively.'],
        ],
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine a four-person team where nobody can see a shared document, nobody remembers yesterday, and all communication is by voicemail. Each person is individually competent. The team is a disaster — not from a lack of talent, but from a lack of shared state. Most multi-agent systems are that team.',
      },
      { kind: 'h', text: 'The heuristics that survive contact with production' },
      {
        kind: 'list',
        items: [
          '**Prefer one agent with more tools** over several agents with few. A single loop with a shared window has perfect internal communication — for free.',
          '**Prefer read-only parallelism.** Multi-agent shines when subagents gather information; it hurts when they all try to write. Fan out for research, funnel writes through one place.',
          '**Make handoffs structured.** Passing a JSON object with defined fields loses far less than passing a paragraph of prose.',
          '**Share state outside the conversation.** A file, a database, a task board — one source of truth all agents read and write, instead of describing state to each other.',
          '**Count the multiplication before building.** 15× the tokens is fine for a research task worth an hour of your time; it is absurd for a support classifier.',
        ],
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Multi-agent is a **context and parallelism tool**, not an org chart. If you find yourself giving agents job titles and personalities, you are probably designing a metaphor rather than a system.',
      },
    ],
  },

  {
    id: 'l5-human-in-the-loop',
    title: 'Human in the loop, designed properly',
    emoji: '🧑‍⚖️',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'Full autonomy is rarely the goal — trustworthy autonomy is. The design question is not "should a human be involved?" but **"at exactly which points, with what information, and what happens while they think?"**',
      },
      { kind: 'h', text: 'Gate by consequence, not by confidence' },
      {
        kind: 'table',
        head: ['Action class', 'Gate'],
        rows: [
          ['Read-only, cheap, reversible', 'Run freely. Log it. Approval fatigue is a real security risk.'],
          ['Writes to internal state', 'Run, but make it undoable and visible in a diff/audit log.'],
          ['External side effects (email, payment, deploy)', 'Explicit approval, showing the exact action and its arguments.'],
          ['Irreversible or destructive', 'Approval plus a typed confirmation. Some things should not be one tap away.'],
        ],
        caption: 'Note that the model’s own confidence is **not** in this table. It is not calibrated, and gating on it means the most dangerous actions sail through whenever the model happens to feel sure.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine a new hire with root access. You do not review their every command — you would both go mad. You let them read anything, you let them write to staging, and you require a second pair of eyes before production. **Blast radius, not seniority, decides the gate.**',
      },
      { kind: 'h', text: 'Making an approval useful' },
      {
        kind: 'compare',
        left: {
          title: 'A useless approval',
          emoji: '🙈',
          tone: 'bad',
          items: [
            '"The agent wants to proceed. Allow?"',
            'No visibility into what it will do',
            'No reason given',
            'Trains the human to click yes',
          ],
        },
        right: {
          title: 'A real approval',
          emoji: '🔍',
          tone: 'good',
          items: [
            'The exact call and arguments, rendered',
            'Why the agent believes it is needed',
            'What it did to get here (the trace)',
            'Options: approve / edit / reject **with feedback**',
          ],
        },
        caption: '"Reject with feedback" is the underrated one: the rejection goes back into context and the agent tries a different approach, instead of the run just dying.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Approval gates need **durable state**. A human may take three days to respond, so the run must be pausable and resumable — serialise the message array and the pending call, and rehydrate. Agents that only work while a process stays alive cannot have real approval gates, and this constraint should shape your architecture from day one.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Gate on **blast radius**, show the human the actual action, and always allow "no, do it differently" — not just yes/no.',
      },
    ],
  },

  {
    id: 'l5-choosing',
    title: 'Choosing an architecture without over-engineering',
    emoji: '🧭',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'You now have the catalogue: single call, chain, router, parallel, agent loop, orchestrator–worker, evaluator loop. The skill that separates people who ship from people who demo is **picking the smallest one that works** — and being able to say why.',
      },
      {
        kind: 'stack',
        layers: [
          { label: '1. A single well-written prompt', sub: 'Genuinely try this first, with good examples' },
          { label: '2. Add retrieval', sub: 'It only lacked information' },
          { label: '3. Add a chain or a router', sub: 'The steps are known — encode them in code' },
          { label: '4. Add tools + a loop', sub: 'The steps depend on what it finds' },
          { label: '5. Add subagents', sub: 'One window genuinely cannot hold the task' },
        ],
        caption: 'Climb one rung at a time, and only when the rung below has demonstrably failed on your evals — not because the next one sounds more impressive.',
      },
      { kind: 'h', text: 'Three questions that settle it' },
      {
        kind: 'list',
        ordered: true,
        items: [
          '**Can I write the steps down in advance?** Yes → workflow. It will be cheaper, faster and testable. Reserve agents for genuinely open-ended paths.',
          '**What does a wrong answer cost?** High → more gates, more validation, human approval, and a simpler architecture you can actually reason about.',
          '**Does the value justify the tokens?** An agent loop is roughly 4× a single call; multi-agent roughly 15×. For a $0.02 classification, no. For an hour of expert research, easily.',
        ],
      },
      {
        kind: 'note',
        note: 'react',
        text: 'You have made this call before. Not every page needs a state machine; not every list needs virtualisation; not every app needs micro-frontends. The senior instinct — reach for complexity only when the simple thing has visibly failed — transfers directly, and it is the most valuable thing you bring from frontend to this field.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'The best architecture is the **least autonomous one that clears your evals**. Autonomy is a cost you accept when you must, not a feature you show off.',
      },
    ],
  },
]
