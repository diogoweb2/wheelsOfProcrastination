import { useState } from 'react'

// 🔄 "This got updated Saturday, Nov 7 at 1:07 PM."
//
// Shown once, on the first open of a build this device has not seen before —
// so after a deploy you can tell at a glance whether the tablet is on the new
// build or still serving the old one from cache. No modal = same build as last
// time. The very first visit on a device stays quiet: that is not an update.
const KEY = 'wheels.lastBuild'

function readAndStamp(): boolean {
  try {
    const seen = localStorage.getItem(KEY)
    localStorage.setItem(KEY, __BUILD_ID__)
    return seen !== null && seen !== __BUILD_ID__
  } catch {
    return false // storage blocked: no way to know, so say nothing
  }
}

function when(): string {
  const d = new Date(__BUILD_TIME__)
  const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${day} at ${time}`
}

export function UpdatedModal() {
  const [show, setShow] = useState(readAndStamp)
  if (!show) return null
  const close = () => setShow(false)
  return (
    <div className="overlay overlay--center" onClick={close}>
      <div className="sheet" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 48, margin: '6px 0' }}>🔄</div>
        <div className="h1">New version!</div>
        <p className="muted" style={{ margin: '8px 0 18px' }}>
          This got updated {when()}.
          <br />
          <span style={{ fontSize: 11 }}>V: {__BUILD_ID__}</span>
        </p>
        <button className="btn" onClick={close}>
          Yosh!
        </button>
      </div>
    </div>
  )
}
