// Grade 7 Geography — Physical Patterns in a Changing World + Natural Resources.
// 40 questions, four per St. Eugene subtopic (geo-a-*, geo-b-*). See ./grade7.ts.
import type { QuizQuestion } from '../types'
import { grade7 } from './grade7'

const { choice, write, match, order } = grade7('g7-geo')

export const G7_GEO_SEED: QuizQuestion[] = [
  // --- geo-a-map · reading a physical map ------------------------------------------------
  choice('g7g-01', 'geo-a-map', 'Lines of LATITUDE tell you how far a place is…', 'north or south of the equator', ['east or west of Greenwich', 'above or below sea level', 'from the North Pole only', 'from the nearest ocean', 'from the capital city'], {
    emoji: '🌐',
    why: 'Latitude = north–south (think “ladder rungs”). Longitude = east–west from Greenwich, England.',
  }),
  choice('g7g-02', 'geo-a-map', 'A map’s scale is 1 cm = 10 km. Two towns are 4 cm apart on the map. How far apart are they really?', '40 km', ['4 km', '14 km', '400 km', '10 km', '2.5 km'], {
    emoji: '📏',
    why: '4 cm × 10 km per cm = 40 km.',
  }),
  choice('g7g-03', 'geo-a-map', 'On a physical map, what do the colour bands or contour lines show?', 'how high the land is', ['where the borders are', 'roads and railways', 'how many people live there', 'how much rain falls', 'the time zones'], {
    emoji: '⛰️',
    why: 'Green low, brown high, white highest. Contour lines close together = steep.',
  }),
  match('g7g-04', 'geo-a-map', 'Match each map part to its job:', [
    ['legend', 'explains the symbols'],
    ['scale', 'turns map distance into real distance'],
    ['compass rose', 'shows which way is north'],
    ['latitude and longitude', 'a grid that pins down any place'],
  ], { emoji: '🗺️', why: 'Toronto is about 43.7° N, 79.4° W — two numbers, one exact spot on Earth.' }),

  // --- geo-a-land · landforms and plate tectonics ------------------------------------------
  choice('g7g-05', 'geo-a-land', 'What builds mountain ranges like the Rockies?', 'plates pushing into each other', ['plates pulling apart', 'rivers piling up sand', 'glaciers dropping rocks', 'wind blowing dust together', 'meteors hitting the ground'], {
    emoji: '🏔️',
    why: 'A collision in slow motion: the crust crumples and folds upward. Plates pulling apart make rifts and ridges instead.',
  }),
  choice('g7g-06', 'geo-a-land', 'About how fast do tectonic plates move?', 'about as fast as your nails grow', ['about as fast as you walk', 'about 1 km every year', 'they never move at all', 'about as fast as a car', 'about 1 m every day'], {
    emoji: '💅',
    why: 'A few centimetres a year — but over millions of years that is a whole ocean.',
  }),
  choice('g7g-07', 'geo-a-land', 'What carved out the Great Lakes?', 'glaciers in the last Ice Age', ['a giant meteor strike', 'a chain of volcanoes', 'one huge flood', 'earthquakes splitting the land', 'people digging canals'], {
    emoji: '🧊',
    why: 'Ice sheets kilometres thick scraped out the basins. When they melted, the water filled them.',
  }),
  choice('g7g-08', 'geo-a-land', 'The Canadian Shield is mostly…', 'very old rock, lakes and forest', ['flat prairie farmland', 'tall, young, jagged mountains', 'a dry, sandy desert', 'frozen ocean all year', 'a chain of volcanic islands'], {
    emoji: '🪨',
    why: 'Some of the oldest rock on Earth. Thin soil, so lots of lakes, trees and mines — and not much farming.',
  }),

  // --- geo-a-climate · climate and climate zones ----------------------------------------------
  match('g7g-09', 'geo-a-climate', 'Match each climate factor to what it does:', [
    ['latitude', 'closer to the equator, warmer'],
    ['altitude', 'higher up, colder'],
    ['nearness to water', 'milder winters and summers'],
    ['mountains and wind', 'a wet side and a dry side'],
  ], { emoji: '🌤️', why: 'Four things. Any two cities that feel different can be explained by them.' }),
  choice('g7g-10', 'geo-a-climate', 'Quito sits right on the equator but is cool all year. Why?', 'it is very high up', ['it is right beside the sea', 'it is very far north', 'it is always cloudy', 'it is a huge city', 'it has a lot of trees'], {
    emoji: '🏔️',
    why: 'About 2,850 m up. Air cools about 6.5 °C for every 1,000 m you climb.',
  }),
  choice('g7g-11', 'geo-a-climate', 'Which sentence is about CLIMATE, not weather?', 'Toronto winters are usually cold', ['It’s snowing in Toronto right now', 'Tomorrow will be windy', 'It rained this morning', 'Today hit 25 °C', 'A storm is coming tonight'], {
    emoji: '📅',
    why: 'Weather is today. Climate is the pattern over 30 years or more.',
  }),
  choice('g7g-12', 'geo-a-climate', 'Vancouver has much milder winters than Toronto. The biggest reason?', 'the Pacific Ocean beside it', ['it is closer to the equator', 'it sits much higher up', 'it has more people in it', 'it is a desert climate', 'it has no wind at all'], {
    emoji: '🌧️',
    why: 'Vancouver is actually further NORTH than Toronto. The ocean and the mild Pacific winds make the difference.',
  }),

  // --- geo-a-hazard · earthquakes, volcanoes, hurricanes ------------------------------------------
  choice('g7g-13', 'geo-a-hazard', 'What is the Ring of Fire?', 'volcanoes and quakes around the Pacific', ['a desert belt around Africa', 'a wildfire zone in Canada', 'hot springs found only in Iceland', 'the hottest band along the equator', 'a chain of volcanoes in the Arctic'], {
    emoji: '🌋',
    why: 'The Pacific plate’s edges — about three quarters of the world’s volcanoes are on it.',
  }),
  choice('g7g-14', 'geo-a-hazard', 'Where do hurricanes get their energy?', 'warm ocean water', ['cold polar air', 'volcanoes under the sea', 'the moon’s pull', 'mountain winds', 'desert sand'], {
    emoji: '🌀',
    why: 'Warm, wet air rising off the sea feeds the storm. Over land, or over cold water, it weakens.',
  }),
  choice('g7g-15', 'geo-a-hazard', 'What makes an earthquake happen?', 'rock along a fault slips suddenly', ['the moon pulls on the ground', 'hot weather cracks the soil', 'underground rivers start flowing', 'tree roots shift underground', 'thunder shakes the rock'], {
    emoji: '📳',
    why: 'Plates get stuck, pressure builds for years, then — snap.',
  }),
  choice('g7g-16', 'geo-a-hazard', 'Which province is most at risk of a big earthquake?', 'British Columbia', ['Saskatchewan', 'Manitoba', 'Prince Edward Island', 'Alberta', 'Nova Scotia'], {
    emoji: '⚠️',
    why: 'It sits on the edge of the Pacific — on the Ring of Fire.',
  }),

  // --- geo-a-where · where people live, and why -------------------------------------------------
  choice('g7g-17', 'geo-a-where', 'Why did most big cities grow up next to water?', 'for drinking, transport and trade', ['because water keeps cities cool', 'because land by water is cheap', 'because water stops all floods', 'because fish attract tourists', 'because the law required it'], {
    emoji: '🏙️',
    why: 'Toronto, Montreal, Quebec City: all on water. Before trucks and trains, the river was the highway.',
  }),
  choice('g7g-18', 'geo-a-where', 'About how many Canadians live within ~150 km of the US border?', 'about three quarters', ['about one tenth', 'about one quarter', 'about half', 'about one third', 'almost nobody'], {
    emoji: '🧭',
    why: 'The south is warmer, flatter and better for farming, and it is close to US trade.',
  }),
  choice('g7g-19', 'geo-a-where', 'Why do so few people live in Canada’s far North?', 'the climate is very harsh', ['the land is too flat', 'it is too close to the USA', 'there is no water there', 'it is far too hot', 'the law forbids it'], {
    emoji: '❄️',
    why: 'Long, dark, freezing winters, permafrost and a short growing season.',
  }),
  write('g7g-20', 'geo-a-where', 'The number of people living in each square kilometre is called population ________. Type the missing word:', ['density'], {
    emoji: '✍️',
    why: 'Toronto is crowded; Nunavut is nearly empty. Density is how you compare them.',
  }),

  // --- geo-b-what · what counts as a resource ---------------------------------------------------
  choice('g7g-21', 'geo-b-what', 'What turns something from nature into a natural resource?', 'people find it useful and want it', ['it is very, very old', 'it is heavy and hard to move', 'it is found deep underground', 'it is shiny and pretty to look at', 'it is found inside Canada'], {
    emoji: '💎',
    why: 'Lithium was just a rock until phones and electric cars needed batteries.',
  }),
  match('g7g-22', 'geo-b-what', 'Match each resource to what it is used for:', [
    ['lithium', 'phone and car batteries'],
    ['oil', 'fuel and plastics'],
    ['timber', 'houses and paper'],
    ['potash', 'fertilizer for crops'],
  ], { emoji: '🔗', why: 'Saskatchewan has the biggest potash deposits in the world.' }),
  choice('g7g-23', 'geo-b-what', 'Which country produces the most potash in the world?', 'Canada', ['Brazil', 'Japan', 'Egypt', 'Italy', 'Chile'], {
    emoji: '🌾',
    why: 'Mostly from Saskatchewan — fertilizer that helps grow food all over the world.',
  }),
  choice('g7g-24', 'geo-b-what', 'Sunlight and wind are resources too. Which kind?', 'renewable resources', ['non-renewable resources', 'fossil resources', 'mineral resources', 'man-made resources', 'rare resources'], {
    emoji: '🌬️',
    why: 'They never run out, however much we use.',
  }),

  // --- geo-b-renew · renewable vs non-renewable --------------------------------------------------
  choice('g7g-25', 'geo-b-renew', 'Which of these is NON-renewable?', 'natural gas', ['wind', 'sunlight', 'tides', 'hydro power', 'geothermal heat'], {
    emoji: '🔥',
    why: 'Fossil fuels took millions of years to form. Once burned, they’re gone.',
  }),
  choice('g7g-26', 'geo-b-renew', 'Trees are renewable. When does a forest act like a NON-renewable resource?', 'when it’s cut faster than it regrows', ['when it rains on it too much', 'when new trees are planted in it', 'when lots of animals live in it', 'when the trees in it are very old', 'when it is inside a national park'], {
    emoji: '🪓',
    why: 'Renewable only works if you take less than nature puts back.',
  }),
  choice('g7g-27', 'geo-b-renew', 'Why are fossil fuels non-renewable?', 'they take millions of years to form', ['they are very hard to find', 'they burn far too slowly', 'they cost too much money to buy', 'they have to be made in factories', 'they are found only in Canada'], {
    emoji: '🦕',
    why: 'Ancient plants and sea creatures, buried and squeezed for millions of years.',
  }),
  choice('g7g-28', 'geo-b-renew', 'Atlantic cod were a renewable resource. What happened in 1992?', 'overfishing forced the fishery to close', ['a new law doubled the catch', 'they all moved to the Pacific', 'a storm wrecked every fishing boat', 'they were declared a pest', 'they were all sold to Europe'], {
    emoji: '🐟',
    why: 'About 30,000 people in Newfoundland lost their jobs overnight. Renewable stopped being renewable.',
  }),

  // --- geo-b-cost · extracting resources: the real cost ---------------------------------------------
  choice('g7g-29', 'geo-b-cost', 'Which is a hidden COST of a big open-pit mine?', 'the land and rivers around it get damaged', ['the metal comes out of it too shiny', 'the miners there earn too much money', 'the town gets too many new schools', 'the mine is far too easy to find', 'the rock there is too soft to dig'], {
    emoji: '⛏️',
    why: 'Somebody always pays, and it is rarely the person buying the phone.',
  }),
  choice('g7g-30', 'geo-b-cost', 'What is a “boom-and-bust” town?', 'it grows with a mine, then empties after', ['it is rebuilt after every big storm', 'it fires cannons on Canada Day', 'it moves every few years with herds', 'it only has people in the summer', 'it was built by the army in a war'], {
    emoji: '🏚️',
    why: 'When the resource runs out or the price crashes, the jobs leave — and so do the people.',
  }),
  choice('g7g-31', 'geo-b-cost', 'Who should be asked BEFORE a mine opens on traditional First Nations land?', 'the First Nation whose land it is', ['only the mining company', 'only the foreign buyers', 'only the nearest big city', 'nobody, if the mine is legal', 'only the tourists'], {
    emoji: '🤝',
    why: 'Canadian courts say First Nations must be consulted. It goes all the way back to 1763.',
  }),
  choice('g7g-32', 'geo-b-cost', 'Alberta’s oil sands: what is one big environmental worry?', 'huge water use and toxic tailings ponds', ['they make the ground too cold', 'they cause volcanoes to erupt', 'they attract too many tourists', 'they make the rivers run backwards', 'they turn the forest into desert'], {
    emoji: '🛢️',
    why: 'Getting oil out of sand takes lots of water, and the dirty leftover water is stored in giant ponds.',
  }),

  // --- geo-b-water · water as a resource -------------------------------------------------------
  choice('g7g-33', 'geo-b-water', 'About how much of the world’s fresh water in lakes and rivers does Canada have?', 'about 20%', ['about 1%', 'about 5%', 'about 50%', 'about 75%', 'about 2%'], {
    emoji: '🚱',
    why: 'One country, about a fifth of the lake and river water on Earth — with only about 0.5% of its people.',
  }),
  choice('g7g-34', 'geo-b-water', 'Why can’t people just drink sea water?', 'it is far too salty for our bodies', ['it is always far too cold', 'it is the wrong colour to drink', 'it has too much oxygen in it', 'it is too heavy for us to swallow', 'it is full of sand and shells'], {
    emoji: '🌊',
    why: 'Drinking it makes you thirstier — your body uses more water to flush the salt out.',
  }),
  choice('g7g-35', 'geo-b-water', 'What is a watershed?', 'all the land that drains into one river or lake', ['a shed where a town stores its water', 'a dam that stops a river from flowing', 'a wall that keeps a city from flooding', 'a lake in the middle of a city park', 'a pipe that carries the rain away fast'], {
    emoji: '🏞️',
    why: 'Rain on your street runs into a creek, then the Don or Humber, then Lake Ontario — one watershed.',
  }),
  choice('g7g-36', 'geo-b-water', 'Why is fresh water something people argue over?', 'everyone needs it and nothing replaces it', ['it is much too heavy to move far', 'it is found only inside Canada', 'it costs a lot more than oil does', 'it can only ever be used once', 'nobody anywhere owns any of it'], {
    emoji: '⚖️',
    why: 'You can swap oil for wind power. There is no swap for water.',
  }),

  // --- geo-b-sust · sustainability and your footprint -----------------------------------------------
  choice('g7g-37', 'geo-b-sust', 'What does “sustainable” mean?', 'meeting our needs without ruining it for later', ['using as much as we can, right now', 'only ever buying brand-new things', 'never using any resources at all', 'letting other countries decide for us', 'recycling every single thing we buy'], {
    emoji: '♻️',
    why: 'Take what you need in a way that leaves enough for people who come after you.',
  }),
  order('g7g-38', 'geo-b-sust', 'Put the 3 Rs from BEST to least good:', ['reduce', 'reuse', 'recycle'], {
    emoji: '🔄',
    why: 'Not buying it at all beats reusing it, which beats recycling it. Recycling still costs energy.',
  }),
  choice('g7g-39', 'geo-b-sust', 'Which of these shrinks your footprint the MOST?', 'keeping your phone a year longer', ['recycling the phone’s box', 'buying a phone case made of bamboo', 'turning the screen brightness down', 'deleting old photos from it', 'charging it only at night'], {
    emoji: '📱',
    why: 'Most of a phone’s footprint is made before you ever turn it on. Reduce beats recycle.',
  }),
  choice('g7g-40', 'geo-b-sust', 'What is an ecological footprint?', 'how much land and resources your life uses', ['the mark your shoes leave in the mud', 'how far you walk on an average day', 'the size of the house that you live in', 'how many trees are growing in your city', 'how much you put in the recycling'], {
    emoji: '👣',
    why: 'Food, travel, stuff, energy — all added up into how much Earth it takes to support you.',
  }),
]
