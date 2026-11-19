import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { Pallet } from '@/domain/inventory'

export interface ReceptionLineInput {
  presentationId: number
  /** Cantidad en la unidad del producto (p. ej. litros). */
  quantity: number
  lote: string
  vence: string
}

export interface ReceptionInput {
  lines: ReceptionLineInput[]
  observations: string
  signature?: string
  photos: string[]
}

export interface ReceptionSummary {
  id: number
  code: string
  status: 'confirmada' | 'anulada'
  receivedAt: string
  user: string
  observations: string
  palletCount: number
  photoCount: number
  hasSignature: boolean
  lines: {
    productCode: string
    productName: string
    presentation: string
    unit: string
    quantity: number
    boxes: number
  }[]
}

export interface ReceptionDetail {
  id: number
  code: string
  status: 'confirmada' | 'anulada'
  receivedAt: string
  user: string
  observations: string
  signature: string | null
  photos: string[]
  lines: {
    presentationId: number
    productCode: string
    productName: string
    presentation: string
    unit: string
    quantity: number
    boxes: number
    leftoverUnits: number
    lote: string
    vence: string
  }[]
  pallets: Pallet[]
}

export const receptionsApi = {
  list: () => api.get<ReceptionSummary[]>('/receptions'),
  get: (id: number) => api.get<ReceptionDetail>(`/receptions/${id}`),
  create: (input: ReceptionInput) => api.post<ReceptionDetail>('/receptions', input),
  annul: (id: number) => api.post<ReceptionDetail>(`/receptions/${id}/anular`),
}

export function useReceptions() {
  return useQuery({ queryKey: ['receptions'], queryFn: receptionsApi.list, staleTime: 0, refetchOnMount: 'always' })
}
