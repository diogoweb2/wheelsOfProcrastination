// 💸 FC Lock's transfer window (§21f) — the 2026 summer market, as ESPN graded it.
//
// This is a hand-copied dataset, not a feed: ESPN's running "grading the big
// signings" piece is the source, and every row here is a move that actually
// happened, with the fee as ESPN reported it and the two letter grades they
// gave the clubs. Nothing is generated — a made-up transfer would be worse than
// no transfer tab at all.
//
// Only the big clubs: every row has an elite side. When the window moves on,
// edit this file (and bump SOURCE_READ).

export const SOURCE_URL =
  'https://www.espn.com/soccer/story/_/id/48990955/summer-transfer-window-grading-big-signings-mens-soccer'
export const SOURCE_NAME = 'ESPN'
/** The day this list was copied across from the article. */
export const SOURCE_READ = '2026-08-21'

export interface Transfer {
  id: string
  player: string
  from: string
  to: string
  /** Exactly as ESPN reported it — €61M, £75M, Free, Loan, Undisclosed. */
  fee: string
  kind: 'permanent' | 'loan' | 'free'
  /** YYYY-MM-DD. */
  date: string
  /** ESPN's grade for the selling club / the buying club. */
  gradeFrom: string
  gradeTo: string
}

/**
 * The clubs this app calls elite — used to badge a row and to keep the list
 * honest about what "only the very good teams" means.
 */
export const ELITE = new Set([
  'Real Madrid', 'Barcelona', 'Atlético Madrid', 'PSG', 'Bayern Munich', 'Inter Milan', 'AC Milan',
  'Juventus', 'Napoli', 'Roma', 'Liverpool', 'Arsenal', 'Manchester City', 'Manchester United',
  'Chelsea', 'Tottenham', 'Aston Villa', 'Newcastle', 'Dortmund', 'Bayer Leverkusen', 'Ajax',
  'FC Porto', 'Sporting CP', 'Atalanta', 'Benfica', 'RB Leipzig', 'PSV Eindhoven', 'Club Brugge',
])

export function isElite(club: string): boolean {
  return ELITE.has(club)
}

const R = (
  player: string,
  from: string,
  to: string,
  fee: string,
  kind: Transfer['kind'],
  date: string,
  gradeFrom: string,
  gradeTo: string,
): Transfer => ({ id: `${date}-${player}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'), player, from, to, fee, kind, date, gradeFrom, gradeTo })

/** Newest first, exactly the order the article runs in. */
export const TRANSFERS_2026: Transfer[] = [
  R('Curtis Jones', 'Liverpool', 'Inter Milan', '€35M', 'permanent', '2026-08-21', 'C+', 'B'),
  R('Ezri Konsa', 'Aston Villa', 'Arsenal', '£51M', 'permanent', '2026-08-21', 'C+', 'B'),
  R('João Cancelo', 'Al Hilal', 'Barcelona', 'Free', 'free', '2026-08-20', 'D', 'A'),
  R('Tijjani Reijnders', 'Manchester City', 'Al Qadsiah', '€61M', 'permanent', '2026-08-19', 'A', 'B'),
  R('Diego Moreira', 'Strasbourg', 'AC Milan', '€50M', 'permanent', '2026-08-19', 'A', 'C+'),
  R('Zion Suzuki', 'Parma', 'Aston Villa', '€30M', 'permanent', '2026-08-19', 'B', 'B+'),
  R('Rodrigo Mora', 'FC Porto', 'Roma', '€25M', 'permanent', '2026-08-19', 'B', 'B'),
  R('Rodri', 'Manchester City', 'Barcelona', '€60M', 'permanent', '2026-08-18', 'D', 'A'),
  R('Ferran Torres', 'Barcelona', 'PSG', '€50M', 'permanent', '2026-08-15', 'B', 'B+'),
  R('Mika Godts', 'Ajax', 'PSG', '€45M', 'permanent', '2026-08-15', 'A', 'B'),
  R('Cristian Romero', 'Tottenham', 'Atlético Madrid', '€40M', 'permanent', '2026-08-15', 'B-', 'A'),
  R('Djed Spence', 'Tottenham', 'Inter Milan', '€30M', 'permanent', '2026-08-15', 'C+', 'A-'),
  R('Dusan Vlahovic', 'Juventus', 'Besiktas', 'Free', 'free', '2026-08-13', 'D', 'B'),
  R('Pep Chavarría', 'Rayo Vallecano', 'Chelsea', '€21M', 'permanent', '2026-08-12', 'A', 'B'),
  R('Ronald Araújo', 'Barcelona', 'Liverpool', 'Loan', 'loan', '2026-08-10', 'B-', 'C+'),
  R('Trevoh Chalobah', 'Chelsea', 'Como', '£25M', 'permanent', '2026-08-09', 'C-', 'A'),
  R('Lucas Digne', 'Aston Villa', 'PSG', '€11.6M', 'permanent', '2026-08-09', 'C', 'A'),
  R('Bruno Guimarães', 'Newcastle', 'Arsenal', '£75M', 'permanent', '2026-08-08', 'B', 'A-'),
  R('James Trafford', 'Manchester City', 'Leeds', '£40M', 'permanent', '2026-08-06', 'B-', 'B+'),
  R('Yan Diomande', 'RB Leipzig', 'Real Madrid', '€125M', 'permanent', '2026-08-06', 'A+', 'B'),
  R('Maghnes Akliouche', 'Monaco', 'PSG', '€50M', 'permanent', '2026-08-06', 'B', 'A-'),
  R('Mohamed Salah', 'Liverpool', 'Trabzonspor', 'Free', 'free', '2026-08-06', 'C', 'A'),
  R('Jordan Henderson', 'Brentford', 'Chelsea', 'Free', 'free', '2026-08-03', 'B', 'C+'),
  R('Randal Kolo Muani', 'PSG', 'Juventus', '€38M', 'permanent', '2026-08-02', 'A', 'C+'),
  R('Danny Welbeck', 'Brighton', 'Chelsea', 'Undisclosed', 'permanent', '2026-08-01', 'C', 'A'),
  R('Maxence Lacroix', 'Crystal Palace', 'Chelsea', '£52M', 'permanent', '2026-07-30', 'B', 'B'),
  R('Carlos Espí', 'Levante', 'Real Madrid', '€25M', 'permanent', '2026-07-30', 'B+', 'B'),
  R('John Stones', 'Manchester City', 'Inter Milan', 'Free', 'free', '2026-07-30', 'B', 'A'),
  R('Lee Kang-In', 'PSG', 'Atlético Madrid', '€35M', 'permanent', '2026-07-25', 'C+', 'B'),
  R('Crysencio Summerville', 'West Ham', 'Al Hilal', '£55M', 'permanent', '2026-07-24', 'A+', 'B'),
  R('Elliot Anderson', 'Nottingham Forest', 'Manchester City', '£116M', 'permanent', '2026-07-23', 'A+', 'B-'),
  R('Christos Tzolis', 'Club Brugge', 'Arsenal', '€40M', 'permanent', '2026-07-23', 'B+', 'B'),
  R('Karim Adeyemi', 'Dortmund', 'Barcelona', '€22M', 'permanent', '2026-07-23', 'B', 'C+'),
  R('Alejandro Garnacho', 'Chelsea', 'Aston Villa', 'Loan', 'loan', '2026-07-23', 'B-', 'B'),
  R('Casemiro', 'Manchester United', 'Inter Miami', 'Free', 'free', '2026-07-22', 'B-', 'B'),
  R('Morgan Rogers', 'Aston Villa', 'Chelsea', '£117M', 'permanent', '2026-07-21', 'A+', 'C+'),
  R('João Gomes', 'Wolves', 'Aston Villa', '£34M', 'permanent', '2026-07-20', 'C', 'A'),
  R('Johan Manzambi', 'Freiburg', 'Aston Villa', '£50M', 'permanent', '2026-07-17', 'A+', 'B+'),
  R('Luka Vuskovic', 'Tottenham', 'Brighton', '£46M', 'permanent', '2026-07-14', 'B', 'B'),
  R('Youri Tielemans', 'Aston Villa', 'Manchester United', '£35M', 'permanent', '2026-07-14', 'C+', 'A-'),
  R('Andrey Santos', 'Chelsea', 'Manchester United', '£48M', 'permanent', '2026-07-13', 'C+', 'B+'),
  R('Morten Hjulmand', 'Sporting CP', 'Atlético Madrid', '€40M', 'permanent', '2026-07-11', 'B', 'A-'),
  R('Jeremy Monga', 'Leicester', 'Manchester City', '£10M', 'permanent', '2026-07-11', 'B', 'B'),
  R('Sandro Tonali', 'Newcastle', 'Tottenham', '£92.5M', 'permanent', '2026-07-06', 'A+', 'C-'),
  R('Denzel Dumfries', 'Inter Milan', 'Real Madrid', '€20M', 'permanent', '2026-07-05', 'C', 'A'),
  R('Nathaniel Brown', 'Eintracht Frankfurt', 'Bayern Munich', '€55M', 'permanent', '2026-07-03', 'A', 'B'),
  R('Mateus Fernandes', 'West Ham', 'Tottenham', '£85M', 'permanent', '2026-07-02', 'A+', 'C+'),
  R('Anthony Gordon', 'Newcastle', 'Barcelona', '€70M', 'permanent', '2026-07-01', 'A-', 'B'),
  R('Marco Palestra', 'Atalanta', 'Chelsea', '€60M', 'permanent', '2026-07-01', 'A', 'B'),
  R('Marc Cucurella', 'Chelsea', 'Real Madrid', '€55M', 'permanent', '2026-07-01', 'C-', 'A-'),
  R('Ismael Saibari', 'PSV Eindhoven', 'Bayern Munich', '€55M', 'permanent', '2026-07-01', 'A', 'B'),
  R('Piero Hincapié', 'Bayer Leverkusen', 'Arsenal', '€40M', 'permanent', '2026-07-01', 'C', 'A'),
  R('Emmanuel Emegha', 'Strasbourg', 'Chelsea', '€25M', 'permanent', '2026-07-01', 'B', 'B'),
  R('Robert Lewandowski', 'Barcelona', 'Chicago Fire', 'Free', 'free', '2026-07-01', 'B', 'B+'),
  R('Bernardo Silva', 'Manchester City', 'Real Madrid', 'Free', 'free', '2026-07-01', 'D', 'A'),
  R('Ibrahima Konaté', 'Liverpool', 'Real Madrid', 'Free', 'free', '2026-07-01', 'D', 'B-'),
  R('Antoine Griezmann', 'Atlético Madrid', 'Orlando City', 'Free', 'free', '2026-07-01', 'B', 'A'),
  R('Gonçalo Ramos', 'PSG', 'AC Milan', '€74M', 'permanent', '2026-06-30', 'A', 'C+'),
  R('Alejandro Grimaldo', 'Bayer Leverkusen', 'Atlético Madrid', '€20M', 'permanent', '2026-06-30', 'C', 'A'),
  R('Rasmus Højlund', 'Manchester United', 'Napoli', '€44M', 'permanent', '2026-06-29', 'B+', 'B+'),
  R('Jan Paul van Hecke', 'Brighton', 'Tottenham', '£52M', 'permanent', '2026-06-18', 'B+', 'B'),
  R('Víctor Muñoz', 'Osasuna', 'Liverpool', '€40M', 'permanent', '2026-06-18', 'B+', 'B-'),
  R('Marcos Senesi', 'Bournemouth', 'Tottenham', 'Free', 'free', '2026-06-15', 'D', 'A'),
  R('Andy Robertson', 'Liverpool', 'Tottenham', 'Free', 'free', '2026-06-15', 'B', 'B'),
]

/** A move involving one of the clubs we follow, matched loosely on the club name. */
export function involves(t: Transfer, clubs: string[]): boolean {
  return clubs.some((c) => {
    const needle = c.toLowerCase()
    return t.from.toLowerCase().includes(needle) || t.to.toLowerCase().includes(needle)
      || needle.includes(t.from.toLowerCase()) || needle.includes(t.to.toLowerCase())
  })
}

/** The biggest first: fees parsed loosely, frees and loans last. */
export function feeValue(t: Transfer): number {
  const m = t.fee.match(/([\d.]+)/)
  return m ? Number(m[1]) : 0
}
