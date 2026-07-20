// Canada Geography — 50 seed questions, tuned for Ben (born Feb 2014, Ontario grade 6).
// Core material (weight 2): provinces, territories, capitals, official languages, province flags.
// Fun extras (weight 1): famous cities, landmarks, city flags.
// This file only seeds Firestore (app/quizBank) on first run — after that, the bank
// in Firestore is the source of truth (removals, AI-regenerated questions, edits).
import type { QuizQuestion } from '../types'

const AT = '2026-07-18T00:00:00.000Z'
const T = 'canada-geography'

/** Wikimedia serves a rendered PNG for any flag via this stable redirect. */
const flag = (file: string) => `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=320`

const choice = (
  id: string,
  prompt: string,
  choices: string[],
  answer: string,
  opts: Partial<QuizQuestion> = {},
): QuizQuestion => ({
  id,
  topicId: T,
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

export const CANADA_GEOGRAPHY_SEED: QuizQuestion[] = [
  // --- capitals (choice) ---------------------------------------------------
  choice('cg-01', 'What is the capital city of Canada?', ['Toronto', 'Ottawa', 'Montreal', 'Vancouver', 'Calgary', 'Halifax', 'Winnipeg'], 'Ottawa', {
    emoji: '🏛️',
    funFact: 'Ottawa was picked partly because it was far from the US border — a safe spot for the King’s treasure… er, Parliament.',
  }),
  choice('cg-02', 'What is the capital of Quebec?', ['Montreal', 'Québec City', 'Laval', 'Gatineau', 'Sherbrooke', 'Trois-Rivières', 'Saguenay'], 'Québec City', {
    emoji: '🏰',
    funFact: 'Québec City has real stone walls around its old town — the only walled city north of Mexico. Basically a Marine fortress.',
  }),
  choice('cg-03', 'What is the capital of British Columbia?', ['Vancouver', 'Victoria', 'Kelowna', 'Surrey', 'Nanaimo', 'Kamloops', 'Prince George'], 'Victoria', {
    emoji: '⛵',
    funFact: 'Victoria is on Vancouver Island — so the capital of BC is not Vancouver, and Vancouver isn’t even on Vancouver Island. Sneaky!',
  }),
  choice('cg-04', 'What is the capital of Alberta?', ['Calgary', 'Edmonton', 'Red Deer', 'Banff', 'Lethbridge', 'Medicine Hat', 'Fort McMurray'], 'Edmonton', {
    emoji: '🛢️',
    funFact: 'Edmonton has one of the biggest shopping malls in North America — with a pirate ship inside it. Seriously.',
  }),
  choice('cg-05', 'What is the capital of Saskatchewan?', ['Saskatoon', 'Regina', 'Moose Jaw', 'Prince Albert', 'Swift Current', 'Yorkton', 'North Battleford'], 'Regina', {
    emoji: '🌾',
    funFact: '“Regina” means “queen” in Latin. The RCMP (Mounties) train there.',
  }),
  choice('cg-06', 'What is the capital of New Brunswick?', ['Moncton', 'Saint John', 'Fredericton', 'Bathurst', 'Miramichi', 'Edmundston', 'Dieppe'], 'Fredericton', {
    emoji: '🦞',
    funFact: 'Everyone guesses Moncton or Saint John — but quiet little Fredericton holds the crown.',
  }),
  choice('cg-07', 'What is the capital of Newfoundland and Labrador?', ['Corner Brook', 'Gander', "St. John's", 'Labrador City', 'Mount Pearl', 'Grand Falls-Windsor', 'Happy Valley-Goose Bay'], "St. John's", {
    emoji: '🌊',
    funFact: "St. John's is one of the oldest cities in North America and the closest one to Europe — first stop on the Grand Line to the Atlantic!",
  }),
  choice('cg-08', 'What is the capital of Yukon?', ['Dawson City', 'Whitehorse', 'Watson Lake', 'Haines Junction', 'Carmacks', 'Mayo', 'Faro'], 'Whitehorse', {
    emoji: '🐺',
    funFact: 'Whitehorse is named after river rapids that looked like the manes of white horses.',
  }),
  choice('cg-09', 'What is the capital of the Northwest Territories?', ['Inuvik', 'Hay River', 'Yellowknife', 'Norman Wells', 'Fort Smith', 'Behchokǫ̀', 'Tuktoyaktuk'], 'Yellowknife', {
    emoji: '💎',
    funFact: 'Yellowknife sits on gold AND diamonds. An actual treasure island, no map needed.',
  }),
  choice('cg-10', 'What is the capital of Nunavut?', ['Iqaluit', 'Rankin Inlet', 'Arviat', 'Igloolik', 'Cambridge Bay', 'Pond Inlet', 'Baker Lake'], 'Iqaluit', {
    emoji: '❄️',
    funFact: '“Iqaluit” means “place of many fish” in Inuktitut. Sanji would approve.',
  }),

  // --- provinces / territories basics --------------------------------------
  choice('cg-11', 'How many provinces does Canada have?', ['8', '10', '12', '13', '7', '9', '11'], '10', {
    emoji: '🗺️',
    funFact: '10 provinces + 3 territories = 13 regions. Newfoundland joined last, in 1949.',
  }),
  choice('cg-12', 'How many territories does Canada have?', ['2', '3', '4', '5', '1', '6', '7'], '3', {
    emoji: '🧭',
    funFact: 'Yukon, Northwest Territories and Nunavut. Nunavut is the newest — created in 1999.',
  }),
  choice('cg-13', 'What are the two official languages of Canada?', ['English and Spanish', 'English and French', 'French and Inuktitut', 'English only', 'French and Spanish', 'English and Inuktitut', 'French only'], 'English and French', {
    emoji: '🗣️',
    funFact: 'That’s why cereal boxes have two sides — English on one, français on the other!',
  }),
  choice('cg-14', 'In which province is French the ONLY official language?', ['Ontario', 'New Brunswick', 'Quebec', 'Manitoba', 'Nova Scotia', 'Alberta', 'Prince Edward Island'], 'Quebec', {
    emoji: '⚜️',
    funFact: 'About 8 in 10 Quebecers speak French at home. Bonjour-Hi!',
  }),
  choice('cg-15', 'Which is the only officially bilingual province (English AND French)?', ['Quebec', 'Ontario', 'Manitoba', 'New Brunswick', 'Nova Scotia', 'Newfoundland and Labrador', 'Prince Edward Island'], 'New Brunswick', {
    emoji: '🤝',
    funFact: 'New Brunswick runs everything in both languages — the only province that does.',
  }),
  choice('cg-16', 'Inuktitut is an official language of which territory?', ['Yukon', 'Nunavut', 'Northwest Territories', 'Labrador', 'Nunavik', 'Alaska', 'Greenland'], 'Nunavut', {
    emoji: '🐻‍❄️',
    funFact: 'The Northwest Territories go even further — they have ELEVEN official languages.',
  }),

  // --- oceans & neighbours -------------------------------------------------
  choice('cg-17', 'Which ocean touches Canada’s WEST coast?', ['Atlantic', 'Arctic', 'Pacific', 'Indian', 'Southern', 'Baltic', 'Caribbean Sea'], 'Pacific', {
    emoji: '🌅',
    funFact: 'Pacific = west = British Columbia. Home of orcas and giant octopuses — real Sea Kings.',
  }),
  choice('cg-18', 'Which ocean touches Canada’s EAST coast?', ['Pacific', 'Atlantic', 'Arctic', 'Southern', 'Indian', 'Baltic', 'Mediterranean Sea'], 'Atlantic', {
    emoji: '🌊',
    funFact: 'The Titanic sank in the Atlantic off Newfoundland. Wreck divers still visit from St. John’s.',
  }),
  choice('cg-19', 'Which ocean is to the NORTH of Canada?', ['Atlantic', 'Pacific', 'Arctic', 'Baltic', 'Indian', 'Southern', 'Hudson Bay'], 'Arctic', {
    emoji: '🧊',
    funFact: 'Canada touches three oceans — that’s why its motto is “From sea to sea”.',
  }),
  choice('cg-20', 'Which country is Canada’s only land neighbour?', ['Russia', 'United States', 'Greenland', 'Mexico', 'Iceland', 'Denmark', 'France'], 'United States', {
    emoji: '🛂',
    funFact: 'The Canada–US border is the longest land border in the world: almost 9,000 km!',
  }),
  choice('cg-21', 'Which province is the BIGGEST by area?', ['Ontario', 'British Columbia', 'Quebec', 'Alberta', 'Manitoba', 'Saskatchewan', 'Newfoundland and Labrador'], 'Quebec', {
    emoji: '📏',
    funFact: 'Quebec is about 3× the size of France. Ontario is #2.',
  }),
  choice('cg-22', 'Which province is the SMALLEST?', ['Nova Scotia', 'Prince Edward Island', 'New Brunswick', 'Manitoba', 'Newfoundland and Labrador', 'Saskatchewan', 'Ontario'], 'Prince Edward Island', {
    emoji: '🥔',
    funFact: 'Tiny PEI grows a quarter of Canada’s potatoes. Small island, big fries.',
  }),

  // --- province & territory flags (images) ---------------------------------
  choice('cg-23', 'Which province does this flag belong to?', ['Ontario', 'Manitoba', 'British Columbia', 'Alberta', 'Saskatchewan', 'Quebec', 'Nova Scotia'], 'Ontario', {
    emoji: '🚩',
    image: flag('Flag_of_Ontario.svg'),
    funFact: 'Ontario’s flag keeps the old Red Ensign look — Union Jack in the corner, shield on the right.',
  }),
  choice('cg-24', 'Which province flies this flag?', ['New Brunswick', 'Quebec', 'Nova Scotia', 'Prince Edward Island', 'Ontario', 'Manitoba', 'Newfoundland and Labrador'], 'Quebec', {
    emoji: '🚩',
    image: flag('Flag_of_Quebec.svg'),
    funFact: 'The white symbols are fleurs-de-lis — lilies, an old symbol of France.',
  }),
  choice('cg-25', 'Which province does this flag (sun setting over waves) belong to?', ['Alberta', 'British Columbia', 'Newfoundland and Labrador', 'Yukon', 'Saskatchewan', 'Manitoba', 'Nunavut'], 'British Columbia', {
    emoji: '🚩',
    image: flag('Flag_of_British_Columbia.svg'),
    funFact: 'The sun sits over wavy blue lines = the Pacific Ocean. West coast, best coast?',
  }),
  choice('cg-26', 'Which province flies this blue flag with a white-and-blue shield?', ['Nova Scotia', 'New Brunswick', 'Manitoba', 'Saskatchewan', 'Prince Edward Island', 'Ontario', 'Alberta'], 'Nova Scotia', {
    emoji: '🚩',
    image: flag('Flag_of_Nova_Scotia.svg'),
    funFact: '“Nova Scotia” means “New Scotland” — its flag is Scotland’s flag with the colours flipped.',
  }),
  choice('cg-27', 'Which territory has this flag with an inuksuk (stone figure)?', ['Yukon', 'Northwest Territories', 'Nunavut', 'Nunavik', 'Labrador', 'Alaska', 'Greenland'], 'Nunavut', {
    emoji: '🚩',
    image: flag('Flag_of_Nunavut.svg'),
    funFact: 'An inuksuk is a stone marker Inuit used for navigation — a real-life log pose. The star is the North Star.',
  }),
  choice('cg-28', 'Which province flies this flag?', ['Nova Scotia', 'Newfoundland and Labrador', 'Prince Edward Island', 'New Brunswick', 'Quebec', 'Manitoba', 'British Columbia'], 'Newfoundland and Labrador', {
    emoji: '🚩',
    image: flag('Flag_of_Newfoundland_and_Labrador.svg'),
    funFact: 'The gold arrow points to a brighter future — and to the sea, obviously.',
  }),
  choice('cg-29', 'Which territory does this flag belong to?', ['Nunavut', 'Yukon', 'Northwest Territories', 'Alaska', 'Nunavik', 'Labrador', 'Greenland'], 'Yukon', {
    emoji: '🚩',
    image: flag('Flag_of_Yukon.svg'),
    funFact: 'Green for forests, white for snow, blue for rivers — plus a husky-approved coat of arms.',
  }),

  // --- famous city flags (fun) ---------------------------------------------
  choice('cg-30', 'This flag (a “T” shaped like city hall) belongs to which city?', ['Ottawa', 'Toronto', 'Hamilton', 'Mississauga', 'London', 'Windsor', 'Kingston'], 'Toronto', {
    emoji: '🏙️',
    image: flag('Flag_of_Toronto,_Canada.svg'),
    weight: 1,
    points: 5,
    funFact: 'The white shape is Toronto’s twin-towered City Hall, with a maple leaf at its base.',
  }),
  choice('cg-31', 'This flag with a red cross and four symbols belongs to which city?', ['Quebec City', 'Montreal', 'Laval', 'Sherbrooke', 'Gatineau', 'Trois-Rivières', 'Longueuil'], 'Montreal', {
    emoji: '🏙️',
    image: flag('Flag_of_Montreal.svg'),
    weight: 1,
    points: 5,
    funFact: 'The symbols honour the peoples who built Montreal — a white pine was added in 2017 for First Nations.',
  }),
  choice('cg-32', 'This flag with waves and a golden sun belongs to which west-coast city?', ['Victoria', 'Seattle', 'Vancouver', 'Whistler', 'Surrey', 'Nanaimo', 'Burnaby'], 'Vancouver', {
    emoji: '🏙️',
    image: flag('Flag_of_Vancouver_(Canada).svg'),
    weight: 1,
    points: 5,
    funFact: 'Green pentagon = the land, wavy bars = the sea and sky of the Pacific coast.',
  }),

  // --- landmarks & cities (fun) --------------------------------------------
  choice('cg-33', 'Niagara Falls is in which province?', ['Quebec', 'Ontario', 'Manitoba', 'British Columbia', 'Alberta', 'Nova Scotia', 'Saskatchewan'], 'Ontario', {
    emoji: '💦',
    weight: 1,
    points: 5,
    funFact: 'Enough water goes over Niagara Falls every second to fill an Olympic pool. All Blue vibes.',
  }),
  choice('cg-34', 'Banff and the Rocky Mountains are famous in which province?', ['Saskatchewan', 'Ontario', 'Alberta', 'Nova Scotia', 'Manitoba', 'Quebec', 'New Brunswick'], 'Alberta', {
    emoji: '🏔️',
    weight: 1,
    points: 5,
    funFact: 'Banff was Canada’s FIRST national park (1885). The Rockies continue into British Columbia.',
  }),
  choice('cg-35', 'Churchill, the “polar bear capital of the world”, is in which province?', ['Nunavut', 'Manitoba', 'Yukon', 'Quebec', 'Northwest Territories', 'Saskatchewan', 'Ontario'], 'Manitoba', {
    emoji: '🐻‍❄️',
    weight: 1,
    points: 5,
    funFact: 'In Churchill people leave car doors unlocked — so anyone can hide if a polar bear strolls by.',
  }),
  // Asked as "which IS one" on purpose: the "NOT one" version can only have five wrong answers,
  // and the pool needs room for more than that.
  choice('cg-36', 'Which of these IS one of the Great Lakes?', ['Lake Superior', 'Lake Winnipeg', 'Great Bear Lake', 'Lake Athabasca', 'Great Slave Lake', 'Lake Nipigon', 'Lake Manitoba'], 'Lake Superior', {
    emoji: '🛶',
    weight: 1,
    points: 5,
    funFact: 'The five Great Lakes: Superior, Michigan, Huron, Erie, Ontario — HOMES is the trick to remember them.',
  }),
  choice('cg-37', 'Calgary, famous for its rodeo (the Stampede), is in which province?', ['Alberta', 'Saskatchewan', 'British Columbia', 'Manitoba', 'Ontario', 'Quebec', 'Yukon'], 'Alberta', {
    emoji: '🤠',
    weight: 1,
    points: 5,
    funFact: 'The Calgary Stampede calls itself “The Greatest Outdoor Show on Earth”. Yeehaw.',
  }),

  // --- write-in (simple typing) --------------------------------------------
  {
    id: 'cg-38',
    topicId: T,
    type: 'write',
    prompt: 'Type the capital of Ontario:',
    emoji: '✍️',
    accept: ['Toronto'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Toronto is the capital of Ontario — but NOT the capital of Canada. That’s Ottawa (also in Ontario!).',
  },
  {
    id: 'cg-39',
    topicId: T,
    type: 'write',
    prompt: 'Type the capital of Manitoba:',
    emoji: '✍️',
    accept: ['Winnipeg'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Winnie the Pooh is named after Winnipeg — a soldier’s bear cub mascot from WWI.',
  },
  {
    id: 'cg-40',
    topicId: T,
    type: 'write',
    prompt: 'Type the capital of Nova Scotia:',
    emoji: '✍️',
    accept: ['Halifax'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Halifax has one of the biggest natural harbours on Earth — a dream port for any pirate crew.',
  },
  {
    id: 'cg-41',
    topicId: T,
    type: 'write',
    prompt: 'Type the capital of Prince Edward Island:',
    emoji: '✍️',
    accept: ['Charlottetown'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Canada was basically invented at a meeting in Charlottetown in 1864.',
  },
  {
    id: 'cg-42',
    topicId: T,
    type: 'write',
    prompt: 'Which city is home to the CN Tower? (type it)',
    emoji: '🗼',
    accept: ['Toronto'],
    weight: 1,
    points: 5,
    status: 'active',
    createdAt: AT,
    funFact: 'For 32 years the CN Tower was the tallest free-standing tower in the world — 553 m of “don’t look down”.',
  },
  {
    id: 'cg-43',
    topicId: T,
    type: 'write',
    prompt: 'What kind of leaf is on Canada’s flag? (type it)',
    emoji: '🍁',
    accept: ['Maple', 'Maple leaf', 'A maple leaf'],
    weight: 1,
    points: 5,
    status: 'active',
    createdAt: AT,
    funFact: 'The maple leaf on the flag has exactly 11 points. Count them next time!',
  },

  // --- match (tap to connect) ----------------------------------------------
  {
    id: 'cg-44',
    topicId: T,
    type: 'match',
    prompt: 'Match each WESTERN province to its capital:',
    emoji: '🔗',
    pairs: [
      { left: 'British Columbia', right: 'Victoria' },
      { left: 'Alberta', right: 'Edmonton' },
      { left: 'Saskatchewan', right: 'Regina' },
      { left: 'Manitoba', right: 'Winnipeg' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'West to east: BC, Alberta, Saskatchewan, Manitoba — Victoria, Edmonton, Regina, Winnipeg.',
  },
  {
    id: 'cg-45',
    topicId: T,
    type: 'match',
    prompt: 'Match each EASTERN province to its capital:',
    emoji: '🔗',
    pairs: [
      { left: 'Ontario', right: 'Toronto' },
      { left: 'Quebec', right: 'Québec City' },
      { left: 'New Brunswick', right: 'Fredericton' },
      { left: 'Nova Scotia', right: 'Halifax' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Quebec is the only province whose capital shares its name — Québec City.',
  },
  {
    id: 'cg-46',
    topicId: T,
    type: 'match',
    prompt: 'Match each TERRITORY to its capital:',
    emoji: '🔗',
    pairs: [
      { left: 'Yukon', right: 'Whitehorse' },
      { left: 'Northwest Territories', right: 'Yellowknife' },
      { left: 'Nunavut', right: 'Iqaluit' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'A horse, a knife and fish: Whitehorse, Yellowknife, Iqaluit (“place of many fish”).',
  },
  {
    id: 'cg-47',
    topicId: T,
    type: 'match',
    prompt: 'Match each famous place to its province:',
    emoji: '📍',
    pairs: [
      { left: 'Niagara Falls', right: 'Ontario' },
      { left: 'Banff', right: 'Alberta' },
      { left: 'Old Québec', right: 'Quebec' },
      { left: 'Peggy’s Cove', right: 'Nova Scotia' },
    ],
    weight: 1,
    points: 6,
    status: 'active',
    createdAt: AT,
    funFact: 'Peggy’s Cove has Canada’s most photographed lighthouse — great spot to watch for approaching Marine ships.',
  },

  // --- order (put in sequence) ---------------------------------------------
  {
    id: 'cg-48',
    topicId: T,
    type: 'order',
    prompt: 'Put these provinces in order from WEST to EAST:',
    emoji: '🧭',
    sequence: ['British Columbia', 'Alberta', 'Saskatchewan', 'Manitoba'],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Trick: “Bears Always Sniff Marmalade” — BC, Alberta, Saskatchewan, Manitoba.',
  },
  {
    id: 'cg-49',
    topicId: T,
    type: 'order',
    prompt: 'Put the territories in order from WEST to EAST:',
    emoji: '🧭',
    sequence: ['Yukon', 'Northwest Territories', 'Nunavut'],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Yukon hugs Alaska, Nunavut reaches nearly to Greenland — the NWT sits in the middle.',
  },
  {
    id: 'cg-50',
    topicId: T,
    type: 'order',
    prompt: 'Order these cities from BIGGEST population to smallest:',
    emoji: '🏙️',
    sequence: ['Toronto', 'Montreal', 'Calgary', 'Halifax'],
    weight: 1,
    points: 6,
    status: 'active',
    createdAt: AT,
    funFact: 'Toronto ~3 million people, Montreal ~1.8M, Calgary ~1.4M, Halifax ~0.5M.',
  },
]
