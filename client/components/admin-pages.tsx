'use client'

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight, BarChart3, BusFront, CalendarDays, Check, ClipboardList, Clock3, LoaderCircle, MapPin, Plus,
  Route as RouteIcon, Settings2, ShieldCheck, Trash2, Users, X,
} from 'lucide-react'
import {
  sendNotification, createRoute, createSchedule, createStop, createVehicle,
  deleteRoute, deleteSchedule, deleteStop, deleteVehicle, getAdminOverview,
  getAdminReports, getAdminRoutes, getAdminSchedules, getAdminStops, getAdminUsers,
  getAdminVehicles, getAnalytics, saveSettings, updateAdminUser, updateReport,
  updateRoute, updateSchedule, updateStop, updateVehicle,
  type AdminOverview, type AdminUser, type Analytics, type AuthUser,
  errorMessage, type CampusSettings, type Notification, type Report, type Route, type Schedule,
  type Stop, type StudentData, type Vehicle,
} from '@/lib/api'
import { formatDate, formatTime } from '@/lib/utils'
import { MapView } from '@/components/map-view'
import { Button } from '@/components/ui/button'
import { Card, CardHeading } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'

type Props = {
  page: string
  data: StudentData
  onRefresh: () => Promise<void>
  onNotify: (message: string) => void
  user: AuthUser
}

type AdminData = {
  overview: AdminOverview | null
  routes: Route[]
  stops: Stop[]
  vehicles: Vehicle[]
  schedules: Schedule[]
  reports: Report[]
  users: AdminUser[]
  analytics: Analytics | null
}

const initialAdminData: AdminData = {
  overview: null, routes: [], stops: [], vehicles: [], schedules: [], reports: [], users: [], analytics: null,
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>
}

function Empty({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><span className="empty-icon"><Settings2 size={17} /></span><strong>{title}</strong><p>{copy}</p></div>
}

function Stat({ icon: Icon, label, value, detail }: { icon: typeof BusFront; label: string; value: string | number; detail: string }) {
  return <Card className="stat-card"><span className="stat-icon"><Icon size={18} /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><small>{detail}</small></Card>
}

export function AdminPages({ page, data, onRefresh, onNotify, user }: Props) {
  const [resources, setResources] = useState<AdminData>(initialAdminData)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (page === 'dashboard') {
        const [overview, vehicles, reports] = await Promise.all([getAdminOverview(), getAdminVehicles(), getAdminReports()])
        setResources((current) => ({ ...current, overview, vehicles, reports }))
      } else if (page === 'shuttles') {
        const vehicles = await getAdminVehicles()
        setResources((current) => ({ ...current, vehicles }))
      } else if (page === 'routes') {
        const [routes, stops] = await Promise.all([getAdminRoutes(), getAdminStops()])
        setResources((current) => ({ ...current, routes, stops }))
      } else if (page === 'stops') {
        const [stops, routes] = await Promise.all([getAdminStops(), getAdminRoutes()])
        setResources((current) => ({ ...current, stops, routes }))
      } else if (page === 'schedules') {
        const schedules = await getAdminSchedules()
        setResources((current) => ({ ...current, schedules }))
      } else if (page === 'users') {
        const users = await getAdminUsers()
        setResources((current) => ({ ...current, users }))
      } else if (page === 'reports') {
        const reports = await getAdminReports()
        setResources((current) => ({ ...current, reports }))
      } else if (page === 'analytics') {
        const analytics = await getAnalytics()
        setResources((current) => ({ ...current, analytics }))
      }
      setLoadError('')
    } catch (error) {
      setLoadError(errorMessage(error, 'Could not load this admin view.'))
      throw error
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load().catch(() => undefined) }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function perform(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      await Promise.all([load(), onRefresh()])
      onNotify(success)
    } catch (error) {
      onNotify(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  if (loadError && page !== 'notifications' && page !== 'settings') return <div className="page-stack"><PageHeader eyebrow="OPERATIONS WORKSPACE" title="Transport operations." description="Manage campus service from one place." /><div className="inline-error" role="alert">{loadError}<Button size="sm" onClick={() => void load().catch(() => undefined)}>Try again</Button></div></div>
  if (loading && page !== 'notifications' && page !== 'settings') return <div className="page-stack"><PageHeader eyebrow="OPERATIONS WORKSPACE" title="Loading operations." description="Retrieving the latest campus data." /><div className="resource-loading" role="status"><LoaderCircle size={17} /> Loading data from the transport API…</div></div>
  if (page === 'dashboard') return <AdminOverviewPage data={data} overview={resources.overview} vehicles={resources.vehicles} reports={resources.reports} />
  if (page === 'shuttles') return <ShuttlesPage data={data} vehicles={resources.vehicles} busy={busy} perform={perform} />
  if (page === 'routes') return <RoutesAdminPage routes={resources.routes} stops={resources.stops} busy={busy} perform={perform} />
  if (page === 'stops') return <StopsAdminPage stops={resources.stops} routes={resources.routes} busy={busy} perform={perform} />
  if (page === 'schedules') return <SchedulesPage schedules={resources.schedules} routes={data.routes} busy={busy} perform={perform} />
  if (page === 'users') return <UsersPage users={resources.users} currentUser={user} busy={busy} perform={perform} />
  if (page === 'notifications') return <NotificationsAdmin data={data} busy={busy} perform={perform} />
  if (page === 'reports') return <ReportsAdmin reports={resources.reports} busy={busy} perform={perform} />
  if (page === 'analytics') return <AnalyticsPage analytics={resources.analytics} />
  return <SettingsPage settings={data.settings} busy={busy} perform={perform} />
}

function AdminOverviewPage({ data, overview, vehicles, reports }: { data: StudentData; overview: AdminOverview | null; vehicles: Vehicle[]; reports: Report[] }) {
  return <div className="page-stack">
    <PageHeader eyebrow="CAMPUS TRANSPORT OPERATIONS" title="Operations overview." description="Current service health, fleet status, and rider activity." action={<Badge className="badge--active"><i /> {overview?.systemStatus ?? 'Checking service'}</Badge>} />
    <div className="stats-grid">
      <Stat icon={Users} label="Student accounts" value={overview?.students ?? '—'} detail="Active student accounts" />
      <Stat icon={BusFront} label="Shuttles in service" value={overview?.activeShuttles ?? '—'} detail={`${vehicles.length} vehicles registered`} />
      <Stat icon={RouteIcon} label="Active routes" value={overview?.routes ?? '—'} detail="Currently available routes" />
      <Stat icon={Clock3} label="Open rider reports" value={overview?.openReports ?? '—'} detail={`${overview?.openDelays ?? 0} delay reports`} />
    </div>
    <Card className="map-card"><CardHeading title="Fleet positions" subtitle="Simulated vehicle positions across the campus network." action={<Link className="quiet-link" href="/admin/shuttles">Manage fleet <ArrowRight size={14} /></Link>} /><MapView routes={data.routes} stops={data.stops} vehicles={vehicles.filter((vehicle) => vehicle.status === 'in_service')} />
      <p className="table-note">Positions are generated by the campus simulation service, not real GPS.</p>
    </Card>
    <div className="dashboard-grid dashboard-grid--lower">
      <Card><CardHeading title="Fleet availability" subtitle={`${vehicles.filter((vehicle) => vehicle.status === 'in_service').length} currently in service`} />
        {vehicles.slice(0, 5).map((vehicle) => <div className="vehicle-row" key={vehicle.id}><span className="vehicle-icon"><BusFront size={16} /></span><div className="vehicle-row-copy"><strong>{vehicle.name}</strong><small>{vehicle.code} · {vehicle.route?.code ?? 'Unassigned'}</small></div><Badge className={`badge--${vehicle.status}`}>{vehicle.status.replace('_', ' ')}</Badge><span className="vehicle-occupancy">{vehicle.occupied}/{vehicle.capacity}</span></div>)}
      </Card>
      <Card><CardHeading title="Recent rider reports" subtitle={`${overview?.openReports ?? 0} awaiting review`} action={<Link className="quiet-link" href="/admin/reports">Review reports <ArrowRight size={14} /></Link>} />
        {reports.slice(0, 3).map((report) => <div className="admin-compact-report" key={report._id}><span className="report-type-dot" /><div><strong>{report.type} · {report.message}</strong><small>{report.route?.code ?? 'Campus'} · {formatDate(report.createdAt)}</small></div><Badge className={`badge--${report.status}`}>{report.status}</Badge></div>)}
        {!reports.length && <Empty title="No recent reports" copy="Student reports will appear here for review." />}
      </Card>
    </div>
  </div>
}

function ShuttlesPage({ data, vehicles, busy, perform }: { data: StudentData; vehicles: Vehicle[]; busy: boolean; perform: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [form, setForm] = useState({ code: '', name: '', capacity: '20', routeId: '' })
  const [query, setQuery] = useState('')
  const filtered = vehicles.filter((vehicle) => `${vehicle.name} ${vehicle.code} ${vehicle.route?.name ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void perform(() => createVehicle({ ...form, capacity: Number(form.capacity), routeId: form.routeId || null }), 'Shuttle added')
    setForm({ code: '', name: '', capacity: '20', routeId: '' })
  }
  return <div className="page-stack">
    <PageHeader eyebrow="FLEET OPERATIONS" title="Manage shuttles." description="Register campus vehicles and update route assignment, service status, and passenger counts." />
    <Card><CardHeading title="Add a shuttle" subtitle="Vehicle records are saved to the campus fleet." />
      <form className="form-grid form-grid--four" onSubmit={submit}><Field label="Vehicle code"><input required minLength={2} maxLength={12} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="SH-08" /></Field><Field label="Vehicle name"><input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="E-Shuttle 08" /></Field><Field label="Capacity"><input type="number" min="1" max="100" required value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} /></Field><Field label="Route assignment"><select value={form.routeId} onChange={(event) => setForm({ ...form, routeId: event.target.value })}><option value="">Unassigned</option>{data.routes.map((route) => <option value={route.id} key={route.id}>{route.code} · {route.name}</option>)}</select></Field><div className="form-footer form-footer--full"><span>New shuttles are created as available.</span><Button variant="primary" type="submit" disabled={busy}><Plus size={15} /> Add shuttle</Button></div></form>
    </Card>
    <Card><div className="table-card-heading"><CardHeading title="Campus fleet" subtitle={`${vehicles.length} registered vehicles`} /><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fleet" /></div>
      {filtered.length ? <div className="admin-card-list">{filtered.map((vehicle) => <article className="admin-item-card" key={vehicle.id}>
        <div className="admin-item-heading"><span className="vehicle-icon"><BusFront size={16} /></span><div className="admin-item-title"><strong>{vehicle.name}</strong><small>{vehicle.code} · {vehicle.route?.name ?? 'Unassigned'} · updated {formatTime(vehicle.updatedAt)}</small></div><Badge className={`badge--${vehicle.status}`}>{vehicle.status.replace('_', ' ')}</Badge></div>
        <div className="admin-item-controls"><Field label="Route"><select value={vehicle.route?.id ?? ''} onChange={(event) => void perform(() => updateVehicle(vehicle.id, { routeId: event.target.value }), 'Shuttle route updated')}><option value="">Unassigned</option>{data.routes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.name}</option>)}</select></Field><Field label="Service status"><select value={vehicle.status} onChange={(event) => void perform(() => updateVehicle(vehicle.id, { status: event.target.value }), 'Shuttle status updated')}><option value="in_service">In service</option><option value="available">Available</option><option value="maintenance">Maintenance</option></select></Field><Field label={`Riders · ${vehicle.occupied}/${vehicle.capacity}`}><input type="number" min="0" max={vehicle.capacity} defaultValue={vehicle.occupied} onBlur={(event) => { const occupied = Number(event.target.value); if (occupied !== vehicle.occupied && occupied >= 0 && occupied <= vehicle.capacity) void perform(() => updateVehicle(vehicle.id, { occupied }), 'Occupancy updated') }} /></Field><Button variant="danger" size="sm" onClick={() => { if (window.confirm(`Remove ${vehicle.name} from the fleet?`)) void perform(() => deleteVehicle(vehicle.id), 'Shuttle removed') }}><Trash2 size={14} /> Remove</Button></div>
        <div className="occupancy-track"><span style={{ width: `${vehicle.capacity ? Math.min(100, Math.round(vehicle.occupied / vehicle.capacity * 100)) : 0}%` }} /></div>
      </article>)}</div> : <Empty title="No shuttles found" copy="Adjust your search or add a campus shuttle." />}
    </Card>
  </div>
}

function RoutesAdminPage({ routes, stops, busy, perform }: { routes: Route[]; stops: Stop[]; busy: boolean; perform: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [form, setForm] = useState({ code: '', name: '', color: '#21c4d5', frequencyMinutes: '12', firstTrip: '07:00', lastTrip: '22:00', stopIds: [] as string[] })
  const [editing, setEditing] = useState<Route | null>(null)
  const [query, setQuery] = useState('')
  const visible = routes.filter((route) => `${route.code} ${route.name}`.toLowerCase().includes(query.toLowerCase()))
  const toggleStop = (ids: string[], id: string) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void perform(() => createRoute({ ...form, frequencyMinutes: Number(form.frequencyMinutes) }), 'Route created')
    setForm({ code: '', name: '', color: '#21c4d5', frequencyMinutes: '12', firstTrip: '07:00', lastTrip: '22:00', stopIds: [] })
  }
  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    void perform(() => updateRoute(editing.id, { code: editing.code, name: editing.name, color: editing.color, frequencyMinutes: editing.frequencyMinutes, firstTrip: editing.firstTrip, lastTrip: editing.lastTrip, stopIds: editing.stopIds }), 'Route updated')
    setEditing(null)
  }
  return <div className="page-stack">
    <PageHeader eyebrow="NETWORK DESIGN" title="Manage routes." description="Create routes, choose campus stops, and configure frequency and operating hours." />
    <Card><CardHeading title="Create a route" subtitle="Assign at least one stop to make the route visible on the campus map." />
      <form className="form-grid form-grid--three" onSubmit={submit}>
        <Field label="Route code"><input required minLength={2} maxLength={12} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="R4" /></Field><Field label="Route name"><input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="East Campus Loop" /></Field><Field label="Route color"><input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></Field>
        <Field label="Frequency (minutes)"><input type="number" min="1" max="180" required value={form.frequencyMinutes} onChange={(event) => setForm({ ...form, frequencyMinutes: event.target.value })} /></Field><Field label="First trip"><input type="time" value={form.firstTrip} onChange={(event) => setForm({ ...form, firstTrip: event.target.value })} /></Field><Field label="Last trip"><input type="time" value={form.lastTrip} onChange={(event) => setForm({ ...form, lastTrip: event.target.value })} /></Field>
        <div className="stop-picker"><span>Route stops <small>{form.stopIds.length} selected</small></span><div>{stops.filter((stop) => stop.status === 'active').map((stop) => <label key={stop.id}><input type="checkbox" checked={form.stopIds.includes(stop.id)} onChange={() => setForm({ ...form, stopIds: toggleStop(form.stopIds, stop.id) })} />{stop.name}</label>)}</div></div>
        <div className="form-footer form-footer--full"><span>Route codes must be unique.</span><Button variant="primary" disabled={busy} type="submit"><Plus size={15} /> Create route</Button></div>
      </form>
    </Card>
    <Card><div className="table-card-heading"><CardHeading title="Campus routes" subtitle={`${routes.length} configured`} /><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search routes" /></div>
      {visible.length ? <div className="admin-card-list">{visible.map((route) => <article className="admin-item-card" key={route.id}>
        <div className="admin-item-heading"><span className="route-swatch route-swatch--large" style={{ backgroundColor: route.color }} /><div className="admin-item-title"><strong>{route.code} · {route.name}</strong><small>{route.stops.join(' → ') || 'No stops assigned'} · Every {route.frequencyMinutes} min · {route.firstTrip}–{route.lastTrip}</small></div><Badge className={route.status === 'active' ? 'badge--active' : 'badge--inactive'}>{route.status}</Badge></div>
        {editing?.id === route.id ? <form className="inline-edit-form" onSubmit={saveEdit}><div className="form-grid form-grid--three"><Field label="Code"><input required value={editing.code} onChange={(event) => setEditing({ ...editing, code: event.target.value.toUpperCase() })} /></Field><Field label="Name"><input required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></Field><Field label="Color"><input type="color" value={editing.color} onChange={(event) => setEditing({ ...editing, color: event.target.value })} /></Field><Field label="Frequency"><input type="number" min="1" max="180" value={editing.frequencyMinutes} onChange={(event) => setEditing({ ...editing, frequencyMinutes: Number(event.target.value) })} /></Field><Field label="First trip"><input type="time" value={editing.firstTrip} onChange={(event) => setEditing({ ...editing, firstTrip: event.target.value })} /></Field><Field label="Last trip"><input type="time" value={editing.lastTrip} onChange={(event) => setEditing({ ...editing, lastTrip: event.target.value })} /></Field></div><div className="stop-picker"><span>Route stops</span><div>{stops.map((stop) => <label key={stop.id}><input type="checkbox" checked={editing.stopIds.includes(stop.id)} onChange={() => setEditing({ ...editing, stopIds: toggleStop(editing.stopIds, stop.id) })} />{stop.name}</label>)}</div></div><div className="form-actions"><Button type="button" onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" disabled={busy}><Check size={14} /> Save route</Button></div></form> : <div className="item-actions"><Button size="sm" onClick={() => setEditing(route)}><Settings2 size={14} /> Edit details</Button><Button size="sm" onClick={() => void perform(() => updateRoute(route.id, { status: route.status === 'active' ? 'inactive' : 'active' }), 'Route status updated')}>{route.status === 'active' ? 'Pause route' : 'Activate route'}</Button><Button variant="danger" size="sm" onClick={() => { if (window.confirm(`Delete route ${route.code}? Assigned schedules and favourites will also be removed.`)) void perform(() => deleteRoute(route.id), 'Route deleted') }}><Trash2 size={14} /> Delete</Button></div>}
      </article>)}</div> : <Empty title="No routes found" copy="Add a route or change your search." />}
    </Card>
  </div>
}

function StopsAdminPage({ stops, routes, busy, perform }: { stops: Stop[]; routes: Route[]; busy: boolean; perform: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [form, setForm] = useState({ code: '', name: '', description: '', lat: '31.25', lng: '75.7' })
  const [editing, setEditing] = useState<Stop | null>(null)
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const { lat, lng, ...details } = form
    void perform(() => createStop({ ...details, location: { lat: Number(lat), lng: Number(lng) } }), 'Stop created')
    setForm({ code: '', name: '', description: '', lat: '31.25', lng: '75.7' })
  }
  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    void perform(() => updateStop(editing.id, { code: editing.code, name: editing.name, description: editing.description, location: editing.location }), 'Stop updated')
    setEditing(null)
  }
  return <div className="page-stack">
    <PageHeader eyebrow="CAMPUS PICKUP POINTS" title="Manage stops." description="Maintain stop details and map coordinates used by routes and shuttle estimates." />
    <Card><CardHeading title="Add a campus stop" subtitle="Enter coordinates from an authorized campus map source." />
      <form className="form-grid form-grid--three" onSubmit={submit}>
        <Field label="Stop code"><input required minLength={2} maxLength={12} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="WEST-GATE" /></Field><Field label="Stop name"><input required minLength={2} maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="West Gate" /></Field><Field label="Description"><input maxLength={240} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Pickup point details" /></Field><Field label="Latitude"><input type="number" step="any" min="-90" max="90" required value={form.lat} onChange={(event) => setForm({ ...form, lat: event.target.value })} /></Field><Field label="Longitude"><input type="number" step="any" min="-180" max="180" required value={form.lng} onChange={(event) => setForm({ ...form, lng: event.target.value })} /></Field><div className="form-footer"><span>Use coordinates for this campus.</span><Button type="submit" variant="primary" disabled={busy}><Plus size={15} /> Add stop</Button></div>
      </form>
    </Card>
    <div className="stops-layout"><Card><CardHeading title="Campus stops" subtitle={`${stops.length} locations`} />
      {stops.map((stop) => <article className="admin-stop-row" key={stop.id}>
        {editing?.id === stop.id ? <form className="inline-edit-form" onSubmit={saveEdit}><div className="form-grid form-grid--three"><Field label="Code"><input required value={editing.code} onChange={(event) => setEditing({ ...editing, code: event.target.value.toUpperCase() })} /></Field><Field label="Name"><input required value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} /></Field><Field label="Description"><input value={editing.description} onChange={(event) => setEditing({ ...editing, description: event.target.value })} /></Field><Field label="Latitude"><input type="number" step="any" value={editing.location.lat} onChange={(event) => setEditing({ ...editing, location: { ...editing.location, lat: Number(event.target.value) } })} /></Field><Field label="Longitude"><input type="number" step="any" value={editing.location.lng} onChange={(event) => setEditing({ ...editing, location: { ...editing.location, lng: Number(event.target.value) } })} /></Field></div><div className="form-actions"><Button type="button" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" variant="primary" disabled={busy}><Check size={14} /> Save</Button></div></form> : <><div className="admin-item-heading"><span className="stop-card-icon"><MapPin size={16} /></span><div className="admin-item-title"><strong>{stop.name} <small className="item-code">{stop.code}</small></strong><small>{stop.description || 'Campus stop'} · {stop.location.lat.toFixed(5)}, {stop.location.lng.toFixed(5)}</small></div><Badge className={stop.status === 'active' ? 'badge--active' : 'badge--inactive'}>{stop.status}</Badge></div><div className="item-actions"><span className="assigned-routes">{routes.filter((route) => route.stopIds.includes(stop.id)).map((route) => route.code).join(' · ') || 'No routes assigned'}</span><Button size="sm" onClick={() => setEditing(stop)}>Edit</Button><Button size="sm" onClick={() => void perform(() => updateStop(stop.id, { status: stop.status === 'active' ? 'inactive' : 'active' }), 'Stop status updated')}>{stop.status === 'active' ? 'Deactivate' : 'Activate'}</Button><Button variant="danger" size="sm" onClick={() => { if (window.confirm(`Delete stop ${stop.name}? Routes and favourites will be updated.`)) void perform(() => deleteStop(stop.id), 'Stop deleted') }}><Trash2 size={14} /></Button></div></>}
      </article>)}
      {!stops.length && <Empty title="No campus stops" copy="Add the first pickup point to start building routes." />}
    </Card><Card className="stop-map-card"><CardHeading title="Stop locations" subtitle="Coordinates are displayed on the live campus map." /><MapView routes={routes} stops={stops.filter((stop) => stop.status === 'active')} vehicles={[]} /></Card></div>
  </div>
}

function SchedulesPage({ schedules, routes, busy, perform }: { schedules: Schedule[]; routes: Route[]; busy: boolean; perform: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [form, setForm] = useState({ routeId: '', departureTime: '08:00', direction: 'Outbound', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] })
  const [editing, setEditing] = useState<Schedule | null>(null)
  const [filter, setFilter] = useState('')
  const visible = schedules.filter((item) => !filter || item.route?.id === filter)
  function toggleDay(days: string[], day: string) {
    return days.includes(day) ? days.filter((item) => item !== day) : [...days, day]
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.routeId || !form.days.length) return
    void perform(() => createSchedule(form), 'Departure added to timetable')
  }
  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing || !editing.days.length || !editing.route) return
    const scheduleId = editing.id
    const routeId = editing.route.id
    void perform(() => updateSchedule(scheduleId, { routeId, departureTime: editing.departureTime, direction: editing.direction, days: editing.days }), 'Departure updated')
    setEditing(null)
  }
  return <div className="page-stack">
    <PageHeader eyebrow="SERVICE PLANNING" title="Manage schedules." description="Publish route departures, operating directions, and service days." />
    <Card><CardHeading title="Add a departure" subtitle="Schedules appear in the student timetable as soon as they are saved." />
      <form className="form-grid form-grid--three" onSubmit={submit}><Field label="Route"><select required value={form.routeId} onChange={(event) => setForm({ ...form, routeId: event.target.value })}><option value="">Choose a route</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.name}</option>)}</select></Field><Field label="Departure time"><input required type="time" value={form.departureTime} onChange={(event) => setForm({ ...form, departureTime: event.target.value })} /></Field><Field label="Direction"><input required maxLength={80} value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value })} /></Field><DayPicker days={form.days} onToggle={(day) => setForm({ ...form, days: toggleDay(form.days, day) })} /><div className="form-footer"><span>Choose at least one service day.</span><Button type="submit" variant="primary" disabled={busy || !form.routeId || !form.days.length}><Plus size={15} /> Add departure</Button></div></form>
    </Card>
    <Card><div className="table-card-heading"><CardHeading title="Published departures" subtitle={`${visible.length} timetable entries`} /><label className="inline-filter"><span>Route</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All routes</option>{routes.map((route) => <option value={route.id} key={route.id}>{route.code}</option>)}</select></label></div>
      {visible.length ? <div className="admin-card-list">{visible.map((schedule) => <article className="admin-item-card" key={schedule.id}>
        {editing?.id === schedule.id ? <form className="inline-edit-form" onSubmit={saveEdit}><div className="form-grid form-grid--three"><Field label="Route"><select value={editing.route?.id ?? ''} onChange={(event) => setEditing({ ...editing, route: routes.find((route) => route.id === event.target.value) ?? null })}>{routes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.name}</option>)}</select></Field><Field label="Departure"><input type="time" value={editing.departureTime} onChange={(event) => setEditing({ ...editing, departureTime: event.target.value })} /></Field><Field label="Direction"><input value={editing.direction} onChange={(event) => setEditing({ ...editing, direction: event.target.value })} /></Field></div><DayPicker days={editing.days} onToggle={(day) => setEditing({ ...editing, days: toggleDay(editing.days, day) })} /><div className="form-actions"><Button type="button" onClick={() => setEditing(null)}>Cancel</Button><Button variant="primary" disabled={busy}><Check size={14} /> Save schedule</Button></div></form> : <><div className="admin-item-heading"><span className="schedule-time-icon"><Clock3 size={16} /></span><div className="admin-item-title"><strong>{schedule.departureTime} · {schedule.route?.code} · {schedule.route?.name ?? 'Route unavailable'}</strong><small>{schedule.direction} · {schedule.days.join(', ')}</small></div><Badge className="badge--neutral">Published</Badge></div><div className="item-actions"><Button size="sm" onClick={() => setEditing(schedule)}>Edit</Button><Button size="sm" variant="danger" onClick={() => { if (window.confirm(`Delete the ${schedule.departureTime} departure?`)) void perform(() => deleteSchedule(schedule.id), 'Departure deleted') }}><Trash2 size={14} /> Delete</Button></div></>}
      </article>)}</div> : <Empty title="No departures found" copy="Add a schedule or change the route filter." />}
    </Card>
  </div>
}

function DayPicker({ days, onToggle }: { days: string[]; onToggle: (day: string) => void }) {
  return <div className="day-picker"><span>Service days</span><div>{weekdays.map((day) => <button type="button" key={day} aria-pressed={days.includes(day)} className={days.includes(day) ? 'day-chip day-chip--selected' : 'day-chip'} onClick={() => onToggle(day)}>{day}</button>)}</div></div>
}

function UsersPage({ users, currentUser, busy, perform }: { users: AdminUser[]; currentUser: AuthUser; busy: boolean; perform: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const filtered = users.filter((account) => `${account.name} ${account.email}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="page-stack">
    <PageHeader eyebrow="ACCESS CONTROL" title="Manage users." description="Review campus accounts and manage administrator access and account status." />
    <Card><div className="table-card-heading"><CardHeading title="Campus accounts" subtitle={`${users.length} accounts · administrators are provisioned by server configuration`} /><input className="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" /></div>
      {filtered.length ? <div className="admin-card-list">{filtered.map((account) => <article className="admin-item-card" key={account.id}><div className="admin-item-heading"><span className="avatar">{account.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span><div className="admin-item-title"><strong>{account.name}</strong><small>{account.email} · joined {formatDate(account.createdAt)}</small></div><Badge className={`badge--${account.active ? 'active' : 'inactive'}`}>{account.active ? 'Active' : 'Disabled'}</Badge></div><div className="admin-item-controls"><Field label="Role"><select value={account.role} onChange={(event) => void perform(() => updateAdminUser(account.id, { role: event.target.value as AuthUser['role'] }), 'User permissions updated')}><option value="student">Student</option><option value="admin">Administrator</option></select></Field><Button variant={account.active ? 'danger' : 'secondary'} size="sm" disabled={busy || account.id === currentUser.id} onClick={() => { const verb = account.active ? 'deactivate' : 'reactivate'; if (window.confirm(`${verb[0].toUpperCase()}${verb.slice(1)} ${account.name}'s account?`)) void perform(() => updateAdminUser(account.id, { active: !account.active }), account.active ? 'Account deactivated' : 'Account reactivated') }}>{account.active ? <X size={14} /> : <Check size={14} />}{account.active ? 'Deactivate account' : 'Reactivate account'}</Button></div></article>)}</div> : <Empty title="No accounts found" copy="Try a different search." />}
    </Card>
  </div>
}

function NotificationsAdmin({ data, busy, perform }: { data: StudentData; busy: boolean; perform: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [form, setForm] = useState<{ title: string; message: string; type: Notification['type']; routeId: string }>({ title: '', message: '', type: 'announcement', routeId: '' })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void perform(() => sendNotification({ title: form.title, message: form.message, type: form.type, ...(form.routeId ? { routeId: form.routeId } : {}) }), 'Campus notification published')
    setForm({ title: '', message: '', type: 'announcement', routeId: '' })
  }
  return <div className="page-stack">
    <PageHeader eyebrow="CAMPUS COMMUNICATIONS" title="Notifications." description="Publish announcements, service changes, and route-specific updates for students." />
    <Card><CardHeading title="Publish an update" subtitle="Notifications are visible to signed-in students." />
      <form className="form-grid" onSubmit={submit}><div className="form-grid form-grid--two"><Field label="Notification type"><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as Notification['type'] })}><option value="announcement">Announcement</option><option value="delay">Route delay</option><option value="service">Service disruption</option></select></Field><Field label="Related route (optional)"><select value={form.routeId} onChange={(event) => setForm({ ...form, routeId: event.target.value })}><option value="">Campus-wide</option>{data.routes.map((route) => <option value={route.id} key={route.id}>{route.code} · {route.name}</option>)}</select></Field></div><Field label="Title"><input required minLength={3} maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></Field><Field label="Message"><textarea required minLength={3} maxLength={1000} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} /></Field><div className="form-footer"><span>Updates are published immediately.</span><Button variant="primary" disabled={busy}>Publish update <ArrowRight size={15} /></Button></div></form>
    </Card>
    <Card><CardHeading title="Recent updates" subtitle={`${data.notifications.length} notifications published`} />
      {data.notifications.map((notice) => <article className="notification-card" key={notice._id}><span className="notice-icon"><BellRingIcon type={notice.type} /></span><div className="notification-copy"><strong>{notice.title}</strong><p>{notice.message}</p><small>{notice.route ? `${notice.route.code} · ` : ''}{formatDate(notice.createdAt)} at {formatTime(notice.createdAt)}</small></div><Badge className={`badge--${notice.type}`}>{notice.type}</Badge></article>)}
      {!data.notifications.length && <Empty title="No updates published" copy="Create an update to share it with students." />}
    </Card>
  </div>
}

function BellRingIcon({ type }: { type: Notification['type'] }) {
  return type === 'delay' ? <Clock3 size={16} /> : type === 'service' ? <BusFront size={16} /> : <CalendarDays size={16} />
}

function ReportsAdmin({ reports, busy, perform }: { reports: Report[]; busy: boolean; perform: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const openCount = reports.filter((report) => report.status === 'open').length
  return <div className="page-stack">
    <PageHeader eyebrow="RIDER FEEDBACK" title="Crowd reports." description="Review student-submitted crowding, delay, and service reports." action={<Badge className="badge--delay">{openCount} open</Badge>} />
    <div className="report-summary"><Stat icon={Clock3} label="Open" value={openCount} detail="Awaiting review" /><Stat icon={Check} label="Reviewed" value={reports.filter((report) => report.status === 'reviewed').length} detail="Being monitored" /><Stat icon={ShieldCheck} label="Resolved" value={reports.filter((report) => report.status === 'resolved').length} detail="Marked complete" /></div>
    <Card><CardHeading title="Student reports" subtitle={`${reports.length} reports available for review`} />
      {reports.map((report) => <article className="report-admin-row" key={report._id}><span className={`report-type-icon report-type-icon--${report.type}`}>{report.type === 'crowding' ? <Users size={16} /> : report.type === 'delay' ? <Clock3 size={16} /> : <MapPin size={16} />}</span><div className="report-admin-copy"><div><strong>{report.type === 'crowding' ? 'Crowding' : report.type === 'delay' ? 'Delay' : 'Other issue'}</strong><small>{report.user?.name ?? 'Student'} · {formatDate(report.createdAt)} at {formatTime(report.createdAt)}</small></div><p>{report.message}</p><small>{report.route?.code ?? 'Campus'}{report.stop ? ` · ${report.stop.name}` : ''}</small></div><label className="status-select"><span className={`badge badge--${report.status}`}>{report.status}</span><select aria-label={`Set status for ${report.type} report`} value={report.status} disabled={busy} onChange={(event) => void perform(() => updateReport(report._id, event.target.value as Report['status']), 'Report status updated')}><option value="open">Open</option><option value="reviewed">Reviewed</option><option value="resolved">Resolved</option></select></label></article>)}
      {!reports.length && <Empty title="No student reports" copy="Reports will appear here when students submit them." />}
    </Card>
  </div>
}

function AnalyticsPage({ analytics }: { analytics: Analytics | null }) {
  const hasReports = Boolean(analytics?.reports.length)
  const hasDelays = Boolean(analytics?.delaysByRoute.length)
  const hasStops = Boolean(analytics?.popularStops.length)
  return <div className="page-stack">
    <PageHeader eyebrow="TRANSPORT INSIGHTS" title="Analytics." description="Operational metrics from the current fleet and student reports." />
    <div className="stats-grid">
      <Stat icon={BusFront} label="Registered fleet" value={analytics?.vehicles ?? '—'} detail="Vehicles in the campus system" />
      <Stat icon={Users} label="Current riders" value={analytics?.occupancy.occupied ?? '—'} detail={`Of ${analytics?.occupancy.capacity ?? '—'} total seats`} />
      <Stat icon={BarChart3} label="Fleet occupancy" value={analytics ? `${analytics.utilizationPercent}%` : '—'} detail="Current occupied seats / capacity" />
      <Stat icon={ClipboardList} label="Issue reports" value={analytics?.reports.reduce((sum, item) => sum + item.count, 0) ?? '—'} detail="All recorded report categories" />
    </div>
    <div className="dashboard-grid dashboard-grid--lower">
      <Card><CardHeading title="Reports by category" subtitle="Counts from submitted student reports" />
        {hasReports ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={260}><BarChart data={analytics?.reports} margin={{ top: 8, right: 12, left: -18, bottom: 4 }}><CartesianGrid stroke="#243044" vertical={false} /><XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fill: '#8b9bb1', fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8b9bb1', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#111b2b', border: '1px solid #29364a', borderRadius: 10, color: '#eef3fa' }} /><Bar dataKey="count" name="Reports" fill="#33c7d7" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <Empty title="No report data yet" copy="Category counts appear after students submit reports." />}
      </Card>
      <Card><CardHeading title="Current fleet occupancy" subtitle="Live passenger counts reported by administrators" />
        {analytics && analytics.occupancy.capacity > 0 ? <div className="donut-wrap"><ResponsiveContainer width="100%" height={245}><PieChart><Pie data={[{ name: 'Occupied', value: analytics.occupancy.occupied }, { name: 'Available', value: Math.max(0, analytics.occupancy.capacity - analytics.occupancy.occupied) }]} innerRadius={66} outerRadius={88} paddingAngle={3} dataKey="value" stroke="none"><Cell fill="#33c7d7" /><Cell fill="#253249" /></Pie><Tooltip contentStyle={{ background: '#111b2b', border: '1px solid #29364a', borderRadius: 10, color: '#eef3fa' }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{analytics.utilizationPercent}%</strong><small>occupied</small></div></div> : <Empty title="No capacity data" copy="Add fleet vehicles and update passenger counts to see utilization." />}
      </Card>
    </div>
    <div className="dashboard-grid dashboard-grid--lower">
      <Card><CardHeading title="Delay reports by route" subtitle="Delay reports recorded in the system" />
        {hasDelays ? <div className="chart-wrap"><ResponsiveContainer width="100%" height={270}><BarChart data={analytics?.delaysByRoute} layout="vertical" margin={{ top: 4, right: 22, left: 18, bottom: 4 }}><CartesianGrid stroke="#243044" horizontal={false} /><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#8b9bb1', fontSize: 11 }} /><YAxis type="category" dataKey="route" width={95} axisLine={false} tickLine={false} tick={{ fill: '#aebacc', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#111b2b', border: '1px solid #29364a', borderRadius: 10, color: '#eef3fa' }} /><Bar dataKey="count" name="Delay reports" fill="#a78bfa" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div> : <Empty title="No delay reports" copy="Route delay counts appear as reports are submitted." />}
      </Card>
      <Card><CardHeading title="Popular stops" subtitle="Routes serving each campus stop" />
        {hasStops ? <div className="popular-stop-list">{analytics?.popularStops.map((stop, index) => <div className="popular-stop-row" key={stop.name}><span>{String(index + 1).padStart(2, '0')}</span><strong>{stop.name}</strong><Badge className="badge--neutral">{stop.routeCount} routes</Badge></div>)}</div> : <Empty title="No stop analytics" copy="Add routes and stops to see network usage information." />}
      </Card>
    </div>
    <div className="data-availability"><ShieldCheck size={16} /><p><strong>Data availability.</strong> Daily passenger totals, peak travel hours, arrival punctuality, and historical shuttle activity are not collected by the current backend, so they are intentionally not shown as metrics.</p></div>
  </div>
}

function SettingsPage({ settings, busy, perform }: { settings: CampusSettings | null; busy: boolean; perform: (action: () => Promise<unknown>, success: string) => Promise<void> }) {
  const [form, setForm] = useState<CampusSettings>(settings ?? {
    campusName: 'Lovely Professional University', serviceStart: '07:00', serviceEnd: '22:00', serviceDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], announcement: '',
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void perform(() => saveSettings(form), 'Campus settings saved')
  }
  return <div className="page-stack">
    <PageHeader eyebrow="CAMPUS OPERATIONS" title="Campus settings." description="Configure campus service hours and the notice shown to students." />
    <Card><CardHeading title="Service configuration" subtitle="Changes are saved to campus settings." />
      <form className="form-grid" onSubmit={submit}><Field label="Campus name"><input required maxLength={120} value={form.campusName} onChange={(event) => setForm({ ...form, campusName: event.target.value })} /></Field><div className="form-grid form-grid--two"><Field label="Service starts"><input type="time" value={form.serviceStart} onChange={(event) => setForm({ ...form, serviceStart: event.target.value })} /></Field><Field label="Service ends"><input type="time" value={form.serviceEnd} onChange={(event) => setForm({ ...form, serviceEnd: event.target.value })} /></Field></div><DayPicker days={form.serviceDays} onToggle={(day) => setForm({ ...form, serviceDays: form.serviceDays.includes(day) ? form.serviceDays.filter((item) => item !== day) : [...form.serviceDays, day] })} /><Field label="Campus-wide announcement"><textarea maxLength={1000} value={form.announcement} onChange={(event) => setForm({ ...form, announcement: event.target.value })} placeholder="Optional student-facing service notice" /></Field><div className="form-footer"><span>Announcements are visible to signed-in students.</span><Button variant="primary" disabled={busy}>Save settings <Check size={15} /></Button></div></form>
    </Card>
  </div>
}
