// Grade 7 History, Strand A — New France and British North America, 1713–1800.
// 40 questions, five per St. Eugene subtopic (hist-a-*). See ./grade7.ts.
import type { QuizQuestion } from '../types'
import { grade7 } from './grade7'

const { choice, write, match, order } = grade7('g7-hist-a')

export const G7_HIST_A_SEED: QuizQuestion[] = [
  // --- hist-a-1713 · who was already here ---------------------------------------
  choice('g7ha-01', 'hist-a-1713', 'In 1713, who really controlled most of the land around the Great Lakes?', 'the First Nations living there', ['the British army', 'French settlers', 'the Hudson’s Bay Company', 'American colonists', 'Spanish traders'], {
    emoji: '🗺️',
    why: 'France and Britain drew lines on maps, but the Haudenosaunee, Anishinaabe and others still held the land, the trade and the alliances.',
  }),
  choice('g7ha-02', 'hist-a-1713', 'Which confederacy was made of FIVE nations in 1713?', 'the Haudenosaunee', ['the Wendat', 'the Mi’kmaq', 'the Three Fires', 'the Cree', 'the Inuit'], {
    emoji: '🪶',
    why: 'Mohawk, Oneida, Onondaga, Cayuga and Seneca. The Tuscarora joined around 1722, making six.',
  }),
  choice('g7ha-03', 'hist-a-1713', 'The Ojibwe, Odawa and Potawatomi formed which alliance?', 'the Three Fires Confederacy', ['the Covenant Chain alliance', 'the Five Nations Confederacy', 'the Family Compact', 'the Great Peace of Montreal', 'the Château Clique'], {
    emoji: '🔥',
    why: 'Three related Anishinaabe nations who shared councils around the Great Lakes.',
  }),
  choice('g7ha-04', 'hist-a-1713', 'What did the Treaty of Utrecht (1713) hand to Britain?', 'Acadia, Newfoundland and Hudson Bay', ['Quebec, Montreal and Trois-Rivières', 'Louisiana and the Ohio Valley', 'Upper and Lower Canada', 'all of New France at once', 'Florida and the Caribbean'], {
    emoji: '📜',
    why: 'France kept the St. Lawrence valley. The nations living on the traded land were not at the table.',
  }),
  match('g7ha-05', 'hist-a-1713', 'Match each nation to where (or how) it lived around 1713:', [
    ['Haudenosaunee', 'five nations south of Lake Ontario'],
    ['Wendat', 'longhouse farmers by Georgian Bay'],
    ['Anishinaabe', 'wild-rice harvesters of the Great Lakes'],
    ['Mi’kmaq', 'the Atlantic coast, in Acadia'],
  ], { emoji: '🔗', why: 'Step one in any history question: name the nation, not just “Indigenous”.' }),

  // --- hist-a-fur · the fur trade and the alliances it bought ---------------------
  choice('g7ha-06', 'hist-a-fur', 'Why did hat-makers in Europe want beaver pelts?', 'the underfur pressed into felt', ['the meat fed European armies', 'the skins made boat sails', 'the fur lined soldiers’ boots', 'the oil kept lamps burning', 'the tails made strong glue'], {
    emoji: '🦫',
    why: 'Beaver underfur mats into thick, waterproof felt — perfect for the tall hats Europeans wanted.',
  }),
  choice('g7ha-07', 'hist-a-fur', 'What was a “made beaver”?', 'a unit for pricing trade goods', ['a beaver raised on a farm', 'a hat made of beaver felt', 'a fort beside a beaver river', 'a coin minted in Montreal', 'a trader who got rich fast'], {
    emoji: '⚖️',
    why: 'One prime pelt = one made beaver. A kettle or a musket was priced in made beavers, like V-Bucks for the fur trade.',
  }),
  choice('g7ha-08', 'hist-a-fur', 'In the fur trade, choosing a trading partner usually also meant…', 'choosing a military ally', ['choosing a new language', 'choosing a new religion', 'moving onto their land', 'paying taxes to their king', 'giving up your own guns'], {
    emoji: '🤝',
    why: 'Muskets need powder, shot and repairs — so whoever sold them to you was the side you fought beside.',
  }),
  choice('g7ha-09', 'hist-a-fur', 'In 1701, New France and about 40 First Nations signed what?', 'the Great Peace of Montreal', ['the Treaty of Utrecht', 'the Treaty of Paris', 'the Royal Proclamation', 'the Quebec Act', 'the Covenant Chain'], {
    emoji: '🕊️',
    why: 'It ended years of war over the fur routes. Many nations promised to stay neutral in French–British wars.',
  }),
  match('g7ha-10', 'hist-a-fur', 'Match each side of the fur trade:', [
    ['Hudson’s Bay Company', 'waited at posts on the bay'],
    ['North West Company', 'paddled inland from Montreal'],
    ['Haudenosaunee', 'allied to the British'],
    ['Wendat and Anishinaabe', 'mostly allied to the French'],
  ], { emoji: '🛶', why: 'Two companies, two styles: the HBC let traders come to it; the Nor’Westers went out to get the furs first.' }),

  // --- hist-a-war · the fall of New France, 1754–1763 ----------------------------
  order('g7ha-11', 'hist-a-war', 'Put the fall of New France in order, EARLIEST first:', [
    'Fighting starts in the Ohio Country',
    'The Acadians are deported',
    'Battle of the Plains of Abraham',
    'Montreal surrenders',
    'Treaty of Paris ends the war',
  ], { emoji: '🏴', why: '1754 · 1755 · 1759 · 1760 · 1763. Seven years of war, not one battle.' }),
  choice('g7ha-12', 'hist-a-war', 'Which 1759 battle decided the fate of Quebec City?', 'the Plains of Abraham', ['Queenston Heights', 'Montgomery’s Tavern', 'Beaver Dams', 'the Battle of the Thames', 'Lake Erie'], {
    emoji: '⚔️',
    why: 'The other five are real battles too — from the War of 1812 and the 1837 rebellion. Know which war each belongs to.',
  }),
  choice('g7ha-13', 'hist-a-war', 'Which two generals BOTH died in the 1759 battle at Quebec?', 'Wolfe and Montcalm', ['Brock and Tecumseh', 'Simcoe and Carleton', 'Wolfe and Brock', 'Montcalm and Carleton', 'Durham and Elgin'], {
    emoji: '🎖️',
    why: 'James Wolfe (British) and the Marquis de Montcalm (French) were both fatally wounded on the Plains of Abraham.',
  }),
  choice('g7ha-14', 'hist-a-war', 'Why did Britain deport the Acadians in 1755?', 'it feared they would help France', ['they refused to pay a fur tax', 'they had started a rebellion', 'their land was needed for a fort', 'they would not learn English', 'a flood had ruined their farms'], {
    emoji: '⛵',
    why: 'The Acadians would not swear to fight France, so thousands were forced from their homes — the Great Upheaval.',
  }),
  write('g7ha-15', 'hist-a-war', 'Type the year of the Battle of the Plains of Abraham:', ['1759'], {
    emoji: '✍️',
    why: '1759 Quebec · 1760 Montreal · 1763 the peace. Three dates, one story.',
  }),

  // --- hist-a-1763 · the Royal Proclamation -------------------------------------
  choice('g7ha-16', 'hist-a-1763', 'What did the Royal Proclamation of 1763 set aside WEST of its line?', 'land for First Nations', ['land for Loyalist farms', 'land for French Catholics', 'land for the fur companies', 'land for British soldiers', 'land for a new capital'], {
    emoji: '📏',
    why: 'The line ran along the Appalachians. West of it, no settling without a treaty.',
  }),
  choice('g7ha-17', 'hist-a-1763', 'Under the Proclamation, who alone could buy First Nations land?', 'the Crown, by treaty', ['any settler with cash', 'the Hudson’s Bay Company', 'the colonial assemblies', 'the Catholic Church', 'the French seigneurs'], {
    emoji: '👑',
    why: 'Only the Crown could make land deals, by treaty. That rule is why Canada has treaties at all.',
  }),
  choice('g7ha-18', 'hist-a-1763', 'Whose uprising pushed Britain to write the Proclamation?', 'Pontiac, an Odawa leader', ['Tecumseh, a Shawnee leader', 'Brant, a Mohawk leader', 'Papineau, a Patriote leader', 'Mackenzie, a Reform leader', 'Riel, a Métis leader'], {
    emoji: '🏹',
    why: 'Pontiac’s War (1763–66) attacked British forts around the Great Lakes. Peace was cheaper than another war.',
  }),
  choice('g7ha-19', 'hist-a-1763', 'What did most settlers do about the Proclamation line?', 'ignored it and kept moving west', ['moved back east of it', 'paid a fee to cross it', 'built a wall along it', 'asked permission to cross', 'went north to Quebec'], {
    emoji: '🚶',
    why: 'The line was a promise, not a wall with guards — and the anger over it fed the American Revolution.',
  }),
  choice('g7ha-20', 'hist-a-1763', 'Why do First Nations still point to the 1763 Proclamation today?', 'it recognised their rights to land', ['it made them British citizens', 'it gave them seats in Parliament', 'it ended the fur trade for good', 'it moved them to reserves out west', 'it paid them for New France'], {
    emoji: '⚖️',
    why: 'It is still in Canada’s Constitution. It said land could only change hands by treaty — so rights to land existed.',
  }),

  // --- hist-a-quebec · the Quebec Act, 1774 --------------------------------------
  choice('g7ha-21', 'hist-a-quebec', 'Which law did the Quebec Act keep for property and everyday disputes?', 'French civil law', ['English common law', 'military law', 'Church law only', 'American colonial law', 'Haudenosaunee law'], {
    emoji: '⛪',
    why: 'Civil law covers land, debts and wills. Criminal law (crimes) stayed English.',
  }),
  choice('g7ha-22', 'hist-a-quebec', 'Why did Britain pass the Quebec Act?', 'to keep French Canadians loyal', ['to punish French Canadians', 'to bring in Loyalist settlers', 'to end the fur trade', 'to split Quebec in two', 'to raise taxes for the war'], {
    emoji: '🤝',
    why: 'Trouble was brewing in the Thirteen Colonies. Britain needed Quebec on its side.',
  }),
  choice('g7ha-23', 'hist-a-quebec', 'Why were the Thirteen Colonies furious about the Quebec Act?', 'it gave Quebec the Ohio Valley', ['it closed the port of Boston', 'it raised the tax on tea', 'it made French their language', 'it freed enslaved people', 'it moved their capital north'], {
    emoji: '😡',
    why: 'Virginia and others claimed that land. Boston’s port was a DIFFERENT “Intolerable Act” passed the same year.',
  }),
  choice('g7ha-24', 'hist-a-quebec', 'What did the Quebec Act NOT give Quebec?', 'an elected assembly', ['French civil law', 'freedom for Catholics', 'the Ohio Valley', 'a bigger border', 'an appointed council'], {
    emoji: '🗳️',
    why: 'Quebec got an appointed council instead. Its first elected assembly came with the Constitutional Act of 1791.',
  }),
  match('g7ha-25', 'hist-a-quebec', 'Match each law or treaty to what it did:', [
    ['Treaty of Paris, 1763', 'handed New France to Britain'],
    ['Royal Proclamation, 1763', 'a line reserving western land'],
    ['Quebec Act, 1774', 'kept French law and the Catholic faith'],
    ['Constitutional Act, 1791', 'split Quebec into two colonies'],
  ], { emoji: '📚', why: 'Four documents in 28 years. Each one fixed a problem the last one made.' }),

  // --- hist-a-loyal · the Loyalists ----------------------------------------------
  choice('g7ha-26', 'hist-a-loyal', 'Why did the Loyalists have to leave the United States after 1783?', 'they had sided with Britain, and lost', ['the farms there had run out of soil', 'a famine hit the Thirteen Colonies', 'Britain ordered every colonist home', 'they wanted to live in French Quebec', 'the fur trade there had collapsed'], {
    emoji: '⛵',
    why: 'The winners saw them as traitors. Many lost their homes and feared revenge.',
  }),
  choice('g7ha-27', 'hist-a-loyal', 'About how many Loyalists moved north after 1783?', 'about 50,000', ['about 500', 'about 5,000', 'about 500,000', 'about 5 million', 'about 1,000'], {
    emoji: '👥',
    why: 'Around 50,000 — enough to create new colonies and change who lived in British North America.',
  }),
  choice('g7ha-28', 'hist-a-loyal', 'Which new colony was made for Loyalists in 1784?', 'New Brunswick', ['Upper Canada', 'Nova Scotia', 'Prince Edward Island', 'Lower Canada', 'Newfoundland'], {
    emoji: '🏘️',
    why: 'New Brunswick was cut out of Nova Scotia in 1784. Upper Canada came later, in 1791.',
  }),
  choice('g7ha-29', 'hist-a-loyal', 'In 1792, after broken promises of land, about 1,200 Black Loyalists left Nova Scotia for…', 'Sierra Leone, in Africa', ['Upper Canada', 'the United States', 'the Caribbean', 'Quebec City', 'Britain'], {
    emoji: '🌍',
    why: 'They had been promised freedom and land for fighting for Britain. Too many got poor land, or none.',
  }),
  choice('g7ha-30', 'hist-a-loyal', 'What did Britain give arriving Loyalists to start again?', 'land, tools and food', ['seats in Parliament', 'gold from the treasury', 'jobs in the navy', 'free passage to Britain', 'houses in Quebec City'], {
    emoji: '🪓',
    why: 'Land grants and supplies — they had lost their property because of their loyalty.',
  }),

  // --- hist-a-1791 · the Constitutional Act ----------------------------------------
  choice('g7ha-31', 'hist-a-1791', 'Why did the Constitutional Act of 1791 split Quebec in two?', 'so each side could keep its own laws', ['so Britain could tax them twice', 'so the fur companies got more land', 'to punish the French Canadians', 'to make room for American settlers', 'because of the War of 1812'], {
    emoji: '✂️',
    why: 'English-speaking Loyalists wanted English law; the French-speaking east kept French civil law.',
  }),
  choice('g7ha-32', 'hist-a-1791', 'Why was it called UPPER Canada?', 'it was upstream on the St. Lawrence', ['it was further north on the map', 'it was higher in the mountains', 'its people were richer', 'it had more people', 'it was settled first'], {
    emoji: '🏞️',
    why: 'The river flows from the Great Lakes down to the sea. Upstream = Upper. It is about the river, not the map: Toronto sits further SOUTH than Quebec City.',
  }),
  choice('g7ha-33', 'hist-a-1791', 'Which river was the border between Upper and Lower Canada?', 'the Ottawa River', ['the St. Lawrence River', 'the Niagara River', 'the Red River', 'the Fraser River', 'the Saguenay River'], {
    emoji: '🌊',
    why: 'Still the line between Ontario and Quebec today.',
  }),
  match('g7ha-34', 'hist-a-1791', 'Match each piece of the 1791 deal:', [
    ['Upper Canada', 'English common law'],
    ['Lower Canada', 'French civil law'],
    ['John Graves Simcoe', 'first Lieutenant Governor of Upper Canada'],
    ['Clergy reserves', 'land set aside for Protestant churches'],
  ], { emoji: '🧩', why: 'Simcoe later moved the capital to York — today’s Toronto.' }),
  choice('g7ha-35', 'hist-a-1791', 'What did each colony get in 1791 that Quebec had never had?', 'an elected assembly', ['its own king', 'its own army', 'its own money', 'its own church', 'its own flag'], {
    emoji: '🗳️',
    why: 'Voters could now elect an assembly — but the governor and his appointed councils still had the real power. Remember that for 1837.',
  }),

  // --- hist-a-slave · slavery and freedom in early Canada -----------------------------
  choice('g7ha-36', 'hist-a-slave', 'What did Upper Canada’s 1793 law against slavery actually do?', 'banned bringing in new enslaved people', ['freed every enslaved person at once', 'paid owners to free people', 'made slavery legal again', 'applied only in Lower Canada', 'freed people who joined the army'], {
    emoji: '⛓️',
    why: 'A first step, not the finish: people already enslaved stayed enslaved.',
  }),
  choice('g7ha-37', 'hist-a-slave', 'Whose case pushed Upper Canada to pass the 1793 law?', 'Chloe Cooley', ['Laura Secord', 'Viola Desmond', 'Marie-Joseph Angélique', 'Harriet Tubman', 'Mary Ann Shadd'], {
    emoji: '🗣️',
    why: 'Chloe Cooley was forced across the Niagara River to be sold. Peter Martin, a Black witness, reported it.',
  }),
  choice('g7ha-38', 'hist-a-slave', 'Under the 1793 law, children born to enslaved mothers became free at what age?', '25', ['12', '16', '18', '30', '40'], {
    emoji: '🎂',
    why: 'Free at 25 — and their own children were born free.',
  }),
  choice('g7ha-39', 'hist-a-slave', 'In which year did slavery end across the whole British Empire, Canada included?', '1834', ['1763', '1793', '1812', '1867', '1865'], {
    emoji: '🔓',
    why: 'The Slavery Abolition Act passed in 1833 and took effect in 1834. 1865 is when the United States ended it.',
  }),
  choice('g7ha-40', 'hist-a-slave', 'Who was Marie-Joseph Angélique?', 'an enslaved woman in Montreal', ['a nun who ran a hospital', 'a fur trader’s wife', 'the first woman teacher', 'a Loyalist from New York', 'a nurse in the War of 1812'], {
    emoji: '📜',
    why: 'Executed in 1734 — proof that slavery was real in New France, the part old textbooks skipped.',
  }),
]
