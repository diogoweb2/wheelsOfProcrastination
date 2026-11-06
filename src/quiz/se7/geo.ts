// §14d — Geography: Physical Patterns in a Changing World, and Natural Resources.
// Written by hand in session. See ./build.ts for how an idea and its versions work.
import { chapter, choice, match, order } from './build'

export const GEO = [
  // --- 🗺️ Reading a physical map -----------------------------------------------------
  chapter('geo-a-map', [
    ['lat-long', {
      explain: [
        'Latitude lines run east–west and measure how far north or south you are of the equator.',
        'Longitude lines run north–south and measure how far east or west you are of the Prime Meridian.',
        'Two numbers find any place on Earth. Toronto is about 44° N, 79° W.',
      ],
      video: 'geo-a-map-v2',
      watchFor: 'What do the lines on a map help you find?',
    }, [
      choice('What does latitude measure?', 'how far north or south of the equator', ['how far east or west of the Prime Meridian', 'how high a place is above sea level', 'how many people live in a place', 'how far a place is from the nearest ocean'], {
        emoji: '🌐',
        why: 'Think of a ladder: latitude lines are the rungs.',
      }),
      match('Match each line to where it sits:', [
        ['equator', '0° latitude'],
        ['Prime Meridian', '0° longitude'],
      ], { emoji: '🗺️', why: 'The two starting lines.' }),
      choice('You are at 44° N, 79° W. Which city are you near?', 'Toronto', ['Sydney', 'Tokyo', 'Cairo', 'Lima'], {
        emoji: '📍',
        why: 'Sydney is south of the equator, and Tokyo and Cairo are east of the Prime Meridian.',
      }),
    ]],
    ['scale', {
      explain: [
        'A map’s scale shows how real distance shrinks on paper.',
        'If 1 cm = 10 km, then 3 cm on the map is 30 km in real life.',
        'Large scale shows a small area in detail. Small scale shows a big area with less detail.',
      ],
      video: 'geo-a-map-v2',
    }, [
      choice('The scale is 1 cm = 10 km. Two towns are 4 cm apart on the map. How far apart are they?', '40 km', ['4 km', '14 km', '400 km', '10 km'], {
        emoji: '📏',
        why: '4 × 10 km.',
      }),
      choice('What does a map’s scale tell you?', 'how map distance compares to real distance', ['how high up each of the mountains really is', 'what all of the symbols on the map mean', 'which direction north is on the map page', 'how old the map is and who first drew it'], {
        why: 'Without a scale, you cannot measure anything.',
      }),
      choice('Which map shows the most detail of your street?', 'a map of your neighbourhood', ['a map of all of Canada', 'a map of North America', 'a map of the whole world', 'a map of all of Ontario'], {
        why: 'A small area, shown large.',
      }),
    ]],
    ['legend', {
      explain: [
        'A legend explains the map’s symbols and colours.',
        'A compass rose shows direction: north, east, south, west.',
        'Always look at these before you try to read a map.',
      ],
      video: 'geo-a-map-v1',
    }, [
      choice('What is a map’s legend for?', 'explaining its symbols and colours', ['telling a story about the place', 'showing the map’s north direction', 'naming the person who drew it', 'measuring the distance of a road'], {
        emoji: '🔑',
        why: 'Also called a key.',
      }),
      choice('What does a compass rose show?', 'direction', ['distance', 'height', 'climate', 'population'], {
        emoji: '🧭',
        why: 'N, E, S, W.',
      }),
      choice('On a map, you see a small blue line ending in a large blue shape. Without reading it, what is it likely to be?', 'a river flowing into a lake', ['a highway going to a town', 'a border between two lands', 'a railway going to a mine', 'a mountain range in winter'], {
        emoji: '🏞️',
        why: 'Maps use blue for water.',
      }),
    ]],
    ['height', {
      explain: [
        'A physical map shows the land’s shape.',
        'Colours often show height: green low, brown high, white highest.',
        'Contour lines join points of the same height. Close together means steep.',
      ],
      video: 'geo-a-map-v1',
      watchFor: 'How does a physical map show height?',
    }, [
      choice('Contour lines are very close together. What does that mean?', 'the land is very steep', ['the land is very flat', 'the land is under water', 'the land is a large city', 'the land is a dry desert'], {
        emoji: '⛰️',
        why: 'Height changes fast over a short distance.',
      }),
      choice('On a physical map, what do brown and white areas usually show?', 'high mountains', ['deep oceans', 'big cities', 'hot deserts', 'wide rivers'], {
        emoji: '🏔️',
        why: 'Green is low, brown is high, and white is highest.',
      }),
      match('Match each map to what it shows:', [
        ['physical map', 'mountains, rivers and land height'],
        ['political map', 'countries, borders and cities'],
      ], { why: 'Land, or lines people drew.' }),
    ]],
    ['distort', {
      explain: [
        'Earth is round. A flat map has to stretch it.',
        'On many world maps, Greenland looks as big as Africa.',
        'In fact, Africa is about 14 times bigger.',
        'Every flat map gets something wrong.',
      ],
      video: 'geo-a-map-v0',
    }, [
      choice('Why does Greenland look huge on many world maps?', 'a round Earth is stretched flat', ['it is the world’s biggest place', 'it really is as big as Africa', 'mapmakers love it very much', 'ice makes the land look bigger'], {
        emoji: '🧊',
        why: 'Places near the poles get stretched the most.',
      }),
      choice('Which is the most accurate way to show Earth’s shape?', 'a globe', ['a flat wall map', 'a road map', 'a city map', 'a mall map'], {
        emoji: '🌍',
        why: 'A round model of a round planet.',
      }),
      choice('Which is true about flat world maps?', 'every one of them distorts something', ['only very old ones are ever wrong', 'they show the true sizes of land', 'they are more accurate than globes', 'no flat map has any errors at all'], {
        why: 'You cannot flatten a ball without stretching it.',
      }),
    ]],
  ]),

  // --- 🏔️ Landforms and plate tectonics ----------------------------------------------
  chapter('geo-a-land', [
    ['plates', {
      explain: [
        'Earth’s crust is broken into huge pieces called plates.',
        'They float on hot, soft rock and move a few centimetres a year.',
        'That is about as fast as your fingernails grow.',
      ],
      video: 'geo-a-land-v2',
      watchFor: 'How fast do plates move, and what moves them?',
    }, [
      choice('About how fast do tectonic plates move?', 'as fast as your nails grow', ['as fast as a person walks', 'as fast as a car on a road', 'as fast as a river in spring', 'they do not move at all'], {
        emoji: '💅',
        why: 'A few centimetres a year.',
      }),
      choice('What are tectonic plates?', 'huge pieces of Earth’s crust', ['thick layers of ocean water', 'the rings around Earth’s core', 'big sheets of ice at the poles', 'lines drawn on a world map'], {
        emoji: '🧩',
        why: 'The crust is like a cracked eggshell.',
      }),
      choice('What do the plates sit on?', 'hot, soft rock in the mantle', ['a thick layer of salt water', 'a very large sheet of solid ice', 'the hollow inside of the planet', 'a deep layer of dry sand'], {
        why: 'Slow movement in the mantle carries them along.',
      }),
    ]],
    ['boundaries', {
      explain: [
        'Plates meet in three ways.',
        'Convergent: they push together, making mountains.',
        'Divergent: they pull apart, making new crust.',
        'Transform: they slide past each other, making earthquakes.',
      ],
      video: 'geo-a-land-v1',
    }, [
      match('Match each boundary to what the plates do:', [
        ['convergent', 'push together'],
        ['divergent', 'pull apart'],
        ['transform', 'slide past each other'],
      ], { emoji: '↔️', why: 'Three ways for plates to meet.' }),
      choice('The Himalayas formed when India crashed into Asia. What kind of boundary is that?', 'convergent', ['divergent', 'transform', 'parallel', 'equatorial'], {
        emoji: '🏔️',
        why: 'Mountains are a collision in slow motion.',
      }),
      choice('California’s San Andreas Fault is where two plates slide past each other. What kind of boundary is that?', 'transform', ['convergent', 'divergent', 'volcanic', 'polar'], {
        why: 'They grind past, and they cause earthquakes.',
      }),
    ]],
    ['mountains', {
      explain: [
        'Mountains grow where plates collide.',
        'The Rockies are young and tall.',
        'The Appalachians are old and worn down by wind, rain and ice.',
      ],
      video: 'geo-a-land-v0',
      watchFor: 'What wears mountains down?',
    }, [
      choice('Why are the Appalachians lower and rounder than the Rockies?', 'they are older and more worn down', ['they are made out of soft sand', 'they are closer to the ocean', 'they get a lot less snow on them', 'they were built by people'], {
        emoji: '⛰️',
        why: 'Erosion takes time.',
      }),
      choice('What is erosion?', 'wind, water or ice wearing land away', ['two plates crashing into each other', 'lava flowing out of an open volcano', 'a mountain slowly growing taller', 'a place where the crust pulls apart'], {
        why: 'Slow, but it beats any mountain in the end.',
      }),
      choice('Which of these mountain ranges is in western Canada?', 'the Rockies', ['the Alps', 'the Andes', 'the Himalayas', 'the Urals'], {
        emoji: '🇨🇦',
        why: 'They run through Alberta and B.C.',
      }),
    ]],
    ['canada', {
      explain: [
        'The Canadian Shield is old, hard rock around Hudson Bay, full of lakes and minerals.',
        'The Prairies are flat plains, once the floor of an ancient sea.',
        'The Great Lakes were carved out by glaciers.',
      ],
      video: 'geo-a-land-v0',
    }, [
      choice('What carved out the Great Lakes?', 'huge glaciers', ['giant earthquakes', 'erupting volcanoes', 'ancient rivers of lava', 'meteors hitting Earth'], {
        emoji: '🧊',
        why: 'Ice sheets scraped them out, then melted.',
      }),
      match('Match each region to what it is like:', [
        ['Canadian Shield', 'ancient rock, lakes and minerals'],
        ['Prairies', 'flat plains and farmland'],
        ['Rockies', 'tall, young mountains'],
      ], { emoji: '🗺️', why: 'Canada’s landforms have very different stories.' }),
      choice('Which region has many of Canada’s mines?', 'the Canadian Shield', ['the Prairie grasslands', 'the Toronto waterfront', 'the Bay of Fundy tides', 'the Niagara fruit belt'], {
        emoji: '⛏️',
        why: 'Gold, nickel, copper: the Shield is full of minerals.',
      }),
    ]],
    ['pangaea', {
      explain: [
        'Long ago, the continents were joined in one supercontinent: Pangaea.',
        'Plates carried them apart over about 200 million years.',
        'South America and Africa still fit together like puzzle pieces.',
      ],
      video: 'geo-a-land-v1',
    }, [
      choice('What was Pangaea?', 'one giant supercontinent', ['the first ocean on Earth', 'a volcano in South America', 'an early kind of dinosaur', 'the oldest city in the world'], {
        emoji: '🌍',
        why: 'All the continents, joined.',
      }),
      choice('Which clue suggests the continents were once joined?', 'Africa and South America fit together', ['Canada and Russia are both very cold', 'Australia is an island in the south', 'the Moon goes around Earth every month', 'Antarctica has very few people on it'], {
        emoji: '🧩',
        why: 'Their coasts match, and so do their fossils.',
      }),
      choice('Are the continents still moving?', 'yes, a few centimetres a year', ['no, they stopped millions of years ago', 'no, they never moved at all', 'yes, about a kilometre a day', 'only during very big earthquakes'], {
        why: 'The Atlantic is getting slowly wider.',
      }),
    ]],
  ]),

  // --- 🌤️ Climate and climate zones ---------------------------------------------------
  chapter('geo-a-climate', [
    ['weather-climate', {
      explain: [
        'Weather is what is happening outside today.',
        'Climate is the average weather of a place over about 30 years.',
        'You check the weather to dress for today. Climate tells you what to pack for the year.',
      ],
      video: 'geo-a-climate-v0',
      watchFor: 'What is the difference between weather and climate?',
    }, [
      choice('“It rained in Toronto this morning.” Is that weather or climate?', 'weather', ['climate', 'latitude', 'altitude', 'erosion'], {
        emoji: '🌧️',
        why: 'It is what happened today.',
      }),
      choice('“Toronto has cold winters and warm summers.” Is that weather or climate?', 'climate', ['weather', 'latitude', 'longitude', 'tectonics'], {
        why: 'It is the long-term pattern.',
      }),
      choice('About how many years of data do you need to describe a climate?', 'about 30 years', ['about 3 days', 'about 1 week', 'about 1 month', 'about 1 year'], {
        why: 'Long enough to smooth out odd years.',
      }),
    ]],
    ['latitude', {
      explain: [
        'Near the equator, sunlight hits straight on and is strong.',
        'Near the poles, the same sunlight spreads over more ground.',
        'So the further from the equator, the colder it is.',
      ],
      video: 'geo-a-climate-v2',
    }, [
      choice('Why is it hotter near the equator?', 'sunlight hits it more directly', ['it is closer to the Earth’s core', 'the Earth spins slower up there', 'the sun is only over the equator', 'there are more oceans at the poles'], {
        emoji: '☀️',
        why: 'Same sunlight, smaller area, more heat.',
      }),
      choice('Which city is usually the coldest?', 'Iqaluit', ['Toronto', 'Miami', 'Mexico City', 'Rio de Janeiro'], {
        emoji: '🥶',
        why: 'The furthest from the equator.',
      }),
      choice('You shine a flashlight straight at a wall, then at an angle. What happens to the light?', 'it spreads out and gets weaker', ['it gets a lot stronger on the wall', 'it stops working once it is tilted', 'it changes colour to a warm yellow', 'it stays exactly the same as before'], {
        emoji: '🔦',
        why: 'That is why the poles are cold.',
      }),
    ]],
    ['altitude', {
      explain: [
        'The higher you go, the colder it gets.',
        'That is why mountains can have snow even near the equator.',
        'Mount Kilimanjaro, in Africa, has had ice on top.',
      ],
      video: 'geo-a-climate-v1',
    }, [
      choice('Why is there snow on Mount Kilimanjaro, near the equator?', 'high places are colder', ['it is near the North Pole', 'snow is brought there by planes', 'equator winds are frozen', 'the mountain is made of ice'], {
        emoji: '🗻',
        why: 'Altitude beats latitude.',
      }),
      choice('Two towns are at the same latitude. One is high in the mountains. Which is colder?', 'the mountain town', ['the town on the plain', 'they are the same', 'the bigger town', 'it cannot be known'], {
        why: 'Height makes the temperature drop.',
      }),
      choice('What does “altitude” mean?', 'height above sea level', ['distance from the equator', 'distance from the ocean', 'amount of rain in a year', 'the number of mountains'], {
        why: 'Don’t mix it up with latitude.',
      }),
    ]],
    ['water-wind', {
      explain: [
        'Being near water makes a place milder.',
        'Wind brings the weather from where it has been.',
        'Mountains force wet air up. Rain falls on one side and the other side stays dry: a rain shadow.',
      ],
      video: 'geo-a-climate-v1',
    }, [
      choice('Vancouver and Winnipeg are at almost the same latitude. Why are their climates so different?', 'Vancouver is beside an ocean', ['Vancouver is a much bigger city', 'Winnipeg has more tall buildings', 'Winnipeg is further from the sun', 'Vancouver is on a higher mountain'], {
        emoji: '🌊',
        why: 'Water keeps winters mild.',
      }),
      choice('Wet air rises over a mountain. The far side stays dry. What is this called?', 'a rain shadow', ['a warm front', 'a sea breeze', 'a lake effect', 'a heat wave'], {
        emoji: '⛰️',
        why: 'The rain falls on the windward side.',
      }),
      choice('Which side of a mountain range gets the most rain?', 'the side facing the wind', ['the side away from the wind', 'both sides get the same', 'the north side, always', 'neither of them gets rain'], {
        why: 'The air rises, cools and drops its water there.',
      }),
    ]],
    ['zones', {
      explain: [
        'Earth has big climate zones.',
        'Tropical: hot and wet, near the equator.',
        'Dry: deserts. Temperate: four seasons, like Toronto.',
        'Polar: very cold, near the poles.',
      ],
      video: 'geo-a-climate-v2',
      watchFor: 'What are Earth’s main climate zones?',
    }, [
      match('Match each place to its climate zone:', [
        ['Amazon rainforest', 'tropical'],
        ['Sahara', 'dry'],
        ['southern Ontario', 'temperate'],
        ['Nunavut', 'polar'],
      ], { emoji: '🌎', why: 'Four big zones.' }),
      choice('Which climate zone has four clear seasons?', 'temperate', ['tropical', 'polar', 'desert', 'rainforest'], {
        emoji: '🍂',
        why: 'That is us.',
      }),
      choice('What makes a place a desert?', 'very little rain', ['very hot weather', 'lots of sand dunes', 'lots of tall cactus', 'lots of strong sun'], {
        emoji: '🏜️',
        why: 'Antarctica is a desert too.',
      }),
    ]],
  ]),

  // --- 🌋 Earthquakes, volcanoes, hurricanes ----------------------------------------------
  chapter('geo-a-hazard', [
    ['earthquake', {
      explain: [
        'Plates get stuck, and stress builds up in the rock.',
        'When it snaps, energy shakes the ground: an earthquake.',
        'The focus is where it starts underground. The epicentre is the point right above it.',
      ],
      video: 'geo-a-hazard-v2',
      watchFor: 'What makes the ground shake?',
    }, [
      choice('What causes most earthquakes?', 'stress released along plate boundaries', ['the moon pulling on the ocean tides', 'heavy rains soaking into the ground', 'very strong winds blowing over land', 'mining deep into the Canadian Shield'], {
        emoji: '🌐',
        why: 'Stuck plates suddenly slip.',
      }),
      choice('What is the epicentre?', 'the point on the surface above the start', ['the deepest point inside of the planet', 'the place where a volcano is erupting', 'the tallest wave of a large tsunami', 'the middle of the country it happens in'], {
        why: 'The place on the ground directly over the focus.',
      }),
      order('Put these in order:', ['plates get stuck', 'stress builds up', 'the rock suddenly slips', 'the ground shakes'], {
        emoji: '⏳',
        why: 'Slow, slow, then all at once.',
      }),
    ]],
    ['ring', {
      explain: [
        'The Ring of Fire is a horseshoe of plate boundaries around the Pacific Ocean.',
        'Most of the world’s earthquakes and volcanoes happen there.',
        'Japan, Chile, Indonesia and coastal B.C. are on it.',
      ],
      video: 'geo-a-hazard-v1',
    }, [
      choice('Where is the Ring of Fire?', 'around the Pacific Ocean', ['around the Atlantic Ocean', 'around the Indian Ocean', 'around the North Pole', 'around the Great Lakes'], {
        emoji: '🌋',
        why: 'A horseshoe of plate boundaries.',
      }),
      choice('Why does the Ring of Fire have so many volcanoes?', 'it follows plate boundaries', ['it has the hottest weather', 'it is close to the equator', 'it gets the most sunlight', 'it has the deepest lakes'], {
        why: 'Volcanoes and quakes follow the edges of plates.',
      }),
      choice('Which part of Canada is at the most risk from a big earthquake?', 'coastal British Columbia', ['southern Saskatchewan', 'central Manitoba', 'Prince Edward Island', 'northern Alberta'], {
        emoji: '🇨🇦',
        why: 'B.C. is on the Ring of Fire.',
      }),
    ]],
    ['volcano', {
      explain: [
        'Magma is melted rock underground. Lava is melted rock above ground.',
        'Pressure pushes it up through a vent, and the volcano erupts.',
        'Ash can cover towns and stop planes. Volcanic soil is very fertile.',
      ],
      video: 'geo-a-hazard-v0',
      watchFor: 'What is the difference between magma and lava?',
    }, [
      match('Match each word to what it means:', [
        ['magma', 'melted rock underground'],
        ['lava', 'melted rock above ground'],
      ], { emoji: '🌋', why: 'Same stuff, different place.' }),
      choice('Why do people farm near volcanoes?', 'volcanic soil is very fertile', ['the lava keeps the crops warm', 'land near one is always free', 'volcanoes make a lot of rain', 'ash keeps the insects away'], {
        emoji: '🌱',
        why: 'The ash breaks down into rich soil.',
      }),
      choice('What makes a volcano erupt?', 'pressure pushing magma up', ['rain falling into the crater', 'strong winds from the ocean', 'the moon pulling on the lava', 'people mining near the base'], {
        why: 'Think of shaking a bottle of pop.',
      }),
    ]],
    ['hurricane', {
      explain: [
        'A hurricane forms over warm ocean water.',
        'Warm, wet air rises and starts to spin.',
        'The middle, the eye, is calm. The worst winds are right around it.',
        'Over land or cold water, it loses energy.',
      ],
      video: 'geo-a-hazard-v1',
    }, [
      choice('What fuels a hurricane?', 'warm ocean water', ['cold mountain air', 'dry desert sand', 'the Great Lakes', 'moving plates'], {
        emoji: '🌀',
        why: 'That is why they fade out over land.',
      }),
      choice('What is it like in the eye of a hurricane?', 'calm', ['the windiest', 'very cold', 'very snowy', 'on fire'], {
        emoji: '👁️',
        why: 'It is calm in the middle, but the worst is all around it.',
      }),
      choice('Why does a hurricane weaken once it reaches land?', 'it is cut off from warm water', ['the buildings block all the wind', 'the people on land stop the storm', 'the ground pulls the storm downward', 'the trees soak up all of the wind'], {
        why: 'No warm water, no fuel.',
      }),
    ]],
    ['disaster', {
      explain: [
        'A natural hazard becomes a disaster when it hurts people.',
        'The same earthquake can kill thousands in one place and few in another.',
        'Strong buildings, warnings and rescue plans make the difference.',
        'Poorer places usually suffer the most.',
      ],
      video: 'geo-a-hazard-v1',
    }, [
      choice('An earthquake strikes an empty desert. Is it a natural disaster?', 'no — nobody was hurt', ['yes — all quakes are', 'yes — if it is large', 'no — quakes never are', 'only if it rains after'], {
        emoji: '🏜️',
        why: 'A hazard becomes a disaster when it harms people.',
      }),
      choice('Why might the same earthquake kill far more people in one country than another?', 'weaker buildings and less preparation', ['the ground is a different colour there', 'the people there are a lot heavier', 'earthquakes prefer some countries', 'that country has fewer tall mountains'], {
        why: 'Japan builds for earthquakes and drills for them.',
      }),
      choice('What is the best thing to do during an earthquake?', 'drop, cover and hold on', ['run outside as fast as you can', 'stand next to a big window', 'get into the elevator quickly', 'climb to the top of the stairs'], {
        emoji: '🛡️',
        why: 'Falling objects are the main danger.',
      }),
    ]],
  ]),

  // --- 🏙️ Where people live, and why ---------------------------------------------------
  chapter('geo-a-where', [
    ['density', {
      explain: [
        'Population density means how many people live in a certain area.',
        'Density = people ÷ area.',
        'Canada is huge, with few people: low density.',
        'Bangladesh is small, with many people: very high density.',
      ],
      video: 'geo-a-where-v2',
    }, [
      choice('What does population density measure?', 'how crowded an area is', ['how old the people are', 'how rich the people are', 'how big the country is', 'how fast the people move'], {
        emoji: '👥',
        why: 'People per square kilometre.',
      }),
      choice('100 people live on 10 km². What is the density?', '10 people per km²', ['1,000 people per km²', '110 people per km²', '90 people per km²', '1 person per km²'], {
        emoji: '🧮',
        why: '100 ÷ 10.',
      }),
      choice('Which of these has the highest population density?', 'Bangladesh', ['Canada', 'Australia', 'Russia', 'Mongolia'], {
        why: 'A lot of people on a small area.',
      }),
    ]],
    ['why-here', {
      explain: [
        'People settle where life is easier.',
        'Fresh water, flat land, good soil, mild climate, and ways to trade.',
        'Rivers and coasts have always drawn cities.',
      ],
      video: 'geo-a-where-v1',
      watchFor: 'Why does where you are shape how you live?',
    }, [
      choice('Which of these usually draws people to settle in a place?', 'fresh water and flat land', ['high cliffs and thick ice', 'dry sand and strong winds', 'deep swamps and thin soil', 'steep rock and cold winds'], {
        emoji: '🏘️',
        why: 'Water, food, flat land for building.',
      }),
      choice('Why did so many old cities grow up on rivers?', 'water, food and easy trade', ['rivers kept away all bad weather', 'they could not be built on land', 'kings loved the sound of water', 'rivers made the land much higher'], {
        emoji: '🛶',
        why: 'Rivers were the first highways.',
      }),
      choice('Almost all Egyptians live along one thin strip of land. Why?', 'the Nile gives water in a desert', ['the rest of the country is ocean', 'the government makes them live there', 'the mountains are too cold for people', 'the rest of Egypt is a big forest'], {
        emoji: '🐫',
        why: 'About 95% of Egyptians live near the Nile.',
      }),
    ]],
    ['canada', {
      explain: [
        'Most Canadians live within about 160 km of the U.S. border.',
        'The south is warmer, with better farmland and more jobs.',
        'The Windsor–Quebec City corridor has more than half of Canada’s people.',
      ],
      video: 'geo-a-where-v1',
    }, [
      choice('Where do most Canadians live?', 'near the U.S. border', ['near the Arctic Ocean', 'in the Rocky Mountains', 'around Hudson Bay', 'in the Canadian Shield'], {
        emoji: '🇨🇦',
        why: 'Warmer climate, better land, more jobs.',
      }),
      choice('Why do so few people live in northern Canada?', 'harsh climate and few jobs', ['it is against the law to', 'the land there is all taken', 'nobody knows it is there', 'it costs nothing to live there'], {
        emoji: '❄️',
        why: 'Long winters, poor soil, few jobs.',
      }),
      choice('Which area holds more than half of all Canadians?', 'the Windsor–Quebec City corridor', ['the Vancouver–Calgary corridor', 'the Halifax–St. John’s corridor', 'the Regina–Winnipeg corridor', 'the Yellowknife–Whitehorse corridor'], {
        why: 'A thin strip along the Great Lakes and the St. Lawrence.',
      }),
    ]],
    ['urban', {
      explain: [
        'Urban means city. Rural means countryside. Suburban means the edges of a city.',
        'More than half the world now lives in cities.',
        'About 8 in 10 Canadians are urban.',
      ],
      video: 'geo-a-where-v2',
      watchFor: 'What makes urban, suburban and rural areas different?',
    }, [
      match('Match each word to what it means:', [
        ['urban', 'in a city'],
        ['suburban', 'at the edge of a city'],
        ['rural', 'in the countryside'],
      ], { emoji: '🏙️', why: 'Three kinds of place.' }),
      choice('Why do people move from rural areas to cities?', 'jobs, schools and services', ['lower rent and bigger yards', 'more farms and open space', 'quieter streets and less noise', 'fewer people and more nature'], {
        emoji: '🏢',
        why: 'Cities are where most jobs are.',
      }),
      choice('About how many Canadians live in urban areas?', 'about 8 in 10', ['about 1 in 10', 'about 3 in 10', 'about 5 in 10', 'all of them'], {
        why: 'One of the most urban countries in the world.',
      }),
    ]],
    ['push-pull', {
      explain: [
        'People also move because of war, drought or a lack of jobs: those are pushes.',
        'Safety, work and family draw them in: those are pulls.',
        'Toronto is one of the most diverse cities in the world because of this.',
      ],
      video: 'geo-a-where-v2',
    }, [
      match('Sort each one:', [
        ['a war at home', 'push'],
        ['a job in another city', 'pull'],
      ], { emoji: '🧲', why: 'Pushed out, or pulled in.' }),
      choice('A long drought ruins a village’s crops. What does this do to its people?', 'pushes them to move away', ['pulls more of them there', 'makes the village bigger', 'has no effect on them', 'makes the land more fertile'], {
        emoji: '🏜️',
        why: 'People leave when they cannot feed their families.',
      }),
      choice('Why do many newcomers come to Toronto?', 'jobs and family already there', ['its very warm winters', 'its cheap housing costs', 'its empty land to farm', 'its large mountain ranges'], {
        why: 'Family and work are big pulls.',
      }),
    ]],
  ]),

  // --- 💎 What counts as a resource --------------------------------------------------------
  chapter('geo-b-what', [
    ['what', {
      explain: [
        'A natural resource is something from nature that people use.',
        'Water, trees, oil, fish, sunlight, minerals.',
        'If nobody wants it, or nobody can get to it, it is just a rock.',
      ],
      video: 'geo-b-what-v1',
      watchFor: 'Name some natural resources.',
    }, [
      choice('What makes something a natural resource?', 'it comes from nature and people use it', ['it was made by people in a factory', 'it is found only in the ground in Canada', 'it has a price tag on it at the shop', 'it is rare and nobody can ever get it'], {
        emoji: '💎',
        why: 'Nature provides it. People want it.',
      }),
      choice('Which of these is a natural resource?', 'sunlight', ['plastic', 'a car', 'a phone', 'concrete'], {
        emoji: '☀️',
        why: 'The others are made by people from natural resources.',
      }),
      choice('Which of these is NOT a natural resource?', 'a smartphone', ['an oak forest', 'a salmon river', 'a copper ore', 'a wind pattern'], {
        emoji: '📱',
        why: 'It is made from them.',
      }),
    ]],
    ['value', {
      explain: [
        'A thing becomes a resource when people find a use for it.',
        'Oil was a nuisance until engines needed it.',
        'Lithium was not very important until batteries needed it.',
      ],
      video: 'geo-b-what-v0',
    }, [
      choice('Why did lithium suddenly become so valuable?', 'batteries need it', ['it is very pretty', 'it is good to eat', 'it makes great bricks', 'it grows on trees'], {
        emoji: '🔋',
        why: 'New technology made it a resource.',
      }),
      choice('A rock has no use today. In 20 years, a new invention needs it. What happens?', 'it becomes a resource', ['it stops being a rock', 'it loses all its value', 'it becomes renewable', 'it turns into oil'], {
        emoji: '💡',
        why: 'Being a resource depends on people, not just the rock.',
      }),
      choice('What decides whether a material is a resource?', 'whether people want and can use it', ['how heavy each of the pieces is', 'how old the material is in years', 'which country it is found in now', 'what colour the material turns out'], {
        why: 'A rock is only a resource when someone wants it.',
      }),
    ]],
    ['access', {
      explain: [
        'A resource only helps if you can reach it.',
        'Gold under a kilometre of ice may cost too much to dig up.',
        'As prices rise or technology improves, it can become worth it.',
      ],
      video: 'geo-b-what-v2',
    }, [
      choice('There is gold under deep Arctic ice. Why might nobody mine it?', 'it costs more to dig than it is worth', ['nobody wants any gold these days', 'gold is not a natural resource', 'it would melt the Arctic overnight', 'the gold is not really there'], {
        emoji: '❄️',
        why: 'Cost is part of being a usable resource.',
      }),
      choice('The price of oil doubles. What might happen to a costly oil field?', 'it could become worth drilling', ['it will vanish from the map', 'it becomes illegal to drill', 'it turns into natural gas', 'it stops being a resource'], {
        emoji: '🛢️',
        why: 'Higher prices make hard resources worth reaching.',
      }),
      choice('Which is the most important question about a resource in a far-off place?', 'can we reach it at a fair cost?', ['what colour is it when it’s wet?', 'who gave the place its name?', 'how old is the map it is on?', 'is it shown on a globe at all?'], {
        why: 'Having it is not the same as using it.',
      }),
    ]],
    ['canada', {
      explain: [
        'Canada is rich in natural resources.',
        'Oil in Alberta, potash in Saskatchewan, forests across the country.',
        'Fish on both coasts, nickel in Sudbury, and huge amounts of fresh water.',
      ],
      video: 'geo-b-what-v1',
    }, [
      match('Match each place to its resource:', [
        ['Alberta', 'oil'],
        ['Saskatchewan', 'potash'],
        ['Sudbury', 'nickel'],
      ], { emoji: '🇨🇦', why: 'Three Canadian resources.' }),
      choice('Which province is best known for its oil?', 'Alberta', ['Prince Edward Island', 'Nova Scotia', 'Manitoba', 'Quebec'], {
        emoji: '🛢️',
        why: 'The oil sands.',
      }),
      choice('Which Ontario city is famous for mining nickel?', 'Sudbury', ['Toronto', 'Ottawa', 'Niagara Falls', 'Windsor'], {
        emoji: '⛏️',
        why: 'It even has the Big Nickel.',
      }),
    ]],
    ['types', {
      explain: [
        'Natural resources come from nature.',
        'Human resources are people and what they know.',
        'Capital resources are things people make to produce more: tools, machines, factories.',
      ],
      video: 'geo-b-what-v2',
    }, [
      match('Match each to its type of resource:', [
        ['a forest', 'natural'],
        ['a skilled engineer', 'human'],
        ['a sawmill', 'capital'],
      ], { emoji: '🛠️', why: 'Nature, people, or tools.' }),
      choice('A company’s trucks and machines are what kind of resource?', 'capital', ['natural', 'human', 'renewable', 'mineral'], {
        emoji: '🚚',
        why: 'Things made to make other things.',
      }),
      choice('Which is a human resource?', 'a trained nurse', ['a fresh river', 'a steel beam', 'a coal seam', 'a wind farm'], {
        why: 'People and what they know how to do.',
      }),
    ]],
  ]),

  // --- ♻️ Renewable vs non-renewable ------------------------------------------------------
  chapter('geo-b-renew', [
    ['difference', {
      explain: [
        'A renewable resource can be replaced in a human lifetime, or never runs out.',
        'Wind, sun, water, trees and fish.',
        'A non-renewable resource takes millions of years to form: oil, coal, gas, minerals.',
        'Once it is used, it is gone.',
      ],
      video: 'geo-b-renew-v0',
      watchFor: 'Name three renewable and three non-renewable resources.',
    }, [
      match('Sort each one:', [
        ['wind', 'renewable'],
        ['coal', 'non-renewable'],
      ], { emoji: '♻️', why: 'Comes back, or gone for good?' }),
      choice('Why is oil non-renewable?', 'it takes millions of years to form', ['it is found deep under the ocean', 'it has a very high price per barrel', 'it is a liquid and not a solid', 'it is too dirty to use in a car'], {
        emoji: '🛢️',
        why: 'Not on any human timescale.',
      }),
      choice('Which of these is renewable?', 'sunlight', ['coal', 'natural gas', 'crude oil', 'iron ore'], {
        emoji: '☀️',
        why: 'The sun keeps shining.',
      }),
    ]],
    ['awkward', {
      explain: [
        'Some renewables can still run out.',
        'Fish and trees grow back, but only if we leave enough.',
        'Newfoundland’s cod collapsed in 1992 from overfishing.',
        'Renewable is not the same as unlimited.',
      ],
      video: 'geo-b-renew-v1',
    }, [
      choice('Fish are renewable. So why did Newfoundland’s cod collapse in 1992?', 'they were caught faster than they bred', ['a very big oil spill killed all of them', 'the water suddenly got far too warm', 'seals had eaten every one of the cod', 'they swam away to the Pacific Ocean'], {
        emoji: '🐟',
        why: 'Renewable depends on us leaving enough.',
      }),
      choice('What must we do for a forest to stay renewable?', 'cut no faster than it regrows', ['cut as much as we possibly can', 'never plant any kind of new trees', 'cut only in the depths of winter', 'cut only the very tallest trees'], {
        emoji: '🌲',
        why: 'Use it no faster than it comes back.',
      }),
      choice('Which is the best statement?', 'renewable does not mean unlimited', ['renewable means it can never run out', 'renewable means that it is always free', 'renewable means that it is man-made', 'renewable means it has to be a gas'], {
        why: 'Fish, forests and soil can all run out.',
      }),
    ]],
    ['flow', {
      explain: [
        'Flow resources, like sun, wind and running water, cannot be used up.',
        'But they do not always flow when you need them.',
        'No sun at night, and no wind on calm days. That is why storing energy matters.',
      ],
      video: 'geo-b-renew-v1',
    }, [
      choice('What is the main weakness of solar and wind power?', 'they don’t always work when needed', ['they will run out of energy some day', 'they give off a lot of carbon dioxide', 'they can only be used up in the Arctic', 'they need coal to work in the first place'], {
        emoji: '🌬️',
        why: 'No sun at night, and calm days happen.',
      }),
      choice('What could help with the problem of no wind on a calm day?', 'storing energy in batteries', ['building a lot taller fences', 'using up all the wind today', 'turning all of the turbines off', 'painting the blades in black'], {
        emoji: '🔋',
        why: 'Save the windy day’s energy.',
      }),
      choice('Which of these is a flow resource?', 'moving water', ['iron ore', 'coal seams', 'natural gas', 'copper ore'], {
        emoji: '💧',
        why: 'It is there as long as the river runs.',
      }),
    ]],
    ['ontario', {
      explain: [
        'Ontario gets most of its electricity from nuclear and hydro.',
        'Niagara Falls has made hydro power for over a century.',
        'Nuclear gives off almost no carbon, but its uranium fuel is non-renewable.',
      ],
      video: 'geo-b-renew-v2',
    }, [
      choice('What is hydro power made from?', 'moving water', ['burning coal', 'splitting uranium', 'solar panels', 'hot rocks'], {
        emoji: '💧',
        why: 'In Canada, we even call electricity “hydro”.',
      }),
      choice('Is nuclear power renewable?', 'no — uranium is mined', ['yes — like the wind', 'yes — it comes from sun', 'no — it makes smoke', 'yes — it regrows'], {
        emoji: '⚛️',
        why: 'Low carbon does not mean renewable.',
      }),
      choice('Which famous Ontario spot has been making hydro power for over a century?', 'Niagara Falls', ['Algonquin Park', 'the CN Tower', 'Manitoulin Island', 'Thunder Bay'], {
        why: 'Part of the river is sent through turbines.',
      }),
    ]],
    ['make-last', {
      explain: [
        'We can make non-renewable resources last longer.',
        'Reduce what you use. Reuse what you can.',
        'Recycling metals saves mining. Recycling aluminum saves about 95% of the energy.',
      ],
      video: 'geo-b-renew-v0',
    }, [
      choice('Which of these helps make a non-renewable resource last longer?', 'recycling aluminum cans', ['using more plastic bags', 'mining faster than before', 'driving a bit more often', 'throwing the metal away'], {
        emoji: '🥫',
        why: 'Metals can be reused almost for ever.',
      }),
      choice('Recycling an aluminum can saves about how much of the energy of making a new one?', 'about 95%', ['about 5%', 'about 25%', 'about 50%', 'none of it'], {
        why: 'Melting old metal is far easier than mining new ore.',
      }),
      order('Put these in the best order to try them:', ['reduce', 'reuse', 'recycle'], {
        emoji: '♻️',
        why: 'Not using it at all beats everything.',
      }),
    ]],
  ]),

  // --- ⛏️ Extracting resources: the real cost ----------------------------------------------
  chapter('geo-b-cost', [
    ['how', {
      explain: [
        'Open-pit mining digs a huge hole from the surface.',
        'Underground mining uses tunnels and shafts.',
        'Drilling reaches oil and gas. Logging cuts down trees.',
      ],
      video: 'geo-b-cost-v2',
      watchFor: 'How do we get resources out of the ground?',
    }, [
      match('Match each resource to how we get it:', [
        ['oil', 'drilling'],
        ['trees', 'logging'],
        ['deep nickel', 'underground mining'],
      ], { emoji: '⛏️', why: 'Each resource has its own way.' }),
      choice('What is open-pit mining?', 'digging a huge hole from the surface', ['drilling a small hole for pumping oil', 'digging long tunnels far underground', 'scooping up the sand from a riverbed', 'cutting down trees in a big forest'], {
        emoji: '🕳️',
        why: 'Used when the ore is close to the surface.',
      }),
      choice('The ore is very deep. Which method fits best?', 'underground mining', ['open-pit mining', 'logging the trees', 'drilling for oil', 'surface scraping'], {
        why: 'Tunnels and shafts reach it.',
      }),
    ]],
    ['environment', {
      explain: [
        'Getting resources damages the land.',
        'Forests are cut. Rivers can be polluted.',
        'Mines leave waste rock and tailings, which are toxic if they leak.',
        'Smelting in Sudbury once killed the land around it. It has since been replanted.',
      ],
      video: 'geo-b-cost-v1',
    }, [
      choice('What are mine tailings?', 'the leftover waste from mining', ['the trucks that carry out the ore', 'the tunnels that lead to the mine', 'the workers on the last shift', 'the signs along the mine road'], {
        emoji: '☠️',
        why: 'They can poison rivers if they leak.',
      }),
      choice('Why did the land around Sudbury turn black and bare?', 'smelters released acid and sulphur', ['a large volcano erupted there', 'a huge forest fire burned it all', 'a meteor had hit it long ago', 'drought killed the whole forest'], {
        emoji: '⚫',
        why: 'People have since planted millions of trees there.',
      }),
      choice('Which is usually a cost of an open-pit mine?', 'destroyed habitat', ['cleaner rivers', 'more forests', 'better soil', 'more wildlife'], {
        why: 'The land is dug away.',
      }),
    ]],
    ['boom', {
      explain: [
        'Resource towns boom when prices are high.',
        'When the resource runs out or the price falls, they bust.',
        'Jobs leave. Some towns become ghost towns.',
      ],
      video: 'geo-b-cost-v0',
    }, [
      choice('What is a “boom and bust” town?', 'one that grows fast, then collapses', ['one that has lots of explosions', 'one that is built on a volcano', 'one with very loud music nights', 'one that is always slowly growing'], {
        emoji: '💥',
        why: 'The town rises and falls with the resource.',
      }),
      choice('A mine closes in a town with only one big employer. What happens?', 'people lose jobs and many move away', ['the town suddenly becomes very rich', 'many more people move to the town', 'the town gets a large new airport', 'the mine turns into a local forest'], {
        emoji: '🏚️',
        why: 'All its eggs were in one basket.',
      }),
      choice('What is the best way for a resource town to protect itself?', 'build other kinds of jobs', ['mine as fast as it can', 'hope prices stay high', 'stop paying any taxes', 'buy a lot more trucks'], {
        why: 'Do not depend on one thing.',
      }),
    ]],
    ['who-pays', {
      explain: [
        'The buyer rarely pays the whole cost.',
        'People near the mine may lose clean water or hunting grounds.',
        'First Nations have to be consulted about projects on their land.',
        'Ontario’s “Ring of Fire” mining area is an example of this debate.',
      ],
      video: 'geo-b-cost-v1',
    }, [
      choice('Who often pays the biggest hidden cost of a mine?', 'people living near it', ['shoppers in a far city', 'the company’s shareholders', 'buyers of the finished goods', 'the mine’s head office staff'], {
        emoji: '⚖️',
        why: 'Somebody always pays, and it is rarely the buyer.',
      }),
      choice('Ontario’s “Ring of Fire” is…', 'a mineral-rich area in the north', ['a chain of volcanoes around Toronto', 'a fireworks show at Ontario Place', 'a hot summer wind in the Niagara area', 'an underground fire near Sudbury'], {
        emoji: '💍',
        why: 'Don’t mix it up with the Pacific’s Ring of Fire.',
      }),
      choice('A company wants to mine on First Nations land. What must happen?', 'the First Nation must be consulted', ['the company can just start digging', 'the federal army must approve of it', 'the First Nation has to move away', 'the land must be sold to the company'], {
        why: 'Canadian law requires it.',
      }),
    ]],
    ['fix', {
      explain: [
        'Mining and logging can be done better.',
        'Reclamation means restoring the land when work is done.',
        'Replanting replaces trees. Strict rules protect the water.',
      ],
      video: 'geo-b-cost-v2',
    }, [
      choice('What does “reclamation” mean?', 'restoring land after a mine closes', ['opening up a brand new mine nearby', 'selling the ore to another country', 'claiming new land for a company', 'digging the pit much deeper down'], {
        emoji: '🌱',
        why: 'It is planned before digging starts.',
      }),
      choice('Which is a more sustainable way of logging?', 'replanting and cutting selectively', ['cutting every tree in the valley', 'logging next to all of the rivers', 'burning the forest after cutting', 'cutting all of the youngest trees'], {
        emoji: '🌲',
        why: 'The forest can come back.',
      }),
      choice('Why might a phone’s price not show its real cost?', 'damage at the mine isn’t in the price', ['phones are always sold at a loss', 'the screen is free of any charge', 'the shop always pays for the mine', 'minerals do not cost anything'], {
        emoji: '📱',
        why: 'That hidden cost is paid somewhere else.',
      }),
    ]],
  ]),

  // --- 🚱 Water as a resource ---------------------------------------------------------------
  chapter('geo-b-water', [
    ['how-much', {
      explain: [
        'Most of Earth’s water is salty.',
        'Only about 3% is fresh, and most of that is frozen or underground.',
        'Less than 1% of all water is easy for us to reach.',
      ],
      video: 'geo-b-water-v0',
      watchFor: 'How much of Earth’s water can we drink?',
    }, [
      choice('About how much of Earth’s water is fresh?', 'about 3%', ['about 30%', 'about 50%', 'about 75%', 'about 97%'], {
        emoji: '💧',
        why: '97% is salt water.',
      }),
      choice('Where is most of Earth’s fresh water?', 'frozen in ice caps and glaciers', ['in the Great Lakes of North America', 'flowing in the Amazon River basin', 'in the clouds floating in the air', 'in Canadian bottled water plants'], {
        emoji: '🧊',
        why: 'That is why so little of it is easy to use.',
      }),
      choice('If all of Earth’s water fitted in a 4-litre jug, how much would be easy to reach?', 'about one tablespoon', ['about half of the jug', 'about a full cup of it', 'about a third of the jug', 'nearly the whole jug'], {
        emoji: '🥄',
        why: 'That is the part we all share.',
      }),
    ]],
    ['canada', {
      explain: [
        'Canada has about 20% of the world’s fresh water.',
        'But much of it is frozen or flows north, away from most people.',
        'The Great Lakes hold about 20% of the world’s surface fresh water.',
      ],
      video: 'geo-b-water-v1',
    }, [
      choice('About how much of the world’s fresh water is in Canada?', 'about 20%', ['about 1%', 'about 5%', 'about 50%', 'about 90%'], {
        emoji: '🇨🇦',
        why: 'One of the richest countries for water.',
      }),
      choice('Why can’t Canadians use all of Canada’s water easily?', 'much of it is far from where people live', ['the law says it cannot be touched by people', 'most of it is too salty to be used at home', 'the water is kept in the United States', 'all of the lakes have been sold to others'], {
        emoji: '🗺️',
        why: 'Many rivers flow north, away from cities.',
      }),
      choice('The Great Lakes hold about how much of the world’s surface fresh water?', 'about 20%', ['about 2%', 'about 80%', 'about 50%', 'all of it'], {
        emoji: '🌊',
        why: 'You live next to it.',
      }),
    ]],
    ['first-nations', {
      explain: [
        'Canada is water-rich, but not everyone has clean water.',
        'Many First Nations communities have lived under boil-water advisories for years.',
        'Water treatment needs money, skills and maintenance.',
      ],
      video: 'geo-b-water-v1',
    }, [
      choice('What is a boil-water advisory?', 'a warning to boil water before you use it', ['a rule to stop swimming in a local lake', 'a list of the hottest days in the summer', 'a law about the temperature of a bath', 'a plan to heat the school’s drinking taps'], {
        emoji: '🚰',
        why: 'The tap water is not safe.',
      }),
      choice('Which Canadians have faced the longest boil-water advisories?', 'First Nations communities', ['downtown Toronto residents', 'Montreal apartment owners', 'Vancouver office workers', 'suburban Calgary families'], {
        why: 'Some have lasted for decades.',
      }),
      choice('Canada has so much fresh water. Why does this problem still exist?', 'clean water needs treatment and money', ['nobody in Canada ever drinks tap water', 'the water is not wet in the far north', 'there are no lakes near those places', 'all of Canada’s water is salt water'], {
        why: 'Having a lake nearby is not the same as a safe tap.',
      }),
    ]],
    ['hidden', {
      explain: [
        'Almost everything you own took water to make.',
        'A pair of jeans can take thousands of litres.',
        'A hamburger takes over 2,000 litres.',
        'This is “virtual water”.',
      ],
      video: 'geo-b-water-v1',
    }, [
      choice('What is “virtual water”?', 'the water used to make a product', ['water that exists only in video games', 'water that has been frozen in ice caps', 'water that comes from a computer screen', 'water that is in the air on a humid day'], {
        emoji: '👖',
        why: 'You do not see it, but it was used.',
      }),
      choice('Which takes the most water to make?', 'a pair of jeans', ['a slice of bread', 'a sheet of paper', 'a cup of tea', 'a single egg'], {
        emoji: '🌱',
        why: 'Cotton is a very thirsty crop.',
      }),
      choice('About how much water does it take to make one hamburger?', 'over 2,000 litres', ['about 1 litre', 'about 10 litres', 'about 50 litres', 'about 100 litres'], {
        emoji: '🍔',
        why: 'Most of it goes into feeding the cow.',
      }),
    ]],
    ['conflict', {
      explain: [
        'Nothing can replace water, so people fight over it.',
        'Rivers cross borders: a dam upstream hurts people downstream.',
        'In 2018, Cape Town nearly ran out. It was called Day Zero.',
      ],
      video: 'geo-b-water-v1',
      watchFor: 'Why are people running out of clean water?',
    }, [
      choice('Why do rivers cause arguments between countries?', 'a dam upstream takes water from downstream', ['rivers are always found in very hot lands', 'all rivers are owned by the United Nations', 'nobody knows where the rivers come from', 'rivers carry far too many fish in them'], {
        emoji: '🌊',
        why: 'The Nile is one example.',
      }),
      choice('What was “Day Zero” in Cape Town?', 'the day the city’s taps would run dry', ['the first day of the school year there', 'the day a large dam was opened there', 'the day that a new river was found', 'the day of the city’s biggest flood'], {
        emoji: '🚱',
        why: 'People cut back, and the city avoided it.',
      }),
      choice('Why is fresh water called the resource nobody can substitute?', 'nothing else can do its job', ['it is the rarest thing on Earth', 'it is the most costly resource', 'nobody really wants any other', 'it is found only in the Arctic'], {
        why: 'You can replace oil. You cannot replace water.',
      }),
    ]],
  ]),

  // --- 👣 Sustainability and your own footprint -----------------------------------------------
  chapter('geo-b-sust', [
    ['what', {
      explain: [
        'Sustainability means meeting today’s needs without hurting the future.',
        'Use resources no faster than they can come back.',
        'Many Haudenosaunee teachings ask you to think seven generations ahead.',
      ],
      video: 'geo-b-sust-v1',
      watchFor: 'What does sustainability mean?',
    }, [
      choice('What does sustainability mean?', 'meeting our needs without harming the future', ['using all of our resources as fast as we can', 'only ever buying what is the very cheapest', 'living in the countryside away from cities', 'making sure that everybody owns a car or two'], {
        emoji: '🌱',
        why: 'Today and tomorrow both count.',
      }),
      choice('The “seventh generation” principle tells us to…', 'think of the people far in the future', ['have seven children in each family', 'build houses that last for 7 years', 'look back at the past seven kings', 'only use seven types of resources'], {
        emoji: '🪶',
        why: 'A Haudenosaunee teaching.',
      }),
      choice('Which is most sustainable?', 'fishing no faster than fish breed', ['fishing until the lake is empty', 'catching only the youngest fish', 'draining the lake for easy fish', 'catching as much as boats hold'], {
        emoji: '🎣',
        why: 'The lake can keep giving.',
      }),
    ]],
    ['footprint', {
      explain: [
        'An ecological footprint measures how much land and water it takes to support you.',
        'Food, home, travel and stuff all count.',
        'Canadians have one of the largest footprints in the world.',
      ],
      video: 'geo-b-sust-v0',
      watchFor: 'What is an ecological footprint?',
    }, [
      choice('What does your ecological footprint measure?', 'the land and water it takes to support you', ['the size of your shoes in centimetres', 'how far you walked during the day', 'how many trees you personally planted', 'how much your house is worth in dollars'], {
        emoji: '👣',
        why: 'Adding up your own share.',
      }),
      choice('What counts toward your footprint?', 'food, travel, home and stuff', ['only the car you ride in', 'only the food you throw out', 'only how your home is heated', 'only the plastic you recycle'], {
        why: 'Everything you use came from somewhere.',
      }),
      choice('Compared with most of the world, the average Canadian’s footprint is…', 'very large', ['very small', 'about average', 'exactly zero', 'unknown'], {
        emoji: '🇨🇦',
        why: 'Big houses, long drives, cold winters.',
      }),
    ]],
    ['overshoot', {
      explain: [
        'Every year, humans use more than Earth can renew in that year.',
        'Earth Overshoot Day marks when we have used up the year’s budget.',
        'In recent years it has fallen around the end of July.',
        'If everyone lived like Canadians, we would need about five Earths.',
      ],
      video: 'geo-b-sust-v2',
    }, [
      choice('What is Earth Overshoot Day?', 'when we use up a year’s renewable resources', ['when the world’s oil finally runs out for good', 'the hottest day ever on record in the world', 'the day the Earth is furthest away from the sun', 'the first day of spring in the northern half'], {
        emoji: '📅',
        why: 'After it, we are in debt to the planet.',
      }),
      choice('If everyone lived like the average Canadian, about how many Earths would we need?', 'about 5', ['about 1', 'less than 1', 'about 50', 'about 100'], {
        emoji: '🌍',
        why: 'That is why a fair share matters.',
      }),
      choice('You earn $100 a month and spend $160. Which idea does that match?', 'Earth Overshoot', ['the water cycle', 'the food web', 'a rain shadow', 'a flow resource'], {
        emoji: '💸',
        why: 'Spending more than comes in.',
      }),
    ]],
    ['biggest', {
      explain: [
        'Not all changes count the same.',
        'Heating, travel and food are the big ones.',
        'Walking or transit, wasting less food and eating less meat cut a lot more than small habits.',
      ],
      video: 'geo-b-sust-v0',
    }, [
      choice('Which of these shrinks a footprint the most?', 'taking transit instead of driving daily', ['switching to a blue toothbrush for life', 'turning off one light once a week', 'recycling one small bottle every year', 'using one less sheet of paper today'], {
        emoji: '🚌',
        why: 'Big habits beat small gestures.',
      }),
      choice('What is the best way to cut food waste at home?', 'buy only what you will eat', ['keep food until it goes bad', 'cook twice what you need', 'throw leftovers out quickly', 'buy lots of food on sale'], {
        emoji: '🍽️',
        why: 'All the water and energy in that food goes to waste too.',
      }),
      choice('Why does eating less beef shrink a footprint?', 'cattle use a lot of land and water', ['beef is always imported by air', 'cows make their own electricity', 'beef has more carbon than steel', 'farmers are not fond of cattle'], {
        emoji: '🐄',
        why: 'Feeding one cow takes a great deal of land.',
      }),
    ]],
    ['stuff', {
      explain: [
        'Everything you own came from somewhere and goes somewhere.',
        'Fast fashion uses huge amounts of water and is often thrown away.',
        'Reduce first, then reuse, then recycle.',
        'Buying less is better than recycling more.',
      ],
      video: 'geo-b-sust-v2',
    }, [
      choice('Which is the MOST sustainable choice?', 'keeping your old phone for longer', ['buying a new phone every single year', 'recycling your new phone every year', 'buying two phones in case one breaks', 'throwing your old phone in the garbage'], {
        emoji: '📱',
        why: 'Reduce comes first.',
      }),
      choice('What is “fast fashion”?', 'cheap clothes made fast and thrown away', ['clothes that are made for running in', 'clothes that were made a long time ago', 'clothes that are made to last for years', 'clothes that only get worn by athletes'], {
        emoji: '👕',
        why: 'Cheap for you, costly for the planet.',
      }),
      choice('Which should you try first?', 'reduce what you buy', ['recycle what you buy', 'throw out what you buy', 'donate what you buy', 'burn what you buy'], {
        why: 'What you never buy has no footprint.',
      }),
    ]],
  ]),
]
