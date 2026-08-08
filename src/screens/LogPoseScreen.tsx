// 🕐 Clocks — the crew's time zones. A travel app: it only shows
// up on the home screen while trip mode (the Brazil money converter) is on.
import { TimeZoneSection } from '../components/TimeZoneSection'

export function LogPoseScreen() {
  return (
    <div className="screen">
      <TimeZoneSection />
    </div>
  )
}
