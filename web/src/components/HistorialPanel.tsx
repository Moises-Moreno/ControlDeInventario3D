import { useState } from 'react'
import { useMovements, type Movement } from '@/api/features'

const TYPE_LABEL: Record<string, string> = {
  alta: 'Alta',
  recuento: 'Recuento',
  ubicacion: 'Ubicación',
  traslado: 'Traslado',
  baja: 'Baja',
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function detail(m: Movement): string {
  if (m.type === 'ubicacion') return m.toText ? `→ ${m.toText}` : (m.fromText ? `bajado de ${m.fromText}` : '')
  if (m.type === 'traslado') return `${m.fromText ?? '?'} → ${m.toText ?? '?'}`
  if (m.type === 'baja') return m.fromText ? `desde ${m.fromText}` : ''
  return ''
}

export function HistorialPanel() {
  const { data, isLoading } = useMovements()
  const [filter, setFilter] = useState('todos')

  const rows = (data ?? []).filter((m) => filter === 'todos' || m.type === filter)

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Historial de movimientos</h2>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Filtrar por tipo</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-secondary px-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="todos">Todos</option>
            {Object.entries(TYPE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>

        {isLoading && <p className="text-xs text-muted-foreground">Cargando…</p>}
        {!isLoading && rows.length === 0 && <p className="text-xs text-muted-foreground">No hay movimientos para este filtro.</p>}

        <ul className="flex flex-col gap-1.5">
          {rows.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-2 rounded-md border border-border p-2">
              <div className="min-w-0">
                <span className="font-semibold tabular-nums">{m.pal}</span>
                <span className="ml-2 rounded border border-border px-1.5 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  {TYPE_LABEL[m.type] ?? m.type}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {detail(m)}
                  {detail(m) ? ' · ' : ''}
                  {m.user}
                </span>
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">{fmtDateTime(m.createdAt)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
