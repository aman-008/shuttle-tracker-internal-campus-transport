import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { AuthUser } from './auth'
import type { IconName } from './App'
import './Workspaces.css'
import {
  createNotification,
  createReport,
  createRoute,
  createSchedule,
  createStop,
  createVehicle,
  deleteRoute,
  deleteSchedule,
  deleteStop,
  deleteVehicle,
  getAdminOverview,
  getAdminReports,
  getAdminRoutes,
  getAdminSchedules,
  getAdminStops,
  getAdminUsers,
  getAdminVehicles,
  getAnalytics,
  updateAdminUser,
  updateCampusSettings,
  updateFavorites,
  updateReport,
  updateRoute,
  updateSchedule,
  updateStop,
  updateStudentProfile,
  updateVehicle,
  type AdminOverview,
  type AdminUser,
  type Analytics,
  type CampusSettings,
  type Notification,
  type Report,
  type Route,
  type Schedule,
  type Stop,
  type StudentData,
  type Vehicle,
} from './transit'

type Props = {
  page: string
  user: AuthUser
  data: StudentData
  onRefresh: () => Promise<void>
  onUserUpdate: (user: AuthUser) => void
  onNotify: (message: string) => void
  onLogout: () => void
  Icon: (props: { name: IconName; size?: number }) => ReactNode
}

type AdminProps = Pick<Props, 'page' | 'data' | 'onRefresh' | 'onNotify' | 'Icon'>

function Panel({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="workspace-panel"><div className="workspace-panel-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{action}</div>{children}</section>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="workspace-field">{label}{children}</label>
}

function SubmitButton({ children = 'Save changes' }: { children?: ReactNode }) {
  return <button className="primary-button workspace-submit" type="submit">{children}</button>
}

function WorkspacePage({ page, user, data, onRefresh, onUserUpdate, onNotify, onLogout, Icon }: Props) {
  if (user.role === 'admin') {
    return <AdminWorkspace page={page} data={data} onRefresh={onRefresh} onNotify={onNotify} Icon={Icon} />
  }
  return <StudentWorkspace page={page} user={user} data={data} onRefresh={onRefresh} onUserUpdate={onUserUpdate} onNotify={onNotify} onLogout={onLogout} Icon={Icon} />
}

function StudentWorkspace({ page, user, data, onRefresh, onUserUpdate, onNotify, onLogout, Icon }: Props) {
  const [busy, setBusy] = useState(false)
  const [reportType, setReportType] = useState<Report['type']>('crowding')
  const [reportMessage, setReportMessage] = useState('')
  const [selectedRoute, setSelectedRoute] = useState('')
  const [selectedStop, setSelectedStop] = useState('')
  const [name, setName] = useState(user.name)
  const [preferences, setPreferences] = useState(user.preferences)
  const [departureFilter, setDepartureFilter] = useState('')

  const perform = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await action()
      await onRefresh()
      onNotify(success)
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'The request could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  if (page === 'live') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="LIVE FLEET MONITORING" title="Track your ride" description="See vehicles currently serving routes across campus." />
    <FleetMap vehicles={data.vehicles} routes={data.routes} />
    <Panel title="Vehicles on campus" eyebrow="LAST POSITION UPDATE">
      <div className="workspace-list">{data.vehicles.map((vehicle) => <div className="workspace-list-row" key={vehicle.id}><span className="workspace-vehicle-icon"><Icon name="bus" size={17} /></span><div className="workspace-grow"><strong>{vehicle.name}</strong><small>{vehicle.code} · {vehicle.route?.name ?? 'Unassigned'}</small></div><StatusTag value={vehicle.status.replace('_', ' ')} /><span className="workspace-muted">{vehicle.occupied}/{vehicle.capacity} riders</span></div>)}</div>
    </Panel>
  </div>

  if (page === 'routes') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="CAMPUS ROUTES" title="Routes & stops" description="Browse available campus shuttle routes and pickup points." />
    {data.routes.map((route) => <Panel key={route.id} title={route.name} eyebrow={`${route.code} · EVERY ${route.frequencyMinutes} MIN`} action={<button className="workspace-star" aria-label="Toggle favorite route" onClick={() => {
      const current = data.favorites.routes.map((item) => item.id)
      const next = current.includes(route.id) ? current.filter((id) => id !== route.id) : [...current, route.id]
      void perform(() => updateFavorites(data.favorites.stops.map((stop) => stop.id), next), 'Route favorites updated')
    }}>{data.favorites.routes.some((item) => item.id === route.id) ? '★' : '☆'}</button>}>
      <div className="workspace-route-stops">{route.stops.map((stop, index) => <span key={stop}><i style={{ backgroundColor: route.color }} />{stop}{index < route.stops.length - 1 && <b />}</span>)}</div>
      <div className="workspace-route-meta"><span><Icon name="clock" size={14} /> First shuttle {route.firstTrip}</span><span>Last shuttle {route.lastTrip}</span><span>{route.stops.length} stops</span></div>
    </Panel>)}
  </div>

  if (page === 'timetable') {
    const schedules = data.schedules.filter((schedule) => !departureFilter || schedule.route?.id === departureFilter)
    return <div className="workspace-content">
      <WorkspaceHeading eyebrow="PLAN AHEAD" title="Timetable" description="Scheduled shuttle departures and service days." />
      <div className="workspace-toolbar"><label className="workspace-field">Filter by route<select value={departureFilter} onChange={(event) => setDepartureFilter(event.target.value)}><option value="">All routes</option>{data.routes.map((route) => <option value={route.id} key={route.id}>{route.code} · {route.name}</option>)}</select></label><span className="result-count">{schedules.length} departures</span></div>
      <Panel title="Upcoming departures" eyebrow="CAMPUS SHUTTLE SCHEDULE">
        <div className="workspace-table"><div className="workspace-table-head"><span>DEPARTURE</span><span>ROUTE</span><span>DIRECTION</span><span>SERVICE DAYS</span></div>{schedules.map((schedule) => <div className="workspace-table-row" key={schedule.id}><strong>{schedule.departureTime}</strong><span>{schedule.route?.code} · {schedule.route?.name}</span><span>{schedule.direction}</span><span>{schedule.days.join(', ')}</span></div>)}</div>
        {!schedules.length && <Empty>No departures scheduled for this route yet.</Empty>}
      </Panel>
    </div>
  }

  if (page === 'favorites') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="YOUR PERSONAL SHORTCUTS" title="Favourites" description="Keep your regular stops and routes close at hand." />
    <div className="workspace-two-col"><Panel title="Saved stops" eyebrow={`${data.favorites.stops.length} FAVOURITES`}>
      {data.favorites.stops.map((stop) => <div className="workspace-list-row" key={stop.id}><span className="context-pin"><Icon name="pin" size={15} /></span><div className="workspace-grow"><strong>{stop.name}</strong><small>{stop.description}</small></div><button className="workspace-remove" onClick={() => void perform(() => updateFavorites(data.favorites.stops.filter((item) => item.id !== stop.id).map((item) => item.id), data.favorites.routes.map((item) => item.id)), 'Stop removed from favourites')}>Remove</button></div>)}
      {!data.favorites.stops.length && <Empty>Save a stop from the Routes page to see it here.</Empty>}
    </Panel><Panel title="Saved routes" eyebrow={`${data.favorites.routes.length} FAVOURITES`}>
      {data.favorites.routes.map((route) => <div className="workspace-list-row" key={route.id}><span className="route-color" style={{ backgroundColor: route.color }} /><div className="workspace-grow"><strong>{route.name}</strong><small>{route.code} · {route.stops.length} stops</small></div><button className="workspace-remove" onClick={() => void perform(() => updateFavorites(data.favorites.stops.map((item) => item.id), data.favorites.routes.filter((item) => item.id !== route.id).map((item) => item.id)), 'Route removed from favourites')}>Remove</button></div>)}
      {!data.favorites.routes.length && <Empty>Save a route from the Routes page to see it here.</Empty>}
    </Panel></div>
    <Panel title="Find a favourite" eyebrow="QUICK SAVE">{data.stops.map((stop) => {
      const isFavorite = data.favorites.stops.some((item) => item.id === stop.id)
      return <button className="workspace-save-row" key={stop.id} onClick={() => void perform(() => updateFavorites(isFavorite ? data.favorites.stops.filter((item) => item.id !== stop.id).map((item) => item.id) : [...data.favorites.stops.map((item) => item.id), stop.id], data.favorites.routes.map((item) => item.id)), isFavorite ? 'Stop removed from favourites' : 'Stop saved to favourites')}><Icon name="pin" size={15} /><span>{stop.name}</span><strong>{isFavorite ? 'Saved ★' : 'Save +'}</strong></button>
    })}</Panel>
  </div>

  if (page === 'notifications') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="CAMPUS SERVICE UPDATES" title="Notifications" description="Announcements, service changes and route delays." />
    {data.settings?.announcement && <div className="workspace-announcement"><Icon name="alert" size={18} /><div><strong>Campus notice</strong><p>{data.settings.announcement}</p></div></div>}
    {data.notifications.map((notice) => <NotificationCard key={notice._id} notice={notice} />)}
    {!data.notifications.length && !data.settings?.announcement && <Empty>No announcements yet. Check back for service updates.</Empty>}
  </div>

  if (page === 'report') return <div className="workspace-content workspace-content--student">
    <WorkspaceHeading eyebrow="HELP US KEEP THINGS MOVING" title="Report an issue" description="Let the campus transport team know what is happening." />
    <div className="workspace-report-layout">
      <Panel title="Tell us what happened" eyebrow="RIDER FEEDBACK">
        <form className="workspace-form workspace-report-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          void perform(async () => {
            await createReport({ type: reportType, message: reportMessage, ...(selectedRoute ? { routeId: selectedRoute } : {}), ...(selectedStop ? { stopId: selectedStop } : {}) })
            setReportMessage('')
          }, 'Your report has been sent to campus transport')
        }}>
          <div className="workspace-report-step"><span>01</span><div><strong>Choose an issue</strong><small>Select the option that best describes it.</small></div></div>
          <div className="workspace-choice-grid">{([
            { type: 'crowding', title: 'Crowding', detail: 'The vehicle is too full.', icon: 'users' },
            { type: 'delay', title: 'Delay', detail: 'A shuttle is running late.', icon: 'clock' },
            { type: 'other', title: 'Something else', detail: 'Share another concern.', icon: 'flag' },
          ] as const).map(({ type, title, detail, icon }) => <button type="button" aria-pressed={reportType === type} className={`workspace-choice ${reportType === type ? 'workspace-choice--selected' : ''}`} onClick={() => setReportType(type)} key={type}><span className="workspace-choice-icon"><Icon name={icon} size={18} /></span><span className="workspace-choice-copy"><strong>{title}</strong><small>{detail}</small></span><i>{reportType === type ? '✓' : ''}</i></button>)}</div>
          <div className="workspace-report-step"><span>02</span><div><strong>Add a location</strong><small>Optional, but it helps the team respond faster.</small></div></div>
          <div className="workspace-report-fields">
            <Field label="Route"><select value={selectedRoute} onChange={(event) => setSelectedRoute(event.target.value)}><option value="">Select a route (optional)</option>{data.routes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.name}</option>)}</select></Field>
            <Field label="Stop"><select value={selectedStop} onChange={(event) => setSelectedStop(event.target.value)}><option value="">Select a stop (optional)</option>{data.stops.map((stop) => <option key={stop.id} value={stop.id}>{stop.name}</option>)}</select></Field>
          </div>
          <div className="workspace-report-step"><span>03</span><div><strong>Describe the issue</strong><small>Please avoid including sensitive personal information.</small></div></div>
          <Field label="What should the transport team know?"><textarea required minLength={3} maxLength={500} value={reportMessage} onChange={(event) => setReportMessage(event.target.value)} placeholder="For example: The 8:15 shuttle is very crowded at the Library stop." /><small className="workspace-character-count">{reportMessage.length}/500 characters</small></Field>
          <div className="workspace-report-submit"><span><Icon name="shield" size={16} /> Shared securely with campus transport</span><SubmitButton>{busy ? 'Sending…' : 'Submit report'} <Icon name="arrow" size={14} /></SubmitButton></div>
        </form>
      </Panel>
      <aside className="workspace-report-aside">
        <section className="workspace-report-tip"><span className="workspace-report-tip-icon"><Icon name="zap" size={18} /></span><p className="eyebrow">YOUR FEEDBACK MATTERS</p><h2>A better ride starts with a report.</h2><p>Reports go to the campus transport team so they can spot issues and respond. Please share only what you observed.</p><div><Icon name="shield" size={15} /> Only the transport team can review report details.</div></section>
        <Panel title="Your recent reports" eyebrow={`${data.reports.length} SUBMITTED`}>
          {data.reports.length ? <div className="workspace-report-history">{data.reports.map((report) => <article className="workspace-report-history-item" key={report._id}><span className={`workspace-report-history-icon workspace-report-history-icon--${report.type}`}><Icon name={report.type === 'crowding' ? 'users' : report.type === 'delay' ? 'clock' : 'flag'} size={15} /></span><div className="workspace-report-history-copy"><strong>{report.type === 'other' ? 'Other issue' : report.type[0].toUpperCase() + report.type.slice(1)}</strong><p>{report.message}</p><small>{report.route?.code ?? 'Campus'}{report.stop ? ` · ${report.stop.name}` : ''} · {new Date(report.createdAt).toLocaleDateString()}</small></div><StatusTag value={report.status} /></article>)}</div> : <div className="workspace-report-empty"><span><Icon name="check" size={19} /></span><strong>All quiet so far</strong><p>Reports you submit will appear here with their latest status.</p></div>}
        </Panel>
      </aside>
    </div>
  </div>

  if (page === 'profile') return <div className="workspace-content workspace-content--student">
    <WorkspaceHeading eyebrow="YOUR ACCOUNT" title="Profile & settings" description="Update your contact details and notification preferences." />
    <section className="workspace-profile-banner">
      <div className="workspace-profile-avatar">{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
      <div className="workspace-profile-intro"><span className="workspace-profile-role"><Icon name="shield" size={13} /> STUDENT ACCOUNT</span><h2>{user.name}</h2><p>{user.email}</p></div>
      <span className="workspace-profile-active"><i /> Account active</span>
    </section>
    <div className="workspace-profile-layout">
      <Panel title="Personal information" eyebrow="PROFILE DETAILS">
        <form className="workspace-form workspace-profile-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          void perform(async () => {
            const result = await updateStudentProfile({ name, preferences })
            onUserUpdate(result.user)
          }, 'Profile settings saved')
        }}>
          <div className="workspace-profile-section-note"><span className="workspace-profile-section-icon"><Icon name="users" size={17} /></span><span><strong>About you</strong><small>These details personalize your campus account.</small></span></div>
          <Field label="Full name"><input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Your full name" /></Field>
          <Field label="Student email"><input value={user.email} disabled /><small className="workspace-field-hint">Email address is linked to your account and cannot be changed here.</small></Field>
          <div className="workspace-profile-section-note workspace-profile-section-note--spaced"><span className="workspace-profile-section-icon workspace-profile-section-icon--warm"><Icon name="bell" size={17} /></span><span><strong>Notification preferences</strong><small>Choose the service updates you want to receive.</small></span></div>
          <PreferenceToggle label="Arrival alerts" description="Get updates about arrivals for your regular trips." checked={preferences.arrivalAlerts} onChange={(checked) => setPreferences({ ...preferences, arrivalAlerts: checked })} />
          <PreferenceToggle label="Campus announcements" description="Stay informed about transport news and service changes." checked={preferences.announcements} onChange={(checked) => setPreferences({ ...preferences, announcements: checked })} />
          <div className="workspace-profile-save"><span>Your changes are saved to your account.</span><SubmitButton>{busy ? 'Saving…' : 'Save changes'} <Icon name="check" size={14} /></SubmitButton></div>
        </form>
      </Panel>
      <aside className="workspace-profile-aside">
        <section className="workspace-profile-security"><span className="workspace-profile-security-icon"><Icon name="shield" size={19} /></span><p className="eyebrow">ACCOUNT SECURITY</p><h2>Your account, protected.</h2><p>Your password is never shown here. Your signed-in session is protected with a secure, HttpOnly cookie.</p><div><i /> Secure session active</div></section>
        <Panel title="Signed-in session" eyebrow="THIS DEVICE"><div className="workspace-session-card"><span className="workspace-session-icon"><Icon name="check" size={16} /></span><div><strong>{user.email}</strong><small>Currently signed in</small></div></div><button className="workspace-signout-button" onClick={onLogout}><Icon name="logout" size={15} /> Sign out of this account</button></Panel>
      </aside>
    </div>
  </div>

  return null
}

function AdminWorkspace({ page, data, onRefresh, onNotify, Icon }: AdminProps) {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [routes, setRoutes] = useState<Route[]>([])
  const [stops, setStops] = useState<Stop[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [settings, setSettings] = useState<CampusSettings>(data.settings ?? {
    campusName: 'Lovely Professional University', serviceStart: '07:00', serviceEnd: '22:00', serviceDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], announcement: '',
  })
  const [busy, setBusy] = useState(false)
  const [scheduleRoute, setScheduleRoute] = useState('')
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [scheduleDirection, setScheduleDirection] = useState('Outbound')
  const [scheduleDays, setScheduleDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  const [scheduleFilter, setScheduleFilter] = useState('')
  const [editingScheduleId, setEditingScheduleId] = useState('')
  const [scheduleEdit, setScheduleEdit] = useState({ routeId: '', departureTime: '', direction: '', days: [] as string[] })
  const [editingRouteId, setEditingRouteId] = useState('')
  const [routeEdit, setRouteEdit] = useState({ name: '', frequencyMinutes: '', firstTrip: '', lastTrip: '', stopIds: [] as string[] })
  const [routeSearch, setRouteSearch] = useState('')
  const [stopSearch, setStopSearch] = useState('')
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [editingStopId, setEditingStopId] = useState('')
  const [stopEdit, setStopEdit] = useState({ code: '', name: '', description: '' })
  const [userSearch, setUserSearch] = useState('')
  const [userFilter, setUserFilter] = useState<'all' | 'student' | 'admin' | 'active' | 'disabled'>('all')
  const [occupancyDrafts, setOccupancyDrafts] = useState<Record<string, string>>({})
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementMessage, setAnnouncementMessage] = useState('')
  const [routeForm, setRouteForm] = useState({ code: '', name: '', color: '#237f72', frequencyMinutes: '12', firstTrip: '07:00', lastTrip: '22:00', stopIds: [] as string[] })
  const [stopForm, setStopForm] = useState({ code: '', name: '', description: '' })
  const [vehicleForm, setVehicleForm] = useState({ code: '', name: '', capacity: '20', routeId: '' })

  const load = useCallback(async () => {
    if (page === 'overview') setOverview(await getAdminOverview())
    if (page === 'routes-admin') setRoutes(await getAdminRoutes())
    if (page === 'stops-admin') setStops(await getAdminStops())
    if (page === 'vehicles-admin' || page === 'live') setVehicles(await getAdminVehicles())
    if (page === 'schedules-admin' || page === 'timetable') setSchedules(await getAdminSchedules())
    if (page === 'reports-admin') setReports(await getAdminReports())
    if (page === 'users-admin') setUsers(await getAdminUsers())
    if (page === 'analytics') setAnalytics(await getAnalytics())
    if (page === 'settings-admin' && data.settings) setSettings(data.settings)
  }, [data.settings, page])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      load().catch((error: unknown) => onNotify(error instanceof Error ? error.message : 'Could not load this admin page.'))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [load, onNotify])

  const perform = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true)
    try {
      await action()
      await Promise.all([load(), onRefresh()])
      onNotify(success)
    } catch (error) {
      onNotify(error instanceof Error ? error.message : 'The request could not be completed.')
    } finally {
      setBusy(false)
    }
  }
  const toggleRouteStop = (id: string) => setRouteForm((form) => ({ ...form, stopIds: form.stopIds.includes(id) ? form.stopIds.filter((stopId) => stopId !== id) : [...form.stopIds, id] }))

  if (page === 'overview') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="ADMIN OPERATIONS" title="Transport overview" description="Campus service health, active fleet and rider reports." />
    <div className="workspace-stat-grid">{([
      { label: 'Total students', value: overview?.students ?? '—', icon: 'users' },
      { label: 'Active shuttles', value: overview?.activeShuttles ?? '—', icon: 'bus' },
      { label: 'Active routes', value: overview?.routes ?? '—', icon: 'route' },
      { label: 'Open delays', value: overview?.openDelays ?? '—', icon: 'clock' },
    ] satisfies { label: string; value: string | number; icon: IconName }[]).map(({ label, value, icon }) => <div className="workspace-stat" key={label}><span className="stat-icon stat-icon--green"><Icon name={icon} size={19} /></span><span>{label}</span><strong>{value}</strong></div>)}</div>
    <Panel title="System status" eyebrow="SERVICE HEALTH"><div className="workspace-list-row"><span className="live-dot" /><div className="workspace-grow"><strong>{overview?.systemStatus ?? 'Checking status…'}</strong><small>MongoDB and transport API</small></div><span className="workspace-muted">{overview?.openReports ?? 0} open rider reports</span></div></Panel>
    <FleetMap vehicles={data.vehicles} routes={data.routes} />
  </div>

  if (page === 'live') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="LIVE FLEET MONITORING" title="Live fleet monitoring" description="Monitor vehicle assignment, availability, capacity and latest reported positions." />
    <FleetMap vehicles={vehicles} routes={data.routes} />
    <Panel title="Campus fleet" eyebrow={`${vehicles.filter((vehicle) => vehicle.status === 'in_service').length} VEHICLES IN SERVICE`}><div className="workspace-list">{vehicles.map((vehicle) => <div className="workspace-list-row" key={vehicle.id}><span className="workspace-vehicle-icon"><Icon name="bus" size={17} /></span><div className="workspace-grow"><strong>{vehicle.name} · {vehicle.code}</strong><small>{vehicle.route?.name ?? 'Unassigned'} · {vehicle.location.lat.toFixed(3)}, {vehicle.location.lng.toFixed(3)}</small></div><StatusTag value={vehicle.status.replace('_', ' ')} /><span className="workspace-muted">{vehicle.occupied}/{vehicle.capacity}</span></div>)}</div></Panel>
  </div>

  if (page === 'routes-admin') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="NETWORK DESIGN" title="Route management" description="Create and maintain route IDs, stops, schedules and service status." />
    <div className="workspace-admin-metrics">
      <div><span className="workspace-admin-metric-icon"><Icon name="route" size={17} /></span><span><small>Routes configured</small><strong>{routes.length}</strong></span></div>
      <div><span className="workspace-admin-metric-icon workspace-admin-metric-icon--orange"><Icon name="clock" size={17} /></span><span><small>Active network</small><strong>{routes.filter((route) => route.status === 'active').length} running</strong></span></div>
      <div><span className="workspace-admin-metric-icon workspace-admin-metric-icon--violet"><Icon name="pin" size={17} /></span><span><small>Campus stops</small><strong>{data.stops.length}</strong></span></div>
    </div>
    <Panel title="Build a route" eyebrow="NEW ROUTE"><form className="workspace-form workspace-form-grid workspace-admin-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void perform(() => createRoute({ ...routeForm, frequencyMinutes: Number(routeForm.frequencyMinutes) }), 'Route created')
      setRouteForm({ code: '', name: '', color: '#237f72', frequencyMinutes: '12', firstTrip: '07:00', lastTrip: '22:00', stopIds: [] })
    }}>
      <Field label="Route code"><input required minLength={2} maxLength={12} value={routeForm.code} onChange={(event) => setRouteForm({ ...routeForm, code: event.target.value.toUpperCase() })} placeholder="R4" /></Field>
      <Field label="Route name"><input required value={routeForm.name} onChange={(event) => setRouteForm({ ...routeForm, name: event.target.value })} placeholder="East Campus Loop" /></Field>
      <Field label="Route color"><span className="workspace-color-field"><input type="color" value={routeForm.color} onChange={(event) => setRouteForm({ ...routeForm, color: event.target.value })} /><span>{routeForm.color.toUpperCase()}</span></span></Field>
      <Field label="Frequency (minutes)"><input type="number" min="1" max="180" required value={routeForm.frequencyMinutes} onChange={(event) => setRouteForm({ ...routeForm, frequencyMinutes: event.target.value })} /></Field>
      <Field label="First trip"><input type="time" value={routeForm.firstTrip} onChange={(event) => setRouteForm({ ...routeForm, firstTrip: event.target.value })} /></Field>
      <Field label="Last trip"><input type="time" value={routeForm.lastTrip} onChange={(event) => setRouteForm({ ...routeForm, lastTrip: event.target.value })} /></Field>
      <div className="workspace-checklist workspace-admin-stop-picker"><span>Choose stops <small>{routeForm.stopIds.length} selected</small></span>{data.stops.map((stop) => <label key={stop.id}><input type="checkbox" checked={routeForm.stopIds.includes(stop.id)} onChange={() => toggleRouteStop(stop.id)} />{stop.name}</label>)}</div>
      <div className="workspace-admin-form-footer"><span>Route details can be changed after creation.</span><SubmitButton>{busy ? 'Saving…' : <><Icon name="plus" size={15} /> Create route</>}</SubmitButton></div>
    </form></Panel>
    <Panel title="Your routes" eyebrow={`${routes.length} ROUTES`} action={<label className="workspace-admin-search"><Icon name="search" size={15} /><input value={routeSearch} onChange={(event) => setRouteSearch(event.target.value)} placeholder="Find a route" /></label>}>
      <div className="workspace-admin-card-list">{routes.filter((route) => `${route.code} ${route.name} ${route.stops.join(' ')}`.toLowerCase().includes(routeSearch.toLowerCase())).map((route) => <article className="workspace-admin-card" key={route.id}>
        <div className="workspace-admin-card-main"><span className="workspace-admin-card-symbol" style={{ '--admin-accent': route.color } as React.CSSProperties}><Icon name="route" size={17} /></span><div className="workspace-admin-card-copy"><div><strong>{route.name}</strong><span className="workspace-route-code">{route.code}</span></div><p>{route.stops.length ? route.stops.join(' → ') : 'No stops assigned'} · Every {route.frequencyMinutes} min</p></div><StatusTag value={route.status} /></div>
        <div className="workspace-admin-card-meta"><span><Icon name="clock" size={14} /> {route.firstTrip}–{route.lastTrip}</span><span><Icon name="pin" size={14} /> {route.stops.length} stops</span></div>
        {editingRouteId === route.id ? <form className="workspace-inline-edit" onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          void perform(() => updateRoute(route.id, { name: routeEdit.name, frequencyMinutes: Number(routeEdit.frequencyMinutes), firstTrip: routeEdit.firstTrip, lastTrip: routeEdit.lastTrip, stopIds: routeEdit.stopIds }), 'Route updated')
          setEditingRouteId('')
        }}>
          <div className="workspace-inline-fields"><Field label="Route name"><input required value={routeEdit.name} onChange={(event) => setRouteEdit({ ...routeEdit, name: event.target.value })} /></Field><Field label="Frequency (min)"><input type="number" min="1" max="180" value={routeEdit.frequencyMinutes} onChange={(event) => setRouteEdit({ ...routeEdit, frequencyMinutes: event.target.value })} /></Field><Field label="First trip"><input type="time" value={routeEdit.firstTrip} onChange={(event) => setRouteEdit({ ...routeEdit, firstTrip: event.target.value })} /></Field><Field label="Last trip"><input type="time" value={routeEdit.lastTrip} onChange={(event) => setRouteEdit({ ...routeEdit, lastTrip: event.target.value })} /></Field></div>
          <div className="workspace-admin-stop-picker"><span>Route stops <small>{routeEdit.stopIds.length} selected</small></span>{data.stops.map((stop) => <label key={stop.id}><input type="checkbox" checked={routeEdit.stopIds.includes(stop.id)} onChange={() => setRouteEdit((current) => ({ ...current, stopIds: current.stopIds.includes(stop.id) ? current.stopIds.filter((id) => id !== stop.id) : [...current.stopIds, stop.id] }))} />{stop.name}</label>)}</div>
          <div className="workspace-inline-actions"><button type="button" className="workspace-admin-action" onClick={() => setEditingRouteId('')}>Cancel</button><button className="workspace-admin-action workspace-admin-action--primary" disabled={busy}><Icon name="check" size={14} /> Save route</button></div>
        </form> : <div className="workspace-admin-card-actions"><button className="workspace-admin-action" onClick={() => {
          setEditingRouteId(route.id)
          setRouteEdit({ name: route.name, frequencyMinutes: String(route.frequencyMinutes), firstTrip: route.firstTrip, lastTrip: route.lastTrip, stopIds: [...route.stopIds] })
        }}><Icon name="edit" size={14} /> Edit route</button><button className="workspace-admin-action workspace-admin-action--danger" onClick={() => void perform(() => deleteRoute(route.id), `Route ${route.code} deleted`)}><Icon name="close" size={14} /> Delete</button></div>}
      </article>)}</div>
      {!routes.filter((route) => `${route.code} ${route.name} ${route.stops.join(' ')}`.toLowerCase().includes(routeSearch.toLowerCase())).length && <Empty>No matching routes found.</Empty>}
    </Panel>
  </div>

  if (page === 'stops-admin') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="CAMPUS PICKUP LOCATIONS" title="Stop management" description="Manage pickup and drop-off stops used by the route network." />
    <div className="workspace-admin-metrics">
      <div><span className="workspace-admin-metric-icon workspace-admin-metric-icon--violet"><Icon name="pin" size={17} /></span><span><small>Total campus stops</small><strong>{stops.length}</strong></span></div>
      <div><span className="workspace-admin-metric-icon"><Icon name="check" size={17} /></span><span><small>Active pickup points</small><strong>{stops.filter((stop) => stop.status === 'active').length}</strong></span></div>
      <div><span className="workspace-admin-metric-icon workspace-admin-metric-icon--orange"><Icon name="route" size={17} /></span><span><small>Routes using stops</small><strong>{routes.length}</strong></span></div>
    </div>
    <Panel title="Add a pickup point" eyebrow="NEW STOP"><form className="workspace-form workspace-form-grid workspace-admin-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void perform(() => createStop(stopForm), 'Stop created')
      setStopForm({ code: '', name: '', description: '' })
    }}><Field label="Stop code"><input required minLength={2} maxLength={12} value={stopForm.code} onChange={(event) => setStopForm({ ...stopForm, code: event.target.value.toUpperCase() })} placeholder="EAST-GATE" /></Field><Field label="Stop name"><input required value={stopForm.name} onChange={(event) => setStopForm({ ...stopForm, name: event.target.value })} placeholder="East Gate" /></Field><Field label="Description"><input value={stopForm.description} onChange={(event) => setStopForm({ ...stopForm, description: event.target.value })} placeholder="Pickup point near the east entrance" /></Field><div className="workspace-admin-form-footer"><span>New stops can be added to routes after creation.</span><SubmitButton>{busy ? 'Saving…' : <><Icon name="plus" size={15} /> Add stop</>}</SubmitButton></div></form></Panel>
    <Panel title="Campus pickup points" eyebrow={`${stops.length} LOCATIONS`} action={<label className="workspace-admin-search"><Icon name="search" size={15} /><input value={stopSearch} onChange={(event) => setStopSearch(event.target.value)} placeholder="Find a stop" /></label>}>
      <div className="workspace-admin-card-list">{stops.filter((stop) => `${stop.name} ${stop.code} ${stop.description}`.toLowerCase().includes(stopSearch.toLowerCase())).map((stop) => <article className="workspace-admin-card" key={stop.id}>
        <div className="workspace-admin-card-main"><span className="workspace-admin-card-symbol workspace-admin-card-symbol--violet"><Icon name="pin" size={17} /></span><div className="workspace-admin-card-copy"><div><strong>{stop.name}</strong><span className="workspace-route-code">{stop.code}</span></div><p>{stop.description || 'Campus pickup and drop-off point'}</p></div><label className="workspace-admin-status-select"><span className={`workspace-status ${stop.status === 'active' ? '' : 'workspace-status--inactive'}`}>{stop.status}</span><select aria-label={`${stop.name} status`} value={stop.status} onChange={(event) => void perform(() => updateStop(stop.id, { status: event.target.value }), `Stop ${stop.status === 'active' ? 'deactivated' : 'activated'}`)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
        {editingStopId === stop.id ? <form className="workspace-inline-edit" onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          void perform(() => updateStop(stop.id, stopEdit), 'Stop updated')
          setEditingStopId('')
        }}><div className="workspace-inline-fields workspace-inline-fields--stop"><Field label="Stop code"><input required value={stopEdit.code} onChange={(event) => setStopEdit({ ...stopEdit, code: event.target.value.toUpperCase() })} /></Field><Field label="Stop name"><input required value={stopEdit.name} onChange={(event) => setStopEdit({ ...stopEdit, name: event.target.value })} /></Field><Field label="Description"><input value={stopEdit.description} onChange={(event) => setStopEdit({ ...stopEdit, description: event.target.value })} /></Field></div><div className="workspace-inline-actions"><button type="button" className="workspace-admin-action" onClick={() => setEditingStopId('')}>Cancel</button><button className="workspace-admin-action workspace-admin-action--primary" disabled={busy}><Icon name="check" size={14} /> Save stop</button></div></form> : <div className="workspace-admin-card-actions"><button className="workspace-admin-action" onClick={() => {
          setEditingStopId(stop.id)
          setStopEdit({ code: stop.code, name: stop.name, description: stop.description })
        }}><Icon name="edit" size={14} /> Edit stop</button><button className="workspace-admin-action workspace-admin-action--danger" onClick={() => void perform(() => deleteStop(stop.id), `Stop ${stop.name} deleted`)}><Icon name="close" size={14} /> Delete</button></div>}
      </article>)}</div>
      {!stops.filter((stop) => `${stop.name} ${stop.code} ${stop.description}`.toLowerCase().includes(stopSearch.toLowerCase())).length && <Empty>No matching stops found.</Empty>}
    </Panel>
  </div>

  if (page === 'vehicles-admin') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="FLEET OPERATIONS" title="Vehicle management" description="Add vehicles and manage route assignment, seat capacity and availability." />
    <div className="workspace-admin-metrics">
      <div><span className="workspace-admin-metric-icon"><Icon name="bus" size={17} /></span><span><small>Vehicles registered</small><strong>{vehicles.length}</strong></span></div>
      <div><span className="workspace-admin-metric-icon"><Icon name="zap" size={17} /></span><span><small>In service</small><strong>{vehicles.filter((vehicle) => vehicle.status === 'in_service').length}</strong></span></div>
      <div><span className="workspace-admin-metric-icon workspace-admin-metric-icon--orange"><Icon name="users" size={17} /></span><span><small>Seats currently occupied</small><strong>{vehicles.reduce((total, vehicle) => total + vehicle.occupied, 0)}</strong></span></div>
    </div>
    <Panel title="Add a fleet vehicle" eyebrow="NEW VEHICLE"><form className="workspace-form workspace-form-grid workspace-admin-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void perform(() => createVehicle({ ...vehicleForm, capacity: Number(vehicleForm.capacity), ...(vehicleForm.routeId ? { routeId: vehicleForm.routeId } : {}) }), 'Vehicle added')
      setVehicleForm({ code: '', name: '', capacity: '20', routeId: '' })
    }}><Field label="Vehicle ID"><input required value={vehicleForm.code} onChange={(event) => setVehicleForm({ ...vehicleForm, code: event.target.value.toUpperCase() })} placeholder="SH-08" /></Field><Field label="Display name"><input required value={vehicleForm.name} onChange={(event) => setVehicleForm({ ...vehicleForm, name: event.target.value })} placeholder="E-Shuttle 08" /></Field><Field label="Seat capacity"><input required type="number" min="1" max="100" value={vehicleForm.capacity} onChange={(event) => setVehicleForm({ ...vehicleForm, capacity: event.target.value })} /></Field><Field label="Route assignment"><select value={vehicleForm.routeId} onChange={(event) => setVehicleForm({ ...vehicleForm, routeId: event.target.value })}><option value="">No route assigned</option>{data.routes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.name}</option>)}</select></Field><div className="workspace-admin-form-footer"><span>Availability and occupancy can be updated below.</span><SubmitButton>{busy ? 'Saving…' : <><Icon name="plus" size={15} /> Add vehicle</>}</SubmitButton></div></form></Panel>
    <Panel title="Fleet overview" eyebrow={`${vehicles.length} REGISTERED VEHICLES`} action={<label className="workspace-admin-search"><Icon name="search" size={15} /><input value={vehicleSearch} onChange={(event) => setVehicleSearch(event.target.value)} placeholder="Find a vehicle" /></label>}>
      <div className="workspace-admin-card-list">{vehicles.filter((vehicle) => `${vehicle.name} ${vehicle.code} ${vehicle.route?.name ?? ''}`.toLowerCase().includes(vehicleSearch.toLowerCase())).map((vehicle) => <article className="workspace-admin-card" key={vehicle.id}>
        <div className="workspace-admin-card-main"><span className="workspace-admin-card-symbol"><Icon name="bus" size={17} /></span><div className="workspace-admin-card-copy"><div><strong>{vehicle.name}</strong><span className="workspace-route-code">{vehicle.code}</span></div><p>{vehicle.location.lat.toFixed(3)}, {vehicle.location.lng.toFixed(3)} · Updated {new Date(vehicle.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div><StatusTag value={vehicle.status.replace('_', ' ')} /></div>
        <div className="workspace-vehicle-controls">
          <Field label="Route assignment"><select aria-label={`${vehicle.name} route assignment`} value={vehicle.route?.id ?? ''} onChange={(event) => void perform(() => updateVehicle(vehicle.id, { routeId: event.target.value }), 'Vehicle route assignment updated')}><option value="">Unassigned</option>{data.routes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.name}</option>)}</select></Field>
          <Field label="Service status"><select aria-label={`${vehicle.name} availability`} value={vehicle.status} onChange={(event) => void perform(() => updateVehicle(vehicle.id, { status: event.target.value }), 'Vehicle availability updated')}><option value="in_service">In service</option><option value="available">Available</option><option value="maintenance">Maintenance</option></select></Field>
          <Field label={`Riders (${vehicle.capacity} seats)`}><span className="workspace-occupancy-control"><input aria-label={`${vehicle.name} current riders`} type="number" min="0" max={vehicle.capacity} value={occupancyDrafts[vehicle.id] ?? String(vehicle.occupied)} onChange={(event) => setOccupancyDrafts({ ...occupancyDrafts, [vehicle.id]: event.target.value })} /><button className="workspace-admin-action workspace-admin-action--primary" disabled={busy || Number(occupancyDrafts[vehicle.id] ?? vehicle.occupied) > vehicle.capacity || Number(occupancyDrafts[vehicle.id] ?? vehicle.occupied) < 0} onClick={() => void perform(() => updateVehicle(vehicle.id, { occupied: Number(occupancyDrafts[vehicle.id] ?? vehicle.occupied) }), 'Vehicle occupancy updated')}><Icon name="check" size={14} /> Save</button></span></Field>
        </div>
        <div className="workspace-occupancy-meter"><span><span>Capacity</span><strong>{vehicle.occupied} / {vehicle.capacity} seats</strong></span><i><b style={{ width: `${Math.min(100, Math.round(vehicle.occupied / vehicle.capacity * 100))}%` }} /></i></div>
        <div className="workspace-admin-card-actions"><button className="workspace-admin-action workspace-admin-action--danger" onClick={() => void perform(() => deleteVehicle(vehicle.id), `Vehicle ${vehicle.code} deleted`)}><Icon name="close" size={14} /> Remove vehicle</button></div>
      </article>)}</div>
      {!vehicles.filter((vehicle) => `${vehicle.name} ${vehicle.code} ${vehicle.route?.name ?? ''}`.toLowerCase().includes(vehicleSearch.toLowerCase())).length && <Empty>No matching vehicles found.</Empty>}
    </Panel>
  </div>

  if (page === 'schedules-admin') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="SERVICE PLANNING" title="Schedule management" description="Create and maintain departure times and service days." />
    <div className="workspace-admin-metrics">
      <div><span className="workspace-admin-metric-icon workspace-admin-metric-icon--orange"><Icon name="calendar" size={17} /></span><span><small>Scheduled departures</small><strong>{schedules.length}</strong></span></div>
      <div><span className="workspace-admin-metric-icon"><Icon name="route" size={17} /></span><span><small>Routes with service</small><strong>{new Set(schedules.map((schedule) => schedule.route?.id).filter(Boolean)).size}</strong></span></div>
      <div><span className="workspace-admin-metric-icon workspace-admin-metric-icon--violet"><Icon name="clock" size={17} /></span><span><small>First departure</small><strong>{schedules[0]?.departureTime ?? '—'}</strong></span></div>
    </div>
    <Panel title="Schedule a departure" eyebrow="NEW TIMETABLE ENTRY"><form className="workspace-form workspace-form-grid workspace-admin-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!scheduleRoute) return onNotify('Choose a route for this departure.')
      if (!scheduleDays.length) return onNotify('Select at least one service day.')
      void perform(() => createSchedule({ routeId: scheduleRoute, departureTime: scheduleTime, direction: scheduleDirection, days: scheduleDays }), 'Departure added to timetable')
    }}><Field label="Route"><select required value={scheduleRoute} onChange={(event) => setScheduleRoute(event.target.value)}><option value="">Choose a route</option>{data.routes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.name}</option>)}</select></Field><Field label="Departure time"><input type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} /></Field><Field label="Direction"><input required value={scheduleDirection} onChange={(event) => setScheduleDirection(event.target.value)} placeholder="Outbound" /></Field><div className="workspace-day-picker"><span>Service days <small>{scheduleDays.length} selected</small></span><div>{(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((day) => <button type="button" aria-pressed={scheduleDays.includes(day)} className={scheduleDays.includes(day) ? 'workspace-day-chip workspace-day-chip--selected' : 'workspace-day-chip'} key={day} onClick={() => setScheduleDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])}>{day}</button>)}</div></div><div className="workspace-admin-form-footer"><span>Choose the days this departure operates.</span><SubmitButton>{busy ? 'Saving…' : <><Icon name="plus" size={15} /> Add departure</>}</SubmitButton></div></form></Panel>
    <Panel title="Departure timetable" eyebrow={`${schedules.filter((schedule) => !scheduleFilter || schedule.route?.id === scheduleFilter).length} ENTRIES`} action={<label className="workspace-admin-search workspace-admin-route-filter"><Icon name="route" size={15} /><select aria-label="Filter timetable by route" value={scheduleFilter} onChange={(event) => setScheduleFilter(event.target.value)}><option value="">All routes</option>{data.routes.map((route) => <option key={route.id} value={route.id}>{route.code}</option>)}</select></label>}>
      <div className="workspace-admin-schedule-list">{schedules.filter((schedule) => !scheduleFilter || schedule.route?.id === scheduleFilter).map((schedule) => <article className="workspace-admin-schedule-card" key={schedule.id}>
        <div className="workspace-admin-schedule-time"><Icon name="clock" size={15} /><strong>{schedule.departureTime}</strong></div>
        <div className="workspace-admin-schedule-copy"><strong>{schedule.route?.code ?? 'Route'} · {schedule.route?.name ?? 'Unassigned'}</strong><p>{schedule.direction}</p><div className="workspace-admin-day-list">{schedule.days.map((day) => <span key={day}>{day}</span>)}</div></div>
        <div className="workspace-admin-card-actions"><button className="workspace-admin-action" onClick={() => {
          setEditingScheduleId(schedule.id)
          setScheduleEdit({ routeId: schedule.route?.id ?? '', departureTime: schedule.departureTime, direction: schedule.direction, days: [...schedule.days] })
        }}><Icon name="edit" size={14} /> Edit</button><button className="workspace-admin-action workspace-admin-action--danger" onClick={() => void perform(() => deleteSchedule(schedule.id), 'Departure deleted')}><Icon name="close" size={14} /> Delete</button></div>
        {editingScheduleId === schedule.id && <form className="workspace-inline-edit workspace-schedule-edit" onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault()
          if (!scheduleEdit.days.length) return onNotify('Select at least one service day.')
          void perform(() => updateSchedule(schedule.id, scheduleEdit), 'Departure updated')
          setEditingScheduleId('')
        }}><div className="workspace-inline-fields workspace-inline-fields--schedule"><Field label="Route"><select required value={scheduleEdit.routeId} onChange={(event) => setScheduleEdit({ ...scheduleEdit, routeId: event.target.value })}>{data.routes.map((route) => <option key={route.id} value={route.id}>{route.code} · {route.name}</option>)}</select></Field><Field label="Departure time"><input type="time" value={scheduleEdit.departureTime} onChange={(event) => setScheduleEdit({ ...scheduleEdit, departureTime: event.target.value })} /></Field><Field label="Direction"><input required value={scheduleEdit.direction} onChange={(event) => setScheduleEdit({ ...scheduleEdit, direction: event.target.value })} /></Field></div><div className="workspace-day-picker"><span>Service days</span><div>{(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).map((day) => <button type="button" aria-pressed={scheduleEdit.days.includes(day)} className={scheduleEdit.days.includes(day) ? 'workspace-day-chip workspace-day-chip--selected' : 'workspace-day-chip'} key={day} onClick={() => setScheduleEdit((current) => ({ ...current, days: current.days.includes(day) ? current.days.filter((item) => item !== day) : [...current.days, day] }))}>{day}</button>)}</div></div><div className="workspace-inline-actions"><button type="button" className="workspace-admin-action" onClick={() => setEditingScheduleId('')}>Cancel</button><button className="workspace-admin-action workspace-admin-action--primary" disabled={busy}><Icon name="check" size={14} /> Save schedule</button></div></form>}
      </article>)}</div>
      {!schedules.filter((schedule) => !scheduleFilter || schedule.route?.id === scheduleFilter).length && <Empty>No departures scheduled for this route yet.</Empty>}
    </Panel>
  </div>

  if (page === 'reports-admin') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="RIDER FEEDBACK" title="Reports & complaints" description="Review crowding, delay and other rider-submitted issues." />
    <div className="workspace-stat-grid"><div className="workspace-stat"><span>Open</span><strong>{reports.filter((report) => report.status === 'open').length}</strong></div><div className="workspace-stat"><span>Reviewed</span><strong>{reports.filter((report) => report.status === 'reviewed').length}</strong></div><div className="workspace-stat"><span>Resolved</span><strong>{reports.filter((report) => report.status === 'resolved').length}</strong></div></div>
    <Panel title="Rider reports" eyebrow={`${reports.length} RECENT REPORTS`}>{reports.map((report) => <div className="workspace-report" key={report._id}><span className="update-icon update-icon--orange"><Icon name={report.type === 'crowding' ? 'users' : report.type === 'delay' ? 'clock' : 'flag'} size={16} /></span><div className="workspace-grow"><strong>{report.type.toUpperCase()} · {report.message}</strong><p>{report.route?.name ?? 'No route'}{report.stop ? ` · ${report.stop.name}` : ''} · {report.user?.name ?? 'Student'} · {new Date(report.createdAt).toLocaleString()}</p></div><select aria-label={`Report status: ${report.message}`} value={report.status} onChange={(event) => void perform(() => updateReport(report._id, event.target.value as Report['status']), 'Report status updated')}><option value="open">Open</option><option value="reviewed">Reviewed</option><option value="resolved">Resolved</option></select></div>)}{!reports.length && <Empty>No student reports yet.</Empty>}</Panel>
  </div>

  if (page === 'notifications-admin') return <div className="workspace-content workspace-narrow">
    <WorkspaceHeading eyebrow="CAMPUS COMMUNICATIONS" title="Notifications" description="Send service announcements and route updates to students." />
    <Panel title="Send an announcement" eyebrow="NEW STUDENT NOTIFICATION"><form className="workspace-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void perform(() => createNotification({ title: announcementTitle, message: announcementMessage, type: 'announcement' }), 'Announcement sent to students')
      setAnnouncementTitle('')
      setAnnouncementMessage('')
    }}><Field label="Title"><input required minLength={3} maxLength={120} value={announcementTitle} onChange={(event) => setAnnouncementTitle(event.target.value)} /></Field><Field label="Message"><textarea required minLength={3} maxLength={1000} value={announcementMessage} onChange={(event) => setAnnouncementMessage(event.target.value)} /></Field><SubmitButton>{busy ? 'Sending…' : 'Send announcement'}</SubmitButton></form></Panel>
    <Panel title="Recent announcements" eyebrow="SENT TO STUDENTS">{data.notifications.map((notice) => <NotificationCard key={notice._id} notice={notice} />)}{!data.notifications.length && <Empty>No notifications have been sent yet.</Empty>}</Panel>
  </div>

  if (page === 'users-admin') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="ACCESS CONTROL" title="User management" description="Review student accounts and control administrator access." />
    <div className="workspace-admin-metrics">
      <div><span className="workspace-admin-metric-icon"><Icon name="users" size={17} /></span><span><small>Total accounts</small><strong>{users.length}</strong></span></div>
      <div><span className="workspace-admin-metric-icon"><Icon name="check" size={17} /></span><span><small>Active accounts</small><strong>{users.filter((account) => account.active).length}</strong></span></div>
      <div><span className="workspace-admin-metric-icon workspace-admin-metric-icon--violet"><Icon name="shield" size={17} /></span><span><small>Administrators</small><strong>{users.filter((account) => account.role === 'admin').length}</strong></span></div>
    </div>
    <Panel title="Campus accounts" eyebrow={`${users.length} ACCOUNTS`} action={<label className="workspace-admin-search"><Icon name="search" size={15} /><input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search name or email" /></label>}>
      <div className="workspace-user-filter-row"><span><Icon name="sliders" size={14} /> Filter accounts</span><div>{([
        ['all', 'All accounts'],
        ['student', 'Students'],
        ['admin', 'Admins'],
        ['active', 'Active'],
        ['disabled', 'Disabled'],
      ] as const).map(([value, label]) => <button key={value} aria-pressed={userFilter === value} className={userFilter === value ? 'workspace-user-filter workspace-user-filter--active' : 'workspace-user-filter'} onClick={() => setUserFilter(value)}>{label}</button>)}</div></div>
      <div className="workspace-admin-card-list">{users.filter((account) => {
        const matchesSearch = `${account.name} ${account.email}`.toLowerCase().includes(userSearch.toLowerCase())
        const matchesFilter = userFilter === 'all' || userFilter === account.role || (userFilter === 'active' && account.active) || (userFilter === 'disabled' && !account.active)
        return matchesSearch && matchesFilter
      }).map((account) => <article className={`workspace-admin-card workspace-user-card ${account.active ? '' : 'workspace-user-card--disabled'}`} key={account.id}>
        <div className="workspace-admin-card-main"><span className="workspace-user-avatar">{account.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><div className="workspace-admin-card-copy"><div><strong>{account.name}</strong><span className={`workspace-user-role workspace-user-role--${account.role}`}>{account.role === 'admin' ? <><Icon name="shield" size={11} /> Administrator</> : 'Student'}</span></div><p>{account.email}</p></div><StatusTag value={account.active ? 'active' : 'disabled'} /></div>
        <div className="workspace-admin-user-meta"><span><Icon name="calendar" size={13} /> Joined {new Date(account.createdAt).toLocaleDateString()}</span><span>{account.preferences.announcements ? 'Announcements on' : 'Announcements off'} · {account.preferences.arrivalAlerts ? 'Arrival alerts on' : 'Arrival alerts off'}</span></div>
        <div className="workspace-admin-user-controls"><Field label="Account role"><select aria-label={`Role for ${account.name}`} value={account.role} onChange={(event) => void perform(() => updateAdminUser(account.id, { role: event.target.value as AdminUser['role'] }), 'User role updated')}><option value="student">Student</option><option value="admin">Administrator</option></select></Field><button className={account.active ? 'workspace-admin-action workspace-admin-action--danger' : 'workspace-admin-action workspace-admin-action--primary'} onClick={() => void perform(() => updateAdminUser(account.id, { active: !account.active }), account.active ? 'Account disabled' : 'Account reactivated')}><Icon name={account.active ? 'close' : 'check'} size={14} /> {account.active ? 'Disable account' : 'Reactivate account'}</button></div>
      </article>)}</div>
      {!users.filter((account) => `${account.name} ${account.email}`.toLowerCase().includes(userSearch.toLowerCase()) && (userFilter === 'all' || userFilter === account.role || (userFilter === 'active' && account.active) || (userFilter === 'disabled' && !account.active))).length && <Empty>No accounts match these filters.</Empty>}
    </Panel>
  </div>

  if (page === 'analytics') return <div className="workspace-content">
    <WorkspaceHeading eyebrow="TRANSPORT INSIGHTS" title="Analytics" description="Vehicle utilization, popular stops and reported delay trends." />
    <div className="workspace-stat-grid"><div className="workspace-stat"><span>Fleet utilization</span><strong>{analytics?.utilizationPercent ?? 0}%</strong><div className="workspace-progress"><i style={{ width: `${analytics?.utilizationPercent ?? 0}%` }} /></div></div><div className="workspace-stat"><span>Vehicles tracked</span><strong>{analytics?.vehicles ?? 0}</strong></div><div className="workspace-stat"><span>Riders in vehicles</span><strong>{analytics?.occupancy.occupied ?? 0}/{analytics?.occupancy.capacity ?? 0}</strong></div></div>
    <div className="workspace-two-col"><Panel title="Popular stops" eyebrow="ROUTES SERVING EACH STOP">{analytics?.popularStops.map((stop) => <div className="workspace-list-row" key={stop.name}><span className="context-pin"><Icon name="pin" size={14} /></span><strong className="workspace-grow">{stop.name}</strong><span>{stop.routeCount} routes</span></div>)}{!analytics?.popularStops.length && <Empty>Route data will appear here as routes are configured.</Empty>}</Panel><Panel title="Reported delays" eyebrow="BY ROUTE">{analytics?.delaysByRoute.map((item) => <div className="workspace-list-row" key={item.route}><strong className="workspace-grow">{item.route}</strong><StatusTag value={`${item.count} reports`} /></div>)}{!analytics?.delaysByRoute.length && <Empty>No delays have been reported.</Empty>}</Panel></div>
  </div>

  if (page === 'settings-admin') return <div className="workspace-content workspace-narrow">
    <WorkspaceHeading eyebrow="CAMPUS OPERATIONS" title="Transport settings" description="Configure campus details, service hours and student-facing notices." />
    <Panel title="Campus service" eyebrow="SYSTEM SETTINGS"><form className="workspace-form" onSubmit={(event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void perform(async () => {
        const saved = await updateCampusSettings(settings)
        setSettings(saved)
      }, 'Transport settings saved')
    }}><Field label="Campus name"><input required value={settings.campusName} onChange={(event) => setSettings({ ...settings, campusName: event.target.value })} /></Field><div className="workspace-form-grid"><Field label="Service begins"><input type="time" value={settings.serviceStart} onChange={(event) => setSettings({ ...settings, serviceStart: event.target.value })} /></Field><Field label="Service ends"><input type="time" value={settings.serviceEnd} onChange={(event) => setSettings({ ...settings, serviceEnd: event.target.value })} /></Field></div><Field label="Campus-wide announcement"><textarea maxLength={1000} value={settings.announcement} onChange={(event) => setSettings({ ...settings, announcement: event.target.value })} placeholder="Optional student-facing notice" /></Field><SubmitButton>{busy ? 'Saving…' : 'Save settings'}</SubmitButton></form></Panel>
  </div>

  return null
}

function WorkspaceHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="workspace-page-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></header>
}

function FleetMap({ vehicles, routes }: { vehicles: Vehicle[]; routes: Route[] }) {
  return <section className="workspace-fleet-map"><div className="fleet-map-header"><div><p className="eyebrow">CAMPUS LIVE MAP</p><h2>Vehicle positions</h2></div><span className="live-dot" /></div><div className="fleet-map-canvas"><svg viewBox="0 0 760 310" role="img" aria-label="Campus fleet vehicle positions"><rect width="760" height="310" rx="14" fill="#eff3e9" /><path d="M-20 240 180 140l140 52 130-105 150 56 190-70M110-20l60 98 50 90 2 160m170-350-12 94 18 98 90 120m190-340-55 115-4 110 75 110" fill="none" stroke="#fff" strokeWidth="25" strokeLinecap="round" /><path d="M-20 240 180 140l140 52 130-105 150 56 190-70M110-20l60 98 50 90 2 160m170-350-12 94 18 98 90 120m190-340-55 115-4 110 75 110" fill="none" stroke="#d7dfd5" strokeWidth="2" strokeDasharray="5 7" />{routes.map((route, index) => <path key={route.id} d={index === 0 ? 'M25 226 180 140 320 192 450 87 600 143 740 92' : index === 1 ? 'M40 265 190 180 345 206 450 87 550 30 740 92' : 'M110 45 240 168 320 192 440 250 600 143'} fill="none" stroke={route.color} strokeWidth="4" strokeDasharray="8 7" strokeLinecap="round" opacity=".8" />)}{vehicles.map((vehicle, index) => <g key={vehicle.id} transform={`translate(${80 + (index * 151) % 600},${65 + (index * 87) % 180})`}><circle r="17" fill="#fff" /><circle r="13" fill={vehicle.status === 'in_service' ? '#237f72' : '#9da9a0'} /><path d="M-5 2h10M-4-3h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><title>{vehicle.name} · {vehicle.status}</title></g>)}</svg><div className="fleet-map-caption"><span>{vehicles.filter((vehicle) => vehicle.status === 'in_service').length} vehicles in service</span><span>Map coordinates are sample campus positions</span></div></div></section>
}

function NotificationCard({ notice }: { notice: Notification }) {
  return <article className="workspace-notice"><span className="update-icon update-icon--green"><span>!</span></span><div><strong>{notice.title}</strong><p>{notice.message}</p><small>{notice.route ? `${notice.route.code} · ${notice.route.name} · ` : ''}{new Date(notice.createdAt).toLocaleString()}</small></div><StatusTag value={notice.type} /></article>
}

function PreferenceToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="workspace-preference"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>
}

function StatusTag({ value }: { value: string }) {
  return <span className={`workspace-status workspace-status--${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="workspace-empty">{children}</p>
}

export default WorkspacePage
