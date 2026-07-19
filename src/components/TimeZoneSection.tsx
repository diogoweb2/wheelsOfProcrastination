import { useEffect, useState } from 'react'
import { Luffy } from './Luffy'

interface CityClock {
  city: string
  flag: string
  timeZone: string
}

const CITIES: CityClock[] = [
  { city: 'Toronto', flag: '🍁', timeZone: 'America/Toronto' },
  { city: 'Recife', flag: '🇧🇷', timeZone: 'America/Recife' },
]

function partsFor(timeZone: string, now: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
  const hour = get('hour')
  const minute = get('minute')
  const second = get('second')

  const dayLabel = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(now)

  const timeLabel = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now)

  const isDaytime = hour >= 6 && hour < 18

  return { hour, minute, second, dayLabel, timeLabel, isDaytime }
}

function ClockFace({ hour, minute, second }: { hour: number; minute: number; second: number }) {
  const hourDeg = (hour % 12) * 30 + minute * 0.5
  const minuteDeg = minute * 6 + second * 0.1
  const secondDeg = second * 6

  return (
    <div className="tz-clock">
      <div className="tz-clock__face">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="tz-clock__tick"
            style={{ transform: `rotate(${i * 30}deg) translateY(-46%)` }}
          />
        ))}
        <div className="tz-clock__hand tz-clock__hand--hour" style={{ transform: `rotate(${hourDeg}deg)` }} />
        <div className="tz-clock__hand tz-clock__hand--minute" style={{ transform: `rotate(${minuteDeg}deg)` }} />
        <div className="tz-clock__hand tz-clock__hand--second" style={{ transform: `rotate(${secondDeg}deg)` }} />
        <div className="tz-clock__hub">☀️</div>
      </div>
    </div>
  )
}

export function TimeZoneSection() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      <div className="h2">🧭 Log Pose — crew time zones</div>

      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <Luffy state="default" size={90} />
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {CITIES.map(({ city, flag, timeZone }) => {
          const { hour, minute, second, dayLabel, timeLabel, isDaytime } = partsFor(timeZone, now)
          return (
            <div
              key={city}
              className="card tz-card"
              style={{ flex: '1 1 220px', textAlign: 'center' }}
            >
              <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>
                {flag} {city}
              </div>
              <ClockFace hour={hour} minute={minute} second={second} />
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
                {timeLabel}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {dayLabel}
              </div>
              <div style={{ fontSize: 12, marginTop: 6, fontWeight: 700, color: isDaytime ? 'var(--orange)' : 'var(--blue)' }}>
                {isDaytime ? '☀️ Sailing under the sun' : '🌙 Sailing under the stars'}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
