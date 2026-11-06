// §14d — History, Strand A: New France and British North America, 1713–1800.
// Written by hand in session. See ./build.ts for how an idea and its versions work.
import { chapter, choice, match, order } from './build'

export const HIST_A = [
  // --- 🗺️ Who was already here in 1713 -----------------------------------------
  chapter('hist-a-1713', [
    ['nations', {
      explain: [
        'In 1713, First Nations had lived here for thousands of years.',
        'Each nation had its own land, language, laws and leaders.',
        'The Haudenosaunee lived south of Lake Ontario. The Anishinaabe lived around the Great Lakes. The Mi’kmaq lived on the east coast.',
      ],
      video: 'hist-a-1713-v0',
      watchFor: 'Three groups wanted this land in 1713. Who were they?',
    }, [
      choice('In 1713, who had been living on this land the longest?', 'First Nations', ['French settlers', 'British settlers', 'Spanish traders', 'Dutch farmers'], {
        emoji: '🗺️',
        why: 'First Nations had been here for thousands of years. The French and British had been here about 100.',
      }),
      choice('The Haudenosaunee, Anishinaabe and Mi’kmaq were all…', 'First Nations with their own lands', ['French colonies on the river', 'British forts on Hudson Bay', 'parts of one single nation', 'trading companies from Europe'], {
        emoji: '🪶',
        why: 'Each was its own people, with its own leaders, language and land.',
      }),
      match('Match each nation to where it lived around 1713:', [
        ['Haudenosaunee', 'south of Lake Ontario'],
        ['Anishinaabe', 'around the Great Lakes'],
        ['Mi’kmaq', 'the east coast'],
        ['Wendat', 'near Quebec City'],
      ], { emoji: '🗺️', why: 'The Wendat had been pushed out of Georgian Bay in 1649 and many lived at Wendake, near Quebec City.' }),
    ]],
    ['five-nations', {
      explain: [
        'The Haudenosaunee were a confederacy: nations that agreed to act as one.',
        'In 1713 there were five: Mohawk, Oneida, Onondaga, Cayuga and Seneca.',
        'The Tuscarora joined in the 1720s, which is why later they are called the Six Nations.',
      ],
      video: 'hist-a-1713-v0',
      watchFor: 'Listen for the name of the confederacy south of Lake Ontario.',
    }, [
      choice('In 1713, how many nations were in the Haudenosaunee Confederacy?', 'five', ['three', 'six', 'ten', 'two']),
      choice('Which nation was part of the Haudenosaunee Confederacy?', 'the Mohawk', ['the Wendat', 'the Mi’kmaq', 'the Cree', 'the Innu'], {
        emoji: '🪶',
        why: 'Mohawk, Oneida, Onondaga, Cayuga, Seneca. The Wendat were actually their rivals.',
      }),
      choice('Why are the Haudenosaunee later called the “Six Nations”?', 'the Tuscarora joined them', ['one nation split in two', 'Britain gave them a sixth', 'they won a sixth war', 'the French named them so'], {
        why: 'The Tuscarora moved north and joined in the 1720s. Five became six.',
      }),
    ]],
    ['utrecht', {
      explain: [
        'In 1713, France and Britain signed the Treaty of Utrecht in Europe.',
        'France gave Britain Acadia (mainland Nova Scotia), Newfoundland and Hudson Bay.',
        'France kept Cape Breton and built the fortress of Louisbourg there.',
        'No First Nation was at the table, even though it was their land.',
      ],
      video: 'hist-a-1713-v1',
      watchFor: 'What did France have to hand over to Britain in 1713?',
    }, [
      choice('What did the Treaty of Utrecht (1713) give Britain?', 'Acadia, Newfoundland and Hudson Bay', ['Quebec City, Montreal and the river', 'the whole of New France at once', 'Louisbourg and all of Cape Breton', 'the Ohio Valley and Fort Detroit'], {
        emoji: '📜',
        why: 'France lost the edges but kept the heart: the St. Lawrence, and Cape Breton.',
      }),
      choice('Who was NOT invited to sign the Treaty of Utrecht?', 'the First Nations whose land it was', ['the king of France’s ministers', 'the queen of Britain’s diplomats', 'the Spanish king’s representative', 'the Dutch Republic’s diplomats'], {
        why: 'European powers traded land on paper that First Nations still lived on and controlled.',
      }),
      choice('After 1713, France built a huge fortress to guard what it had left. Where?', 'Louisbourg, on Cape Breton', ['York, on Lake Ontario', 'Halifax, in Nova Scotia', 'Fort Detroit, on the lakes', 'St. John’s, in Newfoundland'], {
        emoji: '🏰',
        why: 'Louisbourg guarded the entrance to the St. Lawrence — the door to New France.',
      }),
    ]],
    ['names', {
      explain: [
        '“Indigenous” is not one group. It is many nations, each different.',
        'Name a people by the name they use for themselves.',
        'The French called the Wendat “Huron”. The Wendat called themselves Wendat.',
        'Anishinaabe is a family of nations: Ojibwe, Odawa, Potawatomi, Mississauga and more.',
      ],
      video: 'hist-a-1713-v0',
    }, [
      choice('The French called them “Huron”. What did this nation call itself?', 'Wendat', ['Mohawk', 'Mi’kmaq', 'Cree', 'Seneca']),
      choice('The Ojibwe, Odawa and Mississauga all belong to which family of nations?', 'Anishinaabe', ['Haudenosaunee', 'Wendat', 'Inuit', 'Mi’kmaq'], {
        why: 'Anishinaabe is the big family name; each nation inside it has its own name and leaders.',
      }),
      choice('A history book says “the Indians” sided with France. What is the problem?', 'it treats many nations as one', ['it gets the year of the war wrong', 'France had no allies at all', 'it should say “the British”', 'nothing — that is accurate'], {
        emoji: '🕵️',
        why: 'Different nations chose different sides. The Haudenosaunee and the Wendat were rivals, not one team.',
      }),
    ]],
    ['powers', {
      explain: [
        'Around 1713, three powers met here: First Nations, New France and the British colonies.',
        'New France was small in people — about 20,000 colonists along the St. Lawrence.',
        'The British colonies to the south had far more — hundreds of thousands.',
        'That gap in numbers is a big reason France later lost.',
      ],
      video: 'hist-a-1713-v0',
      watchFor: 'Count the people: who had more settlers, New France or the British colonies?',
    }, [
      choice('Around 1713, who had more settlers in North America?', 'the British colonies, by far', ['New France, by far', 'they had about the same', 'Spain, in Quebec', 'nobody had any settlers'], {
        emoji: '👥',
        why: 'The British colonies had hundreds of thousands of people; New France had about 20,000.',
      }),
      choice('New France’s colonists mostly lived along which river?', 'the St. Lawrence', ['the Mississippi', 'the Hudson', 'the Fraser', 'the Thames'], {
        why: 'Quebec City, Trois-Rivières and Montreal all sit on the St. Lawrence.',
      }),
      match('Match each group to what it held in 1713:', [
        ['New France', 'the St. Lawrence valley'],
        ['the British colonies', 'the Atlantic coast to the south'],
        ['First Nations', 'most of the land and the routes'],
      ], { why: 'The Europeans held their settlements. First Nations still held most of the continent.' }),
    ]],
  ]),

  // --- 🦫 The fur trade and the alliances it bought ---------------------------
  chapter('hist-a-fur', [
    ['why-beaver', {
      explain: [
        'In Europe, felt hats were the fashion — and the best felt came from beaver fur.',
        'The soft underfur could be pressed into strong, waterproof felt.',
        'So beaver pelts were worth a lot, and First Nations trappers had them.',
      ],
      video: 'hist-a-fur-v2',
      watchFor: 'What did people in Europe make out of beaver fur?',
    }, [
      choice('Why did Europeans want beaver pelts so badly?', 'to make felt hats', ['to make boat sails', 'to make warm boots', 'to make rope for ships', 'to stuff mattresses'], {
        emoji: '🎩',
        why: 'The underfur pressed into felt. A beaver hat was the fashion in Europe for 200 years.',
      }),
      choice('A beaver hat is the must-have look in Paris. What happens in New France?', 'beaver pelts become very valuable', ['beavers become pets in the colony', 'settlers stop trapping beaver', 'hat shops open in Montreal', 'the price of pelts drops'], {
        why: 'Fashion in Europe set the price in North America. High demand = high value.',
      }),
      choice('Which part of the beaver made the best felt?', 'the soft underfur', ['the flat tail', 'the long whiskers', 'the front teeth', 'the hard claws'], {
        why: 'The short underfur has tiny barbs that lock together when pressed — perfect felt.',
      }),
    ]],
    ['goods', {
      explain: [
        'First Nations traded pelts for European goods.',
        'Metal kettles, axes, knives, muskets, wool cloth and blankets.',
        'Metal tools lasted longer than stone or bark ones, so they changed daily life.',
      ],
      video: 'hist-a-fur-v1',
      watchFor: 'What did First Nations get in return for their furs?',
    }, [
      choice('What did First Nations traders often get for their pelts?', 'kettles, axes and muskets', ['gold coins and jewels', 'horses and cattle', 'land in France', 'potatoes and wheat'], {
        emoji: '🫖',
        why: 'Metal goods were the big prize: a copper kettle or iron axe lasted for years.',
      }),
      match('Match each trade good to what it replaced:', [
        ['copper kettle', 'bark and clay pots'],
        ['iron axe', 'stone tools'],
        ['musket', 'the bow for hunting'],
        ['wool blanket', 'fur robes'],
      ], { why: 'Furs went east across the Atlantic. Goods came west, and they changed daily life.' }),
      choice('Why was an iron axe such a valuable trade good?', 'it lasted longer than a stone one', ['it was made of real gold inside', 'it could only be used one time', 'it was lighter than a birch canoe', 'the French gave them away for free'], {
        why: 'Metal tools made work faster and lasted for years, so First Nations sought them out.',
      }),
    ]],
    ['alliance', {
      explain: [
        'The fur trade was not shopping. It was a relationship.',
        'Trading partners exchanged gifts and speeches first, and became allies.',
        'The French traded with the Wendat, Algonquin and Anishinaabe — and fought beside them.',
        'The Haudenosaunee traded with the Dutch and then the British.',
      ],
      video: 'hist-a-fur-v1',
      watchFor: 'Listen for why trading meant choosing a side.',
    }, [
      choice('Trading with the French usually meant a nation also became…', 'an ally of France', ['a French citizen', 'an enemy of France', 'a French colony', 'a British ally'], {
        emoji: '🤝',
        why: 'Trade partners were military partners. Choosing a trader meant choosing a side.',
      }),
      choice('Before any furs changed hands, what usually happened first?', 'gifts and speeches', ['a written contract', 'a battle', 'a coin payment', 'a horse race'], {
        why: 'Gift-giving renewed the friendship. No gifts, no trade — and no alliance.',
      }),
      choice('Luffy shares his meat with a crew before they sail together. Which part of the fur trade is that most like?', 'gift-giving to seal an alliance', ['selling pelts for coins', 'stealing furs from a rival', 'counting pelts in made beaver', 'shipping hats to Europe'], {
        emoji: '🍖',
        why: 'Gifts were not a price — they were how you showed you were on the same side.',
      }),
    ]],
    ['companies', {
      explain: [
        'The Hudson’s Bay Company (HBC) started in 1670. It traded from forts on Hudson Bay.',
        'First Nations traders, like the Cree, brought furs down to the bay.',
        'The North West Company started in Montreal in 1779 and sent canoes far inland.',
        'They fought hard for furs until they merged in 1821.',
      ],
      video: 'hist-a-fur-v0',
      watchFor: 'How did the two companies get their furs — waiting, or travelling?',
    }, [
      choice('Which company traded from forts on Hudson Bay?', 'the Hudson’s Bay Company', ['the North West Company', 'the East India Company', 'the Company of New France', 'the Dutch West India Company'], {
        emoji: '🏰',
        why: 'The HBC mostly waited at its bay forts for First Nations traders to come to it.',
      }),
      choice('The North West Company was based in which city?', 'Montreal', ['London', 'Halifax', 'Boston', 'York'], {
        why: 'Montreal traders sent voyageurs by canoe deep into the west.',
      }),
      choice('How did the HBC and the North West Company finally stop fighting?', 'they merged in 1821', ['a war ended both', 'France bought them out', 'the beavers ran out in 1790', 'the king banned them'], {
        why: 'In 1821 they joined into one company, keeping the Hudson’s Bay name.',
      }),
    ]],
    ['people', {
      explain: [
        'Coureurs des bois were French traders who went into the woods without a licence.',
        'Voyageurs were paddlers hired, with a contract, to move the canoes.',
        'First Nations women prepared the pelts, made moccasins and snowshoes, and often interpreted.',
        'Children of French traders and First Nations women became the Métis.',
      ],
      video: 'hist-a-fur-v1',
    }, [
      choice('A young Frenchman goes into the woods to trade WITHOUT a licence. He is a…', 'coureur des bois', ['voyageur', 'seigneur', 'habitant', 'governor']),
      match('Match each person to their job:', [
        ['coureur des bois', 'traded without a licence'],
        ['voyageur', 'paddled under a contract'],
        ['First Nations women', 'prepared pelts and made snowshoes'],
        ['Cree traders', 'brought furs to the bay forts'],
      ], { why: 'The trade depended on all of them, not just the companies.' }),
      choice('Who were the Métis?', 'mixed First Nations–European families', ['French soldiers who settled in Quebec', 'British farmers who came from Scotland', 'the first governors of the Bay forts', 'the priests who ran the river missions'], {
        why: 'Métis families grew out of the fur trade and became a nation of their own.',
      }),
    ]],
  ]),

  // --- 🏴 The fall of New France, 1754–1763 -------------------------------------
  chapter('hist-a-war', [
    ['timeline', {
      explain: [
        '1754: fighting starts in the Ohio Valley.',
        '1759: the British win the Plains of Abraham and take Quebec City.',
        '1760: Montreal surrenders — French rule in Canada is over.',
        '1763: the Treaty of Paris makes it official.',
      ],
      video: 'hist-a-war-v1',
      watchFor: 'Three dates: 1759, 1760, 1763. What happened in each?',
    }, [
      order('Put these in order, earliest first:', ['fighting starts in the Ohio Valley', 'Battle of the Plains of Abraham', 'Montreal surrenders', 'Treaty of Paris'], {
        emoji: '⏳',
        why: '1754 → 1759 → 1760 → 1763.',
      }),
      choice('In which year did Montreal surrender, ending French rule in Canada?', '1760', ['1759', '1763', '1754', '1756']),
      choice('Quebec City fell in 1759. Why was the war in Canada NOT over yet?', 'the French still held Montreal', ['the British went home', 'Quebec was retaken that night', 'Spain joined the French side', 'the winter froze the treaty'], {
        why: 'Montreal held out a whole year more. People often stop the story at 1759 — that is the trap.',
      }),
    ]],
    ['plains', {
      explain: [
        'In September 1759, British troops climbed the cliffs below Quebec City at night.',
        'At dawn, on the Plains of Abraham, they met the French army.',
        'The battle took about 15 minutes. The British won.',
        'Both generals died: James Wolfe (British) and the Marquis de Montcalm (French).',
      ],
      video: 'hist-a-war-v0',
      watchFor: 'How did the British get up to the Plains — by road, or up the cliffs?',
    }, [
      choice('Who led the British at the Plains of Abraham?', 'James Wolfe', ['Montcalm', 'Isaac Brock', 'Guy Carleton', 'George Washington'], {
        emoji: '⚔️',
        why: 'Wolfe led the British; Montcalm led the French. Both were killed.',
      }),
      choice('What happened to the two generals at the Plains of Abraham?', 'both of them died', ['both of them escaped', 'only Montcalm died', 'only Wolfe died', 'both were taken prisoner'], {
        why: 'Wolfe died on the field. Montcalm died of his wounds the next morning.',
      }),
      choice('How did the British army reach the Plains above Quebec City?', 'it climbed the cliffs at night', ['it sailed up a canal', 'it marched over from Montreal', 'it was invited through the gates', 'it dug a tunnel under the walls'], {
        emoji: '🧗',
        why: 'A narrow path up the cliffs, in the dark. By morning the army was on the Plains.',
      }),
    ]],
    ['why-lost', {
      explain: [
        'France had far fewer colonists than the British colonies.',
        'Britain had the stronger navy, so it could block French supply ships.',
        'Without ships, New France ran short of soldiers, food and trade goods.',
        'France also cared more about the war in Europe and its sugar islands.',
      ],
      video: 'hist-a-war-v1',
    }, [
      choice('Which was a big reason New France lost the war?', 'Britain’s navy cut off its supplies', ['New France had more soldiers', 'First Nations all sided with Britain', 'the French forgot to build forts', 'Quebec City had no walls'], {
        emoji: '⛵',
        why: 'No supply ships meant no fresh troops, food or gunpowder for New France.',
      }),
      choice('Blue Lock: one team has 11 players, the other has 3. The 3 play brilliantly but lose. Which part of the war is this like?', 'New France’s few settlers', ['the Treaty of Paris terms', 'the Royal Proclamation line', 'the fur trade alliances', 'the Quebec Act’s new law'], {
        emoji: '⚽',
        why: 'New France had about 70,000 people. The British colonies had over a million.',
      }),
      choice('France got to choose what to keep in 1763. What did it pick over Canada?', 'its sugar islands in the Caribbean', ['the city of Boston and its port', 'the whole of the Hudson Bay coast', 'the Ohio Valley and its forts', 'the Great Lakes and their furs'], {
        why: 'Sugar from Guadeloupe earned more money than furs. A French writer called Canada “a few acres of snow”.',
      }),
    ]],
    ['paris', {
      explain: [
        'The Treaty of Paris, 1763, ended the Seven Years’ War.',
        'France gave Canada to Britain.',
        'France kept only Saint-Pierre and Miquelon, two small islands near Newfoundland, for fishing.',
        'About 70,000 French-speaking Canadiens now lived under a British king.',
      ],
      video: 'hist-a-war-v2',
    }, [
      choice('Which treaty made the British win official in 1763?', 'the Treaty of Paris', ['the Treaty of Utrecht', 'the Treaty of Ghent', 'the Quebec Act', 'the Act of Union'], {
        emoji: '📜',
        why: 'Paris 1763 ended the Seven Years’ War. Utrecht was 1713; Ghent ended the War of 1812.',
      }),
      choice('After 1763, what did France keep near Canada?', 'two small fishing islands', ['Quebec City and its walls', 'all of Acadia and its farms', 'the forts on the Great Lakes', 'nothing at all in America'], {
        why: 'Saint-Pierre and Miquelon — still French today.',
      }),
      choice('After 1763, the French-speaking Canadiens…', 'stayed, under a British king', ['all sailed back to France', 'moved to the Ohio Valley', 'became American citizens', 'were made to leave by law'], {
        why: 'Most stayed on their farms. How Britain would rule them became the next big question.',
      }),
    ]],
    ['acadians', {
      explain: [
        'Acadia (today’s Nova Scotia) had been British since 1713, but the Acadians were French-speaking.',
        'They tried to stay neutral and refused an oath to fight for Britain.',
        'From 1755, Britain forced about 10,000 Acadians out. Families were split up.',
        'This is called the Expulsion of the Acadians, or the Great Upheaval.',
      ],
      video: 'hist-a-war-v0',
    }, [
      choice('What happened to many Acadians starting in 1755?', 'Britain forced them out of their homes', ['France gave them new farms in Quebec', 'they founded the city of Montreal', 'they won a country of their own there', 'they all joined the British army'], {
        emoji: '🚢',
        why: 'The Expulsion scattered families across the colonies, France and Louisiana.',
      }),
      choice('Why did Britain distrust the Acadians?', 'they refused an oath to fight for Britain', ['they had burned the town of Halifax', 'they traded only with Spanish ships', 'they had joined the Haudenosaunee side', 'they refused to learn to speak English'], {
        why: 'They wanted to stay neutral. In a war, Britain saw neutral as dangerous.',
      }),
      choice('Some expelled Acadians ended up in Louisiana. Their descendants are called…', 'Cajuns', ['Loyalists', 'Métis', 'Patriotes', 'Habitants'], {
        why: '“Cajun” comes from “Acadian”.',
      }),
    ]],
  ]),

  // --- 📜 The Royal Proclamation of 1763 ----------------------------------------
  chapter('hist-a-1763', [
    ['line', {
      explain: [
        'In October 1763, King George III issued the Royal Proclamation.',
        'It drew a line along the Appalachian Mountains.',
        'West of the line was reserved for First Nations. Settlers were not allowed to move there.',
      ],
      video: 'hist-a-1763-v0',
      watchFor: 'Where did the line run, and who was the land west of it for?',
    }, [
      choice('Who issued the Royal Proclamation of 1763?', 'King George III', ['Louis XV of France', 'General Wolfe', 'the Thirteen Colonies', 'the Haudenosaunee'], {
        emoji: '👑',
        why: 'It was a royal order — the King’s rule, not a deal both sides signed.',
      }),
      choice('The Proclamation line ran along which mountains?', 'the Appalachians', ['the Rockies', 'the Laurentians', 'the Andes', 'the Alps']),
      choice('A settler wants a farm WEST of the 1763 line. What did the Proclamation say?', 'no — that land is for First Nations', ['yes — any settler may go there', 'only if he pays the king first', 'only if he is a French Canadien', 'yes — after he farms for a year'], {
        emoji: '🚫',
        why: 'West of the line was set aside as First Nations land.',
      }),
    ]],
    ['crown-only', {
      explain: [
        'Settlers could not buy land straight from a First Nation.',
        'Only the Crown (the British government) could, at a public meeting, by treaty.',
        'This is the root of how treaties are made in Canada, even today.',
      ],
      video: 'hist-a-1763-v2',
    }, [
      choice('Under the Proclamation, who was allowed to buy First Nations land?', 'only the Crown, by treaty', ['any settler with money', 'the Hudson’s Bay Company', 'French seigneurs', 'nobody, ever'], {
        why: 'Only the Crown could buy, in public, by treaty. That rule shaped every treaty after it.',
      }),
      choice('Why does the Royal Proclamation still matter in Canada today?', 'it set the rules for treaties', ['it created the city of Toronto', 'it made French the only language', 'it ended the War of 1812', 'it joined Upper and Lower Canada'], {
        why: 'It is even mentioned in the Charter of Rights (1982). Courts still use it.',
      }),
      choice('A land company tries to buy land quietly from a few chiefs, in private. Under the Proclamation, this is…', 'not allowed', ['allowed, if they pay well', 'allowed, in winter only', 'required by the king', 'allowed, if they are French'], {
        why: 'Private deals were banned. It had to be the Crown, in public.',
      }),
    ]],
    ['pontiac', {
      explain: [
        'In 1763, an Odawa leader named Pontiac led nations around the Great Lakes against the British.',
        'They attacked British forts. It is called Pontiac’s War.',
        'Britain wanted the fighting to stop — the Proclamation was partly its answer.',
        'In 1764, at the Treaty of Niagara, about 2,000 chiefs met the British and confirmed it.',
      ],
      video: 'hist-a-1763-v1',
    }, [
      choice('What war pushed Britain to issue the Proclamation?', 'Pontiac’s War', ['the War of 1812', 'the American Revolution', 'the Beaver Wars', 'the Rebellions of 1837'], {
        emoji: '🏹',
        why: 'Nations around the Great Lakes rose up in 1763. Britain needed peace.',
      }),
      choice('Pontiac was a leader of which nation?', 'the Odawa', ['the Mohawk', 'the Mi’kmaq', 'the Wendat', 'the Cree']),
      choice('In 1764 about 2,000 chiefs met the British to confirm the Proclamation. Where?', 'at Niagara', ['in London', 'at Quebec City', 'in Boston', 'at Hudson Bay'], {
        why: 'The Treaty of Niagara was sealed with wampum belts — to First Nations, that made it a real agreement.',
      }),
    ]],
    ['ignored', {
      explain: [
        'The line was a promise on paper, not a wall with guards.',
        'Many settlers from the Thirteen Colonies crossed it anyway.',
        'They were angry: they had fought France to get that land.',
        'Their anger became one cause of the American Revolution.',
      ],
      video: 'hist-a-1763-v0',
    }, [
      choice('How did many settlers in the Thirteen Colonies react to the line?', 'they were angry and crossed it', ['they thanked the king for it', 'they all moved back to Britain', 'they built a stone wall along it', 'they never even heard of it'], {
        emoji: '😠',
        why: 'They felt cheated — and many went west anyway.',
      }),
      choice('The Proclamation’s anger in the Thirteen Colonies helped cause…', 'the American Revolution', ['the fall of New France', 'the Irish famine', 'the War of 1812', 'the fur trade'], {
        why: 'It was one of the first big grievances against the king.',
      }),
      choice('A referee draws a line, but nobody guards it, and players keep stepping over. Which idea is this?', 'a line on paper nobody enforces', ['the Proclamation was obeyed', 'only the Crown could buy land', 'the line ran along the mountains', 'France kept two fishing islands'], {
        emoji: '⚽',
        why: 'The line kept moving west because settlers kept crossing it.',
      }),
    ]],
    ['quebec-plan', {
      explain: [
        'The Proclamation also made a small new colony: the Province of Quebec.',
        'Britain planned English law there, and Catholics could not hold office.',
        'The idea was to turn the Canadiens English. It did not work.',
        'Eleven years later, the Quebec Act changed course.',
      ],
      video: 'hist-a-1763-v2',
    }, [
      choice('What new British colony did the Proclamation create along the St. Lawrence?', 'the Province of Quebec', ['Upper Canada', 'New Brunswick', 'the Province of Canada', 'Rupert’s Land']),
      choice('What did Britain first plan for the French-speaking Canadiens in 1763?', 'to make them follow English ways', ['to send them all to France', 'to let them keep French law', 'to give them their own king', 'to make them American'], {
        why: 'English law, no Catholics in office. Most Canadiens just ignored it.',
      }),
      choice('Which later law reversed the Proclamation’s plan for Quebec?', 'the Quebec Act, 1774', ['the Act of Union, 1840', 'the Constitutional Act, 1791', 'the Treaty of Paris, 1763', 'the Durham Report, 1839'], {
        why: 'In 1774, Britain let the Canadiens keep their law and their church.',
      }),
    ]],
  ]),

  // --- ⛪ The Quebec Act, 1774 --------------------------------------------------
  chapter('hist-a-quebec', [
    ['kept', {
      explain: [
        'The Quebec Act of 1774 let the Canadiens keep what mattered most to them.',
        'French civil law for property and family matters.',
        'The Catholic Church, which could collect its tithes again.',
        'The seigneurial system of farming the land.',
      ],
      video: 'hist-a-quebec-v1',
      watchFor: 'Name two things the Canadiens got to keep.',
    }, [
      choice('What did the Quebec Act let the Canadiens keep?', 'French civil law and the Catholic Church', ['their own army with French officers', 'a governor sent over from France', 'an elected French-speaking parliament', 'the right to trade only with France'], {
        emoji: '⛪',
        why: 'Law, faith and land — the three things the Canadiens cared about most.',
      }),
      match('Match each part of the Quebec Act to what it covered:', [
        ['French civil law', 'property and family'],
        ['English criminal law', 'crimes'],
        ['Catholic Church', 'could collect tithes'],
        ['seigneurial system', 'how land was farmed'],
      ], { why: 'A mix: French law for property, English law for crimes.' }),
      choice('A habitant in 1775 has a dispute over his farm. Which law decides it?', 'French civil law', ['English criminal law', 'American law', 'the law of the sea', 'church law only'], {
        why: 'Property and family matters went by French civil law.',
      }),
    ]],
    ['why', {
      explain: [
        'In 1774, the Thirteen Colonies were close to revolting.',
        'Britain needed the 70,000 Canadiens to stay loyal, or at least stay out of it.',
        'Governor Guy Carleton argued: let them keep their ways, and they will not join the rebels.',
        'It worked. When Americans invaded Quebec in 1775, most Canadiens did not help them.',
      ],
      video: 'hist-a-quebec-v0',
    }, [
      choice('Why did Britain pass the Quebec Act in 1774?', 'to keep the Canadiens loyal', ['to punish the Canadiens', 'to start a war with France', 'to give land to Loyalists', 'to end the fur trade'], {
        emoji: '🤝',
        why: 'Trouble was brewing in the Thirteen Colonies. Britain could not afford two problems.',
      }),
      choice('Which governor pushed for the Quebec Act?', 'Guy Carleton', ['John Graves Simcoe', 'Lord Durham', 'Lord Elgin', 'James Wolfe']),
      choice('Americans invaded Quebec in 1775. What did most Canadiens do?', 'stayed out of it', ['joined the Americans', 'fled to France', 'burned Quebec City', 'elected a new king'], {
        why: 'The Quebec Act had given them a reason not to side with the rebels.',
      }),
    ]],
    ['angry', {
      explain: [
        'The Thirteen Colonies hated the Quebec Act.',
        'It gave Quebec the Ohio Valley — land they wanted for themselves.',
        'It protected the Catholic Church, which most of them distrusted.',
        'They counted it among the “Intolerable Acts” that led to revolution.',
      ],
      video: 'hist-a-quebec-v2',
    }, [
      choice('Why were the Thirteen Colonies angry about the Quebec Act?', 'it gave Quebec land they wanted', ['it made Quebec part of France', 'it banned beaver hats', 'it raised their taxes on tea', 'it moved their capital'], {
        emoji: '😡',
        why: 'The Ohio Valley went to Quebec — the land they had fought France for.',
      }),
      choice('The Thirteen Colonies counted the Quebec Act among the…', 'Intolerable Acts', ['Treaties of Paris', 'Seven Years’ Wars', 'Durham Reports', 'Clergy Reserves']),
      choice('Same law, two reactions. Which pair is right?', 'Canadiens pleased, Americans angry', ['Canadiens angry, Americans pleased', 'both of them pleased', 'both of them angry', 'neither of them noticed'], {
        why: 'What protected the Canadiens’ way of life was exactly what upset the Americans.',
      }),
    ]],
    ['borders', {
      explain: [
        'The Quebec Act made the Province of Quebec much bigger.',
        'It now reached south to the Ohio Valley and west around the Great Lakes.',
        'That was the fur-trade country Montreal’s traders used.',
      ],
      video: 'hist-a-quebec-v1',
    }, [
      choice('What happened to Quebec’s borders in 1774?', 'they grew to the Ohio Valley', ['they shrank to Montreal', 'they stayed exactly the same', 'they moved to Nova Scotia', 'they were erased'], {
        emoji: '🗺️',
        why: 'Quebec suddenly stretched around the Great Lakes and down to the Ohio River.',
      }),
      choice('Whose business did the bigger Quebec help most?', 'Montreal fur traders', ['Boston tea merchants', 'Virginia tobacco farmers', 'Halifax fishermen', 'London hat makers'], {
        why: 'The Great Lakes and Ohio country were fur country, worked from Montreal.',
      }),
    ]],
    ['no-assembly', {
      explain: [
        'The Quebec Act gave Quebec no elected assembly.',
        'A governor and an appointed council made the laws.',
        'Catholics could now hold office — they swore an oath to the king, not against their faith.',
        'English-speaking merchants were unhappy: they wanted an elected assembly.',
      ],
      video: 'hist-a-quebec-v0',
    }, [
      choice('Under the Quebec Act, who made the laws in Quebec?', 'a governor and an appointed council', ['an assembly the people elected', 'the Catholic bishop and his priests', 'the fur companies of Montreal', 'all the people, by a public vote'], {
        emoji: '🏛️',
        why: 'No elections. The governor and the council he chose ran the colony.',
      }),
      choice('What changed for Catholics under the Quebec Act?', 'they could hold office', ['they had to leave Quebec', 'they had to become Protestant', 'they could not own land', 'nothing changed at all'], {
        why: 'The new oath was loyalty to the king — no longer an oath against the Catholic faith.',
      }),
      choice('Who in Quebec was unhappy with the Quebec Act?', 'English-speaking merchants', ['the Catholic clergy in Quebec', 'the seigneurs along the river', 'Governor Carleton and his staff', 'the habitants on their farms'], {
        why: 'They wanted English law and an elected assembly. That fight comes back in 1791.',
      }),
    ]],
  ]),

  // --- ⛵ The Loyalists arrive --------------------------------------------------
  chapter('hist-a-loyal', [
    ['who', {
      explain: [
        'In 1775, the Thirteen Colonies rebelled against Britain: the American Revolution.',
        'Loyalists were colonists who stayed loyal to the British king.',
        'When the rebels won in 1783, many Loyalists lost their homes and had to leave.',
        'About 50,000 came north to British North America.',
      ],
      video: 'hist-a-loyal-v0',
      watchFor: 'Why did the Loyalists have to leave their homes?',
    }, [
      choice('Who were the Loyalists?', 'colonists who stayed loyal to the king', ['French soldiers who stayed in Quebec', 'colonists who rebelled against the king', 'traders of the North West Company', 'settlers from Ireland after 1815'], {
        emoji: '👑',
        why: 'They picked Britain’s side in the American Revolution — the side that lost.',
      }),
      choice('About how many Loyalists came north to British North America?', 'about 50,000', ['about 500', 'about 5,000', 'about 5 million', 'about 500,000']),
      choice('A family in New York sided with the king. It is 1783 and the rebels have won. What happens?', 'they lose their home and move north', ['the rebels give them a big reward', 'they become leaders of the new country', 'they sail away to start a colony in China', 'they keep their farm and nothing changes'], {
        why: 'Loyalists were often attacked and their land taken. Many left for Nova Scotia or Quebec.',
      }),
    ]],
    ['where', {
      explain: [
        'Most Loyalists went to Nova Scotia — so many that New Brunswick was made for them in 1784.',
        'Others went up the St. Lawrence and around Lake Ontario: Kingston, the Bay of Quinte, Niagara.',
        'That western part later became Upper Canada (today’s Ontario).',
      ],
      video: 'hist-a-loyal-v1',
    }, [
      choice('Which new colony was made in 1784 for the Loyalists?', 'New Brunswick', ['Upper Canada', 'Newfoundland', 'Manitoba', 'Lower Canada'], {
        emoji: '🗺️',
        why: 'So many arrived along the Saint John River that they got a colony of their own.',
      }),
      choice('Where did MOST of the Loyalists go?', 'to Nova Scotia', ['to Quebec City', 'to Hudson Bay', 'to Britain', 'to the Ohio Valley']),
      choice('The Loyalists who settled around Lake Ontario helped create which colony in 1791?', 'Upper Canada', ['Lower Canada', 'New France', 'Acadia', 'Rupert’s Land'], {
        why: 'English-speaking and wanting English law, they needed a colony of their own.',
      }),
    ]],
    ['brant', {
      explain: [
        'Many Haudenosaunee fought for Britain in the Revolution, and lost their homes in New York.',
        'Joseph Brant (Thayendanegea), a Mohawk leader, led many of them north.',
        'In 1784 the British granted them land along the Grand River in Ontario.',
        'Six Nations of the Grand River is still there today.',
      ],
      video: 'hist-a-loyal-v1',
    }, [
      choice('Which Mohawk leader led many Haudenosaunee Loyalists north?', 'Joseph Brant', ['Pontiac', 'Tecumseh', 'Louis Riel', 'Papineau'], {
        emoji: '🪶',
        why: 'His Mohawk name was Thayendanegea. Brantford is named after him.',
      }),
      choice('Where did Joseph Brant’s people get land in 1784?', 'along the Grand River', ['along the Saint John River', 'on Hudson Bay', 'in Quebec City', 'on Cape Breton'], {
        why: 'Six Nations of the Grand River, near Brantford, is still home to Haudenosaunee people.',
      }),
      choice('Why did many Haudenosaunee lose their homes in New York?', 'they fought on Britain’s side', ['the fur trade had ended there', 'France had taken all their land', 'a great flood had destroyed them', 'they had sold them to Spain'], {
        why: 'The winning Americans did not let Britain’s allies keep their lands.',
      }),
    ]],
    ['black', {
      explain: [
        'About 3,000 Black Loyalists came north. They had been promised freedom and land for supporting Britain.',
        'Many got poor, rocky land, or none, and faced racism. Birchtown, Nova Scotia, was their biggest town.',
        'In 1792, about 1,200 gave up and sailed to Sierra Leone in Africa.',
      ],
      video: 'hist-a-loyal-v0',
    }, [
      choice('What had Britain promised the Black Loyalists?', 'freedom and land', ['gold and a ship', 'a seat in parliament', 'a house in London', 'nothing at all'], {
        emoji: '📜',
        why: 'Freedom and land — but the land was often poor, late, or never given.',
      }),
      choice('In 1792, about 1,200 Black Loyalists left Nova Scotia for…', 'Sierra Leone, in Africa', ['Upper Canada, in the west', 'Jamaica, in the West Indies', 'London, in England', 'Louisiana, in the south'], {
        why: 'Broken promises and racism drove them to start again in Africa.',
      }),
      choice('Birchtown, Nova Scotia, was the biggest town of…', 'Black Loyalists', ['Acadian refugees', 'Irish immigrants', 'Mohawk Loyalists', 'Scottish highlanders']),
    ]],
    ['changed', {
      explain: [
        'The Loyalists changed the map: suddenly there were many English-speaking settlers.',
        'They wanted English law, freehold land and an elected assembly — not French law and seigneurs.',
        'That pressure led to the Constitutional Act of 1791.',
        'They were honoured with the letters U.E., for “Unity of the Empire”.',
      ],
      video: 'hist-a-loyal-v2',
    }, [
      choice('What did the Loyalists in Quebec want that it did not have?', 'English law and an elected assembly', ['French law and a French king', 'a return to the Thirteen Colonies', 'a seigneur for every farm', 'trade only with France'], {
        emoji: '🏛️',
        why: 'They were used to electing an assembly at home. Quebec had none.',
      }),
      choice('Loyalist families could put which letters after their names?', 'U.E.', ['R.N.', 'H.B.C.', 'N.W.C.', 'U.S.'], {
        why: 'United Empire Loyalist. Some Ontario families still use it.',
      }),
      order('Put these in order, earliest first:', ['American Revolution begins', 'Loyalists move north', 'New Brunswick is created', 'Constitutional Act splits Quebec'], {
        emoji: '⏳',
        why: '1775 → 1783 → 1784 → 1791.',
      }),
    ]],
  ]),

  // --- ✂️ The Constitutional Act, 1791 ------------------------------------------
  chapter('hist-a-1791', [
    ['split', {
      explain: [
        'In 1791, Britain split the Province of Quebec in two.',
        'Upper Canada, to the west and upriver: mostly English-speaking Loyalists.',
        'Lower Canada, to the east and downriver: mostly French-speaking Canadiens.',
        'The Ottawa River was roughly the line between them.',
      ],
      video: 'hist-a-1791-v1',
      watchFor: 'Why is the western one called UPPER Canada?',
    }, [
      choice('What did the Constitutional Act of 1791 do?', 'split Quebec into two colonies', ['joined two colonies into one', 'gave Quebec back to France', 'ended the fur trade', 'created New Brunswick'], {
        emoji: '✂️',
        why: 'One colony became two: Upper Canada and Lower Canada.',
      }),
      match('Match each colony to who mostly lived there:', [
        ['Upper Canada', 'English-speaking Loyalists'],
        ['Lower Canada', 'French-speaking Canadiens'],
      ], { why: 'Splitting them let each keep its own language and law.' }),
      choice('Why was the western colony called UPPER Canada?', 'it was further up the St. Lawrence', ['it was further north on the map', 'its land was higher than the east', 'it was the richer of the two', 'its people came from further north'], {
        emoji: '🌊',
        why: 'Upriver, closer to the river’s source. Upper Canada is today’s Ontario; Lower Canada is Quebec.',
      }),
    ]],
    ['today', {
      explain: [
        'Upper Canada is today’s southern Ontario.',
        'Lower Canada is today’s southern Quebec.',
        'Upper Canada’s first capital was Newark (Niagara-on-the-Lake), then York — today’s Toronto.',
      ],
      video: 'hist-a-1791-v2',
    }, [
      choice('Upper Canada is roughly which province today?', 'Ontario', ['Quebec', 'Manitoba', 'Nova Scotia', 'New Brunswick']),
      choice('York, the capital of Upper Canada, is today’s…', 'Toronto', ['Kingston', 'Ottawa', 'Montreal', 'Hamilton'], {
        emoji: '🏙️',
        why: 'York was renamed Toronto in 1834.',
      }),
      choice('Lower Canada is roughly which province today?', 'Quebec', ['Ontario', 'Nova Scotia', 'Newfoundland', 'Prince Edward Island']),
    ]],
    ['government', {
      explain: [
        'Each colony got an elected Legislative Assembly — a first for Quebec.',
        'But above it sat a governor and two councils that the governor appointed.',
        'The appointed councils could block anything the elected assembly passed.',
        'So the people voted, but the governor’s friends still decided. That causes trouble later.',
      ],
      video: 'hist-a-1791-v1',
    }, [
      choice('What NEW thing did each colony get in 1791?', 'an elected assembly', ['its own king', 'its own army', 'a French governor', 'its own money']),
      choice('The elected assembly passes a law. The appointed council says no. What happens?', 'the law is blocked', ['the law passes anyway', 'there is a new election', 'the king picks a side', 'the council is fired'], {
        emoji: '🛑',
        why: 'The appointed council had the final say. Elected did not mean in charge.',
      }),
      choice('Who chose the members of the councils?', 'the governor, for the Crown', ['the voters, at each election', 'the Catholic Church in Quebec', 'the fur companies in Montreal', 'the chiefs of the First Nations'], {
        why: 'Appointed, not elected — the seed of the Rebellions of 1837.',
      }),
    ]],
    ['law-land', {
      explain: [
        'Upper Canada used English law, and land was owned outright (freehold).',
        'Lower Canada kept French civil law and the seigneurial system.',
        'One seventh of the land was set aside for the Protestant clergy: the clergy reserves.',
      ],
      video: 'hist-a-1791-v2',
    }, [
      match('Match each colony to its law:', [
        ['Upper Canada', 'English law'],
        ['Lower Canada', 'French civil law'],
      ], { why: 'Each colony kept the law its people already knew.' }),
      choice('What were the clergy reserves?', 'land set aside for the Protestant clergy', ['churches built by the Catholic bishops', 'forts kept for the British army', 'farms given to Loyalist soldiers', 'land promised to the Black Loyalists'], {
        emoji: '⛪',
        why: 'One seventh of the land, often left empty — settlers grew to hate the gaps they made.',
      }),
      choice('A farmer in Upper Canada in 1795 owns his land outright. This is called…', 'freehold', ['seigneurial', 'a clergy reserve', 'a tithe', 'a corvée'], {
        why: 'Freehold: it is yours. In Lower Canada, habitants farmed land held by a seigneur.',
      }),
    ]],
    ['simcoe', {
      explain: [
        'John Graves Simcoe was the first Lieutenant Governor of Upper Canada.',
        'He chose York (Toronto) as the capital and started building roads like Yonge Street.',
        'In 1793 he pushed through a law to limit slavery in Upper Canada.',
      ],
      video: 'hist-a-1791-v1',
    }, [
      choice('Who was the first Lieutenant Governor of Upper Canada?', 'John Graves Simcoe', ['Guy Carleton', 'Lord Durham', 'William Lyon Mackenzie', 'Isaac Brock'], {
        emoji: '🎩',
        why: 'Simcoe Day, the August long weekend in Toronto, is named after him.',
      }),
      choice('Which famous Toronto street did Simcoe start?', 'Yonge Street', ['Bay Street', 'Queen Street', 'Bloor Street', 'King Street'], {
        emoji: '🛣️',
        why: 'Started in 1796 as a military road north from York.',
      }),
      choice('In 1793 Simcoe passed a law to limit what in Upper Canada?', 'slavery', ['the fur trade', 'the French language', 'beaver hunting', 'Catholic churches'], {
        why: 'The Act to Limit Slavery — the first law in the British Empire to limit slavery.',
      }),
    ]],
  ]),

  // --- ⛓️ Slavery and freedom in early Canada -----------------------------------
  chapter('hist-a-slave', [
    ['existed', {
      explain: [
        'Slavery was legal in New France and in British North America.',
        'Enslaved people here were Indigenous and Black.',
        'Some Loyalists brought enslaved people with them in the 1780s.',
        'This part of the story was left out of old textbooks.',
      ],
      video: 'hist-a-slave-v0',
    }, [
      choice('Was slavery ever legal in early Canada?', 'yes, in New France and British colonies', ['no, it was always against the law', 'only after Confederation in 1867', 'only for a few years in Nova Scotia', 'only in the Thirteen Colonies, not here'], {
        emoji: '⛓️',
        why: 'For about 200 years. It is a real part of Canada’s history.',
      }),
      choice('Who brought many enslaved people north in the 1780s?', 'some Loyalist families', ['Acadian farming families', 'Hudson’s Bay Company men', 'new Irish immigrants', 'the Catholic missions'], {
        why: 'Some Loyalists who came north brought the people they enslaved.',
      }),
      choice('In 1734 Marie-Joseph Angélique, an enslaved Black woman, was blamed for a fire that burned part of which city?', 'Montreal', ['Halifax', 'York', 'Kingston', 'Quebec City'], {
        why: 'She was tortured and executed. Her story is one of the best-recorded of slavery in New France.',
      }),
    ]],
    ['1793', {
      explain: [
        'In 1793, Chloe Cooley, an enslaved Black woman, was tied up and sold across the Niagara River to the U.S.',
        'She fought back. People saw it, and it pushed Simcoe to act.',
        'The Act to Limit Slavery (1793): no new enslaved people could be brought into Upper Canada.',
        'Children born to enslaved mothers would be freed at 25. But people already enslaved stayed enslaved.',
      ],
      video: 'hist-a-slave-v0',
    }, [
      choice('What did Upper Canada’s 1793 law do?', 'banned bringing in new enslaved people', ['freed every enslaved person at once', 'made slavery legal for the first time', 'banned all new settlers from the U.S.', 'freed the people the Loyalists brought'], {
        emoji: '⚖️',
        why: 'It LIMITED slavery. Nobody already enslaved was freed by it.',
      }),
      choice('Whose struggle pushed Upper Canada to pass the 1793 law?', 'Chloe Cooley', ['Harriet Tubman', 'Laura Secord', 'Mary Ann Shadd', 'Marie-Joseph Angélique'], {
        why: 'She was forced across the Niagara River and sold. Witnesses reported it.',
      }),
      choice('A girl is born in 1800 to an enslaved mother in Upper Canada. Under the 1793 law, when is she free?', 'at age 25', ['at birth', 'never', 'at age 5', 'when the war ends'], {
        why: 'Freed at 25 — a slow end, not an instant one.',
      }),
    ]],
    ['1834', {
      explain: [
        'Slavery ended across the whole British Empire on August 1, 1834.',
        'That included all of British North America.',
        'August 1 is now marked in Canada as Emancipation Day.',
      ],
      video: 'hist-a-slave-v1',
    }, [
      choice('When did slavery end across the British Empire, including Canada?', '1834', ['1793', '1867', '1763', '1812'], {
        emoji: '🗓️',
        why: '1793 only limited it in Upper Canada. 1834 ended it everywhere in the Empire.',
      }),
      choice('What is August 1 in Canada?', 'Emancipation Day', ['Canada Day', 'Simcoe Day only', 'Remembrance Day', 'Victoria Day'], {
        why: 'The day in 1834 that slavery ended in the British Empire.',
      }),
      order('Put these in order, earliest first:', ['Act to Limit Slavery in Upper Canada', 'slavery ends in the British Empire', 'U.S. Fugitive Slave Act sends more people north'], {
        emoji: '⏳',
        why: '1793 → 1834 → 1850.',
      }),
    ]],
    ['railroad', {
      explain: [
        'After 1834, Canada was free soil. Slavery was still legal in the southern U.S.',
        'The Underground Railroad was a secret network of routes and safe houses leading north.',
        'Up to 30,000 freedom seekers reached Canada, many after 1850.',
        'Harriet Tubman guided people to St. Catharines, Ontario.',
      ],
      video: 'hist-a-slave-v1',
      watchFor: 'Was the Underground Railroad a real railway?',
    }, [
      choice('What was the Underground Railroad?', 'a secret network of routes to freedom', ['a real steam train running underground', 'a railway company owned by Britain', 'a tunnel dug under the Detroit River', 'a canal from New York to Montreal'], {
        emoji: '🚂',
        why: 'Not a train at all — routes, guides and safe houses, using railway code words.',
      }),
      choice('Harriet Tubman guided freedom seekers to which Ontario town?', 'St. Catharines', ['Kingston', 'Ottawa', 'York', 'Sudbury']),
      choice('Why did so many freedom seekers head for Canada after 1850?', 'a U.S. law let them be caught in the North', ['Canada paid each of them to come north', 'the fur trade needed many more workers', 'Britain had declared war on the U.S.', 'gold had been found in Upper Canada'], {
        why: 'The Fugitive Slave Act of 1850 meant even northern U.S. states were not safe.',
      }),
    ]],
    ['communities', {
      explain: [
        'Black communities grew in Ontario: Dawn, near Dresden, and Elgin (Buxton).',
        'Josiah Henson escaped slavery and helped found the Dawn Settlement.',
        'Mary Ann Shadd started a newspaper, the Provincial Freeman, in 1853.',
        'Free did not mean equal: they still faced racism and segregated schools.',
      ],
      video: 'hist-a-slave-v0',
    }, [
      choice('Who started the Provincial Freeman newspaper in 1853?', 'Mary Ann Shadd', ['Harriet Tubman', 'Laura Secord', 'Chloe Cooley', 'Josiah Henson'], {
        emoji: '📰',
        why: 'She was the first Black woman in North America to publish a newspaper.',
      }),
      choice('Josiah Henson helped found which settlement for freedom seekers?', 'the Dawn Settlement', ['the town of Birchtown', 'the Grosse Île station', 'the fort of Louisbourg', 'the town of Newark']),
      choice('Freedom seekers reached Canada. Did they find full equality?', 'no — they still faced racism', ['yes — every school and job was open', 'yes — once they had paid a tax', 'only if they lived in Lower Canada', 'yes — they were made the leaders'], {
        why: 'Free from slavery, yes. But many schools and jobs were still closed to them.',
      }),
    ]],
  ]),
]
