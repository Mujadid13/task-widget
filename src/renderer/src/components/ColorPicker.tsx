import { presets } from '../lib/theme'

/** Row of accent presets plus a free color picker for anything else. */
export function ColorPicker({
  value,
  onChange
}: {
  value: string
  onChange: (hex: string) => void
}): React.JSX.Element {
  const isPreset = presets.some((p) => p.color === value)
  const ring = 'ring-2 ring-white ring-offset-2 ring-offset-slate-950'
  return (
    <div role="group" aria-label="Accent color" className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <button
          key={p.color}
          onClick={() => onChange(p.color)}
          aria-label={p.name}
          aria-pressed={p.color === value}
          title={p.name}
          style={{ backgroundColor: p.color }}
          className={`size-6 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${p.color === value ? ring : ''}`}
        />
      ))}
      {/* Native picker for any other color; shows the custom color once one is chosen. */}
      <label
        title="Custom color"
        className={`relative size-6 cursor-pointer overflow-hidden rounded-full border border-dashed border-slate-400 focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-white ${isPreset ? '' : ring}`}
        style={isPreset ? undefined : { backgroundColor: value }}
      >
        {isPreset && (
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center text-sm text-slate-300"
          >
            +
          </span>
        )}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Custom color"
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  )
}
