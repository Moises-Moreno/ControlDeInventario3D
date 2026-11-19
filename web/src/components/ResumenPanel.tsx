import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Download, Upload } from 'lucide-react'
import { featuresApi, useStock } from '@/api/features'
import { ApiError } from '@/api/client'
import { useAuth } from '@/store/auth'

const fmt = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 2 })
const fmtDate = (iso: string) => iso.split('-').reverse().join('/')

function venceLabel(daysLeft: number): { text: string; tone: string } {
  if (daysLeft < 0) return { text: `Vencido hace ${Math.abs(daysLeft)} d`, tone: 'text-destructive' }
  if (daysLeft === 0) return { text: 'Vence hoy', tone: 'text-destructive' }
  if (daysLeft <= 15) return { text: `Vence en ${daysLeft} d`, tone: 'text-loose' }
  return { text: `Vence en ${daysLeft} d`, tone: 'text-muted-foreground' }
}

export function ResumenPanel() {
  const { data, isLoading } = useStock()
  const qc = useQueryClient()
  const isAdmin = useAuth((s) => s.user?.role) === 'admin'
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  async function exportData() {
    setError('')
    setMsg('')
    try {
      const payload = await featuresApi.exportData()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const d = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      a.href = url
      a.download = `inventario-${d}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMsg('Datos exportados.')
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo exportar.')
    }
  }

  async function importData(file: File) {
    setError('')
    setMsg('')
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      const res = await featuresApi.importData(payload)
      await qc.invalidateQueries()
      setMsg(`Importado: ${res.counts.products} productos, ${res.counts.racks} racks, ${res.counts.pallets} pallets.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'El archivo no es un JSON válido de inventario.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Exportar / importar */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Datos</h2>
        <div className="flex gap-2">
          <button type="button" onClick={exportData} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-card font-semibold hover:bg-secondary">
            <Download className="size-4" /> Exportar
          </button>
          {isAdmin && (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-9 flex-1 items-center justify-center gap-2 rounded-md border border-border bg-card font-semibold hover:bg-secondary">
              <Upload className="size-4" /> Importar
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
        </div>
        {isAdmin && <p className="text-xs text-muted-foreground">Importar reemplaza todos los datos actuales por los del archivo.</p>}
        {msg && <p className="text-xs text-[color:var(--ok,#1b7f47)]">{msg}</p>}
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      </section>

      {/* Totales */}
      {data && (
        <div className="grid grid-cols-2 gap-2">
          <Tile label="Productos" value={fmt(data.totals.products)} />
          <Tile label="Pallets" value={fmt(data.totals.pallets)} />
          <Tile label="Cajas" value={fmt(data.totals.boxes)} />
          <Tile label="Envases" value={fmt(data.totals.units)} />
        </div>
      )}

      {/* Stock por producto */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Stock por producto</h2>
        {isLoading && <p className="text-xs text-muted-foreground">Cargando…</p>}
        <ul className="flex flex-col gap-1.5">
          {data?.rows.map((r) => (
            <li key={r.productId} className="grid grid-cols-[14px_1fr_auto] items-center gap-2.5 rounded-md border border-border p-2">
              <span className="size-3.5 rounded-sm border border-border" style={{ background: r.color }} />
              <div className="min-w-0">
                <span className="font-semibold tabular-nums">{r.code}</span>
                <span className="block truncate text-xs text-muted-foreground">{r.name}</span>
              </div>
              <span className="text-right leading-tight">
                <span className="text-lg font-semibold tabular-nums">{fmt(r.boxes)}</span>
                <small className="block text-[11px] font-medium text-muted-foreground">
                  {fmt(r.volume)} {r.unit} · {fmt(r.units)} envases
                  <br />
                  {r.fullPallets} {r.fullPallets === 1 ? 'completo' : 'completos'} · {r.partialPallets} {r.partialPallets === 1 ? 'mermado' : 'mermados'}
                </small>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Próximos a vencer */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Próximos a vencer</h2>
        {data && data.expiring.length === 0 && (
          <p className="text-xs text-muted-foreground">Ningún pallet vence en los próximos 60 días.</p>
        )}
        <ul className="flex flex-col gap-1.5">
          {data?.expiring.map((e) => {
            const v = venceLabel(e.daysLeft)
            return (
              <li key={e.pal} className="flex items-center justify-between gap-2 rounded-md border border-border p-2 text-sm">
                <div className="min-w-0">
                  <span className="font-semibold tabular-nums">{e.pal}</span>
                  <span className="block truncate text-xs text-muted-foreground">{e.code} · {fmtDate(e.vence)}</span>
                </div>
                <span className={`whitespace-nowrap text-xs font-semibold ${v.tone}`}>{v.text}</span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border bg-secondary p-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
    </div>
  )
}
