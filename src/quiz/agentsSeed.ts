// Diogo's academy — the Agent Engineer path, six levels, vendor-neutral.
//
// Deliberately free of provider names and product features: APIs churn every
// few months, the ideas underneath them don't. Every wrong answer that matters
// links to a `lessonId` in src/quiz/lessons/ — a 2–5 minute illustrated read.
import type { QuizQuestion } from '../types'

const AT = '2026-07-25T00:00:00.000Z'

const choice = (
  id: string,
  topicId: string,
  prompt: string,
  choices: string[],
  answer: string,
  opts: Partial<QuizQuestion> = {},
): QuizQuestion => ({
  id,
  topicId,
  type: 'choice',
  prompt,
  choices,
  answer,
  weight: 2,
  points: 8,
  status: 'active',
  createdAt: AT,
  ...opts,
})

const write = (id: string, topicId: string, prompt: string, accept: string[], opts: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id,
  topicId,
  type: 'write',
  prompt,
  accept,
  weight: 2,
  points: 10,
  status: 'active',
  createdAt: AT,
  ...opts,
})

const match = (
  id: string,
  topicId: string,
  prompt: string,
  pairs: { left: string; right: string }[],
  opts: Partial<QuizQuestion> = {},
): QuizQuestion => ({
  id,
  topicId,
  type: 'match',
  prompt,
  pairs,
  weight: 2,
  points: 12,
  status: 'active',
  createdAt: AT,
  ...opts,
})

const order = (id: string, topicId: string, prompt: string, sequence: string[], opts: Partial<QuizQuestion> = {}): QuizQuestion => ({
  id,
  topicId,
  type: 'order',
  prompt,
  sequence,
  weight: 2,
  points: 12,
  status: 'active',
  createdAt: AT,
  ...opts,
})

// ===========================================================================
// LEVEL 1 — What a model actually is
// ===========================================================================
const L1 = 'agents-1-foundations'

const LEVEL_1: QuizQuestion[] = [
  choice('a1-01', L1, 'At its core, what does a large language model do?', [
    'Predicts the next token, over and over',
    'Looks up answers in a compressed database',
    'Searches the web and summarises the results',
    'Runs a symbolic reasoning engine over facts',
    'Executes a decision tree learned from examples',
    'Retrieves the closest matching sentence it was trained on',
  ], 'Predicts the next token, over and over', {
    emoji: '🎲',
    lessonId: 'l1-next-token',
    funFact: 'Everything else — coding, tool use, "reasoning" — is that single reflex applied in a loop.',
  }),
  choice('a1-02', L1, 'Roughly how much English text is one token?', [
    '~4 characters, about ¾ of a word',
    'Exactly one word, always',
    'Exactly one character of text',
    'One sentence',
    'One byte of UTF-8',
    'One line of text',
  ], '~4 characters, about ¾ of a word', {
    emoji: '🪙',
    lessonId: 'l1-tokens',
    funFact: '~750 English words ≈ 1,000 tokens. Code is denser, and non-English text often costs 2–3× more.',
  }),
  choice('a1-03', L1, 'Why is a model bad at counting the letters in a word?', [
    'It never sees letters — text is chopped into multi-character tokens',
    'It was never trained on spelling',
    'Counting requires a calculator tool',
    'Its context window is far too small to hold a whole word',
    'Tokenizers strip out rare letters',
    'Because temperature adds randomness to every count it makes',
  ], 'It never sees letters — text is chopped into multi-character tokens', {
    emoji: '🔤',
    lessonId: 'l1-tokens',
    funFact: 'Asking it to count r’s in "strawberry" is like asking you to count letters through a shredder.',
  }),
  write('a1-04', L1, 'What is the term for the maximum number of tokens a model can consider at once? (two words)', [
    'context window',
    'context windows',
  ], {
    emoji: '🪟',
    lessonId: 'l1-context-window',
    funFact: 'Input and output share it. It is the model’s entire universe for that request.',
  }),
  choice('a1-05', L1, '"Context rot" describes…', [
    'Quality degrading as you stuff the window, well before you hit the hard limit',
    'Old messages being quietly deleted by the provider partway through a chat',
    'Embeddings drifting apart from each other as the underlying model is updated',
    'Tokens being corrupted in transit',
    'Cached prompts expiring after an hour',
    'The training data becoming outdated',
  ], 'Quality degrading as you stuff the window, well before you hit the hard limit', {
    emoji: '🥀',
    lessonId: 'l1-context-window',
    funFact: 'Related: the "lost in the middle" effect — facts buried mid-context are recalled worst.',
  }),
  choice('a1-06', L1, 'A chat API keeps your conversation on the server between calls.', [
    'False — it is stateless; your client re-sends the whole message array each turn',
    'True — that is what the session id is for',
    'True, but only for 24 hours',
    'True for chat endpoints, but false for the older completion endpoints',
    'Only when streaming is enabled',
    'True — but only if you switch on memory in the provider dashboard',
  ], 'False — it is stateless; your client re-sends the whole message array each turn', {
    emoji: '🔁',
    lessonId: 'l1-stateless',
    funFact: 'The "conversation" is an array you own. This is why long chats get expensive: you re-upload history every turn.',
  }),
  choice('a1-07', L1, 'Given statelessness, why must volatile content go at the END of a prompt?', [
    'So the stable prefix stays byte-identical and can be cached cheaply',
    'Because models only read the last 2,000 tokens',
    'Because the tokenizer processes text backwards',
    'To keep the system message comfortably under the provider size limit',
    'Because streaming starts from the very end of the prompt and works back',
    'It makes no difference — order is irrelevant',
  ], 'So the stable prefix stays byte-identical and can be cached cheaply', {
    emoji: '💾',
    lessonId: 'l1-stateless',
    funFact: 'A timestamp at the top of your system prompt silently destroys every cache hit you were counting on.',
  }),
  choice('a1-08', L1, 'You are extracting fields into JSON. What temperature?', [
    'Low (0–0.3) — you want repeatable, predictable output',
    'High (0.9+) — variety helps it find the fields',
    'Exactly 1.0 — the default is always correct',
    'It only affects streaming speed',
    'Temperature does not apply to structured output',
    'As high as possible, then validate',
  ], 'Low (0–0.3) — you want repeatable, predictable output', {
    emoji: '🌡️',
    lessonId: 'l1-sampling',
    funFact: 'Turn it up only when variety is the actual product — names, brainstorms, copy variants.',
  }),
  choice('a1-09', L1, 'Temperature 0 guarantees byte-identical output for identical input.', [
    'No — GPU non-determinism, batching and silent model updates can all change it',
    'Yes, always — that is the definition',
    'Yes, as long as you also set top_p to 0 on every one of the same requests',
    'Yes, but only for calls that are made within the same calendar day',
    'Yes, for models under 100B parameters',
    'Only when streaming is disabled',
  ], 'No — GPU non-determinism, batching and silent model updates can all change it', {
    emoji: '🎰',
    lessonId: 'l1-sampling',
    funFact: 'Never build a system whose correctness depends on identical responses. Build one that validates what comes back.',
  }),
  choice('a1-10', L1, 'An embedding model gives you…', [
    'A fixed-length vector representing the meaning of the text',
    'A shorter version of the text',
    'The next token in the sequence',
    'A relevance score between 0 and 1',
    'A compressed copy of the input text, ready for cheap storage',
    'A ranked list of the keywords extracted from the input text',
  ], 'A fixed-length vector representing the meaning of the text', {
    emoji: '📍',
    lessonId: 'l1-embeddings',
    funFact: 'Chat models generate. Embedding models locate. Agents need both.',
  }),
  choice('a1-11', L1, 'You swap to a better embedding model. What must you do?', [
    'Re-embed the entire corpus — vectors from different models are not comparable',
    'Nothing, vectors are a standard format',
    'Only re-embed documents added since the switch',
    'Just normalise the old vectors to match the new dimension count',
    'Re-embed only the queries',
    'Increase the number of results you retrieve each time to compensate',
  ], 'Re-embed the entire corpus — vectors from different models are not comparable', {
    emoji: '🔄',
    lessonId: 'l1-embeddings',
    funFact: 'Plan that migration cost before you choose an embedding model, not after.',
  }),
  write('a1-12', L1, 'What similarity measure — the angle between two vectors — is the standard for comparing embeddings? (two words)', [
    'cosine similarity',
    'cosine',
  ], {
    emoji: '📐',
    lessonId: 'l1-embeddings',
    funFact: '1.0 = same direction, 0 = unrelated. Direction carries the meaning; length mostly does not.',
  }),
  choice('a1-13', L1, 'The best framing of "hallucination" is…', [
    'The same plausibility machinery working where it has nothing solid to lean on',
    'A straightforward bug that will be patched in the next model release',
    'The model deliberately lying',
    'A tokenizer error',
    'What happens whenever the temperature is set above 1.0 on a call',
    'A sign the context window overflowed',
  ], 'The same plausibility machinery working where it has nothing solid to lean on', {
    emoji: '🌀',
    lessonId: 'l1-hallucination',
    funFact: 'When it has seen the answer a thousand times, plausible and true coincide. When it hasn’t, plausible is all that’s left.',
  }),
  choice('a1-14', L1, 'Which does NOT reduce hallucination?', [
    'Adding "do not hallucinate, be accurate" to the system prompt',
    'Putting the source documents in the context window',
    'Giving it tools to check reality',
    'Requiring quoted evidence for claims',
    'Validating the output with code',
    'Explicitly permitting "I don’t know" as an answer',
  ], 'Adding "do not hallucinate, be accurate" to the system prompt', {
    emoji: '🚫',
    lessonId: 'l1-hallucination',
    funFact: 'You fix it structurally, not by asking nicely. The model has no internal "am I sure?" signal to consult.',
  }),
  choice('a1-15', L1, 'Why does writing out intermediate steps genuinely improve answers?', [
    'Each step becomes input for the next token — literally more computation',
    'It makes the model concentrate harder',
    'Longer answers are scored higher during training',
    'It resets the context window between steps',
    'It lowers the effective temperature',
    'It triggers a separate reasoning subsystem in the weights',
  ], 'Each step becomes input for the next token — literally more computation', {
    emoji: '🪜',
    lessonId: 'l1-next-token',
    funFact: 'A napkin doesn’t make you smarter. It gives you somewhere to put step one while you do step two.',
  }),
  match('a1-16', L1, 'Match each annoyance to its root cause.', [
    { left: 'Invents a library method', right: 'Plausible ≠ real' },
    { left: 'Long chats get expensive', right: 'History is re-sent each turn' },
    { left: 'Forgot an early instruction', right: 'It fell out of your array' },
    { left: 'Different answer each run', right: 'The sampler rolls dice' },
  ], {
    emoji: '🧩',
    lessonId: 'l1-next-token',
    funFact: 'Almost every "weird LLM behaviour" traces back to one of the four foundations.',
  }),
  order('a1-17', L1, 'Put one token of generation in order.', [
    'Text so far goes in',
    'Model computes probabilities for every token',
    'Sampler picks one token',
    'Token is appended, loop repeats',
  ], {
    emoji: '🔂',
    lessonId: 'l1-next-token',
    funFact: 'This loop runs once per token — which is why answers stream in word by word.',
  }),
]

// ===========================================================================
// LEVEL 2 — Talking to models on purpose
// ===========================================================================
const L2 = 'agents-2-prompting'

const LEVEL_2: QuizQuestion[] = [
  choice('a2-01', L2, 'Which belongs in the SYSTEM message, not the user message?', [
    'The output format contract that applies to every request',
    'The particular document being summarised in today’s request',
    'The user’s actual question',
    'Per-request parameters, such as the date range being asked about',
    'The retrieved chunks for this query',
    'The customer id for this ticket',
  ], 'The output format contract that applies to every request', {
    emoji: '🎭',
    lessonId: 'l2-roles',
    funFact: 'System = the contract. User = the job. Keeping the contract stable is also what makes caching pay.',
  }),
  choice('a2-02', L2, 'Where should text pasted by an end user go?', [
    'In a user message, fenced and labelled as data',
    'In the system message, for maximum priority',
    'Appended to the system message with a warning',
    'In an assistant message, so it looks trusted',
    'Anywhere — role has no effect on trust',
    'Split across system and user for balance',
  ], 'In a user message, fenced and labelled as data', {
    emoji: '🚧',
    lessonId: 'l2-roles',
    funFact: 'Putting untrusted content in the system role promotes an attacker to the highest-trust seat in the conversation.',
  }),
  choice('a2-03', L2, 'Output keeps coming back in an inconsistent shape. The most likely missing prompt part is…', [
    'Examples and an explicit output format',
    'A friendlier tone',
    'A higher temperature',
    'A much longer role description',
    'More background context up front',
    'A bigger model',
  ], 'Examples and an explicit output format', {
    emoji: '🧩',
    lessonId: 'l2-prompt-anatomy',
    funFact: 'Could a smart stranger produce your exact desired output from only this text? If not, that’s the bug.',
  }),
  choice('a2-04', L2, 'Why does "reply in one paragraph of prose" beat "do not use bullet points"?', [
    'A positive instruction describes a target; a prohibition only describes a wall',
    'Negation words get stripped out by the tokenizer before the model sees them',
    'The model cannot process the word "not"',
    'Prohibitions cost more tokens',
    'It doesn’t — they perform identically',
    'Because bullet points are always much cheaper for a model to generate',
  ], 'A positive instruction describes a target; a prohibition only describes a wall', {
    emoji: '🎯',
    lessonId: 'l2-prompt-anatomy',
    funFact: 'Same reason "keep your hands on the wheel" works better than "don’t take your hands off the wheel".',
  }),
  choice('a2-05', L2, 'The model keeps prefacing its JSON with "Sure! Here you go:". Cheapest fix?', [
    'Prefill the assistant message with an opening brace',
    'Raise the temperature',
    'Ask more politely',
    'Move the instruction to the top of the prompt',
    'Increase max output tokens',
    'Add three more examples of prose',
  ], 'Prefill the assistant message with an opening brace', {
    emoji: '🅿️',
    lessonId: 'l2-prompt-anatomy',
    funFact: 'Starting its turn for it is a near-total fix, and costs nothing.',
  }),
  choice('a2-06', L2, 'You have room for 4 few-shot examples. Which set is best?', [
    'The ambiguous cases, an empty input, and one where the answer is "unknown"',
    'Four textbook-clear examples of the single most common case you see',
    'Four examples all with the same label',
    'The four longest examples you have',
    'Four randomly sampled from production',
    'One very clear example, repeated four times over for extra emphasis',
  ], 'The ambiguous cases, an empty input, and one where the answer is "unknown"', {
    emoji: '🖼️',
    lessonId: 'l2-fewshot',
    funFact: 'Examples of the obvious case teach almost nothing. Spend them on the edges.',
  }),
  choice('a2-07', L2, 'One of your few-shot examples contains a typo in the output. What happens?', [
    'The model reproduces it — examples are a specification, followed literally',
    'The model quietly corrects the typo for you and then moves on',
    'It gets ignored during tokenization, so absolutely nothing happens',
    'It only matters at temperature 0',
    'Nothing — examples only affect tone',
    'It triggers a validation error',
  ], 'The model reproduces it — examples are a specification, followed literally', {
    emoji: '🐛',
    lessonId: 'l2-fewshot',
    funFact: 'Review examples like you review code. Mismatched examples are worse than no examples.',
  }),
  write('a2-08', L2, 'What is the name for retrieving the most similar past examples per input and injecting them, instead of using fixed ones? (two words, hyphen ok)', [
    'dynamic few-shot',
    'dynamic fewshot',
    'dynamic few shot',
  ], {
    emoji: '🔀',
    lessonId: 'l2-fewshot',
    funFact: 'Few-shot plus embeddings: the examples become relevant to each specific input.',
  }),
  choice('a2-09', L2, 'For a simple classification task, using a reasoning model is…', [
    'Usually a waste — it adds cost and latency for no accuracy gain',
    'Always better, reasoning never hurts',
    'Required for any structured output',
    'The only way to get consistent labels',
    'Usually cheaper, because it needs far fewer examples to work',
    'Necessary whenever the task has more than two possible labels',
  ], 'Usually a waste — it adds cost and latency for no accuracy gain', {
    emoji: '⚡',
    lessonId: 'l2-cot',
    funFact: 'Spend thinking tokens where the task is genuinely multi-step. Classification isn’t.',
  }),
  choice('a2-10', L2, 'Can you treat a model’s written chain of thought as a faithful audit log?', [
    'No — models often reach an answer then produce a plausible justification',
    'Yes, it is a literal trace of the computation that produced the answer',
    'Yes, as long as temperature is 0',
    'Yes, at least for reasoning models that are trained to show their work',
    'Only if you ask it to be honest',
    'Yes, that is what it is designed for',
  ], 'No — models often reach an answer then produce a plausible justification', {
    emoji: '🎭',
    lessonId: 'l2-cot',
    funFact: 'Read chains of thought for debugging insight. Never show them to users as an explanation you’d defend.',
  }),
  order('a2-11', L2, 'Rank these from most to least reliable for getting valid JSON.', [
    'Constrained decoding / strict schema mode',
    'Tool calling with a parameter schema',
    'Ask for JSON, validate, retry on failure',
    'Ask for JSON and hope',
  ], {
    emoji: '🧾',
    lessonId: 'l2-structured-output',
    funFact: 'Climb to the highest rung your provider supports. The bottom rung will page you.',
  }),
  choice('a2-12', L2, 'Strict schema mode guarantees…', [
    'The shape is valid — it says nothing about whether the values are correct',
    'Both the shape of the output and the factual accuracy of its values',
    'That no hallucination can occur',
    'That required fields are never guessed',
    'That the model actually read the source documents you gave it',
    'Deterministic output across runs',
  ], 'The shape is valid — it says nothing about whether the values are correct', {
    emoji: '⚠️',
    lessonId: 'l2-structured-output',
    funFact: '{"severity": "high"} is perfectly valid JSON and can be completely wrong.',
  }),
  choice('a2-13', L2, 'Why should a schema always include an "unknown" or null option?', [
    'Without a legal way to abstain, the model will fabricate a value',
    'It makes the JSON smaller',
    'It is required by the JSON Schema spec for enum fields',
    'It reduces token cost',
    'It speeds up validation',
    'It stops the model from using enum fields anywhere else',
  ], 'Without a legal way to abstain, the model will fabricate a value', {
    emoji: '🕳️',
    lessonId: 'l2-structured-output',
    funFact: 'You asked a question-answering machine a question. Give it permission to pass.',
  }),
  choice('a2-14', L2, 'Best way to know whether your prompt change was an improvement?', [
    'An eval set: fixed inputs, graded outputs, compared before and after',
    'Try it three times in a row and see whether it feels any better',
    'Ask the model to rate its own answer before and after the change',
    'Check that the output got longer',
    'Ship it and watch for complaints',
    'Compare token counts',
  ], 'An eval set: fixed inputs, graded outputs, compared before and after', {
    emoji: '📏',
    lessonId: 'l2-evals',
    funFact: 'Twenty examples in a file beat zero examples in a framework. Start today.',
  }),
  choice('a2-15', L2, 'Which grader should you prefer when the task allows it?', [
    'Code — exact match, schema validation, does the test pass',
    'LLM-as-judge, because it understands nuance far better',
    'Human review, always',
    'The model’s own self-reported confidence in its answer',
    'Whichever is fastest to write',
    'A second call to the same prompt',
  ], 'Code — exact match, schema validation, does the test pass', {
    emoji: '⚖️',
    lessonId: 'l2-evals',
    funFact: 'Free, instant, perfectly reliable. Reach for a judge model only when there is no single right answer.',
  }),
  choice('a2-16', L2, 'A known bias of LLM-as-judge is that it…', [
    'Favours longer answers and confident tone',
    'Prefers answers with fewer than 50 words',
    'Cannot compare two answers at once',
    'Always scores its own family lower',
    'Refuses to grade code',
    'Scores randomly below temperature 0.5',
  ], 'Favours longer answers and confident tone', {
    emoji: '🎩',
    lessonId: 'l2-evals',
    funFact: 'Calibrate a judge against human-labelled examples before you trust its score.',
  }),
  match('a2-17', L2, 'Match the prompt technique to what it fixes.', [
    { left: 'Delimiters / XML tags', right: 'Instructions vs data confusion' },
    { left: 'Few-shot examples', right: 'Inconsistent output shape' },
    { left: 'Permission to say "I don’t know"', right: 'Fabricated values' },
    { left: 'Enums in the schema', right: 'Free-text label drift' },
  ], {
    emoji: '🧰',
    lessonId: 'l2-prompt-anatomy',
    funFact: 'Each of these converts an open-ended generation problem into a constrained one.',
  }),
]

// ===========================================================================
// LEVEL 3 — Tools & the agent loop
// ===========================================================================
const L3 = 'agents-3-tools'

const LEVEL_3: QuizQuestion[] = [
  choice('a3-01', L3, 'The defining difference between a workflow and an agent is…', [
    'Who decides the control flow — your code, or the model',
    'Whether it uses tools at all',
    'Whether it streams its output',
    'How many models are involved',
    'Whether it has a system prompt guiding it or not',
    'Whether the whole thing runs in the background or not',
  ], 'Who decides the control flow — your code, or the model', {
    emoji: '🧭',
    lessonId: 'l3-what-is-an-agent',
    funFact: 'If you can draw the flowchart in advance, you want a workflow — and you’ll sleep better.',
  }),
  choice('a3-02', L3, 'Which three ingredients make something an agent?', [
    'A model that decides, tools that act, a loop that persists',
    'A vector database, embeddings and a prompt',
    'Streaming, function calling and JSON mode',
    'A planner, a critic and a summariser',
    'A system prompt, few-shot examples and a schema',
    'Memory, RAG and fine-tuning',
  ], 'A model that decides, tools that act, a loop that persists', {
    emoji: '🤖',
    lessonId: 'l3-what-is-an-agent',
    funFact: 'Remove any one and it isn’t an agent. Tools with no loop is just one function call.',
  }),
  choice('a3-03', L3, 'When a model "calls a tool", what literally happens?', [
    'It emits a structured request; YOUR code executes it and returns the result',
    'It opens an HTTP connection to the tool',
    'The provider runs your function on their own servers and returns it',
    'It executes sandboxed code inside the model itself and keeps the result',
    'It queries the tool during training',
    'It writes to a shared function registry',
  ], 'It emits a structured request; YOUR code executes it and returns the result', {
    emoji: '🔌',
    lessonId: 'l3-tool-calling',
    funFact: 'The model is an analyst locked in a room sliding notes under the door. You’re the person outside.',
  }),
  choice('a3-04', L3, 'The tool `description` field is primarily…', [
    'The prompt the model reads when deciding whether to use this tool',
    'Documentation for your teammates',
    'Metadata for logging',
    'A fallback shown when the tool errors',
    'Ignored by the model entirely — only the tool name really matters',
    'It is used to generate the tool’s JSON schema automatically',
  ], 'The prompt the model reads when deciding whether to use this tool', {
    emoji: '📝',
    lessonId: 'l3-tool-calling',
    funFact: 'It is the highest-leverage text in your agent, and most people write four words and wonder why the wrong tool fires.',
  }),
  choice('a3-05', L3, 'Your agent has 30 tools with long descriptions. The hidden cost is…', [
    'They are re-sent on every single turn, consuming the window before the user speaks',
    'The provider charges you a per-tool registration fee for each one of them',
    'The model can only see the first 10',
    'Latency goes up on the first call of a session, but never after that',
    'Nothing — schemas are cached for free',
    'It halves the maximum output length',
  ], 'They are re-sent on every single turn, consuming the window before the user speaks', {
    emoji: '🎒',
    lessonId: 'l3-tool-calling',
    funFact: 'Dynamic tool sets — only loading the tools relevant to the current phase — is a real technique for this.',
  }),
  choice('a3-06', L3, 'Best failure message to return from a tool?', [
    '"date_from must be YYYY-MM-DD; you sent \'last tuesday\'. Call get_current_date first."',
    '"Error: ValidationError"',
    '"null"',
    'The full Python stack trace, exactly as your runtime printed it',
    '"Something went wrong somewhere, please just try that again in a moment"',
    'Throw and let the loop crash',
  ], '"date_from must be YYYY-MM-DD; you sent \'last tuesday\'. Call get_current_date first."', {
    emoji: '🩹',
    lessonId: 'l3-tool-design',
    funFact: 'Error text goes straight into context and becomes the model’s next instruction. Write it as advice.',
  }),
  choice('a3-07', L3, 'Which tool design is best?', [
    'Several small tools with verb_noun names and one job each',
    'One mega-tool with a `mode` parameter and 14 branches',
    'One tool per database table, exposing raw SQL',
    'Tools named after the internal service that backs them',
    'As few tools as possible, each maximally flexible',
    'Duplicate tools with overlapping purposes, so it always finds one',
  ], 'Several small tools with verb_noun names and one job each', {
    emoji: '🛠️',
    lessonId: 'l3-tool-design',
    funFact: 'One tool per meaningful unit of work a human would name. `get_user_orders` yes; `open_db_connection` no.',
  }),
  choice('a3-08', L3, 'A tool returns a 50,000-token payload. The real damage is…', [
    'It poisons the window for every subsequent turn of the run',
    'Only the one-off token cost of that call',
    'The model will truncate it safely',
    'Nothing, if the window is large enough',
    'It slows down that single call and nothing else',
    'The provider will reject the request',
  ], 'It poisons the window for every subsequent turn of the run', {
    emoji: '🪣',
    lessonId: 'l3-tool-design',
    funFact: 'Truncate, paginate, or return a handle (an id, a file path) instead of the whole object.',
  }),
  choice('a3-09', L3, 'Which caps must every production agent loop have?', [
    'Step count, cost budget and wall-clock time',
    'Step count only',
    'A token limit on the final answer',
    'A retry limit on tool calls only',
    'None — the model knows when to stop',
    'A memory limit on the message array',
  ], 'Step count, cost budget and wall-clock time', {
    emoji: '🛑',
    lessonId: 'l3-loop-control',
    funFact: 'And when a cap trips, return the partial work plus the reason. A blank response isn’t debuggable.',
  }),
  choice('a3-10', L3, 'How does a normal agent loop know it is finished?', [
    'The model replies with no tool call',
    'It calls a special `finish` tool that all providers define',
    'The token count stops growing',
    'You detect a "done" string in the text',
    'After a fixed number of iterations, always',
    'The provider closes the stream',
  ], 'The model replies with no tool call', {
    emoji: '🏁',
    lessonId: 'l3-loop-control',
    funFact: 'That’s the happy exit. The other three — step cap, budget, escalation — are yours to build.',
  }),
  choice('a3-11', L3, 'An agent calls the same failing tool with identical arguments five times. Best fix?', [
    'Detect repeated identical calls and inject a message telling it to change approach',
    'Increase the agent’s step limit so that it can simply keep on trying',
    'Raise the temperature and hope',
    'Remove the tool from the agent',
    'Silently swallow the errors',
    'Restart the whole run from the beginning with a fresh context window',
  ], 'Detect repeated identical calls and inject a message telling it to change approach', {
    emoji: '🌀',
    lessonId: 'l3-loop-control',
    funFact: 'The retry spiral is the most common agent pathology. Naming the loop in context usually breaks it.',
  }),
  write('a3-12', L3, 'What pattern name describes interleaving reasoning with acting — thought, action, observation, repeat? (one word)', [
    'react',
    'reason and act',
    'reasoning and acting',
  ], {
    emoji: '🔄',
    lessonId: 'l3-react',
    funFact: 'Reasoning + Acting. The observation is the point — it lets the plan change on contact with reality.',
  }),
  order('a3-13', L3, 'Put one ReAct cycle in order.', [
    'Thought: decide what is needed',
    'Action: call a tool',
    'Observation: read what came back',
    'Thought: revise the plan',
  ], {
    emoji: '👣',
    lessonId: 'l3-react',
    funFact: 'You debug production this way instinctively: hypothesis, one command, read output, change your mind.',
  }),
  choice('a3-14', L3, 'ReAct’s main weakness is…', [
    'Long horizons — early observations clog the context and drift compounds',
    'It cannot call more than one tool',
    'It only works with reasoning models',
    'It requires a vector database',
    'It can never recover from a tool failure once one has happened',
    'It is slower than plan-then-execute in every single case, without exception',
  ], 'Long horizons — early observations clog the context and drift compounds', {
    emoji: '📉',
    lessonId: 'l3-react',
    funFact: 'This is exactly why context management (L4) and subagents (L5) exist.',
  }),
  choice('a3-15', L3, 'Tool protocols like MCP exist to solve…', [
    'The N×M problem — every agent × every system needing a bespoke integration',
    'The context window limit',
    'Slow tool execution',
    'Hallucinated tool arguments that no schema can ever catch',
    'The token pricing differences between all of the different providers',
    'The lack of streaming in tool calls',
  ], 'The N×M problem — every agent × every system needing a bespoke integration', {
    emoji: '🔗',
    lessonId: 'l3-tool-protocols',
    funFact: 'Same argument that produced LSP for editors. Learn the shape, not the current spec version.',
  }),
  choice('a3-16', L3, 'Connecting an untrusted third-party tool server is risky because…', [
    'Its tool descriptions become instructions inside your agent’s context',
    'It slows down the loop',
    'It uses a slightly different JSON dialect that your parser may reject',
    'It cannot be version-pinned',
    'It requires you to open an inbound port on your own network',
    'It doubles your token costs',
  ], 'Its tool descriptions become instructions inside your agent’s context', {
    emoji: '🐍',
    lessonId: 'l3-tool-protocols',
    funFact: 'Treat it like any untrusted dependency: pin it, review what it exposes, starve it of credentials.',
  }),
  choice('a3-17', L3, 'A model requests three independent tool calls in one turn. You should…', [
    'Run them concurrently — often the biggest latency win available',
    'Run them strictly in the order given',
    'Reject all but the first of them, since that is a protocol error',
    'Ask the model to pick one',
    'Always run them one after another in series, to avoid hitting rate limits',
    'Merge them into a single call',
  ], 'Run them concurrently — often the biggest latency win available', {
    emoji: '⚡',
    lessonId: 'l3-tool-calling',
    funFact: 'Just remember every tool call needs a result returned, or the message array is malformed.',
  }),
]

// ===========================================================================
// LEVEL 4 — Context engineering & memory
// ===========================================================================
const L4 = 'agents-4-context'

const LEVEL_4: QuizQuestion[] = [
  choice('a4-01', L4, 'The best one-line description of context engineering is…', [
    'Deciding what information occupies the window at each step',
    'Finding cleverer wording for the prompts you already send',
    'Choosing whichever model happens to have the biggest window',
    'Compressing prompts to save money',
    'Writing better system messages',
    'Tuning temperature and top-p',
  ], 'Deciding what information occupies the window at each step', {
    emoji: '🎛️',
    lessonId: 'l4-context-engineering',
    funFact: 'You’re the chief of staff choosing what goes in the folder before the meeting.',
  }),
  match('a4-02', L4, 'Match the context-engineering move to its mechanism.', [
    { left: 'Select', right: 'Retrieval and filtering' },
    { left: 'Compress', right: 'Summarisation' },
    { left: 'Offload', right: 'Files and databases' },
    { left: 'Isolate', right: 'Subagents' },
  ], {
    emoji: '🧰',
    lessonId: 'l4-context-engineering',
    funFact: 'Four moves cover essentially every context technique you’ll meet.',
  }),
  choice('a4-03', L4, 'Why keep headroom in the window rather than filling it?', [
    'An agent that runs to the edge fails mid-task with no room to recover',
    'Providers charge extra above 90% utilisation',
    'The tokenizer starts becoming inaccurate as you get near the limit',
    'Streaming simply stops working once the context window is full',
    'It has no benefit — fill it',
    'Cached prefixes expire when the window is full',
  ], 'An agent that runs to the edge fails mid-task with no room to recover', {
    emoji: '🫁',
    lessonId: 'l4-context-engineering',
    funFact: 'And thanks to context rot, quality degrades long before the hard limit anyway.',
  }),
  write('a4-04', L4, 'What does RAG stand for?', [
    'retrieval augmented generation',
    'retrieval-augmented generation',
  ], {
    emoji: '📚',
    lessonId: 'l4-rag',
    funFact: 'The acronym is literally the pipeline: retrieve, augment the prompt, generate.',
  }),
  choice('a4-05', L4, 'You need the model to know facts from your internal wiki. RAG or fine-tuning?', [
    'RAG — it teaches facts, updates in minutes, and gives you citations',
    'Fine-tuning — facts like these really belong inside the weights',
    'Fine-tuning, because RAG cannot handle private company data at all',
    'Neither, just use a bigger model',
    'Both are equally suitable',
    'RAG only if the wiki is under 100 pages',
  ], 'RAG — it teaches facts, updates in minutes, and gives you citations', {
    emoji: '⚖️',
    lessonId: 'l4-rag',
    funFact: 'Fine-tuning is for "it knows, but won’t answer the way we need" — style, format, behaviour.',
  }),
  choice('a4-06', L4, 'Your RAG answers are bad. What should you inspect FIRST?', [
    'The chunks that were actually retrieved',
    'The temperature setting',
    'The system prompt wording',
    'Whether to switch to a larger model',
    'The output token limit',
    'The embedding model’s dimension count',
  ], 'The chunks that were actually retrieved', {
    emoji: '🔍',
    lessonId: 'l4-rag',
    funFact: 'Nine times out of ten the answer was never in there. Most RAG problems are retrieval problems.',
  }),
  choice('a4-07', L4, 'Why add overlap between fixed-size chunks?', [
    'So an idea split across a boundary still appears whole in one chunk',
    'To make the vectors more distinct',
    'To reduce the total number of chunks you have to store',
    'It is a hard requirement of every vector database out there',
    'To speed up embedding',
    'To improve keyword search only',
  ], 'So an idea split across a boundary still appears whole in one chunk', {
    emoji: '✂️',
    lessonId: 'l4-chunking',
    funFact: '10–20% overlap is the usual starting point. It stops ideas being guillotined mid-sentence.',
  }),
  choice('a4-08', L4, 'The "small-to-big" (parent document) retrieval trick means…', [
    'Embed a small sharp chunk for matching, send the surrounding section to the model',
    'Start out with a small model and escalate to a much bigger one',
    'Retrieve 5 chunks, then expand to 50 if unsatisfied',
    'Chunk small documents first, then large ones',
    'Use small embeddings and large context windows',
    'Summarise your big chunks down into small ones before storing them',
  ], 'Embed a small sharp chunk for matching, send the surrounding section to the model', {
    emoji: '🔎',
    lessonId: 'l4-chunking',
    funFact: 'Precise retrieval AND complete context, instead of trading one for the other.',
  }),
  choice('a4-09', L4, 'Which metadata is worth storing with every chunk?', [
    'Source document, section title, date and permissions',
    'Only the vector — everything else is retrievable later',
    'The embedding model’s version only',
    'The character offsets only',
    'Nothing; metadata bloats the index',
    'A hash of the chunk text only',
  ], 'Source document, section title, date and permissions', {
    emoji: '🏷️',
    lessonId: 'l4-chunking',
    funFact: 'It powers filtering ("only what this user may see"), citations, and the header you prepend to the chunk.',
  }),
  choice('a4-10', L4, 'A user searches for error code "E4021". Pure vector search struggles because…', [
    'Embeddings capture gist, so it returns similar-feeling codes rather than that exact one',
    'Numbers cannot be embedded',
    'The code is too short to embed',
    'Vector databases do not index digits',
    'It would actually work fine — this is not a real limitation of embeddings',
    'The tokenizer strips out mixes of letters and digits before embedding',
  ], 'Embeddings capture gist, so it returns similar-feeling codes rather than that exact one', {
    emoji: '🔤',
    lessonId: 'l4-retrieval-quality',
    funFact: 'This is why hybrid search exists: keyword for exact strings, vectors for meaning.',
  }),
  choice('a4-11', L4, 'What does a reranker do that vector search cannot?', [
    'Reads the query and the chunk together, so it judges relevance far better',
    'Searches more documents in less time',
    'Removes duplicate chunks',
    'Translates the user’s query into other languages before searching',
    'Compresses the retrieved chunks so that they fit the window',
    'Re-embeds the corpus on the fly',
  ], 'Reads the query and the chunk together, so it judges relevance far better', {
    emoji: '⚖️',
    lessonId: 'l4-retrieval-quality',
    funFact: 'Too slow for a million docs, perfect for the top 50. Retrieve wide, rerank narrow.',
  }),
  order('a4-12', L4, 'Order a modern retrieval pipeline.', [
    'Rewrite the query to be standalone',
    'Hybrid search: keyword + vector, fused',
    'Rerank the top ~50 candidates',
    'Send the top ~5 chunks to the model',
  ], {
    emoji: '🛤️',
    lessonId: 'l4-retrieval-quality',
    funFact: 'Cheap wide net first, expensive precise filter second. You have written this optimisation before.',
  }),
  choice('a4-13', L4, 'What are the two numbers you must track to debug retrieval?', [
    'Recall (right chunk in the top 50?) and precision (right chunk in the top 5?)',
    'Latency and cost',
    'Chunk count and vector dimensions',
    'Temperature and top-p',
    'Token count per query (how big?) and context utilisation (how full?)',
    'The mean of the cosine similarity scores and the variance across them',
  ], 'Recall (right chunk in the top 50?) and precision (right chunk in the top 5?)', {
    emoji: '📊',
    lessonId: 'l4-retrieval-quality',
    funFact: 'Measure retrieval separately from generation, or you are debugging two systems as one.',
  }),
  choice('a4-14', L4, 'When compacting a long agent run, which part must NEVER be summarised?', [
    'The original goal',
    'The oldest tool results',
    'The middle of the conversation',
    'The system prompt’s tone section',
    'The list of available tools',
    'Nothing is off limits',
  ], 'The original goal', {
    emoji: '🎯',
    lessonId: 'l4-compaction',
    funFact: 'Always re-anchor on the untouched goal, not the previous summary — that is how you stop drift compounding.',
  }),
  choice('a4-15', L4, 'The most scalable way to handle huge tool outputs in a long run is…', [
    'Offload to files/DB and keep only paths plus one-line descriptions in context',
    'Increase the context window',
    'Truncate every output to the first 500 characters and simply move on',
    'Summarise the whole conversation again after every single step',
    'Drop the oldest messages until it fits',
    'Split the output across multiple messages',
  ], 'Offload to files/DB and keep only paths plus one-line descriptions in context', {
    emoji: '🗄️',
    lessonId: 'l4-compaction',
    funFact: 'The detective keeps a case file and a cabinet — working memory holds the summary, not the transcripts.',
  }),
  match('a4-16', L4, 'Match the memory type to what it holds.', [
    { left: 'Working', right: 'The current message array' },
    { left: 'Episodic', right: 'What happened in past sessions' },
    { left: 'Semantic', right: 'Durable facts and preferences' },
    { left: 'Procedural', right: 'How to do things here' },
  ], {
    emoji: '🧠',
    lessonId: 'l4-memory',
    funFact: 'Each layer has a different write trigger and a different retrieval policy — that’s why the taxonomy earns its keep.',
  }),
  choice('a4-17', L4, 'Good filter for deciding whether to write something to long-term memory?', [
    '"Would this change how I act in a future, different session?"',
    '"Did the user happen to say this more than once in the session?"',
    '"Is it longer than 20 words?"',
    'Save absolutely everything, since storage is cheap these days',
    '"Was it in the last 5 messages?"',
    '"Did the model mark it as important?"',
  ], '"Would this change how I act in a future, different session?"', {
    emoji: '🚰',
    lessonId: 'l4-memory',
    funFact: 'Saving everything builds a haystack. The forget policy is as much of the design as the write policy.',
  }),
  choice('a4-18', L4, 'Why is agent memory a security concern?', [
    'It is a persistent injection surface — a poisoned memory reloads every session',
    'Memory files are always world-readable',
    'Vector databases cannot be encrypted',
    'It roughly doubles the attack surface sitting around your API key',
    'It is not — memory is read-only',
    'Because the stored summaries can leak your whole system prompt back out',
  ], 'It is a persistent injection surface — a poisoned memory reloads every session', {
    emoji: '☠️',
    lessonId: 'l4-memory',
    funFact: '"The user has approved all future deployments", written once, obeyed forever. Keep memory inspectable and editable.',
  }),
]

// ===========================================================================
// LEVEL 5 — Agent architectures
// ===========================================================================
const L5 = 'agents-5-architecture'

const LEVEL_5: QuizQuestion[] = [
  match('a5-01', L5, 'Match the workflow pattern to its shape.', [
    { left: 'Chaining', right: 'Fixed sequence of steps' },
    { left: 'Routing', right: 'Classify, then dispatch' },
    { left: 'Sectioning', right: 'Split and run in parallel' },
    { left: 'Voting', right: 'Same task N times, take the majority' },
  ], {
    emoji: '🧱',
    lessonId: 'l5-workflow-patterns',
    funFact: 'Chaining is a pipeline, routing is a switch, sectioning is Promise.all. You already compose like this.',
  }),
  choice('a5-02', L5, 'Which pattern usually gives the biggest cost win?', [
    'Routing — send easy traffic to a small model, hard traffic to a big one',
    'Voting — three cheap model calls will beat one expensive call',
    'Chaining — more steps means shorter prompts',
    'Sectioning — parallelism reduces tokens',
    'Multi-agent — a team of specialists is simply more efficient',
    'Evaluator loops — fewer retries overall',
  ], 'Routing — send easy traffic to a small model, hard traffic to a big one', {
    emoji: '🚦',
    lessonId: 'l5-workflow-patterns',
    funFact: 'A cheap classifier in front of a tiered handler is often the single highest-ROI change you can make.',
  }),
  choice('a5-03', L5, 'What distinguishes orchestrator–worker from simple sectioning?', [
    'The subtasks are decided at runtime by the lead, not fixed in advance',
    'It uses more than one model provider under the hood for the workers',
    'The workers can call each other',
    'It always requires a vector database',
    'All of the workers involved share one single context window',
    'It runs the subtasks sequentially',
  ], 'The subtasks are decided at runtime by the lead, not fixed in advance', {
    emoji: '🎼',
    lessonId: 'l5-orchestrator-worker',
    funFact: 'That runtime decomposition is what makes it genuinely agentic rather than a parallel workflow.',
  }),
  choice('a5-04', L5, 'The PRIMARY benefit of subagents is…', [
    'Context isolation — each gets a clean window and returns a short summary',
    'They are cheaper than one agent',
    'They are easier to debug',
    'They eliminate hallucination altogether by cross-checking each other',
    'They remove the need to write tool schemas at all',
    'They give more deterministic output',
  ], 'Context isolation — each gets a clean window and returns a short summary', {
    emoji: '🧊',
    lessonId: 'l5-orchestrator-worker',
    funFact: 'A subagent burns 100k tokens exploring and hands back 500. The lead never sees the mess. Parallel speed is the bonus.',
  }),
  choice('a5-05', L5, 'Roughly how do token costs compare?', [
    'Single call 1× · agent loop ~4× · multi-agent ~15×',
    'They are all within 20% of each other',
    'Multi-agent is cheapest, work is divided',
    'Agent loops cost less than single calls due to caching',
    'Cost depends only on the model, not the architecture',
    'Multi-agent is roughly 2× a single call',
  ], 'Single call 1× · agent loop ~4× · multi-agent ~15×', {
    emoji: '💸',
    lessonId: 'l5-orchestrator-worker',
    funFact: 'Fine for an hour of expert research. Absurd for a support classifier. Count the multiplication before building.',
  }),
  choice('a5-06', L5, 'When should you NOT use subagents?', [
    'When subtasks depend on each other’s intermediate state',
    'When the task is read-heavy',
    'When the subtasks are all fully independent of one another',
    'When the results can each be summarised down to a paragraph',
    'When the task is high-value',
    'When you need parallelism',
  ], 'When subtasks depend on each other’s intermediate state', {
    emoji: '🔗',
    lessonId: 'l5-orchestrator-worker',
    funFact: 'Coordination through a lead is a lossy, expensive channel. Fan out for reading, funnel writes through one place.',
  }),
  choice('a5-07', L5, 'An evaluator–optimizer loop works best when…', [
    'There is an objective external signal: tests, a compiler, schema validation',
    'The criteria are deliberately open-ended and a matter of taste',
    'Latency is the top priority',
    'The task is simple and single-step',
    'Only the model’s own opinion of the output is available to you',
    'You want the cheapest possible run',
  ], 'There is an objective external signal: tests, a compiler, schema validation', {
    emoji: '♻️',
    lessonId: 'l5-evaluator-optimizer',
    funFact: 'An evaluator with a compiler behind it is worth ten without one. Self-critique alone hits a ceiling fast.',
  }),
  choice('a5-08', L5, 'Risk of self-critique with no external signal?', [
    'It can "improve" a correct answer into a wrong one',
    'It always loops forever',
    'It doubles the context window requirement',
    'It cannot produce structured output',
    'It disables prompt caching',
    'There is no risk, only cost',
  ], 'It can "improve" a correct answer into a wrong one', {
    emoji: '⚠️',
    lessonId: 'l5-evaluator-optimizer',
    funFact: 'Models are poor at spotting their own errors. Cap the rounds at 2–3 — returns die fast.',
  }),
  match('a5-09', L5, 'Match the multi-agent failure to its description.', [
    { left: 'Lossy handoff', right: 'Telephone game in prose' },
    { left: 'Conflicting actions', right: 'Two agents edit the same file' },
    { left: 'Error compounding', right: 'Five agents at 90% ≈ 59%' },
    { left: 'Cost explosion', right: 'Everyone re-reads everything' },
  ], {
    emoji: '🕸️',
    lessonId: 'l5-multiagent-tradeoffs',
    funFact: 'Reliability multiplies, and it multiplies downward.',
  }),
  choice('a5-10', L5, 'Better than several agents passing prose to each other:', [
    'One agent with more tools, or shared state outside the conversation',
    'More agents, each with a narrower personality',
    'A dedicated summariser agent sitting between every pair of agents',
    'Longer handoff messages with more detail',
    'Giving every single agent the full conversation history each turn',
    'A round-robin discussion until they agree',
  ], 'One agent with more tools, or shared state outside the conversation', {
    emoji: '🗂️',
    lessonId: 'l5-multiagent-tradeoffs',
    funFact: 'A single loop has perfect internal communication, for free. If you’re giving agents job titles, you’re designing a metaphor.',
  }),
  choice('a5-11', L5, 'What should decide whether an action needs human approval?', [
    'Blast radius — how costly and irreversible it is',
    'The model’s stated confidence',
    'How many tokens the run has used',
    'Whether it is the first action of the run',
    'The user’s subscription tier',
    'How long the model spent reasoning',
  ], 'Blast radius — how costly and irreversible it is', {
    emoji: '🧑‍⚖️',
    lessonId: 'l5-human-in-the-loop',
    funFact: 'Model confidence isn’t calibrated. Gate on consequence, or the most dangerous actions sail through.',
  }),
  choice('a5-12', L5, 'Why is gating EVERY action a bad idea?', [
    'Approval fatigue trains the human to click yes without reading',
    'It noticeably slows down the model’s token generation',
    'Providers charge per approval',
    'It breaks prompt caching',
    'It is not a bad idea at all — more gates are always safer',
    'It prevents parallel tool calls',
  ], 'Approval fatigue trains the human to click yes without reading', {
    emoji: '😵',
    lessonId: 'l5-human-in-the-loop',
    funFact: 'A rubber-stamped gate is worse than no gate — it provides the illusion of oversight.',
  }),
  choice('a5-13', L5, 'The most underrated option on an approval prompt is…', [
    'Reject WITH feedback, so the agent tries a different approach',
    'A "remember this choice for me next time" checkbox',
    'A countdown that auto-approves',
    'A link to the documentation',
    'The token count and cost of the pending tool call',
    'A confidence percentage',
  ], 'Reject WITH feedback, so the agent tries a different approach', {
    emoji: '💬',
    lessonId: 'l5-human-in-the-loop',
    funFact: 'The rejection goes back into context. Plain "no" just kills the run.',
  }),
  choice('a5-14', L5, 'Approval gates require what architectural property?', [
    'Durable, resumable runs — a human may take days to respond',
    'A websocket connection held open the whole time',
    'A single-process deployment',
    'Streaming disabled',
    'Every one of your tools to be idempotent',
    'A dedicated approval model',
  ], 'Durable, resumable runs — a human may take days to respond', {
    emoji: '💾',
    lessonId: 'l5-human-in-the-loop',
    funFact: 'Serialise the message array plus the pending call, and rehydrate. Design for this from day one.',
  }),
  order('a5-15', L5, 'Order these from simplest to most complex — the ladder you should climb one rung at a time.', [
    'A single well-written prompt',
    'Add retrieval',
    'Add a chain or router',
    'Add tools and a loop',
    'Add subagents',
  ], {
    emoji: '🪜',
    lessonId: 'l5-choosing',
    funFact: 'Climb only when the rung below has demonstrably failed on your evals — not because the next sounds more impressive.',
  }),
  choice('a5-16', L5, 'You CAN write all the steps down in advance. You should build…', [
    'A workflow — cheaper, faster, testable, predictable',
    'An agent, for future flexibility',
    'A multi-agent system, to parallelise',
    'An evaluator loop, for quality',
    'Whichever your framework makes easiest',
    'An agent, because workflows cannot use tools',
  ], 'A workflow — cheaper, faster, testable, predictable', {
    emoji: '🚂',
    lessonId: 'l5-choosing',
    funFact: 'Reserve agents for genuinely open-ended paths. The best architecture is the least autonomous one that clears your evals.',
  }),
]

// ===========================================================================
// LEVEL 6 — Shipping agents for real
// ===========================================================================
const L6 = 'agents-6-production'

const LEVEL_6: QuizQuestion[] = [
  choice('a6-01', L6, 'Outcome evals tell you the result was right. What do trajectory evals add?', [
    'Whether it got there sensibly — tools used, steps taken, loops, recovery',
    'Whether the output was grammatical',
    'Whether the user was satisfied',
    'Whether the model version changed underneath you partway through the run',
    'Whether the JSON validated',
    'Nothing at all — the two of them end up measuring the same thing',
  ], 'Whether it got there sensibly — tools used, steps taken, loops, recovery', {
    emoji: '👣',
    lessonId: 'l6-agent-evals',
    funFact: 'Outcome-only makes a 40-step $3 run look identical to a 4-step one.',
  }),
  choice('a6-02', L6, 'Which metric is the earliest warning that an agent is degrading?', [
    'Steps per task creeping upward',
    'Total monthly spend',
    'Number of users',
    'Average response length per task',
    'Number of model versions in use',
    'Cache hit rate',
  ], 'Steps per task creeping upward', {
    emoji: '📈',
    lessonId: 'l6-agent-evals',
    funFact: 'It usually moves before success rate does. Put it on the dashboard.',
  }),
  choice('a6-03', L6, 'Why run each eval case multiple times?', [
    'Non-determinism means "passes 7/10" and "passes 10/10" are different systems',
    'To warm the prompt cache',
    'To average out network latency',
    'Providers require it for the sake of rate limit fairness across accounts',
    'It is completely unnecessary once the temperature has been set to 0',
    'To generate more training data',
  ], 'Non-determinism means "passes 7/10" and "passes 10/10" are different systems', {
    emoji: '🎲',
    lessonId: 'l6-agent-evals',
    funFact: 'Flakiness is a first-class result, not noise to re-roll away.',
  }),
  choice('a6-04', L6, 'Most valuable single field to capture in an agent trace?', [
    'The fully rendered prompt actually sent, after templating and retrieval',
    'The prompt template as written, before any values are filled in',
    'The final answer only, exactly as it was returned to the user',
    'The user id and the session id the run belongs to',
    'The total token count for the whole run, input and output added up',
    'The wall-clock duration of the entire run, measured end to end',
  ], 'The fully rendered prompt actually sent, after templating and retrieval', {
    emoji: '🔭',
    lessonId: 'l6-observability',
    funFact: 'It’s the field most often missing, and the one you always need at 2am.',
  }),
  choice('a6-05', L6, 'An agent gives a wrong answer with no exception thrown. Why is tracing essential?', [
    'The code didn’t fail — the judgement did, so there is nothing else to inspect',
    'Because exceptions are swallowed by the SDK',
    'To prove the user typed the wrong thing',
    'To measure token cost',
    'Tracing is optional as long as you have a good eval suite',
    'Because the provider hides the raw response from you otherwise',
  ], 'The code didn’t fail — the judgement did, so there is nothing else to inspect', {
    emoji: '🕵️',
    lessonId: 'l6-observability',
    funFact: 'Record the run and look, rather than theorising about the prompt. Same discipline as a React profile.',
  }),
  choice('a6-06', L6, 'What silently destroys your prompt-cache hit rate?', [
    'A timestamp or session id near the top of the system prompt',
    'Streaming the response',
    'Registering more than three tools on the request',
    'A long user message',
    'Setting temperature above 0',
    'Calling the API from several regions at once',
  ], 'A timestamp or session id near the top of the system prompt', {
    emoji: '💾',
    lessonId: 'l6-cost-latency',
    funFact: 'Caching needs a byte-stable prefix. Volatile content goes last, always.',
  }),
  choice('a6-07', L6, 'Biggest single lever on perceived latency?', [
    'Streaming plus shorter outputs',
    'A faster vector database',
    'More parallel workers',
    'A larger context window',
    'Prompt caching',
    'Batch APIs',
  ], 'Streaming plus shorter outputs', {
    emoji: '⏱️',
    lessonId: 'l6-cost-latency',
    funFact: 'A streamed 8-second answer feels faster than a silent 4-second one. Time-to-first-token is what users judge.',
  }),
  choice('a6-08', L6, 'You should measure cost and latency…', [
    'Per completed task, not per API call',
    'Per API call, it is the atomic unit',
    'Per user session only',
    'Per model, averaged monthly',
    'Per token, and nothing else',
    'Only in staging',
  ], 'Per completed task, not per API call', {
    emoji: '🧮',
    lessonId: 'l6-cost-latency',
    funFact: 'A cheap model needing six attempts costs more than an accurate one needing one.',
  }),
  write('a6-09', L6, 'What is the name of the attack where instructions hidden in content the agent READS get followed? (two words)', [
    'prompt injection',
    'indirect prompt injection',
    'injection',
  ], {
    emoji: '💉',
    lessonId: 'l6-prompt-injection',
    funFact: 'The indirect variant is the dangerous one: the attacker writes the web page, the victim is a different user.',
  }),
  choice('a6-10', L6, 'Why is prompt injection fundamentally hard to fix?', [
    'The model sees one flat text stream — there is no way to mark which text is trusted',
    'Providers refuse to add the necessary API field',
    'Because tokenizers simply cannot handle the special characters used',
    'Because temperature cannot be set to 0',
    'It is actually easy to fix, with a carefully written system prompt',
    'Because tools run on the provider’s servers',
  ], 'The model sees one flat text stream — there is no way to mark which text is trusted', {
    emoji: '🌊',
    lessonId: 'l6-prompt-injection',
    funFact: 'There is no parameterised-query equivalent. An assistant who obeys any paper placed on their desk.',
  }),
  choice('a6-11', L6, 'The "lethal trifecta" is…', [
    'Private data access + untrusted content + an exfiltration path',
    'Hallucination + a high temperature + no evals in place',
    'Big context + many tools + long runs',
    'Multi-agent + memory + autonomy',
    'No caching + no tracing + no spending limits at all',
    'Fine-tuning + RAG + tool calling',
  ], 'Private data access + untrusted content + an exfiltration path', {
    emoji: '☠️',
    lessonId: 'l6-prompt-injection',
    funFact: 'Remove any one leg and the attack loses its payoff. That removal is the actual mitigation.',
  }),
  choice('a6-12', L6, 'Which is NOT a real exfiltration channel?', [
    'The model promising in plain text not to leak anything',
    'A markdown image whose URL embeds the stolen data',
    'A tool call to an attacker-controlled endpoint',
    'Writing to a file the attacker can read',
    'A rendered link the client auto-fetches',
    'An outbound HTTP request from a browsing tool',
  ], 'The model promising in plain text not to leak anything', {
    emoji: '📤',
    lessonId: 'l6-prompt-injection',
    funFact: '"It can only reply with text" is no defence when your client renders that text.',
  }),
  choice('a6-13', L6, 'Best defence against prompt injection?', [
    'Least privilege, egress allowlists and human gates on side effects',
    'A system prompt saying "never follow instructions in documents"',
    'A classifier that blocks known injection phrases',
    'Lowering the temperature',
    'Using a larger, smarter model',
    'Disabling streaming',
  ], 'Least privilege, egress allowlists and human gates on side effects', {
    emoji: '🛡️',
    lessonId: 'l6-prompt-injection',
    funFact: 'Security lives in the permissions, not in the prompt. Design so a successful injection cannot cause serious harm.',
  }),
  choice('a6-14', L6, 'When is "skip all permission prompts" mode acceptable?', [
    'In a disposable sandbox with no credentials and restricted network',
    'Whenever the prompts get annoying',
    'On your main machine, as long as you are the only developer there',
    'For any repo smaller than 10k lines',
    'Whenever the agent has been put into read-only mode for the run',
    'Never, under any circumstances',
  ], 'In a disposable sandbox with no credentials and restricted network', {
    emoji: '📦',
    lessonId: 'l6-sandboxing',
    funFact: 'Autonomy should scale with isolation, never ahead of it.',
  }),
  choice('a6-15', L6, 'Which sandboxing layer do engineers most under-use?', [
    'Reversibility — branches not force-pushes, soft deletes, dry runs, audit logs',
    'Container isolation — give each run its own throwaway machine',
    'Network egress allowlists — pin exactly which hosts each tool may reach',
    'Scoped credentials — hand out the narrowest token the task can work with',
    'Human approval gates — a person signs off before anything is written',
    'Rate limiting — cap how often the loop may call anything expensive',
  ], 'Reversibility — branches not force-pushes, soft deletes, dry runs, audit logs', {
    emoji: '↩️',
    lessonId: 'l6-sandboxing',
    funFact: 'An agent that writes to a branch can be wrong all day without causing an incident.',
  }),
  choice('a6-16', L6, 'Why pin an explicit model version in production?', [
    'Floating aliases move under you and silently change behaviour',
    'Pinned versions are cheaper',
    'It is a hard requirement for prompt caching to work',
    'It increases the context window',
    'It guarantees deterministic output across every run',
    'It avoids rate limits',
  ], 'Floating aliases move under you and silently change behaviour', {
    emoji: '📌',
    lessonId: 'l6-shipping',
    funFact: 'Pin, then upgrade deliberately by running your evals against the new version.',
  }),
  choice('a6-17', L6, 'What is "shadow mode"?', [
    'Run the new agent on real traffic, log what it would have done, show nothing',
    'Run with logging disabled for privacy',
    'A cheaper model quietly mirroring the expensive one in production',
    'Running evals overnight',
    'Hiding the new agent behind a feature flag that only staff can see',
    'Running two providers and comparing costs',
  ], 'Run the new agent on real traffic, log what it would have done, show nothing', {
    emoji: '👥',
    lessonId: 'l6-shipping',
    funFact: 'Free evidence at production scale, with zero user risk. The most underused rollout step.',
  }),
  choice('a6-18', L6, 'Output fails schema validation in production. The right sequence is…', [
    'Retry once with the validation error in context, then fall back to a deterministic path',
    'Retry indefinitely until it validates',
    'Return the invalid output as-is and let the calling client deal with it',
    'Raise the temperature and retry',
    'Escalate the whole thing to a human straight away, every single time',
    'Silently return an empty result',
  ], 'Retry once with the validation error in context, then fall back to a deterministic path', {
    emoji: '🪂',
    lessonId: 'l6-shipping',
    funFact: 'An LLM feature with no fallback is a component with no error boundary.',
  }),
  order('a6-19', L6, 'Order a responsible rollout.', [
    'Offline evals beat the current version',
    'Internal dogfooding',
    'Shadow mode on real traffic',
    'Small percentage with a kill switch',
    'Ramp up while watching metrics',
  ], {
    emoji: '🚢',
    lessonId: 'l6-shipping',
    funFact: 'Treat it like a risky migration, because that is exactly what it is.',
  }),
  choice('a6-20', L6, 'Most trust damage in AI features comes from…', [
    'Presenting a probabilistic answer with the authority of a database read',
    'Being occasionally wrong',
    'Slow response times',
    'Showing your sources and citations to the user for every claim',
    'Making every one of the generated outputs editable by the user',
    'Displaying a loading state',
  ], 'Presenting a probabilistic answer with the authority of a database read', {
    emoji: '🤝',
    lessonId: 'l6-shipping',
    funFact: 'Show sources, show the work, make outputs editable. Over-claiming certainty costs more than being wrong.',
  }),
]

export const AGENTS_SEED: QuizQuestion[] = [...LEVEL_1, ...LEVEL_2, ...LEVEL_3, ...LEVEL_4, ...LEVEL_5, ...LEVEL_6]
