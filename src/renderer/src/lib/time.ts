import { useEffect, useState } from 'react'

/** Current time, refreshed once per minute (aligned to :00) to keep idle CPU near zero. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = (): void => {
      timer = setTimeout(
        () => {
          setNow(new Date())
          schedule()
        },
        60_000 - (Date.now() % 60_000)
      )
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])
  return now
}

const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const day = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

/** "Overdue · 3:00 PM", "Today 5:00 PM", "Tomorrow 9:00 AM" or "Mon 27 Oct 9:00 AM". */
export function formatDue(iso: string, now: Date): string {
  const due = new Date(iso)
  const t = time.format(due)
  if (due < now) return `Overdue · ${t}`
  const days = Math.round((startOfDay(due) - startOfDay(now)) / 86_400_000)
  if (days === 0) return `Today ${t}`
  if (days === 1) return `Tomorrow ${t}`
  return `${day.format(due)} ${t}`
}

const startOfDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
