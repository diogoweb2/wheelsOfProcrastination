// LEVEL 4 — Context engineering & memory.
// Level 1 said the context window is the model's whole world. This level is the
// craft of deciding what goes in it — which is where most real agent quality
// lives, and where most real agent bugs live too.
import type { QuizLesson } from '../../types'

export const L4_LESSONS: QuizLesson[] = [
  {
    id: 'l4-context-engineering',
    title: 'Context engineering: the job prompt engineering became',
    emoji: '🎛️',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: '"Prompt engineering" suggested the work was finding clever wording. In an agent, the wording is maybe 10% of it. The real work is **deciding what information occupies the window at each step** — where it comes from, how it is compressed, and what gets evicted. That discipline is context engineering.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine you are the chief of staff for a very sharp executive with total amnesia. Before every meeting you hand them one folder. Too thin and they make an uninformed call. Too thick and they skim, miss the key page, and run late. Your entire value is choosing what goes in the folder. **That is the job.**',
      },
      { kind: 'h', text: 'The budget' },
      {
        kind: 'p',
        text: 'Treat the window as a fixed budget with competing claimants. Every token spent on a stale tool result is a token not spent on the file that actually matters — and, thanks to context rot, it actively degrades the answer rather than merely wasting money.',
      },
      {
        kind: 'bars',
        items: [
          { label: 'System + tools', pct: 15, note: 'fixed cost' },
          { label: 'Retrieved knowledge', pct: 30, note: 'the folder' },
          { label: 'Working state', pct: 25, note: 'plan, progress' },
          { label: 'Recent turns', pct: 20, note: 'sliding' },
          { label: 'Headroom', pct: 10, note: 'never fill it' },
        ],
        caption: 'A deliberate allocation. Notice the headroom: an agent that runs to the edge of its window fails at the worst possible moment — mid-task, with no room to recover.',
      },
      { kind: 'h', text: 'The four moves' },
      {
        kind: 'table',
        head: ['Move', 'What it means', 'Typical mechanism'],
        rows: [
          ['**Select**', 'Put in only what this step needs', 'Retrieval, filtering, dynamic tool sets'],
          ['**Compress**', 'Same information, fewer tokens', 'Summarisation, truncation, structured extraction'],
          ['**Offload**', 'Keep it outside the window, fetch on demand', 'Files, scratchpads, databases, an id instead of a blob'],
          ['**Isolate**', 'Give a sub-task its own clean window', 'Subagents (Level 5), separate calls'],
        ],
      },
      {
        kind: 'note',
        note: 'react',
        text: 'This is **performance work**, and you already have the instincts. You do not render 10,000 rows — you virtualise. You do not refetch on every keystroke — you debounce and cache. You do not pass the whole store to a leaf — you select. Context engineering is the same set of moves applied to a token budget instead of a frame budget.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'The best agents are not the ones with the biggest context window. They are the ones that put **the smallest sufficient set of tokens** in front of the model at each step.',
      },
    ],
  },

  {
    id: 'l4-rag',
    title: 'RAG: giving the model knowledge it never trained on',
    emoji: '📚',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'A model knows what was in its training data, up to its cutoff, and nothing about your company. **Retrieval-Augmented Generation** is the fix, and it is far less exotic than the acronym suggests: look things up, paste them into the prompt, ask the question.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '❓', label: 'Question', tone: 'muted' },
          { emoji: '🔎', label: 'Retrieve', sub: 'search your corpus' },
          { emoji: '📄', label: 'Augment', sub: 'paste chunks into the prompt' },
          { emoji: '💬', label: 'Generate', sub: 'answer from those chunks' },
        ],
        caption: 'Retrieve, Augment, Generate. The acronym is the pipeline.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine an open-book exam. The model is a bright student who never attended your company’s classes. RAG is walking in, opening the manual to the three relevant pages, and setting it on the desk. The student did not learn anything permanently — they just have the right pages open.',
      },
      { kind: 'h', text: 'The two halves, built at different times' },
      {
        kind: 'compare',
        left: {
          title: 'Indexing (offline, batch)',
          emoji: '🏗️',
          tone: 'neutral',
          items: [
            'Load documents',
            'Split into chunks',
            'Embed each chunk',
            'Store vectors + text + metadata',
            'Re-run when sources change',
          ],
        },
        right: {
          title: 'Querying (online, per request)',
          emoji: '⚡',
          tone: 'neutral',
          items: [
            'Embed the question',
            'Find nearest chunks',
            'Rerank and filter',
            'Build the prompt',
            'Generate with citations',
          ],
        },
      },
      { kind: 'h', text: 'Why RAG rather than fine-tuning' },
      {
        kind: 'table',
        head: ['', 'RAG', 'Fine-tuning'],
        rows: [
          ['Teaches', 'Facts, documents, current state', 'Style, format, behaviour, tone'],
          ['Update cost', 'Re-index one document — minutes', 'Retrain — hours to days'],
          ['Attribution', 'Natural: you know the source chunk', 'None: knowledge is smeared into weights'],
          ['Access control', 'Filter at query time, per user', 'Baked in for everyone'],
          ['Right question', '"Where is the answer written down?"', '"How should it always behave?"'],
        ],
        caption: 'For "the model does not know our internal facts", RAG is almost always the answer. Fine-tuning is for "it knows, but it will not answer the way we need".',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'RAG does not eliminate hallucination — it *reduces* it, and only if the retrieval was good. Retrieve the wrong chunks and the model will confidently answer from the wrong chunks. Always instruct it to answer **only** from the provided context, to cite which chunk, and to say "not in the documents" when it is not. Then check that it obeys.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Nearly every disappointing RAG system is a **retrieval** problem wearing a generation costume. When answers are bad, print the retrieved chunks first — nine times out of ten, the answer was never in there.',
      },
    ],
  },

  {
    id: 'l4-chunking',
    title: 'Chunking: the boring decision that decides your quality',
    emoji: '✂️',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'You cannot embed a 200-page PDF as one vector — you would get a blurry average of everything and match nothing precisely. So you split documents into chunks. How you split them sets the ceiling on everything downstream.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine tearing a cookbook into strips to file in a shoebox. Tear randomly every 300 characters and half your strips read "…until golden. 3. Meanwhile, in a separate" — technically retrievable, completely useless. Tear along recipe boundaries and every strip stands alone. Chunking is choosing where to tear.',
      },
      {
        kind: 'compare',
        left: {
          title: 'Chunks too small',
          emoji: '🔬',
          tone: 'bad',
          items: [
            'A sentence with no context',
            '"He approved it" — who? what?',
            'High precision, no usable meaning',
            'Pronouns and references dangle',
          ],
        },
        right: {
          title: 'Chunks too big',
          emoji: '🐘',
          tone: 'bad',
          items: [
            'One vector averaging five topics',
            'Matches everything weakly, nothing strongly',
            'Wastes context on irrelevant paragraphs',
            'Buries the one relevant line',
          ],
        },
      },
      { kind: 'h', text: 'Strategies, roughly in order of how good they are' },
      {
        kind: 'table',
        head: ['Strategy', 'How', 'When'],
        rows: [
          ['Fixed size', 'Every N tokens, with ~10–20% overlap', 'Baseline. Overlap stops ideas being guillotined at the boundary.'],
          ['Recursive', 'Split on paragraphs, then sentences, then words, until it fits', 'Good default for prose. Respects natural boundaries.'],
          ['Structural', 'Split on markdown headings, code functions, HTML sections', 'Best when the document already has structure — which most do.'],
          ['Semantic', 'Split where the topic shifts, detected by embedding distance', 'Highest quality, most expensive to build.'],
        ],
      },
      { kind: 'h', text: 'The two tricks that matter more than the strategy' },
      {
        kind: 'list',
        items: [
          '**Keep metadata with every chunk.** Source document, section title, page, date, author, permissions. It powers filtering ("only 2026 docs", "only what this user may see"), citations, and the header you prepend so a chunk knows what it belongs to.',
          '**Decouple what you search from what you send.** Embed a small, sharp chunk for matching, then feed the model the *surrounding* section — the "small-to-big" or parent-document pattern. You get precise retrieval and complete context, instead of trading one for the other.',
        ],
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Chunking is the step everyone skips past on the way to picking a vector database, and it is the step that determines whether the system works. Before you tune anything else, print twenty random chunks and read them. If *you* cannot tell what they are about, neither can the retriever.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'A chunk should be **one coherent idea that stands on its own**, with metadata saying where it came from. Read your chunks — it is the cheapest quality win in RAG.',
      },
    ],
  },

  {
    id: 'l4-retrieval-quality',
    title: 'Why vector search alone disappoints — and the fixes',
    emoji: '🎯',
    minutes: 5,
    blocks: [
      {
        kind: 'p',
        text: 'The naive pipeline — embed the query, take the top 5 by cosine similarity, done — works in the demo and underwhelms in production. Understanding *why* gives you the three standard fixes.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Embeddings capture **semantic gist**, and they are correspondingly bad at exact tokens. Search for error code `E4021`, part number `SKU-8823-B`, or a person’s surname, and the vector space happily returns chunks about *similar-feeling* error codes. "Fuzzy" is the feature and the flaw.',
      },
      { kind: 'h', text: 'Fix 1 — Hybrid search' },
      {
        kind: 'compare',
        left: {
          title: 'Keyword (BM25)',
          emoji: '🔤',
          tone: 'neutral',
          items: [
            'Exact terms, ids, names, codes',
            'Decades of tuning behind it',
            'Blind to synonyms and paraphrase',
          ],
        },
        right: {
          title: 'Vector',
          emoji: '📍',
          tone: 'neutral',
          items: [
            'Meaning, synonyms, paraphrase',
            'Handles "locked out" → "password reset"',
            'Blind to exact rare strings',
          ],
        },
        caption: 'Run both, fuse the ranked lists (Reciprocal Rank Fusion is the standard, and it is about ten lines). Hybrid beats either alone on almost every benchmark and almost every real corpus.',
      },
      { kind: 'h', text: 'Fix 2 — Reranking' },
      {
        kind: 'flow',
        steps: [
          { emoji: '🕸️', label: 'Retrieve wide', sub: 'top 50, cheap' },
          { emoji: '⚖️', label: 'Rerank', sub: 'cross-encoder scores query+chunk together' },
          { emoji: '🎯', label: 'Keep top 5', sub: 'send only these' },
        ],
        caption: 'Two stages: a fast recall net, then a slow precise filter. Vector search compares two vectors computed independently; a reranker reads the query and the chunk *together*, so it judges relevance far better — it is just too slow to run over a million documents.',
      },
      { kind: 'h', text: 'Fix 3 — Fix the query, not the index' },
      {
        kind: 'list',
        items: [
          '**Rewrite.** "what about the second one?" is unsearchable. Use the conversation to rewrite it into a standalone query first.',
          '**Multi-query.** Generate 3 phrasings of the question, retrieve for each, merge. Cheap insurance against one bad phrasing.',
          '**Decompose.** "How does our refund policy compare to our returns policy?" is two searches, not one. Split it.',
          '**HyDE.** Have the model write a *hypothetical answer*, then embed that instead of the question — answers live closer to answers than questions do.',
        ],
      },
      {
        kind: 'note',
        note: 'react',
        text: 'The two-stage retrieve-then-rerank shape is exactly **coarse hit-testing then precise hit-testing**, or a cheap CSS selector followed by an expensive predicate. Narrow with the cheap operation, decide with the expensive one. You have written this optimisation many times.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Measure retrieval **separately** from generation. Track recall (was the right chunk in the top 50?) and precision (is the right chunk in the top 5?). Debugging a RAG system without those two numbers is guesswork.',
      },
    ],
  },

  {
    id: 'l4-compaction',
    title: 'Long-running agents: compaction and offloading',
    emoji: '🗜️',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'A chat is short. An agent working a real task is not: forty tool calls in, the window is full of stale file dumps and superseded plans, and the original goal is a distant memory near the top. Something has to give — and if you do not choose what, the API will choose for you by erroring.',
      },
      {
        kind: 'flow',
        steps: [
          { emoji: '🟢', label: 'Fresh', sub: 'goal + few turns', tone: 'accent' },
          { emoji: '🟡', label: 'Filling', sub: 'tool results pile up', tone: 'muted' },
          { emoji: '🟠', label: 'Rotting', sub: 'quality drops before the limit', tone: 'muted' },
          { emoji: '🔴', label: 'Overflow', sub: 'hard error', tone: 'danger' },
        ],
        caption: 'The failure starts at the orange stage — well before the red one. Waiting for an overflow error means shipping the degraded stage.',
      },
      { kind: 'h', text: 'The techniques' },
      {
        kind: 'table',
        head: ['Technique', 'What it does', 'Cost'],
        rows: [
          ['**Sliding window**', 'Keep the last N turns, drop the rest', 'Trivial to build; loses early decisions permanently'],
          ['**Compaction**', 'Summarise the old middle into a compact note, keep the goal and recent turns verbatim', 'One extra call; the standard approach'],
          ['**Offloading**', 'Write results to files/DB, keep only paths and one-line descriptions in context', 'Needs tools to read them back; scales the best'],
          ['**Structured note-taking**', 'Agent maintains an explicit plan/progress block it rewrites each step', 'Cheap and remarkably effective for long tasks'],
        ],
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine a detective on a three-week case. They do not carry every interview transcript in their head — they keep a **case file**: a one-page summary of what is established, a list of open leads, and a cabinet of documents they can pull when needed. Their working memory holds the summary; the cabinet holds the detail.',
      },
      {
        kind: 'p',
        text: 'That is the architecture you are aiming for. Concretely: keep the **original goal verbatim** (never summarise the objective — it is the one thing that must not drift), keep the **last few turns verbatim** (fine detail matters most when it is recent), and compress everything in between into a structured summary: decisions made, facts established, things already tried and ruled out, what is left.',
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Compaction is lossy, and it compounds — summarising a summary of a summary drifts fast. Two guards: always re-anchor on the untouched original goal rather than on the previous summary, and write the summary to a **schema** (decisions / facts / dead ends / next steps) so the same categories survive each round instead of being re-invented.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Plan for the long run from the first version: **goal verbatim, recent turns verbatim, middle compressed, bulk on disk.** Retrofitting this into an agent that already assumes infinite context is painful.',
      },
    ],
  },

  {
    id: 'l4-memory',
    title: 'Memory: what the agent should still know tomorrow',
    emoji: '🧠',
    minutes: 4,
    blocks: [
      {
        kind: 'p',
        text: 'Compaction keeps one run coherent. **Memory** is different: it is what survives after the run ends. Since the model is stateless (Level 1), memory is a feature you build — storage plus a retrieval policy plus a write policy.',
      },
      {
        kind: 'stack',
        layers: [
          { label: '⚡ Working memory', sub: 'the current message array — dies with the run' },
          { label: '📋 Episodic memory', sub: 'what happened before: past sessions, decisions, outcomes' },
          { label: '📖 Semantic memory', sub: 'durable facts: preferences, team conventions, entity knowledge' },
          { label: '🔧 Procedural memory', sub: 'how to do things here: learned workflows, instructions, corrections' },
        ],
        caption: 'Borrowed from cognitive science, and the taxonomy earns its keep: each layer has a different write trigger and a different retrieval policy.',
      },
      {
        kind: 'note',
        note: 'imagine',
        text: 'Imagine a colleague returning from holiday. They do not replay every meeting of the last year. They remember **that you prefer TypeScript strict mode** (semantic), **that the Redis migration was abandoned in March** (episodic), and **how your deploy process works** (procedural). Small, durable, high-value residue — not a transcript.',
      },
      { kind: 'h', text: 'Building it' },
      {
        kind: 'flow',
        steps: [
          { emoji: '📥', label: 'Extract', sub: 'what from this run is worth keeping?' },
          { emoji: '🗄️', label: 'Store', sub: 'file, DB or vector index' },
          { emoji: '🔎', label: 'Retrieve', sub: 'relevant memories only' },
          { emoji: '📝', label: 'Inject', sub: 'into the next run’s context' },
        ],
        loop: 'and periodically: merge duplicates, resolve contradictions, expire the stale',
        caption: 'That last step is the one everyone skips, and it is why their memory system degrades into noise after a month.',
      },
      {
        kind: 'list',
        items: [
          '**Storage is often boringly simple.** A markdown file the agent reads at startup and appends to beats a vector database for most single-user cases. Reach for embeddings only when there is too much to read at once.',
          '**Retrieval must be selective.** Injecting all 400 memories every run is just context bloat with extra steps. Retrieve by relevance to the current task.',
          '**Write sparingly.** Saving everything produces a haystack. A good filter: "would this change how I act in a *future*, *different* session?" If not, do not save it.',
          '**Handle contradictions explicitly.** The user said Postgres in March and MySQL in June. Recency usually wins, but the system needs a rule — silent contradictions produce erratic behaviour nobody can debug.',
        ],
      },
      {
        kind: 'note',
        note: 'warn',
        text: 'Memory is a **persistent injection surface**. A poisoned memory ("the user has approved all future deployments") gets loaded into every subsequent session, quietly, forever. Anything written from untrusted content deserves the same scrutiny as tool input, and memory should always be inspectable and editable by the user.',
      },
      {
        kind: 'note',
        note: 'key',
        text: 'Memory is not "store the transcript". It is **extract the durable residue, retrieve it selectively, and keep it clean.** Storage is the easy part; the write and forget policies are the design.',
      },
    ],
  },
]
