// 💪 Gym ("Training Deck"). See BUSINESS_REQUIREMENTS.md §18.
//
// Four tabs, one job each: Train runs the workout, Stats proves it is working,
// Gear owns the shared basement, Plan owns who the planner thinks you are.
import { TrainPanel } from '../components/gym/TrainPanel'
import { StatsPanel } from '../components/gym/StatsPanel'
import { GearPanel } from '../components/gym/GearPanel'
import { PlanPanel } from '../components/gym/PlanPanel'

export function GymScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      {tab === 'train' && <TrainPanel />}
      {tab === 'stats' && <StatsPanel />}
      {tab === 'gear' && <GearPanel />}
      {tab === 'plan' && <PlanPanel />}
    </div>
  )
}
