// Science (grade 6) — other wordings (§14 "Same question, many wordings").
// Written by hand, 2026-11-03. This bank capitalises its options, so the
// answer wordings do too.
import type { VariantBank } from './index'

export const SCIENCE_6_VARIANTS: VariantBank = {
  'sc-01': { prompts: ['Our solar system has how many planets?', 'Count the planets that orbit our Sun. How many?'] },
  'sc-02': { prompts: ['Which planet orbits nearest to the Sun?', 'Of all the planets, which one is the Sun’s closest neighbour?'] },
  'sc-03': { prompts: ['Which planet is the biggest in our solar system?', 'Of all the planets, which one is the giant — the largest of them all?'] },
  'sc-04': { prompts: ['Which planet is best known for its rings?', 'Which planet has the famous bright, wide rings?'] },
  'sc-05': { prompts: ['Which planet do people call the “Red Planet”?', 'Rusty dust makes one planet look red. Which one?'] },
  'sc-06': {
    prompts: ['What kind of object is the Sun?', 'The Sun is the closest one of these to Earth. What is it?'],
  },
  'sc-07': {
    prompts: ['Why do we have day and night on Earth?', 'What makes the Sun “rise” and “set” every day?'],
    answers: ['Earth spinning on its axis', 'Earth turning on its axis'],
  },
  'sc-08': {
    prompts: ['How long is one full trip of Earth around the Sun?', 'Earth makes one full orbit of the Sun in about how long?'],
    answers: ['About one year', 'About 12 months'],
  },
  'sc-09': {
    prompts: ['Why does Earth have seasons?', 'What gives us summer and winter?'],
    answers: ['The tilt of Earth’s axis', 'Earth’s axis being tilted'],
  },
  'sc-10': {
    prompts: ['How long does one orbit of the Moon around Earth take?', 'The Moon circles Earth once in about how long?'],
    answers: ['About a month', 'About four weeks'],
  },
  'sc-11': {
    prompts: ['Billions of stars held together by gravity make up a…', 'What do we call a huge group of billions of stars, like the Milky Way?'],
  },
  'sc-12': {
    prompts: ['When a space rock burns up in Earth’s air, what is it called?', 'A “shooting star” is really a space rock burning up. What is it called?'],
  },
  'sc-13': {
    prompts: ['Where in the solar system is the asteroid belt?', 'The asteroid belt sits between which two planets?'],
    answers: ['Between Jupiter and Mars'],
  },
  'sc-14': {
    prompts: ['What does “artificial satellite” mean?', 'The space station and GPS are artificial satellites. What is one?'],
    answers: ['A machine people sent to orbit Earth', 'An object made by people that orbits Earth'],
  },
  'sc-15': {
    prompts: ['Why do astronauts float inside the space station?', 'Gravity still reaches the space station. So why do astronauts float?'],
    answers: ['They are always falling around Earth', 'They are falling around Earth non-stop'],
  },
  'sc-16': {
    prompts: ['What is a complete loop that electricity can flow through called?', 'When the path is complete and the bulb lights, the circuit is…'],
  },
  'sc-17': {
    prompts: ['Which of these lets electricity flow through it BEST?', 'Which material is the best electrical conductor?'],
  },
  'sc-18': {
    prompts: ['Why do electrical wires have a plastic coating?', 'What is the plastic on the outside of a wire for?'],
    answers: ['Plastic doesn’t conduct electricity', 'Plastic blocks electricity'],
  },
  'sc-19': {
    prompts: ['What is a switch for in a circuit?', 'What happens when you flip a switch in a circuit?'],
    answers: ['Breaks or completes the circuit', 'Closes or opens the circuit'],
  },
  'sc-20': {
    prompts: ['Two bulbs are in a SERIES circuit. One burns out. What happens?', 'In a series circuit, what happens to the other bulb when one bulb dies?'],
    answers: ['Both bulbs turn off', 'The other bulb goes out too'],
  },
  'sc-21': {
    prompts: ['What does a battery give to a circuit?', 'Inside a battery is stored energy. Which kind?'],
    answers: ['Chemical energy it stores', 'Energy stored as chemicals'],
  },
  'sc-22': {
    prompts: ['What do we mean by static electricity?', 'Rub a balloon on your hair and it sticks. What is that static electricity?'],
    answers: ['Electric charge building up on a surface', 'Charge that collects on the surface of things'],
  },
  'sc-23': {
    prompts: ['What really is lightning?', 'Lightning is a giant version of what?'],
    answers: ['A huge discharge of static electricity', 'A giant spark of static electricity'],
  },
  'sc-24': {
    prompts: ['Which device changes electrical energy into movement?', 'What turns electricity into motion, like in a fan?'],
  },
  'sc-25': {
    prompts: ['Which of these energy sources will NOT run out?', 'Which one is a RENEWABLE source of energy?'],
  },
  'sc-26': {
    prompts: ['A light bulb turns electrical energy into what?', 'When a bulb is on, what does the electricity become?'],
    answers: ['Light energy and heat', 'Heat and light energy'],
  },
  'sc-27': {
    prompts: ['How can a bird sit on a power line without getting hurt?', 'A bird perches on one power line and is fine. Why?'],
    answers: ['It doesn’t complete a circuit', 'Its body isn’t a path to the ground'],
  },
  'sc-28': {
    prompts: ['Which force holds an airplane up in the air?', 'The wings make an upward force. What is it called?'],
  },
  'sc-29': {
    prompts: ['What is the force that moves a plane FORWARD?', 'The engines push the plane ahead. That force is…'],
  },
  'sc-30': {
    prompts: ['Which force holds a plane BACK as it moves through the air?', 'Air pushes against a moving plane. What is that force?'],
  },
  'sc-31': {
    prompts: ['A wing has a special curved shape. What is it called?', 'What do we call the curved shape that gives a wing its lift?'],
  },
  'sc-32': {
    prompts: ['What makes a hot air balloon go up?', 'Why does heating the air in a balloon make it rise?'],
    answers: ['Hot air is lighter than cool air', 'Warm air is less dense than cold air'],
  },
  'sc-33': {
    prompts: ['Which gas, lighter than air, fills party balloons and airships?', 'Which gas makes a party balloon float away?'],
  },
  'sc-34': {
    prompts: ['What helps make a bird light enough to fly?', 'Which body feature keeps birds light for flying?'],
    answers: ['Bones that are hollow', 'Light, hollow bones'],
  },
  'sc-35': {
    prompts: ['What are a plane’s flaps and rudder for?', 'A pilot moves the flaps and rudder to do what?'],
    answers: ['Steer the plane', 'Change its direction'],
  },
  'sc-36': {
    prompts: ['How can a rocket work in space, where there’s no air?', 'Space has no air to push on. What moves a rocket there?'],
    answers: ['They blast out their own exhaust', 'They throw their own gases backward'],
  },
  'sc-37': {
    prompts: ['What is “biodiversity”?', 'A rainforest has huge biodiversity. What does that mean?'],
    answers: ['How many kinds of life live in an area', 'The variety of life found in a place'],
  },
  'sc-38': {
    prompts: ['What are animals with a backbone called?', 'Which group is made of animals that have a backbone?'],
  },
  'sc-39': {
    prompts: ['Which one of these animals is an amphibian?', 'Amphibians live in water, then on land. Which of these is one?'],
  },
  'sc-40': {
    prompts: ['What do ALL mammals have in common?', 'Whales, bats and humans are all mammals. What do they all do?'],
    answers: ['Their babies drink milk', 'They nurse with milk'],
  },
  'sc-41': {
    prompts: ['Which of these animals has NO backbone?', 'Which one is an invertebrate?'],
  },
  'sc-42': {
    prompts: ['Insects have how many legs?', 'Count the legs on any insect. How many?'],
  },
  'sc-43': {
    prompts: ['Which one of these is NOT an insect?', 'Which of these creatures is not an insect at all?'],
  },
  'sc-44': {
    prompts: ['An animal that eats nothing but plants is called…', 'What is the name for a plant-only eater?'],
  },
  'sc-45': {
    prompts: ['When a species has died out and none are left, it is…', 'The dodo is gone forever. What word describes it?'],
  },
  'sc-46': { prompts: ['Type the name of the planet we live on:', 'What is our home planet called? (type it)'] },
  'sc-47': { prompts: ['Type the name of our galaxy (two words):', 'Our solar system is in which galaxy? (type it)'] },
  'sc-48': { prompts: ['Connect each animal group to an animal in it:', 'Which animal belongs to each group? Match them:'] },
  'sc-49': { prompts: ['Order these planets from NEAREST the Sun to farthest:', 'Fly out from the Sun. Put the planets in the order you pass them:'] },
  'sc-50': { prompts: ['Line these up from the SMALLEST to the BIGGEST:', 'Which is tiniest? Order them from smallest to largest:'] },
}
