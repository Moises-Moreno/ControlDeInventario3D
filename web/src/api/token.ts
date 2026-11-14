// Token de sesión, desacoplado del cliente y del store para evitar imports circulares.
let token: string | null = null

export function getToken(): string | null {
  return token
}

export function setToken(t: string | null): void {
  token = t
}

/** El cliente llama a este handler cuando la API responde 401 (sesión vencida). */
export const onUnauthorized: { handler: null | (() => void) } = { handler: null }
