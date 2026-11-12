export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'student' | 'admin'
  active: boolean
  preferences: {
    arrivalAlerts: boolean
    announcements: boolean
  }
}

type AuthResponse = {
  user: AuthUser
}

export class AuthError extends Error {
  readonly status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
  } catch {
    throw new AuthError('Could not reach the authentication service. Check that the API server is running.')
  }

  if (response.status === 204) return undefined as T

  let result: { error?: string } & Record<string, unknown>
  try {
    result = await response.json() as { error?: string } & Record<string, unknown>
  } catch {
    throw new AuthError('The authentication service returned an invalid response.', response.status)
  }

  if (!response.ok) {
    throw new AuthError(result.error ?? 'Authentication failed. Please try again.', response.status)
  }
  return result as T
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const result = await request<AuthResponse>('/api/auth/me')
    return result.user
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) return null
    throw error
  }
}

export async function createAccount(input: { name: string; email: string; password: string }): Promise<AuthUser> {
  const result = await request<AuthResponse>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return result.user
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const result = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return result.user
}

export async function signOut(): Promise<void> {
  await request<void>('/api/auth/logout', { method: 'POST' })
}
