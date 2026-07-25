// LEVEL 2 — Talking to models on purpose.
// The jump from "I chat with it" to "I call it from code and the output is
// reliable enough to put in a database".
import type { QuizLesson } from '../../types'

export const L2_LESSONS: QuizLesson[] = [
  {
    id: 'l2-roles',
    title: 'Roles: system, user, assistant, tool',
    emoji: '🎭',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'Every chat API takes a list of messages, and every message has a **role**. The roles are not decoration — they are how the model knows which text is instruction, which is request, which is its own past output, and which is data coming back from the outside world.',
      },
      {
        kind: 'table',
        head: ['Role', 'Who writes it', 'What it is for'],
        rows: [
          ['`system`', 'You, the developer', 'Standing rules: persona, constraints, output format, what it may refuse. Highest authority.'],
          ['`user`', 'Your end user (or your code)', 'The actual request, plus the data for this turn.'],
          ['`assistant`', 'The model (you replay it)', 'Its previous replies. Also where tool *requests* appear.'],
          ['`tool`', 'Your code', 'Results you hand back after running a tool the model asked for. (Level 3.)'],
        ],
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine a new contractor on their first day. The **system** message is the employee handbook taped to their monitor — always visible, applies to everything. The **user** message is today’s ticket. Confusing the two is like writing "always use metric units" at the bottom of one ticket and wondering why tomorrow’s ticket is in inches.',
      },
      { kind: 'h', text: 'The rule that matters' },
      {
        kind: 'compare',
        left: {
          title: 'Put in system',
          emoji: '📌',
          tone: 'good',
          items: [
            'Role and tone',
            'Output format contract',
            'Hard constraints and refusals',
            'Anything true for **every** request',
          ],
        },
        right: {
          title: 'Put in user',
          emoji: '📨',
          tone: 'neutral',
          items: [
            'The specific question',
            'The document/code being worked on',
            'Per-request parameters',
            'Anything that changes turn to turn',
          ],
        },
        caption: 'This split is also what makes prompt caching pay off — a stable system prefix can be cached, a volatile one cannot.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Text from your *users* and text from your *documents* must never be pasted into the system message. That is how prompt injection gets promoted to the highest-trust position in the conversation. Untrusted content belongs in a user message, clearly fenced and labelled as data. Level 6 covers the attack in detail.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'System = the contract. User = the job. Keep the contract stable and the job specific, and half of "prompt engineering" disappears.',
      },
    ],
  },

  {
    id: 'l2-prompt-anatomy',
    title: 'Anatomy of a prompt that actually works',
    emoji: '🧩',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'Most bad output comes from underspecified prompts, not from a weak model. The fix is unglamorous: say what you would have to say to a competent new colleague who cannot see your screen, has no access to your team’s conventions, and will not ask a follow-up question.',
      },
      { kind: 'h', text: 'The six parts' },
      {
        kind: 'stack',
        layers: [
          { label: '1. Role & objective', sub: 'Who it is acting as, and what "done" means' },
          { label: '2. Context', sub: 'The data, docs, code and background it needs' },
          { label: '3. Instructions', sub: 'Steps, rules, constraints — positive, not just prohibitions' },
          { label: '4. Examples', sub: 'One to five demonstrations of the exact shape you want' },
          { label: '5. Output format', sub: 'The precise contract: schema, sections, length' },
          { label: '6. The request', sub: 'The specific input for this turn — last, so caching works' },
        ],
        caption: 'Not every prompt needs all six, but when output is wrong, the missing part is almost always #4 or #5.',
      },
      {
        kind: 'compare',
        left: {
          title: 'Vague',
          emoji: '🌫️',
          tone: 'bad',
          items: [
            '"Summarise this feedback."',
            'Model has to guess: how long? for whom? what matters?',
            'You get a different shape every run — unparseable',
          ],
        },
        right: {
          title: 'Specified',
          emoji: '🔬',
          tone: 'good',
          items: [
            '"Summarise this support ticket for an on-call engineer."',
            '"Max 3 bullets. Lead with the affected system."',
            '"If severity is unclear, say `severity: unknown` — do not guess."',
          ],
        },
      },
      { kind: 'h', text: 'Techniques worth knowing by name' },
      {
        kind: 'list',
        items: [
          '**Delimiters.** Fence untrusted or long input in XML-ish tags or triple backticks: `<transcript>…</transcript>`. The model reliably picks up on structure, and it makes "instructions" vs "data" unambiguous.',
          '**Give it an out.** Explicitly permit "I don’t know" / `null`. Without permission to abstain, a model will invent — you have asked a question and it is a question-answering machine.',
          '**Positive instructions beat prohibitions.** "Reply in one paragraph of prose" works better than "do not use bullet points", because the first describes a target and the second only describes a wall.',
          '**Prefill the answer.** Many APIs let you start the `assistant` message for it. Beginning with `{` is a cheap, near-total fix for models that like to preface JSON with "Sure! Here you go:".',
          '**Order matters.** Long documents first, instructions last: the tail of the prompt has outsized influence, and a stable head is cacheable.',
        ],
      },
      {
        kind: 'note',
        note: 'react',
        text: 'A prompt is a **component API**. You are defining props (inputs), a contract (the output type), and defaults (what to do when a prop is missing). You would never ship a component whose return type changes based on mood — do not ship a prompt like that either. And like a component, a prompt is worth extracting, versioning and testing separately from the code that calls it.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Before blaming the model, re-read your prompt and ask: **could a smart stranger produce the exact output I want, from only this text?** If not, that is your bug.',
      },
    ],
  },

  {
    id: 'l2-fewshot',
    title: 'Few-shot: show, don’t tell',
    emoji: '🖼️',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: '**Zero-shot** is instructions only. **Few-shot** is instructions plus a handful of worked examples — input paired with exactly the output you want. For anything with a specific format, tone or edge-case policy, a few examples outperform paragraphs of description.',
      },
      {
        kind: 'code',
        code: 'Classify the intent. Reply with one word.\n\nInput: "my card was declined twice"      → billing\nInput: "how do I change my avatar?"      → account\nInput: "the export button does nothing"  → bug\nInput: "when is the next webinar?"       → other\n\nInput: "charged me but no receipt"       →',
        caption: 'Four examples pin down the label set, the casing, the brevity and the fallback — all without one sentence of explanation.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine teaching someone to make your family’s pancakes. You can write two pages about consistency and heat, or you can stand next to them and make three. The examples encode a hundred details you would never think to write down — and would get wrong if you tried.',
      },
      { kind: 'h', text: 'Rules of thumb' },
      {
        kind: 'list',
        items: [
          '**Cover the edges, not the middle.** Examples of the obvious case teach little. Include the ambiguous one, the empty one, the one where the right answer is "unknown".',
          '**Balance your labels.** Four positive examples then one negative biases the model toward positive. Order and frequency both leak into the output.',
          '**Be consistent to a fault.** If one example ends with a period and another does not, you have just taught it that punctuation is optional. Mismatched examples are worse than none.',
          '**Three to five is usually the sweet spot.** Beyond that, returns fall off fast while token cost keeps climbing.',
          '**Dynamic few-shot scales this.** Instead of fixed examples, retrieve the most similar past examples for each input (using embeddings from Level 1) and inject those.',
        ],
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Your examples are a specification, and the model follows them literally — including your mistakes. If an example contains a typo, a wrong label or a stale field name, expect to see it faithfully reproduced in production. Review examples like you review code.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'When a prompt is not behaving, adding one well-chosen example fixes it more often than adding one more sentence of instruction.',
      },
    ],
  },

  {
    id: 'l2-cot',
    title: 'Chain of thought and "reasoning" models',
    emoji: '🪜',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'A model produces one token per pass, and each pass gets to look at everything generated so far. So if it commits to an answer in the very first token, it has done all its "thinking" in a single pass. Let it write out intermediate steps first, and every later token is conditioned on that work.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '❓', label: 'Question', tone: 'muted' },
          { emoji: '⚡', label: 'Answer immediately', sub: 'one pass to get it right', tone: 'danger' },
        ],
        caption: 'Straight to the answer: no room to work.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '❓', label: 'Question', tone: 'muted' },
          { emoji: '📝', label: 'Step 1', sub: 'now in context' },
          { emoji: '📝', label: 'Step 2', sub: 'sees step 1' },
          { emoji: '✅', label: 'Answer', sub: 'sees all the work' },
        ],
        caption: 'Chain of thought: the scratchpad becomes input for the next token. This is why it works — it is literally more computation.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine being asked a multi-step arithmetic problem and told to shout the answer instantly, versus being handed a napkin. The napkin does not make you smarter. It gives you somewhere to put step one while you do step two.',
      },
      { kind: 'h', text: 'The modern picture' },
      {
        kind: 'p',
        text: 'Two things changed the practical advice here. First, "let’s think step by step" as a magic incantation matters far less than it did — instruction-tuned models already do it when it helps. Second, **reasoning models** now bake the scratchpad in: they generate a long internal chain before the visible answer, and you are billed for those hidden reasoning tokens. You steer them with an *effort* or *budget* dial rather than by begging them to think.',
      },
      {
        kind: 'table',
        head: ['Task', 'Reach for'],
        rows: [
          ['Classification, extraction, formatting, simple lookup', 'A fast model, no reasoning. Steps add cost and latency for nothing.'],
          ['Multi-step logic, planning, debugging, tricky math', 'A reasoning model, or explicit step-by-step. Real accuracy gains.'],
          ['Anything latency-critical and user-facing', 'Reasoning off, or a small budget. Users feel every hidden token.'],
        ],
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'The written reasoning is **not a reliable audit log**. Studies repeatedly show models reaching an answer and then producing a plausible justification that does not reflect what drove it. Read chains of thought for debugging insight; never treat them as proof of how the conclusion was reached, and never show them to users as an explanation you are willing to stand behind.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Thinking tokens buy accuracy with latency and money. Spend them where the task is genuinely multi-step, and switch them off where it is not.',
      },
    ],
  },

  {
    id: 'l2-structured-output',
    title: 'Structured output: JSON your code can trust',
    emoji: '🧾',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'The moment an LLM feeds a program instead of a human, free text becomes a liability. You need a **contract**: a defined schema, and an output that always conforms to it. There is a ladder of techniques, and you should climb to the highest rung your provider supports.',
      },
      {
        kind: 'stack',
        layers: [
          { label: '🥇 Constrained decoding / strict schema mode', sub: 'Provider forbids invalid tokens at generation time. Malformed JSON becomes impossible, not unlikely.' },
          { label: '🥈 Tool/function calling with a schema', sub: 'Define a "tool" whose parameters are your output shape, and let the calling machinery enforce it.' },
          { label: '🥉 Ask for JSON + validate + retry', sub: 'Works anywhere. Parse, validate against the schema, feed errors back on failure.' },
          { label: '💀 Ask for JSON and hope', sub: 'Prose preambles, markdown fences, trailing commas, chatty apologies. This will page you.' },
        ],
      },
      {
        kind: 'note',
        note: 'react',
        text: 'This is exactly the discipline you already apply at a network boundary. You do not trust an API response because the backend team promised a shape — you validate it (Zod, io-ts, a type guard) and handle the failure. **An LLM response is an untrusted network response with a talent for looking correct.** Same boundary, same validation, no exceptions.',
      },
      { kind: 'h', text: 'Writing a schema the model can follow' },
      {
        kind: 'code',
        code: '{\n  "type": "object",\n  "properties": {\n    "severity":  { "enum": ["low", "medium", "high"] },\n    "component": { "type": "string",\n                   "description": "Service name from the list above; \\"unknown\\" if not stated" },\n    "summary":   { "type": "string", "description": "One sentence, max 20 words" }\n  },\n  "required": ["severity", "component", "summary"],\n  "additionalProperties": false\n}',
        caption: 'Field descriptions are prompt real estate — the model reads them. This is where you put the rule, not in a paragraph three screens up.',
      },
      {
        kind: 'list',
        items: [
          '**Enums beat free strings** every time you can enumerate the options. It converts a generation problem into a selection problem.',
          '**Always provide an escape hatch** — `"unknown"`, `null`, an empty array. A schema with no way to express "not present" guarantees fabricated values.',
          '**Flat beats deeply nested.** Reliability drops as nesting grows. Two calls with simple schemas often beat one call with a monster schema.',
          '**Schema conformance is not correctness.** Strict mode guarantees the shape, never the facts. `{"severity": "high"}` is perfectly valid and can still be wrong.',
        ],
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Define the schema first, enforce it at the boundary, and give the model a legal way to say "I don’t know". Structure is what turns a demo into a system.',
      },
    ],
  },

  {
    id: 'l2-evals',
    title: 'Evals: your test suite for non-deterministic code',
    emoji: '📏',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'Here is the trap that catches every team. You tweak a prompt, try it three times, it looks better, you ship. Two weeks later you have made it worse in a way nobody can see, and you have no way to prove it either direction. **Evals are the fix**, and they are the single highest-leverage habit in this entire field.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine refactoring a codebase with no tests, where the compiler only says "seems fine to me" — cheerfully, at random, in a confident tone. That is prompt engineering without evals. Every change is a coin flip you cannot observe.',
      },
      { kind: 'h', text: 'What an eval actually is' },
      {
        kind: 'flow',
        steps: [
          { emoji: '📋', label: 'Dataset', sub: 'inputs + expected' },
          { emoji: '⚙️', label: 'Run', sub: 'your prompt/agent' },
          { emoji: '⚖️', label: 'Grade', sub: 'per case' },
          { emoji: '📈', label: 'Score', sub: 'compare vs last version' },
        ],
        caption: 'A dataset, a runner, a grader, a number you can compare. That is it — there is no sophisticated version of this idea.',
      },
      {
        kind: 'p',
        text: 'Graders come in three flavours, and you should prefer them in this order:',
      },
      {
        kind: 'table',
        head: ['Grader', 'How', 'Use when'],
        rows: [
          ['**Code**', 'Exact match, regex, schema validation, does-it-compile, does-the-test-pass', 'Always, if you possibly can. Free, instant, perfectly reliable.'],
          ['**LLM-as-judge**', 'A second model scores the output against a rubric', 'Open-ended text where there is no single right answer. Needs its own validation against human labels.'],
          ['**Human**', 'You, reading outputs', 'The ground truth that calibrates the other two. Expensive, so spend it on building the dataset.'],
        ],
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'LLM-as-judge has well-documented biases: it favours longer answers, prefers its own family’s style, and is swayed by confident tone. It also cannot be the only check on a system it is part of. Always calibrate a judge against a set of human-labelled examples before trusting its score.',
      },
      { kind: 'h', text: 'How to start on a Tuesday afternoon' },
      {
        kind: 'list',
        ordered: true,
        items: [
          'Open a file. Paste in **20 real inputs** — especially the ones that embarrassed you in production.',
          'Write down the expected output, or just the property that must hold ("mentions the order id", "valid JSON", "does not promise a refund").',
          'Write a 30-line script that runs all 20 and prints a pass count. No framework needed.',
          'Run it before and after **every** prompt change. Now you are doing engineering.',
          'Grow the dataset every time production surprises you. A failing case you added is a regression test forever.',
        ],
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Twenty examples in a file beat zero examples in a framework. Teams that build evals early move faster within a month, because they can finally change things without fear.',
      },
    ],
  },
]
