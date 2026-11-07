// §14f — the drawings behind the Where Is This? quizzes. Paths are generated
// once from public map data (each `*.generated.ts` names its source) and load
// on demand, one map at a time.
export type MapId = 'canada' | 'usa' | 'europe' | 'gta' | 'toronto' | 'samerica' | 'africa' | 'asia' | 'oceania' | 'world' | 'ttc' | 'organs' | 'skeleton'

/** What a question asks him to tap. Lines are only drawn when they are the question. */
export type MapPick = 'area' | 'river' | 'highway' | 'ocean' | 'range' | 'desert' | 'subway' | 'stop'

export interface MapFeature {
  id: string
  kind: MapPick
  d: string
  at?: number[] // where its name goes when the answer is shown
  small?: boolean // too thin to hit with a finger: gets an invisible wider edge
  ring?: boolean // too small to see: gets a visible ring as well
  color?: string // a line with a real colour of its own: the TTC's
}

export interface MapDrawing {
  id: string
  width: number
  height: number
  backdrop: string // land that is not part of the question
  water?: string // drawn over the backdrop
  features: MapFeature[]
  /** Close-ups for the crowded corners. Same drawing, smaller window. */
  zooms: { label: string; viewBox: string }[]
}
