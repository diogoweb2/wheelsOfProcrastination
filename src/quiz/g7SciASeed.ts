// Grade 7 Science, part one — Interactions in the Environment + Pure Substances
// and Mixtures. 40 questions, four per St. Eugene subtopic. See ./grade7.ts.
import type { QuizQuestion } from '../types'
import { grade7 } from './grade7'

const { choice, match, order } = grade7('g7-sci-a')

export const G7_SCI_A_SEED: QuizQuestion[] = [
  // --- sci-eco · ecosystems ------------------------------------------------------------
  choice('g7sa-01', 'sci-eco', 'In an ecosystem, what is a producer?', 'a living thing that makes its own food', ['an animal that eats only plants', 'an animal that hunts other animals', 'a thing that breaks down dead matter', 'a non-living part, like water', 'a farmer who grows the crops'], {
    emoji: '🌱',
    why: 'Plants and algae make food from sunlight. Every food chain starts with one.',
  }),
  match('g7sa-02', 'sci-eco', 'Match each living thing to its job:', [
    ['grass', 'producer'],
    ['rabbit', 'primary consumer'],
    ['fox', 'secondary consumer'],
    ['mushroom', 'decomposer'],
  ], { emoji: '🌳', why: 'Primary = eats the producer. Secondary = eats the eater.' }),
  choice('g7sa-03', 'sci-eco', 'Which is an ABIOTIC (non-living) part of an ecosystem?', 'sunlight', ['bacteria', 'moss', 'a mushroom', 'an earthworm', 'seaweed'], {
    emoji: '☀️',
    why: 'Abiotic: sun, water, soil, air, temperature. Bacteria are tiny, but alive.',
  }),
  choice('g7sa-04', 'sci-eco', 'What do decomposers give back to the soil?', 'nutrients from dead things', ['oxygen from the air', 'energy from sunlight', 'water from the clouds', 'carbon dioxide only', 'seeds for new plants'], {
    emoji: '🍄',
    why: 'Without them, dead leaves would pile up for ever and plants would run out of nutrients.',
  }),

  // --- sci-web · food chains and webs ---------------------------------------------------
  choice('g7sa-05', 'sci-web', 'In a food chain, what do the arrows show?', 'which way the energy flows', ['which animal is bigger', 'which animal hunts at night', 'which animal lives longest', 'where each animal lives', 'which animal is strongest'], {
    emoji: '➡️',
    why: 'grass → rabbit means the rabbit gets the grass’s energy. The arrow points at the eater.',
  }),
  choice('g7sa-06', 'sci-web', 'The wolves vanish from a forest. What most likely happens next?', 'deer multiply, then overeat the plants', ['the deer die out right away too', 'the deer stop eating plants at all', 'the deer all move into the city', 'nothing in the forest changes at all', 'the deer start hunting other animals'], {
    emoji: '🐺',
    why: 'Pull one thread and the whole web moves. This really happened in Yellowstone — and reversed when wolves returned.',
  }),
  choice('g7sa-07', 'sci-web', 'About how much energy passes from one level of a food chain to the next?', 'about 10%', ['about 50%', 'about 90%', 'all of it', 'about 1%', 'about 25%'], {
    emoji: '🔋',
    why: 'Most is used up moving, breathing and keeping warm. That is why there are far fewer hawks than grasshoppers.',
  }),
  order('g7sa-08', 'sci-web', 'Put this food chain in order, starting with the producer:', ['grass', 'grasshopper', 'frog', 'snake', 'hawk'], {
    emoji: '🕸️',
    why: 'Producer → primary → secondary → tertiary → top predator.',
  }),

  // --- sci-cycles · water, carbon, nitrogen ---------------------------------------------
  order('g7sa-09', 'sci-cycles', 'Put the water cycle in order, starting from a lake:', ['evaporation', 'condensation', 'precipitation', 'collection'], {
    emoji: '💧',
    why: 'Water rises as vapour, forms clouds, falls as rain or snow, and gathers again. The same water, for ever.',
  }),
  choice('g7sa-10', 'sci-cycles', 'Plants take in which gas to make their food?', 'carbon dioxide', ['oxygen', 'nitrogen', 'hydrogen', 'helium', 'methane'], {
    emoji: '🍃',
    why: 'Photosynthesis: carbon dioxide + water + sunlight → sugar + oxygen.',
  }),
  choice('g7sa-11', 'sci-cycles', 'Most living things can’t use nitrogen straight from the air. Who turns it into a usable form?', 'bacteria in the soil and roots', ['the leaves of tall trees', 'fish swimming in the lakes', 'worms eating dead leaves', 'animals when they breathe out', 'rocks at the bottom of rivers'], {
    emoji: '🦠',
    why: 'Nitrogen-fixing bacteria — many live in little bumps on the roots of beans and peas.',
  }),
  choice('g7sa-12', 'sci-cycles', 'Burning gasoline moves carbon from…', 'underground into the air', ['the air into the ground', 'the ocean into rocks', 'plants into the soil', 'the air into the sea', 'animals into plants'], {
    emoji: '⛽',
    why: 'Fossil fuels are ancient carbon stored underground. Burning them puts it back in the air as carbon dioxide.',
  }),

  // --- sci-impact · human impact and invasive species ------------------------------------
  choice('g7sa-13', 'sci-impact', 'What makes a species “invasive”?', 'it arrives from elsewhere and spreads fast', ['it is very big and very strong', 'it lives only in big crowded cities', 'it was here before anything else', 'it is very close to going extinct', 'it can only live in fresh water'], {
    emoji: '🚯',
    why: 'Not native, and it takes over — pushing out the species that belong there.',
  }),
  choice('g7sa-14', 'sci-impact', 'Which invader clogs water pipes in the Great Lakes?', 'zebra mussels', ['beavers', 'lake trout', 'loons', 'snapping turtles', 'walleye'], {
    emoji: '🐚',
    why: 'They arrived in ships’ ballast water in the 1980s and now coat pipes, boats and beaches.',
  }),
  choice('g7sa-15', 'sci-impact', 'Why do invasive species often spread so fast in a new place?', 'nothing there eats them yet', ['they are protected by law', 'they live for ever', 'people feed them on purpose', 'they cannot reproduce', 'they only grow in winter'], {
    emoji: '📈',
    why: 'Back home, predators and diseases kept them in check. In the new place, nothing does.',
  }),
  choice('g7sa-16', 'sci-impact', 'Which of these HELPS a damaged ecosystem recover?', 'planting native species', ['draining the wetland', 'bringing in a predator from abroad', 'spraying every insect', 'paving over the meadow', 'dumping extra road salt'], {
    emoji: '🌼',
    why: 'Bringing in a foreign predator to fix an invader has backfired many times — it often becomes the next invader.',
  }),

  // --- sci-succ · succession and biodiversity ---------------------------------------------
  order('g7sa-17', 'sci-succ', 'Put primary succession in order, from bare rock:', ['bare rock', 'lichens and moss', 'grasses', 'shrubs', 'forest'], {
    emoji: '🌲',
    why: 'Each stage builds soil for the next. It takes hundreds of years.',
  }),
  choice('g7sa-18', 'sci-succ', 'What are usually the FIRST living things on bare rock?', 'lichens and moss', ['pine trees', 'grasses', 'deer', 'shrubs', 'wildflowers'], {
    emoji: '🪨',
    why: 'Pioneer species. Lichens slowly break rock into the first thin soil.',
  }),
  choice('g7sa-19', 'sci-succ', 'A fire burns a forest but leaves the soil. The regrowth is called…', 'secondary succession', ['primary succession', 'the water cycle', 'decomposition', 'biodiversity', 'an invasion'], {
    emoji: '🔥',
    why: 'Primary starts from bare rock with no soil. Secondary starts with soil already there, so it is faster.',
  }),
  choice('g7sa-20', 'sci-succ', 'Why is high biodiversity good for an ecosystem?', 'it can survive losing one species', ['it has fewer animals to feed', 'it never changes at all', 'it has no predators', 'it needs less sunlight', 'it stops succession'], {
    emoji: '🌈',
    why: 'Many species means backups: if one food source fails, eaters can switch to another.',
  }),

  // --- sci-pure · pure substances and mixtures ---------------------------------------------
  choice('g7sa-21', 'sci-pure', 'Which of these is a PURE substance?', 'distilled water', ['salt water', 'air', 'orange juice', 'milk', 'granite'], {
    emoji: '⚗️',
    why: 'One kind of particle only. Air is a mixture of nitrogen, oxygen and more.',
  }),
  choice('g7sa-22', 'sci-pure', 'Sugar fully dissolved in water is a…', 'solution', ['pure substance', 'mechanical mixture', 'element', 'suspension', 'compound'], {
    emoji: '🧋',
    why: 'A solution looks like one thing, but it is two — you can get the sugar back by evaporating the water.',
  }),
  match('g7sa-23', 'sci-pure', 'Match each thing to what it is:', [
    ['gold', 'element'],
    ['water (H₂O)', 'compound'],
    ['granola', 'mechanical mixture'],
    ['sugar water', 'solution'],
  ], { emoji: '🧪', why: 'Elements and compounds are pure. Mechanical mixtures and solutions are mixtures.' }),
  choice('g7sa-24', 'sci-pure', 'How can you spot a mechanical mixture?', 'you can see its different parts', ['it is always a liquid', 'it has one kind of particle', 'it can never be separated', 'it always changes colour', 'it is always see-through'], {
    emoji: '👀',
    why: 'Granola, pizza, a bag of Lego — you can pick the pieces apart by eye.',
  }),

  // --- sci-sol · solutions and solubility --------------------------------------------------
  choice('g7sa-25', 'sci-sol', 'In salt water, which part is the SOLUTE?', 'the salt', ['the water', 'the whole mixture', 'the bubbles', 'the heat used', 'the glass'], {
    emoji: '🧂',
    why: 'Solute = what gets dissolved. Solvent = what does the dissolving (the water).',
  }),
  choice('g7sa-26', 'sci-sol', 'A solution that can’t dissolve any more solute is…', 'saturated', ['diluted', 'unsaturated', 'pure', 'evaporated', 'a compound'], {
    emoji: '🛑',
    why: 'Keep adding sugar and it starts sitting on the bottom. That is the saturation point.',
  }),
  choice('g7sa-27', 'sci-sol', 'What usually happens to how much sugar dissolves in HOTTER water?', 'more sugar dissolves', ['less sugar dissolves', 'exactly the same amount', 'none of it dissolves', 'it turns into salt', 'it all evaporates'], {
    emoji: '🌡️',
    why: 'Faster-moving water particles pull more sugar apart. (Gases are the opposite — warm pop goes flat.)',
  }),
  choice('g7sa-28', 'sci-sol', 'Why is water called the “universal solvent”?', 'it dissolves more things than most liquids', ['it dissolves absolutely everything', 'it is found all over the universe', 'it never mixes with anything', 'it is the heaviest liquid there is', 'it boils at exactly 100 degrees'], {
    emoji: '💧',
    why: 'Not literally everything — oil won’t dissolve — but more than almost any other liquid.',
  }),

  // --- sci-sep · separating mixtures ------------------------------------------------------
  match('g7sa-29', 'sci-sep', 'Match each mixture to the best way to separate it:', [
    ['sand from water', 'filtering'],
    ['salt from salt water', 'evaporation'],
    ['iron filings from sand', 'a magnet'],
    ['pure water from sea water', 'distillation'],
  ], { emoji: '🧫', why: 'Evaporation keeps the salt; distillation keeps the water. Same idea, different prize.' }),
  choice('g7sa-30', 'sci-sep', 'Which method gets drinkable water back out of sea water?', 'distillation', ['filtering', 'a magnet', 'sieving', 'decanting', 'stirring'], {
    emoji: '🫗',
    why: 'Boil it, catch the steam, cool it back into water. The salt stays behind.',
  }),
  choice('g7sa-31', 'sci-sep', 'Why can’t a filter take the salt out of salt water?', 'dissolved salt passes right through', ['the salt is far too heavy for it', 'the filter would melt in salt water', 'the salt sticks to the glass instead', 'the water is much too cold for it', 'salt is magnetic and jumps out'], {
    emoji: '🚫',
    why: 'Dissolved salt is split into particles smaller than any hole in the filter.',
  }),
  choice('g7sa-32', 'sci-sep', 'Recycling plants use big magnets to pull out which material?', 'steel cans', ['aluminum cans', 'plastic bottles', 'glass jars', 'newspaper', 'cardboard'], {
    emoji: '🧲',
    why: 'Steel has iron in it. Aluminum is NOT magnetic — it gets sorted another way.',
  }),

  // --- sci-particle · the particle theory -------------------------------------------------
  choice('g7sa-33', 'sci-particle', 'According to the particle theory, what is BETWEEN particles?', 'empty space', ['air', 'water', 'tiny glue', 'heat', 'dust'], {
    emoji: '🔵',
    why: 'Not air — air is made of particles too. Between them is nothing at all.',
  }),
  choice('g7sa-34', 'sci-particle', 'What happens to particles when you heat them?', 'they move faster', ['they get bigger', 'they slow down', 'they stop moving', 'they melt away', 'they turn into new particles'], {
    emoji: '🔥',
    why: 'The particles don’t grow. They move faster and spread out — that is why things expand.',
  }),
  order('g7sa-35', 'sci-particle', 'Put these from MOST tightly packed to LEAST:', ['solid', 'liquid', 'gas'], {
    emoji: '📦',
    why: 'Solid: locked in place. Liquid: sliding past each other. Gas: flying apart.',
  }),
  choice('g7sa-36', 'sci-particle', 'Why does a gas fill any container you put it in?', 'its particles move freely and spread out', ['its particles are the biggest', 'a gas has no particles', 'it is lighter than the container', 'its particles stick together', 'gases are always hot'], {
    emoji: '🎈',
    why: 'Gas particles fly in every direction until they hit a wall.',
  }),

  // --- sci-water · water quality and treatment ---------------------------------------------
  order('g7sa-37', 'sci-water', 'Put Toronto’s water treatment in order:', [
    'chemicals clump the dirt together',
    'the clumps settle to the bottom',
    'sand and gravel filter the water',
    'chlorine kills the germs',
    'the water is pumped to your tap',
  ], { emoji: '🚰', why: 'Coagulation → sedimentation → filtration → disinfection → distribution.' }),
  choice('g7sa-38', 'sci-water', 'Where does Toronto get its drinking water?', 'Lake Ontario', ['Lake Erie', 'the Don River', 'underground wells', 'Lake Simcoe', 'Georgian Bay'], {
    emoji: '🏙️',
    why: 'Pipes reach far out into the lake, where the water is deep, cold and cleaner.',
  }),
  choice('g7sa-39', 'sci-water', 'Why is chlorine added to drinking water?', 'to kill germs', ['to make it taste fresh', 'to remove the salt', 'to cool it down', 'to make it blue', 'to make it softer'], {
    emoji: '🧴',
    why: 'Before chlorination, diseases like cholera and typhoid spread through city water.',
  }),
  choice('g7sa-40', 'sci-water', 'Which of these should NEVER go down the sink?', 'leftover paint and medicine', ['used dishwater', 'leftover tea', 'water from boiling pasta', 'water from washing fruit', 'melted ice'], {
    emoji: '⚠️',
    why: 'Treatment plants can’t fully remove them, so they end up back in the lake. Take them to a depot.',
  }),
]
