// LEVEL 3 — Tools and the agent loop.
// The level where "calling an LLM" becomes "building an agent". Everything here
// is provider-independent: the loop is the same shape everywhere, only the
// field names on the wire change.
import type { QuizLesson } from '../../types'

export const L3_LESSONS: QuizLesson[] = [
  {
    id: 'l3-what-is-an-agent',
    title: 'What actually makes something an agent',
    emoji: '🤖',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'The word "agent" is used for everything from a chatbot to a CI pipeline, which makes it useless unless you pin it down. The useful definition is about **who decides the control flow**.',
      },
      {
        kind: 'compare',
        left: {
          title: 'Workflow',
          emoji: '🚂',
          tone: 'neutral',
          items: [
            'You wrote the steps in code',
            'The LLM fills in slots along a path you fixed',
            'Predictable cost, latency and failure modes',
            'Debuggable with a stack trace',
          ],
        },
        right: {
          title: 'Agent',
          emoji: '🧭',
          tone: 'neutral',
          items: [
            'The model chooses what to do next',
            'It picks tools, order and when to stop',
            'Cost and latency are unbounded until you bound them',
            'Debuggable only with traces',
          ],
        },
        caption: 'Neither is better. An agent is what you reach for when you genuinely cannot enumerate the steps in advance.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine two ways to get dinner. A **workflow** is a recipe: chop, sauté, simmer, serve — fixed steps, and you know when you will eat. An **agent** is sending a capable friend to the market with a budget and "make us something good with what looks fresh". More adaptive, more expensive, occasionally comes home with an eel.',
      },
      { kind: 'h', text: 'The three ingredients' },
      {
        kind: 'stack',
        layers: [
          { label: '🧠 A model that decides', sub: 'given the state, what is the next action?' },
          { label: '🔧 Tools that act', sub: 'functions that touch the real world and report back' },
          { label: '🔁 A loop that persists', sub: 'keep going until the goal is met or a limit trips' },
        ],
        caption: 'Remove any one and it is not an agent. A model with tools but no loop is one function call. A loop with no tools is a monologue.',
      },
      {
        kind: 'note',
        note: 'react',
        text: 'The loop is a **reducer**. State is the message array; the model emits an action; running the tool produces the next state. `state = reduce(state, action)` until a terminal condition. You have built this exact machine before — the surprise is only that the action creator is a probabilistic language model.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'The industry’s most repeated piece of advice: **start with the simplest thing that works.** A single well-prompted call beats a chain; a chain beats an agent; an agent beats a multi-agent system. Autonomy is not a feature you add for its own sake — every step you hand to the model is a step you can no longer predict, price or test.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Agent = model + tools + loop, where **the model owns the control flow**. If you can draw the flowchart in advance, you want a workflow, and you will sleep better.',
      },
    ],
  },

  {
    id: 'l3-tool-calling',
    title: 'How tool calling actually works on the wire',
    emoji: '🔌',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'The biggest misconception about tool calling: **the model never runs anything**. It cannot make an HTTP request, read a file or query your database. All it can do is emit text — so the protocol is built around it emitting a structured *request*, which your code fulfils.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '📜', label: '1. You send', sub: 'messages + tool schemas' },
          { emoji: '🤔', label: '2. Model replies', sub: '"call get_weather({city:\'Lisbon\'})"' },
          { emoji: '⚙️', label: '3. YOUR code runs it', sub: 'the actual API call' },
          { emoji: '📨', label: '4. You send result back', sub: 'as a tool message' },
          { emoji: '💬', label: '5. Model continues', sub: 'answers, or calls another tool' },
        ],
        loop: 'steps 2–4 repeat until the model stops asking for tools',
        caption: 'Step 3 is entirely yours: your process, your credentials, your permission checks, your error handling.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine a brilliant analyst locked in a room with no phone and no internet. They can slide notes under the door: "Please look up yesterday’s revenue for the EU region." Someone outside does it and slides the answer back. The analyst is doing all the thinking and none of the doing. **You are the person outside the door** — and that is precisely where you put every safety check.',
      },
      { kind: 'h', text: 'What a tool definition looks like' },
      {
        kind: 'code',
        code: '{\n  "name": "search_orders",\n  "description": "Find orders for a customer. Use when the user asks about\\n                  order status, refunds or delivery. Returns at most 20,\\n                  newest first. Does NOT cancel or modify anything.",\n  "parameters": {\n    "type": "object",\n    "properties": {\n      "customer_id": { "type": "string", "description": "Internal id, e.g. cus_8f2a" },\n      "status": { "enum": ["any", "pending", "shipped", "refunded"], "default": "any" }\n    },\n    "required": ["customer_id"]\n  }\n}',
        caption: 'A name, a description, and a JSON Schema for the arguments. Every provider uses this shape; only the envelope differs.',
      },
      {
        kind: 'p',
        text: 'That description is **not documentation for humans** — it is the prompt the model reads when deciding whether to reach for this tool. It is the single highest-leverage text in your agent, and most people write it in four words and then wonder why the wrong tool keeps firing.',
      },
      { kind: 'h', text: 'Details that will trip you' },
      {
        kind: 'list',
        items: [
          '**Tool schemas cost tokens on every single turn.** Thirty tools with verbose descriptions can eat tens of thousands of tokens before the user has said hello.',
          '**Parallel calls are normal.** A model can request several tools in one turn. Run independent ones concurrently — it is often the biggest latency win available.',
          '**Every request needs its result.** Leaving a tool call unanswered in the message array is a protocol error on most APIs, so return something even on failure.',
          '**The model can hallucinate arguments.** It will invent a plausible `customer_id` if it does not have one. Validate arguments before executing, exactly as you would validate a request body.',
        ],
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Tool calling is **structured output with a convention on top**. The model asks; your code decides whether to obey. Never let that distinction blur — it is the entire basis of agent security.',
      },
    ],
  },

  {
    id: 'l3-tool-design',
    title: 'Designing tools an agent can actually use',
    emoji: '🛠️',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'Most "the agent is dumb" bugs are really tool design bugs. The model is reading your tool names, descriptions and error strings and making a judgement call. Bad tools produce bad judgement, reliably.',
      },
      { kind: 'h', text: 'Write for the reader, and the reader is the model' },
      {
        kind: 'compare',
        left: {
          title: 'Tools that cause chaos',
          emoji: '💥',
          tone: 'bad',
          items: [
            '`doStuff`, `query`, `api_call` — meaningless names',
            'One mega-tool with a `mode` parameter and 14 branches',
            'Description: "Searches things."',
            'Returns 4,000 rows of raw JSON',
            'On failure: `Error: null`',
            'Overlapping tools with no stated difference',
          ],
        },
        right: {
          title: 'Tools that behave',
          emoji: '✨',
          tone: 'good',
          items: [
            '`search_orders`, `cancel_order` — verb + noun',
            'One job per tool, small argument surface',
            'Description states **when to use it and when not to**',
            'Returns the 10 fields that matter, paginated',
            'On failure: "No customer with id cus_9. Try search_customers first."',
            'Descriptions that explicitly disambiguate the neighbours',
          ],
        },
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine onboarding a sharp contractor who will never attend a meeting, never see your wiki, and never ask a clarifying question. All they get is the list of function signatures. Would they pick the right one? That thought experiment *is* tool design.',
      },
      { kind: 'h', text: 'Errors are prompts, not exceptions' },
      {
        kind: 'p',
        text: 'When a tool fails, the error text goes straight into the model’s context and becomes its next instruction. This is a superpower most people waste. A stack trace teaches it nothing; a sentence describing the recovery path fixes the run.',
      },
      {
        kind: 'code',
        code: '// ❌ dead end\n{ "error": "ValidationError: invalid input" }\n\n// ✅ a recoverable instruction\n{ "error": "date_from must be YYYY-MM-DD; you sent \'last tuesday\'.",\n  "hint": "Call get_current_date first, then pass an absolute date." }',
        caption: 'Write error messages as if talking to the agent — because you are.',
      },
      { kind: 'h', text: 'Granularity' },
      {
        kind: 'p',
        text: 'Too fine-grained and the agent burns ten turns assembling a result — every turn costing a full round trip and a re-send of the whole context. Too coarse and it cannot express what it needs. The heuristic: **one tool per meaningful unit of work a human would name.** `get_user_orders` is a unit of work; `open_db_connection` is not.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Return values are context. A tool that dumps a 50k-token payload has just poisoned the window for every subsequent turn — the agent will hit context rot, then limits, then start forgetting the goal. Truncate, paginate, summarise, and return a handle (an id, a file path) instead of the whole object when you can.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Design tools like a **public API for a competent stranger with no support channel**: obvious names, one job each, honest descriptions of when *not* to use them, and errors that say what to do next.',
      },
    ],
  },

  {
    id: 'l3-loop-control',
    title: 'Controlling the loop before it controls your invoice',
    emoji: '🛑',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'An agent loop has no natural end. It runs until the model decides to stop — and the model is not tracking your budget, your deadline or the fact that it has called the same tool nine times. Termination is **your** responsibility, and it is the difference between a demo and a system.',
      },
      {
        kind: 'code',
        code: 'let steps = 0, spent = 0\nwhile (true) {\n  if (++steps > MAX_STEPS)      return bail("step limit")\n  if (spent  > MAX_COST)        return bail("budget")\n  if (Date.now() > deadline)    return bail("timeout")\n\n  const res = await model(messages, tools)\n  spent += res.usage.cost\n\n  if (!res.toolCalls?.length) return res.text     // ← the normal exit\n\n  const results = await Promise.all(res.toolCalls.map(runTool))\n  messages.push(res.message, ...results)\n}',
        caption: 'The whole agent, honestly. Everything else in this level is detail hung off these fifteen lines.',
      },
      { kind: 'h', text: 'The four ways a run should be able to end' },
      {
        kind: 'table',
        head: ['Exit', 'Trigger', 'What to do'],
        rows: [
          ['**Success**', 'Model answers with no tool call', 'Return it. Validate it first if it feeds code.'],
          ['**Step limit**', 'N iterations reached', 'Stop and report partial progress — do not silently return nothing.'],
          ['**Budget / time**', 'Cost or wall-clock ceiling', 'Hard stop. Both limits should exist in every production agent.'],
          ['**Escalation**', 'Model asks for help, or a guard trips', 'Hand to a human with the trace attached.'],
        ],
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine giving that capable friend your credit card and saying "get dinner sorted". No spending limit, no time limit, no "call me if it goes over". Most nights: fine. One night you are funding an artisanal saffron expedition. The limits are not distrust — they are what makes delegation sane.',
      },
      { kind: 'h', text: 'Loop pathologies you will actually see' },
      {
        kind: 'list',
        items: [
          '**The retry spiral.** A tool fails, the model retries with identical arguments, forever. Detect repeated identical calls and inject a message saying so: "You have called this three times with the same arguments and it failed each time. Try a different approach or stop."',
          '**The confidence stall.** The agent keeps gathering information and never commits. Cap the research phase, or require an answer by step N.',
          '**Context exhaustion.** Tool results pile up until the window is full and the goal has scrolled out of view. Summarise or drop old tool output — see Level 4.',
          '**Silent partial success.** It did 4 of 6 subtasks and reported "done". Ask for an explicit checklist against the original request before it is allowed to finish.',
        ],
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Never ship a loop without a **step cap, a cost cap and a wall-clock cap**. And when a cap trips, return the partial work plus the reason — "hit the step limit after 12 tools" is debuggable; a blank response is not.',
      },
    ],
  },

  {
    id: 'l3-react',
    title: 'ReAct: reason, act, observe',
    emoji: '🔄',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: '**ReAct** ("Reasoning + Acting") is the pattern underneath essentially every agent you will meet. It interleaves thinking with doing, so each action is informed by what the last one actually returned rather than by a plan made in the dark.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '💭', label: 'Thought', sub: '"I need the user’s plan first"' },
          { emoji: '🎬', label: 'Action', sub: 'get_subscription(u_12)' },
          { emoji: '👀', label: 'Observation', sub: '{"plan":"free","seats":1}' },
        ],
        loop: 'thought → action → observation, until the thought is "I can answer now"',
        caption: 'The observation is the point. A plan written before any observation is a guess; a plan revised after each one is a strategy.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine debugging production. You do not write a fourteen-step fix plan before opening the logs. You form a hypothesis, run one command, read the output, and let it change your mind. ReAct is that instinct, formalised — and it beats plan-everything-upfront for exactly the same reason your instinct is right.',
      },
      { kind: 'h', text: 'Plan-first vs react-as-you-go' },
      {
        kind: 'compare',
        left: {
          title: 'Plan-then-execute',
          emoji: '🗺️',
          tone: 'neutral',
          items: [
            'One plan up front, then run it',
            'Cheaper: less back and forth',
            'Reviewable before anything happens',
            'Brittle: step 2 failing invalidates steps 3–9',
          ],
        },
        right: {
          title: 'ReAct',
          emoji: '🧭',
          tone: 'good',
          items: [
            'Decide one step at a time',
            'Adapts to what it finds',
            'Recovers naturally from failures',
            'More turns, more tokens, harder to predict',
          ],
        },
        caption: 'Real systems blend them: a rough plan for direction, ReAct for execution, re-plan when reality disagrees.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'ReAct’s weak point is **long horizons**. Twenty steps in, the early observations are still sitting in context taking up space, the original goal is far away, and small drifts compound. This is why Level 4 (context management) and Level 5 (decomposition into subagents) exist — they are the answer to ReAct’s scaling limit.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Act, then look, then think again. An agent that reads its observations beats an agent with a beautiful plan.',
      },
    ],
  },

  {
    id: 'l3-tool-protocols',
    title: 'Tool protocols: stop writing the same integration twice',
    emoji: '🔗',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'Once you have written tools for three agents, you notice the waste: the same "read from Postgres" tool, reimplemented for each framework, each with its own auth and its own schema dialect. It is the N×M problem — N agents times M systems.',
      },
      {
        kind: 'compare',
        left: {
          title: 'Without a protocol',
          emoji: '🕸️',
          tone: 'bad',
          items: ['Every agent × every system = a bespoke integration', 'Auth and schemas duplicated everywhere', 'Switching framework means rewriting all of it'],
        },
        right: {
          title: 'With a protocol',
          emoji: '🔌',
          tone: 'good',
          items: ['Each system exposes tools once, as a server', 'Any compatible client can consume them', 'Swap the agent, keep the integrations'],
        },
        caption: 'The same argument that produced ODBC, LSP for editors, and OpenAPI for HTTP. Agents just arrived at it later.',
      },
      {
        kind: 'note',
        note: 'react',
        text: 'You lived through this with the **Language Server Protocol**. Before LSP: every editor × every language = its own plugin. After: a language ships one server, every editor gets it free. Agent tool protocols are LSP for capabilities — and the strategic lesson is identical, whichever protocol ends up winning.',
      },
      {
        kind: 'p',
        text: 'The dominant open standard at the moment is the **Model Context Protocol (MCP)**: a client–server spec where servers expose *tools* (things to call), *resources* (things to read) and *prompts* (reusable templates), over stdio for local processes or HTTP for remote ones. There are also emerging agent-to-agent protocols for delegating work between whole agents rather than to functions.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Connecting a third-party tool server means running someone else’s tool definitions inside your agent’s context — and those descriptions are instructions the model reads. Treat an untrusted tool server as an untrusted dependency: pin it, review what it exposes, and do not hand it credentials it does not need.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Learn the **shape** (capabilities exposed by servers, consumed by any client), not the current spec version. The shape is what survives; the field will churn through several names for it.',
      },
    ],
  },
]
