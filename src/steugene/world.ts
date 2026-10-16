// 🏫 St. Eugene 7 (§24m) — the maths has to happen somewhere he already lives.
//
// Why this file exists: he can divide 4 by 2 and be sure he is right, and
// still read "2/4" as "4 ÷ 2". Told it is a pizza cut for four people, he
// gets it instantly and never gets it wrong again. The number was never the
// problem — the number had nowhere to stand.
//
// So every maths card gets a SETTING, and the setting is one of the places he
// actually spends his attention. Not a sticker on top of a sum ("Luffy has 24
// apples"); a situation where the operation is the obvious thing a person in
// that situation would do, and where knowing the answer is worth something.
//
// It lives in `src/` rather than in the seeding script because BOTH writers
// need it: `npm run se:world`, which moved the whole maths year in here, and
// the in-app "generate more" button (§24h), which must not hand him back the
// generic textbook questions this pass just took away.

/** His places, with numbers that are actually true inside them. */
export const WORLD_KIT = `HIS WORLD — use these, and use the real numbers in them:

FORTNITE · he is obsessed with it right now
- 100 players drop into a match. The storm circle shrinks in phases and damages anyone outside it.
- Health 100, shield 100. Materials cap at 500 wood / 500 brick / 500 metal.
- V-Bucks are the currency: a Battle Pass is 950 V-Bucks, skins run 800–2,000, bundles are sold at different sizes (1,000 / 2,800 / 5,000) — which makes "price per V-Buck" a real question.
- Eliminations, placement (#1 Victory Royale down to #100), damage dealt, survival time.

MINECRAFT
- A stack is 64. A chunk is 16 × 16 blocks. One block = 1 metre, exactly — so a build IS a measurement problem.
- Height runs from Y = −64 (bedrock) to Y = 320. Sea level is Y = 62. Diamonds are most common around Y = −59. NEGATIVE NUMBERS ARE LITERAL HERE: he reads them off the F3 screen.
- 10 hearts = 20 health points. Hunger is 10 drumsticks. 9 ingots craft 1 block. The crafting grid is 3 × 3 = 9 slots.
- A furnace smelts one item per 10 seconds; one coal smelts 8 items.

ROBLOX
- Robux. Roughly 80 Robux per $1 US. Gift cards come in set sizes; Premium gives a monthly Robux allowance.
- When someone buys your game pass, Roblox keeps 30% and the creator keeps 70%.
- Roblox Studio is real coding: parts have X / Y / Z position, rotation in degrees, and a size you scale.
- Obbys: platforms, checkpoints, visit counts in the millions.

POKÉMON
- 151 in the original Kanto Pokédex. A team is 6. Types: super effective is ×2, not very effective ×0.5, immune ×0.
- HP bars, CP, catch chance per Poké Ball. Shiny odds are famously about 1 in 4,096 — a probability he already quotes.

FOOTBALL — the real game and EA FC on the console
- 90 minutes plus stoppage. 11 a side. A win is 3 points, a draw 1, a loss 0.
- Goal difference is a signed number: a table reads +12 or −7, and he already knows which is better.
- A full pitch is about 105 m × 68 m. The centre circle has a 9.15 m radius. The penalty spot is 11 m out. A goal is 7.32 m × 2.44 m.
- Possession %, pass accuracy %, shots on target out of shots, player ratings like 87, xG like 1.37.
- Ultimate Team packs have published odds — a walkout is rare on purpose.

FOOD — he loves it, and it is the model that always works
- A large pizza is 8 slices, a party size is 12. Cutting one pizza for 4 people is the picture that makes a fraction click.
- Timbits by the 10, 20, 40. A 2 L bottle. A chocolate bar in 4 pieces. Shawarma, poutine, Toronto prices, 13% HST.

MANGA — One Piece and Blue Lock
- One Piece: past chapter 1100, 110+ volumes, bounties in Berries up to 3,000,000,000 — huge numbers worth rounding.
- Blue Lock: 300 strikers ranked against each other, goals, shots, rankings that move.`

/** The rules about HOW the setting is used. This is where reskins go wrong. */
export const WORLD_RULES = `HOW TO USE IT — this is the difference between teaching and decoration:

1. The setting must make the OPERATION obvious, not just decorate it. "Cut one pizza between 4 people" explains 1/4. "Luffy has 24 apples, divide by 4" explains nothing — it is the same bare sum with a name glued on.
2. Use the unit the world actually uses. Blocks, hearts, V-Bucks, Robux, minutes, goals, slices, degrees, metres. Never "units".
3. Prefer a question he would genuinely want the answer to: which V-Bucks bundle is cheaper per V-Buck, how many blocks up from Y = −59 to the surface, whether a 12-inch pizza beats two 8-inch ones.
4. Quantities must be plausible inside that world. A Minecraft stack is never 100. A match is never 70 minutes. A heart is never 3 HP.
5. VARY THE WORLD. Across one batch use at least three different settings, and never the same one twice in a row. He gets bored, and a maths skill tied to one game does not transfer.
6. A naked sum is still allowed — about one card in five should be plain practice, because a test will be plain. Mix them in.
7. Keep the maths EXACTLY as hard as it was. Same skill, same size of number, same number of steps. You are changing where it happens, not how difficult it is.
8. Never say "imagine you are". Just state the situation: "Your squad drops with 400 wood."
9. Keep the reading short. He is a weak reader: no sentence over ~14 words, and the scenario takes at most two lines before the question.`

/**
 * Which settings belong to which subtopic.
 *
 * Decided here, once, by someone who knows both the curriculum and the boy —
 * because the good pairings are not obvious to a model working one card at a
 * time, and the great ones (storm circle → circumference, F3 coordinates →
 * negative numbers, pack odds → probability) are the entire point.
 */
export const SUB_WORLDS = {
  // --- Number Sense ---
  'math-rational': 'Minecraft Y levels (sea level 62, bedrock −64, diamonds at −59) for negatives; pizza slices and hearts for fractions; player ratings and xG for decimals.',
  'math-compare': 'A league table sorted by goal difference (+12, −7, 0); Minecraft depths; decimal player ratings 87.4 vs 87.04; shiny odds vs pack odds.',
  'math-abs': 'How far you are from spawn when your coordinate is negative; how many blocks to climb from Y = −59 to sea level; how far off a 950 V-Bucks target you are either way.',
  'math-int-add': 'Hearts lost to fall damage and healed back; goal difference after a 4–1 win and a 0–3 loss; V-Bucks earned and spent; descending from Y = 30 to Y = −24.',
  'math-int-mult': 'Losing 3 hearts four times; the storm taking 2 HP a tick for 6 ticks; a team conceding 2 goals in each of 5 matches; undoing a repeated loss.',
  'math-fdp': 'A health bar at 3/4 = 0.75 = 75%; pack odds written three ways; battle pass progress; pass accuracy.',
  'math-frac-add': 'PIZZA FIRST — one large pizza is 8 slices, a party size is 12, and sharing between 4 is where the denominator comes from. Then Minecraft stacks (1/4 of 64 = 16), the hunger bar, halves of a match.',
  'math-frac-mult': 'Half of a half pizza; 2/3 of a stack of 64; doubling a recipe; 3/4 of the 500 wood you are carrying.',
  'math-percent': '13% HST on a Roblox gift card; a 25% off skin sale; battle pass 70% done; pass accuracy and possession.',
  'math-ratio': 'K/D ratio — eliminations to deaths; Robux per hour of building; damage per second; shots to goals; blocks mined per minute; 3 : 5 wins to losses.',
  'math-power': '2 × 2 × 2 chest doubling; a square base 12 × 12 blocks; 9² blocks in a wall; √ to get back to the side length; big round numbers of visits.',
  'math-round': 'One Piece bounties (3,000,000,000 Berries); Roblox visit counts like 1,043,221; a stadium crowd of 54,321; V-Bucks totals.',
  // --- Patterning and Algebra ---
  'math-pat': 'A Minecraft staircase 3 blocks per step; XP needed per level; storm damage rising each phase; a tower that adds 4 blocks a layer.',
  'math-var': 'damage = 3n for n hits; cost = 80n Robux; a Roblox Studio script where speed is a variable; V-Bucks left after n days.',
  'math-eq1': 'You had some V-Bucks, spent 950 on the pass, have 310 left; you placed some blocks and 16 remain of a stack.',
  'math-eq2': 'Two skins plus a $5 fee came to $25; 3 rounds of damage plus a 10 HP hit left you at 40.',
  'math-graph': 'XP over time; storm radius per phase; Robux earned per week; a line that starts somewhere and climbs at a fixed rate.',
  // --- Measurement ---
  'math-area': 'A Minecraft base floor 12 × 9; a football pitch 105 m × 68 m; a Roblox obby platform; carpeting a room in blocks.',
  'math-circle': 'The Fortnite storm circle — radius, diameter, how far you run around the edge; the 9.15 m centre circle; the crust on a pizza.',
  'math-circle-area': 'Why a 12-inch pizza beats two 8-inch ones; how much ground the storm circle still covers; a round Roblox platform.',
  'math-surface': 'Wrapping a cube house in wool; how many blocks of glass to skin a 4 × 4 × 4 build; a cereal box; painting a shulker.',
  'math-volume': 'Filling a 5 × 3 × 2 Minecraft pool with water; a chest in a 1-block space; a 2 L bottle; a cylinder of cake.',
  'math-units': 'One block is exactly 1 metre and a chunk is 16; ping in milliseconds; a 90-minute match in seconds; 2.4 m of fence in cm.',
  // --- Data ---
  'math-collect': 'Asking only your Fortnite squad whether Fortnite is the best game; surveying the whole class versus only your friends; counting damage from one lucky match.',
  'math-avg': 'Mean K/D over 5 matches; median player rating in a squad; the mode of a favourite skin; the range of damage dealt.',
  'math-graphs': 'A bar chart of goals per player; a line of XP per day; a circle graph of screen time; a scatter of player rating against price.',
  'math-prob': 'Ultimate Team pack odds; shiny at about 1 in 4,096; a chest spawning in a named location; the catch chance of a Poké Ball; the kickoff coin toss.',
  // --- Geometry ---
  'math-angles': 'Rotating a part in Roblox Studio; the angle of a shot at goal; a 180 and a 360 on a board; the pitch of a Minecraft roof.',
  'math-shapes': 'Triangles in a Minecraft roof; the pitch is a rectangle; hexagons in a texture; sorting shapes you can actually build.',
  'math-congr': 'Two identical Minecraft houses are congruent; a Roblox model scaled to 200% is similar; the same skin at two sizes.',
  'math-trans': 'Roblox Studio move, rotate, mirror and scale; copying half a build and flipping it; a shape sliding across the map.',
  'math-cart': 'Minecraft X and Z coordinates straight off the F3 screen, negatives included; the Fortnite map grid; plotting where you died.',
  // --- Coding ---
  'code-seq': 'A Roblox Studio script that runs top to bottom; a chain of command blocks; a crafting order that fails if you do it backwards.',
  'code-loop': 'for i = 1, 10 — placing a wall of 10 blocks; spawning obby platforms; repeating an attack pattern.',
  'code-if': 'if health < 20 then heal; if the storm is closing then move; if score > 10 then unlock the door.',
  'code-var': 'score = score + 1 on a Roblox leaderboard; a V-Bucks counter; a speed variable you change once and it changes everywhere.',
  'code-debug': 'A wall that came out 11 blocks long instead of 10; a loop that never ends; a checkpoint that teleports you to the wrong place.',
  // --- Financial Literacy ---
  'fin-budget': 'His allowance against a 950 V-Bucks pass; money in, money out, money left; saving two weeks for a skin.',
  'fin-interest': 'Saving for a skin while the money earns interest; $100 at 5% for 3 years; the same money borrowed instead.',
  'fin-unit': 'Which V-Bucks bundle is cheaper per V-Buck — 1,000 for $11 against 2,800 for $28; Robux per dollar; a 900 g bag against a 500 g one.',
  'fin-tax': '13% HST on a gift card; a skin at 25% off and then taxed; the sticker price versus the till.',
  'fin-credit': 'Borrowing the pass money from Dad and paying it back; buy-now-pay-later on a game; why a minimum payment takes years.',
}

/** Every maths subtopic, in the order the curriculum teaches them. */
export const MATH_IDS: string[] = Object.keys(SUB_WORLDS)

/** Where this subtopic lives, or null when it is not one of the maths ones. */
export function worldFor(subtopicId: string): string | null {
  return SUB_WORLDS[subtopicId as keyof typeof SUB_WORLDS] ?? null
}
