import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Ban, Box, ChevronLeft, ChevronRight, ClipboardCheck, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useInventory } from '@/store/inventory'
import { useReception, type DraftLine } from '@/store/reception'
import { useScene } from '@/store/scene'
import { useUi } from '@/store/ui'
import { useLayout } from '@/store/layout'
import { useAuth } from '@/store/auth'
import { ApiError } from '@/api/client'
import { receptionsApi, useReceptions, type ReceptionDetail } from '@/api/receptions'
import { compositionLabel, productById, type Presentation, type Product } from '@/domain/inventory'
import { planReception } from '@/domain/reception'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PhotoInput } from '@/components/PhotoInput'
import { SignaturePad } from '@/components/SignaturePad'
import { cn } from '@/lib/utils'

const fmt = (n: number) => n.toLocaleString('es-BO', { maximumFractionDigits: 2 })
const fmtDateTime = (iso: string | Date) =>
  new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const INPUT =
  'h-11 w-full min-w-0 rounded-xl border border-border bg-secondary px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60'

type Mode = 'unit' | 'units' | 'boxes'

/** Cómo se dice la unidad de medida en los rótulos ("un" → "unidades"). */
const unitWord = (unit: string) => (unit === 'un' ? 'unidades' : unit)

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1', className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

export function ReceptionPanel() {
  return <ReceiveStep />
}

/** Convierte lo tecleado (litros, envases o cajas) a la unidad del producto. */
function toQuantity(raw: number, mode: Mode, pr: Presentation): number {
  if (mode === 'unit') return raw
  if (mode === 'units') return raw * pr.contentPerUnit
  return raw * pr.unitsPerBox * pr.contentPerUnit
}

/* ------------------------------------------------------------------ */
/* Paso 1: recibir la mercadería                                       */
/* ------------------------------------------------------------------ */

function ReceiveStep() {
  const qc = useQueryClient()
  const products = useInventory((s) => s.products)
  const user = useAuth((s) => s.user)
  const requestNewProduct = useUi((s) => s.requestNewProduct)
  const setPreview = useScene((s) => s.setPreview)
  const setTab = useUi((s) => s.setTab)
  const open3d = useLayout((s) => s.open3d)

  const lines = useReception((s) => s.lines)
  const observations = useReception((s) => s.observations)
  const photos = useReception((s) => s.photos)
  const signature = useReception((s) => s.signature)
  const addLine = useReception((s) => s.addLine)
  const removeLine = useReception((s) => s.removeLine)
  const setObservations = useReception((s) => s.setObservations)
  const setPhotos = useReception((s) => s.setPhotos)
  const setSignature = useReception((s) => s.setSignature)
  const confirm = useReception((s) => s.confirm)

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products])
  const [productId, setProductId] = useState<number | null>(null)
  const [presentationId, setPresentationId] = useState<number | null>(null)
  const [mode, setMode] = useState<Mode>('unit')
  const [raw, setRaw] = useState('')
  const [lote, setLote] = useState('')
  const [vence, setVence] = useState('')
  const [previewIdx, setPreviewIdx] = useState(0)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [now] = useState(() => new Date())

  const product = productById(products, productId)
  const presentations = useMemo(() => product?.presentations.filter((x) => x.active) ?? [], [product])
  const presentation = presentations.find((x) => x.id === presentationId) ?? null

  // Producto y presentación por defecto.
  useEffect(() => {
    if (productId == null || !activeProducts.some((p) => p.id === productId)) {
      setProductId(activeProducts[0]?.id ?? null)
    }
  }, [productId, activeProducts])
  useEffect(() => {
    if (!presentations.some((x) => x.id === presentationId)) setPresentationId(presentations[0]?.id ?? null)
  }, [presentationId, presentations])

  const rawNumber = raw === '' ? Number.NaN : Number(raw)
  const draftQuantity = presentation && Number.isFinite(rawNumber) && rawNumber > 0 ? toQuantity(rawNumber, mode, presentation) : 0
  const draftPlan = presentation && draftQuantity > 0 ? planReception(draftQuantity, presentation) : null

  // Todos los pallets que se van a crear: los ya agregados y el que se está tecleando.
  const planned = useMemo(() => {
    const out: { key: string; line: number | 'draft'; kind: 'completo' | 'mermado'; build: { front: number; depth: number; rows: number; loose: number }; boxes: number; product: Product }[] = []
    lines.forEach((l, li) => {
      const pr = products.flatMap((p) => p.presentations).find((x) => x.id === l.presentationId)
      const pd = products.find((p) => p.presentations.some((x) => x.id === l.presentationId))
      if (!pr || !pd) return
      planReception(l.quantity, pr).pallets.forEach((pl, i) =>
        out.push({ key: `${l.key}-${i}`, line: li, kind: pl.kind, build: pl, boxes: pl.boxes, product: pd }),
      )
    })
    if (draftPlan && product) {
      draftPlan.pallets.forEach((pl, i) => out.push({ key: `draft-${i}`, line: 'draft', kind: pl.kind, build: pl, boxes: pl.boxes, product }))
    }
    return out
  }, [lines, products, draftPlan, product])

  // Al teclear una cantidad nueva, la vista previa salta a su primer pallet.
  const draftSignature = draftPlan ? `${presentationId}|${draftPlan.boxes}` : ''
  useEffect(() => {
    if (!draftSignature) return
    const first = planned.findIndex((p) => p.line === 'draft')
    if (first >= 0) setPreviewIdx(first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSignature])

  const idx = Math.min(previewIdx, Math.max(0, planned.length - 1))
  const current = planned[idx]

  // La escena 3D muestra el pallet elegido y se arma a medida que se carga.
  useEffect(() => {
    if (!current) {
      setPreview(null)
      return
    }
    setPreview({
      build: current.build,
      color: current.product.color,
      title: `Pallet ${idx + 1} de ${planned.length}`,
      subtitle: `${current.kind === 'completo' ? 'completo' : 'mermado'} · ${current.boxes} cajas${current.line === 'draft' ? ' · sin agregar' : ''}`,
    })
  }, [current, idx, planned.length, setPreview])
  useEffect(() => () => setPreview(null), [setPreview])

  const totalPallets = planned.filter((p) => p.line !== 'draft').length

  function add() {
    setError('')
    if (!presentation || !product) return
    if (!draftPlan || draftPlan.boxes === 0) {
      setError(
        draftQuantity > 0
          ? `Esa cantidad no completa ni una caja (${compositionLabel(presentation, product.unit)}). Aumentala.`
          : 'Escribe la cantidad recibida.',
      )
      return
    }
    const line: Omit<DraftLine, 'key'> = { presentationId: presentation.id, quantity: draftQuantity, lote: lote.trim(), vence }
    addLine(line)
    setRaw('')
    setLote('')
    setVence('')
    toast.success(`${product.name}: ${draftPlan.fullPallets} completos${draftPlan.partialPallets ? ' + 1 mermado' : ''}.`)
  }

  const canConfirm = lines.length > 0 && !!signature && !sending

  async function submit() {
    setError('')
    if (!lines.length) return setError('Agrega al menos un producto a la recepción.')
    if (!signature) return setError('Falta la firma de quien recepciona.')
    setSending(true)
    try {
      const detail = await receptionsApi.create({
        lines: lines.map(({ presentationId: id, quantity, lote: l, vence: v }) => ({ presentationId: id, quantity, lote: l, vence: v })),
        observations,
        signature,
        photos,
      })
      await qc.invalidateQueries()
      confirm(detail)
      setTab('guardar')
      toast.success(`Recepción ${detail.code} confirmada: ${detail.pallets.length} pallets para guardar.`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo confirmar la recepción.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title="Producto recibido">
        {activeProducts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            No hay productos activos. Creá uno para empezar a recibir mercadería.
          </p>
        ) : (
          <>
            <Field label="Producto">
              <select value={productId ?? ''} onChange={(e) => setProductId(Number(e.target.value))} className={INPUT}>
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </select>
            </Field>

            {presentations.length > 1 && (
              <Field label="Presentación">
                <select value={presentationId ?? ''} onChange={(e) => setPresentationId(Number(e.target.value))} className={INPUT}>
                  {presentations.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {product && presentation && (
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border" style={{ background: product.photo ? undefined : product.color }}>
                  {product.photo && <img src={product.photo} alt="" className="size-full object-cover" />}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold">{presentation.name}</p>
                  <p className="text-muted-foreground">
                    {compositionLabel(presentation, product.unit)} · pallet completo de {presentation.front * presentation.depth * presentation.levels} cajas
                  </p>
                </div>
              </div>
            )}

            <Button type="button" variant="ghost" size="sm" className="self-start" onClick={requestNewProduct}>
              <Plus /> ¿No está? Agregar producto nuevo
            </Button>

            {product && presentation && (
              <>
                <div role="radiogroup" aria-label="Cómo cargás la cantidad" className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-secondary p-1">
                  {(
                    [
                      ['unit', `En ${unitWord(product.unit)}`],
                      ['boxes', 'En cajas'],
                      ['units', 'En envases'],
                    ] as [Mode, string][]
                  ).map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={mode === m}
                      onClick={() => setMode(m)}
                      className={cn(
                        'h-10 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        mode === m ? 'bg-card shadow-sm' : 'text-muted-foreground',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <Field label={`Cantidad recibida (${mode === 'unit' ? unitWord(product.unit) : mode === 'boxes' ? 'cajas' : 'envases'})`}>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder="0"
                    className={cn(INPUT, 'h-14 text-2xl font-bold tabular-nums')}
                  />
                </Field>

                <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3">
                  <Field label="Lote (opcional)">
                    <input type="text" maxLength={20} value={lote} onChange={(e) => setLote(e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Vence (opcional)">
                    <input type="date" value={vence} onChange={(e) => setVence(e.target.value)} className={INPUT} />
                  </Field>
                </div>

                <PlanCard plan={draftPlan} quantity={draftQuantity} unit={product.unit} />

                <Button onClick={add} disabled={!draftPlan || draftPlan.boxes === 0}>
                  <Plus /> Agregar a la recepción
                </Button>
              </>
            )}
          </>
        )}
      </Section>

      {/* Pallets que se van armando */}
      {planned.length > 0 && (
        <Section title="Vista de los pallets">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Pallet anterior" disabled={idx === 0} onClick={() => setPreviewIdx(idx - 1)}>
              <ChevronLeft />
            </Button>
            <p className="flex-1 text-center text-sm">
              <b>
                Pallet {idx + 1} de {planned.length}
              </b>
              <span className="block text-xs text-muted-foreground">
                {current?.kind === 'completo' ? 'Completo' : 'Mermado'} · {current?.boxes} cajas
              </span>
            </p>
            <Button variant="outline" size="icon" aria-label="Pallet siguiente" disabled={idx >= planned.length - 1} onClick={() => setPreviewIdx(idx + 1)}>
              <ChevronRight />
            </Button>
          </div>
          <Button variant="outline" className="self-start" onClick={() => open3d('pallet')}>
            <Box /> Ver pallet en 3D
          </Button>
        </Section>
      )}

      <Section title={`Lo recibido (${lines.length})`}>
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no agregaste productos a esta recepción.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map((l) => (
              <LineRow key={l.key} line={l} products={products} onRemove={() => removeLine(l.key)} />
            ))}
          </ul>
        )}
        {lines.length > 0 && (
          <p className="text-sm font-semibold">
            Se van a crear {totalPallets} {totalPallets === 1 ? 'pallet' : 'pallets'}.
          </p>
        )}
      </Section>

      <Section title="Datos de la recepción">
        <dl className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Fecha</dt>
            <dd className="font-semibold">{fmtDateTime(now)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Registra</dt>
            <dd className="font-semibold">{user?.username}</dd>
          </div>
        </dl>

        <details className="group rounded-xl border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Agregar observaciones o fotos (opcional){observations || photos.length ? ` · ${photos.length} ${photos.length === 1 ? 'foto' : 'fotos'}${observations ? ' y observaciones' : ''}` : ''}
          </summary>
          <div className="mt-3 flex flex-col gap-3">
        <Field label="Observaciones (opcional)">
          <textarea
            value={observations}
            maxLength={1000}
            rows={3}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Estado de la carga, faltantes, golpes, transportista…"
            className="min-h-24 w-full rounded-xl border border-border bg-secondary p-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </Field>

        <PhotoInput label="Fotos del estado de la mercadería (opcionales)" photos={photos} onChange={setPhotos} max={8} />
          </div>
        </details>
        <SignaturePad label="Firma de quien recepciona" onChange={setSignature} />
      </Section>

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm" role="alert">
          {error}
        </p>
      )}

      <Button size="lg" onClick={submit} disabled={!canConfirm}>
        <ClipboardCheck /> {sending ? 'Confirmando…' : `Confirmar recepción${totalPallets ? ` (${totalPallets} pallets)` : ''}`}
      </Button>
      {lines.length > 0 && !signature && <p className="-mt-3 text-center text-xs text-muted-foreground">Falta la firma de quien recepciona.</p>}

    </div>
  )
}

/** Resultado del cálculo en vivo: envases → cajas → pallets. */
function PlanCard({ plan, quantity, unit }: { plan: ReturnType<typeof planReception> | null; quantity: number; unit: string }) {
  if (!plan) {
    return <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">Escribí la cantidad para ver cuántos pallets se arman.</p>
  }
  const mermado = plan.pallets.find((p) => p.kind === 'mermado')
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Cálculo</p>
      <p className="text-sm tabular-nums">
        {fmt(quantity)} {unit} → <b>{fmt(plan.units)} envases</b> → <b>{fmt(plan.boxes)} cajas</b>
      </p>
      {plan.boxes > 0 ? (
        <p className="text-lg font-bold">
          {plan.fullPallets} {plan.fullPallets === 1 ? 'pallet completo' : 'pallets completos'}
          <span className="text-sm font-medium text-muted-foreground"> de {plan.boxesPerPallet} cajas</span>
          {mermado && (
            <>
              {' '}
              + 1 mermado <span className="text-sm font-medium text-muted-foreground">de {mermado.boxes} cajas</span>
            </>
          )}
        </p>
      ) : (
        <p className="text-sm text-destructive">Esa cantidad no completa ni una caja.</p>
      )}
      {plan.leftoverUnits > 0 && (
        <p className="text-xs text-loose">
          Sobran {plan.leftoverUnits} {plan.leftoverUnits === 1 ? 'envase' : 'envases'} que no completan una caja y no se cuentan.
        </p>
      )}
    </div>
  )
}

function LineRow({ line, products, onRemove }: { line: DraftLine; products: Product[]; onRemove: () => void }) {
  const product = products.find((p) => p.presentations.some((x) => x.id === line.presentationId))
  const pr = product?.presentations.find((x) => x.id === line.presentationId)
  if (!product || !pr) return null
  const plan = planReception(line.quantity, pr)
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border p-3">
      <span className="size-4 shrink-0 rounded border border-border" style={{ background: product.color }} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="truncate font-semibold">
          {product.name} · {pr.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {fmt(line.quantity)} {product.unit} → {fmt(plan.boxes)} cajas → {plan.fullPallets} completos{plan.partialPallets ? ' + 1 mermado' : ''}
          {line.lote ? ` · Lote ${line.lote}` : ''}
        </p>
      </div>
      <Button variant="ghost" size="icon" aria-label={`Quitar ${product.name}`} onClick={onRemove}>
        <Trash2 />
      </Button>
    </li>
  )
}

/* ------------------------------------------------------------------ */
/* Paso 2: llevar los pallets a su lugar                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Recepciones anteriores                                              */
/* ------------------------------------------------------------------ */

/** Últimas recepciones con su detalle (en "Más"). */
export function RecentReceptions() {
  const { data } = useReceptions()
  const [openId, setOpenId] = useState<number | null>(null)
  if (!data?.length) return null
  return (
    <Section title="Recepciones anteriores">
      <ul className="flex flex-col gap-2">
        {data.slice(0, 8).map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setOpenId(r.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                r.status === 'anulada' && 'opacity-60',
              )}
            >
              <div className="min-w-0 flex-1 text-sm">
                <p className="flex items-center gap-2 font-semibold tabular-nums">
                  {r.code}
                  {r.status === 'anulada' && <span className="rounded-md bg-destructive/15 px-1.5 text-[11px] font-semibold uppercase text-destructive">Anulada</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.lines.map((l) => `${l.productName} ${fmt(l.quantity)} ${l.unit}`).join(' · ')}
                </p>
              </div>
              <span className="shrink-0 text-right text-xs text-muted-foreground">
                {fmtDateTime(r.receivedAt)}
                <br />
                {r.user} · {r.palletCount} pallets
              </span>
            </button>
          </li>
        ))}
      </ul>
      <ReceptionDialog id={openId} onClose={() => setOpenId(null)} />
    </Section>
  )
}

function ReceptionDialog({ id, onClose }: { id: number | null; onClose: () => void }) {
  const qc = useQueryClient()
  const isAdmin = useAuth((s) => s.user?.role) === 'admin'
  const [detail, setDetail] = useState<ReceptionDetail | null>(null)
  const [confirmAnnul, setConfirmAnnul] = useState(false)

  useEffect(() => {
    if (id == null) {
      setDetail(null)
      return
    }
    let alive = true
    receptionsApi
      .get(id)
      .then((d) => alive && setDetail(d))
      .catch(() => alive && toast.error('No se pudo abrir la recepción.'))
    return () => {
      alive = false
    }
  }, [id])

  async function annul() {
    if (!detail) return
    setConfirmAnnul(false)
    try {
      const d = await receptionsApi.annul(detail.id)
      setDetail(d)
      await qc.invalidateQueries()
      toast.success(`${d.code} anulada. Sus pallets se dieron de baja.`)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'No se pudo anular.')
    }
  }

  return (
    <>
      <Dialog open={id != null} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{detail ? `Recepción ${detail.code}` : 'Recepción'}</DialogTitle>
            <DialogDescription>
              {detail ? `${fmtDateTime(detail.receivedAt)} · ${detail.user} · ${detail.status === 'anulada' ? 'ANULADA' : 'Activa'}` : 'Cargando…'}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="flex flex-col gap-4 text-sm">
              <ul className="flex flex-col gap-1">
                {detail.lines.map((l, i) => (
                  <li key={i} className="rounded-xl bg-secondary p-2">
                    <b>{l.productName}</b> · {l.presentation}: {fmt(l.quantity)} {l.unit} ({l.boxes} cajas)
                    {l.lote ? ` · Lote ${l.lote}` : ''}
                  </li>
                ))}
              </ul>
              <p>
                <b>Pallets:</b> {detail.pallets.map((p) => `${p.pal} (${p.kind})`).join(', ') || '—'}
              </p>
              {detail.observations && (
                <p>
                  <b>Observaciones:</b> {detail.observations}
                </p>
              )}
              {detail.photos.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {detail.photos.map((src, i) => (
                    <img key={i} src={src} alt={`Foto ${i + 1} de la recepción`} className="aspect-[4/3] w-full rounded-xl border border-border object-cover" />
                  ))}
                </div>
              )}
              {detail.signature && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Firma</p>
                  <img src={detail.signature} alt="Firma de quien recepcionó" className="h-24 rounded-xl border border-border bg-white" />
                </div>
              )}
              {isAdmin && detail.status !== 'anulada' && (
                <Button variant="outline" className="self-start text-destructive" onClick={() => setConfirmAnnul(true)}>
                  <Ban /> Anular recepción
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmAnnul} onOpenChange={setConfirmAnnul}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular {detail?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se dan de baja todos los pallets de esta recepción y se liberan sus posiciones. La recepción queda en el historial como anulada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white" onClick={annul}>
              Anular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
