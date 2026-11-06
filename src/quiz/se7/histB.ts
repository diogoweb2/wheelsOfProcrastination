// §14d — History, Strand B: Canada, 1800–1850: Conflict and Challenges.
// Written by hand in session. See ./build.ts for how an idea and its versions work.
import { chapter, choice, match, order } from './build'

export const HIST_B = [
  // --- 🏚️ Life in Upper and Lower Canada ----------------------------------------
  chapter('hist-b-life', [
    ['seigneur', {
      explain: [
        'In Lower Canada, land was split into long, narrow strips running back from the river.',
        'A seigneur held the land. The habitants farmed it and paid him rent.',
        'Every farm touched the water, because the river was the road.',
      ],
      video: 'hist-b-life-v0',
      watchFor: 'What shape were the farms along the river, and why?',
    }, [
      choice('What shape were farms in Lower Canada?', 'long, narrow strips from the river', ['perfect squares around a village', 'big circles around a church', 'small triangles along a road', 'wide fields high on the hills'], {
        emoji: '🌾',
        why: 'Long strips gave every family a piece of the river, the only real road.',
      }),
      choice('Why did every farm in Lower Canada touch the river?', 'the river was the main road', ['the king ordered all fishing', 'nobody could dig a water well', 'the soil was only wet there', 'the seigneur lived on a boat'], {
        why: 'There were few roads. Water carried people and goods.',
      }),
      match('Match each person to their role in Lower Canada:', [
        ['seigneur', 'held the land and collected rent'],
        ['habitant', 'farmed a strip and paid rent'],
        ['parish priest', 'led the local Catholic church'],
      ], { emoji: '⛪', why: 'Land, farm and parish: the three pillars of life in Lower Canada.' }),
    ]],
    ['clearing', {
      explain: [
        'In Upper Canada, a settler got a square lot of thick forest.',
        'First job: cut the trees and burn them. Stumps stayed in the field for years.',
        'First home: a one-room log cabin.',
        'Ashes from the burned trees could be sold as potash — often a family’s first cash.',
      ],
      video: 'hist-b-life-v0',
    }, [
      choice('What was the first big job for a settler in Upper Canada?', 'clearing the forest', ['digging a silver mine', 'building a stone church', 'planting an apple orchard', 'buying a flock of sheep'], {
        emoji: '🪓',
        why: 'No field existed until the trees were gone. A family might clear only a few acres a year.',
      }),
      choice('A settler burns the trees he cut. How can the ashes earn him money?', 'he sells them as potash', ['he paints his cabin with them', 'he feeds them to his cattle', 'he trades them for beaver hats', 'he pays his tax to the priest'], {
        why: 'Potash was used for soap and glass, and it was often the first thing a new farm could sell.',
      }),
      choice('What was a new settler’s first home usually like?', 'a one-room log cabin', ['a brick house with a cellar', 'a stone cottage with a loft', 'a canvas tent for ten years', 'a rented room above a shop'], {
        why: 'Fast to build from the trees he had just cut. A proper house came years later.',
      }),
    ]],
    ['bees', {
      explain: [
        'Some jobs were too big for one family.',
        'So neighbours held a “bee”: everyone came to raise a barn or clear a field.',
        'Then the hosts fed everyone, and they returned the favour later.',
      ],
      video: 'hist-b-life-v0',
    }, [
      choice('What was a “bee” in Upper Canada?', 'neighbours working together on one job', ['a tax paid to the local governor', 'a yearly hive-keeping competition', 'a school for the youngest children', 'a law about farm animals in town'], {
        emoji: '🐝',
        why: 'Barn-raising bees, logging bees, quilting bees. Many hands, one big job, one big meal.',
      }),
      choice('The whole crew turns up to fix the Going Merry in one day. Which pioneer habit is that?', 'a barn-raising bee', ['a seigneur’s rent day', 'a clergy reserve', 'a corduroy road', 'a potash sale'], {
        emoji: '🏴‍☠️',
        why: 'One crew, one big job, then a feast.',
      }),
      choice('Why did settlers hold bees?', 'some jobs were too big for one family', ['the governor ordered them every year', 'they wanted to avoid paying their tax', 'it was the only way to meet a priest', 'bees were needed to make the potash'], {
        why: 'You helped your neighbour’s barn go up, and they helped yours.',
      }),
    ]],
    ['roads', {
      explain: [
        'Early roads were terrible: mud in spring, dust in summer.',
        'A corduroy road was logs laid side by side over swampy ground. It was very bumpy.',
        'In winter, sleighs on the snow were the easiest way to move heavy loads.',
        'Clergy reserves made it worse, because empty lots left gaps nobody kept up.',
      ],
      video: 'hist-b-life-v2',
    }, [
      choice('What was a corduroy road?', 'logs laid side by side', ['a road paved with brick', 'a canal beside a river', 'a path of crushed shells', 'a toll road for horses'], {
        emoji: '🪵',
        why: 'It kept wagons out of the mud, and shook everyone’s teeth.',
      }),
      choice('When was it often easiest to haul heavy loads in Upper Canada?', 'in winter, by sleigh', ['in spring, by wagon', 'in autumn, by foot', 'at night, by donkey', 'in summer, by carriage'], {
        emoji: '🛷',
        why: 'Frozen snow beat spring mud. Roads got better when they froze.',
      }),
      choice('Why did the clergy reserves make travel harder?', 'empty lots left gaps in the roads', ['priests charged a toll on every road', 'churches blocked the river crossings', 'the reserves were all on steep hills', 'only clergy could use a horse there'], {
        why: 'Settlers built the road past their own lots. Nobody lived on a reserve to build its part.',
      }),
    ]],
    ['elites', {
      explain: [
        'A small group of friends ran each colony.',
        'In Upper Canada: the Family Compact — wealthy, Anglican, connected to the governor.',
        'In Lower Canada: the Château Clique — English merchants in a mostly French colony.',
        'They held the appointed councils, the best land and the top jobs.',
      ],
      video: 'hist-b-life-v1',
      watchFor: 'Who really held power in each colony?',
    }, [
      match('Match each group to its colony:', [
        ['Family Compact', 'Upper Canada'],
        ['Château Clique', 'Lower Canada'],
      ], { emoji: '🎩', why: 'Two colonies, two small groups of friends running them.' }),
      choice('What did the Family Compact and the Château Clique have in common?', 'a small group holding the power', ['both were elected by farmers', 'both spoke only French', 'both were led by First Nations', 'both wanted to join the U.S.'], {
        why: 'Appointed, wealthy and connected. Ordinary voters could not remove them.',
      }),
      choice('A farmer wants a road built, but the Family Compact gives the money to a friend. Why can he not vote them out?', 'they were appointed, not elected', ['he is not allowed to own land', 'they lived back in Britain', 'elections were held once a century', 'the seigneur voted in his place'], {
        why: 'This anger is the road to the Rebellions of 1837.',
      }),
    ]],
  ]),

  // --- 💥 The War of 1812 --------------------------------------------------------
  chapter('hist-b-1812', [
    ['causes', {
      explain: [
        'The United States declared war on Britain in June 1812.',
        'Britain was seizing American sailors for its navy and blocking American trade.',
        'Britain also backed First Nations who resisted American settlers.',
        'Some Americans believed Canada would be easy to take.',
      ],
      video: 'hist-b-1812-v1',
      watchFor: 'Why was the U.S. angry at Britain?',
    }, [
      choice('Who declared war in 1812?', 'the United States', ['Upper Canada', 'Lower Canada', 'the British Empire', 'the French Empire'], {
        emoji: '💥',
        why: 'The U.S. declared war on Britain. Canada was the part of Britain it could reach.',
      }),
      choice('Which was a cause of the War of 1812?', 'Britain seizing American sailors', ['France invading Upper Canada', 'a fight over the fur company', 'the Quebec Act’s new borders', 'the Irish famine ships arriving'], {
        why: 'It was called impressment: taking sailors off American ships for the Royal Navy.',
      }),
      choice('Why did the U.S. attack Canada when its quarrel was with Britain?', 'Canada was the British land it could reach', ['Canada had declared war first of all', 'Canada owed the U.S. a lot of money', 'France had asked the Americans to', 'Canada had burned Washington already'], {
        why: 'Britain was across the ocean. Its colonies were right next door.',
      }),
    ]],
    ['brock', {
      explain: [
        'General Isaac Brock led the defence of Upper Canada.',
        'With the Shawnee leader Tecumseh, he captured Detroit in August 1812.',
        'Brock was killed at Queenston Heights in October 1812, but the British still won.',
        'Tecumseh was killed at the Battle of the Thames, in 1813.',
      ],
      video: 'hist-b-1812-v2',
    }, [
      choice('Who captured Detroit together in 1812?', 'Brock and Tecumseh', ['Wolfe and Montcalm', 'Simcoe and Brant', 'Papineau and Mackenzie', 'Baldwin and LaFontaine'], {
        emoji: '🤝',
        why: 'A British general and a Shawnee leader. Detroit fell without a real battle.',
      }),
      choice('Where was General Brock killed?', 'Queenston Heights', ['the Plains of Abraham', 'Lundy’s Lane', 'Montgomery’s Tavern', 'Crysler’s Farm'], {
        why: 'October 1812, near Niagara. The British won anyway.',
      }),
      choice('Tecumseh was a leader of which nation?', 'the Shawnee', ['the Mohawk', 'the Odawa', 'the Cree', 'the Mi’kmaq'], {
        why: 'He tried to unite nations to stop American settlers. He was killed in 1813.',
      }),
    ]],
    ['secord', {
      explain: [
        'In 1813, Laura Secord overheard American officers planning an attack.',
        'She walked about 30 km through dangerous country to warn the British.',
        'Mohawk and other First Nations warriors then won the Battle of Beaver Dams.',
        'In Lower Canada, Charles de Salaberry and French-Canadian troops won at Châteauguay.',
      ],
      video: 'hist-b-1812-v2',
    }, [
      choice('Why is Laura Secord famous?', 'she walked 30 km to warn the British', ['she led an army into Detroit', 'she sewed the first Canadian flag', 'she started a newspaper in York', 'she guided people to St. Catharines'], {
        emoji: '🚶‍♀️',
        why: 'Her warning helped set up the win at Beaver Dams.',
      }),
      choice('Who did most of the fighting at the Battle of Beaver Dams?', 'First Nations warriors', ['French Canadian farmers', 'American volunteers', 'British sailors', 'Scottish Highlanders'], {
        why: 'Mohawk and other warriors won it. Secord’s warning is often told without them.',
      }),
      choice('Who led the French-Canadian troops to victory at Châteauguay?', 'Charles de Salaberry', ['Louis-Joseph Papineau', 'Louis LaFontaine', 'Guy Carleton', 'Marquis de Montcalm'], {
        emoji: '⚔️',
        why: 'French Canadians fought to defend the colony, which helped save Montreal.',
      }),
    ]],
    ['burning', {
      explain: [
        'In April 1813, Americans captured York (Toronto) and burned its parliament buildings.',
        'In August 1814, British troops captured Washington and burned the White House.',
        'One burning answered the other.',
      ],
      video: 'hist-b-1812-v1',
    }, [
      choice('What happened to York (Toronto) in 1813?', 'Americans burned its parliament', ['the British gave it to the U.S.', 'a great flood destroyed it', 'it was renamed Washington', 'it became the capital of Canada'], {
        emoji: '🔥',
        why: 'American troops held the town for days and burned the government buildings.',
      }),
      choice('What did British troops burn in 1814?', 'the White House', ['the Halifax Citadel', 'the fort at Niagara', 'the town of Boston', 'Fort York’s walls'], {
        why: 'They took Washington in August 1814. It was partly payback for York.',
      }),
      order('Put these in order, earliest first:', ['Brock captures Detroit', 'Americans burn York', 'British burn Washington', 'Treaty of Ghent is signed'], {
        emoji: '⏳',
        why: 'August 1812 → April 1813 → August 1814 → December 1814.',
      }),
    ]],
    ['who-won', {
      explain: [
        'The Treaty of Ghent was signed in December 1814.',
        'No land changed hands. Everything went back to how it was before.',
        'Canada stayed British, and the U.S. stayed independent. Both claim they won.',
        'First Nations lost most: Britain stopped backing them, and their hope for their own territory ended.',
      ],
      video: 'hist-b-1812-v2',
      watchFor: 'Who really lost the War of 1812?',
    }, [
      choice('What did the Treaty of Ghent change on the map?', 'nothing — borders stayed the same', ['Canada lost Upper Canada to the U.S.', 'the U.S. gave Detroit to Britain', 'First Nations got a new country', 'Britain gave Maine to Canada'], {
        emoji: '📜',
        why: 'Everything went back to how it was before the war.',
      }),
      choice('Which group lost the most from the War of 1812?', 'First Nations', ['the Canadiens', 'the Americans', 'the British', 'the Loyalists'], {
        why: 'Their allies made peace, and American settlers kept pushing west.',
      }),
      choice('“Who won the War of 1812?” Why is that a trick question?', 'both sides claim they won', ['nobody remembers what happened', 'the war never really happened', 'France won it in the end', 'it is still going on today'], {
        emoji: '🤔',
        why: 'Canada was not conquered, and the U.S. was not defeated. Same result, two stories.',
      }),
    ]],
  ]),

  // --- 🚢 Immigration, 1815–1850 --------------------------------------------------
  chapter('hist-b-immig', [
    ['push-pull', {
      explain: [
        'After the wars with Napoleon ended in 1815, Britain had too few jobs.',
        'That is a PUSH: something that drives you out of your home.',
        'Canada offered cheap land and work. That is a PULL: something that draws you in.',
        'Hundreds of thousands crossed the Atlantic, mostly from Britain and Ireland.',
      ],
      video: 'hist-b-immig-v1',
      watchFor: 'Listen for what pushed people out and what pulled them in.',
    }, [
      match('Is it a push or a pull? Match each one:', [
        ['no jobs at home', 'push factor'],
        ['cheap land in Canada', 'pull factor'],
      ], { emoji: '🧲', why: 'Push drives you out. Pull draws you in.' }),
      choice('Which is a PULL factor for Canada?', 'cheap land to farm', ['high rents at home', 'a failed potato crop', 'no work in the city', 'being evicted by a landlord'], {
        why: 'The others push people out of Britain and Ireland. Only land pulls them in.',
      }),
      choice('Where did most immigrants to Canada come from between 1815 and 1850?', 'Britain and Ireland', ['France and Spain', 'China and Japan', 'Italy and Greece', 'Russia and Poland'], {
        emoji: '🚢',
        why: 'It is often called the Great Migration.',
      }),
    ]],
    ['famine', {
      explain: [
        'In 1845, a disease wiped out the potato crop in Ireland.',
        'Potatoes were what poor Irish families lived on. About a million people died.',
        '1847 was the worst year, called Black ’47.',
        'Many Irish fled to Canada with nothing.',
      ],
      video: 'hist-b-immig-v0',
    }, [
      choice('What drove huge numbers of Irish to Canada in the 1840s?', 'the potato famine', ['the War of 1812', 'a gold rush', 'the Quebec Act', 'free schools'], {
        emoji: '🥔',
        why: 'A crop disease destroyed the food poor families depended on.',
      }),
      choice('Which year was the worst for Irish famine ships?', '1847', ['1812', '1867', '1837', '1791'], {
        why: 'Black ’47. Toronto, with about 20,000 people, received about 38,000 Irish that year.',
      }),
      choice('Why did a failed potato crop become a disaster in Ireland?', 'poor families lived on potatoes', ['potatoes were used to make money', 'the king ate all of the potatoes', 'potatoes were the main export', 'rain ruined every other crop too'], {
        why: 'For the poorest families there was almost nothing else to eat.',
      }),
    ]],
    ['ships', {
      explain: [
        'Timber ships sailed to Britain full of wood. Coming back they were nearly empty.',
        'So shipowners packed in immigrants, cheaply and dangerously.',
        'People were crowded below deck for weeks, with bad food and water.',
        'So many died that they were called coffin ships.',
      ],
      video: 'hist-b-immig-v0',
    }, [
      choice('Why were they called “coffin ships”?', 'so many passengers died on board', ['they were shaped like long boxes', 'they carried coffins to Canada', 'they were painted black all over', 'they sank on their first voyage'], {
        emoji: '⚰️',
        why: 'Crowding, hunger and typhus killed thousands on the crossing.',
      }),
      choice('Why were passage fares on timber ships so cheap?', 'they sailed back nearly empty', ['the king paid for every ticket', 'they were the fastest ships afloat', 'the Irish owned most of the ships', 'passengers had to row the whole way'], {
        why: 'A shipowner would rather carry people than nothing. Conditions were an afterthought.',
      }),
      choice('Which disease spread on the crowded famine ships?', 'typhus', ['chickenpox', 'malaria', 'measles', 'polio'], {
        why: 'It was called ship fever. Lice spread it in the crowded holds.',
      }),
    ]],
    ['grosse-ile', {
      explain: [
        'Ships stopped at Grosse Île, an island in the St. Lawrence near Quebec City.',
        'It was a quarantine station: the sick were held there to stop disease reaching the cities.',
        'In 1847 thousands died there. Doctors, nurses and priests died caring for them.',
        'In Toronto, Bishop Michael Power died of typhus after helping the sick.',
      ],
      video: 'hist-b-immig-v0',
    }, [
      choice('What was Grosse Île?', 'a quarantine island in the St. Lawrence', ['a fort on Lake Ontario in Upper Canada', 'a trading post on the shore of Hudson Bay', 'a Loyalist town on the Saint John River', 'a Black settlement in southern Ontario'], {
        emoji: '🏝️',
        why: 'Ships stopped there so disease would not reach Quebec City and Montreal.',
      }),
      choice('What does “quarantine” mean?', 'keeping the sick apart so disease stops', ['paying a tax when you enter the colony', 'giving every newcomer a free piece of land', 'sending people back to their country', 'teaching newcomers the local language'], {
        why: 'Keep the sick separate, and the disease cannot spread to the cities.',
      }),
      choice('In 1847, Toronto had about 20,000 people. How many Irish arrived that year?', 'about 38,000', ['about 400', 'about 2,000', 'about 500,000', 'about 5,000'], {
        emoji: '🏙️',
        why: 'Almost twice the city. Fever sheds went up on King Street.',
      }),
    ]],
    ['effects', {
      explain: [
        'Immigrants dug the Rideau Canal, cleared farms and filled new towns.',
        'Upper Canada’s English-speaking population grew very fast.',
        'That growth took more land from First Nations.',
        'New arrivals also wanted a say in government, which fed the reform movement.',
      ],
      video: 'hist-b-immig-v2',
    }, [
      choice('Who paid the highest price as settlers poured into Upper Canada?', 'First Nations, who lost land', ['the Family Compact, who lost jobs', 'French seigneurs, who lost rent', 'American traders, who lost furs', 'British soldiers, who lost pay'], {
        emoji: '🗺️',
        why: 'Each wave of settlers meant more treaties and less land for First Nations.',
      }),
      choice('Which big project did many immigrants help build between 1826 and 1832?', 'the Rideau Canal', ['the CN Tower', 'the Trans-Canada Highway', 'the St. Lawrence Seaway', 'the Canadian Pacific Railway'], {
        why: 'Irish and French-Canadian labourers dug it. Many died of disease.',
      }),
      choice('How did immigration change Upper Canada?', 'its English-speaking population boomed', ['most of its people became French', 'its population shrank by half', 'all of its towns moved to the east', 'it stopped growing food for itself'], {
        why: 'By about 1850, Upper Canada had passed Lower Canada in population.',
      }),
    ]],
  ]),

  // --- 🔥 The Rebellions of 1837–38 -----------------------------------------------
  chapter('hist-b-reb', [
    ['why', {
      explain: [
        'People elected assemblies, but appointed councils could overrule them.',
        'A small elite controlled the jobs and the land.',
        'In 1837, a bad harvest and an economic crisis made things worse.',
        'Britain then let Lower Canada’s governor spend money without the assembly’s approval.',
      ],
      video: 'hist-b-reb-v1',
      watchFor: 'What did the rebels want to change?',
    }, [
      choice('What was the main complaint behind the 1837 rebellions?', 'elected assemblies had too little power', ['the fur trade had moved to the west', 'taxes on tea had just been doubled', 'the U.S. had invaded Upper Canada', 'French had become the only language'], {
        emoji: '🗳️',
        why: 'People voted, but appointed councils still ran everything.',
      }),
      choice('Which event made things worse in 1837?', 'bad harvests and an economic crisis', ['the fall of Quebec City to Wolfe', 'a new war with France in Europe', 'the opening of the Rideau Canal', 'the arrival of the Loyalists'], {
        why: 'Hungry and in debt, people were more ready to take up arms.',
      }),
      choice('You score the winning goal, but the coach’s friends can cancel it. Which 1837 problem is that?', 'appointed councils could overrule voters', ['seigneurs could charge farmers rent', 'immigrants were held in quarantine', 'clergy reserves left gaps in the road', 'Upper Canada was upriver of Lower'], {
        emoji: '⚽',
        why: 'The vote counted until the governor’s friends said it did not.',
      }),
    ]],
    ['upper', {
      explain: [
        'In Upper Canada, William Lyon Mackenzie led the rebels against the Family Compact.',
        'He was a newspaper editor and the first mayor of Toronto.',
        'In December 1837, his rebels gathered at Montgomery’s Tavern on Yonge Street.',
        'They were scattered in under an hour. Mackenzie fled to the U.S.',
      ],
      video: 'hist-b-reb-v2',
    }, [
      choice('Who led the rebellion in Upper Canada?', 'William Lyon Mackenzie', ['Louis-Joseph Papineau', 'John Graves Simcoe', 'Charles de Salaberry', 'Robert Baldwin'], {
        emoji: '📰',
        why: 'A fiery newspaper editor and Toronto’s first mayor.',
      }),
      choice('Where did Upper Canada’s rebels gather in December 1837?', 'Montgomery’s Tavern', ['the Plains of Abraham', 'Queenston Heights', 'Saint-Eustache', 'Fort Detroit'], {
        emoji: '🍺',
        why: 'It stood on Yonge Street, north of Toronto.',
      }),
      choice('What happened to Mackenzie after the rebels lost?', 'he fled to the United States', ['he became the new governor', 'he was hanged in Toronto', 'he sailed home to Scotland', 'he joined the Family Compact'], {
        why: 'Two of his followers, Samuel Lount and Peter Matthews, were hanged instead.',
      }),
    ]],
    ['lower', {
      explain: [
        'In Lower Canada, Louis-Joseph Papineau led the Patriotes against the Château Clique.',
        'The assembly’s demands were set out in the Ninety-Two Resolutions, in 1834.',
        'The Patriotes won at Saint-Denis, then lost at Saint-Charles and Saint-Eustache.',
        'A second uprising in 1838 failed too. Twelve Patriotes were hanged.',
      ],
      video: 'hist-b-reb-v1',
    }, [
      choice('Who led the Patriotes in Lower Canada?', 'Louis-Joseph Papineau', ['William Lyon Mackenzie', 'Louis LaFontaine', 'Guy Carleton', 'Joseph Howe'], {
        emoji: '🔥',
        why: 'A famous speaker and leader of the assembly.',
      }),
      match('Match each leader to who they fought:', [
        ['Mackenzie', 'the Family Compact'],
        ['Papineau', 'the Château Clique'],
      ], { why: 'Two colonies, two rebel leaders, two ruling groups.' }),
      choice('Where did the Patriotes win their one big battle in 1837?', 'Saint-Denis', ['Saint-Eustache', 'Saint-Charles', 'Queenston', 'York'], {
        why: 'November 1837. They lost Saint-Charles days later, and Saint-Eustache in December.',
      }),
    ]],
    ['compare', {
      explain: [
        'Both rebellions wanted the elected assembly to have real power.',
        'In Lower Canada, the fight was also about language and identity: French against English.',
        'The Lower Canada rising was bigger and bloodier.',
        'Both were crushed by British troops within weeks.',
      ],
      video: 'hist-b-reb-v0',
    }, [
      choice('What did both rebellions want?', 'real power for elected assemblies', ['to give Canada back to France', 'to join the United States at once', 'to bring back the seigneurial law', 'to end the Catholic faith in Canada'], {
        emoji: '🗳️',
        why: 'Same goal, two colonies. Lower Canada added the fight over French rights.',
      }),
      choice('What did Lower Canada’s rebellion add that Upper Canada’s did not?', 'a fight over French rights', ['a fight over beaver hats', 'a fight over American tea', 'a fight over Irish ships', 'a fight over slavery laws'], {
        why: 'French-speaking Patriotes felt ruled by an English minority.',
      }),
      choice('Which rebellion was bigger and bloodier?', 'Lower Canada’s', ['Upper Canada’s', 'Nova Scotia’s', 'Newfoundland’s', 'New Brunswick’s'], {
        why: 'Upper Canada’s rising was over in under an hour. Lower Canada’s was weeks of battles.',
      }),
    ]],
    ['result', {
      explain: [
        'The rebels were beaten in 1837, and again in 1838.',
        'But Britain got a shock and sent Lord Durham to find out what went wrong.',
        'His report led to the Act of Union and, in time, responsible government.',
        'So they lost the fight but moved the goal.',
      ],
      video: 'hist-b-reb-v0',
      watchFor: 'If the rebels lost, why do the rebellions still matter?',
    }, [
      choice('The rebels lost. Why do the rebellions still matter?', 'they forced Britain to rethink its rule', ['they won Canada its independence', 'they ended the War of 1812 for good', 'they created Upper and Lower Canada', 'they drove all the British troops out'], {
        emoji: '💡',
        why: 'Britain sent Lord Durham, and change followed.',
      }),
      order('Put these in order, earliest first:', ['Rebellions break out', 'Lord Durham writes his report', 'Act of Union', 'Responsible government'], {
        emoji: '⏳',
        why: '1837 → 1839 → 1840 → 1848.',
      }),
      choice('Who did Britain send after the rebellions to find out what went wrong?', 'Lord Durham', ['Lord Elgin', 'General Brock', 'John Simcoe', 'Guy Carleton'], {
        why: 'He arrived in 1838 and reported in 1839.',
      }),
    ]],
  ]),

  // --- 📝 Lord Durham's Report ----------------------------------------------------
  chapter('hist-b-durham', [
    ['who', {
      explain: [
        'Lord Durham was a British politician, nicknamed “Radical Jack”.',
        'Britain sent him in 1838, after the rebellions.',
        'He stayed only about five months, then wrote his report in 1839.',
      ],
      video: 'hist-b-durham-v1',
      watchFor: 'Why did Britain send Durham to Canada?',
    }, [
      choice('Why did Britain send Lord Durham to Canada?', 'to find out why the rebellions happened', ['to lead the army against the Americans', 'to sign a peace treaty with France', 'to open up the Hudson’s Bay forts', 'to choose Canada’s new capital city'], {
        emoji: '🔎',
        why: 'Two colonies had just risen in arms. Britain wanted to know why.',
      }),
      choice('What was Lord Durham’s nickname?', 'Radical Jack', ['Iron Duke', 'Old Hickory', 'Bloody Mary', 'Mad King George'], {
        why: 'He was known at home for backing reform.',
      }),
      choice('In what year was the Durham Report published?', '1839', ['1812', '1867', '1791', '1848']),
    ]],
    ['two-nations', {
      explain: [
        'Durham wrote that he found “two nations warring in the bosom of a single state”.',
        'He meant French and English in Lower Canada.',
        'He saw the fight as being about race and language, more than about government.',
      ],
      video: 'hist-b-durham-v1',
    }, [
      choice('Durham’s “two nations warring” were…', 'French and English', ['Canada and the U.S.', 'Mohawk and Wendat', 'Irish and Scottish', 'Upper and Lower'], {
        emoji: '⚔️',
        why: 'He meant the French and the English in Lower Canada.',
      }),
      choice('Which famous line is from the Durham Report?', '“two nations warring in the bosom of a single state”', ['“a few acres of snow, for the king to keep or lose”', '“peace, order and good government for all of us”', '“we shall fight on the beaches and on the shores”', '“a nation from sea to sea, and from river to ocean”'], {
        why: 'It is the most quoted sentence in the report.',
      }),
      choice('According to Durham, the deepest problem in Lower Canada was…', 'French against English', ['beavers running out', 'too few roads to travel', 'long and cold winters', 'a run of poor harvests'], {
        why: 'He thought language and culture were the real war.',
      }),
    ]],
    ['recommended', {
      explain: [
        'Durham gave two main recommendations.',
        'One: unite Upper and Lower Canada into one colony.',
        'Two: give it responsible government, so the elected assembly really decided.',
        'Britain took the first and refused the second, for now.',
      ],
      video: 'hist-b-durham-v1',
      watchFor: 'What were his two big ideas?',
    }, [
      choice('What were Durham’s two main recommendations?', 'unite the Canadas; responsible government', ['split the Canadas; a stronger governor', 'return to France; an elected French king', 'end the councils; join the United States', 'free the rebels; hold an election each year'], {
        emoji: '📝',
        why: 'One colony, and a government answerable to the people’s assembly.',
      }),
      choice('Which of Durham’s ideas did Britain accept right away?', 'uniting the two colonies', ['responsible government', 'independence for Canada', 'French as the only language', 'a new war with the U.S.'], {
        why: 'Union came in 1840. Responsible government had to wait until 1848.',
      }),
      choice('Britain refused responsible government at first. How long did Canada wait?', 'about nine years', ['about one year', 'about fifty years', 'about a hundred years', 'it never came at all'], {
        why: 'From 1839 to 1848.',
      }),
    ]],
    ['assimilate', {
      explain: [
        'Durham wanted the French Canadians to become English.',
        'In a united colony, he expected the English-speaking people to outvote them.',
        'He called them “a people with no history and no literature”.',
        'French Canadians were insulted. Their language and culture survived.',
      ],
      video: 'hist-b-durham-v2',
    }, [
      choice('What did Durham hope would happen to French Canadians?', 'they would become English', ['they would all return to France', 'they would rule the whole colony', 'they would get their own country', 'they would join the United States'], {
        emoji: '🗣️',
        why: 'That is called assimilation. Union was meant to outnumber them.',
      }),
      choice('What does “assimilation” mean here?', 'making a people give up their culture', ['making two colonies share one budget', 'giving voters more say in government', 'moving people away to new farmland', 'teaching settlers about the fur trade'], {
        why: 'The goal: French Canadians would stop being French.',
      }),
      choice('How did French Canadians react to the report?', 'they were deeply insulted', ['they thanked him for it', 'they all learned English', 'they elected him as leader', 'they never read any of it'], {
        why: '“No history and no literature” — they set out to prove him wrong.',
      }),
    ]],
    ['bermuda', {
      explain: [
        'Durham sent eight rebel leaders to Bermuda without a trial.',
        'Britain said he had no power to do that and cancelled his order.',
        'Durham resigned and sailed home after about five months.',
        'He finished the report in England and died in 1840.',
      ],
      video: 'hist-b-durham-v2',
    }, [
      choice('Why did Lord Durham leave Canada so soon?', 'Britain overruled him and he resigned', ['he was badly hurt in a duel in Quebec', 'he was captured by the Patriotes', 'he had been elected in Upper Canada', 'the winter had made him want to go'], {
        emoji: '⛵',
        why: 'He had exiled rebels with no trial. London cancelled it, and he quit.',
      }),
      choice('Where did Durham send eight rebel leaders?', 'Bermuda', ['Australia', 'Ireland', 'Sierra Leone', 'Louisiana'], {
        why: 'Without a trial, which is exactly what got him in trouble.',
      }),
      choice('About how long was Durham in Canada?', 'about five months', ['about ten years', 'about one week', 'about two years', 'about twenty years'], {
        why: 'Five months, and he still wrote one of the most important reports in Canadian history.',
      }),
    ]],
  ]),

  // --- 🔗 The Act of Union, 1840 --------------------------------------------------
  chapter('hist-b-union', [
    ['joined', {
      explain: [
        'The Act of Union was passed in 1840 and took effect in 1841.',
        'It joined Upper and Lower Canada into one colony: the Province of Canada.',
        'Upper Canada became Canada West. Lower Canada became Canada East.',
      ],
      video: 'hist-b-union-v1',
      watchFor: 'What were the two halves called after the union?',
    }, [
      choice('What did the Act of Union create?', 'the Province of Canada', ['the Dominion of Canada', 'the Province of Quebec', 'Upper Canada', 'New Brunswick'], {
        emoji: '🔗',
        why: 'One colony, two halves. The Dominion comes later, in 1867.',
      }),
      match('Match the old names to the new ones:', [
        ['Upper Canada', 'Canada West'],
        ['Lower Canada', 'Canada East'],
      ], { why: 'Same land, new names.' }),
      choice('The 1791 Act cut one colony in two. What did the 1840 Act do?', 'glued the two back into one', ['cut them into four new parts', 'gave one of them to the U.S.', 'gave them both to First Nations', 'left things just as they were'], {
        emoji: '✂️',
        why: 'Split in 1791, joined in 1840.',
      }),
    ]],
    ['seats', {
      explain: [
        'Canada East had more people than Canada West.',
        'But each half got the same number of seats: 42.',
        'That was on purpose: to keep the French-speaking majority from controlling the assembly.',
      ],
      video: 'hist-b-union-v0',
      watchFor: 'Listen for how many seats each half got. Was that fair?',
    }, [
      choice('How were seats in the assembly shared in 1841?', 'equally between East and West', ['by how many people lived in each', 'all of them went to Canada West', 'two seats for each one in the East', 'the governor chose them every year'], {
        emoji: '🪑',
        why: '42 each, even though Canada East had more people.',
      }),
      choice('Why were seats split equally when Canada East had more people?', 'to limit French-speaking power', ['to save money on the building', 'because the West had more farms', 'to reward the Loyalist families', 'because France had demanded it'], {
        why: 'Equal seats meant the French majority could be outvoted.',
      }),
      choice('Blue Lock: one team has 15 players, the other 10, but each gets the same number of votes. Who loses out?', 'the team with 15 players', ['the team with 10 players', 'both teams lose out equally', 'neither of the teams at all', 'the referee of the match'], {
        emoji: '⚽',
        why: 'More people, same votes. That was Canada East in 1841.',
      }),
    ]],
    ['language', {
      explain: [
        'The Act of Union made English the only language of the assembly’s records.',
        'French was banned from official records.',
        'French-speaking politicians fought it, and the ban was lifted in 1848.',
      ],
      video: 'hist-b-union-v0',
    }, [
      choice('What did the Act of Union do to the French language?', 'banned it from official records', ['made it the only official language', 'taught it in all Upper Canada schools', 'put it on all the new coins', 'nothing — it kept its place'], {
        emoji: '🚫',
        why: 'English only — just what Durham wanted.',
      }),
      choice('When was the ban on French in the assembly lifted?', '1848', ['1841', '1867', '1982', '1814'], {
        why: 'The same year responsible government arrived.',
      }),
      choice('Which report inspired the union’s anti-French rules?', 'the Durham Report', ['the Quebec Act', 'the Royal Proclamation', 'the Ninety-Two Resolutions', 'the Treaty of Ghent'], {
        why: 'Durham wanted French Canadians to become English.',
      }),
    ]],
    ['debt', {
      explain: [
        'Upper Canada had a huge debt, mostly from building canals.',
        'Lower Canada had very little debt.',
        'The Act of Union joined them, so Lower Canada helped pay Upper Canada’s bills.',
      ],
      video: 'hist-b-union-v0',
    }, [
      choice('Whose debt was much larger before the union?', 'Upper Canada’s', ['Lower Canada’s', 'Britain’s', 'Nova Scotia’s', 'New France’s'], {
        emoji: '💸',
        why: 'Canals were expensive. Upper Canada was nearly broke.',
      }),
      choice('Why was Upper Canada so deep in debt?', 'it had borrowed to build canals', ['it had lost the War of 1812', 'it had bought land from France', 'it had paid for Durham’s report', 'it had to pay for Grosse Île'], {
        why: 'The Welland Canal alone cost a fortune.',
      }),
      choice('Your friend has a huge credit card bill, and you have none. You merge your bank accounts. Which 1841 deal is that?', 'Lower Canada sharing Upper’s debt', ['Britain paying off the fur trade', 'the U.S. returning Detroit’s forts', 'France buying the sugar islands', 'Durham resigning from his post'], {
        emoji: '💳',
        why: 'That is why French Canadians saw the union as unfair.',
      }),
    ]],
    ['capital', {
      explain: [
        'The new province first met in Kingston, in 1841.',
        'Then the capital moved to Montreal, then back and forth between Toronto and Quebec City.',
        'Queen Victoria chose Ottawa in 1857, partly because it sat on the border of East and West.',
      ],
      video: 'hist-b-union-v1',
    }, [
      choice('What was the first capital of the Province of Canada?', 'Kingston', ['Ottawa', 'Halifax', 'Hamilton', 'Winnipeg'], {
        emoji: '🏛️',
        why: 'It met there from 1841 to 1844.',
      }),
      choice('Who chose Ottawa as the capital, in 1857?', 'Queen Victoria', ['Lord Durham', 'John A. Macdonald', 'Lord Elgin', 'Joseph Howe'], {
        emoji: '👑',
        why: 'The arguments between cities were so bad that the Queen was asked to pick.',
      }),
      choice('Why was Ottawa a good choice for a capital?', 'it sat on the line between East and West', ['it was the biggest city in the colony', 'it was close to the Atlantic Ocean', 'it was the home of Lord Durham', 'it was the oldest town in Canada'], {
        why: 'Neither half could say the other had won.',
      }),
    ]],
  ]),

  // --- 🗳️ Responsible government, 1848 --------------------------------------------
  chapter('hist-b-resp', [
    ['meaning', {
      explain: [
        'Responsible government means the people running things answer to the elected assembly.',
        'The cabinet must keep the assembly’s support, or it has to resign.',
        'The governor signs what they decide, even if he disagrees.',
      ],
      video: 'hist-b-resp-v2',
      watchFor: 'If ministers lose the assembly’s support, what must they do?',
    }, [
      choice('What does responsible government mean?', 'ministers must answer to the elected assembly', ['the governor picks whoever he likes to rule', 'the king writes all of the colony’s laws', 'voters decide every single law themselves', 'the army runs the colony in hard times'], {
        emoji: '🗳️',
        why: 'The people elect the assembly, and the assembly can remove the government.',
      }),
      choice('The cabinet loses a big vote in the assembly. Under responsible government, it must…', 'resign', ['fire the voters', 'call the army', 'ask the king', 'ignore the vote'], {
        emoji: '🚪',
        why: 'No support in the assembly means no right to govern.',
      }),
      choice('The captain loses the crew’s trust, so the crew picks a new one. Which idea is this?', 'responsible government', ['the seigneurial system', 'the clergy reserves', 'the Royal Proclamation', 'the Family Compact'], {
        emoji: '🏴‍☠️',
        why: 'Pirates did it first. You lead only while the crew backs you.',
      }),
    ]],
    ['before-after', {
      explain: [
        'Before 1848, the governor chose his advisers and could ignore the assembly.',
        'After 1848, the governor had to accept advisers the assembly supported.',
        'Power moved from an appointed few to people the voters elected.',
      ],
      video: 'hist-b-resp-v1',
    }, [
      match('Who had the final say?', [
        ['before 1848', 'the governor and his friends'],
        ['after 1848', 'ministers backed by the assembly'],
      ], { emoji: '⚖️', why: 'That one change is the whole story of 1837 to 1848.' }),
      choice('What changed for the governor in 1848?', 'he had to follow the assembly’s ministers', ['he got to pick all the new ministers', 'he was elected by the people for life', 'he took charge of the Canadian army', 'he had to move away to Great Britain'], {
        why: 'He kept the title. The power moved.',
      }),
      choice('Which goal of the 1837 rebels was finally reached in 1848?', 'real power for the elected assembly', ['full independence from Great Britain', 'joining the United States of America', 'the end of the French language', 'a return to the seigneurial system'], {
        why: 'Eleven years late, and without a battle.',
      }),
    ]],
    ['baldwin', {
      explain: [
        'Robert Baldwin led reformers from Canada West. Louis-Hippolyte LaFontaine led reformers from Canada East.',
        'They worked together across the language divide.',
        'In 1848, Governor Lord Elgin asked them to form the government.',
      ],
      video: 'hist-b-resp-v1',
    }, [
      choice('Which two reformers led the first responsible government in Canada?', 'Baldwin and LaFontaine', ['Mackenzie and Papineau', 'Brock and Tecumseh', 'Durham and Elgin', 'Wolfe and Montcalm'], {
        emoji: '🤝',
        why: 'An English speaker and a French speaker, working as partners.',
      }),
      choice('Why does the Baldwin–LaFontaine team matter so much?', 'French and English worked as partners', ['they won a great war against France', 'they both came from the same family', 'they ended the fur trade in Canada', 'they both grew up in Great Britain'], {
        why: 'Durham had said the two could never work together. They proved him wrong.',
      }),
      choice('Which governor accepted responsible government in 1848?', 'Lord Elgin', ['Lord Durham', 'Guy Carleton', 'John Simcoe', 'Isaac Brock'], {
        why: 'He let the elected ministers govern, as Britain now told him to.',
      }),
    ]],
    ['nova-scotia', {
      explain: [
        'Nova Scotia got responsible government first, early in 1848.',
        'Joseph Howe, a newspaper editor, led the fight there, with no rebellion at all.',
        'The Province of Canada followed in March 1848.',
      ],
      video: 'hist-b-resp-v2',
    }, [
      choice('Which colony got responsible government first?', 'Nova Scotia', ['Quebec', 'Upper Canada', 'Newfoundland', 'Manitoba'], {
        emoji: '🥇',
        why: 'The first in the British Empire outside Britain, weeks ahead of the Province of Canada.',
      }),
      choice('Who led the fight for responsible government in Nova Scotia?', 'Joseph Howe', ['Robert Baldwin', 'Mary Ann Shadd', 'George Brown', 'Louis Riel'], {
        why: 'He used his newspaper and his speeches, not guns.',
      }),
      choice('How did Nova Scotia win responsible government?', 'peacefully, by debate and elections', ['by a rebellion at Montgomery’s Tavern', 'by joining up with the United States', 'by a war against the British navy', 'by a great uprising of the Acadians'], {
        why: 'No shots were fired.',
      }),
    ]],
    ['test-1849', {
      explain: [
        'In 1849, the assembly passed the Rebellion Losses Bill.',
        'It paid people in Canada East who lost property in 1837–38.',
        'Tories were furious, but Lord Elgin signed it anyway. That was the real test.',
        'A mob burned the Parliament building in Montreal.',
      ],
      video: 'hist-b-resp-v2',
    }, [
      choice('Why did Lord Elgin sign the Rebellion Losses Bill even though many were furious?', 'the elected assembly had passed it', ['he had lost his own house in 1837', 'he wanted to anger the Americans', 'France had ordered him to sign it', 'he hoped to be elected as the mayor'], {
        emoji: '🖊️',
        why: 'That was the point. Under responsible government, he followed the assembly.',
      }),
      choice('What did the angry mob do in Montreal in 1849?', 'burned the Parliament building', ['burned the White House', 'dug up the Rideau Canal', 'stormed the Plains of Abraham', 'burned York’s parliament'], {
        emoji: '🔥',
        why: 'That is one reason Montreal lost its role as capital.',
      }),
      order('Put these in order, earliest first:', ['Rebellions break out', 'Nova Scotia gets responsible government', 'Elgin signs the Rebellion Losses Bill'], {
        emoji: '⏳',
        why: '1837 → 1848 → 1849.',
      }),
    ]],
  ]),
]
