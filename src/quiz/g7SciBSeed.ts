// Grade 7 Science, part two — Form and Function + Heat in the Environment.
// 40 questions, four per St. Eugene subtopic. See ./grade7.ts.
import type { QuizQuestion } from '../types'
import { grade7 } from './grade7'

const { choice, match } = grade7('g7-sci-b')

export const G7_SCI_B_SEED: QuizQuestion[] = [
  // --- sci-forms · solid, frame and shell -------------------------------------------------
  match('g7sb-01', 'sci-forms', 'Match each structure to its type:', [
    ['a concrete dam', 'solid'],
    ['a hydro tower', 'frame'],
    ['an eggshell', 'shell'],
  ], { emoji: '🏗️', why: 'Solid: built of solid stuff. Frame: a skeleton of parts. Shell: a thin, curved outer layer.' }),
  choice('g7sb-02', 'sci-forms', 'What type of structure is a canoe?', 'a shell structure', ['a solid structure', 'a frame structure', 'a lever', 'a pulley', 'a gear train'], {
    emoji: '🛶',
    why: 'A thin curved skin that holds its shape and keeps the water out — like a helmet or a dome.',
  }),
  choice('g7sb-03', 'sci-forms', 'Why do frame structures use so many triangles?', 'a triangle can’t change shape', ['triangles use less paint', 'triangles look stronger', 'squares cost more to make', 'triangles weigh nothing', 'triangles bend easily'], {
    emoji: '🔺',
    why: 'Push on a square and it squashes into a diamond. Push on a triangle and it holds.',
  }),
  choice('g7sb-04', 'sci-forms', 'What is the big advantage of a shell structure?', 'strong, but uses little material', ['heavy and completely solid', 'easy to see straight through', 'needs lots of beams inside', 'impossible to ever crush', 'can only be made of metal'], {
    emoji: '🥚',
    why: 'An egg can take a surprising squeeze from the ends. Its curve spreads the force around.',
  }),

  // --- sci-forces · forces on structures ------------------------------------------------------
  match('g7sb-05', 'sci-forces', 'Match each force to what it does:', [
    ['compression', 'squeezes together'],
    ['tension', 'pulls apart'],
    ['shear', 'slides one part past another'],
    ['torsion', 'twists'],
  ], { emoji: '🧲', why: 'The four ways a structure gets pushed apart.' }),
  choice('g7sb-06', 'sci-forces', 'The rope holding up a swing is under…', 'tension', ['compression', 'shear', 'torsion', 'friction', 'radiation'], {
    emoji: '🪢',
    why: 'Your weight pulls down, the bar holds up — the rope is being stretched between them.',
  }),
  choice('g7sb-07', 'sci-forces', 'Wringing out a wet towel puts it under…', 'torsion', ['tension', 'compression', 'shear', 'friction', 'a dead load'], {
    emoji: '🌀',
    why: 'Twisting = torsion. A screwdriver turning a screw does the same thing.',
  }),
  choice('g7sb-08', 'sci-forces', 'A bridge’s OWN weight is called its…', 'dead load', ['live load', 'dynamic load', 'torsion', 'tension', 'shear'], {
    emoji: '🌉',
    why: 'Dead load never moves. Live load is what comes and goes — cars, people, snow.',
  }),

  // --- sci-gravity · centre of gravity and stability ---------------------------------------------
  choice('g7sb-09', 'sci-gravity', 'What is an object’s centre of gravity?', 'the point where its weight balances', ['its heaviest end, always', 'always the very top of it', 'always the very bottom of it', 'where it touches the floor', 'the widest part of the object'], {
    emoji: '⚖️',
    why: 'Balance a ruler on one finger: your finger is under its centre of gravity.',
  }),
  choice('g7sb-10', 'sci-gravity', 'Why does a wide base make something more stable?', 'it keeps the centre of gravity over the base', ['it makes the whole object much lighter', 'it raises the centre of gravity higher', 'it removes all the forces acting on it', 'it pushes the ground down underneath', 'it makes gravity weaker around the object'], {
    emoji: '🗼',
    why: 'Tipping happens when the centre of gravity passes outside the base. A wide base gives it further to go.',
  }),
  choice('g7sb-11', 'sci-gravity', 'Raising an object’s centre of gravity makes it…', 'easier to tip over', ['harder to tip over', 'heavier', 'lighter', 'stronger', 'exactly as stable'], {
    emoji: '🫨',
    why: 'That is why a loaded truck with everything on the roof is dangerous on a tight turn.',
  }),
  choice('g7sb-12', 'sci-gravity', 'Where should the heaviest things go in a hiking backpack?', 'low and close to your back', ['high and far from your back', 'in the front pocket', 'all on one side', 'hanging off the outside', 'at the very top'], {
    emoji: '🎒',
    why: 'Keeps your combined centre of gravity over your feet, so the pack doesn’t pull you over.',
  }),

  // --- sci-fail · designing so it fails safely ------------------------------------------------
  choice('g7sb-13', 'sci-fail', 'Why are car crumple zones designed to crush?', 'they absorb energy so people are safer', ['they make the car cheaper to build', 'they make repairs quicker and cheaper', 'they make the car look sportier', 'they help the car go faster', 'they keep the engine cooler'], {
    emoji: '🚗',
    why: 'The front folds up on purpose, so the crash energy goes into metal instead of into you.',
  }),
  choice('g7sb-14', 'sci-fail', 'What is a “factor of safety”?', 'building it stronger than it needs to be', ['a big sign on it that says DANGER', 'a law about the speed limit on it', 'testing it just once before opening', 'making it as light as it can possibly be', 'using only brand-new parts in it'], {
    emoji: '🦺',
    why: 'An elevator rated for 1,000 kg is built to hold several times that — for the bad day.',
  }),
  choice('g7sb-15', 'sci-fail', 'Why does a circuit breaker “fail” on purpose?', 'to cut the power before wires overheat', ['to save electricity at night', 'to make the lights brighter', 'to stop power cuts happening', 'to warn the house about storms', 'to test the wires every day'], {
    emoji: '🧯',
    why: 'The part that is MEANT to break, so the house doesn’t catch fire instead.',
  }),
  choice('g7sb-16', 'sci-fail', 'Engineers test a model bridge until it breaks. Why?', 'to find its weakest point', ['to recycle the materials', 'because models are cheap', 'to make it look used', 'to win a contest', 'to make it lighter'], {
    emoji: '💥',
    why: 'Better a model breaks in the lab than the real bridge breaks with cars on it.',
  }),

  // --- sci-mech · mechanisms and mechanical advantage ---------------------------------------
  choice('g7sb-17', 'sci-mech', 'A long lever lets you lift a heavy rock by…', 'pushing further, with less force', ['pushing less far, with less force', 'pushing less far, with more force', 'making the rock weigh less', 'making gravity weaker', 'adding more friction'], {
    emoji: '🪨',
    why: 'Machines trade distance for force. You never get both for free.',
  }),
  match('g7sb-18', 'sci-mech', 'Match each simple machine to an example:', [
    ['lever', 'a seesaw'],
    ['pulley', 'a flagpole rope'],
    ['wheel and axle', 'a doorknob'],
    ['inclined plane', 'a wheelchair ramp'],
  ], { emoji: '⚙️', why: 'Every one of them trades distance for force.' }),
  choice('g7sb-19', 'sci-mech', 'A machine has a mechanical advantage of 3. That means…', 'it multiplies your force by 3', ['it is 3 times faster', 'it needs 3 people', 'it has 3 moving parts', 'it lasts 3 times longer', 'you push 3 times harder'], {
    emoji: '✖️',
    why: 'Push with 100 N, and it pushes the load with 300 N — but you move 3 times further.',
  }),
  choice('g7sb-20', 'sci-mech', 'On a bike, the BIG front gear with the SMALL back gear makes you…', 'go faster, but pedal harder', ['go slower, but pedal easier', 'go the same speed', 'stop more quickly', 'pedal backwards', 'climb hills easily'], {
    emoji: '🚲',
    why: 'Each pedal turn spins the back wheel many times. Great on the flat, painful up a hill.',
  }),

  // --- sci-heat · heat is not temperature ----------------------------------------------------
  choice('g7sb-21', 'sci-heat', 'What is the difference between heat and temperature?', 'heat is energy; temperature is how hot', ['they are exactly the same thing', 'temperature is energy; heat is how hot', 'heat only comes from fire', 'temperature is only for weather', 'heat is measured on a thermometer'], {
    emoji: '🌡️',
    why: 'Temperature = how fast the particles move. Heat = the total energy moving from hot to cold.',
  }),
  choice('g7sb-22', 'sci-heat', 'A spark at 1000 °C lands on your hand and barely hurts. Why?', 'it holds very little heat energy', ['it isn’t really all that hot', 'your skin is even hotter than it', 'sparks are not made of particles', 'skin can’t feel anything that small', 'it cools down to 0 °C straight away'], {
    emoji: '✨',
    why: 'Very high temperature, but so few particles that there is almost no heat to give you.',
  }),
  choice('g7sb-23', 'sci-heat', 'Which of these holds the MOST heat energy?', 'a bathtub of warm water', ['a burning match', 'a cup of boiling tea', 'a spark from a fire', 'a red-hot needle', 'a candle flame'], {
    emoji: '🛁',
    why: 'Lower temperature, but SO many more particles. More stuff = more heat.',
  }),
  choice('g7sb-24', 'sci-heat', 'Heat always flows from…', 'hotter things to colder things', ['colder things to hotter things', 'bigger things to smaller things', 'liquids to solids', 'higher places to lower places', 'dark things to light things'], {
    emoji: '➡️',
    why: 'Your hand on cold metal feels cold because heat is leaving YOU — the cold isn’t coming in.',
  }),

  // --- sci-expand · heat and the particle theory ------------------------------------------------
  choice('g7sb-25', 'sci-expand', 'Why do bridges have expansion joints (gaps)?', 'the steel grows when it is hot', ['to let the rain drain away', 'to save on steel', 'so cars slow down', 'so boats can pass under', 'to make it look modern'], {
    emoji: '🌉',
    why: 'On a hot day the bridge gets longer. Without a gap it would buckle.',
  }),
  choice('g7sb-26', 'sci-expand', 'Why does a hot-air balloon rise?', 'heated air spreads out and gets less dense', ['hot air has no weight at all inside it', 'the flame pushes the balloon upward', 'the balloon is pulled up by magnets', 'the cold air above pulls it upward', 'the basket is lighter than the air'], {
    emoji: '🎈',
    why: 'Same air, more space → lighter for its size than the cool air around it.',
  }),
  choice('g7sb-27', 'sci-expand', 'A stuck jar lid comes off after running it under hot water. Why?', 'the metal lid expands more than the glass', ['the hot water melts the glue', 'the glass shrinks away from it', 'the water makes it slippery', 'heat makes metal much softer', 'the air inside the jar leaks out'], {
    emoji: '🫙',
    why: 'Metals expand more than glass when heated, so the lid loosens its grip.',
  }),
  choice('g7sb-28', 'sci-expand', 'Heated particles move faster and spread apart, so the object gets bigger. What is that called?', 'expansion', ['expantion', 'expension', 'expanshun', 'expansian', 'ixpansion'], {
    emoji: '🔍',
    why: 'Expansion — and contraction when it cools. Not the particles growing: the gaps growing.',
  }),

  // --- sci-transfer · conduction, convection, radiation -------------------------------------------
  match('g7sb-29', 'sci-transfer', 'Match each example to how the heat travels:', [
    ['a metal spoon in hot soup', 'conduction'],
    ['boiling water rolling in a pot', 'convection'],
    ['feeling the sun on your face', 'radiation'],
  ], { emoji: '♨️', why: 'Touching · flowing · travelling as waves.' }),
  choice('g7sb-30', 'sci-transfer', 'Which kind of heat transfer can cross EMPTY space?', 'radiation', ['conduction', 'convection', 'insulation', 'evaporation', 'friction'], {
    emoji: '☀️',
    why: 'There is nothing between the sun and Earth to conduct or flow — so it must be radiation.',
  }),
  choice('g7sb-31', 'sci-transfer', 'Why do many pots have plastic or wooden handles?', 'they are poor conductors of heat', ['they are great conductors of heat', 'they are cheaper than metal', 'they are lighter than water', 'they reflect radiation away', 'they cause convection'], {
    emoji: '🍳',
    why: 'Insulators slow heat down, so the handle stays cool enough to hold.',
  }),
  choice('g7sb-32', 'sci-transfer', 'Why does warm air rise in a room?', 'it is less dense than cool air', ['it is heavier than cool air', 'the fans push it up', 'the ceiling pulls it up', 'heat sticks to the walls', 'cold air is too slow'], {
    emoji: '🏠',
    why: 'That rising-and-sinking loop is a convection current. It is why upstairs is warmer.',
  }),

  // --- sci-climate · heat in the atmosphere and oceans -----------------------------------------
  choice('g7sb-33', 'sci-climate', 'Why does Lake Ontario keep Toronto milder in winter?', 'water stores heat and lets it out slowly', ['the lake is warm all year round', 'boats on the lake heat the air', 'ice on the lake gives off heat', 'the lake blocks the north wind', 'the city pumps heat into it'], {
    emoji: '🌊',
    why: 'Water takes a long time to heat up and a long time to cool down.',
  }),
  choice('g7sb-34', 'sci-climate', 'Why does beach sand get hot so much faster than the water?', 'land heats up faster than water', ['sand is closer to the sun', 'water reflects all the light', 'sand is always darker', 'water is always moving', 'the sand is made of metal'], {
    emoji: '🏖️',
    why: 'Water needs far more energy to warm by one degree than sand or rock does.',
  }),
  choice('g7sb-35', 'sci-climate', 'On a hot afternoon, a sea breeze blows…', 'from the sea toward the land', ['from the land toward the sea', 'straight down from the clouds', 'from north to south only', 'only at midnight', 'only in winter'], {
    emoji: '🌬️',
    why: 'Hot land air rises; cooler sea air slides in underneath to replace it. At night it flips.',
  }),
  choice('g7sb-36', 'sci-climate', 'Ocean currents like the Gulf Stream carry what around the planet?', 'heat', ['salt only', 'sand', 'ice', 'sunlight', 'oxygen'], {
    emoji: '🧭',
    why: 'Warm water from the tropics heads north — it is why the UK is milder than Labrador at the same latitude.',
  }),

  // --- sci-energy · energy sources and the greenhouse effect ------------------------------------
  choice('g7sb-37', 'sci-energy', 'What is the greenhouse effect?', 'gases trapping heat near Earth’s surface', ['the sun getting hotter every year', 'plants growing faster in summer', 'holes letting all the heat escape', 'glass buildings heating cities', 'the ozone layer melting ice'], {
    emoji: '🌍',
    why: 'Sunlight gets in; some of the heat can’t get back out. In stays in.',
  }),
  choice('g7sb-38', 'sci-energy', 'Which gas from burning fossil fuels adds most to the greenhouse effect?', 'carbon dioxide', ['oxygen', 'nitrogen', 'helium', 'hydrogen', 'argon'], {
    emoji: '🏭',
    why: 'CO₂ — the same gas plants breathe in and we breathe out.',
  }),
  match('g7sb-39', 'sci-energy', 'Match each energy source to where its energy comes from:', [
    ['solar', 'sunlight'],
    ['wind', 'moving air'],
    ['hydroelectric', 'falling water'],
    ['geothermal', 'heat from inside the Earth'],
  ], { emoji: '⚡', why: 'Ontario gets a lot of its power from falling water — Niagara Falls is a power station.' }),
  choice('g7sb-40', 'sci-energy', 'With NO greenhouse effect at all, Earth would be…', 'far too cold for most life', ['far too hot for most life', 'exactly the same as now', 'covered in rain all year', 'windy all the time', 'closer to the sun'], {
    emoji: '🥶',
    why: 'About −18 °C on average. The problem isn’t the greenhouse effect — it’s making it stronger.',
  }),
]
