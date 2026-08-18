// Toronto Geography — 50 seed questions, tuned for Ben (born Feb 2014, Ontario grade 6).
// This is the home-turf bank: the city he actually lives in. It owns Toronto so the
// Ontario topic doesn't have to (`ontarioGeographySeed.ts` stays out of the city).
// Core material (weight 2): the lake, the boroughs, the streets, the transit, the rivers.
// Fun extras (weight 1): landmarks, neighbourhoods, museums, neighbours in the GTA.
// This file only seeds Firestore (app/quizBank) on first run — after that, the bank
// in Firestore is the source of truth (removals, AI-regenerated questions, edits).
import type { QuizQuestion } from '../types'

const AT = '2026-08-17T00:00:00.000Z'
const T = 'toronto-geography'

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

export const TORONTO_GEOGRAPHY_SEED: QuizQuestion[] = [
  // --- the basics -----------------------------------------------------------
  choice('tg-01', 'Toronto sits on the shore of which lake?', ['Lake Erie', 'Lake Ontario', 'Lake Huron', 'Lake Superior', 'Lake Simcoe', 'Lake Michigan', 'Lake Nipigon'], 'Lake Ontario', {
    emoji: '🌊',
    funFact: 'The lake is why the city is here at all — it was a harbour long before it was a city.',
  }),
  choice('tg-02', 'Toronto is the largest city in which country?', ['the United States', 'Canada', 'Mexico', 'England', 'Australia', 'Ireland', 'Scotland'], 'Canada', {
    emoji: '🍁',
    funFact: 'It is also the fourth largest city in all of North America.',
  }),
  choice('tg-03', 'About how many people live in the City of Toronto?', ['300 thousand', '3 million', '30 million', '1 million', '10 million', '500 thousand', '50 million'], '3 million', {
    emoji: '👥',
    funFact: 'Add the surrounding cities and the whole area is about 6.5 million people.',
  }),
  choice('tg-04', 'What does "the GTA" stand for?', ['Great Toronto Airport', 'Greater Toronto Area', 'Golden Toronto Avenue', 'General Transit Access', 'Grand Toronto Alliance', 'Greater Trillium Area', 'Greater Township Authority'], 'Greater Toronto Area', {
    emoji: '🗺️',
    funFact: 'The GTA covers Toronto plus Peel, York, Durham and Halton — about a sixth of all Canadians.',
  }),
  choice('tg-05', 'The name "Toronto" comes from a Mohawk word describing what?', ['a big harbour', 'trees standing in water', 'a high hill', 'a meeting of rivers', 'a place of many birds', 'a good fishing spot', 'a wide open field'], 'trees standing in water', {
    emoji: '🌳',
    weight: 1,
    points: 5,
    funFact: 'It described fishing weirs — stakes driven into a narrows up near Lake Simcoe.',
  }),

  // --- the six -------------------------------------------------------------
  choice('tg-06', 'In 1998 six cities were joined into one Toronto. Which of these is one of them?', ['Mississauga', 'Etobicoke', 'Brampton', 'Markham', 'Vaughan', 'Oakville', 'Pickering'], 'Etobicoke', {
    emoji: '🧩',
    funFact: 'That is why Toronto is nicknamed "the 6ix" — six cities merged into one.',
  }),
  choice('tg-07', 'Which former city makes up the EAST end of Toronto?', ['Etobicoke', 'Scarborough', 'North York', 'York', 'East York', 'Markham', 'Pickering'], 'Scarborough', {
    emoji: '🧭',
    funFact: 'Scarborough alone has more people than the city of Halifax.',
  }),
  choice('tg-08', 'Which former city makes up the WEST end of Toronto?', ['Scarborough', 'Etobicoke', 'North York', 'East York', 'York', 'Mississauga', 'Vaughan'], 'Etobicoke', {
    emoji: '🧭',
    funFact: 'The name comes from a Mississauga word for the black alder trees that grew there.',
  }),
  choice('tg-09', 'Which former city sits directly NORTH of downtown Toronto?', ['Scarborough', 'North York', 'Etobicoke', 'East York', 'Vaughan', 'Markham', 'Richmond Hill'], 'North York', {
    emoji: '🏢',
    funFact: 'North York has its own downtown of tall towers along Yonge Street, plus its own city hall.',
  }),

  // --- streets & getting around ---------------------------------------------
  choice('tg-10', 'Which street splits Toronto’s addresses into east and west?', ['Bloor Street', 'Yonge Street', 'Queen Street', 'King Street', 'Bathurst Street', 'Dufferin Street', 'Spadina Avenue'], 'Yonge Street', {
    emoji: '🛣️',
    funFact: 'Everything is "Queen St West" or "Queen St East" depending on which side of Yonge you are on.',
  }),
  choice('tg-11', 'What does TTC stand for?', ['Toronto Travel Company', 'Toronto Transit Commission', 'Toronto Tram Corporation', 'Trans Toronto Coach', 'Toronto Traffic Control', 'Town To City Transit', 'Toronto Tunnel Committee'], 'Toronto Transit Commission', {
    emoji: '🚇',
    funFact: 'Toronto opened Canada’s very first subway line, under Yonge Street, in 1954.',
  }),
  choice('tg-12', 'Which subway line runs NORTH–SOUTH up Yonge Street?', ['Line 2', 'Line 1', 'Line 3', 'Line 4', 'Line 5', 'Line 6', 'Line 7'], 'Line 1', {
    emoji: '🟨',
    funFact: 'Line 1 is shaped like a giant U — up one side, across the top, and back down the other.',
  }),
  choice('tg-13', 'Which subway line runs EAST–WEST under Bloor Street and the Danforth?', ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5', 'Line 6', 'Line 0'], 'Line 2', {
    emoji: '🟩',
    funFact: 'It is the same road the whole way — it just changes its name from Bloor to Danforth at the Don Valley.',
  }),
  choice('tg-14', 'Which vehicle runs on rails in the middle of Toronto’s downtown streets?', ['monorail', 'streetcar', 'subway', 'cable car', 'trolleybus', 'ferry', 'light rail'], 'streetcar', {
    emoji: '🚋',
    funFact: 'Toronto has the biggest streetcar network in North America — the only big city that never ripped its up.',
  }),
  choice('tg-15', 'What is Toronto’s main downtown train station called?', ['Central Station', 'Union Station', 'King Station', 'Front Station', 'Yonge Terminal', 'Bay Station', 'Queen’s Terminal'], 'Union Station', {
    emoji: '🚆',
    funFact: 'Around a quarter of a million people pass through it on a weekday. It is Canada’s busiest building.',
  }),
  choice('tg-16', 'Which expressway runs along Toronto’s waterfront?', ['Don Valley Parkway', 'Gardiner Expressway', 'Highway 401', 'Allen Road', 'Highway 427', 'Lake Shore Parkway', 'Queensway'], 'Gardiner Expressway', {
    emoji: '🚗',
    funFact: 'It is raised on concrete legs, so downtown drivers get a free lake view they cannot look at.',
  }),
  choice('tg-17', 'Which highway runs north–south through the Don Valley?', ['Gardiner Expressway', 'Don Valley Parkway', 'Highway 401', 'Highway 427', 'Allen Road', 'Bayview Extension', 'Highway 404'], 'Don Valley Parkway', {
    emoji: '🅿️',
    funFact: 'Locals call it the DVP — or "the world’s longest parking lot" at 5 pm.',
  }),
  choice('tg-18', 'Which huge highway crosses Toronto from west to east across the north?', ['Highway 401', 'Highway 427', 'Highway 404', 'Highway 407', 'Highway 400', 'Highway 409', 'Highway 410'], 'Highway 401', {
    emoji: '🛻',
    funFact: 'The 401 through Toronto is one of the busiest highways in the world — up to 18 lanes wide.',
  }),
  choice('tg-19', 'What is the network of underground shopping walkways downtown called?', ['the Loop', 'the PATH', 'the Tube', 'the Underground', 'the Concourse', 'the Metro', 'the Subway Mall'], 'the PATH', {
    emoji: '🚶',
    weight: 1,
    points: 5,
    funFact: 'Around 30 km of tunnels — you can cross most of downtown in February without a coat.',
  }),

  // --- water & green ---------------------------------------------------------
  choice('tg-20', 'What are the islands in Toronto’s harbour called?', ['Thousand Islands', 'Toronto Islands', 'Harbour Islands', 'Ontario Islands', 'Humber Islands', 'Bay Islands', 'Ward Islands'], 'Toronto Islands', {
    emoji: '🏝️',
    funFact: 'They used to be a sandy peninsula, until a huge storm in 1858 cut them loose.',
  }),
  choice('tg-21', 'How do you get to the Toronto Islands?', ['by subway', 'by ferry', 'by streetcar', 'by bridge', 'by tunnel', 'by cable car', 'by bus'], 'by ferry', {
    emoji: '⛴️',
    funFact: 'A few hundred people actually live on the islands — with no cars at all.',
  }),
  choice('tg-22', 'Which two rivers run through Toronto?', ['Thames and Grand', 'Don and Humber', 'Rouge and Credit', 'Trent and Severn', 'Ottawa and Rideau', 'Humber and Credit', 'Don and Rouge'], 'Don and Humber', {
    emoji: '🏞️',
    funFact: 'The Don is on the east side, the Humber on the west. Both cut deep green valleys through the city.',
  }),
  choice('tg-23', 'What are the tall clay cliffs along Toronto’s eastern lakeshore called?', ['Humber Bluffs', 'Scarborough Bluffs', 'Etobicoke Cliffs', 'Don Heights', 'Rouge Bluffs', 'East Point Cliffs', 'Bluffers Ridge'], 'Scarborough Bluffs', {
    emoji: '⛰️',
    funFact: 'They rise up to 90 m — layers of sand and clay left behind by an ancient lake.',
  }),
  choice('tg-24', 'Which big west-end park has cherry blossoms and a free little zoo?', ['Trinity Bellwoods', 'High Park', 'Riverdale Park', 'Christie Pits', 'Withrow Park', 'Sunnybrook Park', 'Earl Bales Park'], 'High Park', {
    emoji: '🌸',
    funFact: 'The cherry trees were a gift from Japan. When they bloom, half the city shows up at once.',
  }),
  choice('tg-25', 'Which Toronto park is a NATIONAL urban park — the first of its kind in Canada?', ['High Park', 'Rouge National Urban Park', 'Trinity Bellwoods', 'Sunnybrook Park', 'Downsview Park', 'Riverdale Park', 'Centennial Park'], 'Rouge National Urban Park', {
    emoji: '🌿',
    weight: 1,
    points: 5,
    funFact: 'It has working farms, forests and beaches — and you can reach it by TTC.',
  }),

  // --- landmarks -------------------------------------------------------------
  choice('tg-26', 'Which tower is Toronto’s tallest and most famous landmark?', ['Space Needle', 'CN Tower', 'Skylon Tower', 'Bay Tower', 'Trillium Tower', 'Harbour Spire', 'Maple Tower'], 'CN Tower', {
    emoji: '🗼',
    funFact: 'The glass floor is 342 m up. Standing on it is a whole personality test.',
  }),
  choice('tg-27', 'Which stadium with a retractable roof is home to the Blue Jays?', ['Scotiabank Arena', 'Rogers Centre', 'BMO Field', 'Exhibition Stadium', 'Varsity Stadium', 'Coca-Cola Coliseum', 'Lamport Stadium'], 'Rogers Centre', {
    emoji: '⚾',
    funFact: 'It was the first stadium in the world with a roof that fully opens and closes.',
  }),
  choice('tg-28', 'Where do the Maple Leafs and the Raptors both play?', ['Rogers Centre', 'Scotiabank Arena', 'BMO Field', 'Coca-Cola Coliseum', 'Maple Leaf Gardens', 'Exhibition Place', 'Varsity Arena'], 'Scotiabank Arena', {
    emoji: '🏒',
    funFact: 'Hockey one night, basketball the next — the crew swaps ice for court in a few hours.',
  }),
  choice('tg-29', 'Which Toronto landmark is an actual castle built by a rich businessman?', ['Fort York', 'Casa Loma', 'Spadina House', 'Colborne Lodge', 'Mackenzie House', 'Todmorden Mills', 'Gibson House'], 'Casa Loma', {
    emoji: '🏰',
    funFact: 'It has secret passages and a tunnel to the stables. The owner went broke building it.',
  }),
  choice('tg-30', 'Which museum has the dinosaurs and the big crystal shape stuck to the front?', ['Art Gallery of Ontario', 'Royal Ontario Museum', 'Ontario Science Centre', 'Bata Shoe Museum', 'Gardiner Museum', 'Aga Khan Museum', 'Hockey Hall of Fame'], 'Royal Ontario Museum', {
    emoji: '🦕',
    funFact: 'Everyone calls it the ROM. The glass "crystal" out front still divides the city.',
  }),
  choice('tg-31', 'What is the aquarium beside the CN Tower called?', ['Toronto Sea Life', 'Ripley’s Aquarium of Canada', 'Harbourfront Aquarium', 'Ontario Aquarium', 'Lakeside Aquarium', 'Blue Planet Toronto', 'Marine World'], 'Ripley’s Aquarium of Canada', {
    emoji: '🦈',
    weight: 1,
    points: 5,
    funFact: 'The moving walkway runs through a tunnel with sharks swimming right over your head.',
  }),
  choice('tg-32', 'The square in front of City Hall with the big TORONTO sign is called what?', ['Yonge-Dundas Square', 'Nathan Phillips Square', 'Union Square', 'Queen’s Park', 'David Pecaut Square', 'Berczy Park', 'Mel Lastman Square'], 'Nathan Phillips Square', {
    emoji: '🪧',
    funFact: 'In winter the reflecting pool turns into a skating rink right under those two curved towers.',
  }),
  choice('tg-33', 'Which building near the university is where ONTARIO’s government meets?', ['Toronto City Hall', 'Queen’s Park', 'Union Station', 'Osgoode Hall', 'Fort York', 'Old City Hall', 'Parliament Hill'], 'Queen’s Park', {
    emoji: '🏛️',
    funFact: 'The pink sandstone building sits in a park of the same name, right at the top of University Avenue.',
  }),
  choice('tg-34', 'Which historic market downtown has been selling food for almost 200 years?', ['Kensington Market', 'St. Lawrence Market', 'Eaton Centre', 'Distillery Market', 'Union Market', 'Front Street Market', 'Harbourfront Market'], 'St. Lawrence Market', {
    emoji: '🥖',
    weight: 1,
    points: 5,
    funFact: 'It has been voted one of the best food markets in the world. Get the peameal bacon sandwich.',
  }),

  // --- neighbourhoods --------------------------------------------------------
  choice('tg-35', 'Which car-free neighbourhood of old brick buildings was once a whisky factory?', ['Kensington Market', 'the Distillery District', 'Liberty Village', 'the Junction', 'Corktown', 'Leslieville', 'Yorkville'], 'the Distillery District', {
    emoji: '🧱',
    weight: 1,
    points: 5,
    funFact: 'It was once the biggest distillery in the world. Now it is cobblestones and a Christmas market.',
  }),
  choice('tg-36', 'Which colourful market neighbourhood sits just west of Chinatown?', ['Yorkville', 'Kensington Market', 'Liberty Village', 'the Beaches', 'Roncesvalles', 'Little Italy', 'Corktown'], 'Kensington Market', {
    emoji: '🎨',
    weight: 1,
    points: 5,
    funFact: 'On summer Sundays the streets close to cars and the whole place turns into one big party.',
  }),
  choice('tg-37', 'Danforth Avenue is best known as Toronto’s what?', ['Little Italy', 'Greektown', 'Chinatown', 'Little India', 'Koreatown', 'Portugal Village', 'Little Jamaica'], 'Greektown', {
    emoji: '🇬🇷',
    weight: 1,
    points: 5,
    funFact: 'Its summer street festival is one of the biggest Greek festivals anywhere outside Greece.',
  }),
  choice('tg-38', 'Which east-end neighbourhood is named after its sandy lakefront?', ['the Junction', 'the Beaches', 'the Annex', 'the Danforth', 'Leslieville', 'Riverdale', 'Corktown'], 'the Beaches', {
    emoji: '🏖️',
    weight: 1,
    points: 5,
    funFact: 'Locals argue endlessly about whether it is "the Beach" or "the Beaches". Nobody has won.',
  }),

  // --- neighbours & travel ----------------------------------------------------
  choice('tg-39', 'Toronto’s biggest airport, Pearson, is actually inside which city?', ['Toronto', 'Mississauga', 'Brampton', 'Vaughan', 'Markham', 'Oakville', 'Etobicoke'], 'Mississauga', {
    emoji: '✈️',
    funFact: 'The UP Express train runs from Union Station to Pearson in about 25 minutes.',
  }),
  choice('tg-40', 'Which small airport sits on the Toronto Islands?', ['Pearson International', 'Billy Bishop Toronto City Airport', 'Buttonville Airport', 'Downsview Airport', 'Oshawa Airport', 'Markham Airfield', 'Harbourfront Airfield'], 'Billy Bishop Toronto City Airport', {
    emoji: '🛩️',
    weight: 1,
    points: 5,
    funFact: 'You reach it through a pedestrian tunnel under the harbour — with the longest escalators in Canada.',
  }),
  choice('tg-41', 'Which large city is Toronto’s neighbour directly to the WEST?', ['Markham', 'Mississauga', 'Vaughan', 'Pickering', 'Richmond Hill', 'Ajax', 'Whitby'], 'Mississauga', {
    emoji: '➡️',
    funFact: 'Mississauga alone has over 700,000 people — bigger than most Canadian cities.',
  }),
  choice('tg-42', 'Which big amusement park sits just north of Toronto, in Vaughan?', ['Ontario Place', 'Canada’s Wonderland', 'Centreville', 'African Lion Safari', 'Marineland', 'Fantasy Fair', 'Playdium'], 'Canada’s Wonderland', {
    emoji: '🎢',
    weight: 1,
    points: 5,
    funFact: 'It has more roller coasters than almost any park on the continent — and a fake mountain.',
  }),
  choice('tg-43', 'Which huge fair takes over Exhibition Place at the end of every summer?', ['the Royal Winter Fair', 'the CNE', 'Caribana', 'Nuit Blanche', 'TIFF', 'Doors Open', 'Pride'], 'the CNE', {
    emoji: '🎡',
    weight: 1,
    points: 5,
    funFact: 'The Canadian National Exhibition has run since 1879. Going means the school year is coming.',
  }),

  // --- write-in ---------------------------------------------------------------
  {
    id: 'tg-44',
    topicId: T,
    type: 'write',
    prompt: 'Type the name of the lake Toronto sits on:',
    emoji: '✍️',
    accept: ['Ontario', 'Lake Ontario'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Same name as the province — the lake got there first and the province borrowed it.',
  },
  {
    id: 'tg-45',
    topicId: T,
    type: 'write',
    prompt: 'Type the street that divides Toronto’s addresses into east and west:',
    emoji: '✍️',
    accept: ['Yonge', 'Yonge Street', 'Yonge St'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'It is pronounced "young". Visitors get this wrong roughly 100% of the time.',
  },
  {
    id: 'tg-46',
    topicId: T,
    type: 'write',
    prompt: 'Type the three letters of Toronto’s transit system:',
    emoji: '🚇',
    accept: ['TTC', 'T.T.C.'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Its old slogan was "The Better Way". Riders have opinions about that.',
  },
  {
    id: 'tg-47',
    topicId: T,
    type: 'write',
    prompt: 'Type the name of Toronto’s tallest landmark (two letters + one word):',
    emoji: '🗼',
    accept: ['CN Tower', 'CN'],
    weight: 1,
    points: 5,
    status: 'active',
    createdAt: AT,
    funFact: 'It was the tallest free-standing structure in the world for over 30 years.',
  },

  // --- match --------------------------------------------------------------------
  {
    id: 'tg-48',
    topicId: T,
    type: 'match',
    prompt: 'Match each former city to where it is in Toronto:',
    emoji: '🧭',
    pairs: [
      { left: 'Scarborough', right: 'the east end' },
      { left: 'Etobicoke', right: 'the west end' },
      { left: 'North York', right: 'the north' },
      { left: 'Old Toronto', right: 'downtown and the waterfront' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'People still say "I live in Scarborough" thirty years after it stopped being its own city.',
  },
  {
    id: 'tg-49',
    topicId: T,
    type: 'match',
    prompt: 'Match each Toronto landmark to what it is:',
    emoji: '🔗',
    pairs: [
      { left: 'CN Tower', right: 'a very tall tower' },
      { left: 'Casa Loma', right: 'a castle on a hill' },
      { left: 'Rogers Centre', right: 'a baseball stadium' },
      { left: 'the ROM', right: 'a museum with dinosaurs' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'All four are within a 20-minute subway ride of each other.',
  },

  // --- order ----------------------------------------------------------------------
  {
    id: 'tg-50',
    topicId: T,
    type: 'order',
    prompt: 'Put these Toronto streets in order from SOUTH to NORTH:',
    emoji: '🛣️',
    sequence: ['Queen Street', 'Dundas Street', 'Bloor Street', 'Eglinton Avenue'],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Queen, Dundas, College, Bloor, St. Clair, Eglinton — that ladder is how locals navigate.',
  },
]
