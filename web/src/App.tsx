import { useState } from 'react'
import { Moon, Sun, Boxes, LogOut } from 'lucide-react'
import { BuilderPanel } from '@/components/BuilderPanel'
import { ProductsPanel } from '@/components/ProductsPanel'
import { WarehousePanel } from '@/components/WarehousePanel'
import { ResumenPanel } from '@/components/ResumenPanel'
import { HistorialPanel } from '@/components/HistorialPanel'
import { BuilderScene } from '@/three/BuilderScene'
import { WarehouseScene } from '@/three/WarehouseScene'
import { useBuilder } from '@/store/builder'
import { useInventory } from '@/store/inventory'
import { useUi, type Tab } from '@/store/ui'
import { useTheme } from '@/store/theme'
import { useAuth } from '@/store/auth'
import { useScene } from '@/store/scene'
import { hasWebGL } from '@/three/webgl'
import { looseColor } from '@/three/palette'
import { productById, occupancy } from '@/domain/inventory'

const TABS: { id: Tab; label: string }[] = [
  { id: 'armar', label: 'Armar' },
  { id: 'productos', label: 'Productos' },
  { id: 'almacen', label: 'Almacén' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'historial', label: 'Historial' },
]

function ThemeToggle() {
  const theme = useTheme((s) => s.theme)
  const toggle = useTheme((s) => s.toggle)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-card hover:bg-secondary"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}

function UserMenu() {
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  return (
    <div className="flex items-center gap-2">
      <div className="hidden text-right leading-tight sm:block">
        <span className="block text-xs font-semibold">{user?.username}</span>
        <span className="block text-[11px] uppercase text-muted-foreground">{user?.role}</span>
      </div>
      <button
        type="button"
        onClick={logout}
        aria-label="Cerrar sesión"
        className="flex size-9 items-center justify-center rounded-md border border-border bg-card hover:bg-secondary"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  )
}

export default function App() {
  const [webgl] = useState(hasWebGL)
  const tab = useUi((s) => s.tab)
  const setTab = useUi((s) => s.setTab)
  const placingId = useUi((s) => s.placingId)
  const requestFrame = useScene((s) => s.requestFrame)
  const theme = useTheme((s) => s.theme)

  const productId = useBuilder((s) => s.productId)
  const products = useInventory((s) => s.products)
  const pallets = useInventory((s) => s.pallets)
  const racks = useInventory((s) => s.racks)
  const product = productById(products, productId)
  const color = product?.color ?? '#c89a5a'
  const looseHex = looseColor(color, theme)

  const warehouse = tab === 'almacen'
  const { cap, used } = occupancy(racks, pallets)
  const placing = pallets.find((p) => p.id === placingId) ?? null

  return (
    <div className="flex h-screen flex-col md:grid md:grid-cols-[380px_1fr]">
      {/* Panel de control */}
      <aside className="order-2 flex flex-col gap-5 overflow-y-auto border-border bg-card p-5 md:order-1 md:border-r">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">Inventario de almacén</h1>
            <p className="text-sm text-muted-foreground">Etapa 4 · Funciones nuevas</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        {/* Pestañas */}
        <div className="grid grid-cols-5 gap-1 rounded-lg border border-border bg-secondary p-1" role="tablist">
          {TABS.map((tb) => (
            <button
              key={tb.id}
              type="button"
              role="tab"
              aria-selected={tab === tb.id}
              onClick={() => setTab(tb.id)}
              className={`h-9 rounded-md text-xs font-semibold ${tab === tb.id ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'armar' && <BuilderPanel />}
        {tab === 'productos' && <ProductsPanel />}
        {tab === 'almacen' && <WarehousePanel />}
        {tab === 'resumen' && <ResumenPanel />}
        {tab === 'historial' && <HistorialPanel />}
      </aside>

      {/* Escena 3D */}
      <main className="relative order-1 h-[45vh] min-h-0 bg-gradient-to-b from-secondary to-background md:order-2 md:h-auto">
        {webgl ? (
          warehouse ? (
            <WarehouseScene />
          ) : (
            <BuilderScene />
          )
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
            <div className="flex flex-col items-center gap-2">
              <Boxes className="size-8" />
              <p>
                Este navegador no pudo iniciar la vista 3D. El panel y el conteo siguen funcionando;
                en el almacén podés usar la lista de posiciones libres.
              </p>
            </div>
          </div>
        )}

        {/* Overlay superior */}
        <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-3">
          <div className="rounded-md border border-border bg-card/80 px-2.5 py-1.5 text-sm text-muted-foreground backdrop-blur">
            {warehouse ? (
              placing ? (
                <>
                  <strong className="text-base font-semibold text-foreground">Ubicando {placing.pal}</strong> · tocá una posición libre
                </>
              ) : (
                <>
                  <strong className="text-base font-semibold text-foreground">Almacén</strong> · {used} de {cap} posiciones ocupadas
                </>
              )
            ) : (
              <>
                <strong className="text-base font-semibold text-foreground">{product ? product.code : 'Sin producto'}</strong> · {product ? product.name : 'elegí un producto'}
              </>
            )}
          </div>
          {webgl && (
            <button
              type="button"
              onClick={requestFrame}
              className="pointer-events-auto h-9 rounded-md border border-border bg-card/80 px-3 text-sm font-medium backdrop-blur hover:bg-secondary"
            >
              Vista inicial
            </button>
          )}
        </div>

        {/* Overlay inferior */}
        <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-3">
          {!warehouse && (
            <div className="flex gap-4 rounded-md border border-border bg-card/80 px-2.5 py-1.5 text-sm text-muted-foreground backdrop-blur">
              <span className="flex items-center gap-1.5">
                <i className="inline-block size-3 rounded-sm border border-border" style={{ background: color }} />
                Fila completa
              </span>
              <span className="flex items-center gap-1.5">
                <i className="inline-block size-3 rounded-sm border border-border" style={{ background: looseHex }} />
                Caja suelta
              </span>
            </div>
          )}
          <div className="ml-auto hidden rounded-md border border-border bg-card/80 px-2.5 py-1.5 text-sm text-muted-foreground backdrop-blur sm:block">
            {warehouse ? 'Tocá una posición · arrastrá para rotar · rueda para acercar' : 'Arrastrá para rotar · rueda o pellizco para acercar'}
          </div>
        </div>
      </main>
    </div>
  )
}
