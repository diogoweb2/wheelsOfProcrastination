// Canada Geography II — 50 seed questions, tuned for Ben (born Feb 2014, Ontario grade 6).
// Deliberately picks up where `canadaGeographySeed.ts` stops: that bank owns provinces,
// capitals, languages and flags. This one is PHYSICAL geography — water, land, size,
// regions and where people actually live. No question here repeats one from book I.
// Core material (weight 2): oceans/lakes/rivers, landforms, regions, size & population.
// Fun extras (weight 1): records, nicknames, national symbols.
// This file only seeds Firestore (app/quizBank) on first run — after that, the bank
// in Firestore is the source of truth (removals, AI-regenerated questions, edits).
import type { QuizQuestion } from '../types'

const AT = '2026-08-17T00:00:00.000Z'
const T = 'canada-geography-2'

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

export const CANADA_GEOGRAPHY_2_SEED: QuizQuestion[] = [
  // --- size & shape of the country -----------------------------------------
  choice('cg2-01', 'Canada is the ___ largest country in the world by area.', ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'], 'second', {
    emoji: '🌍',
    funFact: 'Only Russia is bigger. Canada beats China, the USA and Brazil — all of them.',
  }),
  choice('cg2-02', 'How many time zones does Canada have?', ['2', '3', '4', '5', '6', '7', '8'], '6', {
    emoji: '🕐',
    funFact: 'When it is noon in Vancouver it is already 4:30 pm in St. John’s — Newfoundland has its own half-hour zone.',
  }),
  choice('cg2-03', 'About how many people live in Canada?', ['4 million', '40 million', '400 million', '14 million', '140 million', '2 million', '80 million'], '40 million', {
    emoji: '👥',
    funFact: 'Huge land, small crowd: Japan is 27 times smaller but has three times as many people.',
  }),
  choice('cg2-04', 'Which province has the MOST people?', ['Quebec', 'Ontario', 'Alberta', 'British Columbia', 'Manitoba', 'Nova Scotia', 'Saskatchewan'], 'Ontario', {
    emoji: '🏙️',
    funFact: 'About 4 in every 10 Canadians live in Ontario. Quebec is second.',
  }),
  choice('cg2-05', 'Most Canadians live close to which line?', ['the Arctic Circle', 'the border with the USA', 'the Rocky Mountains', 'the Equator', 'the Hudson Bay coast', 'the Alaska border', 'the tree line'], 'the border with the USA', {
    emoji: '🛂',
    funFact: 'About 9 out of 10 Canadians live within 160 km of the US border — a thin ribbon of people.',
  }),
  choice('cg2-06', 'Which territory is the LARGEST by area?', ['Yukon', 'Nunavut', 'Northwest Territories', 'Labrador', 'Nunavik', 'Baffin', 'Keewatin'], 'Nunavut', {
    emoji: '🧭',
    funFact: 'Nunavut is bigger than Mexico — with fewer people than a small town.',
  }),

  // --- big water ------------------------------------------------------------
  choice('cg2-07', 'Which enormous bay cuts deep into the middle of Canada?', ['Bay of Fundy', 'Hudson Bay', 'Georgian Bay', 'Baffin Bay', 'James Bay', 'Ungava Bay', 'Frobisher Bay'], 'Hudson Bay', {
    emoji: '🌊',
    funFact: 'Hudson Bay freezes over every winter, which is exactly why polar bears hang around Churchill.',
  }),
  choice('cg2-08', 'Which bay has the highest tides in the world?', ['Hudson Bay', 'Bay of Fundy', 'Georgian Bay', 'James Bay', 'Baffin Bay', 'Ungava Bay', 'Notre Dame Bay'], 'Bay of Fundy', {
    emoji: '🌗',
    funFact: 'The water can rise 16 metres — as tall as a four-storey building — twice a day.',
  }),
  choice('cg2-09', 'The Bay of Fundy sits between which two provinces?', ['Quebec and Ontario', 'New Brunswick and Nova Scotia', 'Nova Scotia and Newfoundland', 'PEI and New Brunswick', 'Quebec and New Brunswick', 'Ontario and Manitoba', 'PEI and Nova Scotia'], 'New Brunswick and Nova Scotia', {
    emoji: '🦞',
    funFact: 'At low tide you can walk on the sea floor at Hopewell Rocks. At high tide you kayak over it.',
  }),
  choice('cg2-10', 'Which great river carries ships from the Great Lakes out to the Atlantic?', ['Fraser River', 'St. Lawrence River', 'Mackenzie River', 'Ottawa River', 'Yukon River', 'Red River', 'Saskatchewan River'], 'St. Lawrence River', {
    emoji: '🚢',
    funFact: 'Montreal and Quebec City both grew up on its banks — it was the highway into the continent.',
  }),
  choice('cg2-11', 'What is the LONGEST river in Canada?', ['St. Lawrence River', 'Mackenzie River', 'Fraser River', 'Yukon River', 'Nelson River', 'Churchill River', 'Ottawa River'], 'Mackenzie River', {
    emoji: '🛶',
    funFact: 'The Mackenzie runs about 1,700 km north through the NWT and empties into the Arctic Ocean.',
  }),
  choice('cg2-12', 'The Fraser River, famous for salmon, is in which province?', ['Alberta', 'British Columbia', 'Manitoba', 'Ontario', 'Saskatchewan', 'Quebec', 'Yukon'], 'British Columbia', {
    emoji: '🐟',
    funFact: 'Millions of sockeye salmon swim up the Fraser to lay eggs — grizzly bears plan their year around it.',
  }),
  choice('cg2-13', 'Which is the LARGEST of the Great Lakes?', ['Lake Huron', 'Lake Superior', 'Lake Michigan', 'Lake Erie', 'Lake Ontario', 'Lake Nipigon', 'Lake Simcoe'], 'Lake Superior', {
    emoji: '💧',
    funFact: 'Lake Superior holds more water than the other four Great Lakes put together.',
  }),
  choice('cg2-14', 'Which Great Lake is the ONLY one entirely inside the United States?', ['Lake Erie', 'Lake Michigan', 'Lake Huron', 'Lake Ontario', 'Lake Superior', 'Lake Nipigon', 'Lake Champlain'], 'Lake Michigan', {
    emoji: '🇺🇸',
    funFact: 'The other four are split down the middle — half Canada, half USA.',
  }),
  choice('cg2-15', 'Which is the SMALLEST Great Lake by area?', ['Lake Erie', 'Lake Ontario', 'Lake Huron', 'Lake Michigan', 'Lake Superior', 'Lake Nipigon', 'Lake Winnipeg'], 'Lake Ontario', {
    emoji: '📐',
    funFact: 'Smallest in area, but deeper than Lake Erie — so it holds four times as much water.',
  }),
  choice('cg2-16', 'What is the largest lake found entirely INSIDE Canada?', ['Lake Winnipeg', 'Great Bear Lake', 'Great Slave Lake', 'Lake Athabasca', 'Lake Nipigon', 'Lake Superior', 'Reindeer Lake'], 'Great Bear Lake', {
    emoji: '🐻',
    funFact: 'Great Bear Lake sits in the Northwest Territories and is frozen for most of the year.',
  }),

  // --- land: mountains, rock, forest, ice -----------------------------------
  choice('cg2-17', 'What is the highest mountain in Canada?', ['Mount Robson', 'Mount Logan', 'Mount Everest', 'Mount Columbia', 'Mount Waddington', 'Mount Assiniboine', 'Mount Tremblant'], 'Mount Logan', {
    emoji: '🏔️',
    funFact: 'At 5,959 m it is the second highest peak in all of North America.',
  }),
  choice('cg2-18', 'Mount Logan stands in which territory?', ['Nunavut', 'Yukon', 'Northwest Territories', 'Alberta', 'British Columbia', 'Alaska', 'Labrador'], 'Yukon', {
    emoji: '🧗',
    funFact: 'Its base is so wide it is the largest mountain on Earth measured around the bottom.',
  }),
  choice('cg2-19', 'Which mountain range runs down the WESTERN side of Canada?', ['the Appalachians', 'the Rocky Mountains', 'the Laurentians', 'the Torngats', 'the Andes', 'the Alps', 'the Coast Hills'], 'the Rocky Mountains', {
    emoji: '⛰️',
    funFact: 'The Rockies stretch from BC and Alberta all the way down into New Mexico.',
  }),
  choice('cg2-20', 'Which much older, rounder mountain range sits in EASTERN Canada?', ['the Rockies', 'the Appalachians', 'the Coast Mountains', 'the Mackenzie Mountains', 'the Andes', 'the Selkirks', 'the Cascades'], 'the Appalachians', {
    emoji: '🍂',
    funFact: 'They are so old that wind and rain have worn them down into gentle green hills.',
  }),
  choice('cg2-21', 'What is the huge region of ancient rock that wraps around Hudson Bay?', ['the Great Plains', 'the Canadian Shield', 'the Arctic Lowlands', 'the Interior Plains', 'the Prairie Basin', 'the Boreal Belt', 'the Laurentian Plateau'], 'the Canadian Shield', {
    emoji: '🪨',
    funFact: 'It covers almost half of Canada and holds some of the oldest rock on the planet.',
  }),
  choice('cg2-22', 'What is the huge band of evergreen forest stretching across Canada called?', ['the rainforest', 'the boreal forest', 'the tundra', 'the prairie', 'the wetland', 'the deciduous forest', 'the taiga plain'], 'the boreal forest', {
    emoji: '🌲',
    funFact: 'Spruce, pine and fir from coast to coast — and it stores more carbon than the Amazon.',
  }),
  choice('cg2-23', 'What is the cold, treeless land of the far north called?', ['prairie', 'tundra', 'boreal forest', 'desert', 'wetland', 'steppe', 'savanna'], 'tundra', {
    emoji: '❄️',
    funFact: 'The ground below stays frozen all year. That frozen soil is called permafrost.',
  }),
  choice('cg2-24', 'What is Canada’s LARGEST island?', ['Vancouver Island', 'Baffin Island', 'Newfoundland', 'Prince Edward Island', 'Ellesmere Island', 'Victoria Island', 'Manitoulin Island'], 'Baffin Island', {
    emoji: '🏝️',
    funFact: 'Baffin Island is bigger than Spain — and the fifth largest island in the world.',
  }),
  choice('cg2-25', 'Baffin Island belongs to which territory?', ['Yukon', 'Nunavut', 'Northwest Territories', 'Labrador', 'Nunavik', 'Greenland', 'Alaska'], 'Nunavut', {
    emoji: '🐋',
    funFact: 'Iqaluit, the capital of Nunavut, sits on the southern end of Baffin Island.',
  }),

  // --- regions & nicknames ---------------------------------------------------
  choice('cg2-26', 'Which three provinces are called the Prairie provinces?', ['BC, Alberta, Yukon', 'Alberta, Saskatchewan, Manitoba', 'Manitoba, Ontario, Quebec', 'BC, Alberta, Saskatchewan', 'Saskatchewan, Manitoba, Ontario', 'Alberta, BC, Manitoba', 'Quebec, Ontario, Manitoba'], 'Alberta, Saskatchewan, Manitoba', {
    emoji: '🌾',
    funFact: 'Flat, wide and golden — you can watch a storm roll in from an hour away.',
  }),
  choice('cg2-27', 'Which three provinces are called the Maritimes?', ['NS, NB, Newfoundland', 'NS, NB, PEI', 'PEI, Newfoundland, Quebec', 'NB, PEI, Quebec', 'NS, PEI, Newfoundland', 'NB, NS, Quebec', 'PEI, NS, Ontario'], 'NS, NB, PEI', {
    emoji: '⚓',
    funFact: 'Add Newfoundland and Labrador and you get the four "Atlantic provinces".',
  }),
  choice('cg2-28', 'Which two provinces have NO ocean coastline at all?', ['Ontario and Quebec', 'Alberta and Saskatchewan', 'Manitoba and Ontario', 'Alberta and BC', 'Saskatchewan and Manitoba', 'Quebec and Manitoba', 'Ontario and Alberta'], 'Alberta and Saskatchewan', {
    emoji: '🚫',
    funFact: 'Manitoba surprises people — it touches Hudson Bay, so it is NOT landlocked.',
  }),
  choice('cg2-29', 'Which province produces the most wheat?', ['Alberta', 'Saskatchewan', 'Manitoba', 'Ontario', 'Quebec', 'British Columbia', 'New Brunswick'], 'Saskatchewan', {
    emoji: '🍞',
    funFact: 'Saskatchewan alone grows a big slice of the whole planet’s exported wheat.',
  }),
  choice('cg2-30', 'Which province produces almost all of Canada’s maple syrup?', ['Ontario', 'Quebec', 'New Brunswick', 'Nova Scotia', 'Manitoba', 'PEI', 'British Columbia'], 'Quebec', {
    emoji: '🥞',
    funFact: 'Quebec makes roughly 7 of every 10 bottles of maple syrup on Earth — and keeps a strategic reserve of it.',
  }),
  choice('cg2-31', 'Which province is famous for its oil sands?', ['Saskatchewan', 'Alberta', 'British Columbia', 'Manitoba', 'Newfoundland', 'Ontario', 'Yukon'], 'Alberta', {
    emoji: '🛢️',
    funFact: 'The oil sands near Fort McMurray are one of the biggest oil deposits in the world.',
  }),

  // --- landmarks, records & fun --------------------------------------------
  choice('cg2-32', 'Which bridge connects Prince Edward Island to the mainland?', ['Lions Gate Bridge', 'Confederation Bridge', 'Ambassador Bridge', 'Jacques Cartier Bridge', 'Peace Bridge', 'Angus L. Macdonald Bridge', 'Champlain Bridge'], 'Confederation Bridge', {
    emoji: '🌉',
    weight: 1,
    points: 5,
    funFact: 'Almost 13 km long — it takes about 12 minutes to drive across, and you cannot stop.',
  }),
  choice('cg2-33', 'What is the long road that crosses the whole country called?', ['Route 66', 'the Trans-Canada Highway', 'the Alaska Highway', 'the Klondike Road', 'the Great Northern Way', 'the Maple Route', 'the Confederation Road'], 'the Trans-Canada Highway', {
    emoji: '🛣️',
    weight: 1,
    points: 5,
    funFact: 'About 7,800 km from Victoria to St. John’s. Driving it takes roughly a week without stopping to sleep.',
  }),
  choice('cg2-34', 'Which country lies just across the water northeast of Canada?', ['Iceland', 'Greenland', 'Norway', 'Ireland', 'Russia', 'Scotland', 'Finland'], 'Greenland', {
    emoji: '🧊',
    weight: 1,
    points: 5,
    funFact: 'At the narrowest point only about 26 km of water separate Canada from Greenland.',
  }),
  choice('cg2-35', 'Which animal is on the Canadian five-cent coin (the nickel)?', ['moose', 'beaver', 'polar bear', 'loon', 'caribou', 'grizzly bear', 'goose'], 'beaver', {
    emoji: '🦫',
    weight: 1,
    points: 5,
    funFact: 'Loon on the loonie, polar bear on the toonie, caribou on the quarter, beaver on the nickel.',
  }),
  choice('cg2-36', 'Vancouver Island belongs to which province?', ['Alberta', 'British Columbia', 'Yukon', 'Washington', 'Saskatchewan', 'Manitoba', 'Ontario'], 'British Columbia', {
    emoji: '🌲',
    weight: 1,
    points: 5,
    funFact: 'It is Canada’s mildest place — Victoria barely gets snow while the Prairies hit -30 °C.',
  }),
  choice('cg2-37', 'Niagara Falls sits on the border between Ontario and which US state?', ['Michigan', 'New York', 'Ohio', 'Pennsylvania', 'Minnesota', 'Vermont', 'Maine'], 'New York', {
    emoji: '💦',
    weight: 1,
    points: 5,
    funFact: 'The bigger, curved "Horseshoe" side is the Canadian one. Better view, obviously.',
  }),
  choice('cg2-38', 'Which imaginary line crosses the far north of Canada?', ['the Equator', 'the Arctic Circle', 'the Tropic of Cancer', 'the Prime Meridian', 'the Antarctic Circle', 'the Date Line', 'the Tropic of Capricorn'], 'the Arctic Circle', {
    emoji: '🌐',
    weight: 1,
    points: 5,
    funFact: 'North of it the sun never sets on the longest day — and never rises on the shortest.',
  }),
  choice('cg2-39', 'Which Canadian city is closest to Europe?', ['Halifax', "St. John's", 'Quebec City', 'Montreal', 'Charlottetown', 'Fredericton', 'Sydney'], "St. John's", {
    emoji: '🧭',
    weight: 1,
    points: 5,
    funFact: 'St. John’s is closer to Ireland than it is to Winnipeg. Look at a map — it is true.',
  }),

  // --- write-in --------------------------------------------------------------
  {
    id: 'cg2-40',
    topicId: T,
    type: 'write',
    prompt: 'Type the name of the huge bay in the middle of Canada:',
    emoji: '✍️',
    accept: ['Hudson Bay', 'Hudson'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Hudson Bay is so big that Canada’s map looks like it has a bite taken out of it.',
  },
  {
    id: 'cg2-41',
    topicId: T,
    type: 'write',
    prompt: 'Type the name of the LARGEST Great Lake:',
    emoji: '✍️',
    accept: ['Superior', 'Lake Superior'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Lake Superior could cover all of North and South America in 30 cm of water.',
  },
  {
    id: 'cg2-42',
    topicId: T,
    type: 'write',
    prompt: 'Type the river that flows past Montreal and Quebec City:',
    emoji: '✍️',
    accept: ['St. Lawrence', 'St Lawrence', 'Saint Lawrence', 'St. Lawrence River'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Beluga whales swim up the St. Lawrence — real whales, hundreds of km from the ocean.',
  },
  {
    id: 'cg2-43',
    topicId: T,
    type: 'write',
    prompt: 'Type the mountain range in western Canada:',
    emoji: '✍️',
    accept: ['Rockies', 'Rocky Mountains', 'The Rockies'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'The Rockies were pushed up when two pieces of the Earth’s crust slowly crashed together.',
  },
  {
    id: 'cg2-44',
    topicId: T,
    type: 'write',
    prompt: 'Which animal is Canada’s national animal? (type it)',
    emoji: '🦫',
    accept: ['Beaver', 'The beaver'],
    weight: 1,
    points: 5,
    status: 'active',
    createdAt: AT,
    funFact: 'The beaver got the job because its fur built Canada’s first big business, the fur trade.',
  },
  {
    id: 'cg2-45',
    topicId: T,
    type: 'write',
    prompt: 'Canada’s official national WINTER sport is: (type it)',
    emoji: '🏒',
    accept: ['Hockey', 'Ice hockey'],
    weight: 1,
    points: 5,
    status: 'active',
    createdAt: AT,
    funFact: 'The official summer sport is lacrosse, a game invented by First Nations peoples.',
  },

  // --- match ----------------------------------------------------------------
  {
    id: 'cg2-46',
    topicId: T,
    type: 'match',
    prompt: 'Match each landmark to where it is:',
    emoji: '🔗',
    pairs: [
      { left: 'Mount Logan', right: 'Yukon' },
      { left: 'Baffin Island', right: 'Nunavut' },
      { left: 'Bay of Fundy', right: 'New Brunswick' },
      { left: 'Niagara Falls', right: 'Ontario' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Highest peak, biggest island, biggest tides, loudest waterfall — four records, four places.',
  },
  {
    id: 'cg2-47',
    topicId: T,
    type: 'match',
    prompt: 'Match each river to the province or territory it flows through:',
    emoji: '🌊',
    pairs: [
      { left: 'Fraser River', right: 'British Columbia' },
      { left: 'Mackenzie River', right: 'Northwest Territories' },
      { left: 'St. Lawrence River', right: 'Quebec' },
      { left: 'Red River', right: 'Manitoba' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'The Red River runs north into Winnipeg — one of the few rivers in Canada that flows upward on a map.',
  },
  {
    id: 'cg2-48',
    topicId: T,
    type: 'match',
    prompt: 'Match each region to the province it best describes:',
    emoji: '🗺️',
    pairs: [
      { left: 'The Prairies', right: 'Saskatchewan' },
      { left: 'The Rockies', right: 'Alberta' },
      { left: 'The Maritimes', right: 'Prince Edward Island' },
      { left: 'The Arctic', right: 'Nunavut' },
    ],
    weight: 1,
    points: 6,
    status: 'active',
    createdAt: AT,
    funFact: 'Canadians say "out west", "back east" and "up north" — three words that cover 10 million km².',
  },

  // --- order ----------------------------------------------------------------
  {
    id: 'cg2-49',
    topicId: T,
    type: 'order',
    prompt: 'Put these Great Lakes in order from BIGGEST to smallest:',
    emoji: '💧',
    sequence: ['Lake Superior', 'Lake Huron', 'Lake Erie', 'Lake Ontario'],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Superior, Huron, Michigan, Erie, Ontario — that is the whole set, biggest to smallest.',
  },
  {
    id: 'cg2-50',
    topicId: T,
    type: 'order',
    prompt: 'Put these cities in order from NORTH to SOUTH:',
    emoji: '🧭',
    sequence: ['Whitehorse', 'Edmonton', 'Toronto', 'Windsor'],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Windsor is so far south it sits BELOW parts of California’s northern border.',
  },
]
