// 💪 Gym ("Training Deck"). See BUSINESS_REQUIREMENTS.md §18.
//
// Six tabs, one job each: Train hands you the next session, Blocks owns the
// programmes themselves (and is the only place they can be edited), Body shows
// what is still recovering, Stats proves it is working, Gear owns the shared
// basement, Plan owns who the app thinks you are.
import { TrainPanel } from '../components/gym/TrainPanel'
import { BlocksPanel } from '../components/gym/BlocksPanel'
import { RecoveryPanel } from '../components/gym/RecoveryPanel'
import { StatsPanel } from '../components/gym/StatsPanel'
import { GearPanel } from '../components/gym/GearPanel'
import { PlanPanel } from '../components/gym/PlanPanel'

export function GymScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      {tab === 'train' && <TrainPanel />}
      {tab === 'blocks' && <BlocksPanel />}
      {tab === 'body' && <RecoveryPanel />}
      {tab === 'stats' && <StatsPanel />}
      {tab === 'gear' && <GearPanel />}
      {tab === 'plan' && <PlanPanel />}
    </div>
  )
}
