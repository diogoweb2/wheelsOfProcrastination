// Grade 6 Science (Ontario) — 50 seed questions, tuned for Ben (born Feb 2014, Ontario grade 6).
// Core material (weight 2): space & the solar system, electricity & circuits, flight,
// biodiversity & classification — the four big grade 6 strands.
// Fun extras (weight 1): record-breaking animals, weird space facts, famous inventions.
// Every choice question carries 7 options (1 right + 6 believable wrongs); the app samples 4.
// This file only seeds Firestore (app/quizBank) on first run — after that, the bank
// in Firestore is the source of truth (removals, AI-regenerated questions, edits).
import type { QuizQuestion } from '../types'

const AT = '2026-07-19T00:00:00.000Z'
const T = 'science-6'

const choice = (
  id: string,
  prompt: string,
  choices: string[],
  answer: string,
  opts: Partial<QuizQuestion> = {},
): QuizQuestion => ({
  id,
  topicId: T,
  type: 'choice',
  prompt,
  choices,
  answer,
  weight: 2,
  points: 8,
  status: 'active',
  createdAt: AT,
  ...opts,
})

export const SCIENCE_6_SEED: QuizQuestion[] = [
  // --- space: the solar system ---------------------------------------------
  choice('sc-01', 'How many planets are in our solar system?', ['8', '7', '9', '10', '6', '12', '11'], '8', {
    emoji: '🪐',
    funFact: 'It used to be 9! Pluto was demoted to a “dwarf planet” in 2006 because it hasn’t cleared its orbit of other junk.',
  }),
  choice('sc-02', 'Which planet is closest to the Sun?', ['Mercury', 'Venus', 'Earth', 'Mars', 'Neptune', 'Jupiter', 'Saturn'], 'Mercury', {
    emoji: '☀️',
    funFact: 'Mercury is closest, but Venus is the HOTTEST — its thick clouds trap heat like a blanket.',
  }),
  choice('sc-03', 'Which is the LARGEST planet in our solar system?', ['Jupiter', 'Saturn', 'Neptune', 'Uranus', 'Earth', 'Venus', 'Mars'], 'Jupiter', {
    emoji: '🌕',
    funFact: 'You could fit over 1,300 Earths inside Jupiter. Its Great Red Spot is a storm bigger than our whole planet.',
  }),
  choice('sc-04', 'Which planet is famous for its bright rings?', ['Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Earth', 'Pluto'], 'Saturn', {
    emoji: '💍',
    funFact: 'Saturn’s rings are mostly ice chunks — some the size of a grain of sand, some the size of a house.',
  }),
  choice('sc-05', 'Which planet is known as the “Red Planet”?', ['Mars', 'Venus', 'Mercury', 'Jupiter', 'Neptune', 'Saturn', 'Uranus'], 'Mars', {
    emoji: '🔴',
    funFact: 'Mars looks red because its soil is full of rusty iron. The whole planet is basically rusting.',
  }),
  choice('sc-06', 'What is the Sun?', ['A star', 'A planet', 'A moon', 'A comet', 'An asteroid', 'A galaxy', 'A meteor'], 'A star', {
    emoji: '⭐',
    funFact: 'The Sun is an average-sized star — it just looks huge because it’s our closest one, 150 million km away.',
  }),
  choice('sc-07', 'What causes day and night on Earth?', ['Earth rotating on its axis', 'Earth orbiting the Sun', 'The Moon blocking the Sun', 'The Sun turning off', 'Earth’s tilt', 'Clouds covering the sky', 'The Sun orbiting Earth'], 'Earth rotating on its axis', {
    emoji: '🌗',
    funFact: 'Earth spins once every 24 hours — at the equator that’s about 1,600 km/h. You’re moving right now!',
  }),
  choice('sc-08', 'How long does Earth take to travel once around the Sun?', ['About 365 days', 'About 24 hours', 'About 30 days', 'About 12 hours', 'About 100 days', 'About 10 years', 'About 28 days'], 'About 365 days', {
    emoji: '📅',
    funFact: 'It’s actually 365¼ days — that leftover quarter is why we add February 29 every 4 years.',
  }),
  choice('sc-09', 'What causes Earth’s seasons?', ['Earth’s tilted axis', 'Earth getting closer to the Sun', 'The Moon’s phases', 'Earth spinning faster in summer', 'Clouds blocking sunlight', 'The Sun growing hotter', 'Earth’s magnetic field'], 'Earth’s tilted axis', {
    emoji: '🍂',
    funFact: 'Earth is tilted 23.5°. When your half leans toward the Sun it’s summer — that’s why Australia has Christmas in summer.',
  }),
  choice('sc-10', 'About how long does the Moon take to orbit Earth once?', ['About 28 days', 'About 24 hours', 'About 365 days', 'About 7 days', 'About 6 months', 'About 100 days', 'About 12 hours'], 'About 28 days', {
    emoji: '🌙',
    funFact: 'The Moon always shows us the same face — it spins exactly once per orbit. We never see its far side from Earth.',
  }),
  choice('sc-11', 'What is a group of billions of stars held together by gravity called?', ['A galaxy', 'A constellation', 'A solar system', 'A nebula', 'A comet', 'An orbit', 'A meteor shower'], 'A galaxy', {
    emoji: '🌌',
    funFact: 'We live in the Milky Way galaxy — about 100 billion stars, and it’s just one of trillions of galaxies.',
  }),
  choice('sc-12', 'What is a chunk of space rock called once it BURNS UP in Earth’s atmosphere?', ['A meteor', 'An asteroid', 'A comet', 'A satellite', 'A planet', 'A star', 'A moon'], 'A meteor', {
    emoji: '☄️',
    funFact: 'A “shooting star” isn’t a star at all — it’s a pebble-sized rock glowing white-hot from friction with the air.',
  }),
  choice('sc-13', 'Where is the asteroid belt in our solar system?', ['Between Mars and Jupiter', 'Between Earth and Mars', 'Beyond Neptune', 'Between Venus and Earth', 'Inside Saturn’s rings', 'Between Mercury and the Sun', 'Between Jupiter and Saturn'], 'Between Mars and Jupiter', {
    emoji: '🪨',
    funFact: 'Movies show asteroid belts as crowded, but real asteroids are so spread out you could fly through and see nothing.',
  }),
  choice('sc-14', 'What is an artificial satellite?', ['A human-made object orbiting Earth', 'A natural moon', 'A type of star', 'A space rock', 'A planet without a sun', 'A telescope on the ground', 'A cloud of space dust'], 'A human-made object orbiting Earth', {
    emoji: '🛰️',
    funFact: 'There are thousands of satellites up there doing GPS, weather and TV. The Moon is a NATURAL satellite.',
  }),
  choice('sc-15', 'Why do astronauts appear to float inside the space station?', ['They are in constant free fall around Earth', 'There is no gravity in space', 'They wear anti-gravity boots', 'The station has no air', 'They are too far from the Sun', 'Their suits are filled with helium', 'The station spins very fast'], 'They are in constant free fall around Earth', {
    emoji: '👨‍🚀',
    weight: 1,
    points: 5,
    funFact: 'Gravity is still strong up there — the station is just falling around Earth forever, so everything falls together.',
  }),

  // --- electricity ----------------------------------------------------------
  choice('sc-16', 'What is a complete path that lets electricity flow called?', ['A closed circuit', 'An open circuit', 'A conductor', 'An insulator', 'A magnet', 'A battery', 'A switch'], 'A closed circuit', {
    emoji: '🔌',
    funFact: 'Break the loop anywhere and everything stops — that’s exactly what a light switch does.',
  }),
  choice('sc-17', 'Which of these is the BEST conductor of electricity?', ['Copper', 'Rubber', 'Plastic', 'Glass', 'Wood', 'Dry cloth', 'Ceramic'], 'Copper', {
    emoji: '🧲',
    funFact: 'Copper is cheap and lets electrons zoom — that’s why almost every wire in your house has a copper core.',
  }),
  choice('sc-18', 'Why is the outside of an electrical wire covered in plastic?', ['Plastic is an insulator', 'Plastic conducts better than metal', 'To make it heavier', 'To store electricity', 'To keep the wire warm', 'To make it magnetic', 'To speed up the current'], 'Plastic is an insulator', {
    emoji: '🧵',
    funFact: 'Insulators block the flow, so the electricity stays in the wire and out of your fingers.',
  }),
  choice('sc-19', 'What does a switch do in a circuit?', ['Opens or closes the circuit', 'Stores energy', 'Makes light', 'Increases the voltage', 'Turns AC into DC', 'Measures the current', 'Cools down the wires'], 'Opens or closes the circuit', {
    emoji: '🎚️',
    funFact: 'A switch is just a controllable gap in the wire. Closed = flowing, open = stopped.',
  }),
  choice('sc-20', 'In a SERIES circuit with two bulbs, what happens if one bulb burns out?', ['Both bulbs go out', 'The other bulb gets brighter', 'Nothing changes', 'The battery explodes', 'Only that bulb goes out', 'The circuit reverses direction', 'The other bulb starts flashing'], 'Both bulbs go out', {
    emoji: '💡',
    funFact: 'Old Christmas lights were wired in series — one dead bulb killed the whole string. Very annoying.',
  }),
  choice('sc-21', 'What does a battery provide to a circuit?', ['Stored chemical energy', 'Light energy', 'Sound energy', 'Extra wire', 'Magnetic rocks', 'Compressed air', 'Heat from the Sun'], 'Stored chemical energy', {
    emoji: '🔋',
    funFact: 'Chemicals inside push electrons out one end and pull them in the other — a chemical reaction you can plug in.',
  }),
  choice('sc-22', 'What is static electricity?', ['A build-up of electric charge on a surface', 'Electricity flowing through wires', 'Electricity made by magnets', 'Light produced by a bulb', 'Energy stored in a battery', 'Heat inside a toaster', 'Sound made by a speaker'], 'A build-up of electric charge on a surface', {
    emoji: '⚡',
    funFact: 'Rub a balloon on your hair and it steals electrons — that’s why your hair stands up and follows it.',
  }),
  choice('sc-23', 'What is lightning?', ['A giant static electricity discharge', 'Sunlight reflecting off clouds', 'Burning gas in the sky', 'A magnetic storm', 'Wind moving very fast', 'Rain catching fire', 'A meteor entering the air'], 'A giant static electricity discharge', {
    emoji: '🌩️',
    funFact: 'A lightning bolt can be 5× hotter than the surface of the Sun. Thunder is the air exploding outward from it.',
  }),
  choice('sc-24', 'What device turns electrical energy into motion?', ['An electric motor', 'A light bulb', 'A resistor', 'A speaker', 'A heater', 'A battery', 'A fuse'], 'An electric motor', {
    emoji: '⚙️',
    funFact: 'Motors use electromagnets that push and pull to spin a shaft — fans, blenders and electric cars all use them.',
  }),
  choice('sc-25', 'Which of these energy sources is RENEWABLE?', ['Wind', 'Coal', 'Oil', 'Natural gas', 'Gasoline', 'Diesel', 'Propane'], 'Wind', {
    emoji: '🌬️',
    funFact: 'Ontario shut down its last coal plant in 2014 — a lot of our power now comes from nuclear and hydro.',
  }),
  choice('sc-26', 'What does a light bulb change electrical energy into?', ['Light and heat energy', 'Sound energy only', 'Chemical energy', 'Magnetic energy', 'Motion energy', 'Nuclear energy', 'Elastic energy'], 'Light and heat energy', {
    emoji: '💡',
    funFact: 'Old bulbs wasted 90% of their energy as heat. LEDs stay cool and use a fraction of the power.',
  }),
  choice('sc-27', 'Why is a bird safe sitting on a single power line?', ['Its body is not part of a complete circuit', 'Birds cannot conduct electricity', 'Feathers are perfect insulators', 'The wire is turned off at night', 'Birds are too light to matter', 'The plastic coating protects them', 'Birds have no blood in their feet'], 'Its body is not part of a complete circuit', {
    emoji: '🐦',
    weight: 1,
    points: 5,
    funFact: 'Electricity needs a path to somewhere else. Touch a second wire or the ground and it’s a very different story.',
  }),

  // --- flight ---------------------------------------------------------------
  choice('sc-28', 'What is the upward force that keeps an airplane in the air called?', ['Lift', 'Drag', 'Thrust', 'Gravity', 'Friction', 'Pressure', 'Momentum'], 'Lift', {
    emoji: '✈️',
    funFact: 'The four forces of flight are lift, weight, thrust and drag. Lift has to beat weight to take off.',
  }),
  choice('sc-29', 'Which force PUSHES an airplane forward?', ['Thrust', 'Lift', 'Drag', 'Gravity', 'Weight', 'Friction', 'Air resistance'], 'Thrust', {
    emoji: '🚀',
    funFact: 'Engines or propellers make thrust by shoving air backwards — every action has an equal, opposite reaction.',
  }),
  choice('sc-30', 'Which force SLOWS a plane down as it pushes through the air?', ['Drag', 'Lift', 'Thrust', 'Gravity', 'Buoyancy', 'Magnetism', 'Inertia'], 'Drag', {
    emoji: '🪂',
    funFact: 'Drag is why planes, fish and race cars are all streamlined — smooth shapes slip through with less resistance.',
  }),
  choice('sc-31', 'What is the special curved shape of a wing called?', ['An airfoil', 'A rudder', 'A fuselage', 'A propeller', 'A flap', 'A hull', 'A turbine'], 'An airfoil', {
    emoji: '🛩️',
    funFact: 'Air moves faster over the curved top of an airfoil, so the pressure there drops and the wing gets sucked upward.',
  }),
  choice('sc-32', 'Why does a hot air balloon rise?', ['Hot air is less dense than cool air', 'Hot air is heavier than cool air', 'The balloon has an engine', 'The fabric repels gravity', 'The basket is very light', 'Wind pushes it straight up', 'The flame creates thrust'], 'Hot air is less dense than cool air', {
    emoji: '🎈',
    funFact: 'Heat the air and it spreads out, so the same balloon holds less mass — and floats up like a bubble in water.',
  }),
  choice('sc-33', 'Which gas is used in modern airships and party balloons because it is lighter than air?', ['Helium', 'Oxygen', 'Carbon dioxide', 'Nitrogen', 'Water vapour', 'Argon', 'Methane'], 'Helium', {
    emoji: '🎈',
    funFact: 'Old airships used hydrogen — lighter, but explosive. The Hindenburg disaster ended that idea fast.',
  }),
  choice('sc-34', 'What part of a bird’s body makes it lightweight enough to fly?', ['Hollow bones', 'Solid heavy bones', 'A large stomach', 'Thick fat layers', 'Extra-long tails', 'Scaly skin', 'Webbed feet'], 'Hollow bones', {
    emoji: '🦅',
    funFact: 'A bald eagle’s feathers actually weigh more than its whole skeleton. Nature’s engineering, no bolts needed.',
  }),
  choice('sc-35', 'What do the flaps and rudder on a plane help the pilot do?', ['Control its direction', 'Create more fuel', 'Make the plane heavier', 'Cool the engines', 'Light up the runway', 'Reduce cabin noise', 'Charge the batteries'], 'Control its direction', {
    emoji: '🕹️',
    funFact: 'The Wright brothers’ big breakthrough wasn’t the engine — it was figuring out how to STEER once you were up there.',
  }),
  choice('sc-36', 'Why do rockets work in outer space where there is no air?', ['They push out their own exhaust gases', 'They push against the air', 'They use their wings', 'They fall toward the stars', 'Magnets pull them along', 'Sunlight blows them forward', 'Gravity pushes them outward'], 'They push out their own exhaust gases', {
    emoji: '🚀',
    weight: 1,
    points: 5,
    funFact: 'Wings are useless in a vacuum. A rocket throws mass out the back and gets shoved forward in return.',
  }),

  // --- biodiversity & classification ---------------------------------------
  choice('sc-37', 'What does “biodiversity” mean?', ['The variety of living things in an area', 'The number of trees in a forest', 'The total weight of all animals', 'How long an animal lives', 'The speed a species evolves', 'The amount of water in a habitat', 'The size of the biggest animal'], 'The variety of living things in an area', {
    emoji: '🌍',
    funFact: 'More variety = a tougher ecosystem. If one species crashes, others can fill its job.',
  }),
  choice('sc-38', 'Which group of animals has a backbone?', ['Vertebrates', 'Invertebrates', 'Insects', 'Molluscs', 'Arachnids', 'Crustaceans', 'Worms'], 'Vertebrates', {
    emoji: '🦴',
    funFact: 'Vertebrates — fish, amphibians, reptiles, birds, mammals — are only about 3% of all animal species. Bugs rule.',
  }),
  choice('sc-39', 'Which of these is an amphibian?', ['Frog', 'Snake', 'Turtle', 'Shark', 'Penguin', 'Bat', 'Crocodile'], 'Frog', {
    emoji: '🐸',
    funFact: 'Amphibians start life in water with gills, then grow lungs. Tadpole to frog is a full-body upgrade.',
  }),
  choice('sc-40', 'What feature do ALL mammals share?', ['They feed their young milk', 'They lay eggs', 'They have gills', 'They have scales', 'They are cold-blooded', 'They can all fly', 'They live only on land'], 'They feed their young milk', {
    emoji: '🐻',
    funFact: 'Mammals also have hair — even dolphins have a few whiskers when they’re born.',
  }),
  choice('sc-41', 'Which of these is an INVERTEBRATE?', ['Octopus', 'Frog', 'Eagle', 'Salmon', 'Snake', 'Dolphin', 'Lizard'], 'Octopus', {
    emoji: '🐙',
    funFact: 'An octopus has no bones at all — it can squeeze through any hole bigger than its beak. And it has three hearts.',
  }),
  choice('sc-42', 'How many legs does an insect have?', ['6', '8', '4', '10', '2', '12', '14'], '6', {
    emoji: '🐜',
    funFact: 'Six legs = insect, eight = arachnid. That’s the fast way to tell a spider isn’t an insect.',
  }),
  choice('sc-43', 'Which of these is NOT an insect?', ['Spider', 'Ant', 'Beetle', 'Butterfly', 'Grasshopper', 'Bee', 'Dragonfly'], 'Spider', {
    emoji: '🕷️',
    funFact: 'Spiders are arachnids: 8 legs, 2 body parts, no antennae and no wings.',
  }),
  choice('sc-44', 'What do we call an animal that eats ONLY plants?', ['A herbivore', 'A carnivore', 'An omnivore', 'A decomposer', 'A scavenger', 'A predator', 'A producer'], 'A herbivore', {
    emoji: '🦌',
    funFact: 'Herbivores need huge guts and lots of chewing — a cow spends about 8 hours a day just munching.',
  }),
  choice('sc-45', 'What do we call a species that has died out completely, with none left alive?', ['Extinct', 'Endangered', 'Invasive', 'Nocturnal', 'Migratory', 'Domesticated', 'Camouflaged'], 'Extinct', {
    emoji: '🦤',
    weight: 1,
    points: 5,
    funFact: 'The dodo was gone within about 80 years of humans reaching its island. Endangered means still here — but only just.',
  }),

  // --- write-in (simple typing) --------------------------------------------
  {
    id: 'sc-46',
    topicId: T,
    type: 'write',
    prompt: 'Which planet do we live on? (type it)',
    emoji: '✍️',
    accept: ['Earth'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'Earth is the only planet not named after a Greek or Roman god — the name just means “ground”.',
  },
  {
    id: 'sc-47',
    topicId: T,
    type: 'write',
    prompt: 'What is the name of our galaxy? (type it — two words)',
    emoji: '🌌',
    accept: ['Milky Way', 'The Milky Way', 'Milkyway'],
    weight: 2,
    points: 8,
    status: 'active',
    createdAt: AT,
    funFact: 'It got the name because from a dark place it looks like a spilled streak of milk across the sky.',
  },
  {
    id: 'sc-48',
    topicId: T,
    type: 'match',
    prompt: 'Match each animal group to one of its members:',
    emoji: '🔗',
    pairs: [
      { left: 'Mammal', right: 'Whale' },
      { left: 'Bird', right: 'Penguin' },
      { left: 'Reptile', right: 'Crocodile' },
      { left: 'Amphibian', right: 'Salamander' },
    ],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Penguins are definitely birds — feathers and eggs. They just swapped flying through air for flying through water.',
  },
  {
    id: 'sc-49',
    topicId: T,
    type: 'order',
    prompt: 'Put these planets in order from CLOSEST to the Sun to farthest:',
    emoji: '🪐',
    sequence: ['Mercury', 'Venus', 'Earth', 'Mars'],
    weight: 2,
    points: 10,
    status: 'active',
    createdAt: AT,
    funFact: 'Trick: “My Very Excellent Mother Just Served Us Noodles” — Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.',
  },
  {
    id: 'sc-50',
    topicId: T,
    type: 'order',
    prompt: 'Order these from SMALLEST to LARGEST:',
    emoji: '🔭',
    sequence: ['The Moon', 'Earth', 'The Sun', 'The Milky Way'],
    weight: 1,
    points: 6,
    status: 'active',
    createdAt: AT,
    funFact: 'About 1.3 million Earths would fit inside the Sun — and the Sun is just one of 100 billion stars in the Milky Way.',
  },
]
