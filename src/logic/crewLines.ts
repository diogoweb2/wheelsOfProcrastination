// Luffy's voice: loud, hungry, fearless hype-man. Cheers you on toward the day's adventure.
// Never mean — he mocks the task, never the person. Shishishi!

const pools = {
  greeting: [
    "I'm gonna be King of the Pirates! ...right after this spin.",
    "I'm SO bored. Spin the wheel, I need an adventure!",
    "I'm hungry... but adventure first, meat after. Spin it!",
    "Shishishi! I've got a good feeling about today!",
    "I feel it — today's spin is gonna be legendary!",
    "Oi oi, what are we waiting for? I wanna see what we get!",
    "I'm all rested up. Let's find our next island!",
    "My gut says spin. My gut is never wrong. Except about mushrooms.",
  ],
  spinning: [
    "Whoa whoa whoa, I'm getting dizzy!!",
    "My heart's going boom-boom-boom! Which one?!",
    "I can't look! Okay I'm looking. I'M LOOKING!",
    "Aaaah it's spinning so fast! SUGEEE!",
    "Please be a fun one, please be a fun one...",
    "I'm so nervous I could eat five plates of meat!",
    "Gomu Gomu no... waiting! This is the hard part!",
    "Round and round... my head's spinning too!",
  ],
  landedEasy: [
    "Yosh! This one's easy — I could do it with one hand!",
    "Shishishi! That's nothing! Piece of meat!",
    "Phew! An easy island. I was ready for anything though. Totally.",
    "Lucky! We beat this one before breakfast!",
    "Easy pickings! Even Usopp wouldn't run from this one!",
    "This one looks weak! Let's flatten it and go eat!",
    "SUGEEE, what a good spin! Today's our day!",
    "That's it?! Shishishi, we win! Almost feels unfair!",
  ],
  landedHard: [
    "Ohh no. I just got beaten up...",
    "Uwahh... this one's a monster. My knees are shaking. A little.",
    "Ow ow ow... just LOOKING at this one hurts!",
    "This one's strong... Good. I'm all fired up now!",
    "Gyaaah! The wheel picked the scary one!",
    "I feel like I got hit by Garp's fist of love...",
    "A big one... I might need meat before AND after this.",
    "So it's a boss fight, huh. Okay. Deep breath. GOMU GOMU NOOO!",
    "Nooo, not the tough one! ...Fine. A pirate never runs!",
    "This island looks dangerous. I LOVE dangerous. I also fear it.",
  ],
  completed: [
    'YOU DID IT! That was AWESOME! Meat for everyone!',
    'Shishishi! One step closer to King of the Pirates!',
    'SUGEEE! Did you see that?! Nami, did you SEE that?!',
    'Another one down! You\'re getting strong. I can tell!',
    'That\'s my nakama! Chopper, get the snacks, we\'re celebrating!',
    'Victory! ...is there food after this? There should be food.',
  ],
  respin: [
    'Don\'t like it? Fine, spin again — an adventure is an adventure!',
    'Nami says spinning again costs money. Nami\'s scary. Pay up!',
    'New island! Toss some Berries to the sea and let\'s go!',
  ],
  manualUpsell: [
    'You wanna pick yourself? Cool! But Nami\'s charging you for it.',
    'Choosing your own quest costs Berries — captain\'s orders... well, Nami\'s.',
  ],
  urgentPick: [
    'That one\'s an emergency — grab it, it\'s FREE! Charge in!',
    'Danger?! I love danger! Do the scary one, no cost!',
  ],
  missedDay: [
    'You skipped yesterday! It\'s okay — real pirates get back up. Let\'s go!',
    'A day slipped away like Buggy in a fight. Chopper patched it up though!',
  ],
  streakDead: [
    'Your streak sank... but so did the Merry, and we kept sailing. Again!',
    'Aw, we lost the streak. Don\'t cry — WE SET SAIL TOMORROW! Shishishi!',
  ],
  goalReached: [
    'GOAL REACHED! I\'m so proud I could eat ten plates of meat!',
    'YOU HIT YOUR GOAL! Raise the flag! This calls for a feast!',
  ],
  badge: [
    'A treasure! Shiny! Can I— no? It\'s yours. You earned it!',
    'New bounty poster! You\'re famous now. Frame it!',
  ],
  stackFull: [
    'Three quests already on your plate! Finish one before grabbing more, greedy-guts!',
    'Whoa, the plate\'s full — even I don\'t eat FOUR things at once. Okay I do. But finish one!',
    'Too many! Clear the deck before the next adventure!',
  ],
  emptyWheel: [
    'No quests on the wheel! Add some — an adventure needs a destination!',
    'The sea\'s empty here. Add a task so we can set sail!',
  ],
  frozen: [
    'Chopper froze the day to save your streak! Doctor\'s the best! ...wait, he\'s not a reindeer? He is.',
  ],
  pin: [
    'Secret code first! Even the Straw Hats lock the treasure.',
    'Password! No sneaky Marines allowed on my ship.',
  ],
}

export type LineKind = keyof typeof pools
const lastIdx: Partial<Record<LineKind, number>> = {}

/** Random line, never the same one twice in a row per pool. */
export function crewSays(kind: LineKind): string {
  const pool = pools[kind]
  let i = Math.floor(Math.random() * pool.length)
  if (pool.length > 1 && i === lastIdx[kind]) i = (i + 1) % pool.length
  lastIdx[kind] = i
  return pool[i]
}
