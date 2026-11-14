import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export interface StockRow {
  productId: number
  code: string
  name: string
  color: string
  unitsPerBox: number
  boxes: number
  units: number
  pallets: number
}

export interface ExpiringRow {
  pal: string
  code: string
  name: string
  vence: string
  daysLeft: number
}

export interface StockSummary {
  rows: StockRow[]
  totals: { products: number; pallets: number; boxes: number; units: number }
  expiring: ExpiringRow[]
}

export interface Movement {
  id: number
  pal: string
  type: string
  fromText: string | null
  toText: string | null
  user: string
  createdAt: string
}

export interface ExportPayload {
  version: number
  exportedAt: string
  products: unknown[]
  racks: unknown[]
  pallets: unknown[]
}

export const featuresApi = {
  getStock: () => api.get<StockSummary>('/stock'),
  getMovements: () => api.get<Movement[]>('/movements'),
  exportData: () => api.get<ExportPayload>('/data/export'),
  importData: (payload: unknown) => api.post<{ ok: boolean; counts: Record<string, number> }>('/data/import', payload),
}

export function useStock() {
  return useQuery({ queryKey: ['stock'], queryFn: featuresApi.getStock, staleTime: 0, refetchOnMount: 'always' })
}

export function useMovements() {
  return useQuery({ queryKey: ['movements'], queryFn: featuresApi.getMovements, staleTime: 0, refetchOnMount: 'always' })
}
