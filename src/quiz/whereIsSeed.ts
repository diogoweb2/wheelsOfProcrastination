// Where Is This? (§14f) — four map quizzes, written by hand in session.
// A map with no names on it: he taps the place. Canada and Toronto/GTA carry the
// useful extras; USA and Europe are places and capitals, nothing else, as asked.
//
// Each quiz has a FIRST GOAL (`firstGoal: true`): where things are. Everything
// else stays shut in training until he knows those.
//
// Ids are built from the place, never from a position, so adding a question can
// never reattach his stats to another one.
//
// This file only seeds Firestore (app/quizBank): an id already in the bank is
// never rewritten. To correct a live question, edit it in Firestore as well.
import type { QuizMapSpec, QuizQuestion } from '../types'
import { CANADA_NAMES, EUROPE_COUNTRIES, GTA_NAMES, MAP_NAMES, TORONTO_NAMES, US_STATES } from './maps/names'
import type { MapId, MapPick } from './maps/types'

const AT = '2026-11-06T00:00:00.000Z'

/** Taps are quick and there are hundreds of them, so each pays less than a read-and-think card. */
const POINTS = 5

type Extra = Partial<QuizQuestion>

const base = (topicId: string, id: string, prompt: string, extra: Extra): QuizQuestion => ({
  id,
  topicId,
  type: 'map',
  prompt,
  weight: 2,
  points: POINTS,
  status: 'active',
  createdAt: AT,
  ...extra,
})

/** A tap question. The answer text is spelled out here so the bank never needs the drawings. */
function tap(topicId: string, mapId: MapId, id: string, prompt: string, targets: string[], extra: Extra = {}, pick?: MapPick): QuizQuestion {
  const map: QuizMapSpec = { id: mapId, targets, ...(pick ? { pick } : {}) }
  return base(topicId, id, prompt, { map, answer: targets.map((t) => MAP_NAMES[mapId][t]).join(' · '), ...extra })
}

/** A place lit up on the map, for him to name. */
function name(topicId: string, mapId: MapId, id: string, prompt: string, show: string, answer: string, choices: string[], extra: Extra = {}): QuizQuestion {
  return base(topicId, id, prompt, { type: 'choice', map: { id: mapId, show }, answer, choices, ...extra })
}

/** Neighbours in the table make the best wrong answers: same part of the map, same kind of name. */
function around<T>(list: T[], i: number, count: number): T[] {
  const out: T[] = []
  for (let step = 1; out.length < count && step < list.length; step++) {
    out.push(list[(i + step) % list.length])
    if (out.length < count) out.push(list[(i - step + list.length) % list.length])
  }
  return out
}

// --- 🍁 Canada ---------------------------------------------------------------

const CA = 'where-canada'
const PROVINCES = ['bc', 'ab', 'sk', 'mb', 'on', 'qc', 'nb', 'ns', 'pe', 'nl']
const PROVINCE_NAMES = PROVINCES.map((p) => CANADA_NAMES[p])

const CANADA_CAPITALS: [string, string][] = [
  ['bc', 'Victoria'],
  ['ab', 'Edmonton'],
  ['sk', 'Regina'],
  ['mb', 'Winnipeg'],
  ['on', 'Toronto'],
  ['qc', 'Quebec City'],
  ['nb', 'Fredericton'],
  ['ns', 'Halifax'],
  ['pe', 'Charlottetown'],
  ['nl', 'St. John’s'],
]

/** [province, place, photo, one line about it] */
const CANADA_SIGHTS: [string, string, string, string][] = [
  ['bc', 'Stanley Park', 'stanley-park', 'Vancouver’s giant park by the ocean, with totem poles and a seawall you can walk or cycle around.'],
  ['ab', 'Lake Louise', 'lake-louise', 'A bright turquoise lake in the Rocky Mountains, in Banff National Park.'],
  ['sk', 'Grasslands National Park', 'grasslands', 'Wild prairie with bison, and one of the darkest night skies in Canada.'],
  ['mb', 'Churchill, the polar bear capital of the world', 'churchill-polar-bear', 'Every fall, polar bears gather here to wait for Hudson Bay to freeze.'],
  ['on', 'Niagara Falls', 'niagara-falls', 'The huge Horseshoe Falls sit right on the border with the USA.'],
  ['qc', 'the Château Frontenac', 'chateau-frontenac', 'This castle-like hotel towers over Old Quebec, the old walled city.'],
  ['nb', 'the Hopewell Rocks', 'hopewell-rocks', 'The Bay of Fundy has the highest tides in the world. At low tide you can walk around these rocks; at high tide they are islands.'],
  ['ns', 'Peggy’s Cove', 'peggys-cove', 'A little fishing village with one of the most photographed lighthouses in Canada.'],
  ['pe', 'Green Gables', 'green-gables', 'The farmhouse that inspired Anne of Green Gables, the famous book about a red-haired orphan.'],
  ['nl', 'Gros Morne National Park', 'gros-morne', 'Giant cliffs and deep fjords on Newfoundland’s west coast.'],
]

const CANADA: QuizQuestion[] = [
  // the first goal: every province
  ...PROVINCES.map((p) =>
    tap(CA, 'canada', `wc-loc-${p}`, `Where is ${CANADA_NAMES[p]}?`, [p], { emoji: '📍', firstGoal: true }),
  ),
  // the other way round
  ...PROVINCES.map((p, i) =>
    name(CA, 'canada', `wc-name-${p}`, 'Which province is lit up?', p, CANADA_NAMES[p], [CANADA_NAMES[p], ...around(PROVINCE_NAMES, i, 6)], { emoji: '🔦' }),
  ),
  // capitals
  ...CANADA_CAPITALS.map(([p, city]) =>
    tap(CA, 'canada', `wc-cap-${p}`, `${city} is the capital of which province?`, [p], {
      emoji: '🏛️',
      ...(p === 'on' ? { funFact: 'Toronto is the capital of Ontario. The capital of the whole country is Ottawa.' } : {}),
      ...(p === 'bc' ? { funFact: 'Victoria is on Vancouver Island. It is not the city of Vancouver.' } : {}),
    }),
  ),
  tap(CA, 'canada', 'wc-ottawa', 'Ottawa is the capital of all of Canada. Which province is it in?', ['on'], {
    emoji: '🇨🇦',
    funFact: 'Ottawa is in Ontario, right on the border with Quebec. Ontario’s own capital is Toronto.',
  }),
  // the big cities that are not capitals
  tap(CA, 'canada', 'wc-city-vancouver', 'Which province is Vancouver in?', ['bc'], { emoji: '🌆', weight: 1 }),
  tap(CA, 'canada', 'wc-city-calgary', 'Which province is Calgary in?', ['ab'], { emoji: '🌆', weight: 1 }),
  tap(CA, 'canada', 'wc-city-montreal', 'Which province is Montreal in?', ['qc'], { emoji: '🌆', weight: 1 }),
  // one famous thing per province
  ...CANADA_SIGHTS.map(([p, place, photo, line]) =>
    tap(CA, 'canada', `wc-see-${p}`, `Which province would you go to, to see ${place}?`, [p], {
      emoji: '📸',
      image: `/where-is/${photo}.webp`,
      funFact: line,
      weight: 1,
    }),
  ),
  // rivers, mountains, coasts
  tap(CA, 'canada', 'wc-stlawrence', 'The St. Lawrence River runs through 2 provinces. Tap both.', ['on', 'qc'], {
    emoji: '🌊',
    funFact: 'It carries the water of the Great Lakes through Ontario and Quebec, out to the Atlantic.',
  }),
  tap(CA, 'canada', 'wc-rockies', 'The Canadian Rockies run through 2 provinces. Tap both.', ['bc', 'ab'], {
    emoji: '🏔️',
    funFact: 'The Rockies run along the border between British Columbia and Alberta.',
  }),
  tap(CA, 'canada', 'wc-greatlakes', 'Only 1 province touches the Great Lakes. Which one?', ['on'], { emoji: '🌊' }),
  tap(CA, 'canada', 'wc-pacific', 'Only 1 province is on the Pacific Ocean. Which one?', ['bc'], { emoji: '🌊' }),
  tap(CA, 'canada', 'wc-atlantic', 'Tap the 4 Atlantic provinces.', ['nb', 'ns', 'pe', 'nl'], {
    emoji: '🌊',
    funFact: 'New Brunswick, Nova Scotia, Prince Edward Island and Newfoundland and Labrador.',
  }),
  tap(CA, 'canada', 'wc-prairies', 'Tap the 3 Prairie provinces.', ['ab', 'sk', 'mb'], { emoji: '🌾' }),
  tap(CA, 'canada', 'wc-coast', 'Which provinces have ocean access? Tap them all.', ['bc', 'mb', 'on', 'qc', 'nb', 'ns', 'pe', 'nl'], {
    emoji: '⚓',
    family: 'wc-coast',
    funFact: 'Eight of the ten. Manitoba and Ontario get there through Hudson Bay, which opens to the ocean. Only Alberta and Saskatchewan have no sea coast.',
  }),
  tap(CA, 'canada', 'wc-landlocked', 'Only 2 provinces have no sea coast at all. Tap both.', ['ab', 'sk'], {
    emoji: '⚓',
    family: 'wc-coast',
    funFact: 'Manitoba looks landlocked, but it reaches Hudson Bay at the top.',
  }),
  // languages
  tap(CA, 'canada', 'wc-french', 'Which province has French as its only official language?', ['qc'], { emoji: '🗣️' }),
  tap(CA, 'canada', 'wc-bilingual', 'Only 1 province is officially bilingual, in English and French. Which one?', ['nb'], {
    emoji: '🗣️',
    funFact: 'Not Quebec: Quebec is French only. New Brunswick is the one with both.',
  }),
  // sizes
  tap(CA, 'canada', 'wc-biggest', 'Which province is the biggest by land?', ['qc'], { emoji: '📏' }),
  tap(CA, 'canada', 'wc-smallest', 'Which province is the smallest?', ['pe'], { emoji: '📏', funFact: 'It is also the only province that is one whole island.' }),
  tap(CA, 'canada', 'wc-people', 'Which province has the most people?', ['on'], { emoji: '👥', funFact: 'About 4 in every 10 Canadians live in Ontario.' }),
  tap(CA, 'canada', 'wc-alaska', 'Which province shares a border with Alaska?', ['bc'], { emoji: '🧭', weight: 1 }),
  tap(CA, 'canada', 'wc-territories', 'Canada also has 3 territories up north. Tap all 3.', ['yt', 'nt', 'nu'], {
    emoji: '❄️',
    funFact: 'Yukon, the Northwest Territories and Nunavut.',
  }),
]

// --- 🏙️ Toronto & GTA ---------------------------------------------------------

const TG = 'where-gta'
const AREAS = ['oldtoronto', 'etobicoke', 'york', 'eastyork', 'northyork', 'scarborough']
const AREA_NAMES = AREAS.map((a) => TORONTO_NAMES[a])
const CITIES = ['mississauga', 'brampton', 'oakville', 'burlington', 'milton', 'vaughan', 'richmondhill', 'markham', 'pickering', 'ajax', 'whitby', 'oshawa']
const CITY_NAMES = CITIES.map((c) => GTA_NAMES[c])
const HIGHWAYS = ['h401', 'h404', 'h407', 'h427']

const toronto = (id: string, prompt: string, targets: string[], extra: Extra = {}) => tap(TG, 'toronto', id, prompt, targets, extra)
const gta = (id: string, prompt: string, targets: string[], extra: Extra = {}) => tap(TG, 'gta', id, prompt, targets, extra)
const road = (id: string, prompt: string, target: string, extra: Extra = {}) =>
  tap(TG, 'gta', id, prompt, [target], { emoji: '🛣️', family: `wg-${target}`, ...extra }, 'highway')

const GTA: QuizQuestion[] = [
  // the first goal: the six areas and the two rivers
  ...AREAS.map((a) => toronto(`wg-loc-${a}`, `Where is ${TORONTO_NAMES[a]}?`, [a], { emoji: '📍', firstGoal: true })),
  tap(TG, 'toronto', 'wg-loc-humber', 'Where is the Humber River?', ['humber'], { emoji: '🌊', firstGoal: true, funFact: 'The Humber is the big river on the west side of the city.' }, 'river'),
  tap(TG, 'toronto', 'wg-loc-don', 'Where is the Don River?', ['don'], { emoji: '🌊', firstGoal: true, funFact: 'The Don runs down the middle of the city, through the Don Valley, in two branches that join up.' }, 'river'),
  // the other way round
  ...AREAS.map((a, i) =>
    name(TG, 'toronto', `wg-name-${a}`, 'Which part of Toronto is lit up?', a, TORONTO_NAMES[a], [TORONTO_NAMES[a], ...around(AREA_NAMES, i, 5)], { emoji: '🔦' }),
  ),
  // what is where in the city
  toronto('wg-cntower', 'Which part of Toronto is the CN Tower in?', ['oldtoronto'], { emoji: '🗼' }),
  toronto('wg-highpark', 'Which part of Toronto is High Park in?', ['oldtoronto'], { emoji: '🌳', weight: 1 }),
  toronto('wg-zoo', 'Which part of Toronto is the Toronto Zoo in?', ['scarborough'], { emoji: '🦒' }),
  toronto('wg-yorkdale', 'Which part of Toronto is Yorkdale Mall in?', ['northyork'], { emoji: '🛍️', weight: 1 }),
  toronto('wg-lakeshore', '3 of the 6 areas touch Lake Ontario. Tap all 3.', ['etobicoke', 'oldtoronto', 'scarborough'], {
    emoji: '🌊',
    funFact: 'Etobicoke in the west, Old Toronto in the middle and Scarborough in the east.',
  }),
  toronto('wg-westofhumber', 'Which of the 6 areas is on the far side of the Humber, to the west?', ['etobicoke'], { emoji: '🧭' }),
  toronto('wg-donmouth', 'The Don River reaches Lake Ontario in which area?', ['oldtoronto'], { emoji: '🧭' }),
  // the cities around Toronto
  ...CITIES.map((c) => gta(`wg-city-${c}`, `Where is ${GTA_NAMES[c]}?`, [c], { emoji: '📍' })),
  ...['mississauga', 'brampton', 'oakville', 'milton', 'vaughan', 'richmondhill', 'markham', 'oshawa'].map((c) => {
    const i = CITIES.indexOf(c)
    return name(TG, 'gta', `wg-name-${c}`, 'Which city is lit up?', c, GTA_NAMES[c], [GTA_NAMES[c], ...around(CITY_NAMES, i, 6)], { emoji: '🔦' })
  }),
  gta('wg-pearson', 'Pearson Airport is not in Toronto. Which city is it in?', ['mississauga'], {
    emoji: '✈️',
    funFact: 'Toronto’s big airport is just over the city line, in Mississauga.',
  }),
  gta('wg-wonderland', 'Which city is Canada’s Wonderland in?', ['vaughan'], { emoji: '🎢' }),
  gta('wg-north', 'Which 2 cities touch Toronto’s north side? Tap both.', ['vaughan', 'markham'], {
    emoji: '🧭',
    funFact: 'Steeles Avenue is the line: Vaughan on the west side of Yonge, Markham on the east. Richmond Hill sits just above them.',
  }),
  gta('wg-west1', 'Drive west from Toronto along the lake. Which city comes first?', ['mississauga'], { emoji: '🧭' }),
  gta('wg-west2', 'Keep going west along the lake, past Mississauga. Which city is next?', ['oakville'], { emoji: '🧭', weight: 1 }),
  gta('wg-east1', 'Drive east from Toronto along the lake. Which city comes first?', ['pickering'], { emoji: '🧭' }),
  gta('wg-east2', 'Keep going east along the lake, past Pickering. Which city is next?', ['ajax'], { emoji: '🧭', weight: 1 }),
  gta('wg-peel', 'Tap the 2 big cities of Peel Region.', ['mississauga', 'brampton'], { emoji: '🗺️', weight: 1 }),
  // the highways
  ...HIGHWAYS.map((h) => road(`wg-road-${h}`, `Tap the ${h.slice(1)}.`, h)),
  road('wg-acrosscity', 'Which highway crosses all of Toronto, from west to east?', 'h401', { funFact: 'The 401 is one of the busiest highways in North America.' }),
  road('wg-toll', 'On which highway do you pay a toll?', 'h407', { funFact: 'The 407 runs north of Toronto. Most of it charges a toll, billed by camera.' }),
  road('wg-north404', 'Which highway runs straight north from the 401, toward Newmarket?', 'h404'),
  road('wg-pearson427', 'Which highway runs north and south beside Pearson Airport?', 'h427'),
]

// --- 🗽 USA and 🏰 Europe: where it is, and its capital ----------------------

function placesAndCapitals(
  topicId: string,
  mapId: MapId,
  prefix: string,
  noun: string,
  table: [string, string, string, string?][],
): QuizQuestion[] {
  const capitals = table.map(([, , capital]) => capital)
  return [
    ...table.map(([id, place]) => tap(topicId, mapId, `${prefix}-loc-${id}`, `Where is ${place}?`, [id], { emoji: '📍', firstGoal: true })),
    ...table.map(([id, place, capital, guess]) =>
      tap(topicId, mapId, `${prefix}-cap-${id}`, `${capital} is the capital of which ${noun}?`, [id], {
        emoji: '🏛️',
        family: `${prefix}-capital-${id}`,
        ...(guess ? { funFact: `${capital}, not ${guess}, is the capital of ${place}.` } : {}),
      }),
    ),
    ...table.map(([id, place, capital, guess], i) =>
      name(topicId, mapId, `${prefix}-capq-${id}`, `What is the capital of ${place}?`, id, capital, [capital, ...around(capitals, i, 6)], {
        emoji: '🏛️',
        family: `${prefix}-capital-${id}`,
        ...(guess ? { funFact: `${capital}, not ${guess}, is the capital of ${place}.` } : {}),
      }),
    ),
  ]
}

export const WHERE_IS_SEED: QuizQuestion[] = [
  ...CANADA,
  ...GTA,
  ...placesAndCapitals('where-usa', 'usa', 'wu', 'state', US_STATES),
  ...placesAndCapitals('where-europe', 'europe', 'we', 'country', EUROPE_COUNTRIES),
]
