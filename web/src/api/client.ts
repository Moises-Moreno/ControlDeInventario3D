const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

/** Error con el mensaje en español que devuelve la API. */
export class ApiError extends Error {}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. ¿Está corriendo la API?')
  }
  if (!res.ok) {
    let message = 'Ocurrió un error en el servidor.'
    try {
      const body = await res.json()
      message = Array.isArray(body.message) ? body.message.join(' ') : (body.message ?? message)
    } catch {
      /* respuesta sin cuerpo JSON */
    }
    throw new ApiError(message)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body == null ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body == null ? undefined : JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
