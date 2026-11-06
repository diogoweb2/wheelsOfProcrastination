// Canada Politics — 64 seed questions, tuned for Ben (born Feb 2014, Toronto).
// The point of this bank is NOT names: it is the SYSTEM. Three levels of government,
// who you elect to each, what each one is actually allowed to decide, and how a law
// and a tax get made. Only three people are named in the whole bank — the Prime
// Minister of Canada, the Premier of Ontario and the Mayor of Toronto — because those
// three are the ones he can point at from where he lives; every other question works
// no matter who wins the next election.
// Core material (weight 2): the three levels, who does what, who you elect, how a
// government forms, how a bill becomes law, where the money comes from.
// Fun extras (weight 1): the Lieutenant Governor, what taxes buy, how a 12-year-old
// gets heard at City Hall.
// This file only seeds Firestore (app/quizBank) on first run — after that, the bank
// in Firestore is the source of truth (removals, AI-regenerated questions, edits).
import type { QuizQuestion } from '../types'

const AT = '2026-11-06T00:00:00.000Z'
const T = 'canada-politics'

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

// The three levels, written once. Every "which level?" question draws its options
// from here, so the right answer can never be spotted by its length or its wording
// (§14, no length tell) — he has to actually know who does the job.
const LEVELS = [
  'the federal government',
  'the provincial government',
  'the city government',
  'the school board',
  'the regional government',
  'the territorial government',
]

// Job titles, written once, for the same reason.
const TITLES = ['Prime Minister', 'Premier', 'Mayor', 'Governor General', 'Senator', 'City Councillor']

export const CANADA_POLITICS_SEED: QuizQuestion[] = [
  // --- the three levels -----------------------------------------------------
  choice('cp-01', 'Canada has how many levels of government that you vote for?', ['three', 'two', 'four', 'five', 'six', 'seven'], 'three', {
    emoji: '🏛️',
    funFact: 'Three: Canada (federal), Ontario (provincial) and Toronto (city). You get a separate vote for each one.',
  }),
  choice('cp-02', 'Which level makes decisions for the WHOLE country?', LEVELS, 'the federal government', {
    emoji: '🍁',
    funFact: 'It sits in Ottawa. Whatever it decides counts from Newfoundland to British Columbia.',
  }),
  choice('cp-03', 'Which level makes decisions for Ontario only?', LEVELS, 'the provincial government', {
    emoji: '🌲',
    funFact: 'It sits at Queen’s Park in Toronto. Every province has its own, and they do not all have the same rules.',
  }),
  choice('cp-04', 'Garbage day, the water pipes and the TTC. Which level?', LEVELS, 'the city government', {
    emoji: '🚮',
    funFact: 'The city is the level you notice most — it is the one that touches your street.',
  }),
  {
    id: 'cp-05',
    topicId: T,
    type: 'match',
    prompt: 'Match each level to a job it does:',
    emoji: '🧩',
    pairs: [
      { left: 'Canada (federal)', right: 'the army and passports' },
      { left: 'Ontario (provincial)', right: 'hospitals and schools' },
      { left: 'Toronto (city)', right: 'garbage and the TTC' },
      { left: 'Your school board', right: 'running the school itself' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Nobody shares a job on purpose. When two levels both want in, they argue about who pays — out loud, in public.',
  },
  {
    id: 'cp-06',
    topicId: T,
    type: 'write',
    prompt: 'Type the name of the city where Canada’s Parliament sits:',
    emoji: '🏛️',
    accept: ['Ottawa'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Ottawa was picked in 1857 partly because it sat between Toronto and Montreal, and nobody could agree on either.',
  },
  choice('cp-07', 'Which of these is run by the CITY of Toronto?', ['the public libraries', 'the army', 'the passports', 'the health cards', 'the driver’s licences', 'the post office'], 'the public libraries', {
    emoji: '📚',
    funFact: 'Toronto Public Library is the busiest urban library system in the world. The city pays for it.',
  }),
  choice('cp-08', 'Which of these is run by ONTARIO?', ['the hospitals', 'the army', 'the garbage trucks', 'the passports', 'the post office', 'the libraries'], 'the hospitals', {
    emoji: '🏥',
    funFact: 'Health care is provincial, which is why a health card from Ontario says ONTARIO on it.',
  }),
  choice('cp-09', 'Which of these is run by CANADA (the federal government)?', ['the passports', 'the garbage trucks', 'the hospitals', 'the libraries', 'the snow plows', 'the water pipes'], 'the passports', {
    emoji: '🛂',
    funFact: 'Passports, the army, the money in your pocket and the post are all federal. So is the law against stealing.',
  }),
  {
    id: 'cp-10',
    topicId: T,
    type: 'match',
    prompt: 'Three police forces, three levels. Match them:',
    emoji: '🚔',
    pairs: [
      { left: 'RCMP', right: 'Canada' },
      { left: 'OPP', right: 'Ontario' },
      { left: 'Toronto Police', right: 'the city' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'That is why a highway outside the city is OPP and your street is Toronto Police. Same country, different boss.',
  },

  // --- who leads each level -------------------------------------------------
  choice('cp-11', 'What is the title of the person who leads the whole country?', TITLES, 'Prime Minister', {
    emoji: '🇨🇦',
    funFact: 'Not a president. Canada has a Prime Minister, and the job goes to whoever leads the biggest team in Parliament.',
  }),
  choice('cp-12', 'What is the title of the person who leads Ontario?', TITLES, 'Premier', {
    emoji: '🌲',
    funFact: 'Every province has a Premier. Same job as the Prime Minister, one province wide.',
  }),
  choice('cp-13', 'What is the title of the person who leads a city?', TITLES, 'Mayor', {
    emoji: '🏙️',
    funFact: 'The mayor is the only person the WHOLE city votes for. Everyone else on council is voted in by one ward.',
  }),
  choice('cp-14', 'Mark Carney is Canada’s ______.', TITLES, 'Prime Minister', {
    emoji: '🍁',
    funFact: 'He became Prime Minister in 2025. Before politics he ran the Bank of Canada, which prints the money.',
  }),
  choice('cp-15', 'Doug Ford is Ontario’s ______.', TITLES, 'Premier', {
    emoji: '🌲',
    funFact: 'He has led Ontario since 2018. Before that he was a Toronto city councillor — one level down.',
  }),
  choice('cp-16', 'Olivia Chow is Toronto’s ______.', TITLES, 'Mayor', {
    emoji: '🏙️',
    funFact: 'She was first elected in 2023 and won again in October 2026. The next Toronto election is in 2030.',
  }),
  {
    id: 'cp-17',
    topicId: T,
    type: 'match',
    prompt: 'Match each leader to what they lead:',
    emoji: '🗺️',
    pairs: [
      { left: 'Mark Carney', right: 'Canada' },
      { left: 'Doug Ford', right: 'Ontario' },
      { left: 'Olivia Chow', right: 'Toronto' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Three leaders, three levels, and all three of them have an office in Toronto or an hour from it.',
  },
  choice('cp-18', 'How does someone become Prime Minister of Canada?', ['they lead the party with the most seats', 'they win the most votes in Canada', 'the Governor General chooses them', 'the Senate votes them into the job', 'the ten premiers choose them', 'the King names them for five years'], 'they lead the party with the most seats', {
    emoji: '🪑',
    points: 10,
    funFact: 'Nobody in Canada votes for the Prime Minister. You vote for your local MP, and the leader of the winning team gets the job.',
  }),
  choice('cp-19', 'On election day you put ONE X beside...', ['the person running in your area', 'the Prime Minister you want', 'the party leader you like best', 'the law you want changed', 'the mayor of every city', 'the premier of your province'], 'the person running in your area', {
    emoji: '✖️',
    points: 10,
    funFact: 'One X, one local person. The party and the leader come along with that one name.',
  }),

  // --- who you elect, and where ---------------------------------------------
  choice('cp-20', 'The person you elect to Parliament in Ottawa is called an...', ['MP', 'MPP', 'MLA', 'MVP', 'MPA', 'PMO'], 'MP', {
    emoji: '🏛️',
    funFact: 'MP = Member of Parliament. There are 343 of them, one for each riding in Canada.',
  }),
  choice('cp-21', 'What does MP stand for?', ['Member of Parliament', 'Minister of Parliament', 'Member of Provinces', 'Mayor of Parliament', 'Minister of People', 'Member of Police'], 'Member of Parliament', {
    emoji: '📛',
    funFact: 'Your MP keeps an office in the riding just for people who write in with a problem.',
  }),
  choice('cp-22', 'The person you elect to Queen’s Park is called an...', ['MPP', 'MP', 'MLA', 'MLC', 'MPA', 'PMP'], 'MPP', {
    emoji: '🌲',
    funFact: 'MPP = Member of Provincial Parliament. Ontario has 124 of them. Other provinces call theirs MLAs.',
  }),
  choice('cp-23', 'The person you elect for your own part of the city is called a...', ['councillor', 'senator', 'trustee', 'premier', 'minister', 'governor'], 'councillor', {
    emoji: '🏙️',
    funFact: 'Toronto has 25 councillors plus the mayor, so 26 people vote on everything the city does.',
  }),
  choice('cp-24', 'What is a riding?', ['the area one MP represents', 'the bus route to Parliament', 'the time a government lasts', 'the day everybody votes', 'the room where laws are made', 'the party with the most seats'], 'the area one MP represents', {
    emoji: '🗺️',
    funFact: 'Also called an electoral district. Canada is cut into 343 of them, drawn so each holds about the same number of people.',
  }),
  choice('cp-25', 'What is a ward?', ['the area one councillor represents', 'the hall where council meets', 'the four years a mayor serves', 'the paper you vote on', 'the city’s money for one year', 'the group that runs a school'], 'the area one councillor represents', {
    emoji: '📍',
    funFact: 'A ward is a riding for the city. Your house is in exactly one of Toronto’s 25.',
  }),
  choice('cp-26', 'Toronto has 25 wards. How many councillors does YOUR ward send to City Hall?', ['one', 'two', 'three', 'four', 'five', 'none'], 'one', {
    emoji: '1️⃣',
    funFact: 'One each. Which means that in a city of three million, one person speaks for your street at City Hall.',
  }),
  choice('cp-27', 'In the city election you ALSO vote for a school board...', ['trustee', 'senator', 'minister', 'premier', 'sheriff', 'governor'], 'trustee', {
    emoji: '🎓',
    weight: 1,
    points: 5,
    funFact: 'St. Eugene belongs to the Toronto Catholic District School Board, and its trustees are elected the same day as the mayor.',
  }),
  choice('cp-28', 'How old do you have to be to vote in Canada?', ['18', '16', '19', '21', '17', '20'], '18', {
    emoji: '🎂',
    funFact: 'You turn 18 in February 2032. The first election after that birthday is your first vote.',
  }),
  choice('cp-29', 'Who is allowed to see how you voted?', ['nobody — the ballot is secret', 'your parents, if they ask', 'the police, if they ask', 'the party you voted for', 'the person you voted for', 'the city, after the count'], 'nobody — the ballot is secret', {
    emoji: '🤫',
    funFact: 'You fold the ballot before you hand it back. A secret ballot means nobody can punish you for your vote.',
  }),

  // --- how a government forms -----------------------------------------------
  choice('cp-30', 'After a federal election, which party forms the government?', ['the one with the most seats', 'the one with the oldest leader', 'the one with the most money', 'the one chosen by the Senate', 'the one the King prefers', 'the one with the most members'], 'the one with the most seats', {
    emoji: '🪑',
    funFact: 'Seats, not votes. A party can win fewer votes overall and still win more ridings — and it has happened.',
  }),
  choice('cp-31', 'What is a MAJORITY government?', ['it holds more than half the seats', 'it holds exactly half the seats', 'it won the most votes overall', 'it has the most popular leader', 'it holds every seat in the House', 'it has been elected twice in a row'], 'it holds more than half the seats', {
    emoji: '💪',
    points: 10,
    funFact: 'More than half means it can pass whatever it likes. The other parties can argue, but they cannot stop it.',
  }),
  choice('cp-32', 'What is a MINORITY government?', ['it holds less than half the seats', 'it holds more than half the seats', 'it lost the election but stayed on', 'it has only one party inside it', 'it has no leader in the House', 'it governs for only one year'], 'it holds less than half the seats', {
    emoji: '🤝',
    points: 10,
    funFact: 'It has to talk another party into helping for every single law. Lose a big vote and the government can fall.',
  }),
  choice('cp-33', 'What is the job of the Opposition?', ['to question what the government does', 'to pick the next Prime Minister', 'to write every new law first', 'to run the army and the police', 'to count the votes on election day', 'to approve the city’s budget'], 'to question what the government does', {
    emoji: '🙋',
    funFact: 'It is a real job with a real name: His Majesty’s Loyal Opposition. Being annoying about it is the whole point.',
  }),
  {
    id: 'cp-34',
    topicId: T,
    type: 'order',
    prompt: 'Put these in order, FIRST to LAST, after a federal election:',
    emoji: '⏳',
    sequence: [
      'Canadians vote in every riding',
      'The votes are counted that night',
      'One party ends up with the most seats',
      'Its leader becomes Prime Minister',
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'The whole thing is usually done by midnight. No judges, no re-runs — just the count.',
  },
  choice('cp-35', 'Toronto holds a city election every...', ['four years', 'two years', 'three years', 'five years', 'six years', 'year'], 'four years', {
    emoji: '🗓️',
    funFact: 'Always in October, always on a Monday. The last one was October 2026, so the next one is October 2030.',
  }),
  choice('cp-36', 'In a Toronto city election, which party is a candidate from?', ['none — there are no parties', 'the Liberal Party', 'the Conservative Party', 'the New Democratic Party', 'the Green Party', 'the party of the mayor'], 'none — there are no parties', {
    emoji: '🚫',
    points: 10,
    funFact: 'City candidates run as themselves, with no party label on the ballot. Federal and provincial ones almost always have one.',
  }),
  choice('cp-37', 'A candidate wins a riding by getting...', ['more votes than anyone else', 'more than half of all votes', 'every vote in the riding', 'the party leader’s approval', 'the most money to spend', 'the longest time on the ballot'], 'more votes than anyone else', {
    emoji: '🥇',
    funFact: 'Just the most. With five candidates you can win a riding with about a third of the votes.',
  }),
  choice('cp-38', 'How long can a federal government last before it MUST hold an election?', ['five years', 'one year', 'two years', 'three years', 'four years', 'ten years'], 'five years', {
    emoji: '⌛',
    funFact: 'Five is the limit; about four is normal. A minority government can end much sooner than it planned.',
  }),

  // --- how a law gets made --------------------------------------------------
  choice('cp-39', 'Parliament in Ottawa has two parts. Which pair?', ['the House of Commons and the Senate', 'the House of Commons and the Cabinet', 'the Senate and the Supreme Court', 'the Cabinet and the Legislature', 'the Senate and the Legislature', 'the House of Commons and the courts'], 'the House of Commons and the Senate', {
    emoji: '🏛️',
    points: 10,
    funFact: 'The Commons is green, the Senate is red. A bill has to get through both rooms to become law.',
  }),
  choice('cp-40', 'Who sits in the House of Commons?', ['MPs elected by Canadians', 'senators chosen by the PM', 'judges chosen by the King', 'premiers sent by each province', 'mayors sent by the big cities', 'MPPs elected by Ontario'], 'MPs elected by Canadians', {
    emoji: '🟩',
    funFact: 'All 343 of them, in one room, shouting at each other during Question Period every afternoon.',
  }),
  choice('cp-41', 'How do senators get their seats?', ['they are appointed, not elected', 'they are elected every four years', 'they are elected by the MPs', 'they inherit them from family', 'they are chosen by the premiers', 'they are picked by the courts'], 'they are appointed, not elected', {
    emoji: '🟥',
    points: 10,
    funFact: 'Nobody votes for a senator. They are appointed and can stay until they turn 75, which is why people argue about them.',
  }),
  choice('cp-42', 'Ontario’s laws are made at Queen’s Park by the...', ['Legislative Assembly', 'House of Commons', 'Senate of Canada', 'City Council', 'Supreme Court', 'School Board'], 'Legislative Assembly', {
    emoji: '🌲',
    funFact: 'Ontario has no senate — one room, 124 MPPs, and the bill is through. Faster than Ottawa.',
  }),
  choice('cp-43', 'A rule made by a city is called a...', ['bylaw', 'statute', 'treaty', 'decree', 'charter', 'motion'], 'bylaw', {
    emoji: '📋',
    funFact: 'Noise after 11pm, where you may park, whether you can keep chickens — all bylaws, all Toronto’s own.',
  }),
  {
    id: 'cp-44',
    topicId: T,
    type: 'order',
    prompt: 'Put these in order: how a federal bill becomes a law.',
    emoji: '📜',
    sequence: [
      'A bill is written and introduced',
      'MPs debate it and vote',
      'The Senate studies it and votes',
      'The Governor General signs it',
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'That last step is called royal assent. It is a signature, not a decision — no Governor General has ever refused a federal bill.',
  },
  choice('cp-45', 'Who is Canada’s head of state?', ['the King', 'the Prime Minister', 'the Governor General', 'the Premier', 'the Chief Justice', 'the Speaker'], 'the King', {
    emoji: '👑',
    funFact: 'Canada is a monarchy. The King lives in Britain, so the Governor General does the job here on his behalf.',
  }),
  choice('cp-46', 'What does the Governor General do with a new law?', ['signs it so it becomes law', 'writes it before anyone votes', 'can cancel it at any time', 'votes on it in the Senate', 'sends it to the provinces', 'explains it on television'], 'signs it so it becomes law', {
    emoji: '🖊️',
    funFact: 'The signature is the last step of every federal law. The power is real on paper and never used in practice.',
  }),
  choice('cp-47', 'Ontario has its own stand-in for the King. The title is...', ['Lieutenant Governor', 'Governor General', 'Deputy Premier', 'Lord Mayor', 'Chief Minister', 'Vice Premier'], 'Lieutenant Governor', {
    emoji: '🎖️',
    weight: 1,
    points: 5,
    funFact: 'Every province has one, and they sign the province’s laws the same way the Governor General signs Canada’s.',
  }),
  choice('cp-48', 'A new law looks like it breaks the Charter of Rights. Who can strike it down?', ['the courts', 'the Senate', 'the Prime Minister', 'the Governor General', 'the city council', 'the police'], 'the courts', {
    emoji: '⚖️',
    points: 10,
    funFact: 'This is the big one: Parliament makes the law, but a judge can throw it out for breaking the Charter.',
  }),
  choice('cp-49', 'Can the Mayor of Toronto pass a new bylaw alone?', ['no — council has to vote', 'yes — the mayor decides alone', 'yes, but only about money', 'no — Ontario has to vote', 'no — Ottawa has to agree', 'yes, for one year at a time'], 'no — council has to vote', {
    emoji: '🙋‍♀️',
    points: 10,
    funFact: 'The mayor has one vote out of 26, plus some extra powers Ontario handed over in 2022. Mostly it is persuading 13 people.',
  }),

  // --- where the money comes from -------------------------------------------
  choice('cp-50', 'HST in Ontario is 13%. Who gets that money?', ['Canada and Ontario share it', 'only the City of Toronto', 'only the federal government', 'only the Ontario government', 'the city and the province', 'the shops that collect it'], 'Canada and Ontario share it', {
    emoji: '🧾',
    points: 10,
    funFact: '5% is Canada’s and 8% is Ontario’s, glued into one 13% line on the receipt. Alberta has no provincial part, so it pays 5%.',
  }),
  choice('cp-51', 'Where does the City of Toronto get most of its money?', ['property taxes on buildings', 'income tax on your pay', 'a share of the HST', 'money sent by the King', 'fines handed out by police', 'the sale of city land'], 'property taxes on buildings', {
    emoji: '🏠',
    points: 10,
    funFact: 'Every house and shop pays the city a yearly tax on its value. That is why cities want more buildings built.',
  }),
  choice('cp-52', 'Income tax comes off a pay cheque in Ontario. Which levels take a cut?', ['Canada and Ontario', 'the City of Toronto', 'your school board', 'Canada and Toronto', 'Ontario and Toronto', 'every level except Ontario'], 'Canada and Ontario', {
    emoji: '💵',
    funFact: 'Two cuts, one form. Cities are not allowed to charge income tax at all — which is why they are always short of money.',
  }),
  choice('cp-53', 'Which of these is paid for out of taxes?', ['the public school down the road', 'the toys in your bedroom', 'the groceries in the fridge', 'the games on your tablet', 'the shoes you wear to school', 'the phone in your pocket'], 'the public school down the road', {
    emoji: '🏫',
    weight: 1,
    points: 5,
    funFact: 'Schools, hospitals, roads, buses, libraries, firefighters. You have been using tax money every single day of your life.',
  }),

  // --- which level is it? the questions he will actually meet ----------------
  choice('cp-54', 'The TTC puts its fare up. Who decided that?', LEVELS, 'the city government', {
    emoji: '🚇',
    funFact: 'Toronto city council sets the fare. Ontario and Ottawa chip in for new subways, but the price of a ride is the city’s call.',
  }),
  choice('cp-55', 'Your family needs a new health card. Which level hands it out?', LEVELS, 'the provincial government', {
    emoji: '💳',
    funFact: 'Health cards, driver’s licences and birth certificates are all provincial. Move to Quebec and you get new ones.',
  }),
  choice('cp-56', 'You need a passport for a trip. Which level hands it out?', LEVELS, 'the federal government', {
    emoji: '🛫',
    funFact: 'Only a country can issue a passport, so only the federal level can. Ontario could not give you one if it wanted to.',
  }),
  choice('cp-57', 'There is a huge pothole on your street. Who do you call?', ['311, the city line', '911, the emergency line', 'the Premier’s office', 'the Prime Minister’s office', 'the school board office', 'the nearest police station'], '311, the city line', {
    emoji: '🕳️',
    points: 10,
    funFact: '311 is Toronto for everything that is not an emergency: potholes, missed garbage, dead raccoons, broken street lights.',
  }),
  choice('cp-58', 'Nobody cleared the snow off your sidewalk. Whose job is it?', LEVELS, 'the city government', {
    emoji: '❄️',
    funFact: 'The city clears the roads and most sidewalks. In front of a house, the shovelling is usually the owner’s problem.',
  }),
  choice('cp-59', 'Your school needs a new roof. Which level pays for schools in Ontario?', LEVELS, 'the provincial government', {
    emoji: '🔨',
    funFact: 'Ontario sends the money, the school board decides how to spend it. The city has nothing to do with schools at all.',
  }),
  choice('cp-60', 'Someone steals a bike and ends up in court. Who wrote the law against stealing?', LEVELS, 'the federal government', {
    emoji: '🚲',
    points: 10,
    funFact: 'Criminal law is federal, so stealing is the same crime in every province. The courts that hear it are run by Ontario.',
  }),
  {
    id: 'cp-61',
    topicId: T,
    type: 'match',
    prompt: 'Match each problem to the level that can fix it:',
    emoji: '🔧',
    pairs: [
      { left: 'A broken street light', right: 'the city' },
      { left: 'A long wait at the hospital', right: 'Ontario' },
      { left: 'A lost passport', right: 'Canada' },
      { left: 'A new rule for your classroom', right: 'your school board' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Phoning the wrong level is the classic mistake. They will be polite, and they will not be able to help you.',
  },
  choice('cp-62', 'You are 12 and you want a skatepark in your neighbourhood. What can you actually do?', ['write to your city councillor', 'vote in the next election', 'phone the Prime Minister', 'take it to the Supreme Court', 'wait until you are 18', 'ask the school board to build it'], 'write to your city councillor', {
    emoji: '🛹',
    weight: 1,
    points: 5,
    funFact: 'Parks are city business, and you do not have to be 18 to be heard — kids speak at council committees every month.',
  }),

  // --- the first governments here -------------------------------------------
  choice('cp-63', 'Many First Nations elect their own leader. The title is...', ['Chief', 'Mayor', 'Premier', 'Governor', 'Senator', 'Minister'], 'Chief', {
    emoji: '🪶',
    funFact: 'A Chief and Council work much like a mayor and council, for that First Nation. Those elections are their own.',
  }),
  choice('cp-64', 'What is a treaty?', ['an agreement with First Nations', 'a law passed by the Senate', 'a city rule about noise', 'a tax on new buildings', 'a vote to choose a leader', 'a plan for a new railway'], 'an agreement with First Nations', {
    emoji: '🤝',
    points: 10,
    funFact: 'Toronto sits on land covered by Treaty 13, signed with the Mississaugas of the Credit. Treaties are still live law today.',
  }),
]
