// 💪 Gym ("Training Deck") — an AI personal trainer that is designed to make
// itself redundant. See BUSINESS_REQUIREMENTS.md §18.
//
// Four tabs, one job each: Train runs the workout, Stats proves it is working,
// Gear owns the shared basement, Coach owns who your trainer thinks you are.
import { TrainPanel } from '../components/gym/TrainPanel'
import { StatsPanel } from '../components/gym/StatsPanel'
import { GearPanel } from '../components/gym/GearPanel'
import { CoachPanel } from '../components/gym/CoachPanel'

export function GymScreen({ tab }: { tab: string }) {
  return (
    <div className="screen">
      {tab === 'train' && <TrainPanel />}
      {tab === 'stats' && <StatsPanel />}
      {tab === 'gear' && <GearPanel />}
      {tab === 'coach' && <CoachPanel />}
    </div>
  )
}
