// 🏓 Why this exercise, for the one sport it is all for.
//
// The brief (§18b) says it in one line: "pickleball is my cardio, and I want a
// core and a lower back that let me play it for decades". Everything in this
// catalog is downstream of that — but standing in a basement holding a dumbbell,
// the connection between a wrist curl and a third game is not obvious. So the
// app says it, on the rest screen, where you are standing still with nothing to
// do and every reason to want a reason.
//
// TWO ANSWERS, NEVER ONE. They are different questions and they pull in
// different directions:
//
//   🏓 YOUR GAME  — what it does for the pickleball you play this month.
//   🛡 YOUR YEARS — what it does for the pickleball you play at sixty.
//
// A lateral raise is a weak answer to the first and a strong answer to the
// second; a squat jump is the reverse. Collapsing them into "it's good for you"
// would lose exactly the information worth having.
//
// WHERE THE WORDS COME FROM. Every exercise in the seeded catalog is written by
// hand below, because a real reason beats a generated one every time. Anything
// NOT in that map — an exercise added by hand in the Gear tab, or one that
// arrives in the catalog later — is derived from what the app already knows
// about it: its primary body part, whether it is held or counted, whether it is
// one side at a time. So a new exercise has its two answers the moment it
// exists, offline, with no key and no waiting. See §18s.
import type { BodyPart, ExerciseDef } from '../types'

export interface PickleballWhy {
  /** What it does for the game you play this month. */
  game: string
  /** What it does for the game you are still playing in twenty years. */
  longevity: string
}

/**
 * Everything the derivation needs. Both shapes that carry an exercise satisfy
 * it: the catalog's `ExerciseDef` spells the id `id`, while the snapshot a
 * session stores spells it `exId`, and the card is shown from both places.
 */
export interface WhyInput {
  id?: string
  exId?: string
  parts: BodyPart[]
  kind: ExerciseDef['kind']
  perSide?: boolean
}

// --- written by hand, one per exercise in the catalog -------------------------

const WHY: Record<string, PickleballWhy> = {
  'mv-dumbbell-bench-press': {
    game: 'The punch volley at the kitchen line is a short, stiff press. This is where that stiffness comes from — the ball leaves your paddle instead of your paddle giving way.',
    longevity: 'Pressing strength is what lets the shoulder stop relying on the rotator cuff alone. Build the big muscles around the joint and the small ones stop being the last line of defence.',
  },
  'mv-incline-dumbbell-bench-press': {
    game: 'The overhead put-away finishes from the same angle this press loads: upper chest and front shoulder, working above chest height.',
    longevity: 'A hard serve is borrowed against the front of the shoulder unless something up there is strong. Train that angle here, so the court is not where you find its limit.',
  },
  'mv-decline-dumbbell-bench-press': {
    game: 'Flat, low pressing power — the volley you take from below the net cord, where there is no room to swing.',
    longevity: 'It spreads pressing work across the whole chest instead of hammering one angle, which is how a chest gets strong without the shoulder paying for it.',
  },
  'mv-dips': {
    game: 'Pressing strength with your whole bodyweight on it. Triceps power for the drive and the overhead, built the hard way.',
    longevity: 'The deepest shoulder position you will train. Own it under control and the awkward reach for a low volley is a position your shoulder has seen before. Stop the moment it pinches.',
  },
  'bw-pushup': {
    game: 'A press and a plank at once — the braced, athletic posture you hold at the kitchen line, with reps that build the punch behind a volley.',
    longevity: 'Cheap, joint-friendly pressing volume through a full range. No bar, no bench, so the habit survives travel, bad weeks and a court trip.',
  },
  'bw-pullup': {
    game: 'Every hard shot is braced by your back. Pull-ups build the lats and the grip that stop your paddle arm from working alone.',
    longevity: 'A strong upper back is the shoulder’s real insurance. Pull hard enough, often enough, and the front of the shoulder stops being the only thing holding your serve together.',
  },
  'mv-chin-up': {
    game: 'More biceps than a pull-up — and biceps are what decelerate your arm after a hard swing. Faster to stop is faster to reset for the next ball.',
    longevity: 'Elbow tendons get strong by being loaded, not by being spared. This is the loaded end of that: the counterweight to a lifetime of gripping a paddle.',
  },
  'mv-negative-pull-up': {
    game: 'The lowering half of a pull-up is the half you can already do, and it builds the same pulling strength behind the serve and the overhead.',
    longevity: 'Slow, controlled lowering is what tendons respond to best. Upper-back and elbow durability, bought at a load your joints can actually take today.',
  },
  'mv-chest-supported-dumbbell-row': {
    game: 'Mid-back strength is the anchor for a forehand. Row hard and the paddle head stays where you aimed it instead of drifting through contact.',
    longevity: 'Chest-supported means zero load on your lower back: all of the upper-back work, none of the spinal tax. That is exactly the trade your back history asks for.',
  },
  'mv-one-arm-dumbbell-row': {
    game: 'One side at a time, which is how pickleball is actually played. It finds the gap between your paddle side and the other one, and closes it.',
    longevity: 'Single-arm pulling teaches the shoulder blade to move and hold on its own. A scapula that controls itself is the difference between a sore shoulder at sixty and a working one.',
  },
  'mv-seated-dumbbell-shoulder-press': {
    game: 'Overhead strength is the serve and the smash. Pressing it seated puts the force into your shoulders instead of your lower back.',
    longevity: 'Shoulders that are strong overhead stay healthy overhead. Seated and supported keeps the spine out of it — which matters more at your age than the number on the bell.',
  },
  'mv-dumbbell-lateral-raise': {
    game: 'The side delt is what holds your paddle up through a long third game. This is endurance, not power, and it is the muscle that quits first.',
    longevity: 'Side-delt work builds room in the shoulder joint. It is the cheapest impingement insurance there is, and twenty light reps buy more of it than five heavy ones.',
  },
  'mv-chest-supported-dumbbell-reverse-fly': {
    game: 'Rear delts and mid-back pull the shoulder blade back where it belongs — the posture that lets you reach up for an overhead without shrugging into it.',
    longevity: 'Everything in pickleball happens in front of you. This is the balancing work that keeps a hundred hours of forward reaching from rounding you over.',
  },
  'mv-prone-dumbbell-y-raise': {
    game: 'It trains the lower traps, the muscle that rotates the shoulder blade up so your arm can get overhead cleanly. A clean overhead is a put-away.',
    longevity: 'The best rotator-cuff prehab in this catalog that needs no band. Weak lower traps are how overhead athletes end up with a shoulder that clicks.',
  },
  'mv-dumbbell-biceps-curl': {
    game: 'Biceps are the brakes on your swing. Better brakes mean the paddle stops where you meant it to and you are ready for the next ball sooner.',
    longevity: 'Direct elbow work is how you keep tennis elbow out of a sport played one-handed with a lot of repetition. Load the tendon here so the court does not have to.',
  },
  'mv-dumbbell-hammer-curl': {
    game: 'Hammer grip is paddle grip. This builds the forearm that holds your wrist steady through contact, so a hard ball does not turn the face.',
    longevity: 'The most direct defence against tennis elbow in the whole catalog. The tendon on the outside of your elbow gets strong here, or it gets angry on court.',
  },
  'mv-incline-dumbbell-curl': {
    game: 'The stretched position loads the long head of the biceps — the part working hardest when it has to decelerate a fast swing.',
    longevity: 'Strength at full stretch is strength where tendons usually tear. Train the end range here and a reach for a wide ball is a position, not an injury.',
  },
  'mv-lying-dumbbell-triceps-extension': {
    game: 'Triceps finish the punch volley and the overhead. This is the direct version: the muscle, without the chest doing its work for it.',
    longevity: 'Strong triceps take load off the elbow joint on every fast extension. Keep them ahead of your serve and the elbow stays quiet.',
  },
  'mv-seated-overhead-dumbbell-triceps-extensi': {
    game: 'Overhead triceps work, in the exact position your arm is in at the top of a serve.',
    longevity: 'It loads the triceps at full stretch, where the tendon is most vulnerable — and seated, so the spine sits this one out.',
  },
  'mv-dumbbell-bulgarian-split-squat': {
    game: 'Pickleball is played on one leg at a time. This is the hardest single-leg strength you can build, and it shows up as a first step you do not have to think about.',
    longevity: 'Single-leg strength decides whether a stumble at the kitchen line stays a stumble. It also spares the spine — all the leg work, no bar on your back.',
  },
  'mv-dumbbell-reverse-lunge': {
    game: 'Stepping back under control is exactly what you do when a lob goes over your head. Train it loaded and the retreat is fast instead of frantic.',
    longevity: 'Kinder on the knees than a forward lunge, and it builds the glutes that decelerate you. The muscles that stop you are the ones that keep your knees intact.',
  },
  'mv-dumbbell-romanian-deadlift': {
    game: 'Hamstrings and glutes are the engine behind a low dink and the push off the baseline. Hinging strong is what lets you get low without collapsing.',
    longevity: 'Strong hamstrings are how you avoid pulling one lunging for a wide ball — the quickest way to lose six weeks. Flat back: the hinge is the entire exercise.',
  },
  'mv-goblet-squat': {
    game: 'The ready position is a quarter squat you hold for an hour. This builds the legs that hold it and the depth to drop under a low ball.',
    longevity: 'Loaded in front, so the spine stays stacked instead of shear-loaded. It is the squat pattern that keeps working into your sixties.',
  },
  'mv-dumbbell-lateral-lunge': {
    game: 'The sideways stretch-and-push of chasing a wide ball, trained on purpose. Pickleball is a lateral game and almost nothing else in a gym goes sideways.',
    longevity: 'It builds the adductors at length — the exact tissue that tears when you lunge wider than you have trained. This is the vaccine for a groin strain.',
  },
  'mv-dumbbell-step-up': {
    game: 'One leg pushing you up and forward: the first step towards a drop shot, in slow motion and under load.',
    longevity: 'Single-leg pushing strength at almost no joint cost. It is the movement that stays available when knees stop tolerating deep squats.',
  },
  'bw-calf-raise': {
    game: 'Every split step is a calf. You do a few hundred a match, and the players still moving well in a long third game are the ones who trained them.',
    longevity: 'Calf and Achilles strength is the front line against the most common serious injury in racket sports. Sudden push-offs need tissue that is used to them.',
  },
  'mv-single-leg-calf-raise': {
    game: 'One calf at a time, which is how you actually push off. Full range on one leg is the closest thing in a gym to a split step.',
    longevity: 'An Achilles tears on one leg, not two, so train it on one. This is the version that finds the weak side before a court does.',
  },
  'mv-bench-hip-thrust': {
    game: 'Glutes are the biggest engine you have for accelerating out of the ready position, and this loads them harder than anything else here.',
    longevity: 'A strong glute takes the job your lower back would otherwise try to do. For a back with a history, that is the single most useful trade in the catalog.',
  },
  'bw-glute-bridge': {
    game: 'Wakes the glutes up before they are needed. Hips that fire early are hips that move you early.',
    longevity: 'Low-cost, high-return lower-back insurance. When the glutes hold the pelvis, the lumbar spine stops improvising.',
  },
  'mv-single-leg-glute-bridge': {
    game: 'One hip holding the pelvis level is what happens on every single step you take on court. Train it and your stride stops leaking power.',
    longevity: 'It hunts down the side-to-side gap behind most back and knee pain. A pelvis that stays level is a spine that is not being twisted a thousand times a match.',
  },
  'mv-kettlebell-swing': {
    game: 'Explosive hip extension — the same snap that drives a serve and gets you moving from standing. Fast hips are fast feet.',
    longevity: 'It trains the posterior chain to produce force quickly, the quality that fades first with age and the one that keeps you off the floor. Hinge, do not squat: this is hips, not back.',
  },
  'bw-bird-dog': {
    game: 'Holding still while your arms and legs move is the entire job of your core in pickleball. This is that job, isolated.',
    longevity: 'Textbook lower-back prehab. It teaches the spine to stay neutral while the limbs work, which is what a two-hour session is asking for all night.',
  },
  'bw-dead-bug': {
    game: 'Deep core control with the spine flat — the brace underneath every shot you hit off balance.',
    longevity: 'The safest core exercise there is for a back with a history: all of the anterior-core work, none of the spinal flexion. Slow reps, ribs down.',
  },
  'bw-side-plank': {
    game: 'Lateral core strength holds you upright when you reach sideways for a ball. Without it the torso collapses and the shot goes with it.',
    longevity: 'The obliques and QL are what stop your lower back from taking side loads alone. This is how the sideways game gets cheap.',
  },
  'mv-copenhagen-plank': {
    game: 'The hardest adductor exercise there is — and pickleball is an adductor sport. Every wide lunge and every recovery step is groin work.',
    longevity: 'Adductor strength is the best-evidenced groin-strain prevention in court sport. Hard, boring, and it keeps you on the court.',
  },
  'bw-plank': {
    game: 'The brace. A shot hit while moving is transferred through a stiff midsection or leaked through a soft one.',
    longevity: 'Anti-extension strength keeps the lower back out of the arch that makes it hurt. Glutes squeezed, ribs down — a long sloppy plank trains nothing.',
  },
  'mv-l-sit-hold': {
    game: 'Total-body tension in one position. It builds the compressed, braced midsection that lets you hit hard from a bad stance.',
    longevity: 'Hip-flexor and deep-core strength at end range, plus the shoulder strength to hold yourself down off your hands. Unglamorous, and it keeps both joints honest.',
  },
  'mv-dip-bar-knee-raise': {
    game: 'Hip flexors drive your knee through the first step. Strong ones have you moving before the ball has landed.',
    longevity: 'It trains the hip flexors without the spinal flexion of a sit-up. For a back you are protecting, that distinction is the whole point.',
  },
  'mv-kettlebell-farmer-s-hold': {
    game: 'Load on one side while you stand tall — the exact anti-lean your core does when you reach out wide for a ball.',
    longevity: 'Offset carries build the lateral core that stops the spine bending sideways under load. Grip strength comes free, and grip is paddle control.',
  },
  'mv-farmer-s-walk': {
    game: 'Grip, posture and a braced trunk, all while moving. It is the most transferable strength exercise there is for a sport played on your feet.',
    longevity: 'Grip strength is one of the most reliable predictors of staying healthy and mobile with age. Carry heavy things; keep playing.',
  },
  'mv-dumbbell-wrist-curl': {
    game: 'Wrist flexors hold the paddle angle through contact. When they fade, your dinks start popping up in the third game.',
    longevity: 'Direct forearm work keeps the tendons around your elbow strong enough for a sport that vibrates them thousands of times a session.',
  },
  'mv-dumbbell-reverse-wrist-curl': {
    game: 'The extensors on top of your forearm steady the paddle on a backhand. Weak ones show up as a face that turns on contact.',
    longevity: 'This is the tennis-elbow exercise. The extensor tendon is the one that goes; loading it here is what stops it going on court.',
  },
  'mv-dumbbell-farmer-s-carry-hold': {
    game: 'Pure grip endurance, held. A hand that does not tire is a paddle that does not wobble late in a match.',
    longevity: 'Grip work strengthens everything from the fingers to the elbow. It is the cheapest durability available to a one-handed sport.',
  },
  'mv-flexbar-tyler-twist': {
    game: 'Aimed squarely at the outside of the elbow — the spot that starts nagging after a heavy week of play.',
    longevity: 'The Tyler Twist is the exercise the tennis-elbow research is built on: eccentric loading of the extensor tendon. Slow on the way back is the whole exercise.',
  },
  'mv-flexbar-reverse-tyler-twist': {
    game: 'The inside-elbow version — golfer’s elbow, which is what a heavy forehand and a tight grip produce.',
    longevity: 'Same eccentric principle, the other tendon. Doing both keeps the elbow balanced instead of trading one problem for the other.',
  },
  'mv-flexbar-supination': {
    game: 'Supination is the rotation that opens the paddle face for a soft dink. Strength there is touch you can repeat.',
    longevity: 'Rotational forearm strength protects both sides of the elbow at once, and it is the motion almost no other gym work touches.',
  },
  'mv-split-squat-jump': {
    game: 'Explosive, single-leg, and it lands in a split stance — which is where pickleball actually lives. First-step speed, trained directly.',
    longevity: 'Power fades faster than strength with age, and it is what a fall costs you. The landings are the point: stop when they get noisy.',
  },
  'mv-squat-jump': {
    game: 'Raw vertical power for the overhead and the push off the baseline. Fast legs are the difference between reaching a ball and watching it.',
    longevity: 'Jumping loads bone as well as muscle — one of the few things that keeps hip and spine density up past forty. Land softly; quality over count.',
  },
  'mv-tuck-jump': {
    game: 'Fast ground contacts with the knees driving high — the rhythm of repeated split steps, turned up loud.',
    longevity: 'It trains the elastic, spring-like quality of your tendons, which is what makes moving still feel easy at sixty. Stop the moment you are landing flat.',
  },
  'mv-lateral-shuffle': {
    game: 'The most pickleball-specific thing in this catalog. Side to side, low and fast, with a clean push-off and a clean stop.',
    longevity: 'It builds hip and groin tissue in the direction you will actually get hurt in. Sideways strength has to be trained sideways.',
  },
  'mv-medicine-ball-chest-pass': {
    game: 'Throwing is the only way to train pressing at real speed, and that speed is what the punch volley and the drive are made of.',
    longevity: 'Power with nothing to decelerate: the ball leaves your hands, so no joint has to absorb the stop. It is how you keep training fast, safely.',
  },
  'mv-band-external-rotation': {
    game: 'The rotator cuff is what holds the shoulder together while you serve. Strong cuff, repeatable serve.',
    longevity: 'The highest-value shoulder prehab there is for an overhead sport. Two minutes here buys years of shoulders that do what you ask.',
  },
  'mv-band-scaption': {
    game: 'Raising the arm in the scapular plane — the path your arm actually takes on the way to an overhead, trained with control.',
    longevity: 'It strengthens the supraspinatus in the position where it gets pinched. Light band, slow reps: this one is medicine, not training.',
  },
  'mv-band-leg-curl': {
    game: 'Hamstring strength with no spinal load — the brake on your lunge and the muscle that pulls you back into position.',
    longevity: 'Hamstring strains are the classic court-sport injury, and they happen to hamstrings that are strong but not strong at length. Cheap insurance, every week.',
  },
  'mv-nordic-curl-band-assisted': {
    game: 'The strongest known way to build hamstrings, at a load you can actually hold. Better brakes mean deeper lunges you can get back from.',
    longevity: 'Nordic curls roughly halve hamstring injury rates in the studies. The band is how you get there before you can do one unassisted.',
  },
  'mv-nordic-curl-negative': {
    game: 'Lowering under control is the hamstring working at full length — the exact demand of a lunge for a wide ball.',
    longevity: 'Eccentric hamstring work is the most evidence-backed injury prevention in court sport. Go as slowly as you can; the slow part is the medicine.',
  },
  'mv-nordic-curl': {
    game: 'The full version. If you can do these, nothing on a pickleball court is going to out-demand your hamstrings.',
    longevity: 'Top-end hamstring strength at length, which is what keeps a sprint for a lob from turning into a six-week layoff.',
  },
  'mv-band-leg-extension': {
    game: 'Quad strength for the push back up out of a low dink. It is the muscle that gets you standing again.',
    longevity: 'Quad strength is one of the strongest predictors of knee health with age, and a band loads it without the joint stress of a machine.',
  },
  'mv-band-pallof-press': {
    game: 'Anti-rotation. Resisting a twist is what your core does on every shot you hit off balance — stability first, then power.',
    longevity: 'It builds rotational control without ever loading the spine in rotation, which is precisely the compromise your lower back needs.',
  },
  'mv-band-rotational-press': {
    game: 'Rotation from the hips out through the arm — the chain a forehand actually uses. Turn, do not twist.',
    longevity: 'It trains rotation to come from the hips and the mid-back rather than the lumbar spine. That habit is what separates a durable back from a sore one.',
  },
  'mv-back-extension': {
    game: 'Lower-back and glute endurance for staying low. If you find yourself standing up between dinks, this is the fix.',
    longevity: 'The standing instruction of your whole programme, done directly: a lower back that is strong is a lower back that does not flare up.',
  },
}

// --- derived, for anything the map has never heard of -------------------------

const GAME_BY_PART: Record<BodyPart, string> = {
  chest: 'Pressing strength is the punch behind a volley at the kitchen line — the ball leaves your paddle instead of your paddle giving way.',
  back: 'Every hard shot is braced by your back. Pulling strength keeps the paddle head where you aimed it instead of drifting through contact.',
  shoulders: 'The serve and the overhead are shoulder work. Strength above your head is what turns a lob into a put-away.',
  arms: 'Your arm has to stop as fast as it swings. Strong arms mean the paddle finishes where you meant it to, and you reset sooner for the next ball.',
  forearms: 'Grip is paddle control. A forearm that does not fade is a paddle face that still does what you ask it to in the third game.',
  legs: 'Pickleball is decided by the two steps before the shot, and leg strength is where those steps come from.',
  glutes: 'Your glutes are the biggest engine you have for accelerating out of the ready position — and for stopping again.',
  core: 'A stiff midsection is what transfers a shot you hit while moving. A soft one leaks it.',
  fullBody: 'The legs start the shot, the core carries it and the arm delivers it. This trains the chain rather than one link of it.',
  power: 'Speed, not just strength: the explosive first step and the snap behind a drive.',
  cardio: 'Pickleball is a repeat-sprint sport with no time to recover in. Conditioning is why your third game looks like your first.',
}

const LONGEVITY_BY_PART: Record<BodyPart, string> = {
  chest: 'Big muscles around the shoulder mean the rotator cuff stops being the last line of defence on every serve.',
  back: 'A strong upper back is the shoulder’s real insurance, and the posture that a hundred hours of reaching forward keeps trying to take away.',
  shoulders: 'Shoulders that are strong overhead stay healthy overhead — which, in an overhead sport, is the whole game past forty.',
  arms: 'Tendons get strong by being loaded, not by being spared. Direct arm work is how a one-handed sport stops turning into tennis elbow.',
  forearms: 'Forearm strength is the front line against tennis and golfer’s elbow, and grip strength is one of the best markers there is for staying mobile with age.',
  legs: 'Leg strength decides whether a stumble at the kitchen line stays a stumble, and it keeps your movement driven by muscle rather than absorbed by joint.',
  glutes: 'A strong glute takes the job your lower back would otherwise try to do — the single best trade a back with a history can make.',
  core: 'Core strength keeps the spine neutral while everything around it moves, which is what a long match asks for all night.',
  fullBody: 'Broad, balanced strength is what keeps a small on-court accident from becoming a six-week layoff.',
  power: 'Power fades faster than strength with age, and it is what a fall costs you. Training it — and landing it softly — is how you keep it.',
  cardio: 'Fatigue is when technique goes and injuries happen. Being fitter than the match is a safety measure, not a vanity one.',
}

/** One extra clause, at most, from how the set is actually done. */
function shapeNote(e: WhyInput): string {
  if (e.perSide) return ' One side at a time, which is how the sport is played — and how the weak side gets found.'
  if (e.kind === 'timed') return ' Held rather than counted, so what it builds is the endurance version, which is the version a long third game asks for.'
  return ''
}

/**
 * The two answers for one exercise. Written by hand where the catalog knows the
 * movement, derived from its body parts where it doesn't — so an exercise you
 * add in the Gear tab has both answers the moment you save it.
 */
export function pickleballWhy(e: WhyInput): PickleballWhy {
  const written = WHY[e.id ?? e.exId ?? '']
  if (written) return written
  const part = e.parts[0] ?? 'fullBody'
  return {
    game: `${GAME_BY_PART[part] ?? GAME_BY_PART.fullBody}${shapeNote(e)}`,
    longevity: LONGEVITY_BY_PART[part] ?? LONGEVITY_BY_PART.fullBody,
  }
}

/** Is this one written by hand, or worked out from its body parts? Used by the Gear tab. */
export function isWrittenWhy(id: string): boolean {
  return id in WHY
}
