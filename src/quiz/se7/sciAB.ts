// §14d — Science: Interactions in the Environment, and Pure Substances and Mixtures.
// Written by hand in session. See ./build.ts for how an idea and its versions work.
import { chapter, choice, match, order } from './build'

export const SCI_AB = [
  // --- 🌳 Ecosystems: who needs whom ------------------------------------------------
  chapter('sci-eco', [
    ['biotic', {
      explain: [
        'An ecosystem has living and non-living parts.',
        'Biotic means living: plants, animals, fungi, bacteria.',
        'Abiotic means non-living: sunlight, water, soil, air, temperature.',
        'Each part depends on the others.',
      ],
      video: 'sci-eco-v1',
      watchFor: 'Listen for the words biotic and abiotic.',
    }, [
      choice('Which of these is ABIOTIC?', 'sunlight', ['moss', 'a fish', 'a mushroom', 'bacteria'], {
        emoji: '☀️',
        why: 'Abiotic means non-living. Bacteria are tiny, but alive.',
      }),
      choice('Which of these is BIOTIC?', 'a mushroom', ['a rock', 'the wind', 'lake water', 'a sand dune'], {
        emoji: '🍄',
        why: 'Fungi are alive.',
      }),
      match('Sort each one:', [
        ['an oak tree', 'biotic'],
        ['the soil’s temperature', 'abiotic'],
      ], { why: 'Alive, or not alive?' }),
    ]],
    ['roles', {
      explain: [
        'Producers make their own food from sunlight: plants and algae.',
        'Consumers eat other living things.',
        'Decomposers break down dead things and return nutrients to the soil.',
      ],
      video: 'sci-eco-v0',
      watchFor: 'Name one producer, one consumer and one decomposer.',
    }, [
      match('Match each living thing to its job:', [
        ['grass', 'producer'],
        ['rabbit', 'consumer'],
        ['mushroom', 'decomposer'],
      ], { emoji: '🌱', why: 'Makes food, eats food, recycles food.' }),
      choice('What makes a producer different from a consumer?', 'it makes its own food', ['it hunts other animals', 'it eats dead leaves', 'it lives in the water', 'it is always very small'], {
        why: 'Producers use sunlight. Everything else depends on them.',
      }),
      choice('All decomposers vanish from a forest. What happens?', 'dead things pile up and nutrients run out', ['the plants grow much faster than before', 'the rabbits all turn into plant-eaters', 'nothing changes at all in the forest', 'the forest gets a lot more sunlight'], {
        why: 'Decomposers are nature’s recyclers. Without them, the soil starves.',
      }),
    ]],
    ['levels', {
      explain: [
        'Organism: one living thing.',
        'Population: all of one species in a place.',
        'Community: all the different species in a place.',
        'Ecosystem: the community plus the non-living parts.',
      ],
      video: 'sci-eco-v1',
    }, [
      order('Put these from smallest to biggest:', ['organism', 'population', 'community', 'ecosystem'], {
        emoji: '🪜',
        why: 'One → one species → all species → all species plus the non-living parts.',
      }),
      choice('All the deer in Algonquin Park are a…', 'population', ['community', 'ecosystem', 'organism', 'biome'], {
        emoji: '🦌',
        why: 'One species, one place.',
      }),
      choice('The fish, plants, frogs, water and rocks of a pond, all together, are…', 'an ecosystem', ['a population', 'a community', 'an organism', 'a species'], {
        why: 'Living AND non-living parts: that makes it an ecosystem.',
      }),
    ]],
    ['symbiosis', {
      explain: [
        'Symbiosis is two species living closely together.',
        'Mutualism: both benefit, like bees and flowers.',
        'Parasitism: one gains, the other is harmed, like ticks on a deer.',
        'Commensalism: one gains, the other is not affected, like a bird nesting in a tree.',
      ],
      video: 'sci-eco-v2',
    }, [
      match('Match each pair to its relationship:', [
        ['bee and flower', 'mutualism'],
        ['tick and deer', 'parasitism'],
        ['bird nesting in a tree', 'commensalism'],
      ], { emoji: '🐝', why: 'Both gain, one harmed, or one gains and the other does not care.' }),
      choice('In mutualism, who benefits?', 'both species', ['only the bigger one', 'only the smaller one', 'neither of the two', 'only the plant one'], {
        why: 'Bees get food; flowers get pollinated.',
      }),
      choice('Two Blue Lock strikers both play better when they pass to each other. Which relationship is this like?', 'mutualism', ['parasitism', 'commensalism', 'decomposition', 'competition'], {
        emoji: '⚽',
        why: 'Both gain.',
      }),
    ]],
    ['limits', {
      explain: [
        'An ecosystem can only support so many of one species.',
        'That number is its carrying capacity.',
        'Food, water, shelter and space set the limit.',
        'Past the limit, some starve or move, and the numbers fall.',
      ],
      video: 'sci-eco-v2',
    }, [
      choice('What is “carrying capacity”?', 'how many of a species a place can support', ['how much weight an animal is able to lift', 'how far an animal travels during its life', 'how many species there are in the world', 'how much water a river can hold in spring'], {
        emoji: '🌳',
        why: 'Food, water, shelter and space set the limit.',
      }),
      choice('Rabbits breed until they eat almost all the grass. What happens next?', 'many starve and their numbers fall', ['the grass begins to grow much taller', 'rabbits start to eat the foxes instead', 'the rabbits keep on growing in number', 'the foxes all leave the area at once'], {
        why: 'They passed the carrying capacity.',
      }),
      choice('Which is a limit on how many deer a forest can support?', 'the food available', ['the colour of deer', 'the shape of hooves', 'the height of clouds', 'the name of the park'], {
        why: 'Food, water, shelter and space.',
      }),
    ]],
  ]),

  // --- 🕸️ Food chains and food webs --------------------------------------------------
  chapter('sci-web', [
    ['arrows', {
      explain: [
        'A food chain shows who eats whom.',
        'The arrows show the way the energy flows.',
        'grass → rabbit means the energy goes from the grass into the rabbit.',
      ],
      video: 'sci-web-v0',
      watchFor: 'Which way do the arrows point?',
    }, [
      choice('In a food chain, what does the arrow show?', 'which way the energy flows', ['which animal is the biggest', 'which animal hunts at night', 'where the animals all live', 'which animal runs fastest'], {
        emoji: '➡️',
        why: 'It points to the eater.',
      }),
      choice('Which food chain is drawn correctly?', 'grass → grasshopper → frog', ['frog → grasshopper → grass', 'grasshopper → grass → frog', 'frog → grass → grasshopper', 'grass → frog → grasshopper'], {
        why: 'The arrow follows the energy, from food to eater.',
      }),
      order('Put this food chain in order, starting with the producer:', ['algae', 'small fish', 'trout', 'osprey'], {
        emoji: '🐟',
        why: 'The producer always comes first.',
      }),
    ]],
    ['web', {
      explain: [
        'Most animals eat more than one thing.',
        'A food web is many food chains, linked together.',
        'It shows how an ecosystem really works.',
      ],
      video: 'sci-web-v1',
    }, [
      choice('What is a food web?', 'many food chains linked together', ['one straight line of eaters', 'a spider’s home in the woods', 'a list of the plants in a park', 'a map of where an animal lives'], {
        emoji: '🕸️',
        why: 'Real animals eat more than one thing.',
      }),
      choice('Why is a food web more realistic than a food chain?', 'most animals eat several things', ['most animals only eat one thing', 'it has much fewer animals in it', 'it does not need any producers', 'it shows only the top predators'], {
        why: 'A fox eats mice, rabbits, berries and more.',
      }),
      choice('In a food web, a fox’s rabbits die out. Why might it survive?', 'it can eat other things too', ['foxes do not need to eat', 'it can make its own food', 'rabbits come back at once', 'it turns into a producer'], {
        why: 'That is why webs are stronger than single chains.',
      }),
    ]],
    ['ten-percent', {
      explain: [
        'Only about 10% of the energy passes up to the next level.',
        'The rest is used up for moving, breathing and keeping warm.',
        'That is why there are far fewer hawks than grasshoppers.',
      ],
      video: 'sci-web-v1',
      watchFor: 'How much energy moves up each level of the pyramid?',
    }, [
      choice('About how much energy passes to the next level of a food chain?', 'about 10%', ['about 50%', 'about 90%', 'all of it', 'none of it'], {
        emoji: '🔋',
        why: 'Most is used up living.',
      }),
      choice('Where does most of the energy go at each level?', 'it is used up living and moving', ['it goes back into the sun', 'it is stored in the soil', 'it turns into solid rock', 'it all passes to the top'], {
        why: 'Moving, breathing and keeping warm use it.',
      }),
      choice('Why are there many more mice than hawks?', 'little energy reaches the top of a chain', ['hawks are not very good at hunting mice', 'mice are a lot bigger than the hawks are', 'hawks live for much less time than mice', 'hawks only hunt when it is warm outside'], {
        emoji: '🦅',
        why: 'Each level holds much less energy than the one below.',
      }),
    ]],
    ['remove', {
      explain: [
        'Pull one thread and the whole web moves.',
        'Remove a predator, and what it hunts can multiply and overeat.',
        'Wolves were returned to Yellowstone in 1995 and the whole park changed.',
      ],
      video: 'sci-web-v2',
    }, [
      choice('The wolves vanish from a forest. What most likely happens next?', 'deer multiply, then overeat the plants', ['the deer die out right away as well', 'the deer stop eating plants at all', 'nothing in the forest changes at all', 'the plants grow taller than ever before'], {
        emoji: '🐺',
        why: 'This really happened in Yellowstone.',
      }),
      choice('A disease kills most of the frogs in a pond. What happens to the insects they eat?', 'their numbers go up', ['their numbers go down', 'they turn into frogs', 'they become producers', 'nothing at all changes'], {
        why: 'Fewer hunters means more of the hunted.',
      }),
      choice('The same pond loses its frogs. What happens to the herons that eat frogs?', 'they have less food', ['they have more food', 'they grow much bigger', 'they start making food', 'they stop needing food'], {
        why: 'The change moves up the web too.',
      }),
    ]],
    ['biomagnify', {
      explain: [
        'Some poisons stay in animals’ bodies.',
        'Small fish hold a little. Bigger fish eat many small fish, so they hold more.',
        'Top predators get the most. This is biomagnification.',
        'DDT nearly wiped out bald eagles this way.',
      ],
      video: 'sci-web-v1',
    }, [
      choice('Why do top predators hold the most poison?', 'they eat many animals that each hold some', ['they drink much more of the water there', 'they breathe in more of the poisoned air', 'they live closer to where it was sprayed', 'they make the poison in their own bodies'], {
        emoji: '☠️',
        why: 'It builds up at each level.',
      }),
      choice('What is the word for poison building up in a food chain?', 'biomagnification', ['photosynthesis', 'decomposition', 'condensation', 'evaporation'], {
        why: 'Bio = life, magnify = make bigger.',
      }),
      choice('Which animal in a lake would hold the most mercury?', 'a large pike', ['some algae', 'a water flea', 'a small minnow', 'a tiny snail'], {
        emoji: '🐟',
        why: 'The top of the chain gets the most. That is why big fish have eating warnings.',
      }),
    ]],
  ]),

  // --- 💧 Water, carbon and nitrogen cycles ------------------------------------------
  chapter('sci-cycles', [
    ['water', {
      explain: [
        'Water never leaves. It goes round.',
        'Evaporation: heat turns water into vapour.',
        'Condensation: vapour cools and forms clouds.',
        'Precipitation: rain or snow falls. Collection: it gathers in lakes and oceans.',
      ],
      video: 'sci-cycles-v1',
      watchFor: 'Follow one drop of water all the way round.',
    }, [
      order('Put the water cycle in order, starting from a lake:', ['evaporation', 'condensation', 'precipitation', 'collection'], {
        emoji: '💧',
        why: 'The same water, for ever.',
      }),
      choice('Clouds form when water vapour cools. What is this step called?', 'condensation', ['evaporation', 'precipitation', 'collection', 'transpiration'], {
        emoji: '☁️',
        why: 'Gas to liquid. It is the same thing as drops on a cold glass.',
      }),
      match('Match each step to what it means:', [
        ['evaporation', 'liquid water rises as vapour'],
        ['condensation', 'vapour turns to droplets'],
        ['precipitation', 'rain or snow falls'],
      ], { why: 'Up, cool, down.' }),
    ]],
    ['photosynthesis', {
      explain: [
        'Plants take in carbon dioxide and water, and use sunlight to make sugar.',
        'They give off oxygen. That is photosynthesis.',
        'Animals and plants breathe: they use oxygen and release carbon dioxide. That is respiration.',
      ],
      video: 'sci-cycles-v0',
      watchFor: 'How do plants pull carbon out of the air?',
    }, [
      choice('Which gas do plants take in to make food?', 'carbon dioxide', ['oxygen', 'nitrogen', 'hydrogen', 'helium'], {
        emoji: '🍃',
        why: 'Carbon dioxide + water + sunlight → sugar + oxygen.',
      }),
      choice('What do plants give off during photosynthesis?', 'oxygen', ['nitrogen', 'methane', 'helium', 'smoke'], {
        why: 'That is the oxygen we breathe.',
      }),
      match('Match the process to what it does with carbon:', [
        ['photosynthesis', 'takes carbon out of the air'],
        ['respiration', 'puts carbon back into the air'],
      ], { why: 'One pulls it in, the other lets it out.' }),
    ]],
    ['burning', {
      explain: [
        'Fossil fuels are carbon stored underground from ancient living things.',
        'Burning them puts that carbon into the air very quickly.',
        'Too much carbon in the air warms the planet.',
      ],
      video: 'sci-cycles-v1',
    }, [
      choice('Burning gasoline moves carbon from…', 'underground into the air', ['the air into the ground', 'the ocean into the rocks', 'plants into the soil', 'the air into the sea'], {
        emoji: '⛽',
        why: 'Ancient stored carbon, released in a moment.',
      }),
      choice('What are fossil fuels made from?', 'ancient living things', ['melted volcanic rock', 'old sea salt deposits', 'very old ocean water', 'pieces of meteorites'], {
        why: 'Plants and tiny sea creatures, buried for millions of years.',
      }),
      choice('Which of these stores carbon for a long time?', 'a forest', ['a campfire', 'a car engine', 'a gas stove', 'a jet plane'], {
        emoji: '🌲',
        why: 'Trees lock it in their wood. The others release it.',
      }),
    ]],
    ['nitrogen', {
      explain: [
        'Living things need nitrogen to build proteins.',
        'The air is mostly nitrogen, but plants cannot use it from the air.',
        'Bacteria in soil and roots turn it into a form plants can use.',
        'Other bacteria return it to the air.',
      ],
      video: 'sci-cycles-v0',
      watchFor: 'Who turns nitrogen into a form plants can use?',
    }, [
      choice('Who turns nitrogen from the air into a form plants can use?', 'bacteria in the soil and roots', ['the leaves of very tall trees', 'fish swimming in the lakes', 'worms eating the dead leaves', 'the rain falling on the fields'], {
        emoji: '🦠',
        why: 'Many live in little bumps on the roots of peas and beans.',
      }),
      choice('About how much of the air is nitrogen?', 'about 78%', ['about 21%', 'about 1%', 'about 50%', 'all of it'], {
        why: 'Most of every breath, but useless to you directly.',
      }),
      choice('Why do living things need nitrogen?', 'to build proteins', ['to see in the dark', 'to stay nice and cold', 'to make salt water', 'to change their colour'], {
        why: 'Proteins build muscles, skin and much more.',
      }),
    ]],
    ['matter-goes-round', {
      explain: [
        'Energy flows through an ecosystem and is used up.',
        'Matter goes around and is used again and again.',
        'The water, carbon and nitrogen in you have been in other living things.',
      ],
      video: 'sci-cycles-v2',
    }, [
      choice('What is different about matter and energy in an ecosystem?', 'matter cycles; energy flows through', ['energy cycles; matter flows through', 'both of them are used up completely', 'both of them cycle round for ever', 'neither of them ever really moves'], {
        emoji: '♻️',
        why: 'That is why the sun must keep shining.',
      }),
      choice('Why can the water you drink be millions of years old?', 'water keeps on going round the cycle', ['bottled water can be kept for ever', 'new water cannot enter the lake', 'it has been frozen since the start', 'nobody has ever used that water'], {
        emoji: '🦕',
        why: 'A dinosaur may have drunk the same water.',
      }),
      choice('A leaf falls and rots. What happens to the carbon in it?', 'it returns to the soil and the air', ['it disappears completely for ever', 'it turns into solid iron in the soil', 'it goes back into the sun’s energy', 'it stays in the leaf for ever more'], {
        why: 'Matter does not vanish. It moves.',
      }),
    ]],
  ]),

  // --- 🚯 Human impact and invasive species -------------------------------------------
  chapter('sci-impact', [
    ['invasive', {
      explain: [
        'An invasive species is one that arrives in a new place and harms it.',
        'It has no natural predators there, so it spreads fast.',
        'It takes food and space from native species.',
      ],
      video: 'sci-impact-v1',
      watchFor: 'Why do invasive species spread so quickly?',
    }, [
      choice('Why do invasive species spread so fast?', 'they have no natural predators here', ['they are the largest animals around', 'they only eat plants that are dead', 'people give them lots of extra food', 'they cannot have any babies here'], {
        emoji: '🦠',
        why: 'Nothing is keeping their numbers down.',
      }),
      choice('What makes a species “invasive”?', 'it is new to a place and harms it', ['it has lived there for a long time', 'it is rare and in need of protection', 'it is the biggest in the ecosystem', 'it only ever eats one kind of plant'], {
        why: 'Not every newcomer is invasive. Invasive ones cause harm.',
      }),
      choice('A new player joins Blue Lock and takes every chance from the others. Which science idea is this like?', 'an invasive species', ['a decomposer in soil', 'a pioneer species', 'a primary producer', 'the water cycle'], {
        emoji: '⚽',
        why: 'It takes food and space from native species.',
      }),
    ]],
    ['great-lakes', {
      explain: [
        'Zebra mussels came to the Great Lakes in the 1980s, in ships’ ballast water.',
        'They clog pipes and strip the water of plankton.',
        'Sea lampreys latch onto lake trout and feed on them.',
        'Emerald ash borers have killed millions of ash trees in Ontario.',
      ],
      video: 'sci-impact-v1',
    }, [
      choice('How did zebra mussels reach the Great Lakes?', 'in the ballast water of ships', ['frozen inside large icebergs', 'by swimming up from the Gulf', 'on the backs of migrating ducks', 'released on purpose by farmers'], {
        emoji: '🚢',
        why: 'Ships took on water in Europe and dumped it here.',
      }),
      match('Match each invader to what it harms:', [
        ['zebra mussel', 'clogs pipes and eats plankton'],
        ['sea lamprey', 'feeds on lake trout'],
        ['emerald ash borer', 'kills ash trees'],
      ], { emoji: '🐛', why: 'Three invaders, three kinds of damage.' }),
      choice('Boaters must clean their boats between lakes. Why?', 'to stop moving invasive species', ['to keep their boats going faster', 'to save money on boat insurance', 'to keep the lake water much colder', 'to please the local fish inspectors'], {
        why: 'Mussels hitch rides on hulls.',
      }),
    ]],
    ['habitat', {
      explain: [
        'People change ecosystems: farms, roads, cities, mines.',
        'Habitat loss is the biggest threat to wild species.',
        'A road can cut a habitat in two. That is fragmentation.',
      ],
      video: 'sci-impact-v0',
      watchFor: 'What is the biggest way humans change ecosystems?',
    }, [
      choice('What is the biggest threat to most wild species?', 'losing their habitat', ['too much clean water', 'too many hungry zoos', 'being too large to hide', 'the phases of the moon'], {
        emoji: '🏗️',
        why: 'No home, no food, no young.',
      }),
      choice('A highway is built through a forest, splitting a population of turtles in two. What is this called?', 'habitat fragmentation', ['biomagnification', 'primary succession', 'photosynthesis', 'symbiosis'], {
        emoji: '🐢',
        why: 'That is why some highways now have wildlife tunnels.',
      }),
      choice('Which is the best way to protect wetland species?', 'protect the wetland itself', ['feed the birds there daily', 'paint the local signs green', 'move all the fish to the zoo', 'drain a small part of it'], {
        why: 'Save the habitat and you save what lives in it.',
      }),
    ]],
    ['pollution', {
      explain: [
        'Pollution harms ecosystems from far away.',
        'Fertilizer running into lakes feeds huge algae blooms.',
        'When the algae die and rot, oxygen drops and fish die.',
        'Plastic breaks down into tiny pieces that animals eat.',
      ],
      video: 'sci-impact-v2',
    }, [
      choice('Why can farm fertilizer harm a lake?', 'it feeds algae that use up oxygen', ['it freezes the lake in the winter', 'it makes all of the fish grow too big', 'it turns all of the water salty', 'it keeps the sun from reaching it'], {
        emoji: '🌾',
        why: 'Rotting algae use up the oxygen, and fish die.',
      }),
      order('Put these in order:', ['fertilizer runs into the lake', 'algae grow out of control', 'algae die and rot', 'oxygen drops and fish die'], {
        emoji: '⏳',
        why: 'That chain of events can kill a lake.',
      }),
      choice('What happens to most plastic in the ocean?', 'it breaks into tiny pieces', ['it rots away within a week', 'it turns into clean sea sand', 'it dissolves into pure water', 'it sinks and is gone for ever'], {
        why: 'Microplastics end up inside animals.',
      }),
    ]],
    ['help', {
      explain: [
        'People can fix what they damage.',
        'Protect habitats, restore wetlands, and clean up polluted water.',
        'Control invaders before they spread.',
        'Small choices add up: less waste, native plants, clean boats.',
      ],
      video: 'sci-impact-v0',
    }, [
      choice('Which action best helps native pollinators?', 'planting native flowers', ['spraying more insecticide', 'cutting grass every day', 'paving over the garden', 'removing all the flowers'], {
        emoji: '🐝',
        why: 'Native insects evolved with native plants.',
      }),
      choice('What is the best time to deal with an invasive species?', 'early, before it spreads', ['after it has spread widely', 'only when it reaches a city', 'once all natives are gone', 'it is never worth dealing with'], {
        why: 'Early is cheap. Late is often impossible.',
      }),
      choice('Peregrine falcons came back after DDT was banned. What does this show?', 'ecosystems can recover if we act', ['nothing we do can ever change it', 'falcons don’t need any food at all', 'DDT was good for peregrine falcons', 'birds are not affected by poison'], {
        emoji: '🦅',
        why: 'Banning the poison gave them a chance.',
      }),
    ]],
  ]),

  // --- 🌱 Succession and biodiversity --------------------------------------------------
  chapter('sci-succ', [
    ['what', {
      explain: [
        'Succession is how an ecosystem slowly changes over time.',
        'One group of plants prepares the ground for the next.',
        'Bare rock can become a forest, but it takes hundreds of years.',
      ],
      video: 'sci-succ-v1',
      watchFor: 'How does an empty place fill back up?',
    }, [
      choice('What is ecological succession?', 'a slow change in what lives in a place', ['a quick flood that wipes out a forest', 'the way animals move for the winter', 'a list of the species living in a park', 'a tree’s yearly loss of all its leaves'], {
        emoji: '🌱',
        why: 'Bare rock → moss → shrubs → forest.',
      }),
      order('Put succession in order:', ['bare rock', 'lichens and mosses', 'grasses and shrubs', 'forest'], {
        emoji: '🌲',
        why: 'Each stage makes the next one possible.',
      }),
      choice('About how long can it take for bare rock to become a forest?', 'hundreds of years', ['about one week', 'a single summer', 'about ten days', 'a single winter'], {
        why: 'Soil builds up very slowly.',
      }),
    ]],
    ['pioneer', {
      explain: [
        'Pioneer species are the first to live on bare ground.',
        'Lichens and mosses can grow on rock.',
        'They break it down and, as they die, they start building soil.',
      ],
      video: 'sci-succ-v0',
      watchFor: 'What moves in first?',
    }, [
      choice('Which of these is a pioneer species on bare rock?', 'lichen', ['oak', 'maple', 'deer', 'pine'], {
        emoji: '🪨',
        why: 'Lichen needs no soil.',
      }),
      choice('What do pioneer species do for the species that come next?', 'they start to build soil', ['they eat all of the rocks', 'they block out the light', 'they use up all the water', 'they keep other plants out'], {
        why: 'They make the place ready.',
      }),
      choice('The first crew on an empty island clears the land so others can settle. In succession, who is that?', 'pioneer species', ['top predators', 'decomposer fungi', 'mature forests', 'large herbivores'], {
        emoji: '🏝️',
        why: 'First in, and they prepare the ground.',
      }),
    ]],
    ['primary-secondary', {
      explain: [
        'Primary succession starts with no soil at all: new lava, bare rock.',
        'Secondary succession starts where soil is still there: after a fire or a cleared field.',
        'Secondary is much faster.',
      ],
      video: 'sci-succ-v0',
    }, [
      match('Match each place to the kind of succession:', [
        ['fresh lava rock', 'primary'],
        ['a burned forest', 'secondary'],
      ], { emoji: '🌋', why: 'Is the soil still there?' }),
      choice('What is the key difference between primary and secondary succession?', 'whether soil is already there', ['whether the sun is shining', 'whether there are any rabbits', 'whether it happens in Canada', 'whether trees are already dead'], {
        why: 'No soil, primary. Soil, secondary.',
      }),
      choice('Why does a burned forest recover faster than new lava rock?', 'the soil and seeds are still there', ['fire is a great source of plant food', 'the lava rock gets too cold for trees', 'animals plant new trees very quickly', 'burned forests get a lot more rain'], {
        emoji: '🔥',
        why: 'Secondary succession skips the soil-building step.',
      }),
    ]],
    ['biodiversity', {
      explain: [
        'Biodiversity means the variety of life in a place.',
        'High biodiversity means many different species.',
        'A place with more species handles shocks better: if one goes, others fill in.',
      ],
      video: 'sci-succ-v2',
      watchFor: 'Why does variety make an ecosystem stronger?',
    }, [
      choice('What does “biodiversity” mean?', 'the variety of life in a place', ['the biggest animal in a place', 'the number of trees in a place', 'the oldest species in a place', 'the temperature of a place'], {
        emoji: '🦋',
        why: 'Bio = life, diversity = variety.',
      }),
      choice('Which has the highest biodiversity?', 'a rainforest', ['a wheat field', 'a parking lot', 'a lawn of grass', 'a desert road'], {
        emoji: '🌴',
        why: 'Huge numbers of different species.',
      }),
      choice('A disease kills one kind of tree. Which forest handles it best?', 'one with many kinds of tree', ['one with just a single kind', 'one with very few animals', 'one that is very tiny', 'one with no soil left'], {
        why: 'Variety protects the whole.',
      }),
    ]],
    ['monoculture', {
      explain: [
        'A field with one crop is a monoculture.',
        'One pest or disease can wipe it all out.',
        'The Irish potato famine happened partly because so many people depended on one kind of potato.',
      ],
      video: 'sci-succ-v2',
    }, [
      choice('What is a monoculture?', 'a field with only one crop', ['a forest with only one rock', 'a pond with only one frog', 'a farm with only one farmer', 'a city with only one street'], {
        emoji: '🌽',
        why: 'Mono = one.',
      }),
      choice('Why is a monoculture risky?', 'one disease could wipe it all out', ['it needs no water to keep growing', 'it has too many species living in it', 'it gets too much sun in the summer', 'it grows too slowly to be any use'], {
        why: 'No variety, no back-up.',
      }),
      choice('Which event is a famous warning about depending on one crop?', 'the Irish potato famine', ['the War of 1812 in Canada', 'the fall of New France', 'the opening of the Rideau', 'the Rebellions of 1837'], {
        emoji: '🥔',
        why: 'One crop, one disease, a million dead.',
      }),
    ]],
  ]),

  // --- ⚗️ Pure substances and mixtures -------------------------------------------------
  chapter('sci-pure', [
    ['what', {
      explain: [
        'A pure substance has only one kind of particle.',
        'A mixture has two or more kinds, mixed together.',
        'Pure: distilled water, gold, table salt. Mixture: salt water, air, milk.',
      ],
      video: 'sci-pure-v1',
      watchFor: 'How many kinds of particle does a pure substance have?',
    }, [
      choice('Which of these is a pure substance?', 'distilled water', ['salt water', 'orange juice', 'city air', 'soil'], {
        emoji: '💧',
        why: 'Only water particles.',
      }),
      choice('Which of these is a mixture?', 'air', ['gold', 'pure iron', 'table salt', 'distilled water'], {
        emoji: '🌬️',
        why: 'Air is mostly nitrogen and oxygen, plus other gases.',
      }),
      match('Sort each one:', [
        ['pure gold', 'pure substance'],
        ['salad dressing', 'mixture'],
      ], { why: 'One kind of particle, or more than one?' }),
    ]],
    ['element-compound', {
      explain: [
        'Pure substances come in two kinds.',
        'An element is one kind of atom: gold, oxygen, iron.',
        'A compound is two or more elements chemically joined: water (H₂O), salt.',
      ],
      video: 'sci-pure-v0',
    }, [
      match('Sort each one:', [
        ['oxygen', 'element'],
        ['water', 'compound'],
      ], { emoji: '⚛️', why: 'One kind of atom, or chemically joined atoms?' }),
      choice('Water (H₂O) is a compound because…', 'its elements are chemically joined', ['it can be poured out of a glass', 'it is found in lakes and in rivers', 'it can freeze into a block of ice', 'it is a liquid at room temperature'], {
        why: 'Hydrogen and oxygen bonded together.',
      }),
      choice('Which of these is an element?', 'iron', ['salt', 'water', 'sugar', 'air'], {
        why: 'You will find it on the periodic table.',
      }),
    ]],
    ['see-it', {
      explain: [
        'In a mechanical mixture, you can see the different parts: pizza, gravel, cereal in milk.',
        'In a solution, everything looks like one thing: salt water, tea, apple juice.',
        'A solution is still a mixture, even if it looks pure.',
      ],
      video: 'sci-pure-v2',
    }, [
      match('Sort each one:', [
        ['trail mix', 'mechanical mixture'],
        ['salt water', 'solution'],
      ], { emoji: '🥜', why: 'Can you see the different parts?' }),
      choice('You can pick the peppers off a pizza. What does this show?', 'it is a mechanical mixture', ['it is a pure substance', 'it is a single element', 'it is a clear solution', 'it is a chemical compound'], {
        emoji: '🍕',
        why: 'You can see and separate the parts.',
      }),
      choice('Salt water looks like one thing. Why is it still a mixture?', 'it has two kinds of particle', ['it is able to be poured', 'it comes from the ocean', 'it has a very salty taste', 'it is a kind of clear liquid'], {
        why: 'Water particles and salt particles, evenly mixed.',
      }),
    ]],
    ['pure-label', {
      explain: [
        '“100% pure” on a label does not mean what it means in science.',
        '“Pure orange juice” is still a mixture of water, sugars and acids.',
        'In science, pure means only one kind of particle.',
      ],
      video: 'sci-pure-v2',
    }, [
      choice('A carton says “100% pure orange juice”. Is it a pure substance in science?', 'no — it is a mixture', ['yes — the label says so', 'yes — only if it’s cold', 'yes — it is a compound', 'only if it has no pulp'], {
        emoji: '🧃',
        why: 'Water, sugars, acids and more.',
      }),
      choice('In science, what does “pure” mean?', 'only one kind of particle', ['nothing added by a factory', 'very clean and safe to drink', 'grown on a local family farm', 'the best quality you can buy'], {
        why: 'Not the same as the label meaning.',
      }),
      choice('Which of these is a pure substance, not just “pure” on a label?', 'a bar of gold', ['spring water', 'maple syrup', 'whole milk', 'fresh juice'], {
        why: 'Spring water has minerals dissolved in it.',
      }),
    ]],
    ['properties', {
      explain: [
        'A pure substance has fixed properties.',
        'Pure water always boils at 100 °C at sea level.',
        'Add salt, and it boils at a higher temperature.',
        'So you can test whether something is pure.',
      ],
      video: 'sci-pure-v1',
    }, [
      choice('At what temperature does pure water boil at sea level?', '100 °C', ['0 °C', '50 °C', '37 °C', '212 °C'], {
        emoji: '🌡️',
        why: 'Fixed, for pure water at sea level.',
      }),
      choice('A liquid boils at 104 °C. What does it suggest?', 'it is not pure water', ['it is very pure water', 'the thermometer is hot', 'it is on top of a hill', 'it has no particles in it'], {
        why: 'A mixture has a different boiling point.',
      }),
      choice('Why do we salt icy roads?', 'salt water freezes at a lower temperature', ['salt makes the road a lot warmer to touch', 'salt turns all the ice into solid rock', 'salt makes all the snow fall sideways', 'salt keeps the sun off the road surface'], {
        emoji: '🧂',
        why: 'A mixture has different properties from pure water.',
      }),
    ]],
  ]),

  // --- 🧂 Solutions and solubility -----------------------------------------------------
  chapter('sci-sol', [
    ['words', {
      explain: [
        'A solution has a solute and a solvent.',
        'The solute is what dissolves: sugar.',
        'The solvent does the dissolving: water.',
        'Solute + solvent = solution.',
      ],
      video: 'sci-sol-v2',
      watchFor: 'Which one dissolves and which one does the dissolving?',
    }, [
      choice('In sweet tea, what is the sugar?', 'the solute', ['the solvent', 'the solution', 'the mixture', 'the element'], {
        emoji: '🍵',
        why: 'It is what gets dissolved.',
      }),
      choice('In salt water, what is the water?', 'the solvent', ['the solute', 'the element', 'the crystal', 'the residue'], {
        why: 'It does the dissolving.',
      }),
      match('Match each word to its meaning:', [
        ['solute', 'what dissolves'],
        ['solvent', 'what does the dissolving'],
        ['solution', 'the two mixed together'],
      ], { why: 'Solute + solvent = solution.' }),
    ]],
    ['concentration', {
      explain: [
        'Concentration is how much solute is in a set amount of solvent.',
        'A lot of solute: concentrated. A little: dilute.',
        'Add water to orange concentrate to make it dilute.',
      ],
      video: 'sci-sol-v1',
    }, [
      choice('You add more water to your juice. What happens to the concentration?', 'it goes down', ['it goes up', 'it stays the same', 'it turns to gas', 'it becomes pure'], {
        emoji: '🧃',
        why: 'Same sugar, more water: more dilute.',
      }),
      choice('Which is the most concentrated?', '10 g of salt in 100 mL', ['1 g of salt in 100 mL', '5 g of salt in 100 mL', '10 g of salt in 1 L', '2 g of salt in 1 L'], {
        emoji: '🧂',
        why: 'The most salt in the least water.',
      }),
      match('Match each word to its meaning:', [
        ['concentrated', 'a lot of solute'],
        ['dilute', 'a little solute'],
      ], { why: 'Strong juice, or weak juice.' }),
    ]],
    ['saturated', {
      explain: [
        'A saturated solution cannot dissolve any more solute.',
        'Extra sugar just sits at the bottom of the glass.',
        'Unsaturated means it could still dissolve more.',
      ],
      video: 'sci-sol-v1',
      watchFor: 'What does saturated mean?',
    }, [
      choice('You keep stirring sugar into tea. It starts piling up at the bottom. The tea is…', 'saturated', ['unsaturated', 'pure', 'dilute', 'frozen'], {
        emoji: '🥄',
        why: 'It cannot hold any more.',
      }),
      choice('What does “saturated” mean?', 'it cannot dissolve any more', ['it has just started to boil', 'it has no solute in it at all', 'it has turned into a solid', 'it can dissolve lots more'], {
        why: 'It is full.',
      }),
      choice('A solution can still dissolve more salt. It is…', 'unsaturated', ['saturated', 'pure', 'frozen', 'an element'], {
        why: 'Not full yet.',
      }),
    ]],
    ['heat', {
      explain: [
        'Solubility is how much of something can dissolve.',
        'Heat usually helps solids dissolve: more sugar in hot tea than in iced tea.',
        'Gases are the opposite: cold water holds more gas.',
        'That is why warm pop goes flat faster.',
      ],
      video: 'sci-sol-v1',
    }, [
      choice('You want to dissolve as much sugar as you can. What should you do?', 'heat the water', ['chill the water', 'add ice to it', 'leave it in the dark', 'use a smaller glass'], {
        emoji: '🔥',
        why: 'Hot water dissolves more of most solids.',
      }),
      choice('Why does warm pop go flat faster than cold pop?', 'gases dissolve less in warm liquids', ['warm pop has a lot less sugar in it', 'cold pop has a much thicker bottle', 'gases dissolve more in warm liquids', 'the bubbles in cold pop are heavier'], {
        emoji: '🥤',
        why: 'Gas is the opposite of sugar: cold holds more.',
      }),
      choice('Warm water from a factory pours into a river. Why is this a problem for the fish?', 'warm water holds less oxygen', ['warm water has much more salt', 'warm water is far too heavy', 'warm water has too many fish', 'warm water has no particles'], {
        emoji: '🐟',
        why: 'Oxygen is a gas: less dissolves in warm water.',
      }),
    ]],
    ['faster', {
      explain: [
        'Three ways to dissolve something faster.',
        'Stir it. Heat it. Crush it into smaller pieces.',
        'Each one gets particles meeting more often.',
      ],
      video: 'sci-sol-v0',
    }, [
      choice('Which of these will NOT make sugar dissolve faster?', 'using a bigger sugar cube', ['stirring it with a spoon', 'heating up the water', 'crushing it into powder', 'shaking the jar around'], {
        emoji: '🧊',
        why: 'Smaller pieces dissolve faster, not bigger ones.',
      }),
      choice('Why does crushed salt dissolve faster than a big crystal?', 'more of its surface touches the water', ['it has much heavier particles than before', 'it is not really salt any more at that point', 'it makes the water a good deal warmer', 'it has fewer particles in it than before'], {
        why: 'More surface, more contact.',
      }),
      choice('Water is called the “universal solvent”. Why?', 'it dissolves more things than most liquids', ['it is the only liquid on planet Earth', 'it can dissolve absolutely everything', 'it is used in every kind of building', 'it is the only one with no taste at all'], {
        emoji: '🌊',
        why: 'That is why water so easily gets polluted, too.',
      }),
    ]],
  ]),

  // --- 🧫 Separating mixtures -----------------------------------------------------------
  chapter('sci-sep', [
    ['filter', {
      explain: [
        'Filtration catches solid pieces and lets the liquid through.',
        'It works for sand in water.',
        'It does NOT work for salt in water, because dissolved salt goes through.',
      ],
      video: 'sci-sep-v0',
      watchFor: 'Which mixtures can a filter separate?',
    }, [
      choice('Which is the best way to separate sand from water?', 'filter it', ['use a magnet', 'stir it hard', 'shake the jar', 'add more sand'], {
        emoji: '⏳',
        why: 'The sand stays on the filter paper.',
      }),
      choice('Why can’t a filter separate salt from salt water?', 'dissolved particles go through the holes', ['salt is much too heavy to go through it', 'the water sticks to the paper too much', 'salt particles are far too big to pass', 'filters only work on hot liquids'], {
        why: 'Dissolved salt is too tiny to catch.',
      }),
      choice('A coffee maker uses which separation method?', 'filtration', ['evaporation', 'magnetism', 'distillation', 'sifting'], {
        emoji: '☕',
        why: 'The grounds stay in the filter.',
      }),
    ]],
    ['evaporate', {
      explain: [
        'To get a dissolved solid back, evaporate the liquid.',
        'Heat salt water and the water leaves as vapour.',
        'The salt is left behind.',
      ],
      video: 'sci-sep-v2',
      watchFor: 'What is left behind when the water is gone?',
    }, [
      choice('How can you get salt back out of salt water?', 'evaporate the water', ['filter it with paper', 'use a strong magnet', 'stir it for an hour', 'shake it in a jar'], {
        emoji: '☀️',
        why: 'The water leaves and the salt stays.',
      }),
      choice('You leave a dish of salt water in the sun for a week. What do you find?', 'salt crystals in the dish', ['nothing left in the dish', 'a dish full of fresh water', 'a dish full of tiny plants', 'a dish of sand and pebbles'], {
        why: 'Solids do not evaporate with the water.',
      }),
      choice('Sea salt is made in shallow ponds. Which method do they use?', 'evaporation', ['filtration', 'magnetism', 'sifting', 'decanting'], {
        emoji: '🌊',
        why: 'The sun does the work.',
      }),
    ]],
    ['distil', {
      explain: [
        'Distillation boils a liquid, then cools the steam back into a liquid.',
        'It lets you keep the water, not just the salt.',
        'It also separates liquids with different boiling points.',
      ],
      video: 'sci-sep-v1',
    }, [
      choice('What does distillation let you keep that evaporation does not?', 'the water, as a clean liquid', ['the salt, as a large crystal', 'the heat that came from it', 'the colour of the original', 'the sand left on the bottom'], {
        emoji: '⚗️',
        why: 'Steam is cooled back into water.',
      }),
      order('Put distillation in order:', ['heat the mixture', 'the liquid turns to steam', 'cool the steam', 'collect the clean water'], {
        emoji: '🔬',
        why: 'Boil, catch, cool, collect.',
      }),
      choice('The Straw Hats run out of drinking water at sea. Which method could get fresh water from the ocean?', 'distillation', ['filtration', 'a magnet', 'a sieve', 'decanting'], {
        emoji: '🏴‍☠️',
        why: 'Boil sea water, catch the steam, cool it.',
      }),
    ]],
    ['pick', {
      explain: [
        'Choose the method by looking at the mixture.',
        'Different sizes: sieve. Magnetic and non-magnetic: magnet.',
        'Liquids that sit in layers: decant, by pouring off the top.',
      ],
      video: 'sci-sep-v1',
    }, [
      match('Match each mixture to the best method:', [
        ['iron filings in sand', 'magnet'],
        ['pebbles in sand', 'sieve'],
        ['oil on water', 'decanting'],
        ['sand in water', 'filter'],
      ], { emoji: '🧲', why: 'Look at what is different between the parts.' }),
      choice('Which is the best way to get iron nails out of sawdust?', 'a magnet', ['a bucket of hot water', 'a bottle of vinegar', 'a warm oven', 'a shallow dish'], {
        why: 'Iron is magnetic. Sawdust is not.',
      }),
      choice('How does a recycling plant separate steel cans from other waste?', 'with giant magnets', ['with big paper filters', 'by boiling all the cans', 'with very fine sieves', 'by freezing everything'], {
        emoji: '♻️',
        why: 'Same idea, much bigger.',
      }),
    ]],
    ['chromatography', {
      explain: [
        'Chromatography separates the colours in an ink.',
        'Water climbs a paper strip and carries each colour a different distance.',
        'Black marker often turns out to be many colours.',
      ],
      video: 'sci-sep-v0',
    }, [
      choice('What can chromatography separate?', 'the colours in an ink', ['sand from small gravel', 'iron filings from wood', 'salt from sea water', 'rocks from garden soil'], {
        emoji: '🎨',
        why: 'The colours travel different distances on the paper.',
      }),
      choice('A forensics team compares ink on a ransom note with a suspect’s pen. Which method fits?', 'chromatography', ['sieving', 'magnetism', 'decanting', 'evaporation'], {
        emoji: '🕵️',
        why: 'Each ink has its own pattern of colours.',
      }),
      choice('Why do the colours spread out on the paper?', 'each colour travels a different distance', ['the paper absorbs all of the black ink', 'the water pushes them all off the paper', 'the sun is changing the colour of them', 'each one is made of a different metal'], {
        why: 'They travel at different speeds, so they separate.',
      }),
    ]],
  ]),

  // --- 🔵 The particle theory of matter --------------------------------------------------
  chapter('sci-particle', [
    ['rules', {
      explain: [
        'The particle theory: all matter is made of tiny particles.',
        'There are spaces between them. They are always moving.',
        'They attract each other.',
        'More heat means they move faster.',
      ],
      video: 'sci-particle-v1',
      watchFor: 'What are particles always doing?',
    }, [
      choice('According to the particle theory, particles are…', 'always moving', ['always still', 'always hot', 'always round', 'always visible'], {
        emoji: '🔵',
        why: 'Even in a solid, they vibrate.',
      }),
      choice('Which is NOT part of the particle theory?', 'particles get bigger when they are heated', ['all matter is made of tiny particles', 'there are spaces between the particles', 'the particles attract one another', 'particles move faster as they heat up'], {
        why: 'They speed up and spread out. They do not grow.',
      }),
      choice('You add a spoon of sugar to a full cup of tea and it doesn’t overflow. Why?', 'sugar fits in the spaces between particles', ['the sugar has no mass of its own at all', 'the tea loses some of its particles', 'the water is shrinking as it warms up', 'the sugar turns into pure energy there'], {
        emoji: '🍵',
        why: 'There are spaces between particles.',
      }),
    ]],
    ['states', {
      explain: [
        'Solid: particles packed tight, vibrating in place.',
        'Liquid: close together, but sliding past one another.',
        'Gas: far apart, moving fast in all directions.',
      ],
      video: 'sci-particle-v0',
      watchFor: 'Compare the particles in a solid, a liquid and a gas.',
    }, [
      match('Match each state to its particles:', [
        ['solid', 'packed tight, vibrating in place'],
        ['liquid', 'close, but sliding past each other'],
        ['gas', 'far apart and moving fast'],
      ], { emoji: '🧊', why: 'That explains how each one acts.' }),
      choice('Why does a liquid take the shape of its container?', 'its particles slide past each other', ['its particles are locked in place', 'its particles are all very far apart', 'its particles are made of pure water', 'its particles have stopped moving'], {
        why: 'Close, but free to slide.',
      }),
      choice('Why can you squash a gas but not a solid?', 'gas has big spaces between its particles', ['gas particles are much larger than those', 'solid particles are all a lot bigger', 'gas particles are not really matter', 'solid particles have stopped moving'], {
        emoji: '🎈',
        why: 'That is why you can pump air into a ball.',
      }),
    ]],
    ['changes', {
      explain: [
        'Melting: solid to liquid. Freezing: liquid to solid.',
        'Evaporation: liquid to gas. Condensation: gas to liquid.',
        'Sublimation: solid straight to gas, like dry ice.',
      ],
      video: 'sci-particle-v2',
    }, [
      match('Match each change to its name:', [
        ['solid → liquid', 'melting'],
        ['liquid → solid', 'freezing'],
        ['liquid → gas', 'evaporation'],
        ['gas → liquid', 'condensation'],
      ], { emoji: '🔄', why: 'Add heat to go right, take it away to go back.' }),
      choice('Water droplets form on a cold glass. What is this change?', 'condensation', ['evaporation', 'melting', 'sublimation', 'freezing'], {
        emoji: '🥤',
        why: 'Water vapour in the air meets the cold glass.',
      }),
      choice('Dry ice turns straight into gas. What is this called?', 'sublimation', ['condensation', 'melting', 'freezing', 'evaporation'], {
        why: 'Solid to gas, skipping the liquid.',
      }),
    ]],
    ['heat-speed', {
      explain: [
        'Heat gives particles more energy.',
        'They move faster and spread out.',
        'Enough heat, and they break free into the next state.',
      ],
      video: 'sci-particle-v2',
    }, [
      choice('What happens to particles when you heat them?', 'they move faster and spread out', ['they stop moving and pack in', 'they get bigger and stick together', 'they turn into a different element', 'they slow down and become heavier'], {
        emoji: '🔥',
        why: 'More energy, more motion.',
      }),
      choice('Why does a puddle dry up faster on a hot day?', 'its particles move faster and escape', ['the ground on a hot day is thirsty', 'the sun pulls particles up with gravity', 'hot air holds less water than cold', 'the puddle sinks a lot further down'], {
        emoji: '☀️',
        why: 'Fast particles break free into the air.',
      }),
      choice('When you cool a gas enough, what happens to its particles?', 'they slow down and come together', ['they speed up and move far apart', 'they disappear and leave nothing', 'they stay exactly as they were', 'they turn into a different gas'], {
        why: 'That is condensation.',
      }),
    ]],
    ['smell', {
      explain: [
        'Particles spread out on their own: that is diffusion.',
        'That is why you can smell food from another room.',
        'Diffusion is faster in warm air and in gases.',
      ],
      video: 'sci-particle-v1',
    }, [
      choice('You smell pizza from the next room. How does the smell reach you?', 'particles spread through the air', ['your nose reaches out towards it', 'the pizza moves into your room', 'sound waves carry it to your nose', 'the light from the oven carries it'], {
        emoji: '🍕',
        why: 'That is diffusion.',
      }),
      choice('A drop of food colouring slowly spreads through a glass of water without being stirred. Why?', 'its particles are always moving', ['the glass is pushing on the drop', 'the water wants to be a new colour', 'someone must have shaken the glass', 'it is much heavier than the water'], {
        why: 'Moving particles spread out.',
      }),
      choice('Food colouring will spread fastest in…', 'hot water', ['iced water', 'cool water', 'cold water', 'frozen water'], {
        why: 'Faster particles spread faster.',
      }),
    ]],
  ]),

  // --- 🚰 Water quality and treatment ----------------------------------------------------
  chapter('sci-water', [
    ['steps', {
      explain: [
        'Toronto takes its water from Lake Ontario, far out from the shore.',
        'Screens catch big things. Chemicals make dirt clump up.',
        'The clumps settle, then the water is filtered.',
        'Chlorine kills germs. Then it reaches your tap.',
      ],
      video: 'sci-water-v0',
      watchFor: 'What happens to dirty water, step by step?',
    }, [
      order('Put these treatment steps in order:', ['screens catch big objects', 'dirt clumps together', 'clumps settle to the bottom', 'water is filtered', 'chlorine kills germs'], {
        emoji: '🚰',
        why: 'From big things to small things to germs.',
      }),
      choice('Where does Toronto’s drinking water come from?', 'Lake Ontario', ['Lake Huron', 'Lake Simcoe', 'deep wells', 'the Don River'], {
        emoji: '🌊',
        why: 'It comes in through pipes that reach far out into the lake.',
      }),
      choice('What is chlorine added for?', 'to kill germs', ['to add colour', 'to make it cold', 'to add a flavour', 'to make it thick'], {
        why: 'A small amount keeps water safe all the way to your tap.',
      }),
    ]],
    ['coagulation', {
      explain: [
        'Tiny dirt bits are too small to filter easily.',
        'A chemical makes them clump into bigger pieces called floc.',
        'The heavy clumps sink to the bottom. That is sedimentation.',
      ],
      video: 'sci-water-v0',
    }, [
      choice('Why add chemicals that make dirt clump up?', 'clumps are easier to remove', ['clumps taste better in water', 'clumps add minerals to water', 'clumps kill the germs in it', 'clumps turn the water blue'], {
        emoji: '🧲',
        why: 'Bigger, heavier pieces sink or get caught.',
      }),
      choice('What is sedimentation?', 'heavy clumps sinking to the bottom', ['water being boiled in big tanks', 'chlorine killing germs in a pipe', 'water rising up through the sand', 'fish swimming into the water plant'], {
        why: 'Left alone, the heavy bits settle.',
      }),
      match('Match each step to what it does:', [
        ['coagulation', 'makes dirt clump together'],
        ['sedimentation', 'lets the clumps sink'],
        ['filtration', 'catches what is left'],
        ['disinfection', 'kills the germs'],
      ], { why: 'Four jobs, four steps.' }),
    ]],
    ['walkerton', {
      explain: [
        'In May 2000, E. coli bacteria got into the water in Walkerton, Ontario.',
        'Seven people died and thousands got sick.',
        'The water had not been tested and treated properly.',
        'Ontario then made its water rules much tougher.',
      ],
      video: 'sci-water-v2',
    }, [
      choice('What happened in Walkerton, Ontario, in 2000?', 'E. coli in the water killed seven people', ['a dam burst and flooded the whole town', 'the town’s water all turned to salt water', 'a chemical spill burned down the plant', 'the water pipes froze for a whole winter'], {
        emoji: '⚠️',
        why: 'It is why Ontario’s water rules are so strict today.',
      }),
      choice('What did Ontario do after Walkerton?', 'it made the water rules much tougher', ['it told everyone to stop drinking water', 'it closed down all of its water plants', 'it moved the town to another location', 'it banned farming across all of Ontario'], {
        why: 'More testing, better-trained operators, stricter laws.',
      }),
      choice('What is the main lesson of Walkerton?', 'safe water needs testing and care', ['small towns should not have any water', 'bacteria cannot ever survive in water', 'clear-looking water is always safe', 'chlorine is a danger to everybody'], {
        why: 'Water can look perfectly clean and still be dangerous.',
      }),
    ]],
    ['sewage', {
      explain: [
        'Used water goes down the drain to a wastewater plant.',
        'Solids are removed, bacteria break down waste, and the water is cleaned.',
        'Then it goes back to the lake.',
        'What you pour down the drain matters.',
      ],
      video: 'sci-water-v0',
      watchFor: 'What happens to water after it goes down the drain?',
    }, [
      choice('Where does the water from your sink go?', 'to a plant that cleans it', ['straight into your yard', 'right back to your tap', 'down to the centre of Earth', 'it just disappears'], {
        emoji: '🚿',
        why: 'Then it returns to the lake.',
      }),
      choice('Why shouldn’t you pour paint or oil down the drain?', 'it can pass through and harm the lake', ['it will make the pipes get too warm', 'it will change the colour of the tap', 'it can turn the sewers into gasoline', 'it is the same as watering the plants'], {
        why: 'Treatment plants cannot remove everything.',
      }),
      choice('What helps break down the waste in a treatment plant?', 'helpful bacteria', ['large goldfish', 'bright sunlight', 'loud machines', 'cold snow'], {
        emoji: '🦠',
        why: 'Living things doing the same job as in nature.',
      }),
    ]],
    ['testing', {
      explain: [
        'Clear does not mean clean.',
        'Scientists test water for bacteria, chemicals, metals and pH.',
        'Some pipes in old houses contain lead, which is dangerous, especially for children.',
      ],
      video: 'sci-water-v2',
    }, [
      choice('Water looks perfectly clear. Is it safe?', 'not always — it needs testing', ['yes — clear means it’s safe', 'yes — unless it smells bad', 'no — clear water is never safe', 'yes — if you see it flowing'], {
        emoji: '🔬',
        why: 'Germs and chemicals are invisible.',
      }),
      choice('Why might an old house have unsafe tap water?', 'its pipes may contain lead', ['its pipes may be too wide', 'its taps may be too shiny', 'its rooms may be too cold', 'its roof may be too steep'], {
        why: 'Lead can leach out of old pipes.',
      }),
      choice('Which is something scientists test water for?', 'bacteria', ['its age', 'its mood', 'its name', 'its size'], {
        why: 'Plus chemicals, metals and pH.',
      }),
    ]],
  ]),
]
