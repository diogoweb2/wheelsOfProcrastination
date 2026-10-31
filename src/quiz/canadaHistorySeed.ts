// Canada History — 62 seed questions, tuned for Ben (born Feb 2014, Ontario grade 6).
// Started deliberately light on dates, with every wrong year centuries away. In Oct
// 2026 he was passing too easily, so the year questions now have NEIGHBOURING years
// as distractors (1867 sits next to 1841 and 1871, not 1066), and ch-51…62 add the
// post-Confederation story as match / order / write-in as well as choice.
// Core material (weight 2): First Peoples, explorers, New France, Confederation, the
// railway, the wars, the modern country.
// Fun extras (weight 1): famous Canadians, symbols, inventions.
// This file only seeds Firestore (app/quizBank) on first run — after that, the bank
// in Firestore is the source of truth (removals, AI-regenerated questions, edits).
import type { QuizQuestion } from '../types'

const AT = '2026-08-17T00:00:00.000Z'
const AT_2 = '2026-10-30T00:00:00.000Z'
const T = 'canada-history'

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

export const CANADA_HISTORY_SEED: QuizQuestion[] = [
  // --- the first peoples ----------------------------------------------------
  choice('ch-01', 'Who was living across Canada long before any Europeans arrived?', ['the Vikings', 'Indigenous peoples', 'the French', 'the British', 'the Spanish', 'the Portuguese', 'the Dutch'], 'Indigenous peoples', {
    emoji: '🪶',
    funFact: 'People have lived here for well over 10,000 years — hundreds of generations before any ship showed up.',
  }),
  choice('ch-02', 'Canada recognises THREE groups of Indigenous peoples. Which list is right?', ['First Nations, Inuit, Métis', 'First Nations, Inuit, Acadians', 'Inuit, Métis, Loyalists', 'First Nations, Métis, Voyageurs', 'Inuit, Cree, Settlers', 'Métis, Inuit, Habitants', 'First Nations, Cree, Inuit'], 'First Nations, Inuit, Métis', {
    emoji: '🤝',
    funFact: 'Métis are descended from both First Nations and early European settlers — a people born right here.',
  }),
  choice('ch-03', 'Inuit peoples have always lived mainly in which part of Canada?', ['the Prairies', 'the Arctic', 'the west coast', 'the Great Lakes', 'the Maritimes', 'the Rockies', 'the boreal forest'], 'the Arctic', {
    emoji: '❄️',
    funFact: 'Inuit built kayaks, igloos and dog sleds — technology so good the words came into English unchanged.',
  }),
  choice('ch-04', 'What is a wampum belt, made by Haudenosaunee peoples?', ['a hunting weapon', 'a record of an agreement', 'a type of canoe', 'a winter blanket', 'a fishing net', 'a cooking pot', 'a musical drum'], 'a record of an agreement', {
    emoji: '🧵',
    weight: 1,
    points: 5,
    funFact: 'Beads woven into patterns held treaties and promises — writing, just not with letters.',
  }),

  // --- explorers ------------------------------------------------------------
  choice('ch-05', 'Which people reached Newfoundland about a thousand years ago — long before Columbus?', ['the Vikings', 'the French', 'the Spanish', 'the English', 'the Dutch', 'the Portuguese', 'the Italians'], 'the Vikings', {
    emoji: '🛡️',
    funFact: 'They stayed only a few years, then left. Nobody in Europe believed it until the site was dug up in the 1960s.',
  }),
  choice('ch-06', 'Where in Canada did archaeologists find a real Viking settlement?', ['Nova Scotia', 'Newfoundland', 'Quebec', 'Labrador City', 'Prince Edward Island', 'New Brunswick', 'Baffin Island'], 'Newfoundland', {
    emoji: '⛺',
    funFact: 'The site is called L’Anse aux Meadows — grass-roofed houses right on the coast.',
  }),
  choice('ch-07', 'Which French explorer sailed up the St. Lawrence River and claimed the land for France?', ['Samuel de Champlain', 'Jacques Cartier', 'John Cabot', 'Henry Hudson', 'Louis Riel', 'Étienne Brûlé', 'Pierre Radisson'], 'Jacques Cartier', {
    emoji: '⛵',
    funFact: 'He heard the Iroquoian word "kanata" — meaning village — and wrote it down. That word became "Canada".',
  }),
  choice('ch-08', 'The name "Canada" comes from an Indigenous word meaning what?', ['big river', 'village', 'cold land', 'many lakes', 'great forest', 'white snow', 'free people'], 'village', {
    emoji: '🏘️',
    funFact: 'A whole country accidentally named after somebody pointing and saying "that’s our village".',
  }),
  choice('ch-09', 'Who founded Quebec City and is called the Father of New France?', ['Jacques Cartier', 'Samuel de Champlain', 'John Cabot', 'Louis Riel', 'Henry Hudson', 'Jean Talon', 'Pierre Trudeau'], 'Samuel de Champlain', {
    emoji: '🏰',
    funFact: 'Champlain drew some of the first accurate maps of the region — with help from Wendat and Algonquin guides.',
  }),
  choice('ch-10', 'What was the French colony in Canada called?', ['New England', 'New France', 'New Spain', 'Upper Canada', 'Acadia Major', 'New Britain', 'Lower France'], 'New France', {
    emoji: '⚜️',
    funFact: 'It once stretched from Newfoundland down the Mississippi all the way to the Gulf of Mexico.',
  }),
  {
    id: 'ch-11',
    topicId: T,
    type: 'match',
    prompt: 'Match each explorer to what they are remembered for:',
    emoji: '🔗',
    pairs: [
      { left: 'Jacques Cartier', right: 'sailed up the St. Lawrence' },
      { left: 'Samuel de Champlain', right: 'founded Quebec City' },
      { left: 'Henry Hudson', right: 'gave his name to a huge bay' },
      { left: 'Leif Erikson', right: 'led the Vikings to Newfoundland' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Hudson’s own crew set him adrift in a small boat in that bay. He was never seen again.',
  },

  // --- the fur trade --------------------------------------------------------
  choice('ch-12', 'What was the most valuable thing traded in early Canada?', ['gold', 'beaver fur', 'timber', 'fish', 'wheat', 'salt', 'coal'], 'beaver fur', {
    emoji: '🦫',
    funFact: 'Beaver fur made waterproof felt hats — and Europe could not get enough of them for 200 years.',
  }),
  choice('ch-13', 'Beaver fur was mostly turned into what, back in Europe?', ['boots', 'hats', 'coats', 'gloves', 'blankets', 'bags', 'scarves'], 'hats', {
    emoji: '🎩',
    funFact: 'A gentleman without a beaver-felt hat was practically undressed. Fashion built a country.',
  }),
  choice('ch-14', 'Which fur-trading company from the 1600s later became a chain of Canadian stores?', ['Canadian Tire', "Hudson's Bay Company", 'North West Trading Co.', 'Loblaws', 'Simpsons', 'Eaton’s', 'Bay Street Company'], "Hudson's Bay Company", {
    emoji: '🏪',
    funFact: 'Founded in 1670, it is one of the oldest companies in the world still using its own name.',
  }),
  choice('ch-15', 'What were the French fur traders who paddled huge canoes called?', ['coureurs', 'voyageurs', 'habitants', 'seigneurs', 'trappeurs', 'colons', 'marins'], 'voyageurs', {
    emoji: '🛶',
    funFact: 'They paddled up to 16 hours a day and sang to keep the rhythm. Human engines.',
  }),
  choice('ch-16', 'Why was the fur trade impossible without Indigenous peoples?', ['they owned the boats', 'they knew the land and did the trapping', 'they spoke French', 'they built the forts', 'they printed the maps', 'they paid for the goods', 'they ran the company'], 'they knew the land and did the trapping', {
    emoji: '🧭',
    funFact: 'Snowshoes, canoes, portage routes, winter survival — every bit of it was Indigenous knowledge.',
  }),

  // --- France vs Britain ----------------------------------------------------
  choice('ch-17', 'Which two European countries fought over who would control Canada?', ['Spain and France', 'France and Britain', 'Britain and Portugal', 'France and Holland', 'Spain and Britain', 'Russia and France', 'Britain and Germany'], 'France and Britain', {
    emoji: '⚔️',
    funFact: 'That fight is why Canada still has two official languages today.',
  }),
  choice('ch-18', 'Which battle at Quebec City decided that New France would become British?', ['Battle of Vimy Ridge', 'Battle of the Plains of Abraham', 'Battle of Queenston Heights', 'Battle of Juno Beach', 'Battle of Batoche', 'Battle of Beaver Dams', 'Battle of Lundy’s Lane'], 'Battle of the Plains of Abraham', {
    emoji: '🏴',
    funFact: 'The whole battle lasted about 20 minutes. Both commanding generals died of their wounds.',
  }),
  {
    id: 'ch-19',
    topicId: T,
    type: 'order',
    prompt: 'Put these in order from OLDEST to most recent:',
    emoji: '⏳',
    sequence: [
      'Indigenous peoples live across the land',
      'Vikings reach Newfoundland',
      'New France is founded',
      'Canada becomes a country',
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Indigenous peoples were here for over 10,000 years before any of the other three even happened.',
  },
  choice('ch-20', 'Who were the Loyalists?', ['French settlers who stayed', 'Americans who moved north to stay British', 'British soldiers on holiday', 'Métis traders from the west', 'Irish farmers seeking land', 'Scottish fishers in Nova Scotia', 'Dutch merchants in Montreal'], 'Americans who moved north to stay British', {
    emoji: '🧳',
    funFact: 'Tens of thousands walked north after the American Revolution — including thousands of Black Loyalists.',
  }),
  choice('ch-21', 'In the War of 1812, who invaded Canada?', ['France', 'the United States', 'Britain', 'Spain', 'the Fenians', 'Mexico', 'Russia'], 'the United States', {
    emoji: '💥',
    funFact: 'The invasion failed. Canadians, British troops and First Nations warriors fought it off together.',
  }),
  choice('ch-22', 'What did Laura Secord famously do in the War of 1812?', ['built a fort overnight', 'walked 30 km to warn of an attack', 'led a cavalry charge', 'sailed a warship home', 'signed the peace treaty', 'drew the battle maps', 'nursed the wounded'], 'walked 30 km to warn of an attack', {
    emoji: '🥾',
    funFact: 'She walked through swamp and bush all day to deliver the warning. There is a chocolate company named after her.',
  }),
  choice('ch-23', 'Which First Nations leader fought alongside the British in the War of 1812?', ['Louis Riel', 'Tecumseh', 'Big Bear', 'Poundmaker', 'Crowfoot', 'Joseph Brant', 'Sitting Bull'], 'Tecumseh', {
    emoji: '🪶',
    funFact: 'Tecumseh tried to unite many nations into one alliance to protect their land. He died in the fighting.',
  }),
  choice('ch-24', 'The Underground Railroad brought people to Canada who were escaping what?', ['the Irish famine', 'slavery in the USA', 'a war in Europe', 'the gold rush', 'high taxes in Britain', 'a cholera plague', 'a drought on the farms'], 'slavery in the USA', {
    emoji: '🕯️',
    funFact: 'It was not a railway at all — just secret routes, safe houses and very brave people.',
  }),
  choice('ch-25', 'Who guided many people to freedom in Canada along the Underground Railroad?', ['Viola Desmond', 'Harriet Tubman', 'Laura Secord', 'Nellie McClung', 'Rosa Parks', 'Emily Carr', 'Mary Ann Shadd'], 'Harriet Tubman', {
    emoji: '⭐',
    funFact: 'She made about 13 trips back into danger to bring others out. She never lost a single person.',
  }),

  // --- Confederation & building the country ---------------------------------
  choice('ch-26', 'In which year did Canada become a country?', ['1841', '1867', '1812', '1871', '1885', '1848', '1905'], '1867', {
    emoji: '🎂',
    funFact: 'Canada is younger than the piano and older than the light bulb.',
  }),
  choice('ch-27', 'What do Canadians celebrate on July 1st?', ['Victoria Day', 'Canada Day', 'Thanksgiving', 'Remembrance Day', 'Family Day', 'Labour Day', 'Flag Day'], 'Canada Day', {
    emoji: '🎆',
    funFact: 'It was called Dominion Day until 1982 — then renamed to something people could actually shout.',
  }),
  choice('ch-28', 'How many provinces joined together at Confederation?', ['3', '4', '5', '6', '7', '10', '2'], '4', {
    emoji: '🤝',
    funFact: 'Ontario, Quebec, New Brunswick and Nova Scotia. The other six arrived over the next 82 years.',
  }),
  choice('ch-29', 'Who was Canada’s FIRST Prime Minister?', ['Wilfrid Laurier', 'John A. Macdonald', 'Louis Riel', 'Pierre Trudeau', 'Lester Pearson', 'Tommy Douglas', 'Kim Campbell'], 'John A. Macdonald', {
    emoji: '🎩',
    funFact: 'He pushed hard for the railway — and he also created the residential school system, which caused enormous harm.',
  }),
  choice('ch-30', 'What giant project finally linked eastern Canada to British Columbia?', ['the Trans-Canada Highway', 'the Canadian Pacific Railway', 'the Rideau Canal', 'the Welland Canal', 'the telegraph line', 'the Confederation Bridge', 'the St. Lawrence Seaway'], 'the Canadian Pacific Railway', {
    emoji: '🚂',
    funFact: 'BC only agreed to join Canada if a railway was built to reach it. Sometimes a country is a bargain.',
  }),
  choice('ch-31', 'Who did most of the most dangerous railway work through the mountains of BC?', ['British soldiers', 'Chinese workers', 'French farmers', 'Irish sailors', 'American engineers', 'Scottish miners', 'Italian masons'], 'Chinese workers', {
    emoji: '⛏️',
    funFact: 'They were paid far less than others and hundreds died. Canada apologised for the unfair "head tax" in 2006.',
  }),
  choice('ch-32', 'Who was Louis Riel?', ['a railway builder', 'a Métis leader', 'a fur trader', 'a Prime Minister', 'an explorer', 'a newspaper owner', 'a hockey player'], 'a Métis leader', {
    emoji: '🪶',
    funFact: 'He fought for Métis land and rights and helped create the province of Manitoba.',
  }),
  choice('ch-33', 'The Klondike Gold Rush brought thousands of people rushing to which territory?', ['Nunavut', 'Yukon', 'Northwest Territories', 'Alaska', 'Labrador', 'British Columbia', 'Alberta'], 'Yukon', {
    emoji: '💰',
    funFact: 'Dawson City exploded from a quiet camp to 30,000 people — then emptied again a few years later.',
  }),
  choice('ch-34', 'Which province was the LAST to join Canada?', ['Alberta', 'Newfoundland and Labrador', 'Saskatchewan', 'British Columbia', 'Manitoba', 'Prince Edward Island', 'Nova Scotia'], 'Newfoundland and Labrador', {
    emoji: '🐟',
    funFact: 'It joined in 1949 — so some people alive today were born in Newfoundland before it was Canadian.',
  }),
  choice('ch-35', 'Which territory was created most recently?', ['Yukon', 'Nunavut', 'Northwest Territories', 'Labrador', 'Nunavik', 'Keewatin', 'Ungava'], 'Nunavut', {
    emoji: '🧊',
    funFact: 'Nunavut was created in 1999, so Inuit could govern their own homeland. "Nunavut" means "our land".',
  }),

  // --- hard history, told straight ------------------------------------------
  choice('ch-36', 'What were residential schools?', ['schools built by First Nations', 'schools that took Indigenous children from their families', 'boarding schools for rich families', 'schools for new immigrants', 'night schools for adults', 'schools run by the railway', 'schools only for boys'], 'schools that took Indigenous children from their families', {
    emoji: '🧡',
    funFact: 'Children were punished for speaking their own languages. The last one closed in 1996 — not long ago at all.',
  }),
  choice('ch-37', 'What do people remember on Orange Shirt Day?', ['the fur trade', 'residential school survivors', 'the first railway', 'Canada’s birthday', 'the end of a war', 'the gold rush', 'the first flag'], 'residential school survivors', {
    emoji: '🧡',
    funFact: 'The phrase is "Every Child Matters". It started with one girl whose new orange shirt was taken away on her first day.',
  }),
  {
    id: 'ch-38',
    topicId: T,
    type: 'match',
    prompt: 'Match each Canadian to what they are famous for:',
    emoji: '⭐',
    pairs: [
      { left: 'Terry Fox', right: 'ran across Canada on one leg' },
      { left: 'Laura Secord', right: 'walked far to warn of an attack' },
      { left: 'Viola Desmond', right: 'refused a segregated cinema seat' },
      { left: 'Louis Riel', right: 'led the Métis and founded Manitoba' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Three of these four have appeared on Canadian money or stamps. Standing up for something sticks.',
  },

  // --- wars & remembrance ---------------------------------------------------
  choice('ch-39', 'Which First World War battle is Canada most famous for winning?', ['Juno Beach', 'Vimy Ridge', 'Dieppe', 'the Somme', 'Ortona', 'Passchendaele', 'Hong Kong'], 'Vimy Ridge', {
    emoji: '🎖️',
    funFact: 'Canadians took a ridge that others had failed to take. Many say Canada grew up as a nation that week.',
  }),
  choice('ch-40', 'Which flower do Canadians wear to remember soldiers?', ['rose', 'poppy', 'trillium', 'lily', 'daisy', 'tulip', 'thistle'], 'poppy', {
    emoji: '🌺',
    funFact: 'The idea comes from a poem written by a Canadian doctor, John McCrae: "In Flanders Fields".',
  }),
  choice('ch-41', 'On D-Day in the Second World War, Canadians landed on which beach?', ['Omaha Beach', 'Juno Beach', 'Utah Beach', 'Gold Beach', 'Sword Beach', 'Dunkirk Beach', 'Anzio Beach'], 'Juno Beach', {
    emoji: '🌊',
    funFact: 'Canadian troops pushed further inland on D-Day than any other landing force.',
  }),

  // --- the modern country ---------------------------------------------------
  choice('ch-42', 'In which year did Canada get its red-and-white maple leaf flag?', ['1867', '1965', '1945', '1931', '1982', '1949', '1957'], '1965', {
    emoji: '🍁',
    funFact: 'Before that Canada flew a British-style flag. The debate about changing it lasted for months and got LOUD.',
  }),
  choice('ch-43', 'Who was Terry Fox?', ['a hockey legend', 'a runner who crossed Canada on one leg', 'an astronaut', 'a Prime Minister', 'a doctor who found insulin', 'an Arctic explorer', 'a famous painter'], 'a runner who crossed Canada on one leg', {
    emoji: '🏃',
    funFact: 'He ran a marathon a day for 143 days. Schools still run in his name every autumn — including yours.',
  }),
  choice('ch-44', 'Who was Viola Desmond, the woman on the Canadian $10 bill?', ['the first woman MP', 'a Black woman who refused a segregated seat', 'an Olympic swimmer', 'a wartime nurse', 'the first female judge', 'an Arctic scientist', 'a famous author'], 'a Black woman who refused a segregated seat', {
    emoji: '💵',
    funFact: 'She refused to move from the whites-only section of a Nova Scotia cinema — nine years before Rosa Parks.',
  }),
  {
    id: 'ch-45',
    topicId: T,
    type: 'order',
    prompt: 'Put these events in order, EARLIEST first:',
    emoji: '🗓️',
    sequence: [
      'Canada becomes a country',
      'The railway reaches the Pacific',
      'Newfoundland joins Canada',
      'Nunavut is created',
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: '1867, 1885, 1949, 1999 — the country kept being finished, then unfinished, then finished again.',
  },
  choice('ch-46', 'Which life-saving medicine was discovered by researchers in Toronto?', ['penicillin', 'insulin', 'aspirin', 'vaccines', 'anaesthetic', 'antibiotics', 'vitamin C'], 'insulin', {
    emoji: '💉',
    weight: 1,
    points: 5,
    funFact: 'Banting and Best sold the patent for one dollar so nobody with diabetes would be priced out.',
  }),
  choice('ch-47', 'Which sport was invented by a Canadian, James Naismith?', ['hockey', 'basketball', 'lacrosse', 'baseball', 'curling', 'soccer', 'volleyball'], 'basketball', {
    emoji: '🏀',
    weight: 1,
    points: 5,
    funFact: 'He nailed a peach basket to a wall to keep students busy indoors during a cold winter.',
  }),
  choice('ch-48', 'A Canadian named Sandford Fleming invented which everyday idea?', ['the telephone', 'standard time zones', 'the light bulb', 'the zipper', 'the snowmobile', 'the radio', 'the calendar'], 'standard time zones', {
    emoji: '🕰️',
    weight: 1,
    points: 5,
    funFact: 'He got the idea after missing a train because two towns disagreed about what time it was.',
  }),

  // --- write-in --------------------------------------------------------------
  {
    id: 'ch-49',
    topicId: T,
    type: 'write',
    prompt: 'Type the year Canada became a country:',
    emoji: '✍️',
    accept: ['1867'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Four numbers worth knowing: 1-8-6-7. Every Canadian coin-flip of a history quiz starts there.',
  },
  {
    id: 'ch-50',
    topicId: T,
    type: 'write',
    prompt: 'Type the animal whose fur built Canada’s first big business:',
    emoji: '🦫',
    accept: ['Beaver', 'The beaver'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Whole trading empires, forts and cities exist because Europeans wanted hats made of beaver felt.',
  },
  // --- Oct 2026: after Confederation, and harder shapes ----------------------------
  {
    id: 'ch-51',
    topicId: T,
    type: 'match',
    prompt: 'Match each year to what happened:',
    emoji: '🗓️',
    pairs: [
      { left: '1867', right: 'Canada becomes a country' },
      { left: '1885', right: 'the last spike of the railway' },
      { left: '1949', right: 'Newfoundland joins Canada' },
      { left: '1999', right: 'Nunavut is created' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT_2,
    funFact: 'From four provinces to ten provinces and three territories in 132 years.',
  },
  choice('ch-52', 'Which FOUR provinces joined together in 1867?', ['Ontario, Quebec, Nova Scotia, New Brunswick', 'Ontario, Quebec, Manitoba, New Brunswick', 'Ontario, Quebec, Nova Scotia, Prince Edward Island', 'Ontario, Quebec, British Columbia, Nova Scotia', 'Quebec, Nova Scotia, New Brunswick, Newfoundland', 'Ontario, Manitoba, Nova Scotia, New Brunswick'], 'Ontario, Quebec, Nova Scotia, New Brunswick', {
    emoji: '🧩',
    points: 10,
    createdAt: AT_2,
    funFact: 'PEI hosted the first Confederation meeting in 1864 — and then said no, until 1873.',
  }),
  choice('ch-53', 'Why did British Columbia agree to join Canada in 1871?', ['Canada promised it a railway', 'Britain paid it to join', 'the USA threatened to invade', 'its gold mines had closed', 'it wanted French schools', 'the fur trade had ended'], 'Canada promised it a railway', {
    emoji: '🚂',
    points: 10,
    createdAt: AT_2,
    funFact: 'The promise was a railway within ten years. It took fourteen — the last spike went in at Craigellachie in 1885.',
  }),
  choice('ch-54', 'What was the Chinese Head Tax?', ['a fee only Chinese immigrants paid', 'a tax on Chinese restaurants', 'a reward for railway workers', 'a tax China put on Canada', 'a fee to cross the Rockies', 'a bonus for learning English'], 'a fee only Chinese immigrants paid', {
    emoji: '💵',
    points: 10,
    createdAt: AT_2,
    funFact: 'Once the railway was built, Canada charged Chinese newcomers $50, later $500. Canada apologised in 2006.',
  }),
  {
    id: 'ch-55',
    topicId: T,
    type: 'write',
    prompt: 'Insulin was discovered in Toronto in 1921 by Frederick ______ and Charles Best. Type the missing name:',
    emoji: '💉',
    accept: ['Banting', 'Frederick Banting'],
    weight: 1,
    points: 10,
    status: 'active',
    createdAt: AT_2,
    funFact: 'Banting sold the patent for $1 so that everyone with diabetes could afford it.',
  },
  {
    id: 'ch-56',
    topicId: T,
    type: 'order',
    prompt: 'Put these in order, EARLIEST first:',
    emoji: '⏳',
    sequence: [
      'Most women win the vote in federal elections',
      'The Persons Case says women are “persons”',
      'The maple leaf flag is raised',
      'The Charter of Rights and Freedoms',
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT_2,
    funFact: '1918 · 1929 · 1965 · 1982. Many Indigenous people and Asian Canadians waited decades longer for the vote.',
  },
  choice('ch-57', 'What did the 1929 Persons Case decide?', ['women could sit in the Senate', 'children must go to school', 'every adult could vote', 'Canada could make its own laws', 'French was an official language', 'Indigenous people could vote'], 'women could sit in the Senate', {
    emoji: '👩‍⚖️',
    points: 10,
    createdAt: AT_2,
    funFact: 'Five Alberta women — the Famous Five — fought for it. The law had said “persons” meant only men.',
  }),
  choice('ch-58', 'What happened to many Japanese Canadians during the Second World War?', ['they were forced from their homes', 'they were given free land', 'they were made soldiers', 'they were made to join the navy', 'they were made to learn French', 'they were moved to Newfoundland'], 'they were forced from their homes', {
    emoji: '🏚️',
    points: 10,
    createdAt: AT_2,
    funFact: 'About 22,000 people were moved to camps inland and their property sold. Canada apologised in 1988.',
  }),
  choice('ch-59', 'What does the Charter of Rights and Freedoms (1982) protect?', ['rights like free speech and equality', 'the price of food and housing', 'the borders of every province', 'the right to hunt anywhere', 'the Queen’s land in Canada', 'the money in your bank'], 'rights like free speech and equality', {
    emoji: '📜',
    points: 10,
    createdAt: AT_2,
    funFact: 'It is part of the Constitution, so even Parliament has to follow it.',
  }),
  {
    id: 'ch-60',
    topicId: T,
    type: 'match',
    prompt: 'Match each Canadian to what they did:',
    emoji: '⭐',
    pairs: [
      { left: 'Frederick Banting', right: 'helped discover insulin' },
      { left: 'Roberta Bondar', right: 'first Canadian woman in space' },
      { left: 'Viola Desmond', right: 'challenged a segregated cinema' },
      { left: 'Terry Fox', right: 'the Marathon of Hope' },
    ],
    weight: 1,
    points: 10,
    status: 'active',
    createdAt: AT_2,
    funFact: 'Bondar flew on the space shuttle Discovery in 1992 — she is a doctor and a photographer too.',
  },
  choice('ch-61', 'Why is Remembrance Day on November 11?', ['the First World War ended that day', 'the Second World War began that day', 'Canada’s first soldier died that day', 'the poppy was invented that day', 'Vimy Ridge was won that day', 'the army was founded that day'], 'the First World War ended that day', {
    emoji: '🌺',
    points: 10,
    createdAt: AT_2,
    funFact: 'At 11 o’clock, on the 11th day of the 11th month, 1918, the guns went quiet.',
  }),
  choice('ch-62', 'What was the Truth and Reconciliation Commission about?', ['the harm of residential schools', 'the cost of the railway', 'the borders of Nunavut', 'the end of the fur trade', 'the War of 1812', 'the new Canadian flag'], 'the harm of residential schools', {
    emoji: '🧡',
    points: 10,
    createdAt: AT_2,
    funFact: 'Survivors told their stories for six years. Its 2015 report made 94 Calls to Action.',
  }),
]
