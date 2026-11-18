import { Minus, Plus } from 'lucide-react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  onStep: (delta: number) => void
  tone?: 'default' | 'loose'
}

/** Campo numérico con botones −/+ (equivalente al stepper del prototipo). */
export function Stepper({ label, value, min, max, onChange, onStep, tone = 'default' }: Props) {
  const labelClass = tone === 'loose' ? 'text-loose' : 'text-muted-foreground'
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label className={`text-xs font-medium ${labelClass}`}>{label}</label>
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px]">
        <button
          type="button"
          aria-label={`Quitar de ${label}`}
          onClick={() => onStep(-1)}
          disabled={value <= min}
          className="flex h-11 items-center justify-center rounded-l-md border border-border bg-card text-lg font-semibold hover:bg-secondary disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 w-full min-w-0 border-y border-border bg-secondary text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label={`Agregar a ${label}`}
          onClick={() => onStep(1)}
          disabled={value >= max}
          className="flex h-11 items-center justify-center rounded-r-md border border-border bg-card text-lg font-semibold hover:bg-secondary disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  )
}
