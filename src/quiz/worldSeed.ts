// Where Is This? (§14f) — South America, Africa, Asia & Oceania: same quiz as
// Europe. Where each country is, then its capital both ways. Capitals checked
// against a reference list when written; they do move (Equatorial Guinea, 2026).
//
// These live in their own Firestore document, app/quizBankWorld: `app/quizBank`
// was already ~770 KB of its 1 MB ceiling. Any topic whose id starts with
// WORLD_PREFIX lands there (src/store/cloud.ts).
import type { QuizQuestion } from '../types'
import { AFRICA_COUNTRIES, ASIA_COUNTRIES, OCEANIA_COUNTRIES, SOUTH_AMERICA_COUNTRIES, TTC_NAMES, WORLD_NAMES } from './maps/names'
import type { MapId, MapPick } from './maps/types'
import { base, placesAndCapitals, tap } from './whereIsSeed'

export const WORLD_SEED: QuizQuestion[] = [
  ...placesAndCapitals('world-south-america', 'samerica', 'ws', 'country', SOUTH_AMERICA_COUNTRIES),
  ...placesAndCapitals('world-africa', 'africa', 'wf', 'country', AFRICA_COUNTRIES),
  // one quiz, two maps: a single drawing from Turkey to Samoa would make everything too small to tap
  ...placesAndCapitals('world-asia-oceania', 'asia', 'wa', 'country', ASIA_COUNTRIES),
  ...placesAndCapitals('world-asia-oceania', 'oceania', 'wo', 'country', OCEANIA_COUNTRIES),
]

// --- 🌐 Physical World --------------------------------------------------------

const PW = 'world-physical'
const world = (id: string, prompt: string, targets: string[], extra: Partial<QuizQuestion> = {}, pick?: MapPick) =>
  tap(PW, 'world', `wp-${id}`, prompt, targets, extra, pick)
const ocean = (id: string, prompt: string, targets: string[], extra: Partial<QuizQuestion> = {}) => world(id, prompt, targets, { emoji: '🌊', ...extra }, 'ocean')
const river = (id: string, prompt: string, target: string, extra: Partial<QuizQuestion> = {}) =>
  world(id, prompt, [target], { emoji: '🏞️', family: `wp-${target}`, ...extra }, 'river')
const range = (id: string, prompt: string, target: string, extra: Partial<QuizQuestion> = {}) =>
  world(id, prompt, [target], { emoji: '🏔️', family: `wp-${target}`, ...extra }, 'range')
const desert = (id: string, prompt: string, target: string, extra: Partial<QuizQuestion> = {}) =>
  world(id, prompt, [target], { emoji: '🏜️', family: `wp-${target}`, ...extra }, 'desert')

const PHYSICAL: QuizQuestion[] = [
  // the first goal: the seven continents and five oceans
  ...['na', 'sa', 'eu', 'af', 'as', 'oc', 'an'].map((c) =>
    world(`loc-${c}`, `Where is ${WORLD_NAMES[c]}?`, [c], { emoji: '📍', firstGoal: true }),
  ),
  ...['pacific', 'atlantic', 'indian', 'arctic', 'southern'].map((o) =>
    ocean(`loc-${o}`, `Where is the ${WORLD_NAMES[o]}?`, [o], { firstGoal: true }),
  ),
  // rivers, ranges, deserts
  ...['nile', 'amazon', 'mississippi', 'yangtze', 'ganges', 'danube', 'congo', 'volga', 'mackenzie'].map((r) =>
    river(`loc-${r}`, `Where is the ${WORLD_NAMES[r]}?`, r),
  ),
  ...['himalayas', 'andes', 'rockies', 'alps', 'urals', 'appalachians', 'atlas'].map((r) =>
    range(`loc-${r}`, `Where are the ${WORLD_NAMES[r]}?`, r),
  ),
  ...['sahara', 'gobi', 'kalahari', 'arabian', 'outback'].map((d) =>
    desert(`loc-${d}`, `Where is the ${WORLD_NAMES[d]}?`, d),
  ),
  // the continents
  world('biggest', 'Which is the biggest continent?', ['as'], { emoji: '📏' }),
  world('smallest', 'Which is the smallest continent?', ['oc'], { emoji: '📏', funFact: 'Australia is the smallest continent, and a country as well.' }),
  world('coldest', 'Which is the coldest continent?', ['an'], { emoji: '🧊', funFact: 'Nobody lives in Antarctica for good, only scientists for a while.' }),
  world('countries', 'Which continent has the most countries?', ['af'], { emoji: '🌍', funFact: 'Africa has 54 countries.' }),
  world('canada', 'Which continent is Canada on?', ['na'], { emoji: '🍁' }),
  world('brazil', 'Which continent is Brazil on?', ['sa'], { emoji: '🗺️' }),
  world('egypt', 'Which continent is Egypt on?', ['af'], { emoji: '🗺️' }),
  // the oceans
  ocean('biggest-ocean', 'Which is the biggest ocean?', ['pacific'], { funFact: 'The Pacific is bigger than all the land on Earth put together.' }),
  ocean('smallest-ocean', 'Which is the smallest ocean?', ['arctic']),
  ocean('canada-oceans', 'Canada touches 3 oceans. Tap all 3.', ['pacific', 'atlantic', 'arctic'], {
    funFact: 'That is why Canada’s motto is “from sea to sea”, and people often add a third sea.',
  }),
  ocean('canada-europe', 'Which ocean is between Canada and Europe?', ['atlantic']),
  ocean('ring-of-fire', 'The Ring of Fire, full of volcanoes and earthquakes, runs around which ocean?', ['pacific']),
  ocean('around-antarctica', 'Which ocean goes all the way around Antarctica?', ['southern']),
  ocean('india', 'Which ocean is south of India?', ['indian']),
  // the record holders
  river('egypt-river', 'Which river runs through Egypt?', 'nile', { funFact: 'Almost everyone in Egypt lives close to the Nile.' }),
  river('most-water', 'Which river carries the most water in the world?', 'amazon'),
  river('canada-river', 'Which is the longest river in Canada?', 'mackenzie', { funFact: 'It flows north through the Northwest Territories to the Arctic Ocean.' }),
  river('asia-river', 'Which is the longest river in Asia?', 'yangtze'),
  river('europe-river', 'Which is the longest river in Europe?', 'volga'),
  range('everest', 'Which mountains have Mount Everest, the tallest in the world?', 'himalayas'),
  range('longest', 'Which is the longest mountain range on land?', 'andes', { funFact: 'The Andes run down the whole west side of South America.' }),
  range('split', 'Which mountains are the line between Europe and Asia?', 'urals'),
  range('alberta', 'Which mountains run between Alberta and British Columbia?', 'rockies'),
  desert('hottest', 'Which is the biggest hot desert in the world?', 'sahara'),
  desert('mongolia', 'Which cold desert is in Mongolia and China?', 'gobi'),
]

// --- 🚇 TTC -------------------------------------------------------------------

const TC = 'world-ttc'
const line = (id: string, prompt: string, target: string, extra: Partial<QuizQuestion> = {}) =>
  tap(TC, 'ttc', `wt-${id}`, prompt, [target], { emoji: '🚇', family: `wt-${target}`, ...extra }, 'subway')
const stop = (id: string, prompt: string, targets: string[], extra: Partial<QuizQuestion> = {}) =>
  tap(TC, 'ttc', `wt-${id}`, prompt, targets, { emoji: '🚉', ...extra }, 'stop')
const fact = (id: string, prompt: string, answer: string, choices: string[], extra: Partial<QuizQuestion> = {}) =>
  base(TC, `wt-${id}`, prompt, { type: 'choice', answer, choices, emoji: '🎫', ...extra })

const TTC: QuizQuestion[] = [
  // the first goal: the five lines
  ...['line1', 'line2', 'line4', 'line5', 'line6'].map((l) => line(`loc-${l}`, `Tap ${TTC_NAMES[l]}.`, l, { firstGoal: true })),
  // the key stations
  ...['union', 'queen', 'stgeorge', 'spadina', 'bloor', 'eglinton', 'sheppard', 'finch', 'vmc', 'yorkdale', 'yorku', 'finchwest', 'cedarvale', 'kipling', 'kennedy', 'donmills', 'mountdennis', 'humbercollege'].map((s) =>
    stop(`stn-${s}`, `Tap ${TTC_NAMES[s]} station.`, [s]),
  ),
  // which line goes there
  line('bloor', 'Which line runs east and west under Bloor Street and the Danforth?', 'line2'),
  line('vaughan', 'Which line goes all the way up to Vaughan?', 'line1'),
  line('eglinton', 'Which line runs along Eglinton Avenue?', 'line5'),
  line('humber', 'Which line takes you to Humber College?', 'line6'),
  line('short', 'Which short line runs east from Yonge Street to Don Mills?', 'line4'),
  // where the lines meet
  stop('meet-1-2', 'Lines 1 and 2 meet at 3 stations. Tap all 3.', ['bloor', 'stgeorge', 'spadina'], {
    funFact: 'Bloor-Yonge on the Yonge side; St. George and Spadina on the University side.',
  }),
  stop('meet-1-5', 'Lines 1 and 5 meet at 2 stations. Tap both.', ['eglinton', 'cedarvale']),
  stop('meet-2-5', 'Where do Lines 2 and 5 meet?', ['kennedy']),
  // where to change
  stop('trip-finch', 'You are at Finch and want Don Mills. Where do you change?', ['sheppard']),
  stop('trip-donmills', 'You are at Don Mills and want Union. Where do you change?', ['sheppard']),
  stop('trip-mountdennis', 'You are at Mount Dennis and want Yorkdale. Where do you change?', ['cedarvale']),
  stop('trip-humber', 'You are at Humber College and want Union. Where do you change?', ['finchwest']),
  // the ends of the lines
  stop('end-east', 'Where does Line 2 end in the east?', ['kennedy']),
  stop('end-west', 'Where does Line 2 end in the west?', ['kipling']),
  stop('bottom', 'Line 1 is shaped like a U. Which station is at the bottom of the U?', ['union'], {
    funFact: 'Union is also where you catch GO trains and the UP Express to Pearson Airport.',
  }),
  stop('main', 'Which station is Toronto’s main train station, for GO and VIA trains?', ['union']),
  // riding it
  fact('presto', 'What do you tap to pay for a ride?', 'a PRESTO card', ['a PRESTO card', 'a library card', 'a health card', 'a student card']),
  fact('transfer', 'After you tap, how long can you keep changing vehicles for free?', '2 hours', ['2 hours', '30 minutes', '1 hour', '6 hours']),
  fact('free', 'Up to what age do kids ride the TTC for free?', '12', ['12', '6', '10', '16'], { funFact: 'Children 12 and under ride free. From 13 you pay a youth fare.' }),
  fact('alarm', 'Something feels wrong on the subway. What do you press?', 'the yellow alarm strip', ['the yellow alarm strip', 'the door button', 'the seat lever', 'the window latch'], {
    funFact: 'The yellow strip runs above the windows. Press it and the crew is told, right away.',
  }),
]

// --- 📜 Where did it happen? --------------------------------------------------

const CH = 'world-canada-history'
const when = (id: string, prompt: string, targets: string[], funFact: string, emoji = '📜') =>
  tap(CH, 'canada', `wh-${id}`, prompt, targets, { emoji, funFact })

const HISTORY: QuizQuestion[] = [
  // first arrivals
  when('vikings', 'The Vikings reached North America around the year 1000, at L’Anse aux Meadows. Which province is that?', ['nl'], 'It is the only proven Viking site in North America.', '⛵'),
  when('cartier', 'Jacques Cartier planted a cross at Gaspé in 1534. Which province is that?', ['qc'], 'He claimed the land for France.', '⛵'),
  when('portroyal', 'Port-Royal, one of the first French settlements, began in 1605. Which province is that?', ['ns'], 'It was the start of Acadia.', '⛵'),
  when('champlain', 'Samuel de Champlain founded Quebec City in 1608. Tap the province.', ['qc'], 'It became the heart of New France.', '⛵'),
  when('yorkfactory', 'York Factory was the Hudson’s Bay Company’s great fur trade post on Hudson Bay. Which province is it in?', ['mb'], 'Furs left for England from here for over 200 years.', '🦫'),
  // New France falls
  when('louisbourg', 'The French built the great Fortress of Louisbourg. Which province is it in?', ['ns'], 'It is on Cape Breton Island.', '🏰'),
  when('acadians', 'In 1755 the British forced the Acadians out of Grand-Pré. Which province is that?', ['ns'], 'Thousands were sent away on ships. It is called the Great Upheaval.', '🏰'),
  when('plains', 'Britain beat France at the Plains of Abraham in 1759. Which province is that?', ['qc'], 'Wolfe and Montcalm both died from that battle.', '⚔️'),
  // 1812 to 1837
  when('queenston', 'Isaac Brock died at the Battle of Queenston Heights in 1812. Which province is that?', ['on'], 'It was an early fight of the War of 1812, near Niagara.', '⚔️'),
  when('york', 'American troops burned the town of York in 1813. It is now Toronto. Tap the province.', ['on'], 'The next year the British burned the White House, partly in revenge.', '⚔️'),
  when('chateauguay', 'French Canadian soldiers stopped an American army at Châteauguay in 1813. Which province is that?', ['qc'], 'They were led by Charles de Salaberry.', '⚔️'),
  when('montgomery', 'William Lyon Mackenzie’s rebels marched from Montgomery’s Tavern in 1837. Which province is that?', ['on'], 'The tavern stood on Yonge Street, in what is now Toronto.', '🔥'),
  when('stdenis', 'The Patriotes beat the British at Saint-Denis in 1837. Which province is that?', ['qc'], 'It was the rebels’ only big win.', '🔥'),
  when('underground', 'Many people escaping slavery on the Underground Railroad settled at Buxton. Which province is that?', ['on'], 'Buxton is near Chatham, in southwestern Ontario.', '🕯️'),
  // building the country
  when('charlottetown', 'The talks that led to Confederation began at Charlottetown in 1864. Which province is that?', ['pe'], 'That is why PEI is called the Birthplace of Confederation.', '🇨🇦'),
  when('first4', 'Tap the 4 provinces that started Canada in 1867.', ['on', 'qc', 'ns', 'nb'], 'Ontario, Quebec, Nova Scotia and New Brunswick.', '🇨🇦'),
  when('fifth', 'Which province joined next, in 1870?', ['mb'], 'It came out of the Red River Resistance, led by Louis Riel.', '🇨🇦'),
  when('railwaypromise', 'Which province joined in 1871 because Canada promised it a railway?', ['bc'], 'The railway took 14 years to finish.', '🚂'),
  when('pei1873', 'Which province joined in 1873?', ['pe'], 'It had said no in 1867.', '🇨🇦'),
  when('1905', 'Which 2 provinces were created in 1905? Tap both.', ['ab', 'sk'], 'Both were carved out of the Northwest Territories.', '🇨🇦'),
  when('last', 'Which province joined last, in 1949?', ['nl'], 'Before that it was separate from Canada, under Britain.', '🇨🇦'),
  when('nunavut', 'Which territory was created in 1999, as a homeland for the Inuit?', ['nu'], 'It is the newest part of Canada.', '🇨🇦'),
  // the west
  when('redriver', 'Louis Riel led the Red River Resistance in 1869. Which province is that today?', ['mb'], 'Riel is called the Father of Manitoba.', '🔥'),
  when('batoche', 'The Métis made their last stand at Batoche in 1885. Which province is that today?', ['sk'], 'Riel was tried and hanged in Regina that year.', '🔥'),
  when('lastspike', 'The Last Spike of the Canadian Pacific Railway was driven at Craigellachie in 1885. Which province is that?', ['bc'], 'The railway finally joined the country from sea to sea.', '🚂'),
  when('klondike', 'Thousands rushed north for gold in the Klondike in 1898. Tap where.', ['yt'], 'Dawson City grew from nothing almost overnight.', '⛏️'),
  // the 1900s
  when('marconi', 'Marconi received the first radio signal across the Atlantic at Signal Hill in 1901. Which province is that?', ['nl'], 'It was in St. John’s.', '📻'),
  when('titanic', 'About 150 people from the Titanic are buried in one Canadian city, Halifax. Which province is that?', ['ns'], 'Ships from Halifax went out to recover them in 1912.', '🚢'),
  when('komagata', 'The Komagata Maru was turned away from Vancouver in 1914. Which province is that?', ['bc'], 'Its passengers from India were refused entry because of racist laws.', '🚢'),
  when('explosion', 'In 1917, a ship full of explosives blew up in Halifax harbour. Which province is that?', ['ns'], 'It was the biggest human-made explosion before the atomic bomb.', '💥'),
  when('strike', 'The Winnipeg General Strike shut a whole city down in 1919. Which province is that?', ['mb'], 'About 30,000 workers walked off the job.', '✊'),
  when('internment', 'In the 1940s, Canada forced Japanese Canadians from the coast of which province into camps?', ['bc'], 'Canada apologized for this in 1988.', '🚫'),
  // the world comes to Canada
  when('expo', 'Expo 67, Canada’s 100th birthday party, was held in Montreal. Which province is that?', ['qc'], 'Over 50 million visits in six months.', '🎉'),
  when('olympics76', 'Canada’s first Summer Olympics were in Montreal in 1976. Tap the province.', ['qc'], 'Canada is still the only host that won no gold at its own Summer Games.', '🏅'),
  when('olympics88', 'Canada’s first Winter Olympics were in Calgary in 1988. Tap the province.', ['ab'], 'The Jamaican bobsled team competed there.', '🏅'),
  when('olympics10', 'The 2010 Winter Olympics were in Vancouver. Tap the province.', ['bc'], 'Canada won the most gold medals.', '🏅'),
]

// --- 🚩 Flags -----------------------------------------------------------------

/** The flag emoji for a two-letter country code. */
const flagOf = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))

const FLAG_SETS: [MapId, string[]][] = [
  ['samerica', SOUTH_AMERICA_COUNTRIES.map(([id]) => id)],
  ['europe', ['gb', 'ie', 'fr', 'es', 'pt', 'nl', 'be', 'ch', 'de', 'at', 'it', 'gr', 'no', 'se', 'fi', 'dk', 'is', 'pl', 'cz', 'hu', 'hr', 'ro', 'ua', 'ru']],
  ['asia', ['cn', 'jp', 'kr', 'kp', 'in', 'pk', 'tr', 'sa', 'il', 'ir', 'th', 'vn', 'id', 'ph']],
  ['africa', ['eg', 'za', 'ng', 'ke', 'et', 'ma', 'gh']],
  ['oceania', ['au', 'nz']],
]

const FLAGS: QuizQuestion[] = FLAG_SETS.flatMap(([mapId, codes]) =>
  codes.map((c) => tap('world-flags', mapId, `wg2-${mapId}-${c}`, 'Whose flag is this?', [c], { emoji: '🚩', bigEmoji: flagOf(c) })),
)

// --- 🫀 Human body ------------------------------------------------------------

const HB = 'world-body'
const organ = (id: string, prompt: string, target: string, extra: Partial<QuizQuestion> = {}) =>
  tap(HB, 'organs', `wb-${id}`, prompt, [target], { emoji: '🫀', ...extra })
const bone = (id: string, prompt: string, target: string, extra: Partial<QuizQuestion> = {}) =>
  tap(HB, 'skeleton', `wb-${id}`, prompt, [target], { emoji: '🦴', ...extra })
const FACING = 'The person is facing you, so their left side is on your right.'

const BODY: QuizQuestion[] = [
  // the first goal: where the organs are
  organ('loc-brain', 'Where is the brain?', 'brain', { firstGoal: true }),
  organ('loc-lungs', 'Where are the lungs?', 'lungs', { firstGoal: true }),
  organ('loc-heart', 'Where is the heart?', 'heart', { firstGoal: true, funFact: `It sits a little to the left of the middle of the chest. ${FACING}` }),
  organ('loc-liver', 'Where is the liver?', 'liver', { firstGoal: true, funFact: `It is on the right side, under the ribs. ${FACING}` }),
  organ('loc-stomach', 'Where is the stomach?', 'stomach', { firstGoal: true, funFact: `It is on the left side, under the ribs. ${FACING}` }),
  organ('loc-kidneys', 'Where are the kidneys?', 'kidneys', { firstGoal: true }),
  organ('loc-small', 'Where is the small intestine?', 'smallintestine', { firstGoal: true }),
  organ('loc-large', 'Where is the large intestine?', 'largeintestine', { firstGoal: true, funFact: 'It runs around the outside of the small intestine, like a picture frame.' }),
  organ('loc-bladder', 'Where is the bladder?', 'bladder', { firstGoal: true }),
  // what each one does
  organ('do-pump', 'Which organ pumps blood around your body?', 'heart'),
  organ('do-air', 'Which organ takes oxygen from the air you breathe?', 'lungs'),
  organ('do-think', 'Which organ controls everything you think and do?', 'brain'),
  organ('do-filter', 'Which organs clean your blood and make urine?', 'kidneys'),
  organ('do-store', 'Which organ stores urine until you go?', 'bladder'),
  organ('do-acid', 'Which organ breaks food down with strong acid?', 'stomach'),
  organ('do-nutrients', 'Which organ takes the nutrients out of your food?', 'smallintestine', { funFact: 'It is the longest part of the gut, around 6 metres.' }),
  organ('do-water', 'Which organ takes water back out of leftover food?', 'largeintestine'),
  organ('do-biggest', 'Which is the biggest organ inside your body?', 'liver'),
  organ('do-order', 'Food leaves your stomach. Which organ does it go to next?', 'smallintestine'),
  // the big bones
  bone('loc-skull', 'Where is the skull?', 'skull'),
  bone('loc-collarbone', 'Where is the collarbone?', 'collarbone'),
  bone('loc-ribs', 'Where are the ribs?', 'ribs'),
  bone('loc-spine', 'Where is the spine?', 'spine'),
  bone('loc-humerus', 'Where is the humerus, the upper arm bone?', 'humerus'),
  bone('loc-radius', 'Where is the radius, a forearm bone?', 'radius'),
  bone('loc-pelvis', 'Where is the pelvis?', 'pelvis'),
  bone('loc-femur', 'Where is the femur, the thigh bone?', 'femur'),
  bone('loc-kneecap', 'Where is the kneecap?', 'kneecap'),
  bone('loc-tibia', 'Where is the tibia, the shin bone?', 'tibia'),
  // what they do
  bone('do-brain', 'Which bone protects your brain?', 'skull'),
  bone('do-chest', 'Which bones protect your heart and lungs?', 'ribs'),
  bone('do-longest', 'Which is the longest bone in your body?', 'femur'),
  bone('do-upright', 'Which bones hold you upright and protect the nerves down your back?', 'spine'),
  bone('do-hips', 'Which bones join your legs to your spine?', 'pelvis'),
]

WORLD_SEED.push(...PHYSICAL, ...TTC, ...HISTORY, ...FLAGS, ...BODY)
