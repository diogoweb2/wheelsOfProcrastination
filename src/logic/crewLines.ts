// Luffy's voice: loud, hungry, fearless hype-man. Cheers you on toward the day's adventure.
// Never mean — he mocks the task, never the person. Shishishi!

const pools = {
  greeting: [
    "You're here! Let's have an adventure! Shishishi!",
    "Oi! I saved you a seat on the Sunny. Whatcha doing today?",
    "I'm gonna be King of the Pirates — you're gonna finish a task. Deal?",
    "I smell adventure! ...or is that meat? Either way, let's go!",
    "A crew that spins together wins together! Ready?",
    "Sanji's still cooking, so we've got time for one quest. Spin it!",
  ],
  spinning: [
    'Round and round! I have NO idea what we get — that\'s the best part!',
    'The Log Pose is spinning! Trust it!',
    'Sugeeee! Which one, which one?!',
    'Faster! FASTER! Okay maybe not, I get dizzy.',
  ],
  landed: [
    'THIS ONE! It looks strong. I like strong. Let\'s beat it!',
    'The wheel chose our next island. No turning back!',
    'That\'s the one! Go go go!',
    'Ooh, a tough-looking quest. Perfect. I\'m all fired up!',
    'Yosh! Adventure decided. Zoro would probably get lost, so you go.',
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
