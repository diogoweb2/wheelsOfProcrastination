// §14d — Language: Comprehension and Composition.
// Written by hand in session. See ./build.ts for how an idea and its versions work.
import { chapter, choice, match, order } from './build'

export const LANG_CD = [
  // --- 🎯 Main idea and supporting details -----------------------------------------
  chapter('lang-c-main', [
    ['topic-vs-main', {
      explain: [
        'The topic is what a text is about, in a word or two: “beavers”.',
        'The main idea is the point it makes about that topic: “Beavers change the land around them.”',
        'A main idea is a full sentence, not just a subject.',
      ],
      video: 'lang-c-main-v0',
      watchFor: 'How is a main idea different from a topic?',
    }, [
      choice('Which one is a MAIN IDEA, not just a topic?', 'Beavers reshape the land around them.', ['Beavers and their amazing river homes', 'The beaver, a Canadian animal story', 'All about beavers and their dams', 'Beavers, dams, lodges and rivers'], {
        emoji: '🎯',
        why: 'It says something ABOUT beavers. The others only name the subject.',
      }),
      match('Sort these two:', [
        ['the fur trade', 'topic'],
        ['The fur trade shaped early Canada.', 'main idea'],
      ], { why: 'A topic is a subject. A main idea is a statement about it.' }),
      choice('What does a main idea always do?', 'it makes a point about the topic', ['it names the author of the text', 'it comes in the very last line', 'it uses the hardest word in it', 'it lists every date in the text'], {
        why: 'Topic: what it is about. Main idea: what it says about that.',
      }),
    ]],
    ['find-it', {
      explain: [
        'Ask: what is the one thing the writer wants me to know?',
        'The main idea is often in the first or last sentence, but not always.',
        'Test it: does every other sentence support it?',
      ],
      video: 'lang-c-main-v0',
    }, [
      choice('“Sanji cooks for the crew. He feeds enemies who are starving. He never lets anyone go hungry.” What is the main idea?', 'Sanji makes sure nobody goes hungry.', ['Sanji is the cook on the Going Merry.', 'Sanji feeds starving enemies at sea.', 'Sanji is sometimes a very good fighter.', 'Sanji learned how to cook at a restaurant.'], {
        emoji: '🍳',
        why: 'All three sentences point to it.',
      }),
      choice('Where is the main idea of a paragraph found?', 'often first or last, but not always', ['always in the very first sentence', 'always in the very last sentence', 'only ever in the title of the text', 'never in any sentence of the text'], {
        why: 'Sometimes it is not written at all and you have to put it together.',
      }),
      choice('You think you found the main idea. How do you test it?', 'see if the other sentences support it', ['count the number of words in it', 'see if it is the longest sentence', 'check if it has a date or a name', 'see if it starts with a capital'], {
        why: 'If the details all hold it up, you have it.',
      }),
    ]],
    ['details', {
      explain: [
        'Supporting details hold up the main idea.',
        'They are facts, examples or reasons.',
        'Think of a table: the main idea is the top, and the details are the legs.',
      ],
      video: 'lang-c-main-v1',
      watchFor: 'What job do key details do?',
    }, [
      choice('Main idea: “Bachira is the most creative player.” Which detail supports it?', 'He invents moves nobody has seen.', ['He has short hair with two colours.', 'He plays on the same team as Isagi.', 'He likes to eat a lot of hot noodles.', 'He arrived at Blue Lock by the train.'], {
        emoji: '⚽',
        why: 'Only this one shows creativity.',
      }),
      choice('Think of a main idea as a tabletop. The supporting details are…', 'the legs holding it up', ['the plate sitting on it', 'the chair pulled up to it', 'the cloth laid across it', 'the room that it stands in'], {
        emoji: '🪑',
        why: 'Take the legs away and the idea falls.',
      }),
      choice('Which one is NOT a kind of supporting detail?', 'an unrelated fun fact', ['an example that shows it', 'a reason behind the idea', 'a fact that proves the idea', 'a number that backs it up'], {
        why: 'If it does not support the point, it does not belong.',
      }),
    ]],
    ['odd-one', {
      explain: [
        'Not every sentence matters equally.',
        'Some details are interesting but do not support the main idea.',
        'When you summarize, leave those out.',
      ],
      video: 'lang-c-main-v2',
    }, [
      choice('Main idea: “Plates moving causes earthquakes.” Which detail does NOT belong?', 'Canada has ten provinces.', ['Plates grind past each other.', 'Stress builds up in the rock.', 'The stress is suddenly released.', 'Waves spread out from the fault.'], {
        emoji: '🌍',
        why: 'True, but it has nothing to do with the main idea.',
      }),
      choice('Why leave a detail out of a summary if it is true?', 'it does not support the main idea', ['true facts should never be used', 'it might be too short to matter', 'summaries must not contain facts', 'it probably has a hard word in it'], {
        why: 'A summary is only the point and what holds it up.',
      }),
      choice('Main idea: “Zoro never gives up.” Which detail fits?', 'He stood up after every single hit.', ['His hair is a bright shade of green.', 'He often gets lost in new towns.', 'He likes to drink and to take naps.', 'He carries three swords in his belt.'], {
        emoji: '⚔️',
        why: 'The others are true, but none of them is about not giving up.',
      }),
    ]],
    ['summary', {
      explain: [
        'A summary is the main idea and key details, in your own words, kept short.',
        'No opinions. No small details.',
        'One test: could a friend who has not read it get the point?',
      ],
      video: 'lang-c-main-v1',
    }, [
      choice('What should go in a summary?', 'the main idea and key details', ['your opinion about the writing', 'every detail, in the same order', 'the most exciting line, copied', 'a list of the hardest words used'], {
        emoji: '📝',
        why: 'Short, in your own words.',
      }),
      choice('Which is a good summary of the story of the three little pigs?', 'Three pigs build houses; only the brick one stops the wolf.', ['I loved it. It was so funny and the wolf was really scary.', 'The first pig bought some straw from a man on a road once.', 'Once upon a time, there were three little pigs and a wolf.', 'The wolf huffed, and he puffed, and he blew the house down.'], {
        why: 'The whole story in one short line.',
      }),
      choice('What does NOT belong in a summary?', 'your own opinion', ['the main idea', 'the key events', 'who it is about', 'how it ended'], {
        why: 'A summary reports. A review gives your opinion.',
      }),
    ]],
  ]),

  // --- 🕵️ Inference — what the text does NOT say ----------------------------------
  chapter('lang-c-infer', [
    ['what-is', {
      explain: [
        'An inference is working out something the text does not say.',
        'Clues in the text + what you already know = inference.',
        'Detectives do it all day.',
      ],
      video: 'lang-c-infer-v2',
      watchFor: 'What two things do you add together to make an inference?',
    }, [
      choice('What makes an inference?', 'text clues + what you already know', ['a line copied straight from the text', 'a guess with no clues in the text', 'the opinion of the book’s author', 'a fact printed on the back cover'], {
        emoji: '🕵️',
        why: 'A guess has no clues. An inference does.',
      }),
      choice('“He left his plate full and stared at the door.” What can you infer?', 'he is worried about something', ['he has just won a large prize', 'the food tasted really great', 'he is waiting to get a refill', 'he has finished eating dinner'], {
        emoji: '🍽️',
        why: 'The text never says “worried”. The clues do.',
      }),
      choice('The text says: “Nami was angry.” Is this an inference?', 'no — it says so directly', ['yes — you had to work it out', 'yes — all sentences are', 'only if you agree with her', 'only if she is the main one'], {
        why: 'If it is written out, you are not inferring anything.',
      }),
    ]],
    ['feelings', {
      explain: [
        'Writers often show feelings instead of naming them.',
        'Clenched fists = anger. Shaking hands = fear. A slammed door = fury.',
        'Look at what the character does and says.',
      ],
      video: 'lang-c-infer-v0',
    }, [
      choice('“Usopp’s knees shook. He checked behind him twice.” How does Usopp feel?', 'scared', ['bored', 'proud', 'sleepy', 'hungry'], {
        emoji: '😨',
        why: 'Shaking and looking behind him: fear.',
      }),
      choice('“Isagi stared at the scoreboard. His fists tightened.” How does Isagi feel?', 'frustrated', ['relaxed', 'amused', 'sleepy', 'confused'], {
        emoji: '⚽',
        why: 'Tight fists show anger or frustration.',
      }),
      choice('“Chopper bounced from foot to foot, grinning at the door.” What is the best inference?', 'he is excited about what is coming', ['he has hurt one of his two feet', 'he is afraid of the open doorway', 'he wants to go away and be alone', 'he is cold and trying to get warm'], {
        emoji: '🦌',
        why: 'Bouncing and grinning: excitement.',
      }),
    ]],
    ['setting', {
      explain: [
        'You can infer where and when a story happens.',
        'Sand and waves mean a beach. Lockers and bells mean a school.',
        'The writer does not have to say it.',
      ],
      video: 'lang-c-infer-v0',
    }, [
      choice('“Bells rang. Lockers slammed. Everyone rushed past with backpacks.” Where are we?', 'in a school', ['on a ship', 'in a forest', 'in a hospital', 'on a farm'], {
        emoji: '🏫',
        why: 'Lockers, bells, backpacks. The word “school” never appears.',
      }),
      choice('“She pulled up her hood, and her breath hung in the air like smoke.” What is the weather like?', 'it is very cold outside', ['it is a hot summer day', 'it is warm and sunny out', 'it is pouring with rain', 'there is a house on fire'], {
        emoji: '❄️',
        why: 'You can only see your breath when it is cold.',
      }),
      choice('“The crew rolled with the deck, salt stinging their lips.” Where are they?', 'at sea', ['in a cave', 'on a train', 'in a city', 'on a hill'], {
        why: 'A moving deck and salt.',
      }),
    ]],
    ['evidence', {
      explain: [
        'A good inference can be proved with clues.',
        'Ask: what in the text makes me think so?',
        'If you cannot point to a clue, it is only a guess.',
      ],
      video: 'lang-c-infer-v1',
    }, [
      choice('“The dog’s bowl was full. His leash hung on its hook, covered in dust.” Which is the best inference?', 'nobody has walked the dog in a while', ['the dog went out for a walk today', 'the dog has run away from the house', 'the dog has just learned a new trick', 'the dog is very proud of its leash'], {
        emoji: '🐕',
        why: 'Dust is the clue.',
      }),
      choice('You infer a character is lying. What must you do to prove it?', 'point to clues in the text', ['say that you just feel it', 'say that the character is bad', 'find a different book to read', 'ask if your friend agrees too'], {
        why: 'Every inference needs evidence.',
      }),
      choice('Which is a guess, not an inference?', 'an idea with no clue behind it', ['an idea built from text clues', 'an idea the clues all point at', 'an idea you can show on the page', 'an idea with two clues to prove it'], {
        why: 'An inference always has clues.',
      }),
    ]],
    ['information', {
      explain: [
        'Inference works in non-fiction too.',
        'Facts in the text let you work out what is not said.',
        'Example: “Settlers moved west of the line anyway.” Inference: nobody was stopping them.',
      ],
      video: 'lang-c-infer-v1',
    }, [
      choice('“Food prices doubled the year the port froze.” What can you infer?', 'most food came in by ship', ['most food was grown in the city', 'people were not hungry that year', 'the port had been closed for good', 'the people had a very good harvest'], {
        emoji: '⛵',
        why: 'The text never says it, but only that would make prices jump.',
      }),
      choice('“Each spring, the town moves its shops to higher ground.” What can you infer?', 'the river floods in spring', ['the town likes a better view', 'the shops are not very good', 'the summers are very hot there', 'the people only shop in spring'], {
        emoji: '🌊',
        why: 'Why else would they move uphill every spring?',
      }),
      choice('“The treaty was signed in Paris. No First Nation was present.” What can you infer?', 'their land was decided without them', ['they all preferred to stay at home', 'they had agreed to it in writing', 'they had already moved out to Paris', 'France had invited all of them there'], {
        why: 'The sentence does not say it, but the facts do.',
      }),
    ]],
  ]),

  // --- ⚖️ Point of view and bias ----------------------------------------------------
  chapter('lang-c-bias', [
    ['pov', {
      explain: [
        'Point of view is who tells the story.',
        'First person: “I”, “we”. The narrator is in the story.',
        'Third person: “he”, “she”, “they”. The narrator is outside it.',
        'Second person: “you”. Rare, but used in instructions.',
      ],
      video: 'lang-c-bias-v2',
      watchFor: 'Which words give each point of view away?',
    }, [
      choice('“I grabbed the rope and jumped.” What point of view is this?', 'first person', ['second person', 'third person', 'fourth person', 'no person'], {
        emoji: '🗣️',
        why: '“I” is the giveaway.',
      }),
      choice('“She grabbed the rope and jumped.” What point of view is this?', 'third person', ['first person', 'second person', 'fourth person', 'no person'], {
        why: 'The narrator is outside the story.',
      }),
      match('Match each clue word to its point of view:', [
        ['I', 'first person'],
        ['you', 'second person'],
        ['they', 'third person'],
      ], { why: 'First is me, second is you, third is them.' }),
    ]],
    ['bias', {
      explain: [
        'Bias is leaning to one side.',
        'A biased writer picks facts and words that help their side.',
        'Everyone has some bias. The job is to spot it.',
      ],
      video: 'lang-c-bias-v1',
      watchFor: 'What is the author trying to make you think?',
    }, [
      choice('What is bias?', 'leaning toward one side', ['telling a really long story', 'using only true information', 'writing in the first person', 'spelling a word incorrectly'], {
        emoji: '⚖️',
        why: 'A biased text tries to tilt you.',
      }),
      choice('A coach describes a match only from his own team’s side. What should you expect?', 'he will favour his own team', ['he will favour the other team', 'he will give a balanced report', 'he will not mention the match', 'he will describe only the fans'], {
        emoji: '⚽',
        why: 'He may not lie, but he will lean.',
      }),
      choice('Two people describe the same fight. Both are “true”. How can that be?', 'each picks what helps their side', ['one of them is always a liar', 'they saw two different fights', 'only one of them was at the fight', 'it is not possible for this to be'], {
        why: 'Same event, different choices about what to say.',
      }),
    ]],
    ['loaded', {
      explain: [
        'Loaded words carry a feeling, not just a meaning.',
        '“Freedom fighters” and “rebels” can mean the same people.',
        '“Thrifty” is kind. “Cheap” is not.',
        'Look for the word the writer chose, and ask why.',
      ],
      video: 'lang-c-bias-v1',
    }, [
      choice('Which word makes the sentence sound the most negative? “The crew ___ the town.”', 'invaded', ['visited', 'entered', 'reached', 'toured'], {
        emoji: '🏴‍☠️',
        why: 'All of them mean “went in”, but “invaded” is loaded.',
      }),
      match('Match each pair: positive word and negative word for the same thing:', [
        ['thrifty', 'cheap'],
        ['confident', 'arrogant'],
        ['curious', 'nosy'],
      ], { why: 'Same behaviour, different feeling.' }),
      choice('In 1837, one newspaper said “patriots”. Another said “traitors”. What does this show?', 'word choice reveals each side', ['one paper made a spelling error', 'they described two different men', 'only one paper printed the news', 'both papers were on the same side'], {
        why: 'Same people. Different loaded words.',
      }),
    ]],
    ['purpose', {
      explain: [
        'Ask what the writer wants from you.',
        'To inform, persuade or entertain? Or to sell something?',
        'Who gains if you believe this?',
      ],
      video: 'lang-c-bias-v1',
    }, [
      choice('A soda company says soda helps athletes play better. What should you ask first?', 'who gains if I believe this?', ['how long is the commercial?', 'what colour is the bottle?', 'what is the athlete’s name?', 'is the music on it any good?'], {
        emoji: '🥤',
        why: 'The company gains. That is a reason to doubt it.',
      }),
      choice('A mining company’s report says its mine causes no harm. Why be careful?', 'it has a reason to say so', ['mining reports are always short', 'companies cannot write reports', 'it uses too many hard words', 'it was not printed in colour'], {
        why: 'It might be true, but check with someone who gains nothing.',
      }),
      choice('Which source is LEAST likely to be biased about a new video game?', 'an independent review site', ['the game’s own TV commercial', 'the company’s chief executive', 'a streamer paid by the game', 'the game’s own online store'], {
        why: 'The others make money if you buy it.',
      }),
    ]],
    ['missing', {
      explain: [
        'Bias can also be what a text leaves out.',
        'Ask: whose voice is missing here?',
        'Old history books often told the settlers’ story, and left out First Nations.',
      ],
      video: 'lang-c-bias-v0',
    }, [
      choice('An old textbook calls Canada “an empty land” in 1700. Whose view is missing?', 'First Nations living there', ['the French fur traders', 'the British settlers', 'the European kings', 'the textbook’s authors'], {
        emoji: '📕',
        why: 'The land was not empty. The book just did not count them.',
      }),
      choice('How can a text be biased without saying anything false?', 'by leaving out the other side', ['by using a very small font', 'by having too many pictures', 'by being written in English', 'by being too short to read'], {
        why: 'What is left out can tilt you as much as what is said.',
      }),
      choice('You read about a strike, and only the factory owner is quoted. What is the best question?', 'what would the workers say?', ['how old is the factory now?', 'who printed this newspaper?', 'how long was this article?', 'what is the owner’s name?'], {
        why: 'Always ask whose voice is missing.',
      }),
    ]],
  ]),

  // --- 🗂️ Text features and structure ------------------------------------------------
  chapter('lang-c-feat', [
    ['features', {
      explain: [
        'Text features help you find things before you read every word.',
        'Heading: what this section is about.',
        'Caption: explains a picture.',
        'Bold type: an important word.',
      ],
      video: 'lang-c-feat-v2',
      watchFor: 'What does each feature help you do?',
    }, [
      match('Match each feature to its job:', [
        ['heading', 'tells what a section is about'],
        ['caption', 'explains a picture'],
        ['bold type', 'marks an important word'],
        ['sidebar', 'adds extra information'],
      ], { emoji: '🗂️', why: 'Read the shape of the page first.' }),
      choice('You want to know what a photo shows. Where should you look?', 'the caption', ['the index', 'the glossary', 'the sidebar', 'the heading'], {
        why: 'The caption is the small text next to a picture.',
      }),
      choice('Why do writers put a word in bold?', 'to show it is important', ['to show it is misspelled', 'to fill up the empty page', 'to show it is a person’s name', 'to show it should be skipped'], {
        why: 'Bold words are often in the glossary too.',
      }),
    ]],
    ['find-fast', {
      explain: [
        'Table of contents: at the front, listing chapters in order.',
        'Index: at the back, listing topics in A–Z order with page numbers.',
        'Glossary: at the back, like a small dictionary for the book.',
      ],
      video: 'lang-c-feat-v2',
    }, [
      choice('You want to find “Tecumseh” quickly in a history book. Where should you look?', 'the index', ['the title', 'the cover', 'the caption', 'the heading'], {
        emoji: '🔎',
        why: 'The index lists topics A–Z, with pages.',
      }),
      choice('You do not know what “seigneur” means. Where in the book should you look?', 'the glossary', ['the index', 'the title page', 'the back cover', 'the contents'], {
        why: 'A glossary gives meanings. An index only gives pages.',
      }),
      match('Match each part to where it is and what it does:', [
        ['table of contents', 'front: chapters in order'],
        ['index', 'back: topics A–Z with pages'],
        ['glossary', 'back: what words mean'],
      ], { why: 'Know the tool, save the time.' }),
    ]],
    ['skim', {
      explain: [
        'Before you read, skim: title, headings, pictures, bold words.',
        'It takes one minute and tells you what the text is about.',
        'Then your brain knows where the reading is going.',
      ],
      video: 'lang-c-feat-v2',
    }, [
      choice('What should you do BEFORE you read a chapter closely?', 'skim the headings and pictures', ['read the last page very slowly', 'copy out the very first sentence', 'count how many pages there are', 'look up every word in a dictionary'], {
        emoji: '👀',
        why: 'One minute of skimming makes the rest easier.',
      }),
      choice('You need one fact from a long article. What should you do?', 'scan the headings for it', ['read the whole of it twice', 'start at the very last line', 'give up and ask a friend', 'read it out loud to someone'], {
        why: 'Use the shape of the page.',
      }),
      order('Put these steps in the best order:', ['look at the title', 'skim headings and pictures', 'read the text closely', 'check what you learned'], {
        emoji: '🪜',
        why: 'From the big picture to the details.',
      }),
    ]],
    ['structure', {
      explain: [
        'Writers organize texts in patterns.',
        'Sequence: first, next, then. Compare: both, however.',
        'Cause and effect: because, so. Problem and solution: the problem was, to fix this.',
      ],
      video: 'lang-c-feat-v1',
      watchFor: 'How many text structures are there?',
    }, [
      match('Match the signal words to the structure:', [
        ['first, next, finally', 'sequence'],
        ['because, as a result', 'cause and effect'],
        ['both, however, unlike', 'compare and contrast'],
        ['the problem was, to fix this', 'problem and solution'],
      ], { emoji: '🔑', why: 'Signal words show the pattern.' }),
      choice('“Because the river froze, the ships could not reach the port.” What is the structure?', 'cause and effect', ['sequence', 'compare and contrast', 'description', 'problem and solution'], {
        why: 'One thing made another happen.',
      }),
      choice('A recipe is usually written using which structure?', 'sequence', ['cause and effect', 'compare and contrast', 'problem and solution', 'description'], {
        emoji: '🍳',
        why: 'Steps in order.',
      }),
    ]],
    ['visuals', {
      explain: [
        'Maps, graphs, charts and diagrams carry information too.',
        'Read the title, the labels and the legend first.',
        'A diagram can explain in one look what takes a paragraph to say.',
      ],
      video: 'lang-c-feat-v0',
    }, [
      choice('What should you read first on a graph?', 'the title and the labels', ['the tallest bar on it', 'the page number at the end', 'the colour of the lines', 'the shortest bar on it'], {
        emoji: '📊',
        why: 'Otherwise you do not know what the numbers mean.',
      }),
      choice('What does a legend on a map do?', 'it explains the symbols', ['it tells an old story', 'it gives you the author', 'it shows the page number', 'it lists all the rivers'], {
        emoji: '🗺️',
        why: 'The small box that says what each symbol means.',
      }),
      choice('Which is best for showing the parts of a volcano?', 'a labelled diagram', ['a bar graph', 'a timeline', 'a glossary', 'a table of contents'], {
        emoji: '🌋',
        why: 'A picture with labels shows parts at a glance.',
      }),
    ]],
  ]),

  // --- 🔀 Comparing two texts --------------------------------------------------------
  chapter('lang-c-two', [
    ['compare-contrast', {
      explain: [
        'To compare is to find what is the same.',
        'To contrast is to find what is different.',
        'Most assignments want both.',
      ],
      video: 'lang-c-two-v1',
      watchFor: 'What is the difference between compare and contrast?',
    }, [
      match('Match each word to what it means:', [
        ['compare', 'look for what is the same'],
        ['contrast', 'look for what is different'],
      ], { emoji: '🔀', why: 'Compare finds same. Contrast finds different.' }),
      choice('“Both Luffy and Isagi want to be the best.” Is this comparing or contrasting?', 'comparing', ['contrasting', 'summarizing', 'predicting', 'inferring'], {
        why: 'It shows what is the same.',
      }),
      choice('“Luffy fights with his fists, but Zoro uses swords.” Is this comparing or contrasting?', 'contrasting', ['comparing', 'summarizing', 'predicting', 'inferring'], {
        emoji: '⚔️',
        why: 'It shows what is different.',
      }),
    ]],
    ['venn', {
      explain: [
        'A Venn diagram has two circles that overlap.',
        'The overlap is what they share.',
        'The outer parts are what is different.',
      ],
      video: 'lang-c-two-v2',
    }, [
      choice('In a Venn diagram, what goes in the middle overlap?', 'what the two things share', ['what the first one has only', 'what the second one has only', 'the titles of the two texts', 'anything that you do not know'], {
        emoji: '⭕',
        why: 'The overlap holds what is the same.',
      }),
      choice('You compare a beaver and a muskrat. Where does “both swim well” go?', 'in the overlap', ['the beaver’s circle', 'the muskrat’s circle', 'outside both circles', 'on the title line'], {
        emoji: '🦫',
        why: 'True of both.',
      }),
      choice('Where does “builds dams” go, if only the beaver does?', 'in the beaver’s outer part', ['in the very middle overlap', 'in the muskrat’s outer part', 'outside of both of the circles', 'on the title line at the top'], {
        why: 'It is only true of one.',
      }),
    ]],
    ['signal', {
      explain: [
        'Signal words help you show what you are doing.',
        'Same: both, also, similarly, in the same way.',
        'Different: but, however, unlike, on the other hand.',
      ],
      video: 'lang-c-two-v1',
    }, [
      choice('Which word signals a DIFFERENCE?', 'however', ['both', 'also', 'similarly', 'likewise'], {
        emoji: '↔️',
        why: 'However, but, unlike: they turn the sentence around.',
      }),
      choice('Which word signals something the SAME?', 'similarly', ['however', 'unlike', 'but', 'although'], {
        why: 'Similarly, both, also: they join two things.',
      }),
      choice('Complete: “Lower Canada kept French law; ___, Upper Canada used English law.”', 'however', ['similarly', 'likewise', 'also', 'in the same way'], {
        why: 'The second half differs from the first.',
      }),
    ]],
    ['same-event', {
      explain: [
        'Two writers can tell one event in very different ways.',
        'Look at what each one includes, leaves out and how each one feels.',
        'The gap between them is where you learn the most.',
      ],
      video: 'lang-c-two-v0',
    }, [
      choice('Text A: “Heroic soldiers defended the fort.” Text B: “Invaders seized the fort.” What differs most?', 'the side each writer is on', ['the year that the fort fell', 'the name of the town nearby', 'the number of the soldiers', 'the length of each sentence'], {
        emoji: '🏰',
        why: 'Same event. Their word choices show their side.',
      }),
      choice('When two accounts disagree, what is the best thing to do?', 'look at who wrote each and why', ['believe the one that is longer', 'believe the one you read first', 'throw out both of the accounts', 'pick the one you like the most'], {
        why: 'Ask who they are, what they saw, and what they want.',
      }),
      choice('Which is the best question to ask when comparing two texts?', 'what does one say that the other doesn’t?', ['which text has the bigger title on it?', 'which of the two has more pictures?', 'which was the first text that I read?', 'which of the two has the most words?'], {
        why: 'The gap is where the interesting part is.',
      }),
    ]],
    ['primary', {
      explain: [
        'A primary source was made at the time, by someone who was there: a letter, a diary, a photo.',
        'A secondary source was made later, about the event: a textbook, a documentary.',
        'Primary is close but one person’s view. Secondary is wider but second-hand.',
      ],
      video: 'lang-c-two-v2',
    }, [
      match('Sort each source:', [
        ['a soldier’s diary from 1812', 'primary source'],
        ['a textbook on the War of 1812', 'secondary source'],
      ], { emoji: '📜', why: 'Was it made at the time, by someone who was there?' }),
      choice('Which of these is a primary source about the Irish famine ships?', 'a letter from a passenger', ['a chapter in a textbook', 'a documentary made in 2015', 'a website about the famine', 'a teacher’s lesson notes'], {
        why: 'Written by someone who was there.',
      }),
      choice('What is a weakness of a primary source?', 'it shows only one person’s view', ['it was written too long afterwards', 'it was made by a modern historian', 'it can never be useful to anyone', 'it was not made at the time at all'], {
        why: 'One witness only saw one corner of the event.',
      }),
    ]],
  ]),

  // --- 🗒️ Planning a piece of writing ------------------------------------------------
  chapter('lang-d-plan', [
    ['purpose', {
      explain: [
        'Before writing, answer two questions.',
        'What is my purpose: to inform, persuade or entertain?',
        'Who is my audience?',
        'Those two answers decide everything else.',
      ],
      video: 'lang-d-plan-v1',
      watchFor: 'What steps does the writing process have?',
    }, [
      choice('What two things should you decide before you start writing?', 'purpose and audience', ['font and margin size', 'title and page count', 'pen and paper colour', 'date and page number'], {
        emoji: '🎯',
        why: 'Why am I writing, and who for?',
      }),
      choice('You are writing to convince the principal to change the lunch menu. What is your purpose?', 'to persuade', ['to entertain', 'to summarize', 'to describe', 'to narrate'], {
        emoji: '🍕',
        why: 'You want to change a mind.',
      }),
      choice('Same topic, new audience: your friends, not the principal. What changes the most?', 'your tone and your words', ['the spelling of the words', 'the rules of punctuation', 'the facts about the menu', 'the name of your school'], {
        why: 'Different reader, different voice.',
      }),
    ]],
    ['brainstorm', {
      explain: [
        'Brainstorming means getting ideas out fast, without judging them.',
        'Lists, webs and sketches all work.',
        'Sort them later. First, get them all out.',
      ],
      video: 'lang-d-plan-v1',
    }, [
      choice('What is the rule while you are brainstorming?', 'write everything; judge it later', ['write only your very best ideas', 'stop once you have one good idea', 'fix all your spelling as you go', 'use full sentences and paragraphs'], {
        emoji: '🌪️',
        why: 'Judging slows you down. Do that afterwards.',
      }),
      choice('You have no idea what to write. What should you do first?', 'list anything on the topic', ['wait until you feel inspired', 'write a perfect first sentence', 'copy someone else’s opening', 'start with the conclusion'], {
        why: 'Starting small beats staring at the page.',
      }),
      choice('Which is a brainstorming tool?', 'a web of connected ideas', ['a finished final draft', 'a spelling test paper', 'a bibliography page', 'a table of contents'], {
        emoji: '🕸️',
        why: 'A web shows how ideas link together.',
      }),
    ]],
    ['outline', {
      explain: [
        'An outline is the skeleton of your writing.',
        'Idea → three main points → the order they go in.',
        'Five minutes on this saves forty later.',
      ],
      video: 'lang-d-para-v0',
    }, [
      choice('What is an outline?', 'the plan of your main points', ['the final copy of your text', 'the list of words you misspell', 'the title page of your essay', 'a drawing around the edge'], {
        emoji: '🦴',
        why: 'A skeleton: shape first, details later.',
      }),
      choice('Why bother with an outline?', 'it saves time and keeps you on track', ['teachers need extra paper to mark', 'it makes the writing a lot longer', 'it means you do not have to revise', 'it is the same as a finished essay'], {
        why: 'You will not get lost in the middle.',
      }),
      order('Put the writing steps in order:', ['plan', 'draft', 'revise', 'edit', 'publish'], {
        emoji: '🪜',
        why: 'Plan → draft → revise → edit → publish.',
      }),
    ]],
    ['order', {
      explain: [
        'Choose an order that helps the reader.',
        'Time order for a story or events.',
        'Most important first (or last) for persuading.',
        'Grouped by topic for reports.',
      ],
      video: 'lang-d-plan-v1',
    }, [
      choice('You are writing how to make pancakes. Which order fits?', 'step by step, in time order', ['most delicious part first', 'grouped by colour of food', 'in alphabetical order', 'largest ingredient first'], {
        emoji: '🥞',
        why: 'Instructions need time order.',
      }),
      choice('You are writing about the causes of the War of 1812. Which is a good way to group your points?', 'one cause in each paragraph', ['one word in each paragraph', 'all causes in one sentence', 'in order of the longest word', 'with the conclusion first'], {
        why: 'One idea, one paragraph.',
      }),
      choice('You are persuading. Where should your strongest point go?', 'where the reader will remember it', ['hidden in the very middle part', 'in a tiny footnote at the bottom', 'nowhere, keep it for next time', 'only in the title of your piece'], {
        why: 'Usually first or last.',
      }),
    ]],
    ['organizers', {
      explain: [
        'Graphic organizers are planning tools.',
        'Web: ideas around a centre. Venn diagram: comparing. Timeline: events in order.',
        'Pick the one that fits the job.',
      ],
      video: 'lang-d-plan-v1',
    }, [
      match('Match each job to the best organizer:', [
        ['comparing two people', 'Venn diagram'],
        ['events in order', 'timeline'],
        ['ideas around a topic', 'web'],
      ], { emoji: '🧭', why: 'The right shape makes the plan easy.' }),
      choice('You are planning a report on the Rebellions of 1837, in order. Which should you use?', 'a timeline', ['a Venn diagram', 'a bar graph', 'a recipe card', 'a glossary'], {
        why: 'Events in order.',
      }),
      choice('Which organizer fits “Luffy vs. Isagi: how are they the same and different?”', 'a Venn diagram', ['a timeline', 'a web', 'a flow chart', 'a bar graph'], {
        why: 'Two circles. The overlap is what is the same.',
      }),
    ]],
  ]),

  // --- 🧱 Paragraphs that hold together ----------------------------------------------
  chapter('lang-d-para', [
    ['one-idea', {
      explain: [
        'One paragraph, one main idea.',
        'A new idea means a new paragraph.',
        'If a sentence is about something else, it belongs elsewhere.',
      ],
      video: 'lang-d-para-v1',
      watchFor: 'What is a paragraph?',
    }, [
      choice('How many main ideas should a paragraph have?', 'one', ['two', 'three', 'five', 'as many as fit'], {
        emoji: '☝️',
        why: 'One idea, then a new paragraph.',
      }),
      choice('You are writing about Sanji’s cooking, and you want to bring up Nami’s maps. What should you do?', 'start a new paragraph', ['add it to the same sentence', 'put it in the same paragraph', 'put it in brackets right there', 'use a longer sentence for it'], {
        emoji: '↩️',
        why: 'New idea, new paragraph.',
      }),
      choice('“Beavers build dams. Dams make ponds. My cousin has a dog. Ponds protect their lodges.” Which sentence does not belong?', 'My cousin has a dog.', ['Beavers build dams.', 'Dams make ponds.', 'Ponds protect their lodges.', 'They all belong there.'], {
        emoji: '🦫',
        why: 'It has nothing to do with the main idea.',
      }),
    ]],
    ['topic-sentence', {
      explain: [
        'A topic sentence tells the reader what the paragraph is about.',
        'It usually comes first.',
        'It makes a point, not a promise like “I will tell you about…”.',
      ],
      video: 'lang-d-para-v0',
    }, [
      choice('Which is the best topic sentence?', 'Canals changed how goods moved.', ['This paragraph is about canals.', 'I will now write about canals.', 'Have you ever seen a big canal?', 'Canals. They are the next topic.'], {
        emoji: '✍️',
        why: 'It makes a point. The others just announce a topic.',
      }),
      choice('Where does a topic sentence usually go?', 'at the start of the paragraph', ['in the middle of the paragraph', 'at the end of the whole essay', 'in the title of the whole piece', 'at the very bottom of the page'], {
        why: 'It tells the reader what is coming.',
      }),
      choice('What does a topic sentence do?', 'it states the paragraph’s main idea', ['it gives the very last detail', 'it lists all the sources used', 'it tells the reader the date', 'it thanks the reader for reading'], {
        why: 'Every other sentence backs it up.',
      }),
    ]],
    ['pee', {
      explain: [
        'A strong paragraph has a pattern: point, evidence, explain.',
        'Point: what you are saying.',
        'Evidence: a fact, example or quote.',
        'Explain: how the evidence proves your point.',
      ],
      video: 'lang-d-para-v2',
    }, [
      order('Put the parts of a strong paragraph in order:', ['point', 'evidence', 'explain'], {
        emoji: '🧱',
        why: 'Say it, prove it, explain it.',
      }),
      match('Match each sentence to its job:', [
        ['Tecumseh was a vital ally.', 'point'],
        ['He helped Brock capture Detroit.', 'evidence'],
        ['Without him, Upper Canada might have fallen.', 'explain'],
      ], { emoji: '⚔️', why: 'Point, evidence, explain.' }),
      choice('You wrote a point and a quote. What is still missing?', 'how the quote proves your point', ['a second, different main idea', 'a joke to keep people reading', 'a list of all of your sources', 'nothing, the quote says it all'], {
        why: 'The “explain” step is the one people skip.',
      }),
    ]],
    ['transitions', {
      explain: [
        'Transition words link sentences and ideas.',
        'Adding: also, in addition. Contrast: however, but.',
        'Time: first, then, later. Result: so, as a result.',
      ],
      video: 'lang-d-para-v1',
    }, [
      choice('“The river froze. ___, the ships could not reach the port.”', 'As a result', ['For example', 'In addition', 'On the other hand', 'Similarly'], {
        emoji: '🧊',
        why: 'One thing caused the other.',
      }),
      match('Match each word to its job:', [
        ['however', 'shows a contrast'],
        ['first', 'shows time'],
        ['for example', 'gives an example'],
        ['therefore', 'shows a result'],
      ], { why: 'Transitions are road signs for readers.' }),
      choice('Why use transition words?', 'they guide the reader between ideas', ['they make paragraphs a lot longer', 'they replace the main idea itself', 'they are needed in every sentence', 'they stop you from needing evidence'], {
        why: 'They show how one idea leads to the next.',
      }),
    ]],
    ['ending', {
      explain: [
        'A paragraph should finish, not just stop.',
        'A closing sentence wraps up the idea or leads to the next one.',
        'It should not bring in a brand new idea.',
      ],
      video: 'lang-d-para-v2',
    }, [
      choice('What does a good closing sentence do?', 'it wraps up the paragraph’s idea', ['it starts a brand new topic', 'it repeats the title twice', 'it asks the reader for help', 'it adds another new detail'], {
        emoji: '🎀',
        why: 'It ties a bow on the idea.',
      }),
      choice('Which is the best closing sentence for a paragraph about why beavers matter?', 'Without beavers, the wetlands would dry up.', ['Also, beavers have very big orange teeth.', 'Next I will talk about the Canada goose.', 'That is all that I have to say about that.', 'Beavers, beavers, beavers: what a big topic!'], {
        emoji: '🦫',
        why: 'It sums up why they matter.',
      }),
      choice('What should a closing sentence NOT do?', 'bring in a brand new idea', ['finish off the main idea', 'link to the next paragraph', 'remind the reader of the point', 'sound like a final thought'], {
        why: 'New ideas need a new paragraph.',
      }),
    ]],
  ]),

  // --- 📚 Narrative writing ----------------------------------------------------------
  chapter('lang-d-narr', [
    ['hook', {
      explain: [
        'A hook grabs the reader in the first line.',
        'Start in the middle of the action, with a surprise or a question.',
        'Do not start with waking up.',
      ],
      video: 'lang-d-narr-v1',
      watchFor: 'What does a narrative need?',
    }, [
      choice('Which is the best hook?', 'The ship was already sinking when Nami woke.', ['Hello, my name is Nami and this is my story.', 'One day, Nami got up and had some breakfast.', 'This is a story about a girl who likes maps.', 'It was a normal, average day on a normal ship.'], {
        emoji: '🪝',
        why: 'Trouble in line one. You have to read on.',
      }),
      choice('What is a hook for?', 'to make the reader want to keep going', ['to tell the reader how the story ends', 'to list all of the story’s characters', 'to explain the author’s favourite food', 'to show the reader the story’s length'], {
        why: 'If the first line is dull, the rest does not get a chance.',
      }),
      choice('Which of these is usually a WEAK way to start a story?', 'the alarm clock goes off', ['a shout from the dark', 'a door blows open', 'a strange letter arrives', 'the ground starts shaking'], {
        emoji: '⏰',
        why: 'Waking up is the most overused start there is.',
      }),
    ]],
    ['plot', {
      explain: [
        'Most stories follow the same shape.',
        'Beginning: who, where, what is normal.',
        'Problem: something goes wrong.',
        'Climax: the moment of highest tension.',
        'Ending: how it is resolved.',
      ],
      video: 'lang-d-narr-v1',
    }, [
      order('Put the parts of a plot in order:', ['introduce the characters', 'a problem appears', 'things get harder', 'the climax', 'the resolution'], {
        emoji: '📈',
        why: 'Up the hill to the climax, then down to the ending.',
      }),
      choice('What is the climax of a story?', 'the moment of highest tension', ['the very first sentence of it', 'the list of the characters', 'the part after the ending', 'a quiet scene in the middle'], {
        why: 'The fight, the penalty, the moment it all turns on.',
      }),
      choice('In a Blue Lock match, which moment is the climax?', 'the final shot in extra time', ['the players getting on the bus', 'the coach reading out the team', 'the fans leaving the stadium', 'the team warming up at the start'], {
        emoji: '⚽',
        why: 'That is the moment everything has been building to.',
      }),
    ]],
    ['conflict', {
      explain: [
        'No problem, no story.',
        'Conflict is what stands in the character’s way.',
        'It can be another person, nature, or something inside them.',
      ],
      video: 'lang-d-narr-v2',
    }, [
      match('Match each conflict to its type:', [
        ['Luffy fights a warlord', 'person against person'],
        ['The crew survives a storm', 'person against nature'],
        ['Isagi doubts himself', 'person against self'],
      ], { emoji: '🥊', why: 'Three kinds of trouble.' }),
      choice('Why does a story need conflict?', 'without a problem, nothing happens', ['it makes the story a lot shorter', 'it tells you who wrote the story', 'it helps to fill up the first page', 'it is what makes the ending happy'], {
        why: 'Readers stay to see how it gets solved.',
      }),
      choice('“Sam was happy. Everything went well. Then he went to bed.” What is missing?', 'a conflict', ['a character', 'a setting', 'a verb', 'a capital'], {
        why: 'Nothing went wrong, so nothing happened.',
      }),
    ]],
    ['show', {
      explain: [
        '“Show, don’t tell.”',
        'Telling: “She was scared.”',
        'Showing: “Her hands shook as she reached for the door.”',
        'Let the reader work it out, and they will feel it.',
      ],
      video: 'lang-d-narr-v0',
      watchFor: 'How can details make a reader see a scene?',
    }, [
      choice('Which one SHOWS instead of tells?', 'His hands shook as he took the shot.', ['He was very, very nervous about it.', 'He was feeling nervous at that time.', 'He felt the most nervous he had been.', 'He was nervous, and that was a fact.'], {
        emoji: '🎬',
        why: 'You saw it, so you felt it.',
      }),
      choice('Which is the best way to show that a character is tired?', 'she blinked and her head dipped', ['she was tired and needed sleep', 'she was very tired that evening', 'she felt so tired that day', 'tiredness was what she felt'], {
        why: 'Actions show. Naming the feeling tells.',
      }),
      choice('Which sense does this use? “Salt stung his cracked lips.”', 'taste and touch', ['sight only', 'hearing only', 'smell only', 'no sense at all'], {
        emoji: '🧂',
        why: 'Sense details put the reader in the scene.',
      }),
    ]],
    ['dialogue', {
      explain: [
        'Dialogue shows who a person is.',
        'People do not speak in perfect essays.',
        'Keep it short, and new speaker, new line.',
      ],
      video: 'lang-d-narr-v1',
    }, [
      choice('Which line sounds most like real speech?', '“Run! Now! Don’t look back!”', ['“I think that we should run at this moment.”', '“It would be wise for us to leave this place.”', '“Running is, in my opinion, the best choice.”', '“Let us now proceed to run out the door.”'], {
        emoji: '💬',
        why: 'People in danger do not use long sentences.',
      }),
      choice('What can good dialogue show about a character?', 'who they are and how they feel', ['the story’s total word count', 'the name of the story’s author', 'the book’s date of publication', 'the number of chapters in it'], {
        why: 'How someone talks tells you who they are.',
      }),
      choice('Two characters are talking. How do you show who is speaking?', 'a new line for each speaker', ['all of it in one long line', 'a different colour of ink', 'a capital on every word', 'a page break after a line'], {
        why: 'New speaker, new line.',
      }),
    ]],
  ]),

  // --- 📣 Opinion and persuasive writing ---------------------------------------------
  chapter('lang-d-op', [
    ['claim', {
      explain: [
        'A claim is your position, stated clearly.',
        'It has to be something someone could disagree with.',
        '“Dogs are animals” is not a claim. “Every school should have a therapy dog” is.',
      ],
      video: 'lang-d-op-v0',
      watchFor: 'What is persuasive writing trying to do?',
    }, [
      choice('Which one is a claim that you could argue?', 'School should start at 10 a.m.', ['School is a kind of a building.', 'School starts in early September.', 'My school has a brown front door.', 'There are many schools in Ontario.'], {
        emoji: '📣',
        why: 'Someone could disagree. The others are just facts.',
      }),
      choice('What does a good claim need?', 'someone could disagree with it', ['it must be a proven fact', 'it must be a question', 'it must be very short', 'it must use a big word'], {
        why: 'If nobody can disagree, there is nothing to argue.',
      }),
      choice('Which is the clearest claim?', 'Our class should get a longer recess.', ['Recess is something I guess some like.', 'Maybe recess could possibly be okay.', 'Some people think things about recess.', 'I might say something about recess.'], {
        why: 'Clear position, no hedging.',
      }),
    ]],
    ['reasons', {
      explain: [
        'A claim needs reasons, and reasons need proof.',
        'Claim + reason + proof.',
        'Shouting louder is not proof.',
      ],
      video: 'lang-d-op-v2',
    }, [
      order('Put the parts of an argument in order:', ['claim', 'reason', 'proof'], {
        emoji: '🧱',
        why: 'Say what you think, say why, show it.',
      }),
      choice('Claim: “We need more bike lanes.” Which is the strongest proof?', 'A city study found crashes fell by 40%.', ['Bike lanes are really good, trust me.', 'Everybody in my family agrees with it.', 'I saw a nice bike on the road last week.', 'People should just stop being so silly.'], {
        emoji: '🚲',
        why: 'A number from a study beats a feeling.',
      }),
      choice('Which of these counts as proof?', 'a fact, example or expert', ['writing in capital letters', 'saying it three more times', 'calling the others silly', 'a really long title on it'], {
        why: 'Proof can be checked.',
      }),
    ]],
    ['counter', {
      explain: [
        'A counterargument is what the other side would say.',
        'Mention it, then answer it.',
        '“Some say it costs too much. However, it saves money over time.”',
        'It makes you look fair and makes your argument stronger.',
      ],
      video: 'lang-d-op-v1',
    }, [
      choice('What is a counterargument?', 'what the other side would say', ['your own very strongest reason', 'the last line of your opening', 'a list of the sources you used', 'an opinion nobody at all holds'], {
        emoji: '🥊',
        why: 'Answering it first takes away its power.',
      }),
      choice('Why mention the other side in your own argument?', 'to answer it and look fair', ['to confuse all of your readers', 'to make your essay a bit longer', 'to change your claim at the end', 'to prove that your claim is wrong'], {
        why: 'Ignoring it looks weak.',
      }),
      choice('Which sentence handles a counterargument best?', 'Some say it’s pricey; however, it saves money.', ['Anyone who says it’s pricey is just silly.', 'Nobody could ever have a problem with this.', 'Some say it’s pricey, and I guess they win.', 'I won’t talk about what other people think.'], {
        why: 'Name it, then answer it.',
      }),
    ]],
    ['techniques', {
      explain: [
        'Writers use tools to persuade.',
        'Repetition: saying a key idea again.',
        'A question to the reader: “Would you want that?”',
        'Strong facts, and real stories that make people care.',
      ],
      video: 'lang-d-op-v0',
    }, [
      choice('“Would YOU want to study on an empty stomach?” What tool is this?', 'a question to the reader', ['a counterargument here', 'a topic sentence here', 'a statistic from a study', 'a primary source quote'], {
        emoji: '❓',
        why: 'It pulls the reader in.',
      }),
      choice('“Every child. Every day. Every school.” What tool is this?', 'repetition', ['a statistic', 'a quotation', 'a footnote', 'a caption'], {
        why: 'Repeating words makes them stick.',
      }),
      choice('A speech tells a real story about one child. Why might that persuade people?', 'people care about real stories', ['stories are always true facts', 'it means no facts are needed', 'it makes the speech shorter', 'nobody ever listens to numbers'], {
        why: 'One real story can do more than a list of numbers.',
      }),
    ]],
    ['tone', {
      explain: [
        'Persuade with respect.',
        'Insults make people stop listening.',
        'Write to the reader you want to win over.',
      ],
      video: 'lang-d-op-v1',
    }, [
      choice('You are writing to the principal. Which line is better?', '“Please consider a later start.”', ['“You’re wrong and you know it.”', '“This school is terrible now.”', '“Only a fool would disagree.”', '“Fix this right now, or else!”'], {
        emoji: '🙂',
        why: 'Respect keeps your reader listening.',
      }),
      choice('Why do insults weaken an argument?', 'people stop listening to you', ['they make your essay too long', 'they are hard to spell correctly', 'they need too much evidence', 'they always have to be quoted'], {
        why: 'You want to change a mind, not win a fight.',
      }),
      choice('Which ending is the strongest?', 'A clear call to act, tied to your claim', ['A brand new reason you have just thought of', 'An apology for having an opinion at all', 'A list of everyone who disagrees with you', 'A joke that has nothing to do with the rest'], {
        why: 'Tell the reader what to do next.',
      }),
    ]],
  ]),

  // --- ✏️ Revising and editing -------------------------------------------------------
  chapter('lang-d-edit', [
    ['revise-edit', {
      explain: [
        'Revising changes the ideas: add, cut, move, make it clearer.',
        'Editing fixes the small stuff: spelling, punctuation, capitals.',
        'Revise first. There is no point fixing a sentence you are going to cut.',
      ],
      video: 'lang-d-edit-v2',
      watchFor: 'What is the difference between revising and editing?',
    }, [
      match('Match each job to revising or editing:', [
        ['moving a paragraph to make more sense', 'revising'],
        ['fixing a spelling mistake', 'editing'],
      ], { emoji: '✏️', why: 'Big changes are revising. Small fixes are editing.' }),
      choice('Which should you do first?', 'revise, then edit', ['edit, then revise', 'publish, then edit', 'edit, then plan', 'neither of them'], {
        why: 'Do not polish what you might cut.',
      }),
      choice('You add a whole new example to your essay. Is that revising or editing?', 'revising', ['editing', 'publishing', 'plagiarising', 'brainstorming'], {
        why: 'You changed the ideas.',
      }),
    ]],
    ['cut', {
      explain: [
        'Most first drafts have too many words.',
        'Cut anything that repeats or adds nothing.',
        'Cut 10% and it often gets better.',
      ],
      video: 'lang-d-edit-v2',
    }, [
      choice('Which is the tightest version?', 'Isagi scored.', ['Isagi scored a goal into the net.', 'In the end, Isagi did score one.', 'Isagi was the one who scored it.', 'It was Isagi who then scored.'], {
        emoji: '✂️',
        why: 'Same meaning. Fewer words.',
      }),
      choice('Which words can be cut? “In my opinion, I think that the ending was sad.”', '“In my opinion”', ['“the ending”', '“was sad”', '“the ending was”', '“sad”'], {
        why: '“I think” already says it.',
      }),
      choice('Why cut words from your own writing?', 'tighter writing is clearer and stronger', ['teachers always want a shorter paper', 'there’s a limit of a hundred words', 'long words are not allowed in essays', 'cutting fixes all of your spelling'], {
        why: 'Every word should earn its place.',
      }),
    ]],
    ['read-aloud', {
      explain: [
        'Read your writing aloud.',
        'Your ears catch what your eyes skip.',
        'If you stumble or run out of breath, fix that sentence.',
      ],
      video: 'lang-d-edit-v1',
    }, [
      choice('What is the best quick way to catch a clumsy sentence?', 'read it out loud', ['print it in a bigger size', 'write it out in pencil', 'copy it out two times', 'add some more commas'], {
        emoji: '🔊',
        why: 'Your ears catch what your eyes skip.',
      }),
      choice('You run out of breath reading a sentence aloud. What does that mean?', 'it may be too long', ['it must be perfect', 'it needs more words', 'it has been plagiarised', 'you need a new topic'], {
        why: 'Split it in two.',
      }),
      choice('Why take a break before you check your own work?', 'fresh eyes spot more mistakes', ['tired eyes work a lot better', 'the mistakes fix themselves', 'it makes the essay get shorter', 'teachers require a break first'], {
        why: 'Right after writing, you see what you meant, not what you wrote.',
      }),
    ]],
    ['cups', {
      explain: [
        'Check four things when editing: CUPS.',
        'Capitals. Usage (does the grammar sound right?).',
        'Punctuation. Spelling.',
        'Go through once for each.',
      ],
      video: 'lang-d-edit-v1',
      watchFor: 'What should you check for when you edit?',
    }, [
      match('What does CUPS stand for?', [
        ['C', 'capitals'],
        ['U', 'usage'],
        ['P', 'punctuation'],
        ['S', 'spelling'],
      ], { emoji: '☕', why: 'Four passes, one thing at a time.' }),
      choice('“luffy and zoro goes to the island.” What needs fixing?', 'capitals and the verb', ['spelling and commas', 'nothing, it is correct', 'only the full stop', 'the word “island”'], {
        why: 'Luffy and Zoro need capitals, and “goes” should be “go”.',
      }),
      choice('Which is the corrected sentence?', 'My team won the game.', ['my team won the game.', 'My team winned the game.', 'My team won the game', 'My teem won the game.'], {
        why: 'Capital, usage, punctuation and spelling: all four pass.',
      }),
    ]],
    ['feedback', {
      explain: [
        'A second reader sees what you cannot.',
        'Good feedback is specific and kind: “The second paragraph lost me.”',
        'You do not have to take every suggestion, but consider each one.',
      ],
      video: 'lang-d-edit-v0',
    }, [
      choice('Which is the most useful feedback?', '“I got lost in paragraph 2.”', ['“It’s good. Nice job.”', '“It’s bad. Start over.”', '“I don’t really know.”', '“It needs more stuff.”'], {
        emoji: '💬',
        why: 'Specific feedback can be acted on.',
      }),
      choice('A friend says your ending feels rushed. What should you do?', 'look at it and decide for yourself', ['ignore it, they’re not a teacher', 'delete the whole of the ending', 'argue until they take it back', 'start over from the very beginning'], {
        why: 'Consider every note. You still decide.',
      }),
      choice('Why ask someone else to read your work?', 'they see what you cannot', ['it makes them do the work', 'they will fix the spelling', 'it means you can skip editing', 'you have to get a good mark'], {
        why: 'You know what you meant. They only know what you wrote.',
      }),
    ]],
  ]),
]
