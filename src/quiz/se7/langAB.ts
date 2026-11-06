// §14d — Language: Literacy Connections and Foundations of Language.
// Written by hand in session. See ./build.ts for how an idea and its versions work.
import { chapter, choice, match } from './build'

export const LANG_AB = [
  // --- 🔍 Reading the real world --------------------------------------------------
  chapter('lang-a-real', [
    ['purpose', {
      explain: [
        'Every text has a job. Ask: what is it trying to do to me?',
        'Inform: it wants me to know something.',
        'Persuade: it wants me to think or buy something.',
        'Entertain: it wants me to enjoy it.',
      ],
      video: 'lang-c-bias-v1',
      watchFor: 'What are the three big reasons an author writes?',
    }, [
      choice('“NEW Blue Lock boots! Score like Isagi! Only $89!” What is this text trying to do?', 'persuade you to buy', ['inform you about history', 'entertain you with a story', 'teach you how to play', 'warn you about a danger'], {
        emoji: '👟',
        why: 'A price and a big promise: that is an ad.',
      }),
      match('Match each text to its main job:', [
        ['a shoe ad', 'persuade'],
        ['a bus timetable', 'inform'],
        ['a funny comic', 'entertain'],
      ], { why: 'Ask what the text wants from you.' }),
      choice('A page on how volcanoes form, with diagrams. What is its main job?', 'to inform', ['to persuade', 'to entertain', 'to sell lava', 'to complain'], {
        emoji: '🌋',
        why: 'It gives you facts. Nothing to buy, no side to take.',
      }),
    ]],
    ['ad-tricks', {
      explain: [
        'Ads use tricks you can learn to spot.',
        'Bandwagon: “everyone has one!”',
        'Celebrity: a famous person says it is good.',
        'Hurry: “only today, only 3 left!” so you do not stop to think.',
      ],
      video: 'lang-d-op-v0',
    }, [
      choice('“Everyone at school already has one. Do not be left out!” Which trick is this?', 'bandwagon', ['celebrity', 'hurry-up', 'free gift', 'plain facts'], {
        emoji: '🚌',
        why: 'It says: join the crowd.',
      }),
      choice('“Only 3 left! Sale ends tonight!” What does this trick want you to do?', 'buy before you stop to think', ['read the small print first', 'compare it with other shops', 'ask a parent for some advice', 'wait for a better price later'], {
        emoji: '⏰',
        why: 'Hurry stops you from thinking it over.',
      }),
      match('Match each ad line to its trick:', [
        ['“Luffy eats these every day!”', 'celebrity'],
        ['“9 out of 10 kids have one!”', 'bandwagon'],
        ['“Last chance — ends at midnight!”', 'hurry'],
      ], { why: 'Once you can name the trick, it stops working on you.' }),
    ]],
    ['fact-opinion', {
      explain: [
        'A fact can be checked and proved.',
        'An opinion is what someone thinks or feels.',
        'Words like best, worst, should and I think often mark an opinion.',
      ],
      video: 'lang-c-bias-v1',
    }, [
      choice('Which one is a FACT?', 'Toronto is in Ontario.', ['Toronto is the best city.', 'Winters here are too cold.', 'Everyone should love hockey.', 'Summer is the nicest season.'], {
        emoji: '✅',
        why: 'You can check it on a map. The others are what someone feels.',
      }),
      choice('Which one is an OPINION?', 'Zoro is the coolest fighter.', ['Zoro uses three swords.', 'Zoro has green hair.', 'Zoro is in the Straw Hat crew.', 'Zoro joined after Luffy.'], {
        emoji: '⚔️',
        why: '“Coolest” is a feeling. You cannot prove it.',
      }),
      choice('Which word is a clue that a sentence is an opinion?', 'should', ['Monday', 'seven', 'river', 'wrote'], {
        why: 'Should, best, worst and I think are all opinion clues.',
      }),
    ]],
    ['check', {
      explain: [
        'Before you trust something online, ask three things.',
        'Who wrote it, and do they know the subject?',
        'When was it written? Is it out of date?',
        'Can I find the same fact in a second, trusted place?',
      ],
      video: 'lang-c-bias-v0',
    }, [
      choice('A post says “Sharks are not fish!” What should you do first?', 'check it in a trusted second source', ['share it fast with all of your friends', 'believe it, because it was on the internet', 'ignore everything that sharks ever did', 'write a comment and argue with the post'], {
        emoji: '🦈',
        why: 'Sharks are fish. One quick check would catch that.',
      }),
      choice('Which is the BEST source for a report on volcanoes?', 'a geology museum’s website', ['an anonymous comment online', 'a video with no named author', 'a friend’s cousin’s old post', 'an ad for volcano T-shirts'], {
        why: 'Named experts, with a reputation to protect.',
      }),
      choice('A health article is from 1985. What is the biggest worry?', 'it may be out of date', ['it may be too short', 'it may have pictures', 'it may be in English', 'it may be too polite'], {
        why: 'Facts change. Always check the date.',
      }),
    ]],
    ['ai-text', {
      explain: [
        'An AI can write something that sounds sure of itself and still be wrong.',
        'Sounding confident is not the same as being true.',
        'Treat it like a stranger’s post: check the facts somewhere trusted.',
      ],
      video: 'lang-c-bias-v1',
    }, [
      choice('An AI tells you a date for the Battle of the Plains of Abraham. What should you do?', 'check it in a book or trusted site', ['copy it straight into your report', 'ask the same AI if it is sure', 'trust it, since computers are exact', 'change it a little so it looks yours'], {
        emoji: '🤖',
        why: 'AI can make things up and sound certain.',
      }),
      choice('A text sounds very sure of itself. What does that prove?', 'nothing about whether it is true', ['it must have been written by an expert', 'it was checked by a team of teachers', 'every single fact in it is correct', 'it was written in the last few days'], {
        why: 'Confident is a style. True is something you check.',
      }),
      choice('Which is the best way to use an AI answer for homework?', 'as a start, then check it yourself', ['as your final answer, word for word', 'as proof that your teacher is wrong', 'as a way to skip doing the reading', 'as a source you never have to name'], {
        why: 'Useful first step. Never the last one.',
      }),
    ]],
  ]),

  // --- 💬 Talking about what you read ---------------------------------------------
  chapter('lang-a-talk', [
    ['claim-proof', {
      explain: [
        'A strong answer has two parts: what you think, and the line that proves it.',
        '“I think X, because the text says Y.”',
        'Without the proof, it is only a guess.',
      ],
      video: 'lang-c-main-v1',
      watchFor: 'How do key details hold up a big idea?',
    }, [
      choice('Which answer is the strongest?', '“Nami is brave: she says, ‘I’ll go first.’”', ['“Nami is brave. I just think she is.”', '“Nami is brave because I like her.”', '“Nami is brave. Everybody says so.”', '“Nami is brave, obviously, that’s all.”'], {
        emoji: '💬',
        why: 'It has a claim AND a line from the text.',
      }),
      choice('“I think X, because the text says Y.” What is Y?', 'the proof from the text', ['your own favourite part', 'the name of the author', 'the number of the page', 'a guess about the end'], {
        why: 'Y is what makes X more than a guess.',
      }),
      choice('You say the villain is lying. Your friend asks “How do you know?” What is the best reply?', 'point to the line that shows it', ['say it again a little bit louder', 'tell them to read the whole book', 'say that everybody thinks so too', 'change the subject to something else'], {
        why: 'Your proof is on the page. Show it.',
      }),
    ]],
    ['quote', {
      explain: [
        'A quotation is the writer’s exact words.',
        'Put them in quotation marks.',
        'Choose a short line that really proves your point, then say why it does.',
      ],
      video: 'lang-a-talk-v0',
    }, [
      choice('What do you put around the writer’s exact words?', 'quotation marks', ['question marks', 'round brackets', 'capital letters', 'three commas'], {
        emoji: '❝',
        why: 'They tell the reader: these are not my words.',
      }),
      choice('You quote a line. What should come next?', 'say how it proves your point', ['start a brand new topic', 'quote five more lines', 'name the book’s publisher', 'end your answer right there'], {
        why: 'A quote cannot explain itself. That is your job.',
      }),
      choice('Which is the best evidence for “The storm scared the crew”?', '“Usopp’s hands would not stop shaking.”', ['“The ship was built from good strong wood.”', '“Sanji cooked the crew a big fish stew.”', '“They had left port on a sunny Tuesday.”', '“The island was still three days away.”'], {
        emoji: '🌊',
        why: 'Only this line shows fear.',
      }),
    ]],
    ['disagree', {
      explain: [
        'In a good discussion, you can disagree with an idea without attacking the person.',
        'Try: “I see it differently, because…”',
        'Listen first. Someone else’s proof might change your mind, and that is fine.',
      ],
      video: 'lang-a-talk-v0',
    }, [
      choice('Which is the best way to disagree?', '“I see it differently, because…”', ['“That’s a really dumb idea, sorry.”', '“You obviously didn’t read the book.”', '“No. Next person, please. Moving on.”', '“Whatever you say. I don’t even care.”'], {
        emoji: '🗣️',
        why: 'It goes after the idea, gives a reason, and leaves the person alone.',
      }),
      choice('Your friend shows a line that proves you wrong. What should you do?', 'change your mind and say so', ['keep arguing until they give up', 'tell them the book is wrong', 'pretend that you never said it', 'walk away from the discussion'], {
        why: 'Changing your mind because of proof is a strength.',
      }),
      choice('What should you do while someone else is sharing their idea?', 'listen so you can answer it', ['plan what you will say next', 'whisper to the person beside you', 'read ahead in your own book', 'look for a mistake to laugh at'], {
        why: 'You cannot reply well to something you did not hear.',
      }),
    ]],
    ['connect', {
      explain: [
        'Good readers make connections.',
        'Text to self: this reminds me of my own life.',
        'Text to text: this reminds me of another book or show.',
        'Text to world: this reminds me of something real.',
      ],
      video: 'lang-a-talk-v0',
    }, [
      match('Match each thought to its connection:', [
        ['“I felt like that on my first day.”', 'text to self'],
        ['“It’s like Luffy leaving his village.”', 'text to text'],
        ['“This happened in the news last year.”', 'text to world'],
      ], { emoji: '🔗', why: 'Connections are how a story sticks.' }),
      choice('A story about moving to a new school reminds you of your own move. This is…', 'a text-to-self connection', ['a text-to-text connection', 'a text-to-world connection', 'a main idea of the story', 'a fact about the author'], {
        why: 'It connects the text to your own life.',
      }),
      choice('Why do connections help you as a reader?', 'they help you understand and remember', ['they make your reading go much faster', 'they mean that you can skip the ending', 'they prove that the writer was wrong', 'they count as a summary of the book'], {
        why: 'New ideas stick better to things you already know.',
      }),
    ]],
    ['ask', {
      explain: [
        'Thick questions make people think: why, how, what if.',
        'Thin questions have one quick answer, right there on the page.',
        'A good discussion needs thick questions.',
      ],
      video: 'lang-a-talk-v0',
    }, [
      choice('Which is a THICK question about a story?', 'Why did Sanji really go back?', ['What colour is Sanji’s suit?', 'Who is the cook on the ship?', 'How many people are on deck?', 'What day did the ship leave?'], {
        emoji: '❓',
        why: 'There is no single line that answers it. You have to think.',
      }),
      choice('“What year was the book published?” This question is…', 'thin: one quick answer', ['thick: it needs a debate', 'an opinion about the book', 'a text-to-self connection', 'a main idea of the book'], {
        why: 'One fact, one answer, done.',
      }),
      choice('Which word most often starts a thick question?', 'why', ['who', 'when', 'where', 'which'], {
        why: 'Why and how push you past the facts.',
      }),
    ]],
  ]),

  // --- 🛠️ Making something out of what you learned --------------------------------
  chapter('lang-a-make', [
    ['audience', {
      explain: [
        'Before you make something, ask who it is for.',
        'A poster for Grade 2 kids needs simple words and big pictures.',
        'A report for your teacher needs full sentences and facts.',
        'The audience changes everything you write.',
      ],
      video: 'lang-d-plan-v1',
      watchFor: 'What is the first step of the writing process?',
    }, [
      choice('You are making a safety poster for Grade 2 kids. What should it have?', 'short words and big pictures', ['long words and small print', 'lots of footnotes and dates', 'a full page of tiny writing', 'a graph of accident statistics'], {
        emoji: '🖍️',
        why: 'Your audience decides how you write it.',
      }),
      choice('What does “audience” mean when you make something?', 'the people it is made for', ['the person who wrote it', 'the place where it is kept', 'the longest part of the text', 'the day that it is due in'], {
        why: 'Ask “who is this for?” first.',
      }),
      choice('You explain the fur trade to a Grade 3 class. What should change?', 'simpler words and more examples', ['nothing, keep your grade 7 essay', 'add many more dates and treaties', 'only use the hardest vocabulary', 'read them the whole textbook aloud'], {
        why: 'Same facts, different words.',
      }),
    ]],
    ['form', {
      explain: [
        'The same facts can become different things.',
        'Poster: one big message, quick to read.',
        'Script: people speaking, for a video or a play.',
        'Explainer: steps or reasons, in order.',
      ],
      video: 'lang-d-plan-v1',
    }, [
      match('Match the form to what it is best at:', [
        ['poster', 'one big message, fast'],
        ['script', 'people speaking lines'],
        ['explainer', 'how something works, step by step'],
      ], { emoji: '🛠️', why: 'Pick the form that fits your job.' }),
      choice('You want everyone in the hallway to notice one message. Which form is best?', 'a poster', ['a long essay', 'a timeline', 'a diary entry', 'a book report'], {
        why: 'People walking past read one line and one picture.',
      }),
      choice('You want two characters to argue on video. What should you write?', 'a script', ['a poster', 'an index', 'a recipe', 'a map legend'], {
        why: 'A script is what people say out loud.',
      }),
    ]],
    ['own-words', {
      explain: [
        'To use what you read, put it in your own words.',
        'Close the book, say it out loud, then write what you said.',
        'If you can say it your way, you really understood it.',
      ],
      video: 'lang-c-main-v0',
    }, [
      choice('What is the best way to put a fact into your own words?', 'close the book and say it aloud', ['swap some words with a thesaurus', 'copy it, then change the last word', 'read it again a few more times', 'copy it and put it all in capitals'], {
        emoji: '📕',
        why: 'If it comes out of your head, it is yours.',
      }),
      choice('Original: “Beavers build dams to protect their homes.” Which is in your OWN words?', 'A dam keeps a beaver’s home safe.', ['Beavers build dams to protect homes.', 'Beavers build dams to guard their homes.', 'Beavers will build dams to protect homes.', 'Beavers built dams to protect their homes.'], {
        emoji: '🦫',
        why: 'The others are the same sentence with one tiny change.',
      }),
      choice('Why does saying it in your own words help YOU?', 'it shows that you really understand it', ['it makes the writing a lot longer', 'it lets you skip reading the source', 'it means that you never need a title', 'it gets rid of the need for any facts'], {
        why: 'You cannot reword what you do not understand.',
      }),
    ]],
    ['credit', {
      explain: [
        'Copying someone’s words or work and calling it yours is plagiarism.',
        'Facts can be used, but say where you found them.',
        'Keep a list of your sources as you go, not at the end.',
      ],
      video: 'lang-d-plan-v1',
    }, [
      choice('What is plagiarism?', 'passing off someone’s work as yours', ['reading more than one source', 'writing about the same topic', 'asking a teacher for some help', 'making a list of your sources'], {
        emoji: '🚫',
        why: 'Even by accident, it counts. Credit your sources.',
      }),
      choice('You used a photo from a museum site in your poster. What should you do?', 'name where it came from', ['say that you took it', 'cut the edges off it', 'hide it near the end', 'use it and say nothing'], {
        why: 'A small credit line is all it takes.',
      }),
      choice('When should you write down your sources?', 'as you go along', ['never, it’s optional', 'the year after', 'only if asked twice', 'once you have forgotten'], {
        why: 'Finding them again later is a pain.',
      }),
    ]],
    ['key-points', {
      explain: [
        'You cannot use everything you read. Choose.',
        'Keep what your audience really needs.',
        'Three strong points beat ten weak ones.',
      ],
      video: 'lang-c-main-v1',
    }, [
      choice('You read ten facts about volcanoes and have one small poster. What do you do?', 'pick the few that matter most', ['shrink the print to fit all ten', 'choose the ones with the most words', 'use the first ones that you read', 'leave facts out and draw a volcano'], {
        emoji: '🌋',
        why: 'A poster can carry about three facts. Choose them.',
      }),
      choice('How do you decide which facts to keep?', 'ask what your audience needs', ['keep the ones that are longest', 'keep the ones with big numbers', 'keep the last ones you found', 'keep them in alphabetical order'], {
        why: 'Your audience decides what matters.',
      }),
      choice('Which is usually stronger for a short speech?', 'three clear points', ['ten quick points', 'twenty small facts', 'one long sentence', 'no points, just jokes'], {
        emoji: '🥉',
        why: 'People remember three. They forget ten.',
      }),
    ]],
  ]),

  // --- 🔤 Spelling patterns and syllables ------------------------------------------
  chapter('lang-b-spell', [
    ['syllables', {
      explain: [
        'A syllable is one beat in a word. Clap it.',
        'Every syllable has a vowel sound.',
        'Long words are easier to spell one beat at a time: ne·ces·sa·ry.',
      ],
      video: 'lang-b-spell-v0',
      watchFor: 'How can you count the syllables in a word?',
    }, [
      choice('How many syllables are in “adventure”?', '3', ['2', '4', '5', '1'], {
        emoji: '👏',
        why: 'ad · ven · ture. Clap it.',
      }),
      choice('Every syllable must have…', 'a vowel sound', ['a silent letter', 'a double letter', 'a capital letter', 'at least four letters'], {
        why: 'No vowel sound, no beat.',
      }),
      choice('Which one splits “necessary” into its four beats?', 'ne · ces · sa · ry', ['nec · ess · ary', 'ne · cessa · ry', 'necess · a · ry', 'n · ece · ssary'], {
        why: 'Four beats. Say each one slowly as you spell it.',
      }),
    ]],
    ['ie-ei', {
      explain: [
        'A helpful rule: i before e, except after c.',
        'believe, field, piece — but receive, ceiling, deceive.',
        'Some words break the rule: weird, seize, their. Learn those by heart.',
      ],
      video: 'lang-b-spell-v2',
    }, [
      choice('Which spelling is right?', 'receive', ['recieve', 'receeve', 'reciev', 'resieve'], {
        emoji: '📬',
        why: 'After c, it is ei.',
      }),
      choice('Which spelling is right?', 'believe', ['beleive', 'belive', 'beleeve', 'bilieve'], {
        why: 'No c, so i comes before e.',
      }),
      choice('Which word breaks the “i before e” rule?', 'weird', ['field', 'piece', 'chief', 'thief'], {
        why: 'Weird is weird. Learn it by heart.',
      }),
    ]],
    ['homophones', {
      explain: [
        'Homophones sound the same but mean different things.',
        'there = a place. their = belonging to them. they’re = they are.',
        'your = belonging to you. you’re = you are.',
        'Test: say it the long way. “They are ship” is wrong, so it must be “their ship”.',
      ],
      video: 'lang-b-spell-v2',
    }, [
      choice('The crew loved ___ ship.', 'their', ['there', 'they’re', 'thier', 'theyre'], {
        emoji: '🚢',
        why: 'It belongs to them.',
      }),
      match('Match each word to what it means:', [
        ['there', 'a place'],
        ['their', 'belonging to them'],
        ['they’re', 'they are'],
      ], { why: 'Three spellings, one sound.' }),
      choice('___ going to score in the next match, Isagi!', 'You’re', ['Your', 'Yore', 'Youre', 'Yor'], {
        emoji: '⚽',
        why: 'Say it long: “You are going to score.”',
      }),
    ]],
    ['doubling', {
      explain: [
        'Short vowel + one consonant at the end? Double it before adding -ing or -ed.',
        'run → running. stop → stopped. swim → swimming.',
        'A silent e at the end? Drop it first: make → making, hope → hoping.',
      ],
      video: 'lang-b-spell-v2',
    }, [
      choice('Which spelling is right?', 'running', ['runing', 'runnig', 'runnning', 'runeing'], {
        emoji: '🏃',
        why: 'Short u + one consonant: double the n.',
      }),
      choice('Which spelling is right?', 'making', ['makeing', 'makking', 'maiking', 'makin'], {
        why: 'Drop the silent e, then add -ing.',
      }),
      choice('hope + ing = ?', 'hoping', ['hopeing', 'hopping', 'hoaping', 'hopieng'], {
        why: 'Hopping is what a rabbit does. Hoping keeps one p because of the long o.',
      }),
    ]],
    ['tricky', {
      explain: [
        'Some words trip everyone up.',
        'Necessary: one Collar, two Sleeves — one c, two s.',
        'Because: Big Elephants Can Always Understand Small Elephants.',
        'Say the silent parts in your head: Wed-nes-day, Feb-ru-ary.',
      ],
      video: 'lang-b-spell-v2',
      watchFor: 'What tricks can help you remember hard words?',
    }, [
      choice('Which spelling is right?', 'necessary', ['neccessary', 'necesary', 'neccesary', 'necessery'], {
        emoji: '👔',
        why: 'One collar, two sleeves: one c, two s.',
      }),
      choice('Which spelling is right?', 'because', ['becuase', 'becouse', 'beacuse', 'becase'], {
        why: 'Big Elephants Can Always Understand Small Elephants.',
      }),
      choice('Which spelling is right?', 'Wednesday', ['Wensday', 'Wendsday', 'Wednsday', 'Wedensday'], {
        why: 'Say it in your head as Wed-nes-day.',
      }),
    ]],
  ]),

  // --- 🧩 Prefixes, suffixes and roots ----------------------------------------------
  chapter('lang-b-vocab', [
    ['prefix', {
      explain: [
        'A prefix goes at the FRONT of a word and changes its meaning.',
        'un- and dis- mean not. re- means again.',
        'pre- means before. mis- means wrongly.',
      ],
      video: 'lang-b-vocab-v0',
      watchFor: 'Where does a prefix go, and where does a suffix go?',
    }, [
      choice('What does “re-” mean in “rewrite”?', 'again', ['not', 'before', 'wrongly', 'after'], {
        emoji: '🔁',
        why: 'Rewrite: write again. Replay: play again.',
      }),
      match('Match each prefix to its meaning:', [
        ['un-', 'not'],
        ['re-', 'again'],
        ['pre-', 'before'],
        ['mis-', 'wrongly'],
      ], { why: 'Four small pieces that unlock hundreds of words.' }),
      choice('Coach says the pass was “mistimed”. What does that mean?', 'timed wrongly', ['timed again', 'timed before', 'not timed', 'timed well'], {
        emoji: '⚽',
        why: 'mis- means wrongly.',
      }),
    ]],
    ['suffix', {
      explain: [
        'A suffix goes at the END of a word and changes its job or meaning.',
        '-less means without. -ful means full of.',
        '-able means can be done. -er can mean a person who does it.',
      ],
      video: 'lang-b-vocab-v2',
    }, [
      choice('What does “fearless” mean?', 'without fear', ['full of fear', 'a little fear', 'fear again', 'fear before'], {
        emoji: '🦁',
        why: '-less means without. Luffy is fearless.',
      }),
      choice('What does “breakable” mean?', 'it can be broken', ['it broke before', 'it cannot break', 'it breaks others', 'it is broken now'], {
        why: '-able means can be done.',
      }),
      match('Match each suffix to its meaning:', [
        ['-less', 'without'],
        ['-ful', 'full of'],
        ['-able', 'can be done'],
        ['-er', 'a person who does it'],
      ], { why: 'A suffix sits on the end and changes the word’s job.' }),
    ]],
    ['roots', {
      explain: [
        'Many long English words are built on Latin and Greek roots.',
        'port = carry. tele = far. graph = write. bio = life. aqua = water.',
        'Know the root and you can often guess the word.',
      ],
      video: 'lang-b-vocab-v1',
      watchFor: 'What do Latin and Greek roots do in English words?',
    }, [
      choice('The root “port” in “transport” means…', 'carry', ['far', 'write', 'life', 'water'], {
        emoji: '🚚',
        why: 'Transport, portable, import: all about carrying.',
      }),
      match('Match each root to its meaning:', [
        ['tele', 'far'],
        ['graph', 'write'],
        ['bio', 'life'],
        ['aqua', 'water'],
      ], { why: 'Telephone = far sound. Biography = life writing.' }),
      choice('What is a “biography”?', 'writing about a person’s life', ['a drawing of a far-off place', 'a story about water animals', 'a list of words and meanings', 'a machine for carrying things'], {
        why: 'bio = life, graph = write.',
      }),
    ]],
    ['take-apart', {
      explain: [
        'Stuck on a long word? Take it apart.',
        'Cover the prefix, cover the suffix, and find the word in the middle.',
        'un + break + able = not able to be broken.',
      ],
      video: 'lang-b-vocab-v0',
    }, [
      choice('What is the base word in “unbreakable”?', 'break', ['able', 'un', 'unbreak', 'breakable'], {
        emoji: '🧩',
        why: 'Cover un- and -able. Break is left.',
      }),
      choice('What does “unbreakable” mean?', 'cannot be broken', ['broken many times', 'broken a little', 'easy to break', 'broken again'], {
        why: 'un (not) + break + able (can be).',
      }),
      choice('What is the base word in “replaying”?', 'play', ['replay', 'lay', 'ing', 'pla'], {
        why: 'Cover re- and -ing.',
      }),
    ]],
    ['unknown', {
      explain: [
        'You can work out new words without a dictionary.',
        'Use the word parts AND the sentence around it.',
        'Try your guess in the sentence. Does it make sense?',
      ],
      video: 'lang-b-vocab-v1',
    }, [
      choice('“The ship was unseaworthy and sank near the shore.” What does “unseaworthy” mean?', 'not fit to sail on the sea', ['very good for sailing far', 'worth a lot of money', 'built beside the sea', 'sold to a new crew'], {
        emoji: '⛵',
        why: 'un (not) + sea + worthy (good enough). The sentence helps: it sank.',
      }),
      choice('“The goalkeeper’s reaction was instantaneous, and the ball never got past.” What does “instantaneous” mean?', 'happening right away', ['happening very late', 'not happening at all', 'happening by accident', 'happening every week'], {
        emoji: '🧤',
        why: 'Look inside it: instant.',
      }),
      choice('What should you do after you guess a word’s meaning?', 'try it in the sentence', ['underline it in pencil', 'skip the whole paragraph', 'copy out the word twice', 'look at the next chapter'], {
        why: 'If it makes sense there, your guess is probably right.',
      }),
    ]],
  ]),

  // --- 🧱 Sentences: subject, predicate, clauses ---------------------------------
  chapter('lang-b-sent', [
    ['subject-predicate', {
      explain: [
        'A sentence has two parts.',
        'The subject: who or what the sentence is about.',
        'The predicate: what the subject does or is.',
        'The crew | sailed at dawn.',
      ],
      video: 'lang-b-sent-v1',
      watchFor: 'What two parts does every sentence need?',
    }, [
      choice('“The tall striker scored twice.” What is the subject?', 'The tall striker', ['scored twice', 'twice', 'scored', 'tall'], {
        emoji: '⚽',
        why: 'Who is the sentence about? The tall striker.',
      }),
      choice('“Luffy ate all the meat.” What is the predicate?', 'ate all the meat', ['Luffy', 'all the meat', 'the meat', 'Luffy ate'], {
        emoji: '🍖',
        why: 'What did the subject do? Everything after Luffy.',
      }),
      match('Match each part to its job:', [
        ['subject', 'who or what it is about'],
        ['predicate', 'what they do or are'],
      ], { why: 'Every complete sentence needs both.' }),
    ]],
    ['fragment', {
      explain: [
        'A fragment is a piece of a sentence. It is missing a subject or a verb, or it is not a complete thought.',
        '“Because the ship sank.” leaves you waiting. Because the ship sank, what?',
        'Fix it by finishing the thought.',
      ],
      video: 'lang-b-sent-v2',
    }, [
      choice('Which one is a complete sentence?', 'The ship sank at noon.', ['Because the ship sank.', 'After the long storm.', 'Sailing to the island.', 'The tall, brave captain.'], {
        emoji: '🧱',
        why: 'It has a subject, a verb and a finished thought.',
      }),
      choice('“Running down the wing.” What is wrong with it?', 'it has no subject', ['it is too short', 'it has no comma', 'it has two verbs', 'nothing is wrong'], {
        why: 'Who is running? We do not know.',
      }),
      choice('Which is the best fix for “Because it was raining.”?', 'We stayed in because it was raining.', ['Because it was raining a lot outside.', 'Because, it was raining.', 'Because it was raining!', 'Because it was raining, because.'], {
        why: 'Now the thought is finished.',
      }),
    ]],
    ['run-on', {
      explain: [
        'A run-on is two sentences stuck together with no proper join.',
        '“Luffy laughed Zoro slept.” needs fixing.',
        'Use a period, or a comma with a joining word: and, but, so.',
        'A comma alone is not enough.',
      ],
      video: 'lang-b-sent-v0',
    }, [
      choice('Which one is a run-on?', 'Luffy laughed Zoro slept.', ['Luffy laughed. Zoro slept.', 'Luffy laughed, and Zoro slept.', 'Luffy laughed while Zoro slept.', 'Luffy and Zoro sat at the table.'], {
        emoji: '🏃',
        why: 'Two sentences crashing into each other.',
      }),
      choice('Which is a correct fix for “It rained, we stayed in.”?', 'It rained, so we stayed in.', ['It rained we stayed in.', 'It rained, we, stayed in.', 'It rained, we stayed in!', 'It, rained, we stayed in.'], {
        why: 'A comma alone cannot join two sentences. Add so, and or but.',
      }),
      choice('What can join two sentences with a comma?', 'a word like and, but or so', ['a capital letter on its own', 'a second comma after the first', 'an exclamation mark in between', 'nothing at all, just the comma'], {
        why: 'Comma + and / but / so.',
      }),
    ]],
    ['clauses', {
      explain: [
        'A clause has a subject and a verb.',
        'An independent clause can stand alone: “Zoro got lost.”',
        'A dependent clause cannot: “because he took a left.”',
        'Words like because, when, if and although start dependent clauses.',
      ],
      video: 'lang-b-sent-v0',
      watchFor: 'Which kind of clause can stand on its own?',
    }, [
      choice('Which one is a dependent clause?', 'when the whistle blew', ['the whistle blew loudly', 'Bachira ran very fast', 'the team won the game', 'Isagi smiled at Bachira'], {
        emoji: '🧩',
        why: 'When the whistle blew… what? It cannot stand alone.',
      }),
      choice('“Zoro got lost because he took a left.” Which part can stand alone?', 'Zoro got lost', ['because he took a left', 'because he took', 'he took a left because', 'took a left'], {
        why: 'That is the independent clause.',
      }),
      choice('Which word usually starts a dependent clause?', 'although', ['the', 'Zoro', 'ship', 'quickly'], {
        why: 'Because, when, if, although: they make a clause wait for another one.',
      }),
    ]],
    ['types', {
      explain: [
        'Simple sentence: one independent clause.',
        'Compound sentence: two independent clauses joined by and, but or so.',
        'Complex sentence: one independent clause plus a dependent clause.',
      ],
      video: 'lang-b-sent-v0',
    }, [
      match('Match each sentence to its type:', [
        ['Nami drew a map.', 'simple'],
        ['Nami drew a map, and Usopp watched.', 'compound'],
        ['When Nami drew a map, Usopp watched.', 'complex'],
      ], { emoji: '🗺️', why: 'Count the clauses and look at the joining word.' }),
      choice('“Sanji cooked, but nobody ate.” What type of sentence is this?', 'compound', ['simple', 'complex', 'a fragment', 'a run-on'], {
        why: 'Two independent clauses joined by “but”.',
      }),
      choice('“Although it rained, the match went on.” What type of sentence is this?', 'complex', ['simple', 'compound', 'a fragment', 'a run-on'], {
        why: 'A dependent clause plus an independent clause.',
      }),
    ]],
  ]),

  // --- ❗ Punctuation and capitals ----------------------------------------------------
  chapter('lang-b-punct', [
    ['commas-save', {
      explain: [
        'A comma can change the meaning of a whole sentence.',
        '“Let’s eat, Zoro.” means you are speaking to Zoro.',
        '“Let’s eat Zoro.” means Zoro is dinner.',
        'Always put a comma before the name of the person you speak to.',
      ],
      video: 'lang-b-punct-v0',
    }, [
      choice('Which sentence means you want to have a meal WITH Zoro?', '“Let’s eat, Zoro.”', ['“Let’s eat Zoro.”', '“Lets eat Zoro.”', '“Let’s, eat Zoro.”', '“Lets, eat Zoro.”'], {
        emoji: '🍽️',
        why: 'The comma saves him.',
      }),
      choice('Which one is punctuated correctly?', 'Pass the ball, Isagi!', ['Pass the ball Isagi!', 'Pass, the ball Isagi!', 'Pass the, ball Isagi!', 'Pass the ball Isagi,!'], {
        emoji: '⚽',
        why: 'A comma goes before the name of the person you are speaking to.',
      }),
      choice('Why is the comma in “Let’s eat, Zoro.” so important?', 'it shows who is being spoken to', ['it shows the sentence is a question', 'it makes the sentence a bit longer', 'it shows Zoro is the one cooking', 'it has no effect on the meaning'], {
        why: 'Without it, Zoro is on the menu.',
      }),
    ]],
    ['lists', {
      explain: [
        'Use commas to separate things in a list.',
        '“Luffy packed meat, rope, a hat and a map.”',
        'Commas also come after an opening part: “After the storm, we sailed.”',
      ],
      video: 'lang-b-punct-v1',
    }, [
      choice('Which list is punctuated correctly?', 'We packed rope, meat, maps and water.', ['We packed, rope meat maps and water.', 'We packed rope meat maps and water.', 'We packed rope, meat maps, and, water.', 'We, packed rope, meat, maps and water.'], {
        emoji: '🎒',
        why: 'A comma between each thing in the list.',
      }),
      choice('Where does the comma go? “After the match the team ate pizza.”', 'after “match”', ['after “After”', 'after “team”', 'after “ate”', 'no comma at all'], {
        emoji: '🍕',
        why: 'After an opening part, pause with a comma.',
      }),
      choice('What is a comma mainly for?', 'a small pause that keeps ideas apart', ['the end of every complete sentence', 'showing that somebody owns something', 'the start of somebody’s spoken words', 'showing a question is being asked'], {
        why: 'A period stops. A comma pauses.',
      }),
    ]],
    ['apostrophe', {
      explain: [
        'An apostrophe has two jobs.',
        'Missing letters: don’t = do not, it’s = it is.',
        'Belonging: Luffy’s hat. The hat belongs to Luffy.',
        'Trap: “its” with no apostrophe means belonging to it.',
      ],
      video: 'lang-b-punct-v1',
    }, [
      choice('Which one is correct?', 'Luffy’s hat blew away.', ['Luffys hat blew away.', 'Luffys’ hat blew away.', 'Luffy hat’s blew away.', 'Luf’fys hat blew away.'], {
        emoji: '👒',
        why: 'The hat belongs to Luffy: ’s.',
      }),
      choice('___ raining, so the match is off.', 'It’s', ['Its', 'Its’', 'It', 'Is’t'], {
        why: 'Say it long: It is raining.',
      }),
      choice('The ship lost ___ mast in the storm.', 'its', ['it’s', 'its’', 'it is', 'it'], {
        emoji: '⛵',
        why: 'Belonging to it = its. It’s always means it is.',
      }),
    ]],
    ['capitals', {
      explain: [
        'Capitals go at the start of a sentence and on the word I.',
        'Names of people, places, days and months get a capital: Toronto, Monday, July.',
        'Seasons do not: summer, winter.',
      ],
      video: 'lang-b-punct-v0',
    }, [
      choice('Which sentence uses capitals correctly?', 'On Monday, I went to Toronto.', ['on Monday, I went to Toronto.', 'On monday, I went to toronto.', 'On Monday, i went to Toronto.', 'On Monday, I Went To Toronto.'], {
        emoji: '🔠',
        why: 'Sentence start, day, I, and place name.',
      }),
      choice('Which word should NOT have a capital in the middle of a sentence?', 'summer', ['Monday', 'Canada', 'July', 'Luffy'], {
        why: 'Seasons stay small.',
      }),
      choice('Which is a proper noun, so it needs a capital?', 'Lake Ontario', ['a big lake', 'the ocean', 'a river', 'the shore'], {
        emoji: '🌊',
        why: 'A proper noun is the real name of one person, place or thing.',
      }),
    ]],
    ['speech', {
      explain: [
        'Quotation marks go around the exact words someone says.',
        'The comma or end mark goes inside the closing quotation mark.',
        'Start a new line each time a new person speaks.',
      ],
      video: 'lang-b-punct-v0',
    }, [
      choice('Which one is correct?', '“I’m the king!” shouted Luffy.', ['“I’m the king”! shouted Luffy.', 'I’m the king! “shouted Luffy.”', '“I’m the king! shouted Luffy.”', 'I’m “the king!” shouted Luffy.'], {
        emoji: '🗣️',
        why: 'Only the spoken words go inside, and the ! goes with them.',
      }),
      choice('What should you do when a new person starts speaking in a story?', 'start a new line', ['use a bigger comma', 'skip a whole page', 'use capital letters', 'stop using any quotes'], {
        why: 'It shows the reader who is talking.',
      }),
      choice('Which words go inside the quotation marks?', 'the exact words someone says', ['the name of the person speaking', 'what the character is thinking of', 'the words that describe the place', 'the title of the whole chapter'], {
        why: 'Only what they actually said.',
      }),
    ]],
  ]),

  // --- 🏷️ Parts of speech -----------------------------------------------------------
  chapter('lang-b-parts', [
    ['noun-verb', {
      explain: [
        'A noun names a person, place, thing or idea: Luffy, Toronto, ship, courage.',
        'A verb is an action or a state: run, score, is, seem.',
        'Every sentence needs a verb.',
      ],
      video: 'lang-b-parts-v1',
      watchFor: 'What job does each part of speech do?',
    }, [
      choice('Which word in the sentence is a noun? “The brave crew sailed far.”', 'crew', ['brave', 'sailed', 'far', 'the'], {
        emoji: '🏷️',
        why: 'A crew is a group of people: a thing you can name.',
      }),
      choice('Which word in the sentence is a verb? “Isagi kicked the ball hard.”', 'kicked', ['Isagi', 'ball', 'hard', 'the'], {
        emoji: '⚽',
        why: 'The action.',
      }),
      choice('Which of these is a noun that names an idea?', 'courage', ['brave', 'quickly', 'jump', 'under'], {
        why: 'You cannot touch courage, but it is still a noun.',
      }),
    ]],
    ['adjective-adverb', {
      explain: [
        'An adjective describes a noun: the red hat, a tall ship.',
        'An adverb describes a verb: he ran quickly. It says how, when or where.',
        'Many adverbs end in -ly.',
      ],
      video: 'lang-b-parts-v2',
    }, [
      choice('“The huge wave crashed loudly.” Which word is the adjective?', 'huge', ['wave', 'crashed', 'loudly', 'the'], {
        emoji: '🌊',
        why: 'It describes the noun “wave”.',
      }),
      choice('“The huge wave crashed loudly.” Which word is the adverb?', 'loudly', ['huge', 'wave', 'crashed', 'the'], {
        why: 'It says HOW the wave crashed.',
      }),
      match('Match each word to what it describes:', [
        ['adjective', 'a noun'],
        ['adverb', 'a verb'],
      ], { why: 'Adjective + noun: fast striker. Verb + adverb: ran fast.' }),
    ]],
    ['pronoun', {
      explain: [
        'A pronoun stands in for a noun, so you do not repeat it.',
        'he, she, they, it, we, you, I, him, her, them.',
        'Make sure it is clear who the pronoun means.',
      ],
      video: 'lang-b-parts-v1',
    }, [
      choice('“Nami found the map and she kept it.” Which word is a pronoun?', 'she', ['Nami', 'map', 'found', 'kept'], {
        emoji: '🗺️',
        why: 'She stands in for Nami. “It” is a pronoun too.',
      }),
      choice('What does a pronoun do?', 'it stands in for a noun', ['it describes an action', 'it joins two sentences', 'it ends a sentence', 'it shows who owns it'], {
        why: 'It saves you from saying Nami, Nami, Nami.',
      }),
      choice('“Zoro told Sanji he was wrong.” What is the problem?', 'we cannot tell who “he” is', ['“he” should be “she” here', 'the sentence has no verb', 'Zoro needs no capital', 'there is no problem here'], {
        emoji: '🤔',
        why: 'Who was wrong, Zoro or Sanji? Unclear pronouns confuse readers.',
      }),
    ]],
    ['prep-conj', {
      explain: [
        'A preposition shows where or when: on, under, behind, after, before.',
        'A conjunction joins words or sentences: and, but, or, so, because.',
      ],
      video: 'lang-b-parts-v1',
    }, [
      choice('“The treasure was under the old bridge.” Which word is the preposition?', 'under', ['treasure', 'old', 'was', 'bridge'], {
        emoji: '🌉',
        why: 'It shows where.',
      }),
      choice('“I wanted to play, but it rained.” Which word is the conjunction?', 'but', ['wanted', 'play', 'rained', 'it'], {
        why: 'It joins two sentences.',
      }),
      match('Match each word to its part of speech:', [
        ['behind', 'preposition'],
        ['because', 'conjunction'],
        ['quickly', 'adverb'],
        ['tall', 'adjective'],
      ], { why: 'Ask what job the word does.' }),
    ]],
    ['same-word', {
      explain: [
        'A word’s part of speech depends on its job in THAT sentence.',
        '“I run fast.” Run is a verb.',
        '“I went for a run.” Run is a noun.',
        'Do not look at the word alone. Look at what it is doing.',
      ],
      video: 'lang-b-parts-v2',
    }, [
      choice('“We won the match.” What part of speech is “match” here?', 'noun', ['verb', 'adverb', 'adjective', 'preposition'], {
        emoji: '⚽',
        why: 'It is a thing here. In “these socks match”, it is a verb.',
      }),
      choice('“These colours match.” What part of speech is “match” here?', 'verb', ['noun', 'adverb', 'pronoun', 'conjunction'], {
        why: 'Here it is what the colours do.',
      }),
      choice('How do you decide a word’s part of speech?', 'look at its job in the sentence', ['count how many letters it has', 'see if it has a capital letter', 'look at the word next to it', 'look it up in the book’s index'], {
        why: 'The same word can do different jobs.',
      }),
    ]],
  ]),
]
