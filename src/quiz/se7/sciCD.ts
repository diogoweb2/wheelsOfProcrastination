// §14d — Science: Form and Function, and Heat in the Environment.
// Written by hand in session. See ./build.ts for how an idea and its versions work.
import { chapter, choice, match, order } from './build'

export const SCI_CD = [
  // --- 🏗️ Solid, frame and shell structures ------------------------------------------
  chapter('sci-forms', [
    ['three-types', {
      explain: [
        'A solid structure is made of one solid mass: a dam, a brick wall, a pyramid.',
        'A frame structure is a skeleton of parts: a bicycle, a hydro tower, your own skeleton.',
        'A shell structure is a thin curved outer layer: an egg, a helmet, a dome.',
      ],
      video: 'sci-forms-v0',
      watchFor: 'Name one example of each kind of structure.',
    }, [
      match('Match each structure to its type:', [
        ['a concrete dam', 'solid'],
        ['a hydro tower', 'frame'],
        ['an eggshell', 'shell'],
      ], { emoji: '🏗️', why: 'Mass, skeleton, or thin curved layer.' }),
      choice('What kind of structure is a bicycle?', 'frame', ['solid', 'shell', 'liquid', 'hollow'], {
        emoji: '🚲',
        why: 'A skeleton of connected tubes.',
      }),
      choice('What kind of structure is a bike helmet?', 'shell', ['solid', 'frame', 'tower', 'truss'], {
        emoji: '⛑️',
        why: 'A thin curved outer layer.',
      }),
    ]],
    ['strength', {
      explain: [
        'Solid structures are strong because of their mass, but they are heavy.',
        'Frames are light and use little material, but they need joints to stay strong.',
        'Shells are light and strong because the curve spreads force all around.',
      ],
      video: 'sci-forms-v2',
    }, [
      choice('Why can an egg survive being squeezed end to end?', 'its curve spreads the force around', ['its shell is as thick as a brick', 'its yolk pushes back against you', 'it is a solid mass all the way through', 'it has a frame of bones inside it'], {
        emoji: '🥚',
        why: 'That is why domes and arches are so strong.',
      }),
      choice('What is an advantage of a frame structure?', 'it is strong but uses little material', ['it weighs more than any other type', 'it cannot ever be taken apart again', 'it has no joints or connections at all', 'it is always made out of a solid block'], {
        why: 'A tower of steel beams is mostly air.',
      }),
      choice('What is a drawback of a solid structure?', 'it is very heavy', ['it is very flimsy', 'it has too many joints', 'it needs no material', 'it is too light to stand'], {
        why: 'A dam is strong because it is massive.',
      }),
    ]],
    ['triangle', {
      explain: [
        'A triangle is the strongest shape for a frame.',
        'A square can be pushed into a diamond shape.',
        'A triangle cannot change shape unless a side bends or breaks.',
        'That is why bridges are full of triangles.',
      ],
      video: 'sci-forms-v1',
    }, [
      choice('Which shape makes a frame the strongest?', 'a triangle', ['a square', 'a circle', 'a rectangle', 'a pentagon'], {
        emoji: '🔺',
        why: 'It cannot change shape without breaking.',
      }),
      choice('A square wooden frame keeps leaning sideways. What is the best fix?', 'add a diagonal brace', ['paint it a new colour', 'use bigger square parts', 'make the sides longer', 'turn it the other way'], {
        emoji: '🪵',
        why: 'A diagonal turns the square into two triangles.',
      }),
      choice('Why do bridges use so many triangles?', 'triangles do not change shape easily', ['triangles are easier to paint well', 'triangles are the prettiest shape', 'triangles use more steel than squares', 'triangles keep birds from landing'], {
        why: 'They are called trusses.',
      }),
    ]],
    ['mixed', {
      explain: [
        'Many structures are a mix of the three.',
        'A house has a frame of beams, covered by shell-like walls and a roof.',
        'A car has a frame inside and a shell outside.',
      ],
      video: 'sci-forms-v0',
    }, [
      choice('A house has wooden beams inside and a roof on top. What type of structure is it?', 'a combination of types', ['only a solid structure', 'only a shell structure', 'not really a structure', 'a pure liquid structure'], {
        emoji: '🏠',
        why: 'Most real things combine them.',
      }),
      choice('Which is a good example of frame and shell together?', 'a car', ['a dam', 'a brick', 'a nail', 'a rock'], {
        emoji: '🚗',
        why: 'Steel frame inside, thin panels outside.',
      }),
      choice('An igloo is a dome of snow blocks. What is it closest to?', 'a shell', ['a frame', 'a truss', 'a tower', 'a lever'], {
        why: 'Curved outer layer, with no inner skeleton.',
      }),
    ]],
    ['nature', {
      explain: [
        'Nature made these structures first.',
        'Your skeleton is a frame. A turtle’s back is a shell.',
        'A beaver dam is a solid structure.',
        'Engineers copy nature’s designs. That is called biomimicry.',
      ],
      video: 'sci-forms-v1',
    }, [
      match('Match each one from nature to its type:', [
        ['your skeleton', 'frame'],
        ['a turtle’s back', 'shell'],
        ['a boulder', 'solid'],
      ], { emoji: '🐢', why: 'Nature used all three first.' }),
      choice('What does “biomimicry” mean?', 'copying designs from nature', ['building out of living trees', 'studying how animals move', 'testing a design on animals', 'naming a bridge after a bird'], {
        why: 'Velcro was copied from burrs.',
      }),
      choice('A spider web is mostly which type of structure?', 'frame', ['solid', 'shell', 'dome', 'wall'], {
        emoji: '🕸️',
        why: 'Thin connected strands.',
      }),
    ]],
  ]),

  // --- 🧲 Forces on structures ---------------------------------------------------------
  chapter('sci-forces', [
    ['four', {
      explain: [
        'Four forces can damage a structure.',
        'Compression: squeezing. Tension: pulling apart.',
        'Shear: sliding in opposite directions, like scissors.',
        'Torsion: twisting.',
      ],
      video: 'sci-forces-v0',
      watchFor: 'What does each of the four forces do?',
    }, [
      match('Match each force to what it does:', [
        ['compression', 'squeezes'],
        ['tension', 'pulls apart'],
        ['shear', 'slides in opposite directions'],
        ['torsion', 'twists'],
      ], { emoji: '🧲', why: 'Four ways to break something.' }),
      choice('You wring out a wet towel. Which force is that?', 'torsion', ['tension', 'shear', 'compression', 'gravity'], {
        emoji: '🧺',
        why: 'Twisting.',
      }),
      choice('A rope in a tug of war is under which force?', 'tension', ['torsion', 'shear', 'compression', 'friction'], {
        emoji: '🪢',
        why: 'It is being pulled from both ends.',
      }),
    ]],
    ['spot', {
      explain: [
        'Look at how the object is being loaded.',
        'A pillar holding up a roof: compression.',
        'A cable holding up a bridge: tension.',
        'Scissors cutting paper: shear.',
      ],
      video: 'sci-forces-v1',
    }, [
      choice('A stone pillar holds up a roof. Which force is it under?', 'compression', ['tension', 'torsion', 'shear', 'lift'], {
        emoji: '🏛️',
        why: 'The weight is squeezing it.',
      }),
      choice('Scissors cut through paper. Which force is doing the cutting?', 'shear', ['torsion', 'tension', 'compression', 'magnetism'], {
        emoji: '✂️',
        why: 'The two blades slide past each other.',
      }),
      choice('What force is on the cables of a suspension bridge?', 'tension', ['compression', 'torsion', 'shear', 'friction'], {
        emoji: '🌉',
        why: 'The deck hangs from them, pulling them tight.',
      }),
    ]],
    ['beam', {
      explain: [
        'A bending beam has two forces at once.',
        'The top is squeezed: compression.',
        'The bottom is stretched: tension.',
      ],
      video: 'sci-forces-v1',
    }, [
      choice('You bend a ruler into a U. What happens on the INSIDE of the curve?', 'it is squeezed (compression)', ['it is stretched (tension)', 'it is twisted (torsion)', 'it is sliced apart (shear)', 'nothing at all happens there'], {
        emoji: '📏',
        why: 'The inner curve is in compression, the outer curve in tension.',
      }),
      choice('A heavy person stands in the middle of a plank. Which part is under tension?', 'the bottom of the plank', ['the top of the plank', 'the person’s two feet', 'the ground under the end', 'no part of the plank'], {
        why: 'The bottom stretches as the plank sags.',
      }),
      choice('Why is concrete often reinforced with steel bars?', 'concrete is weak under tension', ['concrete is weak under compression', 'steel makes it weigh a lot less', 'steel makes it dry much faster', 'steel gives it a smoother look'], {
        why: 'Concrete handles squeezing well. Steel handles pulling.',
      }),
    ]],
    ['loads', {
      explain: [
        'A load is a force on a structure.',
        'Dead load (static): the weight of the structure itself.',
        'Live load (dynamic): things that change or move, like cars, people, wind and snow.',
      ],
      video: 'sci-forces-v0',
    }, [
      match('Sort each load:', [
        ['the weight of the bridge', 'dead load'],
        ['cars driving across the bridge', 'live load'],
      ], { emoji: '🌉', why: 'Stays the same, or changes?' }),
      choice('Heavy snow on a roof is what kind of load?', 'a live load', ['a dead load', 'a shear load', 'a frame load', 'a zero load'], {
        emoji: '❄️',
        why: 'It comes and goes.',
      }),
      choice('Fans jumping in a stadium are a…', 'live (dynamic) load', ['dead (static) load', 'torsion-only load', 'frame-only load', 'no load at all'], {
        emoji: '🏟️',
        why: 'It moves and changes. Engineers must plan for it.',
      }),
    ]],
    ['internal', {
      explain: [
        'External forces come from outside: wind, weight, a push.',
        'Internal forces happen inside the material: tension, compression, shear, torsion.',
        'A structure stands up when its internal forces can handle the external ones.',
      ],
      video: 'sci-forces-v0',
    }, [
      choice('Wind pushes on a tower. What kind of force is the wind?', 'an external force', ['an internal force', 'a chemical force', 'a magnetic force', 'a torsion force'], {
        emoji: '🌬️',
        why: 'It comes from outside the structure.',
      }),
      choice('Why does a structure fail?', 'the forces are more than it can handle', ['it was painted the wrong kind of colour', 'it has too many triangles holding it up', 'it has no people inside of it at the time', 'the forces on it dropped down to nothing'], {
        why: 'When load beats strength, something gives.',
      }),
      match('Sort each force:', [
        ['a gust of wind', 'external'],
        ['tension inside a beam', 'internal'],
      ], { why: 'Outside the structure, or inside the material?' }),
    ]],
  ]),

  // --- ⚖️ Centre of gravity and stability ----------------------------------------------
  chapter('sci-gravity', [
    ['what', {
      explain: [
        'The centre of gravity is the point where an object’s weight seems to act.',
        'Balance it there and it will not tip.',
        'It can even be outside the object, like in a ring.',
      ],
      video: 'sci-gravity-v0',
      watchFor: 'What is the centre of gravity?',
    }, [
      choice('What is the centre of gravity?', 'the point where the weight seems to act', ['the lowest point on the whole object', 'the place that is the middle of Earth', 'the part of the object you hold it by', 'the point at which it weighs the most'], {
        emoji: '⚖️',
        why: 'Balance it there, and it stays balanced.',
      }),
      choice('You balance a ruler on one finger. Where is your finger?', 'under its centre of gravity', ['at the end of the ruler', 'under the heavier number', 'under the thinnest part', 'nowhere near the middle'], {
        emoji: '📏',
        why: 'That is the balance point.',
      }),
      choice('Where is the centre of gravity of a uniform ball?', 'right at its centre', ['on its bottom edge', 'on its top surface', 'just outside of it', 'it does not have one'], {
        why: 'Its weight is spread evenly.',
      }),
    ]],
    ['low-wide', {
      explain: [
        'Two things make an object stable.',
        'A low centre of gravity.',
        'A wide base.',
        'Racing cars are low and wide for this reason.',
      ],
      video: 'sci-gravity-v2',
      watchFor: 'What two things keep an object from tipping?',
    }, [
      choice('Which is the most stable shape?', 'low with a wide base', ['tall with a narrow base', 'tall with a pointed base', 'high with a tiny base', 'thin with a round base'], {
        emoji: '🏎️',
        why: 'Low and wide is hard to tip.',
      }),
      choice('Why does a goalkeeper bend their knees and spread their feet?', 'to lower their centre of gravity', ['to look a lot bigger to the striker', 'to make their legs less tired out', 'to raise their centre of gravity', 'to get closer to the ball in the air'], {
        emoji: '🧤',
        why: 'Lower and wider: harder to knock over.',
      }),
      choice('A tall bookcase tips easily. What is the best fix?', 'put the heavy books on the bottom', ['put the heavy books on the very top', 'paint the bookcase a darker colour', 'make the bottom of it much narrower', 'add more books to the highest shelf'], {
        why: 'Weight low keeps the centre of gravity low.',
      }),
    ]],
    ['tip', {
      explain: [
        'An object tips when its centre of gravity moves past the edge of its base.',
        'Lean a chair slowly: it comes back, until it passes that point.',
        'After that, it falls.',
      ],
      video: 'sci-gravity-v1',
    }, [
      choice('When does an object tip over?', 'its centre of gravity passes its base', ['it is heavier than a person standing', 'it is painted with a very dark colour', 'its base becomes a lot wider than before', 'it is pushed by an extremely soft wind'], {
        emoji: '🪑',
        why: 'Past the edge, gravity pulls it over.',
      }),
      choice('The Leaning Tower of Pisa still stands. Why?', 'its centre of gravity is still over its base', ['it is held up with very long cables', 'gravity does not work in that part of Italy', 'it is made entirely out of light paper', 'it has a much thinner top than the bottom'], {
        emoji: '🗼',
        why: 'Engineers have worked to keep it there.',
      }),
      choice('A truck is piled high with a tall load. Why is it more likely to roll on a turn?', 'its centre of gravity has gone up', ['its base has got a lot wider there', 'its wheels have got much heavier', 'its engine has got a lot stronger', 'its load has lost almost all its mass'], {
        emoji: '🚚',
        why: 'High load, high centre of gravity.',
      }),
    ]],
    ['people', {
      explain: [
        'Your body balances all the time.',
        'To stand on one foot, you shift your weight over that foot.',
        'Carrying a heavy bag on one side, you lean the other way.',
      ],
      video: 'sci-gravity-v2',
    }, [
      choice('You carry a heavy bag in your right hand. Which way do you lean?', 'to your left', ['to your right', 'straight forward', 'straight back', 'you don’t lean at all'], {
        emoji: '🎒',
        why: 'You move your weight back over your feet.',
      }),
      choice('Why do tightrope walkers carry a long pole?', 'it lowers and steadies their balance', ['it gives them something to do with it', 'it keeps them warm up on the rope', 'it lets them touch the ground below', 'it is there to make them look taller'], {
        emoji: '🎪',
        why: 'The drooping pole lowers the centre of gravity and slows any tipping.',
      }),
      choice('To stand on one foot, what must your body do?', 'move your weight over that foot', ['move your weight to the raised foot', 'lift both of your arms up high', 'bend forward as far as you can go', 'hold your breath until you fall'], {
        why: 'The centre of gravity must stay over the base.',
      }),
    ]],
    ['design', {
      explain: [
        'Designers use these ideas all the time.',
        'Cranes use counterweights so they do not tip.',
        'Lamps have heavy bases. Tall towers have deep foundations.',
      ],
      video: 'sci-gravity-v1',
    }, [
      choice('What is a crane’s counterweight for?', 'to stop the crane from tipping', ['to make the crane move faster', 'to lift the load much higher', 'to keep the driver comfortable', 'to give the crane more power'], {
        emoji: '🏗️',
        why: 'It balances the heavy load on the other side.',
      }),
      choice('Why does a desk lamp have a heavy base?', 'to keep its centre of gravity low', ['to make the bulb shine brighter', 'to make it harder to steal from you', 'to keep the electricity inside', 'to make the top much heavier'], {
        emoji: '💡',
        why: 'Low weight, stable lamp.',
      }),
      choice('Why does the CN Tower have a huge foundation?', 'to stay stable in strong winds', ['to store the tower’s extra water', 'to hold the elevators at night', 'to keep tourists from going down', 'to keep the tower warm in winter'], {
        emoji: '🗼',
        why: 'A deep, wide base keeps a tall structure stable.',
      }),
    ]],
  ]),

  // --- 🧯 Designing so it fails safely ---------------------------------------------------
  chapter('sci-fail', [
    ['why', {
      explain: [
        'Every structure can fail.',
        'Good designers ask: what happens on the bad day?',
        'Failures come from too much load, weak materials, bad design or wearing out.',
      ],
      video: 'sci-fail-v2',
      watchFor: 'List some reasons structures fail.',
    }, [
      choice('Which is a common reason a structure fails?', 'a load bigger than it was built for', ['too many careful safety inspections', 'a design that plans for bad weather', 'being built out of very strong steel', 'too much maintenance during its life'], {
        emoji: '🏚️',
        why: 'Too much force is a big one.',
      }),
      choice('What is metal fatigue?', 'metal weakening from being bent many times', ['a metal worker who needs to take a rest', 'metal becoming stronger as time goes by', 'a kind of paint used on old metal parts', 'metal melting on a very sunny afternoon'], {
        emoji: '📎',
        why: 'Bend a paper clip back and forth until it snaps.',
      }),
      choice('What is the best question for a good designer to ask?', 'what happens if this part fails?', ['what colour should this part be?', 'how cheap can I make this look?', 'how can I hide the warning sign?', 'how many people will admire it?'], {
        why: 'Good design plans for the bad day.',
      }),
    ]],
    ['meant-to-break', {
      explain: [
        'Some parts are made to break, to save everything else.',
        'A fuse melts before wires can overheat.',
        'A car’s crumple zone crushes so the people inside do not.',
        'A helmet’s foam cracks to absorb a hit.',
      ],
      video: 'sci-fail-v2',
    }, [
      choice('Why is the front of a car built to crumple?', 'to absorb the crash and protect people', ['to make the car cheaper to repair', 'to make the car look more modern', 'to make the car a lot more stylish', 'to make the car go quite a bit faster'], {
        emoji: '🚗',
        why: 'The car takes the hit instead of you.',
      }),
      choice('A fuse melts when there is too much current. Why is that a good thing?', 'it stops wires from overheating', ['it adds power to the house lights', 'it keeps the fridge very cold', 'it saves money on the hydro bill', 'it makes the wires a lot stronger'], {
        emoji: '⚡',
        why: 'A cheap part dies to save the house.',
      }),
      choice('You crash your bike and your helmet cracks. What should you do?', 'replace it — it did its job', ['glue it and wear it again', 'keep wearing it the same', 'paint over the big crack', 'turn it the other way round'], {
        emoji: '⛑️',
        why: 'The foam absorbed the hit once and cannot do it again.',
      }),
    ]],
    ['safety-factor', {
      explain: [
        'Engineers build things stronger than they need to be.',
        'A bridge meant for 10 tonnes might hold 30.',
        'That extra margin is called the safety factor.',
      ],
      video: 'sci-fail-v1',
    }, [
      choice('What is a safety factor?', 'building stronger than needed', ['a list of all the rules at work', 'a sign that says to be careful', 'a type of very strong metal alloy', 'a person who inspects the bridge'], {
        emoji: '🧮',
        why: 'Extra strength, for what nobody predicted.',
      }),
      choice('A bridge expects 10 tonnes. Which design is the safest?', 'one that holds 30 tonnes', ['one that holds 10 tonnes', 'one that holds 11 tonnes', 'one that holds 9 tonnes', 'one that holds 5 tonnes'], {
        why: 'The margin covers surprises.',
      }),
      choice('Why not just build to exactly what you expect?', 'loads and materials can surprise you', ['exact designs are always too costly', 'extra strength looks a lot nicer', 'it is against the rules of physics', 'building it weak uses more materials'], {
        why: 'Snow, wind, age, a truck that is too heavy.',
      }),
    ]],
    ['famous', {
      explain: [
        'The Quebec Bridge collapsed in 1907 while it was being built, killing 75 workers.',
        'Bad calculations meant it was too weak for its own weight.',
        'Canadian engineers wear an iron ring to remember their duty.',
      ],
      video: 'sci-fail-v2',
    }, [
      choice('Why did the Quebec Bridge collapse in 1907?', 'it was too weak for its own weight', ['it was hit by a large ship', 'an earthquake shook the river', 'it was bombed during a big war', 'it was struck by lightning twice'], {
        emoji: '🌉',
        why: 'Bad calculations. 75 workers died.',
      }),
      choice('What do many Canadian engineers wear to remember their duty?', 'an iron ring', ['a gold watch', 'a red badge', 'a silver pin', 'a steel hat'], {
        emoji: '💍',
        why: 'On the little finger of the working hand.',
      }),
      choice('What is the main lesson of a bridge disaster?', 'check the calculations and listen to warnings', ['bridges should never ever be built again', 'only very short bridges are worth building', 'workers are the people to blame for failure', 'rivers are much too dangerous to go across'], {
        why: 'Warnings had been raised before the collapse.',
      }),
    ]],
    ['test', {
      explain: [
        'Designers test on models before building the real thing.',
        'Crash test dummies, wind tunnels, and load tests.',
        'They test until it breaks, to find out where it breaks.',
      ],
      video: 'sci-fail-v1',
      watchFor: 'What steps are in the design process?',
    }, [
      choice('Why do car makers crash brand-new cars on purpose?', 'to find out how they fail', ['to use up the extra cars', 'to amuse the staff there', 'to test the paint colours', 'to make room in the lot'], {
        emoji: '💥',
        why: 'Better a dummy than a driver.',
      }),
      choice('Your popsicle-stick bridge breaks at 5 kg. What should you do next?', 'see where it broke, and improve it', ['start again with the same plan', 'add some paint to cover the crack', 'say that the test was not fair', 'give up on building any bridge'], {
        emoji: '🪵',
        why: 'A failure is information.',
      }),
      order('Put the design process in order:', ['identify the problem', 'plan a design', 'build a model', 'test it', 'improve it'], {
        emoji: '🔧',
        why: 'Then test again.',
      }),
    ]],
  ]),

  // --- ⚙️ Mechanisms and mechanical advantage --------------------------------------------
  chapter('sci-mech', [
    ['trade', {
      explain: [
        'Simple machines do not create energy. They trade distance for force.',
        'Push a small force over a long distance, and you get a big force over a short one.',
        'A ramp is longer than stairs, but easier.',
      ],
      video: 'sci-mech-v0',
      watchFor: 'What do you give up to get more force?',
    }, [
      choice('What does a simple machine trade?', 'distance for force', ['speed for colour', 'mass for energy', 'heat for strength', 'time for gravity'], {
        emoji: '⚙️',
        why: 'Less force, more distance. No free lunch.',
      }),
      choice('Pushing a piano up a long ramp is easier than lifting it. What is the catch?', 'you have to push it further', ['you need to push it much harder', 'the piano gets a lot heavier', 'the ramp makes the piano warmer', 'there is no catch of any kind'], {
        emoji: '🎹',
        why: 'Less force, more distance.',
      }),
      choice('Which is true about simple machines?', 'they cannot create extra energy', ['they create energy out of nothing', 'they always need electric power', 'they never have any moving parts', 'they only work on a flat surface'], {
        why: 'They change how you use the energy.',
      }),
    ]],
    ['lever', {
      explain: [
        'A lever is a bar that turns on a fulcrum.',
        'Effort is the force you apply. Load is what you are moving.',
        'Move the fulcrum closer to the load, and it gets easier.',
      ],
      video: 'sci-mech-v1',
      watchFor: 'Point out the fulcrum, the load and the effort.',
    }, [
      match('Match each part of a lever:', [
        ['fulcrum', 'the point it turns on'],
        ['effort', 'the force you apply'],
        ['load', 'what you are moving'],
      ], { emoji: '🪛', why: 'Seesaw: the middle is the fulcrum.' }),
      choice('You want to lift a heavy rock with a bar. Where should the fulcrum go?', 'close to the rock', ['far from the rock', 'on top of the rock', 'in your two hands', 'it makes no difference'], {
        emoji: '🪨',
        why: 'A longer effort arm means less force.',
      }),
      choice('Which of these is a lever?', 'a seesaw', ['a ramp', 'a wheel', 'a rope', 'a wedge'], {
        why: 'A bar turning on a fulcrum.',
      }),
    ]],
    ['ma', {
      explain: [
        'Mechanical advantage tells you how much a machine multiplies your force.',
        'Mechanical advantage = load ÷ effort.',
        'If a 100 N load needs only 25 N of effort, the mechanical advantage is 4.',
      ],
      video: 'sci-mech-v2',
    }, [
      choice('A machine lifts a 100 N load with 25 N of effort. What is its mechanical advantage?', '4', ['2', '25', '75', '125'], {
        emoji: '🧮',
        why: '100 ÷ 25 = 4.',
      }),
      choice('What does a mechanical advantage of 3 mean?', 'it triples your force', ['it lifts three loads', 'it takes three people', 'it takes three seconds', 'it weighs three times more'], {
        why: 'Your push is multiplied by 3.',
      }),
      choice('Mechanical advantage is calculated with…', 'load ÷ effort', ['effort ÷ load', 'load + effort', 'load − effort', 'effort × load'], {
        why: 'How many times heavier the load is than your push.',
      }),
    ]],
    ['pulley', {
      explain: [
        'A pulley is a wheel with a rope around it.',
        'One fixed pulley changes the direction of your pull.',
        'Add more pulleys and you need less force, but you pull more rope.',
      ],
      video: 'sci-mech-v2',
    }, [
      choice('What does a single fixed pulley do?', 'it changes the direction of your pull', ['it doubles the force of your pull', 'it makes the load weigh much less', 'it shortens the rope you need', 'it makes the rope a lot stronger'], {
        emoji: '🛞',
        why: 'Pull down to lift up. The force is the same.',
      }),
      choice('The Thousand Sunny hauls up an anchor with several pulleys. What is the trade-off?', 'less force, but more rope to pull', ['more force, and less rope to pull', 'less force, and less rope to pull', 'the anchor gets lighter under water', 'no trade-off at all with pulleys'], {
        emoji: '⚓',
        why: 'Distance for force, again.',
      }),
      choice('Where would you find a pulley?', 'a flagpole', ['a door wedge', 'a hammer', 'a ramp', 'a stapler'], {
        why: 'Pull down on the rope, and the flag goes up.',
      }),
    ]],
    ['gears', {
      explain: [
        'Gears are wheels with teeth that turn each other.',
        'A small gear turning a big gear: slower but with more force.',
        'A big gear turning a small gear: faster but with less force.',
        'Two meshed gears turn in opposite directions.',
      ],
      video: 'sci-mech-v0',
    }, [
      choice('You climb a steep hill on a bike. Which gear should you use?', 'a low gear: easier but slower', ['a high gear: harder but faster', 'any gear, they all feel the same', 'no gears, just use the brakes', 'the top gear: the hardest of all'], {
        emoji: '🚲',
        why: 'More force, less speed.',
      }),
      choice('Gear A turns clockwise and meshes with gear B. Which way does gear B turn?', 'counter-clockwise', ['clockwise as well', 'it does not move', 'up and down', 'side to side'], {
        emoji: '⚙️',
        why: 'Meshed gears turn opposite ways.',
      }),
      choice('A big gear drives a small gear. What happens to the small gear?', 'it spins faster', ['it spins slower', 'it stops spinning', 'it gets heavier', 'it gets bigger'], {
        why: 'It has fewer teeth to go round.',
      }),
    ]],
  ]),

  // --- 🌡️ Heat and temperature are not the same -------------------------------------------
  chapter('sci-heat', [
    ['difference', {
      explain: [
        'Temperature tells you how fast the particles are moving, on average.',
        'Heat is energy that flows from something hot to something cooler.',
        'A spark is very hot but has very little heat energy. A bathtub of warm water has a lot.',
      ],
      video: 'sci-heat-v1',
      watchFor: 'What is the difference between heat and temperature?',
    }, [
      choice('What does temperature measure?', 'how fast the particles move, on average', ['the total number of particles in it', 'the size of the particles in an object', 'how much the object weighs in grams', 'how many colours the object contains'], {
        emoji: '🌡️',
        why: 'Faster particles, higher temperature.',
      }),
      choice('A spark is hotter than a bathtub. Why doesn’t it burn you?', 'it holds very little thermal energy', ['it has no particles in it at all', 'it is actually very cold inside', 'it has a very low temperature', 'it is too bright to burn anything'], {
        emoji: '✨',
        why: 'High temperature, tiny amount of energy.',
      }),
      choice('Which holds more thermal energy?', 'a warm swimming pool', ['a red-hot match head', 'a small cup of tea', 'a hot steel needle', 'a boiling drop of water'], {
        emoji: '🏊',
        why: 'So many particles, even if each is slower.',
      }),
    ]],
    ['flow', {
      explain: [
        'Heat always flows from hot to cold.',
        'It stops when both are the same temperature.',
        'Cold is not a thing that flows. Cold is less heat.',
      ],
      video: 'sci-heat-v2',
    }, [
      choice('Which way does heat flow?', 'from hot to cold', ['from cold to hot', 'in random ways', 'only upward', 'never at all'], {
        emoji: '➡️',
        why: 'Always.',
      }),
      choice('You hold an ice cube and your hand feels cold. What is really happening?', 'heat is leaving your hand', ['cold is entering your hand', 'your blood is freezing up', 'your hand is making cold', 'nothing is happening at all'], {
        emoji: '🧊',
        why: 'There is no such thing as cold flowing. Heat goes into the ice.',
      }),
      choice('You leave hot soup on the table. When does it stop cooling?', 'when it matches the room', ['when it reaches 0 °C', 'after exactly an hour', 'when it reaches 50 °C', 'it never stops cooling'], {
        emoji: '🍲',
        why: 'Heat flows until both are the same temperature.',
      }),
    ]],
    ['measure', {
      explain: [
        'We measure temperature with a thermometer, in degrees Celsius.',
        'Water freezes at 0 °C and boils at 100 °C.',
        'We measure energy in joules.',
      ],
      video: 'sci-heat-v2',
    }, [
      choice('What unit do we use for energy?', 'joules', ['degrees', 'metres', 'kilograms', 'litres'], {
        emoji: '⚡',
        why: 'Temperature uses degrees. Energy uses joules.',
      }),
      match('Match each temperature to what it marks:', [
        ['0 °C', 'water freezes'],
        ['100 °C', 'water boils'],
        ['37 °C', 'normal body temperature'],
      ], { emoji: '🌡️', why: 'Three numbers worth knowing.' }),
      choice('Why does a thermometer’s liquid rise when it gets warm?', 'the liquid expands', ['the glass shrinks', 'the liquid gets heavier', 'gravity gets weaker', 'the numbers are moving'], {
        why: 'Warmer particles take up more space.',
      }),
    ]],
    ['mass', {
      explain: [
        'More mass needs more energy to heat up.',
        'A full pot takes longer to boil than a half-full one.',
        'Same temperature, but different amounts of heat.',
      ],
      video: 'sci-heat-v0',
    }, [
      choice('Why does a full pot take longer to boil than a half-full one?', 'more water needs more energy', ['boiling depends on the pot’s colour', 'water is hotter in a smaller pot', 'a full pot has a smaller surface', 'full pots use less of the energy'], {
        emoji: '🍲',
        why: 'More particles to speed up.',
      }),
      choice('A cup of water and a bathtub are both at 40 °C. Which has more thermal energy?', 'the bathtub', ['the cup', 'they are equal', 'it cannot be known', 'neither of them'], {
        why: 'Same temperature, much more water.',
      }),
      choice('Two ice cubes melt in a drink. A whole bag melts in the same drink. What is the difference?', 'the bag needs much more heat', ['the bag needs a lot less heat', 'they both need the same heat', 'the drink turns into a gas', 'the cubes get a lot hotter'], {
        emoji: '🧊',
        why: 'More mass, more energy needed.',
      }),
    ]],
    ['feel', {
      explain: [
        'Your skin is a bad thermometer.',
        'Metal feels colder than wood at the same temperature.',
        'That is because metal pulls heat from your hand faster.',
      ],
      video: 'sci-heat-v2',
    }, [
      choice('A metal bench feels colder than a wooden one on the same day. Why?', 'metal pulls heat from you faster', ['metal is at a far lower temperature', 'wood makes its own heat as you sit', 'metal has no particles inside it', 'wood is always warmer than the air'], {
        emoji: '🪑',
        why: 'Same temperature, different conductors.',
      }),
      choice('Why is your skin a poor way to measure temperature?', 'it feels how fast heat is moving', ['it can only feel in the summer', 'it is always the same temperature', 'it cannot feel any heat at all', 'it only works on your left hand'], {
        why: 'That is why thermometers exist.',
      }),
      choice('A tile floor feels colder than a carpet in the same room. What are their temperatures?', 'about the same', ['the tile is far colder', 'the carpet is far hotter', 'the tile is below 0 °C', 'nobody can measure them'], {
        emoji: '🛁',
        why: 'Tile is the better conductor.',
      }),
    ]],
  ]),

  // --- 🔥 Heat and the particle theory ------------------------------------------------------
  chapter('sci-expand', [
    ['expand', {
      explain: [
        'When you heat something, its particles move faster and take up more room.',
        'The material expands.',
        'The particles do not get bigger. The space between them grows.',
      ],
      video: 'sci-expand-v0',
      watchFor: 'Do the particles get bigger, or farther apart?',
    }, [
      choice('Why do most things expand when they are heated?', 'their particles move farther apart', ['their particles get a lot bigger', 'their particles change into gas', 'more particles appear out of nowhere', 'their particles slow down to rest'], {
        emoji: '🔥',
        why: 'Same particles, more space between them.',
      }),
      choice('What happens to most materials when they cool?', 'they contract', ['they expand', 'they evaporate', 'they gain mass', 'they stay the same'], {
        emoji: '❄️',
        why: 'Particles slow down and come closer together.',
      }),
      choice('A metal lid is stuck on a glass jar. What can you do to loosen it?', 'run hot water over the lid', ['put it in the freezer', 'wrap it in cold towels', 'cover it in ice cubes', 'shake it for a minute'], {
        emoji: '🫙',
        why: 'The metal expands more than the glass.',
      }),
    ]],
    ['bridges', {
      explain: [
        'Bridges and roads grow in summer and shrink in winter.',
        'Without gaps, they would buckle or crack.',
        'So engineers leave expansion joints.',
      ],
      video: 'sci-expand-v0',
    }, [
      choice('Why do bridges have gaps in them?', 'to let them expand in the heat', ['to let the rain water drain out', 'to save money on building steel', 'to make cars slow down a little', 'to keep the birds off the road'], {
        emoji: '🌉',
        why: 'They are called expansion joints.',
      }),
      choice('When are the gaps in a bridge narrowest?', 'on a hot summer day', ['on a cold winter day', 'at night in January', 'during a snowstorm', 'they stay the same'], {
        emoji: '☀️',
        why: 'The hot bridge has expanded.',
      }),
      choice('Why do hydro wires sag more in summer?', 'heat makes the metal expand', ['birds sit on them more often', 'summer wind pushes them down', 'the poles shrink in the heat', 'they carry less power then'], {
        why: 'The wire gets slightly longer.',
      }),
    ]],
    ['balloon', {
      explain: [
        'Gases expand the most.',
        'Warm air takes up more space, so it is less dense.',
        'Less dense air rises. That is how a hot air balloon works.',
      ],
      video: 'sci-expand-v1',
    }, [
      choice('Why does a hot air balloon rise?', 'warm air is less dense than cold air', ['the flame pushes the balloon up', 'warm air has no mass to it at all', 'the balloon is pulled up by the sun', 'cold air pushes down on the top'], {
        emoji: '🎈',
        why: 'Particles spread out, so the same space weighs less.',
      }),
      choice('A ball feels flat on a very cold day. Why?', 'the air inside has contracted', ['the ball has leaked air from it', 'the rubber has lost some mass', 'cold air is much heavier air', 'the ball has grown much bigger'], {
        emoji: '⚽',
        why: 'Warm it up and it comes back.',
      }),
      choice('Which of these expands the most when it is heated?', 'a gas', ['a solid', 'a liquid', 'a metal', 'a rock'], {
        why: 'Gas particles are the freest to spread out.',
      }),
    ]],
    ['water-odd', {
      explain: [
        'Water is the strange one.',
        'When it freezes, it expands.',
        'So ice floats, and frozen pipes can burst.',
        'If ice sank, lakes would freeze from the bottom up.',
      ],
      video: 'sci-expand-v2',
    }, [
      choice('What is odd about water when it freezes?', 'it expands instead of contracting', ['it contracts more than other things', 'it loses half of the mass it had', 'it turns into a different element', 'it gets hotter than boiling water'], {
        emoji: '🧊',
        why: 'That is why ice floats.',
      }),
      choice('Why can pipes burst in winter?', 'water expands as it freezes', ['water contracts as it freezes', 'the metal gets far too heavy', 'the snow pushes on the pipes', 'cold air eats through the metal'], {
        emoji: '🚰',
        why: 'The ice has nowhere to go.',
      }),
      choice('Why does a frozen lake still have fish alive in it?', 'ice floats and water stays below it', ['fish can live inside the solid ice', 'all of the fish leave for the winter', 'the ice is only a few millimetres', 'fish make their own heat all winter'], {
        emoji: '🐟',
        why: 'Ice forms a lid, and the water stays liquid underneath.',
      }),
    ]],
    ['state-heat', {
      explain: [
        'While something melts or boils, its temperature stops rising.',
        'The heat is going into breaking particles free, not speeding them up.',
        'Boiling water stays at 100 °C until it has all turned to steam.',
      ],
      video: 'sci-expand-v2',
    }, [
      choice('You keep heating boiling water. What happens to its temperature?', 'it stays at 100 °C', ['it climbs to 200 °C', 'it falls down to 50 °C', 'it goes up very quickly', 'it drops down to 0 °C'], {
        emoji: '♨️',
        why: 'The heat goes into turning water into steam.',
      }),
      choice('Where does the heat go while ice is melting?', 'into freeing the particles', ['into cooling the water', 'into making the ice bigger', 'back into the air above it', 'into the sun’s energy'], {
        why: 'Not into a higher temperature, until it has all melted.',
      }),
      choice('A burn from steam is worse than from boiling water. Why?', 'steam gives up extra heat as it condenses', ['steam is always much heavier than water', 'water at 100 °C is safe to touch for a while', 'steam has particles that are much bigger', 'boiling water is a lot colder than steam'], {
        emoji: '⚠️',
        why: 'All the energy it took to become steam comes back out.',
      }),
    ]],
  ]),

  // --- ♨️ Conduction, convection, radiation --------------------------------------------------
  chapter('sci-transfer', [
    ['three', {
      explain: [
        'Heat travels three ways.',
        'Conduction: through touching particles, mostly in solids.',
        'Convection: warm liquid or gas moves and carries the heat.',
        'Radiation: waves that can cross empty space, like the sun’s heat.',
      ],
      video: 'sci-transfer-v2',
      watchFor: 'Give one example of each kind of heat transfer.',
    }, [
      match('Match each example to how the heat travels:', [
        ['a hot spoon handle', 'conduction'],
        ['warm air rising from a heater', 'convection'],
        ['the sun warming your face', 'radiation'],
      ], { emoji: '♨️', why: 'Touching, moving fluid, or waves.' }),
      choice('How does the sun’s heat reach Earth?', 'radiation', ['convection', 'conduction', 'evaporation', 'expansion'], {
        emoji: '☀️',
        why: 'Space is empty, so only radiation can cross it.',
      }),
      choice('A pot handle gets hot on the stove. How did the heat get there?', 'conduction', ['convection', 'radiation', 'evaporation', 'condensation'], {
        emoji: '🍳',
        why: 'Particle to particle, through the metal.',
      }),
    ]],
    ['conductors', {
      explain: [
        'Conductors let heat through easily: metals.',
        'Insulators slow heat down: wood, plastic, wool, air.',
        'Trapped air is a great insulator. That is how a puffy jacket works.',
      ],
      video: 'sci-transfer-v0',
    }, [
      choice('Why do pots often have plastic handles?', 'plastic is a good insulator', ['plastic is a good conductor', 'plastic is cheaper than gold', 'plastic melts in a nice way', 'plastic adds heat to the food'], {
        emoji: '🥘',
        why: 'It slows the heat down before it reaches your hand.',
      }),
      choice('Why does a puffy jacket keep you warm?', 'it traps air, a good insulator', ['it makes its own heat for you', 'it lets all the cold air out', 'it conducts heat in from outside', 'it reflects the sun onto you'], {
        emoji: '🧥',
        why: 'The jacket slows down the heat leaving you.',
      }),
      match('Sort each material:', [
        ['copper', 'conductor'],
        ['wool', 'insulator'],
      ], { why: 'Metal lets it through. Wool slows it.' }),
    ]],
    ['convection', {
      explain: [
        'Warm fluid expands, becomes less dense and rises.',
        'Cool fluid sinks and takes its place.',
        'This loop is a convection current.',
        'It only works in liquids and gases.',
      ],
      video: 'sci-transfer-v1',
    }, [
      order('Put a convection current in order:', ['the fluid is heated', 'it expands and rises', 'it cools and sinks', 'it is heated again'], {
        emoji: '🔄',
        why: 'It goes round and round.',
      }),
      choice('Why do basements stay cooler than upstairs rooms?', 'warm air rises and cool air sinks', ['cold air is made in the basement', 'basements have much better lights', 'warm air is pulled up by the sun', 'heat cannot go through a basement'], {
        emoji: '🏠',
        why: 'Convection moves the warm air up.',
      }),
      choice('Which of these can NOT have convection currents?', 'a solid steel block', ['a pot of water', 'the air in a room', 'the ocean', 'a heated bath'], {
        why: 'Solid particles cannot flow.',
      }),
    ]],
    ['radiation', {
      explain: [
        'Radiation needs no matter to travel through.',
        'Dark surfaces absorb more radiation. Shiny, light ones reflect more.',
        'That is why a black T-shirt feels hotter in the sun.',
      ],
      video: 'sci-transfer-v2',
    }, [
      choice('Which T-shirt feels hottest in the summer sun?', 'black', ['white', 'yellow', 'pale blue', 'light grey'], {
        emoji: '👕',
        why: 'Dark colours absorb more radiation.',
      }),
      choice('Why are emergency blankets shiny?', 'they reflect your body’s heat back', ['they are very easy to find in the dark', 'they soak up a lot of the sun’s heat', 'they conduct your heat into the air', 'they are cheaper than a wool blanket'], {
        emoji: '🥶',
        why: 'Shiny surfaces reflect radiation.',
      }),
      choice('You sit by a campfire. Your face is warm, but your back is cold. Why?', 'radiation only reaches the side facing it', ['warm air flows around to your back', 'heat cannot get through your clothes', 'conduction is warming you up in front', 'the fire has stopped making any heat'], {
        emoji: '🔥',
        why: 'Radiation travels in straight lines.',
      }),
    ]],
    ['all-three', {
      explain: [
        'Most real situations use all three.',
        'A stove element conducts into the pot.',
        'Water in the pot moves by convection.',
        'You feel radiation with your hand held near the element.',
      ],
      video: 'sci-transfer-v0',
    }, [
      choice('Water boiling in a pot rolls round and round. What is that?', 'convection', ['conduction', 'radiation', 'insulation', 'sublimation'], {
        emoji: '🍲',
        why: 'Warm water rises. Cool water sinks.',
      }),
      choice('A house loses heat in winter. Which helps most?', 'better insulation in the walls', ['more windows on the north side', 'painting the walls a light blue', 'leaving the front door open a bit', 'turning on the ceiling lights'], {
        emoji: '🏠',
        why: 'Insulation slows heat loss.',
      }),
      match('A thermos fights all three. Match each part:', [
        ['vacuum gap', 'stops conduction and convection'],
        ['shiny lining', 'reflects radiation'],
      ], { emoji: '🧋', why: 'That is why soup stays hot for hours.' }),
    ]],
  ]),

  // --- 🌊 Heat in the atmosphere and oceans ----------------------------------------------------
  chapter('sci-climate', [
    ['water-holds', {
      explain: [
        'Water heats up and cools down much more slowly than land.',
        'It takes a lot of energy to change water’s temperature.',
        'Oceans and lakes store huge amounts of heat.',
      ],
      video: 'sci-climate-v2',
      watchFor: 'How do the oceans store and move heat?',
    }, [
      choice('Which heats up faster on a sunny day?', 'the land', ['the ocean', 'a deep lake', 'a big river', 'the sea bed'], {
        emoji: '🏖️',
        why: 'That is why the sand burns your feet and the water is cool.',
      }),
      choice('Why is Lake Ontario still warm in early fall?', 'water loses its heat slowly', ['it gets warm water from Florida', 'the lake is heated by the city', 'the sun is stronger in the fall', 'lake fish give off a lot of heat'], {
        why: 'It stored the summer’s heat.',
      }),
      choice('At the beach in July, which is cooler by afternoon?', 'the water', ['the sand', 'the road', 'the rocks', 'the parking lot'], {
        why: 'Water warms up slowly.',
      }),
    ]],
    ['lake-effect', {
      explain: [
        'Big lakes make nearby places milder.',
        'In summer, Lake Ontario keeps Toronto a bit cooler.',
        'In winter, it keeps Toronto a bit warmer.',
        'Cities far from water have bigger swings in temperature.',
      ],
      video: 'sci-climate-v1',
    }, [
      choice('How does Lake Ontario affect Toronto’s climate?', 'it makes it milder all year', ['it makes every summer much hotter', 'it makes every winter much colder', 'it stops the city from getting rain', 'it has no effect on it at all'], {
        emoji: '🌊',
        why: 'Water holds heat. A lot of it.',
      }),
      choice('Which city has the biggest gap between summer and winter temperatures?', 'Winnipeg', ['Vancouver', 'Victoria', 'Halifax', 'St. John’s'], {
        emoji: '🥶',
        why: 'It is far from any ocean.',
      }),
      choice('Why does Vancouver have mild winters compared with Winnipeg?', 'it is beside the Pacific Ocean', ['it is much further to the south', 'it is a much smaller sized city', 'it has a lot more tall buildings', 'it is much higher above sea level'], {
        why: 'They are at almost the same latitude.',
      }),
    ]],
    ['breeze', {
      explain: [
        'By day, the land heats faster and warm air rises.',
        'Cool air from over the water moves in: a sea breeze.',
        'At night, it reverses: a land breeze.',
        'Wind is convection on a big scale.',
      ],
      video: 'sci-climate-v1',
    }, [
      choice('Why does a breeze blow in from the lake on a hot day?', 'warm air rises over land; cool air moves in', ['fish in the lake make the air start moving', 'the land pushes the air back into the lake', 'the sun blows the wind across the water', 'waves on the shore throw air at the beach'], {
        emoji: '🌬️',
        why: 'That is a convection current.',
      }),
      choice('What causes wind?', 'uneven heating of Earth’s surface', ['trees moving their branches about', 'the moon pulling the clouds around', 'planes flying through the high air', 'the sea making the air go in a line'], {
        why: 'Warm air rises, and cooler air moves in.',
      }),
      choice('At night, which way does the breeze at the beach usually blow?', 'from the land to the water', ['from the water to the land', 'straight down from the sky', 'it always stops at night', 'in a circle round the beach'], {
        why: 'At night the land cools faster, so it reverses.',
      }),
    ]],
    ['currents', {
      explain: [
        'Ocean currents carry heat around the planet.',
        'The Gulf Stream brings warm water from the Gulf of Mexico towards Europe.',
        'That is why Britain is warmer than Labrador, at the same latitude.',
      ],
      video: 'sci-climate-v2',
    }, [
      choice('Why is Britain much warmer than Labrador at the same latitude?', 'a warm ocean current reaches it', ['it has a lot more big cities', 'it is much closer to the sun', 'it has many more hills on it', 'it has a much bigger population'], {
        emoji: '🌊',
        why: 'The Gulf Stream.',
      }),
      choice('What do ocean currents do for the planet?', 'they carry heat around it', ['they make all of the salt', 'they hold the moon in place', 'they cause the earthquakes', 'they keep the planet spinning'], {
        why: 'They move warm water towards the poles, and cold water back.',
      }),
      choice('Which current warms Western Europe?', 'the Gulf Stream', ['the Labrador Current', 'the Humboldt Current', 'the California Current', 'the Canary Current'], {
        why: 'The Labrador Current is a cold one.',
      }),
    ]],
    ['atmosphere', {
      explain: [
        'The atmosphere is a blanket of gases around Earth.',
        'It keeps heat in, so nights do not freeze.',
        'The Moon has no atmosphere: it reaches over 100 °C by day and about −170 °C at night.',
      ],
      video: 'sci-climate-v0',
    }, [
      choice('Why doesn’t Earth freeze every night?', 'the atmosphere holds heat in', ['the Moon sends heat at night', 'Earth’s core heats the air up', 'the sun never stops on Earth', 'the oceans are made of hot lava'], {
        emoji: '🌍',
        why: 'It works like a blanket.',
      }),
      choice('Why are the Moon’s days and nights so extreme?', 'it has no atmosphere', ['it is too close to Earth', 'it has too much water', 'it spins far too fast', 'it has too many lakes'], {
        emoji: '🌙',
        why: 'No blanket, no holding the heat.',
      }),
      choice('Why does it get colder as you climb a mountain?', 'the air is thinner and holds less heat', ['you get closer to the cold of the moon', 'the rocks up high are made out of ice', 'mountains make their own cold air', 'there is much more sunlight up high'], {
        emoji: '🏔️',
        why: 'Thin air, fewer particles to hold the heat.',
      }),
    ]],
  ]),

  // --- 🌍 Energy sources and the greenhouse effect ---------------------------------------------
  chapter('sci-energy', [
    ['greenhouse', {
      explain: [
        'The sun’s energy warms Earth’s surface.',
        'Earth gives off heat, and greenhouse gases trap some of it.',
        'This is natural and good: without it, Earth would be frozen.',
      ],
      video: 'sci-energy-v1',
      watchFor: 'What do greenhouse gases do with the heat?',
    }, [
      choice('What do greenhouse gases do?', 'they trap some of Earth’s heat', ['they block out all of the sunlight', 'they make the ozone layer stronger', 'they make all the rain turn acidic', 'they keep the Moon in its orbit'], {
        emoji: '🌍',
        why: 'In stays in.',
      }),
      choice('Without any greenhouse effect at all, Earth would be…', 'frozen', ['boiling', 'the same', 'much wetter', 'much greener'], {
        emoji: '🥶',
        why: 'About −18 °C on average. The natural effect is good.',
      }),
      order('Put the greenhouse effect in order:', ['sunlight reaches Earth', 'the surface warms up', 'Earth gives off heat', 'greenhouse gases trap some of it'], {
        emoji: '🔄',
        why: 'In, warm, out, trapped.',
      }),
    ]],
    ['enhanced', {
      explain: [
        'Burning fossil fuels adds extra carbon dioxide to the air.',
        'More greenhouse gas traps more heat.',
        'Earth is warming faster than it would naturally.',
        'Carbon dioxide and methane are the big ones.',
      ],
      video: 'sci-energy-v0',
    }, [
      choice('Why is Earth warming faster now?', 'burning fuels adds more greenhouse gas', ['the sun has moved a lot closer to Earth', 'there are more volcanoes every year', 'the Moon is giving off much more light', 'oceans are making a lot of extra heat'], {
        emoji: '🏭',
        why: 'More gas, more trapped heat.',
      }),
      choice('Which gas do we add the most of by burning fossil fuels?', 'carbon dioxide', ['oxygen', 'helium', 'nitrogen', 'hydrogen'], {
        why: 'Cows and landfills add methane too.',
      }),
      choice('The natural greenhouse effect is a blanket. What are humans doing?', 'adding a thicker blanket', ['taking the blanket off', 'making holes in the sun', 'making Earth spin faster', 'moving Earth away a bit'], {
        emoji: '🛏️',
        why: 'Not a new process: more of the same one.',
      }),
    ]],
    ['sources', {
      explain: [
        'Most of Earth’s heat comes from the sun.',
        'We also get heat by burning wood, gas and oil.',
        'Geothermal energy comes from heat deep inside Earth.',
        'Nuclear power heats water to make steam.',
      ],
      video: 'sci-energy-v2',
    }, [
      choice('Where does almost all of Earth’s surface heat come from?', 'the sun', ['the Moon', 'volcanoes', 'the core', 'lightning'], {
        emoji: '☀️',
        why: 'Volcanoes are local.',
      }),
      choice('What is geothermal energy?', 'heat from deep inside Earth', ['heat from the sun’s surface', 'heat from burning some coal', 'heat from fast ocean waves', 'heat from strong winds high up'], {
        emoji: '🌋',
        why: 'Geo = earth, thermal = heat.',
      }),
      match('Match each source to how it is used:', [
        ['solar panel', 'turns sunlight into electricity'],
        ['natural gas furnace', 'burns fuel for heat'],
        ['geothermal pump', 'uses heat from the ground'],
      ], { why: 'Many ways of heating a home.' }),
    ]],
    ['clean', {
      explain: [
        'Some sources put almost no carbon in the air when they run.',
        'Solar, wind, hydro and nuclear.',
        'Most of Ontario’s electricity comes from nuclear and hydro.',
        'Heating and cars are the harder parts to change.',
      ],
      video: 'sci-energy-v2',
    }, [
      choice('Which of these gives off carbon dioxide when it is running?', 'a coal plant', ['a wind turbine', 'a solar panel', 'a hydro dam', 'a nuclear plant'], {
        emoji: '🏭',
        why: 'The others make almost none while running.',
      }),
      choice('Most of Ontario’s electricity comes from…', 'nuclear and hydro', ['coal and crude oil', 'wind and sunshine', 'wood and dry peat', 'gas and black coal'], {
        emoji: '⚡',
        why: 'Ontario closed its coal plants by 2014.',
      }),
      choice('Which change cuts a home’s heating energy the most?', 'better insulation', ['a new doorbell', 'brighter paint', 'a smaller TV', 'a longer hose'], {
        emoji: '🏠',
        why: 'Less heat lost means less fuel burned.',
      }),
    ]],
    ['weather-mix', {
      explain: [
        'Weather is day to day. Climate is the average over decades.',
        'One cold day does not disprove global warming.',
        'The ozone hole and the greenhouse effect are two different problems.',
      ],
      video: 'sci-energy-v1',
    }, [
      choice('It snows heavily in April. Does this prove global warming is false?', 'no — one day is weather, not climate', ['yes — it was colder than the average', 'yes — snow means that it is cooling', 'no — it proves the planet is cooling', 'yes — a single day settles the matter'], {
        emoji: '🌨️',
        why: 'Climate is measured over decades.',
      }),
      choice('The greenhouse effect is the same thing as the ozone hole. True?', 'no — they are separate problems', ['yes — they are exactly the same', 'yes — ozone is the main heat trap', 'no — ozone holes do not exist', 'yes — but only over the Arctic'], {
        why: 'Ozone blocks UV. Greenhouse gases trap heat.',
      }),
      choice('What is the difference between weather and climate?', 'weather is short-term; climate is long-term', ['weather is hot; climate is cold every year', 'weather is local; climate is only in space', 'weather is rain; climate is only sunshine', 'there is no difference between those two'], {
        why: 'Your outfit is weather. Your wardrobe is climate.',
      }),
    ]],
  ]),
]
