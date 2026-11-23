'use client'

import Link from 'next/link'
import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowRight, BellRing, Bookmark, BusFront, CalendarDays, Check, Clock3, Flag,
  MapPin, Route as RouteIcon, ShieldCheck, Users, Zap,
} from 'lucide-react'
import {
  errorMessage, saveFavorites, saveProfile, submitReport,
  type AuthUser, type Report, type Route, type StudentData,
} from '@/lib/api'
import { formatDate, formatTime, nextArrivalMinutes } from '@/lib/utils'
import { MapView } from '@/components/map-view'
import { Button } from '@/components/ui/button'
import { Card, CardHeading } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Props = {
  page: string
  data: StudentData
  onRefresh: () => Promise<void>
  onNotify: (message: string) => void
  onUserUpdate: (user: AuthUser) => void
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>
}

function Empty({ title, copy, action }: { title: string; copy: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><MapPin size={18} /></span><strong>{title}</strong><p>{copy}</p>{action}</div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="form-field"><span>{label}</span>{children}</label>
}

function Stat({ icon: Icon, label, value, detail }: { icon: typeof BusFront; label: string; value: string | number; detail: string }) {
  return <Card className="stat-card"><span className="stat-icon"><Icon size={18} /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><small>{detail}</small></Card>
}

function favoriteIds(data: StudentData) {
  return {
    stops: data.favorites.stops.map((stop) => stop.id),
    routes: data.favorites.routes.map((route) => route.id),
  }
}

export function StudentPages({ page, data, onRefresh, onNotify, onUserUpdate }: Props) {
  const [busy, setBusy] = useState(false)

  async function perform(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      await onRefresh()
      onNotify(success)
    } catch (error) {
      onNotify(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  if (page === 'dashboard') return <Overview data={data} />
  if (page === 'live-map') return <LiveTracking data={data} />
  if (page === 'routes') return <RoutesPage data={data} onSaveRoute={(route) => {
    const current = favoriteIds(data)
    const next = current.routes.includes(route.id) ? current.routes.filter((id) => id !== route.id) : [...current.routes, route.id]
    void perform(() => saveFavorites(current.stops, next), 'Route favourites updated')
  }} onSaveStop={(stopId) => {
    const current = favoriteIds(data)
    const next = current.stops.includes(stopId) ? current.stops.filter((id) => id !== stopId) : [...current.stops, stopId]
    void perform(() => saveFavorites(next, current.routes), 'Stop favourites updated')
  }} />
  if (page === 'stops') return <StopsPage data={data} onSave={(stopId) => {
    const current = favoriteIds(data)
    const next = current.stops.includes(stopId) ? current.stops.filter((id) => id !== stopId) : [...current.stops, stopId]
    void perform(() => saveFavorites(next, current.routes), 'Stop favourites updated')
  }} />
  if (page === 'timetable') return <Timetable data={data} />
  if (page === 'favorites') return <Favorites data={data} onSaveStop={(stopId) => {
    const current = favoriteIds(data)
    void perform(() => saveFavorites(current.stops.filter((id) => id !== stopId), current.routes), 'Stop removed from favourites')
  }} onSaveRoute={(routeId) => {
    const current = favoriteIds(data)
    void perform(() => saveFavorites(current.stops, current.routes.filter((id) => id !== routeId)), 'Route removed from favourites')
  }} />
  if (page === 'notifications') return <Notifications data={data} />
  if (page === 'report') return <ReportIssue data={data} busy={busy} onSubmit={(input) => perform(() => submitReport(input), 'Your report has been sent to campus transport')} />
  return <Profile data={data} busy={busy} onSave={(name, preferences) => perform(async () => {
    const result = await saveProfile({ name, preferences })
    onUserUpdate(result.user)
  }, 'Profile settings saved')} />
}

function Overview({ data }: { data: StudentData }) {
  const activeVehicles = data.vehicles.filter((vehicle) => vehicle.status === 'in_service')
  const averageHeadway = data.routes.length
    ? Math.round(data.routes.reduce((sum, route) => sum + route.frequencyMinutes, 0) / data.routes.length)
    : null
  const nextStop = data.favorites.stops[0] ?? data.stops[0]
  const campusTime = new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  const campusDay = new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' })
  const departures = data.schedules
    .filter((schedule) => schedule.days.includes(campusDay)
      && schedule.departureTime >= campusTime
      && schedule.route
      && data.routes.some((route) => route.id === schedule.route?.id))
    .slice(0, 5)

  return <div className="page-stack">
    <PageHeader eyebrow={`${new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()} · STUDENT WORKSPACE`} title={`Good to see you, ${data.user.name.split(' ')[0]}.`} description="Your campus ride, routes, and service updates in one place." action={<Link className="button button--primary" href="/dashboard/live-map">Open live map <ArrowRight size={15} /></Link>} />
    {data.settings?.announcement && <div className="service-banner"><span><BellRing size={17} /></span><div><strong>Campus service notice</strong><p>{data.settings.announcement}</p></div></div>}
    <div className="stats-grid">
      <Stat icon={BusFront} label="Shuttles in service" value={activeVehicles.length} detail={`${data.vehicles.length} vehicles in campus fleet`} />
      <Stat icon={RouteIcon} label="Active routes" value={data.routes.length} detail="Routes currently available" />
      <Stat icon={Clock3} label="Average route headway" value={averageHeadway === null ? '—' : `${averageHeadway} min`} detail="Calculated from configured route frequency" />
      <Stat icon={Users} label="Riders aboard" value={activeVehicles.length ? activeVehicles.reduce((total, vehicle) => total + vehicle.occupied, 0) : '—'} detail={activeVehicles.length ? `Across ${activeVehicles.length} active shuttles` : 'No active vehicle occupancy reported'} />
    </div>
    <div className="dashboard-grid">
      <Card className="map-card"><CardHeading title="Campus in motion" subtitle="Vehicle positions are simulated from the active campus routes." action={<Link className="quiet-link" href="/dashboard/live-map">View full map <ArrowRight size={14} /></Link>} />
        <MapView routes={data.routes} stops={data.stops} vehicles={activeVehicles} />
        <div className="map-caption"><span><i className="legend-vehicle" /> Shuttle</span><span><i className="legend-stop" /> Stop</span><span className="simulated-caption"><Zap size={13} /> Simulation · not GPS</span></div>
      </Card>
      <Card className="arrivals-card"><CardHeading title="At your stop" subtitle={nextStop ? nextStop.name : 'No stops configured'} action={<span className="live-tag"><i /> ESTIMATED</span>} />
        {nextStop ? <div className="arrival-list">{data.routes.map((route) => {
          const vehicle = activeVehicles.find((item) => item.route?.id === route.id)
          return <div className="arrival-item" key={route.id}><span className="route-swatch" style={{ backgroundColor: route.color }} /><div className="arrival-copy"><strong>{route.name}</strong><small>{route.code} · {vehicle?.name ?? 'No shuttle assigned'}</small></div><strong className="arrival-eta">{vehicle ? `${nextArrivalMinutes(vehicle, nextStop)} min` : '—'}</strong></div>
        })}{data.routes.length === 0 && <Empty title="No routes available" copy="There are no active routes to show." />}</div> : <Empty title="No stops configured" copy="Upcoming arrivals will appear after campus stops are added." />}
        <p className="estimate-note">Travel times are estimates calculated from simulated vehicle positions.</p>
      </Card>
    </div>
    <div className="dashboard-grid dashboard-grid--lower">
      <Card><CardHeading title="Your next departures" subtitle="Published timetable entries" action={<Link className="quiet-link" href="/dashboard/timetable">Full timetable <ArrowRight size={14} /></Link>} />
        {departures.length ? <div className="departure-list">{departures.map((entry) => <div className="departure-item" key={entry.id}><span className="departure-time">{entry.departureTime}</span><div><strong>{entry.route?.code} · {entry.route?.name}</strong><small>{entry.direction} · {entry.days.join(', ')}</small></div><CalendarDays size={16} /></div>)}</div> : <Empty title="No departures published" copy="The campus timetable does not have scheduled departures yet." />}</Card>
      <Card><CardHeading title="Service updates" subtitle={`${data.notifications.length} recent announcements`} action={<Link className="quiet-link" href="/dashboard/notifications">All updates <ArrowRight size={14} /></Link>} />
        {data.notifications.slice(0, 3).map((notice) => <article className="notice-row" key={notice._id}><span className={`notice-icon notice-icon--${notice.type}`}><BellRing size={15} /></span><div><strong>{notice.title}</strong><p>{notice.message}</p><small>{formatDate(notice.createdAt)} · {notice.type}</small></div></article>)}
        {!data.notifications.length && <Empty title="All caught up" copy="New campus announcements will appear here." />}
      </Card>
    </div>
    <Card><CardHeading title="Your saved places" subtitle="Favourites are synced to your student account." action={<Link className="quiet-link" href="/dashboard/favorites">Manage favourites <ArrowRight size={14} /></Link>} />
      {data.favorites.stops.length || data.favorites.routes.length ? <div className="favorite-chips">
        {data.favorites.stops.slice(0, 5).map((stop) => <span className="favorite-chip" key={stop.id}><MapPin size={14} />{stop.name}</span>)}
        {data.favorites.routes.slice(0, 4).map((route) => <span className="favorite-chip" key={route.id}><RouteIcon size={14} />{route.code} · {route.name}</span>)}
      </div> : <Empty title="No favourites saved yet" copy="Save a stop or route to keep it close at hand." action={<Link href="/dashboard/routes" className="button button--secondary button--sm">Explore routes</Link>} />}
    </Card>
  </div>
}

function LiveTracking({ data }: { data: StudentData }) {
  const [routeId, setRouteId] = useState('')
  const activeVehicles = data.vehicles.filter((vehicle) => vehicle.status === 'in_service')
  return <div className="page-stack">
    <PageHeader eyebrow="LIVE CAMPUS MAP" title="Find your shuttle." description="Explore campus routes and see the latest simulated vehicle positions." action={<Badge className="badge--simulated"><i /> SIMULATED · NOT GPS</Badge>} />
    <Card className="map-card map-card--large"><div className="map-toolbar"><CardHeading title="Campus transport network" subtitle={`${activeVehicles.length} vehicles in service · location refreshes every 15 seconds`} /><label className="inline-filter"><span>Route</span><select value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="">All routes</option>{data.routes.map((route) => <option value={route.id} key={route.id}>{route.code} · {route.name}</option>)}</select></label></div>
      <MapView routes={data.routes} stops={data.stops} vehicles={activeVehicles} selectedRouteId={routeId || undefined} />
      <div className="map-caption"><span><i className="legend-vehicle" /> Active shuttle</span><span><i className="legend-stop" /> Campus stop</span><span className="simulated-caption">Positions move along configured routes and do not represent real GPS data.</span></div>
    </Card>
    <Card><CardHeading title="Fleet positions" subtitle="Last updated from the campus simulator." />
      {activeVehicles.length ? <div className="vehicle-list">{activeVehicles.map((vehicle) => <div className="vehicle-row" key={vehicle.id}><span className="vehicle-icon"><BusFront size={17} /></span><div className="vehicle-row-copy"><strong>{vehicle.name}</strong><small>{vehicle.code} · {vehicle.route?.code ?? 'Unassigned'}</small></div><span className="vehicle-occupancy">{vehicle.occupied}/{vehicle.capacity} riders</span><Badge className="badge--active">In service</Badge><span className="vehicle-updated">Updated {formatTime(vehicle.updatedAt)}</span></div>)}</div> : <Empty title="No shuttles in service" copy="Active vehicles will appear here when service begins." />}
    </Card>
  </div>
}

function RoutesPage({ data, onSaveRoute, onSaveStop }: { data: StudentData; onSaveRoute: (route: Route) => void; onSaveStop: (stopId: string) => void }) {
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(data.routes[0]?.id ?? '')
  const routes = useMemo(() => data.routes.filter((route) => `${route.code} ${route.name} ${route.stops.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [data.routes, query])
  const selected = routes.find((route) => route.id === selectedId) ?? routes[0]
  const isFavorite = (route: Route) => data.favorites.routes.some((favorite) => favorite.id === route.id)
  return <div className="page-stack">
    <PageHeader eyebrow="CAMPUS NETWORK" title="Routes & stops." description="Browse the active network and see which stops your shuttle serves." action={<Link href="/dashboard/report" className="button button--secondary"><Flag size={15} /> Report an issue</Link>} />
    <div className="search-toolbar"><div className="search-control"><MapPin size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search routes or stops" /></div><span>{routes.length} {routes.length === 1 ? 'route' : 'routes'}</span></div>
    <div className="route-browser"><div className="route-card-list">
      {routes.map((route) => <button key={route.id} type="button" className={`route-card ${selected?.id === route.id ? 'route-card--selected' : ''}`} onClick={() => setSelectedId(route.id)}>
        <span className="route-card-top"><span className="route-code-chip" style={{ '--route-color': route.color } as React.CSSProperties}>{route.code}</span><span className={`status-text ${route.status === 'active' ? 'status-text--active' : ''}`}>{route.status}</span></span><strong>{route.name}</strong><span className="route-card-meta"><Clock3 size={14} /> Every {route.frequencyMinutes} min <i /> {route.stops.length} stops</span><span className="route-card-meta">{route.firstTrip}–{route.lastTrip} service</span>
      </button>)}
      {!routes.length && <Empty title="No routes match" copy="Try a different route name or stop." />}
    </div>
    {selected && <Card className="route-detail-card"><CardHeading title={selected.name} subtitle={`${selected.code} · ${selected.firstTrip}–${selected.lastTrip}`} action={<Button size="sm" onClick={() => onSaveRoute(selected)}>{isFavorite(selected) ? <Check size={14} /> : <Bookmark size={14} />}{isFavorite(selected) ? 'Saved' : 'Save route'}</Button>} />
      <MapView routes={data.routes} stops={data.stops} vehicles={data.vehicles.filter((vehicle) => vehicle.status === 'in_service')} selectedRouteId={selected.id} />
      <div className="route-stop-list">{selected.stopIds.map((stopId, index) => {
        const stop = data.stops.find((item) => item.id === stopId)
        const shuttle = data.vehicles.find((item) => item.route?.id === selected.id && item.status === 'in_service')
        if (!stop) return null
        return <div className="route-stop-row" key={stop.id}><span className="stop-index">{String(index + 1).padStart(2, '0')}</span><span className="route-stop-mark" /><div><strong>{stop.name}</strong><small>{stop.description || `Stop ${index + 1} on ${selected.code}`}</small></div><span className="route-stop-eta">{shuttle ? `~${nextArrivalMinutes(shuttle, stop)} min` : 'No active shuttle'}</span><button type="button" className={`icon-action ${data.favorites.stops.some((favorite) => favorite.id === stop.id) ? 'icon-action--saved' : ''}`} title="Save stop" aria-label={`Toggle ${stop.name} favourite`} onClick={() => onSaveStop(stop.id)}><Bookmark size={15} /></button></div>
      })}</div>
    </Card>}
    {!selected && routes.length === 0 && <Card><Empty title="No active routes" copy="Routes will appear here when transport service is configured." /></Card>}
    </div>
  </div>
}

function StopsPage({ data, onSave }: { data: StudentData; onSave: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const stops = data.stops.filter((stop) => `${stop.name} ${stop.code} ${stop.description}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="page-stack">
    <PageHeader eyebrow="CAMPUS PICKUP POINTS" title="Stops around campus." description="Find a pickup location, view it on the map, and save it for your next trip." />
    <div className="search-toolbar"><div className="search-control"><MapPin size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stops" /></div><span>{stops.length} stops</span></div>
    <div className="stops-layout"><Card className="stop-browser-card"><CardHeading title="Campus stops" subtitle="Active pickup and drop-off locations" />
      {stops.map((stop) => {
        const routes = data.routes.filter((route) => route.stopIds.includes(stop.id))
        const saved = data.favorites.stops.some((item) => item.id === stop.id)
        return <article className="stop-card" key={stop.id}><span className="stop-card-icon"><MapPin size={16} /></span><div className="stop-card-main"><strong>{stop.name}</strong><small>{stop.code} · {stop.description || 'Campus stop'}</small><div className="stop-route-tags">{routes.map((route) => <span key={route.id} style={{ '--route-color': route.color } as React.CSSProperties}>{route.code}</span>)}{routes.length === 0 && <em>No routes assigned</em>}</div></div><button type="button" className={`icon-action ${saved ? 'icon-action--saved' : ''}`} aria-label={`${saved ? 'Remove' : 'Save'} ${stop.name}`} onClick={() => onSave(stop.id)}><Bookmark size={16} /></button></article>
      })}
      {!stops.length && <Empty title="No stops found" copy="Try a different search." />}
    </Card>
      <Card className="stop-map-card"><CardHeading title="Stop map" subtitle="Campus pickup locations" /><MapView routes={data.routes} stops={stops} vehicles={data.vehicles.filter((vehicle) => vehicle.status === 'in_service')} /></Card>
    </div>
  </div>
}

function Timetable({ data }: { data: StudentData }) {
  const [routeId, setRouteId] = useState('')
  const entries = data.schedules.filter((entry) => !routeId || entry.route?.id === routeId)
  return <div className="page-stack">
    <PageHeader eyebrow="PLAN YOUR JOURNEY" title="Campus timetable." description="Published departure times and service days, provided by campus transport." />
    <Card><div className="timetable-toolbar"><CardHeading title="Scheduled departures" subtitle={`${entries.length} published entries`} /><label className="inline-filter"><span>Route</span><select value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="">All routes</option>{data.routes.map((route) => <option value={route.id} key={route.id}>{route.code} · {route.name}</option>)}</select></label></div>
      {entries.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>Departure</th><th>Route</th><th>Direction</th><th>Service days</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id}><td><strong className="table-time">{entry.departureTime}</strong></td><td>{entry.route?.code} · {entry.route?.name ?? 'Route unavailable'}</td><td>{entry.direction}</td><td><span className="day-list">{entry.days.map((day) => <i key={day}>{day}</i>)}</span></td></tr>)}</tbody></table></div> : <Empty title="No departures published" copy={routeId ? 'There are no scheduled trips for this route.' : 'The campus transport team has not published departures yet.'} />}
      <p className="table-note"><CalendarDays size={14} /> Times are campus-published schedules. Arrival estimates use simulated vehicle positions.</p>
    </Card>
  </div>
}

function Favorites({ data, onSaveStop, onSaveRoute }: { data: StudentData; onSaveStop: (id: string) => void; onSaveRoute: (id: string) => void }) {
  return <div className="page-stack">
    <PageHeader eyebrow="YOUR CAMPUS SHORTCUTS" title="Favourites." description="Your saved routes and pickup points, kept together." action={<Link href="/dashboard/routes" className="button button--secondary">Explore routes <ArrowRight size={15} /></Link>} />
    <div className="dashboard-grid dashboard-grid--lower">
      <Card><CardHeading title="Saved stops" subtitle={`${data.favorites.stops.length} saved`} />
        {data.favorites.stops.map((stop) => <div className="favorite-row" key={stop.id}><span className="stop-card-icon"><MapPin size={15} /></span><div><strong>{stop.name}</strong><small>{stop.description || stop.code}</small></div><button className="quiet-link" onClick={() => onSaveStop(stop.id)}>Remove</button></div>)}
        {!data.favorites.stops.length && <Empty title="No saved stops" copy="Save stops from the Stops or Routes page." />}
      </Card>
      <Card><CardHeading title="Saved routes" subtitle={`${data.favorites.routes.length} saved`} />
        {data.favorites.routes.map((route) => <div className="favorite-row" key={route.id}><span className="route-swatch" style={{ backgroundColor: route.color }} /><div><strong>{route.name}</strong><small>{route.code} · Every {route.frequencyMinutes} min</small></div><button className="quiet-link" onClick={() => onSaveRoute(route.id)}>Remove</button></div>)}
        {!data.favorites.routes.length && <Empty title="No saved routes" copy="Save a route from the Routes page." />}
      </Card>
    </div>
  </div>
}

function Notifications({ data }: { data: StudentData }) {
  return <div className="page-stack">
    <PageHeader eyebrow="CAMPUS SERVICE UPDATES" title="Notifications." description="Announcements, route delays, and service changes from campus transport." />
    {data.settings?.announcement && <div className="service-banner"><span><BellRing size={17} /></span><div><strong>Campus-wide notice</strong><p>{data.settings.announcement}</p></div></div>}
    <Card><CardHeading title="Recent updates" subtitle={`${data.notifications.length} published updates`} />
      {data.notifications.map((notice) => <article className="notification-card" key={notice._id}><span className={`notice-icon notice-icon--${notice.type}`}><BellRing size={16} /></span><div className="notification-copy"><div><strong>{notice.title}</strong><Badge className={`badge--${notice.type}`}>{notice.type}</Badge></div><p>{notice.message}</p><small>{notice.route ? `${notice.route.code} · ${notice.route.name} · ` : ''}{formatDate(notice.createdAt)} at {formatTime(notice.createdAt)}</small></div></article>)}
      {!data.notifications.length && !data.settings?.announcement && <Empty title="No service updates" copy="New campus announcements and route changes will show up here." />}
    </Card>
  </div>
}

function ReportIssue({ data, busy, onSubmit }: { data: StudentData; busy: boolean; onSubmit: (input: { type: Report['type']; message: string; routeId?: string; stopId?: string }) => void }) {
  const [type, setType] = useState<Report['type']>('crowding')
  const [message, setMessage] = useState('')
  const [routeId, setRouteId] = useState('')
  const [stopId, setStopId] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit({ type, message: message.trim(), ...(routeId ? { routeId } : {}), ...(stopId ? { stopId } : {}) })
    setMessage('')
  }
  return <div className="page-stack">
    <PageHeader eyebrow="RIDER FEEDBACK" title="Report an issue." description="Tell campus transport about crowding, delays, or another service concern." />
    <div className="report-layout"><Card><CardHeading title="What happened?" subtitle="Reports are shared with the campus transport team." />
      <form className="form-grid" onSubmit={submit}>
        <Field label="Issue type"><select value={type} onChange={(event) => setType(event.target.value as Report['type'])}><option value="crowding">Overcrowding</option><option value="delay">Shuttle delay</option><option value="other">Other issue</option></select></Field>
        <div className="form-grid form-grid--two"><Field label="Route (optional)"><select value={routeId} onChange={(event) => setRouteId(event.target.value)}><option value="">Select a route</option>{data.routes.map((route) => <option value={route.id} key={route.id}>{route.code} · {route.name}</option>)}</select></Field><Field label="Stop (optional)"><select value={stopId} onChange={(event) => setStopId(event.target.value)}><option value="">Select a stop</option>{data.stops.map((stop) => <option value={stop.id} key={stop.id}>{stop.name}</option>)}</select></Field></div>
        <Field label="Details"><textarea required minLength={3} maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe what you observed. Please do not include sensitive personal information." /><small className="field-hint">{message.length}/500 characters</small></Field>
        <div className="form-footer"><span><ShieldCheck size={15} /> Only the transport team can review report details.</span><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Submit report'} <ArrowRight size={15} /></Button></div>
      </form>
    </Card>
      <Card><CardHeading title="Your reports" subtitle={`${data.reports.length} recent submissions`} />
        {data.reports.map((report) => <article className="report-history" key={report._id}><span className="report-history-icon"><Flag size={15} /></span><div><strong>{report.type === 'crowding' ? 'Crowding report' : report.type === 'delay' ? 'Delay report' : 'Other report'}</strong><p>{report.message}</p><small>{report.route?.code ?? 'Campus'}{report.stop ? ` · ${report.stop.name}` : ''} · {formatDate(report.createdAt)}</small></div><Badge className={`badge--${report.status}`}>{report.status}</Badge></article>)}
        {!data.reports.length && <Empty title="No reports submitted" copy="Reports you send will appear here with their latest status." />}
      </Card>
    </div>
  </div>
}

function Profile({ data, busy, onSave }: { data: StudentData; busy: boolean; onSave: (name: string, preferences: AuthUser['preferences']) => void }) {
  const [name, setName] = useState(data.user.name)
  const [arrivalAlerts, setArrivalAlerts] = useState(data.user.preferences.arrivalAlerts)
  const [announcements, setAnnouncements] = useState(data.user.preferences.announcements)
  return <div className="page-stack">
    <PageHeader eyebrow="YOUR ACCOUNT" title="Profile & preferences." description="Manage the details and campus updates linked to your account." />
    <div className="profile-layout"><Card><CardHeading title="Personal information" subtitle="Your account email is managed by campus sign-in." />
      <form className="form-grid" onSubmit={(event) => { event.preventDefault(); onSave(name.trim(), { arrivalAlerts, announcements }) }}>
        <Field label="Full name"><input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Email address"><input type="email" value={data.user.email} disabled /><small className="field-hint">Email address cannot be changed here.</small></Field>
        <div className="preference-setting"><span><strong>Arrival alerts</strong><small>Receive arrival-related service updates.</small></span><input type="checkbox" checked={arrivalAlerts} onChange={(event) => setArrivalAlerts(event.target.checked)} /></div>
        <div className="preference-setting"><span><strong>Campus announcements</strong><small>Receive notices about service changes.</small></span><input type="checkbox" checked={announcements} onChange={(event) => setAnnouncements(event.target.checked)} /></div>
        <div className="form-footer"><span>Changes are saved to your student account.</span><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save preferences'} <Check size={15} /></Button></div>
      </form>
    </Card>
      <Card className="security-card"><span className="security-icon"><ShieldCheck size={20} /></span><p className="eyebrow">ACCOUNT SECURITY</p><h2>Your session is protected.</h2><p>Shuttle Tracker uses an HttpOnly session cookie. Your session token is not stored in localStorage.</p><div className="security-status"><i /> Signed in as {data.user.role}</div><Link href="/dashboard/report" className="quiet-link">Need help? Contact campus transport <ArrowRight size={14} /></Link></Card>
    </div>
  </div>
}
