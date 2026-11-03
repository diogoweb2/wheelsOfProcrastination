// Logic (grade 6) — other wordings (§14 "Same question, many wordings").
// Written by hand, 2026-11-03. A riddle or puzzle can be retold, but its
// answer is a single word or letter, so the variety is in the telling.
import type { VariantBank } from './index'

export const LOGIC_6_VARIANTS: VariantBank = {
  'lg-01': { prompts: ['Find the next letter: A, C, E, G, ?', 'Skip one letter each time: A, C, E, G… which letter comes next?'] },
  'lg-02': { prompts: ['Find the next day: Monday, Wednesday, Friday, ?', 'Skip a day each time: Monday, Wednesday, Friday… which day is next?'] },
  'lg-03': { prompts: ['circle, square, circle, square, circle… which shape comes next?', 'Finish the shape pattern: circle, square, circle, square, circle, ?'] },
  'lg-04': { prompts: ['Find the next letter: J, F, M, A, M, J, ?', 'J, F, M, A, M, J… which letter comes next?'] },
  'lg-05': { prompts: ['Find the next letter: O, T, T, F, F, S, S, ?', 'O, T, T, F, F, S, S… which letter comes next?'] },
  'lg-06': { prompts: ['red, red, blue, red, red, blue, red… which colour is next?', 'Finish the pattern: red, red, blue, red, red, blue, red, ?'] },
  'lg-07': { prompts: ['Find the next letter: Z, Y, X, W, ?', 'The alphabet backwards: Z, Y, X, W… which letter is next?'] },
  'lg-08': { prompts: ['Put this school day back in order, from first to last:', 'Which happens first? Order the school day, earliest to latest:'] },
  'lg-09': {
    prompts: [
      'I have keys but no locks, space but no room, and you can enter but never go outside. What am I?',
      'Riddle: I’m covered in keys and I have a space, yet I have no rooms and no doors. What am I?',
    ],
  },
  'lg-10': { prompts: ['The more it dries, the wetter it gets. What is it?', 'Riddle: it gets wetter while it’s drying something. What is it?'] },
  'lg-11': { prompts: ['It has a neck, but no head. What is it?', 'Riddle: I have a neck and a mouth but no head. What am I?'] },
  'lg-12': { prompts: ['It stays in one corner but travels all over the world. What is it?', 'Riddle: I never leave my corner, yet I travel the world. What am I?'] },
  'lg-13': { prompts: ['The more you take, the more you leave behind. What are they?', 'Riddle: each one you take leaves one behind you. What are they?'] },
  'lg-14': { prompts: ['It has lots of teeth, but it can’t bite. What is it?', 'Riddle: I have a row of teeth, but I never bite. What am I?'] },
  'lg-15': { prompts: ['It goes up and up and never comes back down. What is it?', 'Riddle: it only ever goes up, never down. What is it?'] },
  'lg-16': { prompts: ['It’s full of holes, yet it holds water. What is it?', 'Riddle: holes all over me, and still I hold water. What am I?'] },
  'lg-17': { prompts: ['It has hands, but it can’t clap. What is it?', 'Riddle: I have two hands, yet I can never clap. What am I?'] },
  'lg-18': { prompts: ['You can catch it, but you can’t throw it. What is it?', 'Riddle: you can catch me, but nobody can throw me. What am I?'] },
  'lg-19': {
    prompts: [
      'Every Zib is blue. No blue thing can fly. What MUST be true?',
      'Zibs are all blue, and blue things can’t fly. So what do we know about Zibs?',
    ],
    answers: ['No Zib can fly'],
  },
  'lg-20': {
    prompts: [
      'Ana is taller than Ben, and Ben is taller than Cleo. Who is the SHORTEST of the three?',
      'Cleo is shorter than Ben. Ben is shorter than Ana. Who is the shortest?',
    ],
  },
  'lg-21': {
    prompts: [
      'Sam beat Tara. Tara beat Leo. Mia came in after Leo. Who came FIRST?',
      'In a race, Tara was behind Sam, Leo was behind Tara, and Mia was behind Leo. Who won?',
    ],
  },
  'lg-22': {
    prompts: [
      'Rain cancels the picnic. The picnic went ahead. What do we know?',
      'If it rains, there’s no picnic. There WAS a picnic. So what can we say?',
    ],
    answers: ['There was no rain'],
  },
  'lg-23': {
    prompts: [
      'Fluffy is a cat. Some cats are grey. What can we say about Fluffy?',
      'Only SOME cats are grey. Fluffy is a cat. Is Fluffy grey?',
    ],
    answers: ['Fluffy could be grey', 'Maybe Fluffy is grey'],
  },
  'lg-24': {
    prompts: [
      'Three boxes are labelled Apples, Oranges and Both — and every label is wrong. You take one fruit from “Both” and it’s an apple. What is in that box?',
      'All three labels (Apples, Oranges, Both) are wrong. The box labelled “Both” gives you an apple. What does that box really hold?',
    ],
    answers: ['Apples only', 'Nothing but apples'],
  },
  'lg-25': {
    prompts: [
      'Nobody passed without studying. Rita didn’t study. What follows?',
      'Everyone who passed had studied. Rita did not study. So…',
    ],
    answers: ['Rita didn’t pass'],
  },
  'lg-26': {
    prompts: [
      'A boy has as many brothers as sisters. His sister has twice as many brothers as sisters. How many children are there?',
      'In one family, a boy has the same number of brothers and sisters, and his sister has two brothers for every sister. How many kids in all?',
    ],
  },
  'lg-27': {
    prompts: [
      'Running a race, you pass the person in SECOND place. What place are you in?',
      'You overtake whoever is in 2nd place. Where are you now?',
    ],
  },
  'lg-28': {
    prompts: [
      'Ivy sits at the far left, Max is right beside her, and Nia is at the far right. Seat everyone from LEFT to RIGHT:',
      'Four friends in a row: Nia on the far right, Ivy on the far left, Max next to Ivy. Order them left to right:',
    ],
  },
  'lg-29': { prompts: ['Robin, Eagle, Penguin, Sparrow — which one doesn’t belong?', 'Find the bird that is different: Robin, Eagle, Penguin, Sparrow'] },
  'lg-30': { prompts: ['Carrot, Potato, Tomato, Onion — which one doesn’t belong?', 'Find the odd one: Carrot, Potato, Tomato, Onion'] },
  'lg-31': { prompts: ['Circle, Triangle, Square, Cube — which one doesn’t belong?', 'Find the odd shape: Circle, Triangle, Square, Cube'] },
  'lg-32': { prompts: ['Guitar, Violin, Drum, Harp — which one doesn’t belong?', 'Find the odd instrument: Guitar, Violin, Drum, Harp'] },
  'lg-33': { prompts: ['Level, Radar, Kayak, Table — which word doesn’t belong?', 'Which word is the odd one: Level, Radar, Kayak, Table?'] },
  'lg-34': { prompts: ['Whale, Shark, Dolphin, Seal — which one doesn’t belong?', 'Find the odd sea animal: Whale, Shark, Dolphin, Seal'] },
  'lg-35': {
    prompts: [
      'A rooster lays an egg right on the peak of a roof. Which way does it roll?',
      'If a rooster laid an egg on top of a pointed roof, which side would the egg roll down?',
    ],
    answers: ['Neither — a rooster can’t lay eggs', 'Neither — roosters never lay eggs'],
  },
  'lg-36': {
    prompts: [
      'Some months have 31 days. How many have 28 days?',
      'How many months of the year have 28 days in them?',
    ],
  },
  'lg-37': {
    prompts: [
      'A farmer’s 17 sheep run off — all but 9. How many are left?',
      'All but 9 of a farmer’s 17 sheep escape. How many does he still have?',
    ],
  },
  'lg-38': {
    prompts: [
      'A man pushes his car up to a hotel and tells the owner he’s bankrupt. What is happening?',
      'Riddle: a man pushes his car to a hotel and has to pay up — now he’s bankrupt. What’s going on?',
    ],
    answers: ['It is a game of Monopoly', 'They are playing a board game'],
  },
  'lg-39': {
    prompts: [
      'From a basket of 10 apples, how many times can you take 1 apple?',
      'There’s a basket of 10 apples. How many times can you take one from a basket of 10?',
    ],
    answers: ['Just once — then it is a basket of 9', 'Only once — then it holds only 9'],
  },
  'lg-40': {
    prompts: [
      'Add two letters to which word to make it SHORTER?',
      'Riddle: which word gets shorter when you add two letters?',
    ],
  },
  'lg-41': {
    prompts: [
      'Facing NORTH, you turn right, then right again. Which way do you face?',
      'You start facing north and make two right turns. Which direction are you facing now?',
    ],
  },
  'lg-42': {
    prompts: [
      'You raise your RIGHT hand at a mirror. Which hand seems to go up in the reflection?',
      'In a mirror, which hand does your reflection seem to lift when you lift your right hand?',
    ],
    answers: ['The left hand'],
  },
  'lg-43': {
    prompts: [
      'Two six-sided dice are glued face to face. How many faces can you still see?',
      'Each die has 6 faces. Glue two together by one face each. How many faces are still showing?',
    ],
  },
  'lg-44': {
    prompts: [
      'A cube is painted red all over. How many corners have red on exactly THREE sides?',
      'Paint every side of a cube red. At how many corners do three red sides meet?',
    ],
  },
  'lg-45': { prompts: ['It has a face and two hands, but no arms or legs. What is it? (type it)', 'Riddle: I have a face and hands but no body. What am I? (type it)'] },
  'lg-46': { prompts: ['Once in a minute, twice in a moment, never in a thousand years. Which letter? (type it)', 'Which letter is in “minute” once, “moment” twice and “thousand years” never? (type it)'] },
  'lg-47': { prompts: ['It goes everywhere with you in the sun, but vanishes in the dark. What is it? (type it)', 'Riddle: I copy every move you make when it’s sunny. What am I? (type it)'] },
  'lg-48': { prompts: ['Connect each riddle to its answer:', 'Solve each riddle by matching it to its answer:'] },
  'lg-49': { prompts: ['Find the one that doesn’t belong in each group. Match them:', 'Connect each group to its odd one out:'] },
  'lg-50': {
    prompts: [
      'Zed beat Ola, Ola beat Pip, and Pip beat Rex. Order them from FIRST to LAST:',
      'Rex lost to Pip, Pip lost to Ola, Ola lost to Zed. Who finished where? First to last:',
    ],
  },
}
