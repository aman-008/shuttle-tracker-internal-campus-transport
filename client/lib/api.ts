import axios, { type AxiosError } from 'axios'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: 'student' | 'admin'
  active: boolean
  preferences: { arrivalAlerts: boolean; announcements: boolean }
}

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

export type AdminUser = AuthUser & { createdAt: string }

export type AdminOverview = {
  students: number
  activeShuttles: number
  routes: number
  openDelays: number
  openReports: number
  systemStatus: string
  settings: CampusSettings | null
}

export type Analytics = {
  vehicles: number
  utilizationPercent: number
  occupancy: { occupied: number; capacity: number }
  popularStops: { name: string; routeCount: number }[]
  delaysByRoute: { route: string; count: number }[]
  reports: { _id: string; count: number }[]
}

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(undefined, (error: AxiosError<{ error?: string }>) => {
  if (error.response?.status === 401 && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('shuttle:session-expired'))
  }
  return Promise.reject(error)
})

export function errorMessage(error: unknown, fallback = 'The request could not be completed.') {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? error.message ?? fallback
  }
  return error instanceof Error ? error.message : fallback
}

export async function getCurrentUser() {
  return (await api.get<{ user: AuthUser }>('/auth/me')).data.user
}

export async function signIn(email: string, password: string) {
  return (await api.post<{ user: AuthUser }>('/auth/login', { email, password })).data.user
}

export async function signUp(input: { name: string; email: string; password: string }) {
  return (await api.post<{ user: AuthUser }>('/auth/signup', input)).data.user
}

export async function signOut() {
  await api.post('/auth/logout')
}

export async function getStudentData() {
  return (await api.get<StudentData>('/student/data')).data
}

export async function getAdminOverview() {
  return (await api.get<AdminOverview>('/admin/overview')).data
}

export async function getAdminRoutes() {
  return (await api.get<Route[]>('/admin/routes')).data
}

export async function getAdminStops() {
  return (await api.get<Stop[]>('/admin/stops')).data
}

export async function getAdminVehicles() {
  return (await api.get<Vehicle[]>('/admin/vehicles')).data
}

export async function getAdminSchedules() {
  return (await api.get<Schedule[]>('/admin/schedules')).data
}

export async function getAdminReports() {
  return (await api.get<Report[]>('/admin/reports')).data
}

export async function getAdminUsers() {
  const users = await api.get<Array<AdminUser & { _id?: string }>>('/admin/users')
  return users.data.map((account) => ({
    ...account,
    id: account.id || account._id || '',
  }))
}

export async function getAnalytics() {
  return (await api.get<Analytics>('/admin/analytics')).data
}

export const saveProfile = (input: { name?: string; preferences?: Partial<AuthUser['preferences']> }) =>
  api.patch<{ user: AuthUser }>('/student/profile', input).then(({ data }) => data)

export const saveFavorites = (stopIds: string[], routeIds: string[]) =>
  api.put('/student/favorites', { stopIds, routeIds })

export const submitReport = (input: { type: Report['type']; message: string; routeId?: string; stopId?: string }) =>
  api.post<{ report: Report }>('/student/reports', input).then(({ data }) => data.report)

export const createRoute = (input: Record<string, unknown>) => api.post('/admin/routes', input)
export const updateRoute = (id: string, input: Record<string, unknown>) => api.patch(`/admin/routes/${id}`, input)
export const deleteRoute = (id: string) => api.delete(`/admin/routes/${id}`)
export const createStop = (input: Record<string, unknown>) => api.post('/admin/stops', input)
export const updateStop = (id: string, input: Record<string, unknown>) => api.patch(`/admin/stops/${id}`, input)
export const deleteStop = (id: string) => api.delete(`/admin/stops/${id}`)
export const createVehicle = (input: Record<string, unknown>) => api.post('/admin/vehicles', input)
export const updateVehicle = (id: string, input: Record<string, unknown>) => api.patch(`/admin/vehicles/${id}`, input)
export const deleteVehicle = (id: string) => api.delete(`/admin/vehicles/${id}`)
export const createSchedule = (input: Record<string, unknown>) => api.post('/admin/schedules', input)
export const updateSchedule = (id: string, input: Record<string, unknown>) => api.patch(`/admin/schedules/${id}`, input)
export const deleteSchedule = (id: string) => api.delete(`/admin/schedules/${id}`)
export const updateReport = (id: string, status: Report['status']) => api.patch(`/admin/reports/${id}`, { status })
export const sendNotification = (input: { title: string; message: string; type: Notification['type']; routeId?: string }) =>
  api.post('/admin/notifications', input)
export const updateAdminUser = (id: string, input: { role?: AuthUser['role']; active?: boolean }) =>
  api.patch(`/admin/users/${id}`, input)
export const saveSettings = (input: Partial<CampusSettings>) => api.patch('/admin/settings', input)
