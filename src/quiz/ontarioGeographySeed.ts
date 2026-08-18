// Ontario Geography — 50 seed questions, tuned for Ben (born Feb 2014, Ontario grade 6).
// Toronto is deliberately almost absent: the city gets its own topic
// (`torontoGeographySeed.ts`). This bank is the REST of the province — the lakes,
// the rock, the regions and the other cities.
// Core material (weight 2): Great Lakes, rivers, regions, landforms, major cities.
// Fun extras (weight 1): records, parks, symbols, nicknames.
// This file only seeds Firestore (app/quizBank) on first run — after that, the bank
// in Firestore is the source of truth (removals, AI-regenerated questions, edits).
import type { QuizQuestion } from '../types'

const AT = '2026-08-17T00:00:00.000Z'
const T = 'ontario-geography'

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

export const ONTARIO_GEOGRAPHY_SEED: QuizQuestion[] = [
  // --- the lakes ------------------------------------------------------------
  choice('og-01', 'How many of the five Great Lakes touch Ontario?', ['two', 'three', 'four', 'five', 'one', 'six', 'none'], 'four', {
    emoji: '💧',
    funFact: 'Superior, Huron, Erie and Ontario. Only Lake Michigan leaves Ontario off its guest list.',
  }),
  choice('og-02', 'Which Great Lake does NOT touch Ontario at all?', ['Lake Erie', 'Lake Michigan', 'Lake Huron', 'Lake Ontario', 'Lake Superior', 'Lake Nipigon', 'Lake Simcoe'], 'Lake Michigan', {
    emoji: '🚫',
    funFact: 'Lake Michigan is the only Great Lake sitting entirely inside the United States.',
  }),
  choice('og-03', 'What is the huge bay on the Ontario side of Lake Huron called?', ['James Bay', 'Georgian Bay', 'Thunder Bay', 'Nottawasaga Bay', 'Hudson Bay', 'Long Bay', 'Owen Bay'], 'Georgian Bay', {
    emoji: '⛵',
    funFact: 'Georgian Bay is so big it was almost named the sixth Great Lake.',
  }),
  choice('og-04', 'What is the LARGEST freshwater island in the world, found in Ontario?', ['Wolfe Island', 'Manitoulin Island', 'Pelee Island', 'Amherst Island', 'St. Joseph Island', 'Christian Island', 'Toronto Island'], 'Manitoulin Island', {
    emoji: '🏝️',
    funFact: 'Manitoulin is an island in a lake — and it has lakes on it, with islands in those lakes.',
  }),
  choice('og-05', 'Manitoulin Island sits in which Great Lake?', ['Lake Superior', 'Lake Huron', 'Lake Erie', 'Lake Ontario', 'Lake Michigan', 'Lake Nipigon', 'Lake Simcoe'], 'Lake Huron', {
    emoji: '🛥️',
    funFact: 'A car ferry called the Chi-Cheemaun runs there from Tobermory each summer.',
  }),
  choice('og-06', 'What is the largest lake found entirely inside Ontario?', ['Lake Simcoe', 'Lake Nipigon', 'Lake Nipissing', 'Lake of the Woods', 'Rainy Lake', 'Lake Muskoka', 'Lake Temagami'], 'Lake Nipigon', {
    emoji: '🎣',
    funFact: 'Lake Nipigon drains into Lake Superior, so it feeds the biggest Great Lake of them all.',
  }),
  choice('og-07', 'Which lake north of the city is famous for ice fishing huts in winter?', ['Lake Erie', 'Lake Simcoe', 'Lake Nipigon', 'Lake Huron', 'Lake Nipissing', 'Lake Muskoka', 'Lake Scugog'], 'Lake Simcoe', {
    emoji: '🎣',
    funFact: 'In deep winter whole villages of huts appear on the ice — with roads plowed between them.',
  }),
  choice('og-08', 'Which Great Lake is the shallowest and warmest?', ['Lake Superior', 'Lake Erie', 'Lake Ontario', 'Lake Huron', 'Lake Michigan', 'Lake Nipigon', 'Lake Simcoe'], 'Lake Erie', {
    emoji: '🌡️',
    funFact: 'Being shallow means Erie warms up fast in summer — and can freeze right over in winter.',
  }),

  // --- rivers, canals & borders ---------------------------------------------
  choice('og-09', 'Which river forms most of the border between Ontario and Quebec?', ['St. Lawrence River', 'Ottawa River', 'Thames River', 'Grand River', 'Rideau River', 'Severn River', 'Trent River'], 'Ottawa River', {
    emoji: '🛶',
    funFact: 'Cross a bridge in Ottawa and you are in Gatineau, Quebec — different province, different time to close the bar.',
  }),
  choice('og-10', 'Which canal lets big ships get around Niagara Falls?', ['Rideau Canal', 'Welland Canal', 'Trent-Severn Waterway', 'Erie Canal', 'Panama Canal', 'Soo Canal', 'Lachine Canal'], 'Welland Canal', {
    emoji: '🚢',
    funFact: 'Ships are lifted about 100 m through a staircase of locks. You can stand and watch them climb.',
  }),
  choice('og-11', 'Which historic canal turns into the world’s longest skating rink each winter?', ['Welland Canal', 'Rideau Canal', 'Trent-Severn Waterway', 'Erie Canal', 'Lachine Canal', 'Soo Canal', 'Grand Canal'], 'Rideau Canal', {
    emoji: '⛸️',
    funFact: 'Almost 8 km of skating right through the middle of Ottawa — with stands selling BeaverTails.',
  }),
  choice('og-12', 'What is the group of islands in the St. Lawrence River near Kingston called?', ['Manitoulin Islands', 'Thousand Islands', 'Toronto Islands', 'Georgian Islands', 'Bruce Islands', 'Pelee Islands', 'Rideau Islands'], 'Thousand Islands', {
    emoji: '🏝️',
    funFact: 'There are actually over 1,800 of them. Some are just big enough for one house and one tree.',
  }),
  choice('og-13', 'Which province borders Ontario to the WEST?', ['Quebec', 'Manitoba', 'Saskatchewan', 'Alberta', 'Nunavut', 'Nova Scotia', 'New Brunswick'], 'Manitoba', {
    emoji: '🧭',
    funFact: 'Manitoba to the west, Quebec to the east — Ontario only touches two other provinces.',
  }),
  choice('og-14', 'Which US state sits directly across the river from Windsor?', ['New York', 'Michigan', 'Ohio', 'Minnesota', 'Pennsylvania', 'Illinois', 'Indiana'], 'Michigan', {
    emoji: '🌉',
    funFact: 'Detroit is NORTH of Windsor. Ontario reaches further south than a chunk of the northern USA.',
  }),
  choice('og-15', 'Which huge bay touches the far NORTH of Ontario?', ['Georgian Bay', 'James Bay', 'Bay of Fundy', 'Thunder Bay', 'Baffin Bay', 'Nottawasaga Bay', 'Ungava Bay'], 'James Bay', {
    emoji: '🐻‍❄️',
    funFact: 'James Bay is the southern arm of Hudson Bay — and yes, polar bears live on Ontario’s coast up there.',
  }),
  choice('og-16', 'What is Ontario’s longest river?', ['Grand River', 'Albany River', 'Thames River', 'Ottawa River', 'Severn River', 'Trent River', 'Rideau River'], 'Albany River', {
    emoji: '🌊',
    weight: 1,
    points: 5,
    funFact: 'The Albany runs about 980 km across the north and empties into James Bay.',
  }),

  // --- landforms & regions ---------------------------------------------------
  choice('og-17', 'What is the ancient rocky region covering most of NORTHERN Ontario?', ['the Great Plains', 'the Canadian Shield', 'the Appalachians', 'the Niagara Escarpment', 'the Interior Plains', 'the Boreal Basin', 'the Arctic Lowlands'], 'the Canadian Shield', {
    emoji: '🪨',
    funFact: 'Thin soil, endless lakes, pink and grey rock — that is Shield country, and it is billions of years old.',
  }),
  choice('og-18', 'What is the long ridge of cliffs running from Niagara up to Tobermory?', ['the Canadian Shield', 'the Niagara Escarpment', 'the Oak Ridges Moraine', 'the Bruce Ridge', 'the Frontenac Arch', 'the Algonquin Dome', 'the Erie Rise'], 'the Niagara Escarpment', {
    emoji: '🧗',
    funFact: 'It is the same wall of rock that Niagara Falls tumbles over. It runs for 725 km.',
  }),
  choice('og-19', 'Which long hiking trail follows the Niagara Escarpment?', ['Trans Canada Trail', 'Bruce Trail', 'Rideau Trail', 'Voyageur Trail', 'Ganaraska Trail', 'Avon Trail', 'Thames Trail'], 'Bruce Trail', {
    emoji: '🥾',
    weight: 1,
    points: 5,
    funFact: 'At about 900 km it is Canada’s oldest and longest marked footpath.',
  }),
  choice('og-20', 'Which peninsula sticks up between Georgian Bay and Lake Huron?', ['Niagara Peninsula', 'Bruce Peninsula', 'Pelee Peninsula', 'Prince Edward County', 'Manitoulin Peninsula', 'Saugeen Point', 'Simcoe Peninsula'], 'Bruce Peninsula', {
    emoji: '🌲',
    funFact: 'The water there is so clear and blue that photos of it get accused of being fake.',
  }),
  choice('og-21', 'Which Ontario park is famous for canoe trips, moose and wolf howls?', ['Killarney', 'Algonquin Provincial Park', 'Sleeping Giant', 'Bruce Peninsula', 'Pukaskwa', 'Bon Echo', 'Presqu’ile'], 'Algonquin Provincial Park', {
    emoji: '🛶',
    funFact: 'Algonquin is bigger than Prince Edward Island and has over 2,400 lakes inside it.',
  }),
  choice('og-22', 'Which region is Ontario’s most famous cottage country?', ['Niagara', 'Muskoka', 'Kawartha North', 'Haliburton Hills', 'Prince Edward County', 'Bruce County', 'Simcoe Shores'], 'Muskoka', {
    emoji: '🏕️',
    weight: 1,
    points: 5,
    funFact: 'People call it "going up north" even though it is only two hours from the city.',
  }),
  choice('og-23', 'What is the southernmost point of mainland Canada, and it is in Ontario?', ['Point Clark', 'Point Pelee', 'Long Point', 'Presqu’ile Point', 'Turkey Point', 'Cape Croker', 'Rondeau Point'], 'Point Pelee', {
    emoji: '📍',
    funFact: 'Point Pelee is on the same latitude as northern California. Ontario reaches surprisingly far south.',
  }),
  choice('og-24', 'What is the busy built-up region curving around the west end of Lake Ontario called?', ['the Golden Triangle', 'the Golden Horseshoe', 'the Silver Crescent', 'the Great Lakes Belt', 'the Southern Arc', 'the Erie Corridor', 'the Niagara Loop'], 'the Golden Horseshoe', {
    emoji: '🐴',
    funFact: 'Around 9 million people live in that curve — roughly a quarter of everyone in Canada.',
  }),
  choice('og-25', 'Which part of Ontario has almost all of the province’s people?', ['the north', 'the south', 'the east coast', 'the west edge', 'the middle', 'the Shield', 'the James Bay coast'], 'the south', {
    emoji: '👥',
    funFact: 'Northern Ontario is about 90% of the land and about 6% of the people.',
  }),
  choice('og-26', 'Ontario is the ___ largest province by area.', ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'], 'second', {
    emoji: '📏',
    funFact: 'Quebec is bigger. Ontario is still larger than France and Spain combined.',
  }),

  // --- cities (Toronto lives in its own topic) --------------------------------
  choice('og-27', 'Which Ontario city is the capital of CANADA?', ['Kingston', 'Ottawa', 'Hamilton', 'London', 'Sudbury', 'Windsor', 'Barrie'], 'Ottawa', {
    emoji: '🏛️',
    funFact: 'Queen Victoria picked it. At the time it was a rough logging town and everybody was baffled.',
  }),
  choice('og-28', 'Which Ontario city is famous for steel mills and sits at the end of Lake Ontario?', ['London', 'Hamilton', 'Oshawa', 'Windsor', 'Kingston', 'Sarnia', 'Brantford'], 'Hamilton', {
    emoji: '🏭',
    funFact: 'Hamilton has over 100 waterfalls inside the city, thanks to the escarpment cutting through it.',
  }),
  choice('og-29', 'Which northern Ontario city grew up around nickel mining?', ['Thunder Bay', 'Sudbury', 'Timmins', 'North Bay', 'Sault Ste. Marie', 'Kenora', 'Kapuskasing'], 'Sudbury', {
    emoji: '⛏️',
    funFact: 'Sudbury has a giant model nickel coin you can walk up to — and NASA once trained astronauts on its rocks.',
  }),
  choice('og-30', 'Which Ontario city is a big port on Lake Superior?', ['Sudbury', 'Thunder Bay', 'Sault Ste. Marie', 'Kenora', 'Timmins', 'North Bay', 'Dryden'], 'Thunder Bay', {
    emoji: '🚢',
    funFact: 'Prairie wheat travels by train to Thunder Bay, then by ship down the lakes to the world.',
  }),
  choice('og-31', 'Which city sits where Lake Ontario empties into the St. Lawrence River?', ['Ottawa', 'Kingston', 'Belleville', 'Cornwall', 'Brockville', 'Peterborough', 'Oshawa'], 'Kingston', {
    emoji: '🏰',
    funFact: 'Kingston was Canada’s very first capital city — for three years, before the job moved on.',
  }),
  choice('og-32', 'Which southwestern Ontario city sits on its own Thames River?', ['Windsor', 'London', 'Sarnia', 'Guelph', 'Chatham', 'Woodstock', 'Stratford'], 'London', {
    emoji: '🇬🇧',
    funFact: 'London, Ontario has a Thames River, an Oxford Street and a Covent Garden Market. Subtle it is not.',
  }),
  choice('og-33', 'Which pair of Ontario cities are known as a tech hub with a big university?', ['Barrie and Orillia', 'Kitchener and Waterloo', 'Sarnia and Windsor', 'Peterborough and Lindsay', 'Guelph and Cambridge', 'Belleville and Trenton', 'Owen Sound and Collingwood'], 'Kitchener and Waterloo', {
    emoji: '💻',
    weight: 1,
    points: 5,
    funFact: 'The BlackBerry phone was invented in Waterloo, back when everyone typed with two thumbs.',
  }),
  choice('og-34', 'Which Ontario region is famous for wine and peaches?', ['Muskoka', 'Niagara Region', 'Bruce County', 'Algoma', 'Kawarthas', 'Haliburton', 'Rainy River'], 'Niagara Region', {
    emoji: '🍑',
    weight: 1,
    points: 5,
    funFact: 'The lake and the escarpment trap warm air, making it one of Canada’s few fruit-growing belts.',
  }),
  choice('og-35', 'Which Ontario town has "the world’s longest freshwater beach"?', ['Grand Bend', 'Wasaga Beach', 'Sauble Beach', 'Port Dover', 'Sandbanks', 'Kincardine', 'Goderich'], 'Wasaga Beach', {
    emoji: '🏖️',
    weight: 1,
    points: 5,
    funFact: 'About 14 km of sand along Georgian Bay — packed shoulder to shoulder every July.',
  }),
  choice('og-36', 'Which rocky landmark shaped like a resting figure lies near Thunder Bay?', ['the Old Man', 'the Sleeping Giant', 'the Stone Chief', 'the Grand Sentinel', 'the Watcher', 'the Great Bear', 'the Silent King'], 'the Sleeping Giant', {
    emoji: '🗿',
    weight: 1,
    points: 5,
    funFact: 'Ojibwe stories say it is Nanabijou, turned to stone for protecting a silver mine.',
  }),

  // --- symbols & extras -------------------------------------------------------
  choice('og-37', 'What is Ontario’s official flower?', ['white trillium', 'wild rose', 'purple violet', 'blue flag iris', 'mayflower', 'lady’s slipper', 'prairie lily'], 'white trillium', {
    emoji: '🌸',
    funFact: 'Three white petals, forests full of them in spring. It is on the province’s coat of arms too.',
  }),
  choice('og-38', 'What is Ontario’s official tree?', ['sugar maple', 'eastern white pine', 'red oak', 'balsam fir', 'white birch', 'black spruce', 'silver maple'], 'eastern white pine', {
    emoji: '🌲',
    weight: 1,
    points: 5,
    funFact: 'Giant white pines were cut for ship masts for the British navy — the tallest ones were reserved for the King.',
  }),
  choice('og-39', 'The name "Ontario" comes from an Indigenous word meaning what?', ['great forest', 'beautiful water', 'cold north', 'many rocks', 'wide land', 'meeting place', 'high hill'], 'beautiful water', {
    emoji: '💦',
    funFact: 'Fitting for a province holding around a fifth of the planet’s fresh surface water.',
  }),
  choice('og-40', 'Which Ontario provincial park in the far north is named for an Arctic animal?', ['Algonquin', 'Polar Bear Provincial Park', 'Killarney', 'Quetico', 'Pukaskwa', 'Wabakimi', 'Sandbanks'], 'Polar Bear Provincial Park', {
    emoji: '🐻‍❄️',
    weight: 1,
    points: 5,
    funFact: 'It is Ontario’s biggest park and there are no roads to it at all — you fly in.',
  }),
  choice('og-41', 'Which ski area near Collingwood is Ontario’s best-known winter resort?', ['Mont Tremblant', 'Blue Mountain', 'Horseshoe Valley', 'Mount St. Louis', 'Snow Valley', 'Calabogie Peaks', 'Searchmont'], 'Blue Mountain', {
    emoji: '⛷️',
    weight: 1,
    points: 5,
    funFact: 'It sits right on the Niagara Escarpment — the same cliff that makes Niagara Falls fall.',
  }),

  // --- write-in ---------------------------------------------------------------
  {
    id: 'og-42',
    topicId: T,
    type: 'write',
    prompt: 'Type the name of the largest freshwater island in the world:',
    emoji: '✍️',
    accept: ['Manitoulin', 'Manitoulin Island'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'The name comes from "Manitou" — spirit. Many Anishinaabe communities live there today.',
  },
  {
    id: 'og-43',
    topicId: T,
    type: 'write',
    prompt: 'Which Great Lake is Thunder Bay on? Type the lake’s name:',
    emoji: '✍️',
    accept: ['Superior', 'Lake Superior'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Lake Superior is cold enough year-round that swimming in it counts as a dare.',
  },
  {
    id: 'og-44',
    topicId: T,
    type: 'write',
    prompt: 'Type the canal that lets ships get around Niagara Falls:',
    emoji: '✍️',
    accept: ['Welland', 'Welland Canal'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Without it, a ship going from Lake Erie to Lake Ontario would have to go over the falls. Once.',
  },
  {
    id: 'og-45',
    topicId: T,
    type: 'write',
    prompt: 'Type Ontario’s official flower:',
    emoji: '🌸',
    accept: ['Trillium', 'White trillium'],
    weight: 1,
    points: 5,
    status: 'active',
    createdAt: AT,
    funFact: 'It is also the symbol on Ontario government signs and licence plates.',
  },

  // --- match -------------------------------------------------------------------
  {
    id: 'og-46',
    topicId: T,
    type: 'match',
    prompt: 'Match each Ontario city to the water it sits on:',
    emoji: '🔗',
    pairs: [
      { left: 'Thunder Bay', right: 'Lake Superior' },
      { left: 'Hamilton', right: 'Lake Ontario' },
      { left: 'Kingston', right: 'St. Lawrence River' },
      { left: 'Ottawa', right: 'Ottawa River' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Almost every old Ontario city started as a port — before roads, water WAS the road.',
  },
  {
    id: 'og-47',
    topicId: T,
    type: 'match',
    prompt: 'Match each Ontario place to what it is known for:',
    emoji: '📍',
    pairs: [
      { left: 'Sudbury', right: 'nickel mining' },
      { left: 'Niagara', right: 'waterfalls and wine' },
      { left: 'Muskoka', right: 'cottages and lakes' },
      { left: 'Algonquin', right: 'canoe trips and moose' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Four places, four completely different Ontarios — and all within a day’s drive of each other.',
  },
  {
    id: 'og-48',
    topicId: T,
    type: 'match',
    prompt: 'Match each landform to where it is:',
    emoji: '🗺️',
    pairs: [
      { left: 'Canadian Shield', right: 'northern Ontario' },
      { left: 'Golden Horseshoe', right: 'west end of Lake Ontario' },
      { left: 'Bruce Peninsula', right: 'between Georgian Bay and Lake Huron' },
      { left: 'Point Pelee', right: 'the far southern tip' },
    ],
    weight: 1,
    points: 6,
    status: 'active',
    createdAt: AT,
    funFact: 'Ontario stretches so far that its top and bottom belong to totally different worlds.',
  },

  // --- order --------------------------------------------------------------------
  {
    id: 'og-49',
    topicId: T,
    type: 'order',
    prompt: 'Water flows through the Great Lakes in one direction. Put them in FLOW order, starting upstream:',
    emoji: '💧',
    sequence: ['Lake Superior', 'Lake Huron', 'Lake Erie', 'Lake Ontario'],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'A drop leaving Lake Superior takes roughly 200 years to reach the Atlantic. No rush.',
  },
  {
    id: 'og-50',
    topicId: T,
    type: 'order',
    prompt: 'Put these Ontario cities in order from SOUTH to NORTH:',
    emoji: '🧭',
    sequence: ['Windsor', 'Barrie', 'Sudbury', 'Thunder Bay'],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Windsor to Thunder Bay is a 16-hour drive — and you never once leave Ontario.',
  },
]
