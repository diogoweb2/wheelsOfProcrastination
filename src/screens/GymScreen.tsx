// 💪 Gym ("Training Deck"). See BUSINESS_REQUIREMENTS.md §18.
//
// Six tabs, one job each: Train hands you the next session, Snack hands you ten
// minutes at lunch (§18ab), Blocks owns the programmes themselves (and is the
// only place they can be edited), Body shows what is still recovering, Stats
// proves it is working, and Gear owns the shared basement plus everything the
// app knows about you.
import { TrainPanel } from '../components/gym/TrainPanel'
import { SnackPanel } from '../components/gym/SnackPanel'
import { BlocksPanel } from '../components/gym/BlocksPanel'
import { RecoveryPanel } from '../components/gym/RecoveryPanel'
import { StatsPanel } from '../components/gym/StatsPanel'
import { GearPanel } from '../components/gym/GearPanel'

export function GymScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      {tab === 'train' && <TrainPanel />}
      {tab === 'snack' && <SnackPanel />}
      {tab === 'blocks' && <BlocksPanel />}
      {tab === 'body' && <RecoveryPanel />}
      {tab === 'stats' && <StatsPanel />}
      {tab === 'gear' && <GearPanel />}
    </div>
  )
}
