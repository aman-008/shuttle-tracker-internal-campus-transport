import { AuthError, type AuthUser } from './auth'

export type Stop = {
  id: string
  code: string
  name: string
  description: string
  location: { lat: number; lng: number }
  status: 'active' | 'inactive'
}

export type Route = {
  id: string
  code: string
  name: string
  color: string
  stops: string[]
  stopIds: string[]
  frequencyMinutes: number
  frequency: string
  firstTrip: string
  lastTrip: string
  status: 'active' | 'inactive'
}

export type Vehicle = {
  id: string
  code: string
  name: string
  route: { id: string; code: string; name: string } | null
  capacity: number
  occupied: number
  status: 'in_service' | 'available' | 'maintenance'
  location: { lat: number; lng: number }
  updatedAt: string
}

export type Schedule = {
  id: string
  route: { id: string; code: string; name: string } | null
  departureTime: string
  days: string[]
  direction: string
}

export type Report = {
  _id: string
  type: 'crowding' | 'delay' | 'other'
  message: string
  status: 'open' | 'reviewed' | 'resolved'
  route?: { id: string; code: string; name: string } | null
  stop?: { id: string; name: string; code: string } | null
  user?: { id: string; name: string; email: string } | null
  createdAt: string
}

export type Notification = {
  _id: string
  title: string
  message: string
  type: 'announcement' | 'delay' | 'service'
  route?: { id: string; code: string; name: string } | null
  createdAt: string
}

export type CampusSettings = {
  campusName: string
  serviceStart: string
  serviceEnd: string
  serviceDays: string[]
  announcement: string
}

export type StudentData = {
  user: AuthUser
  routes: Route[]
  stops: Stop[]
  vehicles: Vehicle[]
  schedules: Schedule[]
  notifications: Notification[]
  reports: Report[]
  settings: CampusSettings | null
  summary: { students: number; activeShuttles: number; routes: number; openDelays: number }
  favorites: { stops: Stop[]; routes: Route[] }
}

export type AdminOverview = {
  students: number
  activeShuttles: number
  routes: number
  openDelays: number
  openReports: number
  systemStatus: string
  settings: CampusSettings | null
}

export type AdminUser = AuthUser & {
  role: 'student' | 'admin'
  active: boolean
  createdAt: string
}

export type Analytics = {
  vehicles: number
  utilizationPercent: number
  occupancy: { occupied: number; capacity: number }
  popularStops: { name: string; routeCount: number }[]
  delaysByRoute: { route: string; count: number }[]
  reports: { _id: string; count: number }[]
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
    throw new AuthError('Could not reach the server. Check that the API is running.')
  }
  if (response.status === 204) return undefined as T
  let data: { error?: string } & Record<string, unknown>
  try {
    data = await response.json() as { error?: string } & Record<string, unknown>
  } catch {
    throw new AuthError('The server returned an invalid response.', response.status)
  }
  if (!response.ok) throw new AuthError(data.error ?? 'The request could not be completed.', response.status)
  return data as T
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

export const getStudentData = () => request<StudentData>('/api/student/data')
export const getAdminOverview = () => request<AdminOverview>('/api/admin/overview')
export const getAdminRoutes = () => request<Route[]>('/api/admin/routes')
export const getAdminStops = () => request<Stop[]>('/api/admin/stops')
export const getAdminVehicles = () => request<Vehicle[]>('/api/admin/vehicles')
export const getAdminSchedules = () => request<Schedule[]>('/api/admin/schedules')
export const getAdminReports = () => request<Report[]>('/api/admin/reports')
export const getAdminUsers = () => request<AdminUser[]>('/api/admin/users')
export const getAnalytics = () => request<Analytics>('/api/admin/analytics')

export const createRoute = (data: Record<string, unknown>) => request<Route>('/api/admin/routes', json('POST', data))
export const updateRoute = (id: string, data: Record<string, unknown>) => request<Route>(`/api/admin/routes/${id}`, json('PATCH', data))
export const deleteRoute = (id: string) => request<void>(`/api/admin/routes/${id}`, json('DELETE'))
export const createStop = (data: Record<string, unknown>) => request<Stop>('/api/admin/stops', json('POST', data))
export const updateStop = (id: string, data: Record<string, unknown>) => request<Stop>(`/api/admin/stops/${id}`, json('PATCH', data))
export const deleteStop = (id: string) => request<void>(`/api/admin/stops/${id}`, json('DELETE'))
export const createVehicle = (data: Record<string, unknown>) => request<Vehicle>('/api/admin/vehicles', json('POST', data))
export const updateVehicle = (id: string, data: Record<string, unknown>) => request<Vehicle>(`/api/admin/vehicles/${id}`, json('PATCH', data))
export const deleteVehicle = (id: string) => request<void>(`/api/admin/vehicles/${id}`, json('DELETE'))
export const createSchedule = (data: Record<string, unknown>) => request<Schedule>('/api/admin/schedules', json('POST', data))
export const updateSchedule = (id: string, data: Record<string, unknown>) => request<Schedule>(`/api/admin/schedules/${id}`, json('PATCH', data))
export const deleteSchedule = (id: string) => request<void>(`/api/admin/schedules/${id}`, json('DELETE'))
export const updateReport = (id: string, status: Report['status']) => request<Report>(`/api/admin/reports/${id}`, json('PATCH', { status }))
export const createNotification = (data: Record<string, unknown>) => request<Notification>('/api/admin/notifications', json('POST', data))
export const updateAdminUser = (id: string, data: { active?: boolean; role?: 'student' | 'admin' }) => request<AdminUser>(`/api/admin/users/${id}`, json('PATCH', data))
export const updateCampusSettings = (data: Partial<CampusSettings>) => request<CampusSettings>('/api/admin/settings', json('PATCH', data))
export const updateStudentProfile = (data: { name?: string; preferences?: { arrivalAlerts?: boolean; announcements?: boolean } }) => request<{ user: AuthUser }>('/api/student/profile', json('PATCH', data))
export const updateFavorites = (stopIds: string[], routeIds: string[]) => request<{ stops: Stop[]; routes: Route[] }>('/api/student/favorites', json('PUT', { stopIds, routeIds }))
export const createReport = (data: { type: Report['type']; message: string; routeId?: string; stopId?: string }) => request<{ report: Report }>('/api/student/reports', json('POST', data))
