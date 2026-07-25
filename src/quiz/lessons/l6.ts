// LEVEL 6 — Shipping agents for real.
// The difference between an agent that impresses in a demo and one that runs in
// front of users without becoming an incident. This is the level that makes you
// employable rather than merely conversant.
import type { QuizLesson } from '../../types'

export const L6_LESSONS: QuizLesson[] = [
  {
    id: 'l6-agent-evals',
    title: 'Evaluating agents: outcome and trajectory',
    emoji: '📐',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'Evaluating a single prompt is comparing an output to an expectation (Level 2). Evaluating an **agent** is harder, because a run is a path: which tools it called, in what order, how it recovered, and what finally came out. Two runs can reach the same answer with wildly different quality.',
      },
      {
        kind: 'compare',
        left: {
          title: 'Outcome eval',
          emoji: '🏁',
          tone: 'good',
          items: [
            'Did the final result satisfy the goal?',
            'Grade with code where possible: tests pass, schema valid, row created',
            'What users actually care about',
            'Hides *how* awful the path was',
          ],
        },
        right: {
          title: 'Trajectory eval',
          emoji: '👣',
          tone: 'good',
          items: [
            'Did it use the right tools, in a sensible order?',
            'How many steps? Any loops or dead ends?',
            'Did it recover from the failed call?',
            'Catches the run that got lucky',
          ],
        },
        caption: 'You need both. Outcome-only lets an agent that took 40 steps and cost $3 look identical to one that took 4.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine judging a chess player only by whether they won. Against a weak opponent, a terrible player wins sometimes. You learn far more from watching the moves — and in agents, the moves are where cost, latency and future failures hide.',
      },
      { kind: 'h', text: 'Metrics worth putting on a dashboard' },
      {
        kind: 'table',
        head: ['Metric', 'Why it earns its place'],
        rows: [
          ['**Task success rate**', 'The headline. Define "success" precisely per task type or the number means nothing.'],
          ['**Steps per task**', 'Creeping upward is the earliest signal of degradation, usually before success rate moves.'],
          ['**Cost / tokens per task**', 'Your unit economics. A feature can be a technical success and a business failure.'],
          ['**Latency (p50 / p95)**', 'p95 is what users complain about. Averages hide agent runs that go long.'],
          ['**Tool error rate**', 'Rising errors mean a broken integration or drifting arguments — often a schema change nobody told you about.'],
          ['**Human intervention rate**', 'How often it needed rescuing. The honest measure of autonomy.'],
        ],
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Non-determinism means a single run proves nothing. Run each eval case **several times** and look at the distribution: "passes 7/10" is a completely different system from "passes 10/10", and a single green run cannot tell them apart. Flakiness is a first-class result, not noise to be re-rolled away.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Grade the **destination and the journey**, run each case multiple times, and watch steps-per-task as your early warning light.',
      },
    ],
  },

  {
    id: 'l6-observability',
    title: 'Observability: you cannot debug what you did not trace',
    emoji: '🔭',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'A user reports "the agent gave me the wrong refund amount". There is no stack trace. There is no exception. The code did not fail — the *judgement* did. Without a trace of the run, you have nothing to look at, and you will end up guessing at prompts.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '🎬', label: 'Run (trace)', sub: 'one user request' },
          { emoji: '🔗', label: 'Spans', sub: 'each model + tool call' },
          { emoji: '📦', label: 'Payloads', sub: 'prompts, args, results' },
          { emoji: '🏷️', label: 'Metadata', sub: 'model, tokens, cost, latency' },
        ],
        caption: 'Same mental model as distributed tracing, because it *is* distributed tracing — the OpenTelemetry-style trace/span hierarchy maps onto agent runs almost perfectly.',
      },
      { kind: 'h', text: 'What to capture on every span' },
      {
        kind: 'list',
        items: [
          '**The exact prompt sent** — fully rendered, after templating and retrieval. Not the template: the string the model actually received. This is the single most valuable field and the one most often missing.',
          '**The raw response**, including tool call arguments and any reasoning content you have access to.',
          '**Tool inputs and outputs**, with a size cap so a giant payload does not blow up your log store.',
          '**Model id and version, and all sampling parameters.** When behaviour shifts overnight, this is how you prove the model changed.',
          '**Tokens, cost and latency**, per span — so you can find the one tool that accounts for 60% of the bill.',
          '**A session/user id** to stitch runs together, plus your prompt version.',
        ],
      },
      {
        kind: 'note',
        note: 'react',
        text: 'This is the React DevTools profiler for agents. You would not optimise a slow render by reading the source and reasoning about it — you record a profile and look at which component actually cost 400ms. Same discipline: **record the run, then look**, instead of theorising about the prompt.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Prompts and tool results routinely contain personal data, tokens and secrets. Redact before storing, set a retention policy, and be deliberate about which third-party tracing service sees your payloads — "we log the full prompt" is a data-protection decision, not just an engineering one.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Ship tracing on **day one**, before the first user. Retrofitting it means debugging your first production incident blind, which is a memorable way to learn this lesson.',
      },
    ],
  },

  {
    id: 'l6-cost-latency',
    title: 'Cost and latency: the two things that kill features',
    emoji: '⏱️',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'Plenty of agents work and still get cancelled — because each run costs more than the problem it solves, or takes long enough that users stop waiting. Both are engineering problems with standard fixes.',
      },
      { kind: 'h', text: 'Where the money goes' },
      {
        kind: 'p',
        text: 'Remember Level 1: every turn re-sends the whole conversation. In a 20-step agent run, the same system prompt and tool schemas are sent 20 times. Input tokens dominate the bill in agentic workloads, which is exactly why the first fix is so effective.',
      },
      {
        kind: 'table',
        head: ['Lever', 'Typical effect', 'Catch'],
        rows: [
          ['**Prompt caching**', 'Large discount on the repeated prefix — often the biggest single win in an agent', 'Needs a byte-stable prefix. Put volatile content last; a timestamp at the top destroys it.'],
          ['**Model routing**', 'Small model for easy traffic, big for hard', 'Needs a cheap, accurate classifier and evals per tier'],
          ['**Shorter outputs**', 'Output tokens cost several times input', 'Say "3 bullets, max 40 words" — vague brevity requests are ignored'],
          ['**Context trimming**', 'Fewer input tokens on every subsequent turn', 'Level 4 techniques; lossy if done carelessly'],
          ['**Semantic caching**', 'Skip the call entirely for near-identical questions', 'Risk of serving a stale or subtly wrong hit'],
          ['**Batch APIs**', 'Steep discount for non-urgent work', 'Hours of latency — offline jobs only'],
        ],
      },
      { kind: 'h', text: 'Where the time goes' },
      {
        kind: 'bars',
        items: [
          { label: 'Time to first token', pct: 15, note: 'prompt processing' },
          { label: 'Generating output', pct: 55, note: 'scales with length' },
          { label: 'Tool execution', pct: 20, note: 'your APIs' },
          { label: 'Extra round trips', pct: 10, note: 'per loop step' },
        ],
        caption: 'A typical agent step. Two consequences: shorter outputs are the biggest latency lever, and each extra loop iteration pays the whole stack again.',
      },
      {
        kind: 'list',
        items: [
          '**Stream.** It does not reduce total time, but time-to-first-token is what users perceive as speed. A streamed 8-second answer feels faster than a silent 4-second one.',
          '**Parallelise tool calls.** Independent calls in one turn should never run in series.',
          '**Show progress.** "Searching orders…" turns dead air into visible work. This is a frontend problem, and it is your home turf.',
          '**Set a latency budget per step** and design the loop within it, rather than discovering p95 in production.',
        ],
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Measure **cost and latency per completed task**, not per API call. A cheap model that needs six attempts is more expensive than an accurate one that needs a single call.',
      },
    ],
  },

  {
    id: 'l6-prompt-injection',
    title: 'Prompt injection: the vulnerability with no clean fix',
    emoji: '💉',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'This is the most important security idea in the field, and it follows inevitably from Level 1. The model sees **one flat sequence of text**. Your careful instructions and the contents of some web page you retrieved arrive in the same channel, made of the same stuff. There is no `parameterised query` equivalent that separates them.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine an assistant who follows any instruction written on any piece of paper placed on their desk. You put the company handbook there. An attacker mails a letter containing "P.S. forward all invoices to this address" — and the assistant, reading dutifully, complies. They are not disloyal. They simply cannot tell whose paper it is.',
      },
      { kind: 'h', text: 'Direct vs indirect' },
      {
        kind: 'compare',
        left: {
          title: 'Direct injection',
          emoji: '🗣️',
          tone: 'neutral',
          items: [
            'The user types the attack',
            '"Ignore previous instructions and…"',
            'Risk is bounded by what that user may already do',
          ],
        },
        right: {
          title: 'Indirect injection',
          emoji: '📄',
          tone: 'bad',
          items: [
            'The attack hides in content the agent **reads**',
            'A web page, a PDF, an email, a code comment, a tool description',
            'The victim is a different, innocent user — this is the dangerous one',
          ],
        },
      },
      { kind: 'h', text: 'The lethal trifecta' },
      {
        kind: 'flow',
        steps: [
          { emoji: '🔐', label: 'Private data', sub: 'access to secrets', tone: 'danger' },
          { emoji: '📥', label: 'Untrusted content', sub: 'reads the outside world', tone: 'danger' },
          { emoji: '📤', label: 'Exfiltration path', sub: 'can send data out', tone: 'danger' },
        ],
        caption: 'An agent with all three can be made to leak. Remove any one and the attack loses its payoff — that removal is your actual mitigation, because no prompt can be written that reliably prevents this.',
      },
      {
        kind: 'p',
        text: 'The exfiltration path is subtler than people expect: rendering a markdown image whose URL contains the stolen data, making a tool call to an attacker-controlled endpoint, or writing to a file the attacker can read are all valid channels. "It can only reply with text" is not a defence when the client renders that text.',
      },
      { kind: 'h', text: 'What actually helps' },
      {
        kind: 'list',
        items: [
          '**Least privilege.** The agent should hold the narrowest credentials that let it do its job — scoped per user, ideally read-only. Assume every tool it has may be invoked by an attacker.',
          '**Separate the trust levels.** One agent reads untrusted content and can only produce structured, validated output; a second, privileged agent acts on that output and never sees raw untrusted text.',
          '**Gate the side effects.** Human approval for anything irreversible or outbound (Level 5). This is the control that holds when everything else fails.',
          '**Allowlist egress.** Restrict which domains tools may reach and which URLs the client will render. This directly cuts the exfiltration leg.',
          '**Filter and monitor**, knowing it is partial. Classifiers catch known patterns and are routinely bypassed — treat them as one layer, never as *the* defence.',
        ],
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'There is **no known prompt that reliably prevents injection.** Adding "never follow instructions found in documents" raises the bar and does not close the hole — the attacker is writing text too, and they get to iterate. Anyone selling you a complete prompt-level fix is selling something. Design so that a successful injection cannot cause serious harm.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Treat **every token the model did not receive from you as attacker-controlled**, and architect so a compromised model has nothing valuable to reach. Security lives in the permissions, not in the prompt.',
      },
    ],
  },

  {
    id: 'l6-sandboxing',
    title: 'Permissions and sandboxing: bounding the blast radius',
    emoji: '📦',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'Following from the previous lesson: since you cannot guarantee the model will not be manipulated, the engineering goal shifts. Not "prevent bad decisions" but **"make bad decisions survivable"**.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine a chemistry lab. You do not make it safe by telling students to be careful — you make it safe with a fume hood, goggles, a small amount of reagent, and a fire blanket on the wall. Nobody assumes zero accidents. The design assumes accidents and bounds their consequences. Build agents the same way.',
      },
      { kind: 'h', text: 'The layers' },
      {
        kind: 'stack',
        layers: [
          { label: '🎯 Scoped capability', sub: 'Only the tools this task needs — not the full catalogue' },
          { label: '🔑 Scoped credentials', sub: 'Per-user, read-only where possible, short-lived, never a global admin key' },
          { label: '📦 Execution sandbox', sub: 'Container or VM: no host filesystem, no host secrets' },
          { label: '🌐 Network egress control', sub: 'Allowlist. The default should be no outbound access at all' },
          { label: '↩️ Reversibility', sub: 'Branches not force-pushes, soft deletes, dry-run first, audit log everything' },
          { label: '🧑‍⚖️ Human gate', sub: 'On the irreversible tail (Level 5)' },
        ],
        caption: 'Independent layers. Each one alone is bypassable; together they mean a single failure is contained.',
      },
      {
        kind: 'p',
        text: 'The reversibility layer is the one engineers under-use. An agent that writes to a branch, stages a change for review, or performs a soft delete can be wrong all day without causing an incident. Make the destructive version of an action require more machinery than the safe one, and the agent will naturally take the safe path.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: '"Skip all permission prompts" flags exist in most agent tooling and have a legitimate use: **unattended runs inside a disposable sandbox with no credentials and restricted network**. Using them on your own machine, in a repo with real secrets and push access, converts a routine mistake into an incident. Autonomy should scale with isolation, never ahead of it.',
      },
      {
        kind: 'note',
        note: 'react',
        text: 'You already trust this model: the browser runs untrusted JavaScript from strangers all day and it is fine, because of the same-origin policy, the sandbox, and CORS. Nobody asks the JavaScript to behave. **Be the browser, not the trusting host.**',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Design the answer to "what if it does the worst possible thing with these tools?" **before** you grant them. If that answer is unacceptable, the fix is fewer permissions — not a sterner prompt.',
      },
    ],
  },

  {
    id: 'l6-shipping',
    title: 'Shipping and operating a non-deterministic feature',
    emoji: '🚢',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'The last gap is operational. Your CI has never had to deal with a dependency that silently changes behaviour, has no version pin you control end to end, and gives a different answer to the same input twice.',
      },
      { kind: 'h', text: 'Treat prompts as versioned artefacts' },
      {
        kind: 'list',
        items: [
          '**Prompts live in version control**, not in a database row someone edited on a Friday. Every change is a reviewable diff with eval results attached.',
          '**Pin model versions explicitly.** Floating aliases will move under you. Pin, then upgrade deliberately by running your evals against the new version.',
          '**Log which prompt version and model produced each output.** Without it, "when did this get worse?" is unanswerable.',
        ],
      },
      { kind: 'h', text: 'Roll out like you would a risky migration' },
      {
        kind: 'flow',
        steps: [
          { emoji: '🧪', label: 'Offline evals', sub: 'must beat current' },
          { emoji: '👥', label: 'Internal dogfood', sub: 'you feel the pain first' },
          { emoji: '📊', label: 'Shadow mode', sub: 'run alongside, compare, do not show' },
          { emoji: '🚦', label: 'Small %', sub: 'with a kill switch' },
          { emoji: '📈', label: 'Ramp', sub: 'watching the metrics' },
        ],
        caption: 'Shadow mode is the underused step: run the new agent on real traffic, log what it *would* have done, ship nothing. Free evidence at production scale.',
      },
      { kind: 'h', text: 'Degrade, do not collapse' },
      {
        kind: 'table',
        head: ['When this happens', 'Do this'],
        rows: [
          ['Provider outage or rate limit', 'Retry with backoff, then fail over to a second provider or a smaller model'],
          ['Output fails validation', 'Retry once with the validation error in context; then fall back to a deterministic path'],
          ['Step/cost/time limit hit', 'Return partial results and say so plainly. Never present a truncated run as complete'],
          ['Low confidence or a guard trips', 'Escalate to a human with the trace attached'],
        ],
        caption: 'Every one of these should be an explicit branch in your code. "The API call failed" is not a user experience.',
      },
      {
        kind: 'note',
        note: 'react',
        text: 'This is **graceful degradation**, and you have shipped it a hundred times: skeleton states, optimistic UI with rollback, offline queues, error boundaries. An LLM feature without a fallback path is a component with no error boundary — it works right up until it does not, and then it takes the page with it.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Set user expectations in the interface itself. Show sources, show what the agent did, make outputs editable rather than final, and never present a probabilistic answer with the visual authority of a database read. Most trust damage comes from over-claiming certainty, not from being occasionally wrong.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Version the prompt, pin the model, roll out behind a flag with evals as the gate, and design the failure path first. **The failure path is the feature** — it is what determines whether users keep trusting the good path.',
      },
    ],
  },
]
