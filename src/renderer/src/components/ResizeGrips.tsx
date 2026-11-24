import type { Corner } from '../types'

const corners: { corner: Corner; place: string; cursor: string; rotate: string }[] = [
  {
    corner: 'top-left',
    place: 'top-1.5 left-1.5',
    cursor: 'cursor-nwse-resize',
    rotate: 'rotate-180'
  },
  {
    corner: 'top-right',
    place: 'top-1.5 right-1.5',
    cursor: 'cursor-nesw-resize',
    rotate: '-rotate-90'
  },
  {
    corner: 'bottom-left',
    place: 'bottom-1.5 left-1.5',
    cursor: 'cursor-nesw-resize',
    rotate: 'rotate-90'
  },
  {
    corner: 'bottom-right',
    place: 'right-1.5 bottom-1.5',
    cursor: 'cursor-nwse-resize',
    rotate: ''
  }
]

const zoomKeys: Record<string, number> = {
  ArrowDown: 0.05,
  ArrowRight: 0.05,
  ArrowUp: -0.05,
  ArrowLeft: -0.05
}

/**
 * A grip in each corner: drag outward to enlarge the whole widget, inward to shrink it.
 * The opposite corner stays put; the main process follows the cursor between start and end.
 * Only the bottom-right grip takes keyboard focus (arrow keys step the size), so keyboard
 * users get one resize control instead of four identical ones.
 */
export function ResizeGrips(): React.JSX.Element {
  return (
    <>
      {corners.map(({ corner, place, cursor, rotate }) => {
        const keyboard = corner === 'bottom-right'
        return (
          <button
            key={corner}
            aria-label="Resize widget"
            aria-hidden={!keyboard}
            tabIndex={keyboard ? 0 : -1}
            title="Drag to resize"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId) // keep getting the release even off the card
              window.api.resizeStart(corner)
            }}
            onPointerUp={() => window.api.resizeEnd()}
            onLostPointerCapture={() => window.api.resizeEnd()}
            onKeyDown={(e) => {
              const step = zoomKeys[e.key]
              if (!keyboard || step === undefined) return
              e.preventDefault()
              window.api.zoomBy(step)
            }}
            // no-drag: the top grips must not count as part of the window-move handle
            className={`absolute ${place} ${cursor} rounded p-0.5 text-slate-400 opacity-40 [-webkit-app-region:no-drag] hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-accent-200`}
          >
            <svg
              viewBox="0 0 12 12"
              className={`size-3 ${rotate}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M11 4 4 11M11 8 8 11" />
            </svg>
          </button>
        )
      })}
    </>
  )
}
