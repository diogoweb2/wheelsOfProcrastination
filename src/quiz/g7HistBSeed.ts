// Grade 7 History, Strand B — Canada, 1800–1850: Conflict and Challenges.
// 35 questions, five per St. Eugene subtopic (hist-b-*). See ./grade7.ts.
import type { QuizQuestion } from '../types'
import { grade7 } from './grade7'

const { choice, write, match, order } = grade7('g7-hist-b')

export const G7_HIST_B_SEED: QuizQuestion[] = [
  // --- hist-b-life · life in Upper and Lower Canada ---------------------------------
  choice('g7hb-01', 'hist-b-life', 'Why did settlers leave tree stumps in their fields for years?', 'pulling them out was too much work', ['stumps kept the soil warm in winter', 'the law said stumps must stay', 'cows liked to sleep beside them', 'they marked who owned each field', 'they kept wolves off the crops'], {
    emoji: '🪵',
    why: 'Deep roots rotted slowly. Crops were planted around the stumps until they could be pulled.',
  }),
  choice('g7hb-02', 'hist-b-life', 'What did a habitant in Lower Canada owe his seigneur each year?', 'rent, plus a fee to use the mill', ['a share of all his furs each spring', 'a son to serve in the army', 'nothing at all, the farm was his', 'taxes paid straight to the British', 'a cow and a pig every spring'], {
    emoji: '🏚️',
    why: 'The seigneurial system: long, narrow farms along the river, rent to the seigneur, and his mill for your grain.',
  }),
  choice('g7hb-03', 'hist-b-life', 'Why did settlers save the ashes from their fires?', 'to make potash to sell for cash', ['to clean the cabin floors', 'to mark the property lines', 'to keep snow off the roof', 'to dye their clothes black', 'to fill holes in the roads'], {
    emoji: '💰',
    why: 'Coins were scarce. Potash, boiled from wood ash, was one of the few things a new farm could sell.',
  }),
  choice('g7hb-04', 'hist-b-life', 'Why was winter often the EASIEST season to travel?', 'sleighs slid over frozen mud', ['the days were longer', 'the rivers were warmer', 'there were fewer wolves', 'stagecoaches were free', 'the roads were paved for it'], {
    emoji: '🛷',
    why: 'Summer roads were mud, ruts and swamp. Snow smoothed them flat.',
  }),
  choice('g7hb-05', 'hist-b-life', 'On an Upper Canada survey map, what was a concession road?', 'a straight road between rows of lots', ['a toll road to the capital', 'a path for fur-trade canoes', 'a road only soldiers could use', 'a road that circled a lake', 'a road built by Loyalists only'], {
    emoji: '🛣️',
    why: 'Ontario’s grid of “Concession” and “Line” roads — many still have those names today.',
  }),

  // --- hist-b-1812 · the War of 1812 --------------------------------------------------
  choice('g7hb-06', 'hist-b-1812', 'What was one reason the United States declared war in 1812?', 'Britain was seizing American sailors', ['Britain had invaded New York', 'Canada had stopped all trade', 'Canada wanted to join the USA', 'France ordered the USA to fight', 'Spain had sold Florida to Britain'], {
    emoji: '⚓',
    why: 'It was called impressment. Americans also wanted more land — and some wanted Canada itself.',
  }),
  match('g7hb-07', 'hist-b-1812', 'Match each name to its part in the War of 1812:', [
    ['Isaac Brock', 'won at Detroit, killed at Queenston Heights'],
    ['Tecumseh', 'led an alliance of First Nations'],
    ['Laura Secord', 'warned the British before Beaver Dams'],
    ['Treaty of Ghent', 'ended the war with no land changing hands'],
  ], { emoji: '🎖️', why: 'Brock and Tecumseh were allies. Both died in battle — in different places, a year apart.' }),
  choice('g7hb-08', 'hist-b-1812', 'Who “won” the War of 1812?', 'neither side gained any land', ['the USA gained Upper Canada', 'Britain gained New England', 'Canada gained Michigan', 'the USA gained Lower Canada', 'Britain gained Louisiana'], {
    emoji: '🤷',
    why: 'The borders went back to how they were. But Canada stayed British — which is why Canadians remember it as a win.',
  }),
  choice('g7hb-09', 'hist-b-1812', 'Why did many First Nations fight beside the British in 1812?', 'to defend their land from US settlers', ['because Britain paid them in gold', 'because they hated the French', 'to win new land in Europe', 'because the USA banned the fur trade', 'to get seats in the assembly'], {
    emoji: '🛡️',
    why: 'American settlers were pushing onto their land. Britain was the ally against that — and the peace treaty forgot them.',
  }),
  order('g7hb-10', 'hist-b-1812', 'Put these War of 1812 events in order, EARLIEST first:', [
    'Brock captures Detroit',
    'Brock dies at Queenston Heights',
    'American troops burn York',
    'Laura Secord’s warning, Beaver Dams',
    'The Treaty of Ghent is signed',
  ], { emoji: '⏳', why: 'Aug 1812 · Oct 1812 · Apr 1813 · Jun 1813 · Dec 1814.' }),

  // --- hist-b-immig · immigration, 1815–1850 ------------------------------------------
  choice('g7hb-11', 'hist-b-immig', 'Why did so many Irish families leave Ireland in the 1840s?', 'the potato crop failed', ['a war with France began', 'the fur trade collapsed', 'the fishing grounds emptied', 'the linen mills closed', 'Britain banned their language'], {
    emoji: '🥔',
    why: 'A plant disease rotted the potatoes most poor families lived on. About a million people died.',
  }),
  choice('g7hb-12', 'hist-b-immig', 'What was Grosse Île?', 'a quarantine island near Quebec', ['a fort on Lake Ontario', 'a fur post on Hudson Bay', 'Toronto’s first harbour', 'a prison for the rebels', 'a shipyard in Halifax'], {
    emoji: '🏝️',
    why: 'Ships were held there so sick passengers could not carry disease into the cities. In 1847 it was overwhelmed.',
  }),
  choice('g7hb-13', 'hist-b-immig', 'What was “ship fever”?', 'typhus, spread by lice', ['seasickness from big waves', 'scurvy, from no fruit', 'cholera, from dirty water', 'smallpox, from cows', 'malaria, from mosquitoes'], {
    emoji: '🦠',
    why: 'Packed, filthy holds were perfect for lice. Cholera was real too — but it is not what “ship fever” meant.',
  }),
  choice('g7hb-14', 'hist-b-immig', 'Which of these was a PULL factor bringing people to Canada?', 'cheap land to farm', ['famine at home', 'high rent at home', 'no work after the war', 'crowded villages', 'disease at home'], {
    emoji: '🧲',
    why: 'Push = what drives you out. Pull = what draws you in. Every other option here is a push.',
  }),
  choice('g7hb-15', 'hist-b-immig', 'Where did most immigrant ships first land in the 1840s?', 'Quebec City', ['Toronto', 'Halifax', 'Montreal', 'Kingston', 'Victoria'], {
    emoji: '🚢',
    why: 'Ships sailed up the St. Lawrence. Quebec City was the first big port — after a stop at Grosse Île.',
  }),

  // --- hist-b-reb · the Rebellions of 1837–38 -------------------------------------------
  match('g7hb-16', 'hist-b-reb', 'Match each name from 1837:', [
    ['William Lyon Mackenzie', 'led the rebels in Upper Canada'],
    ['Louis-Joseph Papineau', 'led the Patriotes in Lower Canada'],
    ['Family Compact', 'rich officials who ran Upper Canada'],
    ['Château Clique', 'the ruling group in Lower Canada'],
  ], { emoji: '🔥', why: 'Two colonies, two rebel leaders, two small groups of insiders holding the power.' }),
  choice('g7hb-17', 'hist-b-reb', 'What was the main complaint behind BOTH 1837 rebellions?', 'appointed councils ignored the voters', ['the tax on tea was too high', 'the fur trade had collapsed', 'Britain had banned French', 'the USA had invaded again', 'only Catholics could own land'], {
    emoji: '😤',
    why: 'People could elect an assembly, but the governor’s appointed councils could overrule it. Sound familiar? See 1791.',
  }),
  choice('g7hb-18', 'hist-b-reb', 'Where were Mackenzie’s rebels beaten in December 1837?', 'Montgomery’s Tavern', ['the Plains of Abraham', 'Queenston Heights', 'Beaver Dams', 'Grosse Île', 'Lundy’s Lane'], {
    emoji: '🍺',
    why: 'Just north of Toronto, on Yonge Street. The fight lasted less than an hour.',
  }),
  choice('g7hb-19', 'hist-b-reb', 'Did the 1837 rebels get what they wanted?', 'not then — but by 1848, yes', ['yes, within a month', 'no, and they never did', 'yes, they won the war', 'only in Lower Canada', 'only after Confederation'], {
    emoji: '⏱️',
    why: 'They lost the fight but won the argument: Durham’s report led to responsible government in 1848.',
  }),
  choice('g7hb-20', 'hist-b-reb', 'Why did the Upper Canada rebellion fail so fast?', 'the rebels were badly organised', ['the rebels had no leader at all', 'the USA sent soldiers to stop it', 'a blizzard lasted a month', 'the rebels changed sides', 'France refused to help'], {
    emoji: '💨',
    why: 'Few guns, little training, confused plans — and the militia was ready for them.',
  }),

  // --- hist-b-durham · Lord Durham's Report ---------------------------------------------
  choice('g7hb-21', 'hist-b-durham', 'Why did Britain send Lord Durham to the Canadas in 1838?', 'to find out why the rebellions happened', ['to lead the army against the USA', 'to buy land from First Nations', 'to open the first railway', 'to collect a brand-new tax', 'to become the first Prime Minister'], {
    emoji: '🔍',
    why: 'Two rebellions in two colonies. Britain wanted the cause, and the fix.',
  }),
  write('g7hb-22', 'hist-b-durham', 'Durham found “two ____ warring in the bosom of a single state.” Type the missing word:', ['nations', 'nation'], {
    emoji: '✍️',
    why: 'English and French, fighting for power inside one colony — his most famous line.',
  }),
  choice('g7hb-23', 'hist-b-durham', 'What were Durham’s two big fixes?', 'unite the Canadas; responsible government', ['split Quebec again; close the assembly', 'join the USA; remove the governor', 'free trade; move the capital', 'end French law; build more canals', 'elect the governor; add Nova Scotia'], {
    emoji: '🛠️',
    why: 'Britain took the first fix in 1840. The second had to wait until 1848.',
  }),
  choice('g7hb-24', 'hist-b-durham', 'What did Durham hope would happen to French Canadians in a united colony?', 'they would blend into the English majority', ['they would get their own country', 'they would move to Louisiana', 'they would run the new government', 'they would get double the seats', 'they would all leave for France'], {
    emoji: '🫥',
    why: 'He wanted them assimilated. It did not work — French Canada is still here, and still French.',
  }),
  choice('g7hb-25', 'hist-b-durham', 'Which part of Durham’s advice did Britain NOT follow right away?', 'responsible government', ['the Act of Union', 'joining Upper and Lower Canada', 'one assembly for both halves', 'a single Province of Canada', 'one governor for both halves'], {
    emoji: '⏸️',
    why: 'The union came in 1840. Letting the elected assembly run things took eight more years.',
  }),

  // --- hist-b-union · the Act of Union, 1840 ---------------------------------------------
  choice('g7hb-26', 'hist-b-union', 'What did the Act of Union (1840) create?', 'the Province of Canada', ['the Dominion of Canada', 'Upper and Lower Canada', 'the Maritime Union', 'the colony of Ontario', 'British Columbia'], {
    emoji: '🔗',
    why: 'The Province of Canada (1841–1867). The Dominion of Canada is Confederation, 1867 — don’t mix them up.',
  }),
  choice('g7hb-27', 'hist-b-union', 'How were the seats in the new assembly split?', 'equally, 42 seats each', ['by population, so the east got more', '60 for the west, 24 for the east', 'all named by the governor', 'one seat for every town', 'only English speakers could sit'], {
    emoji: '⚖️',
    why: 'Lower Canada had MORE people but got the SAME seats — on purpose, to keep the French vote down.',
  }),
  choice('g7hb-28', 'hist-b-union', 'Why did Upper Canada want the union?', 'to share its big canal debts', ['to get more French laws', 'to move the capital to Quebec', 'to stop the War of 1812', 'to buy Rupert’s Land', 'to get its own army'], {
    emoji: '💸',
    why: 'Upper Canada had borrowed heavily for canals. Joining the richer east spread the bill.',
  }),
  choice('g7hb-29', 'hist-b-union', 'Which language became the ONLY language of the official records in 1840?', 'English', ['French', 'Latin', 'Mohawk', 'Gaelic', 'Dutch'], {
    emoji: '📄',
    why: 'Part of Durham’s plan to assimilate. French came back as an official language of the records in 1848.',
  }),
  choice('g7hb-30', 'hist-b-union', 'Where was the FIRST capital of the Province of Canada?', 'Kingston', ['Toronto', 'Ottawa', 'Montreal', 'Quebec City', 'York'], {
    emoji: '🏛️',
    why: 'Kingston sat between the two halves. The capital then moved around for years before Ottawa was chosen.',
  }),

  // --- hist-b-resp · responsible government, 1848 -----------------------------------------
  choice('g7hb-31', 'hist-b-resp', 'What does “responsible government” mean?', 'ministers need the elected assembly’s support', ['the governor makes every decision himself', 'the king in London picks every minister', 'only rich landowners can become ministers', 'ministers keep their jobs for life', 'Britain writes every law for the colony'], {
    emoji: '🗳️',
    why: 'One test: who can remove the ministers? If the elected assembly can vote them out, it is responsible.',
  }),
  match('g7hb-32', 'hist-b-resp', 'Match each person to their part in 1848:', [
    ['Robert Baldwin', 'reform leader from Upper Canada'],
    ['Louis-Hippolyte LaFontaine', 'reform leader from Lower Canada'],
    ['Lord Elgin', 'the governor who accepted it'],
    ['Joseph Howe', 'won it first, in Nova Scotia'],
  ], { emoji: '🤝', why: 'An English and a French reformer working together — the partnership Durham said could not exist.' }),
  write('g7hb-33', 'hist-b-resp', 'Type the year responsible government came to the Province of Canada:', ['1848'], {
    emoji: '✍️',
    why: 'Nova Scotia got it first, early in 1848; the Province of Canada a few weeks later.',
  }),
  choice('g7hb-34', 'hist-b-resp', 'Under responsible government, what happens when ministers lose the assembly’s support?', 'they resign or face an election', ['the governor fires the assembly', 'nothing — they stay in office', 'the army takes over', 'Britain sends a new king', 'they move to London'], {
    emoji: '🚪',
    why: 'Still how Canada works today: lose a confidence vote and the government falls.',
  }),
  order('g7hb-35', 'hist-b-resp', 'Put the road to self-government in order, EARLIEST first:', [
    'The Rebellions',
    'Lord Durham’s Report',
    'The Act of Union',
    'Responsible government',
    'Confederation',
  ], { emoji: '🛤️', why: '1837 · 1839 · 1840 · 1848 · 1867. Each one is the answer to the one before.' }),
]
