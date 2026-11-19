/**
 * Plano del almacén y rutas. Todo en metros sobre una planta vista desde arriba:
 * `x` crece hacia la derecha (a lo largo de las filas) y `v` hacia abajo del plano.
 *
 *   A            (una sola hilera, mira hacia el pasillo de abajo)
 *   ── pasillo ──
 *   B + C        (espalda con espalda)
 *   ── pasillo ──
 *   D            (una sola hilera, mira hacia el pasillo de arriba)
 *
 * Alrededor de B+C hay un pasillo en anillo. El ingreso principal está abajo a la
 * izquierda; el de la derecha está cerrado (sin salida por ahí).
 */
import type { Loc, Rack } from './inventory'

export const CELL = { w: 1.45, d: 1.15 }
export const AISLE = 2.8
export const PAIR_GAP = 0.25
/** Margen libre alrededor de la nave. */
const MARGIN = 1

/** Cómo se agrupan los racks en el plano, por nombre. Los racks que no estén acá van solos al final. */
export const RACK_GROUPS: string[][] = [['A'], ['B', 'C'], ['D']]

export interface RackPlacement {
  rackId: number
  name: string
  group: number
  /** Borde superior del rack en el plano. */
  v0: number
  /** Largo (a lo largo de las filas). */
  len: number
  /** Hacia qué pasillo mira (de dónde se accede a sus posiciones). */
  face: 'north' | 'south'
  /** Índice del pasillo desde el que se accede. */
  aisle: number
}

export interface Entry {
  id: string
  label: string
  x: number
  v: number
  open: boolean
}

export interface GraphNode {
  id: string
  x: number
  v: number
}

export interface Graph {
  nodes: Record<string, GraphNode>
  /** Aristas dirigidas: id origen → [id destino, metros]. */
  edges: Record<string, [string, number][]>
}

export interface WarehousePlan {
  racks: RackPlacement[]
  /** Centro (en `v`) de cada pasillo horizontal. */
  aisles: number[]
  /** Dónde empieza el primer rack (ancho del pasillo izquierdo). */
  x0: number
  xLeft: number
  xRight: number
  width: number
  height: number
  entries: Entry[]
  graph: Graph
}

const dist = (a: { x: number; v: number }, b: { x: number; v: number }) => Math.hypot(a.x - b.x, a.v - b.v)

/** Centro (en x) de una fila. */
export function filaX(plan: Pick<WarehousePlan, 'x0'>, pos: number): number {
  return plan.x0 + (pos - 0.5) * CELL.w
}

function groupRacks(racks: Rack[]): Rack[][] {
  const used = new Set<number>()
  const groups: Rack[][] = []
  for (const names of RACK_GROUPS) {
    const g = names.map((n) => racks.find((r) => r.name === n)).filter((r): r is Rack => !!r)
    g.forEach((r) => used.add(r.id))
    if (g.length) groups.push(g)
  }
  for (const r of racks) if (!used.has(r.id)) groups.push([r])
  return groups
}

export function accessId(aisle: number, pos: number): string {
  return `a${aisle}-f${pos}`
}

export function buildPlan(racks: Rack[]): WarehousePlan {
  const groups = groupRacks(racks)
  const maxPositions = Math.max(1, ...racks.map((r) => r.positions))
  const len = maxPositions * CELL.w
  const x0 = AISLE
  const xLeft = AISLE / 2
  const xRight = x0 + len + AISLE / 2
  const width = x0 + len + AISLE

  // 1) Ubicar los grupos de arriba hacia abajo y decidir hacia qué pasillo mira cada rack.
  const placements: RackPlacement[] = []
  const groupEnd: number[] = []
  let v = MARGIN
  groups.forEach((g, gi) => {
    g.forEach((r, k) => {
      const v0 = v + k * (CELL.d + PAIR_GAP)
      let face: 'north' | 'south'
      if (g.length >= 2 && gi > 0) face = k === 0 ? 'north' : 'south'
      else face = gi === groups.length - 1 && groups.length > 1 ? 'north' : 'south'
      const aisle = face === 'south' ? gi : gi - 1
      placements.push({ rackId: r.id, name: r.name, group: gi, v0, len: r.positions * CELL.w, face, aisle })
    })
    const end = v + g.length * CELL.d + (g.length - 1) * PAIR_GAP
    groupEnd.push(end)
    v = end + AISLE
  })

  const aisleCount = placements.length ? Math.max(...placements.map((p) => p.aisle)) + 1 : 0
  const aisles = Array.from({ length: aisleCount }, (_, i) => groupEnd[i] + AISLE / 2)
  const lastAisleV = aisles.length ? aisles[aisles.length - 1] : MARGIN
  const firstAisleV = aisles.length ? aisles[0] : MARGIN
  const bottom = groupEnd.length ? Math.max(groupEnd[groupEnd.length - 1], lastAisleV + AISLE / 2) : MARGIN
  const height = bottom + MARGIN

  // 2) Entradas: la principal abajo a la izquierda; la de la derecha está cerrada.
  const entries: Entry[] = [
    { id: 'main', label: 'Ingreso principal', x: 0, v: lastAisleV, open: true },
    { id: 'closed', label: 'Ingreso cerrado', x: width, v: (firstAisleV + lastAisleV) / 2, open: false },
  ]

  // 3) Grafo de pasillos con sus sentidos de circulación.
  const nodes: Record<string, GraphNode> = {}
  const edges: Record<string, [string, number][]> = {}
  const addNode = (id: string, x: number, vv: number) => {
    nodes[id] = { id, x, v: vv }
    edges[id] = edges[id] ?? []
  }
  const connect = (a: string, b: string, oneWay: boolean) => {
    const d = dist(nodes[a], nodes[b])
    edges[a].push([b, d])
    if (!oneWay) edges[b].push([a, d])
  }

  aisles.forEach((av, ai) => {
    addNode(`a${ai}-L`, xLeft, av)
    addNode(`a${ai}-R`, xRight, av)
    for (let pos = 1; pos <= maxPositions; pos++) addNode(accessId(ai, pos), filaX({ x0 }, pos), av)
  })
  addNode('E', entries[0].x, entries[0].v)

  aisles.forEach((_, ai) => {
    // Pasillo horizontal: el primero va hacia la derecha; el último, en ambos sentidos.
    const lane = [`a${ai}-L`, ...Array.from({ length: maxPositions }, (_, i) => accessId(ai, i + 1)), `a${ai}-R`]
    const eastOnly = aisles.length > 1 && ai === 0
    for (let i = 0; i < lane.length - 1; i++) connect(lane[i], lane[i + 1], eastOnly)
  })
  // Pasillos verticales: izquierda sube (norte) y derecha baja (sur).
  for (let ai = 0; ai < aisles.length - 1; ai++) {
    connect(`a${ai + 1}-L`, `a${ai}-L`, true)
    connect(`a${ai}-R`, `a${ai + 1}-R`, true)
  }
  // Ingreso principal ↔ pasillo izquierdo del último pasillo.
  if (aisles.length) connect('E', `a${aisles.length - 1}-L`, false)

  return { racks: placements, aisles, x0, xLeft, xRight, width, height, entries, graph: { nodes, edges } }
}

export interface Path {
  /** Ids de nodo en orden. */
  nodes: string[]
  meters: number
}

/** Camino más corto respetando los sentidos únicos (Dijkstra). null si no hay camino. */
export function shortestPath(graph: Graph, from: string, to: string): Path | null {
  if (!graph.nodes[from] || !graph.nodes[to]) return null
  const best: Record<string, number> = { [from]: 0 }
  const prev: Record<string, string> = {}
  const open = new Set<string>([from])
  while (open.size) {
    let cur = ''
    let curD = Infinity
    for (const id of open) if (best[id] < curD) ((cur = id), (curD = best[id]))
    open.delete(cur)
    if (cur === to) break
    for (const [next, w] of graph.edges[cur] ?? []) {
      const nd = curD + w
      if (nd < (best[next] ?? Infinity)) {
        best[next] = nd
        prev[next] = cur
        open.add(next)
      }
    }
  }
  if (best[to] === undefined) return null
  const nodes = [to]
  while (nodes[0] !== from) nodes.unshift(prev[nodes[0]])
  return { nodes, meters: best[to] }
}

/** Nodo del pasillo desde el que se accede a una posición, y la posición exacta del rack. */
export function locAccess(plan: WarehousePlan, loc: Loc): { node: string; stand: GraphNode; target: GraphNode } | null {
  const rp = plan.racks.find((r) => r.rackId === loc.rackId)
  if (!rp) return null
  const node = accessId(rp.aisle, loc.pos)
  const stand = plan.graph.nodes[node]
  if (!stand) return null
  // El punto en el borde del rack que mira al pasillo.
  const targetV = rp.face === 'south' ? rp.v0 + CELL.d : rp.v0
  return { node, stand, target: { id: `t-${node}`, x: stand.x, v: targetV } }
}

/** Metros a pie desde el ingreso principal hasta una posición (Infinity si no hay camino). */
export function distanceFromEntry(plan: WarehousePlan, loc: Loc): number {
  const acc = locAccess(plan, loc)
  if (!acc) return Infinity
  return shortestPath(plan.graph, 'E', acc.node)?.meters ?? Infinity
}

export interface RouteStop {
  loc: Loc
  /** Texto libre para la parada (p. ej. "retirar 3 cajas"). */
  label?: string
}

export interface RouteLeg {
  /** Ids de nodo del tramo (para describirlo con palabras). */
  nodes: string[]
  /** Puntos del plano (x, v) que se dibujan en orden. */
  points: { x: number; v: number }[]
  meters: number
  /** Índice de la parada a la que llega (-1 = vuelta al ingreso). */
  toStop: number
}

export interface Route {
  /** Paradas en el orden en que conviene visitarlas. */
  stops: RouteStop[]
  legs: RouteLeg[]
  meters: number
}

function pathPoints(plan: WarehousePlan, path: Path): { x: number; v: number }[] {
  return path.nodes.map((id) => ({ x: plan.graph.nodes[id].x, v: plan.graph.nodes[id].v }))
}

/** Une posiciones en un recorrido corto: ingreso → paradas → vuelta al ingreso. */
export function planRoute(plan: WarehousePlan, stops: RouteStop[], returnToEntry = true): Route | null {
  if (!stops.length) return { stops: [], legs: [], meters: 0 }
  const access = stops.map((s) => locAccess(plan, s.loc))
  if (access.some((a) => !a)) return null
  const ids = ['E', ...access.map((a) => a!.node)]

  // Distancias entre todos los puntos (los sentidos únicos hacen que no sean simétricas).
  const d: number[][] = ids.map((a) => ids.map((b) => (a === b ? 0 : (shortestPath(plan.graph, a, b)?.meters ?? Infinity))))
  const n = stops.length

  const cost = (order: number[]) => {
    let total = 0
    let at = 0
    for (const i of order) {
      total += d[at][i + 1]
      at = i + 1
    }
    return total + (returnToEntry ? d[at][0] : 0)
  }

  let order = stops.map((_, i) => i)
  if (n <= 7) {
    let best = Infinity
    const permute = (arr: number[], k: number) => {
      if (k === arr.length) {
        const c = cost(arr)
        if (c < best) ((best = c), (order = [...arr]))
        return
      }
      for (let i = k; i < arr.length; i++) {
        ;[arr[k], arr[i]] = [arr[i], arr[k]]
        permute(arr, k + 1)
        ;[arr[k], arr[i]] = [arr[i], arr[k]]
      }
    }
    permute([...order], 0)
  } else {
    // Muchas paradas: vecino más cercano.
    const left = new Set(order)
    order = []
    let at = 0
    while (left.size) {
      let pick = -1
      let pd = Infinity
      for (const i of left) if (d[at][i + 1] < pd) ((pick = i), (pd = d[at][i + 1]))
      left.delete(pick)
      order.push(pick)
      at = pick + 1
    }
  }
  if (cost(order) === Infinity) return null

  const legs: RouteLeg[] = []
  let meters = 0
  let from = 'E'
  order.forEach((i, idx) => {
    const to = access[i]!.node
    const path = shortestPath(plan.graph, from, to)!
    const points = pathPoints(plan, path)
    const target = access[i]!.target
    points.push({ x: target.x, v: target.v })
    legs.push({ nodes: path.nodes, points, meters: path.meters, toStop: idx })
    meters += path.meters
    from = to
  })
  if (returnToEntry) {
    const back = shortestPath(plan.graph, from, 'E')!
    legs.push({ nodes: back.nodes, points: pathPoints(plan, back), meters: back.meters, toStop: -1 })
    meters += back.meters
  }
  return { stops: order.map((i) => stops[i]), legs, meters }
}

/** Nombre del pasillo horizontal i (0 = el primero, entre A y B). */
export function aisleName(i: number): string {
  return `Pasillo ${i + 1}`
}

type Lane = { kind: 'left' | 'right' | 'aisle'; aisle: number }

function laneOf(a: string, b: string): Lane | null {
  if (a === 'E' || b === 'E') return null
  const lane = /^a([0-9]+)-(L|R|f[0-9]+)$/
  const pa = lane.exec(a)
  const pb = lane.exec(b)
  if (!pa || !pb) return null
  if (pa[1] === pb[1]) return { kind: 'aisle', aisle: Number(pa[1]) }
  return { kind: pa[2] === 'L' ? 'left' : 'right', aisle: Number(pa[1]) }
}

/**
 * Indicaciones en palabras para un tramo del recorrido (por ejemplo
 * "Subí por el pasillo izquierdo", "Seguí por el Pasillo 1 hacia la derecha").
 */
export function describeLeg(plan: WarehousePlan, leg: Pick<RouteLeg, 'nodes'>): string[] {
  const steps: string[] = []
  const { nodes } = leg
  if (nodes[0] === 'E') steps.push('Entrá por el ingreso principal.')

  let current: { lane: Lane; fromNode: string; toNode: string } | null = null
  const flush = () => {
    if (!current) return
    const { lane, fromNode, toNode } = current
    const a = plan.graph.nodes[fromNode]
    const b = plan.graph.nodes[toNode]
    if (lane.kind === 'aisle') {
      steps.push(`Seguí por el ${aisleName(lane.aisle)} hacia ${b.x >= a.x ? 'la derecha' : 'la izquierda'}.`)
    } else {
      const side = lane.kind === 'left' ? 'izquierdo' : 'derecho'
      steps.push(`${b.v < a.v ? 'Subí' : 'Bajá'} por el pasillo ${side}.`)
    }
    current = null
  }
  for (let i = 0; i < nodes.length - 1; i++) {
    const lane = laneOf(nodes[i], nodes[i + 1])
    if (!lane) continue
    if (current && current.lane.kind === lane.kind && (lane.kind !== 'aisle' || current.lane.aisle === lane.aisle)) {
      current.toNode = nodes[i + 1]
    } else {
      flush()
      current = { lane, fromNode: nodes[i], toNode: nodes[i + 1] }
    }
  }
  flush()
  if (nodes[nodes.length - 1] === 'E') steps.push('Volvé al ingreso principal.')
  return steps
}
