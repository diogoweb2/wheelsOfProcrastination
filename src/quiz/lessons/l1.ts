// LEVEL 1 — What a model actually is.
// Goal: after this level nothing an LLM does should feel like magic or like a
// bug. Every weird behaviour (forgetting, making things up, different answers
// to the same question) traces back to one of these seven lessons.
import type { QuizLesson } from '../../types'

export const L1_LESSONS: QuizLesson[] = [
  {
    id: 'l1-next-token',
    title: 'It only ever predicts the next token',
    emoji: '🎲',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'A large language model has exactly one skill: given a pile of text, guess what comes next. That is the whole trick. Everything else — writing code, answering questions, calling tools, "reasoning" — is that one skill applied over and over.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine the world’s most over-read autocomplete. You type "The capital of France is" and it does not *look up* Paris. It has read so much text that, in the shape of language it absorbed, the token after that phrase is overwhelmingly "Paris". It answers correctly for the same reason your phone keyboard suggests "you" after "thank".',
      },
      {
        kind: 'p',
        text: 'The model does not output a word. It outputs a **probability for every token it knows** — often 100k+ options — and then a sampler picks one. That token is glued onto the end of the text, and the whole thing runs again.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '📄', label: 'Text so far', sub: '"The capital of France is"' },
          { emoji: '🧮', label: 'Model', sub: 'one forward pass' },
          { emoji: '📊', label: 'Probabilities', sub: 'Paris 91% · the 4% · a 1%…' },
          { emoji: '🎲', label: 'Sampler picks', sub: '"Paris"' },
        ],
        loop: 'append the token to the text and run the whole thing again — once per token',
        caption: 'This loop is why answers stream in word by word: each one is a separate pass through the model.',
      },
      { kind: 'h', text: 'Why this explains almost everything' },
      {
        kind: 'table',
        head: ['Behaviour that annoys you', 'Because it only predicts the next token'],
        rows: [
          ['It invents a library function that does not exist', 'A plausible-looking name has high probability. Plausible ≠ real. It has no "does this exist?" check.'],
          ['Long answers cost more and take longer', 'Cost and time scale with tokens, because each token is a full pass.'],
          ['"Think step by step" genuinely improves answers', 'Reasoning tokens are text too. Writing the steps puts them in the input for the *next* token, so later tokens are conditioned on the work.'],
          ['It agrees with you when you push back', 'Text where someone concedes after pushback is extremely common. It is predicting a conversation, not defending a fact.'],
        ],
      },
      {
        kind: 'note',
        note: 'react',
        text: 'Think of it as a **pure function**: `nextToken(allTextSoFar) → probabilities`. Same input, same probabilities — genuinely deterministic. No `useState`, no instance, no hidden `this`. The randomness you see lives in the sampler that consumes the output, not in the model. Everything that feels stateful is state you passed in as an argument.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'The model has no goals, no memory and no beliefs. It has a text-shaped reflex. Every technique in the next five levels is really about **controlling the text you hand it**, because that is the only lever that exists.',
      },
    ],
  },

  {
    id: 'l1-tokens',
    title: 'Tokens: the unit of everything',
    emoji: '🪙',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'Models do not see characters or words. Text gets chopped into **tokens** — frequent chunks that the tokenizer learned from data. Common words are one token; rare words split into pieces.',
      },
      {
        kind: 'code',
        code: '"The cat sat"      →  ["The", " cat", " sat"]              3 tokens\n"antidisestablish" →  ["anti", "dis", "establish"]          3 tokens\n"getUserById"      →  ["get", "User", "By", "Id"]           4 tokens\n"🍇"               →  often 2–4 tokens on its own',
        caption: 'Note the leading spaces — " cat" and "cat" are different tokens.',
      },
      {
        kind: 'p',
        text: 'The rough English rule of thumb: **1 token ≈ 4 characters ≈ ¾ of a word**. So ~750 words ≈ 1,000 tokens. Code is denser — braces, indentation, long camelCase identifiers all burn tokens — so a file of code costs noticeably more tokens per line than prose. Non-English text often costs 2–3× more than the same meaning in English.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine you are paying to send a telegram, and you are charged per chunk of the message — both to send it *and* to receive the reply. Now imagine that on every single reply you must re-send the entire conversation so far. That is exactly the billing model. This is why a 40-turn chat is expensive at the end and cheap at the start.',
      },
      { kind: 'h', text: 'Why you should care as an engineer' },
      {
        kind: 'list',
        items: [
          'Tokens are the unit of **price**. Input and output tokens are billed separately, and output is usually several times more expensive per token.',
          'Tokens are the unit of **speed**. Time-to-last-token scales with output length. Want a faster feature? Ask for a shorter answer.',
          'Tokens are the unit of **limits**. Context windows, rate limits and max-output settings are all counted in tokens.',
          'Tokens explain classic failures: a model is bad at counting letters in a word because it never sees letters — it sees chunks. "How many r’s in strawberry" is hard for the same reason reading a book through a shredder is hard.',
        ],
      },
      {
        kind: 'note',
        note: 'key',
        text: 'When something is slow, expensive or truncated, your first diagnostic question is always **"how many tokens is this, and which of them did I actually need?"**',
      },
    ],
  },

  {
    id: 'l1-context-window',
    title: 'The context window is the whole world',
    emoji: '🪟',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'The **context window** is the maximum number of tokens the model can look at in one pass — input and output together. It is the model’s entire universe for that request. Anything not in the window does not exist.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine a brilliant contractor with total amnesia, working in a room with one whiteboard. Whatever is on the board, they can use. Wipe the board and they know nothing about your project — not because they got worse, but because the board *was* the project. Your job as an agent engineer is deciding what goes on that whiteboard.',
      },
      {
        kind: 'bars',
        items: [
          { label: 'System prompt', pct: 8, note: '~8k' },
          { label: 'Tool definitions', pct: 12, note: '~12k' },
          { label: 'Retrieved docs / files', pct: 45, note: '~45k' },
          { label: 'Conversation so far', pct: 25, note: '~25k' },
          { label: 'Room left to answer', pct: 10, note: '~10k' },
        ],
        caption: 'A realistic 100k-token budget mid-task. The answer competes for space with everything else — and "retrieved docs" is almost always the part that is bloated.',
      },
      { kind: 'h', text: 'Bigger windows did not end the problem' },
      {
        kind: 'p',
        text: 'Windows grew from 4k to hundreds of thousands of tokens, and a tempting conclusion is "just dump everything in". Two things stop you.',
      },
      {
        kind: 'compare',
        left: {
          title: 'What people assume',
          emoji: '🌈',
          tone: 'bad',
          items: [
            'Attention is uniform across the window',
            'More context = more accuracy',
            'Cost is the only downside',
          ],
        },
        right: {
          title: 'What actually happens',
          emoji: '🧪',
          tone: 'good',
          items: [
            'Accuracy sags for facts buried in the **middle** — the "lost in the middle" effect',
            'Irrelevant text is an active distractor: it pulls the answer off-target',
            'Cost and latency grow with every token, on every turn',
          ],
        },
        caption: 'The practical name for this is **context rot**: quality degrades as you stuff the window, even below the hard limit.',
      },
      {
        kind: 'note',
        note: 'react',
        text: 'Treat context like **props**, not like a global store. You would not pass your entire Redux state into a leaf component "just in case" — you pass the three fields it renders. Same discipline: pass the smallest slice that makes the answer correct. Level 4 is entirely about how to choose that slice.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'The window is a **budget you allocate**, not a bucket you fill. "It fits" is not the goal; "every token in here earns its place" is.',
      },
    ],
  },

  {
    id: 'l1-stateless',
    title: 'The model is stateless — the chat is an illusion',
    emoji: '🔁',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'This is the single most useful mental correction for a frontend developer. A chat API has **no session, no memory, no connection to your last call**. Every request is completely independent.',
      },
      {
        kind: 'p',
        text: 'What actually happens when you send turn 5 of a conversation: your client re-sends turns 1 through 4, plus the new message, as one flat array. The model reads that array cold, produces one answer, and forgets everything.',
      },
      {
        kind: 'code',
        code: '// Turn 1 — you send:\n[ system, user("hi") ]\n\n// Turn 2 — you send the WHOLE thing again:\n[ system, user("hi"), assistant("Hello!"), user("what did I just say?") ]\n\n// Turn 3 — again, bigger:\n[ system, user("hi"), assistant("Hello!"), user("what did I just say?"),\n  assistant("You said hi."), user("and before that?") ]',
        caption: 'The "conversation" is a client-side array you keep appending to. The server holds nothing.',
      },
      {
        kind: 'note',
        note: 'react',
        text: 'The model is a **pure render function**; the message array is your state, and it lives in *your* app. `render(messages) → nextMessage`. If you want memory, you build it — a database, a summary, a scratchpad file — and you render it into the array on the next call. Nobody does that for you.',
      },
      { kind: 'h', text: 'Three consequences you will hit this week' },
      {
        kind: 'list',
        ordered: true,
        items: [
          '**Cost grows quadratically-ish over a long chat.** Turn N re-sends everything from turns 1..N-1. Long sessions get expensive not because the last question is hard, but because you keep re-uploading history.',
          '**"It forgot my instruction" is usually your bug.** Either the instruction fell out of the array during trimming/summarising, or it was buried 200 messages back. The model did not lose it; your array did.',
          '**Prompt caching exists precisely because of this.** Since the beginning of the array is byte-identical each turn, providers let you cache that prefix and re-charge it at a fraction of the price. It only works if the prefix is *stable* — so put the volatile stuff (the user’s new message) at the **end**, never at the top.',
        ],
      },
      {
        kind: 'note',
        note: 'key',
        text: 'There is no conversation. There is an array you own, re-sent in full, every single turn. Design your app around that fact and the whole field gets simpler.',
      },
    ],
  },

  {
    id: 'l1-sampling',
    title: 'Temperature: why the same prompt gives different answers',
    emoji: '🌡️',
    minutes: 3,
    blocks: [
      {
        kind: 'p',
        text: 'The model hands you a probability distribution over the next token. The **sampler** turns that into an actual choice, and its settings decide how adventurous that choice is.',
      },
      {
        kind: 'compare',
        left: {
          title: 'Low temperature (0 – 0.3)',
          emoji: '🧊',
          tone: 'good',
          items: [
            'Almost always picks the top token',
            'Repeatable, predictable, boring — which is what you usually want',
            'Use for: classification, extraction, JSON output, code edits, routing',
          ],
        },
        right: {
          title: 'High temperature (0.8 – 1.2)',
          emoji: '🔥',
          tone: 'neutral',
          items: [
            'Flattens the distribution, so unlikely tokens get a real chance',
            'More varied, more surprising, more prone to nonsense',
            'Use for: brainstorming, names, copy variants, generating diverse test cases',
          ],
        },
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine ordering at a restaurant you visit weekly. Temperature 0 is "the usual, please" — same dish every time. Temperature 1 is "surprise me" — sometimes delightful, sometimes you get the eel. Neither is better; they are answers to different questions.',
      },
      {
        kind: 'p',
        text: 'You will also meet **top-p** (nucleus sampling: only consider the smallest set of tokens whose probabilities add up to p) and **top-k** (only consider the k most likely). They are different knobs on the same idea — shrink the pool before rolling the dice. Convention is to tune one of temperature or top-p, not both at once.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Temperature 0 gives you *more* determinism, not *guaranteed* determinism. Floating-point non-associativity on GPUs, batching, mixture-of-experts routing and silent model updates all mean identical inputs can still produce different outputs. **Never build a system whose correctness depends on byte-identical LLM responses.** Build one that validates whatever comes back.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Turn temperature *down* for anything a program will parse; turn it *up* only when variety is the actual product. And still validate the output either way.',
      },
    ],
  },

  {
    id: 'l1-embeddings',
    title: 'Embeddings: meaning as coordinates',
    emoji: '📍',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'An **embedding model** is a different beast from a chat model. You give it a piece of text; it gives you a fixed-length list of numbers — a vector, typically a few hundred to a few thousand dimensions. That vector is a position in "meaning space".',
      },
      {
        kind: 'code',
        code: 'embed("how do I reset my password")\n  → [0.021, -0.148, 0.093, ... ]   // e.g. 1536 numbers\n\nembed("I forgot my login")\n  → [0.019, -0.151, 0.088, ... ]   // lands very close by\n\nembed("banana bread recipe")\n  → [-0.402, 0.771, -0.010, ... ]  // lands far away',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine a vast library where books are shelved by *meaning* instead of by title. Every book about forgotten passwords ends up on the same shelf, whether it says "password", "credentials", "can’t log in", or "locked out". You no longer search for words — you walk to a location and grab the neighbours.',
      },
      { kind: 'h', text: 'Similarity is just geometry' },
      {
        kind: 'p',
        text: 'Because meaning is now coordinates, "are these two things related?" becomes "how close are these two points?". The standard measure is **cosine similarity**: the angle between the vectors, from 1.0 (identical direction) down through 0 (unrelated) to −1 (opposite). Direction carries the meaning; length mostly does not.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '📝', label: 'Your docs', sub: 'chunked into pieces' },
          { emoji: '📍', label: 'Embed each', sub: 'text → vector' },
          { emoji: '🗄️', label: 'Vector index', sub: 'stored for fast search' },
          { emoji: '❓', label: 'Embed the query', sub: 'same model!' },
          { emoji: '🎯', label: 'Nearest neighbours', sub: 'top-k chunks back' },
        ],
        caption: 'The retrieval half of RAG, end to end. Level 4 builds this properly — including where it goes wrong.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Query and documents **must** be embedded with the same model. Vectors from different models are not comparable — different spaces, sometimes different dimensions. Changing your embedding model means re-embedding your entire corpus. Plan for that migration before you pick one.',
      },
      {
        kind: 'note',
        note: 'react',
        text: 'You have already used this shape without the vocabulary: it is a **search index you build ahead of time**, like a memoised lookup table. Embedding a million documents is your build step; querying is the cheap runtime path.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Chat models *generate*. Embedding models *locate*. Agents need both: embeddings to find the right 5% of your data, chat models to do something with it.',
      },
    ],
  },

  {
    id: 'l1-hallucination',
    title: 'Hallucination is the feature working as designed',
    emoji: '🌀',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'When a model confidently states something false, people call it a hallucination and treat it as a defect. It is better understood as the same machinery that makes the model useful, running where it has nothing solid to lean on.',
      },
      {
        kind: 'p',
        text: 'The model always produces the most plausible continuation. When it has seen the answer a thousand times, plausible and true coincide. When it has not, plausible is all that is left — and plausible-sounding text is exactly what it is best in the world at producing.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine an improv actor playing a doctor. Ask about a common illness and the script they absorbed is accurate. Ask about an obscure drug interaction and they will not break character to say "I don’t know" — improv has no such move. They will say something that *sounds* exactly like what a doctor would say. The confidence is a property of the performance, not of the knowledge.',
      },
      { kind: 'h', text: 'Where it will bite you' },
      {
        kind: 'table',
        head: ['Situation', 'Typical fabrication', 'Defence'],
        rows: [
          ['Niche or new library', 'A method name that *should* exist', 'Give it the real docs/types in context; run the code'],
          ['Specific numbers, dates, citations', 'Confident, precisely-formatted, wrong', 'Retrieve the source; require quoted evidence'],
          ['Anything after the training cutoff', 'Answers about a world it never saw', 'Tools + retrieval; state today’s date in the prompt'],
          ['Your internal systems', 'A very reasonable-sounding fiction about your codebase', 'It cannot know. Retrieve or let it read the files.'],
        ],
      },
      {
        kind: 'p',
        text: 'Note the pattern in that last column. You do not fix hallucination by asking the model to try harder or by adding "do not hallucinate" to the prompt. You fix it **structurally**: put the truth in the context window, give it tools to check reality, and verify the output with something that is not a language model.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Confidence carries no information about correctness. There is no tone-of-voice signal to listen for. A model’s "I am certain" and its "I am guessing" are both just text, and it produces the certain-sounding version by default because most of its training text is written by people who knew what they were talking about.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Design the assumption in: **the model will occasionally be fluently wrong.** Systems that survive contact with users are the ones with a verification step that does not rely on the model’s own judgement.',
      },
    ],
  },
]
