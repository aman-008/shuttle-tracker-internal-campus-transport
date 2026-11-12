import { useEffect, useMemo, useState } from 'react'
import { createAccount, getCurrentUser, signIn, signOut, type AuthUser } from './auth'
import WorkspacePage from './Workspaces'
import {
  getStudentData,
  updateFavorites,
  type Route as ApiRoute,
  type StudentData,
} from './transit'
import './App.css'

type Route = ApiRoute & { vehicle: string; nextArrival: number; capacity: number; occupied: number }
type Page = string
export type IconName = 'grid' | 'route' | 'bookmark' | 'settings' | 'search' | 'bell' | 'chevron' | 'arrow' | 'clock' | 'users' | 'zap' | 'map' | 'plus' | 'close' | 'menu' | 'more' | 'sun' | 'pin' | 'bus' | 'flag' | 'check' | 'edit' | 'alert' | 'calendar' | 'truck' | 'megaphone' | 'shield' | 'chart' | 'sliders' | 'logout'

const studentNavItems = [
  { id: 'overview', label: 'Dashboard', icon: 'grid' },
  { id: 'live', label: 'Live tracking', icon: 'map' },
  { id: 'routes', label: 'Routes', icon: 'route' },
  { id: 'timetable', label: 'Timetable', icon: 'calendar' },
  { id: 'favorites', label: 'Favourites', icon: 'bookmark' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'report', label: 'Report issue', icon: 'flag' },
  { id: 'profile', label: 'Profile & settings', icon: 'settings' },
] as const

const adminNavItems = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'live', label: 'Live fleet monitoring', icon: 'map' },
  { id: 'routes-admin', label: 'Route management', icon: 'route' },
  { id: 'stops-admin', label: 'Stop management', icon: 'pin' },
  { id: 'vehicles-admin', label: 'Vehicle management', icon: 'truck' },
  { id: 'schedules-admin', label: 'Schedule management', icon: 'calendar' },
  { id: 'reports-admin', label: 'Reports & complaints', icon: 'flag' },
  { id: 'notifications-admin', label: 'Notifications', icon: 'megaphone' },
  { id: 'users-admin', label: 'User management', icon: 'users' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'settings-admin', label: 'Settings', icon: 'sliders' },
] as const

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    route: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h1" /></>,
    bookmark: <><path d="M6 4.8A1.8 1.8 0 0 1 7.8 3h8.4A1.8 1.8 0 0 1 18 4.8V21l-6-4-6 4V4.8Z" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.1.9-1.6 2.8-1.4-.5a7.9 7.9 0 0 1-1.6.9l-.2 1.5h-3.2l-.2-1.5a7.9 7.9 0 0 1-1.6-.9l-1.4.5-1.6-2.8 1.1-.9A7 7 0 0 1 8.7 14l-1.4-.8 1.6-2.8 1.5.4a7.9 7.9 0 0 1 1.6-.9l.2-1.5h3.2l.2 1.5a7.9 7.9 0 0 1 1.6.9l1.5-.4 1.6 2.8-1.4.8a7 7 0 0 1-.5 1Z" transform="translate(-1 -1)" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4 4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    zap: <path d="m13 2-3 8h7l-6 12 1-9H5l8-11Z" />,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" /><path d="M9 3v15m6-12v15" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    bus: <><rect x="4" y="3" width="16" height="16" rx="3" /><path d="M4 11h16M8 19v2m8-2v2M8 7h.01M16 7h.01" /><circle cx="8" cy="15" r="1" /><circle cx="16" cy="15" r="1" /></>,
    flag: <><path d="M5 21V5m0 0c5-4 9 4 14 0v11c-5 4-9-4-14 0" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    alert: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    truck: <><path d="M3 6h12v12H3zM15 10h4l3 3v5h-7z" /><circle cx="7.5" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></>,
    megaphone: <><path d="m3 11 18-5v12L3 13v-2Z" /><path d="m11 15 2 6H8l-1-7" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m8 14 4-4 4 3 5-7" /></>,
    sliders: <><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M2 14h4m4-6h4m4 8h4" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [page, setPage] = useState<Page>('overview')
  const [campusData, setCampusData] = useState<StudentData | null>(null)
  const [campusLoadError, setCampusLoadError] = useState<{ userId: string; message: string } | null>(null)
  const [tick, setTick] = useState(0)
  const [selectedRoute, setSelectedRoute] = useState('R1')
  const [search, setSearch] = useState('')
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let active = true
    getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser)
      })
      .catch((error: unknown) => {
        if (active) setAuthError(error instanceof Error ? error.message : 'Could not verify your session.')
      })
      .finally(() => {
        if (active) setAuthLoading(false)
      })
    return () => { active = false }
  }, [])
  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const routes = useMemo(() => (campusData?.routes ?? []).map((route) => {
    const vehicle = campusData?.vehicles.find((item) => item.route?.id === route.id)
    const nextArrival = route.code === 'R2' ? 6 : route.code === 'R3' ? 9 : 3
    return {
      ...route,
      vehicle: vehicle?.name ?? 'Vehicle not assigned',
      occupied: vehicle?.occupied ?? 0,
      capacity: vehicle?.capacity ?? 0,
      nextArrival,
    }
  }), [campusData])
  const favorites = campusData?.favorites.stops.map((stop) => stop.name) ?? []
  const reports = campusData?.reports ?? []
  const navItems = user?.role === 'admin' ? adminNavItems : studentNavItems
  const currentRoute = routes.find((route) => route.code === selectedRoute) ?? routes[0]
  const filteredRoutes = useMemo(() => routes.filter((route) =>
    `${route.name} ${route.code} ${route.stops.join(' ')}`.toLowerCase().includes(search.toLowerCase()),
  ), [routes, search])

  const refreshCampusData = async () => {
    setCampusData(await getStudentData())
    setCampusLoadError(null)
  }

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let active = true
    getStudentData()
      .then((result) => {
        if (active) {
          setCampusData(result)
          setCampusLoadError(null)
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Could not load campus data.'
        if (active) setCampusLoadError({ userId, message })
      })
    return () => { active = false }
  }, [userId])

  const navigate = (nextPage: Page) => {
    setPage(nextPage)
    setMobileNavOpen(false)
  }
  const toggleFavorite = (stopName: string) => {
    if (!campusData) return
    const stop = campusData.stops.find((item) => item.name === stopName)
    if (!stop) return
    const currentStopIds = campusData.favorites.stops.map((item) => item.id)
    const nextStopIds = currentStopIds.includes(stop.id) ? currentStopIds.filter((id) => id !== stop.id) : [...currentStopIds, stop.id]
    updateFavorites(nextStopIds, campusData.favorites.routes.map((route) => route.id))
      .then(refreshCampusData)
      .catch((error: unknown) => setToast(error instanceof Error ? error.message : 'Could not update favourites.'))
  }
  const arrivalFor = (route: Route, stopIndex = 0) => Math.max(1, route.nextArrival + ((tick + stopIndex * 3) % 8) - 2)

  const handleLogout = async () => {
    try {
      await signOut()
      setUser(null)
      setCampusData(null)
      setPage('overview')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Could not sign out. Please try again.')
    }
  }

  if (authLoading) {
    return <main className="auth-page auth-loading"><div className="brand-mark"><Icon name="route" size={21} /></div><p>Connecting to Shuttle Tracker…</p></main>
  }

  if (!user) {
    return <AuthScreen
      initialError={authError}
      onCreateAccount={async (account) => {
        const newUser = await createAccount(account)
        setAuthError('')
        setUser(newUser)
        return newUser
      }}
      onLogin={async (email, password) => {
        const currentUser = await signIn(email, password)
        setAuthError('')
        setUser(currentUser)
        return currentUser
      }}
    />
  }

  const currentUserData = campusData?.user.id === user.id ? campusData : null
  if (!currentUserData) {
    const loadError = campusLoadError?.userId === user.id ? campusLoadError.message : ''
    return <main className="auth-page auth-loading">
      <div className="brand-mark"><Icon name="route" size={21} /></div>
      {loadError
        ? <><p role="alert">{loadError}</p><button className="primary-button" onClick={() => { setCampusLoadError(null); void refreshCampusData().catch((error: unknown) => setCampusLoadError({ userId: user.id, message: error instanceof Error ? error.message : 'Could not load campus data.' })) }}>Try again</button></>
        : <p>Loading your campus workspace…</p>}
    </main>
  }
  const activeCampusData = currentUserData

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar--open' : ''}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigate('overview') }}>
          <span className="brand-mark"><Icon name="route" size={21} /></span>
          <span>Shuttle <span className="brand-accent">Tracker</span><small>INTERNAL CAMPUS TRANSPORT</small></span>
        </a>
        <div className="campus-select">
          <span className="campus-avatar">L</span>
          <span><strong>Lovely Professional University</strong><small>{user.role === 'admin' ? 'Administrator workspace' : 'Student workspace'}</small></span>
          <span className="select-chevron">⌄</span>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.id} className={`nav-item ${page === item.id ? 'nav-item--active' : ''}`} onClick={() => navigate(item.id)}>
              <Icon name={item.icon} size={18} /><span>{item.label}</span>
              {item.id === 'favorites' && favorites.length > 0 && <span className="nav-count">{favorites.length}</span>}
            </button>
          ))}
        </nav>
        <div className="side-divider" />
        <div className="service-label"><span className="live-dot" /> LIVE SERVICE <span>03</span></div>
        <div className="route-mini-list">
          {routes.map((route) => (
            <button className="route-mini" key={route.id} onClick={() => { setSelectedRoute(route.code); navigate(user.role === 'admin' ? 'live' : 'routes') }}>
              <span className="route-color" style={{ backgroundColor: route.color }} />
              <span>{route.code} <small>{route.name}</small></span>
              <span className="route-mini-time">{arrivalFor(route)}m</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon"><Icon name="sun" size={17} /></span><strong>Need a ride?</strong><p>All vehicles are electric and campus-approved.</p><button onClick={() => navigate('routes')}>Explore routes <Icon name="arrow" size={13} /></button></div>
          <button className="profile-row" onClick={() => navigate(user.role === 'admin' ? 'settings-admin' : 'profile')} title="Open profile and settings"><span className="profile-avatar">{user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.role === 'admin' ? 'Administrator' : 'Profile & settings'}</small></span><Icon name="more" size={18} /></button>
        </div>
      </aside>
      {mobileNavOpen && <button aria-label="Close navigation" className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-panel">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
          <div className="breadcrumbs"><span>Campus</span><Icon name="chevron" size={14} /><strong>{navItems.find((item) => item.id === page)?.label}</strong></div>
          <div className="topbar-right">
            <div className="service-status"><span className="live-dot" /> All systems operational</div>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotificationOpen((open) => !open)}><Icon name="bell" size={19} />{activeCampusData.notifications.length > 0 && <span className="notification-dot" />}</button>
            {notificationOpen && <div className="notification-popover"><strong>Notifications</strong><p><span className="live-dot" /> {activeCampusData.notifications[0]?.message ?? 'All caught up'} <small>{activeCampusData.notifications[0]?.title ?? 'Campus updates'}</small></p><button onClick={() => { setNotificationOpen(false); navigate(user.role === 'admin' ? 'notifications-admin' : 'notifications') }}>View service updates</button></div>}
            <span className="topbar-date"><Icon name="sun" size={16} /> 22° <span>Clear skies</span></span>
          </div>
        </header>

        <div className="page-content">
          {(user.role === 'admin' || (page !== 'overview' && page !== 'routes' && page !== 'favorites')) && (
            <WorkspacePage
              page={page}
              user={user}
              data={activeCampusData}
              onRefresh={refreshCampusData}
              onUserUpdate={setUser}
              onNotify={setToast}
              onLogout={() => void handleLogout()}
              Icon={Icon}
            />
          )}

          {user.role === 'student' && page === 'overview' && (
            <>
              <section className="welcome-row">
                <div><p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()} <span className="eyebrow-dot" /> A GOOD DAY TO GO GREEN</p><h1>Shuttle Tracker: <span>Internal Campus Transport</span></h1><p className="welcome-sub">See where your ride is, find your stop, and get there on time.</p></div>
                <button className="primary-button" onClick={() => navigate('routes')}><Icon name="map" size={17} /> Explore routes <Icon name="arrow" size={15} /></button>
              </section>

              <section className="stats-grid" aria-label="Campus transit at a glance">
                <div className="stat-card"><span className="stat-icon stat-icon--green"><Icon name="bus" size={19} /></span><div><p>Vehicles on the move</p><strong>{activeCampusData.summary.activeShuttles} <small>/ {activeCampusData.vehicles.length}</small></strong></div><span className="stat-note positive">Live fleet</span></div>
                <div className="stat-card"><span className="stat-icon stat-icon--orange"><Icon name="clock" size={19} /></span><div><p>Average wait time</p><strong>6 <small>min</small></strong></div><span className="stat-note positive">−2 min <small>vs. yesterday</small></span></div>
                <div className="stat-card"><span className="stat-icon stat-icon--violet"><Icon name="users" size={19} /></span><div><p>Available campus routes</p><strong>{activeCampusData.summary.routes}</strong></div><span className="stat-note neutral">{activeCampusData.summary.students} student accounts</span></div>
              </section>

              <section className="dashboard-grid">
                <div className="map-card">
                  <div className="section-heading map-heading"><div><p className="eyebrow">LIVE CAMPUS MAP</p><h2>Find your ride</h2></div><button className="subtle-button" onClick={() => navigate('routes')}>Full map <Icon name="arrow" size={14} /></button></div>
                  {routes.length > 0 ? <CampusMap routes={routes} selectedRoute={selectedRoute} onSelect={setSelectedRoute} tick={tick} /> : <div className="empty-state">No active routes are available right now.</div>}
                  <div className="map-legend"><span><i className="legend-line legend-line--green" />North Loop</span><span><i className="legend-line legend-line--orange" />South Express</span><span><i className="legend-stop" />Stops</span><span className="map-live"><span className="live-dot" /> Live updates</span></div>
                </div>

                <div className="arrivals-card">
                  <div className="section-heading"><div><p className="eyebrow">DON'T MISS YOUR RIDE</p><h2>Next arrivals</h2></div><button className="icon-button small-icon" aria-label="More arrival options"><Icon name="more" /></button></div>
                  <div className="stop-context"><span className="context-pin"><Icon name="pin" size={15} /></span><span><strong>{activeCampusData.stops[0]?.name ?? 'No stops configured'}</strong><small>Your campus pickup point</small></span>{activeCampusData.stops[0] && <button aria-label={`Save ${activeCampusData.stops[0].name}`} className={`favorite-button ${favorites.includes(activeCampusData.stops[0].name) ? 'is-favorite' : ''}`} onClick={() => toggleFavorite(activeCampusData.stops[0].name)}>{favorites.includes(activeCampusData.stops[0].name) ? '★' : '☆'}</button>}</div>
                  <div className="arrival-list">
                    {routes.map((route) => <div className="arrival-row" key={route.id}><span className="arrival-route-dot" style={{ backgroundColor: route.color }} /><div className="arrival-route-info"><strong>{route.name}</strong><small>{route.code} · {route.vehicle}</small></div><div className="arrival-time"><strong>{arrivalFor(route)}<small> min</small></strong><span>Estimated</span></div></div>)}
                  </div>
                  <button className="text-button arrivals-link" onClick={() => navigate('routes')}>View all arrivals <Icon name="arrow" size={14} /></button>
                </div>
              </section>

              <section className="lower-grid">
                <div className="routes-section">
                  <div className="section-heading"><div><p className="eyebrow">GETTING AROUND</p><h2>Campus routes <span className="heading-count">{routes.length}</span></h2></div><button className="text-button" onClick={() => navigate('routes')}>All routes <Icon name="arrow" size={14} /></button></div>
                  <div className="route-cards">{routes.map((route) => <RouteCard key={route.id} route={route} eta={arrivalFor(route)} selected={selectedRoute === route.code} onClick={() => { setSelectedRoute(route.code); navigate('routes') }} />)}</div>
                </div>
                <div className="updates-section">
                  <div className="section-heading"><div><p className="eyebrow">FRESH OFF THE ROUTE</p><h2>Service updates</h2></div><span className="updates-live">LIVE</span></div>
                  <div className="update-card"><span className="update-icon update-icon--green"><Icon name="check" size={16} /></span><div><strong>Everything is running smoothly</strong><p>All campus routes are on schedule right now.</p><small>Updated just now</small></div></div>
                  {reports.slice(0, 1).map((report) => <div className="update-card update-card--report" key={report._id}><span className="update-icon update-icon--orange"><Icon name={report.type === 'crowding' ? 'users' : 'clock'} size={16} /></span><div><strong>{report.message} · {report.route?.code ?? 'Campus'}</strong><p>Thanks for helping improve campus transit.</p><small>{new Date(report.createdAt).toLocaleString()}</small></div></div>)}
                  <button className="report-link" onClick={() => navigate('report')}><Icon name="flag" size={15} /> Report an issue</button>
                </div>
              </section>
              <footer className="page-footer"><span>Shuttle Tracker <span>·</span> Internal Campus Transport</span><span>Service hours today <strong>7:00 AM – 10:00 PM</strong></span></footer>
            </>
          )}

          {user.role === 'student' && page === 'routes' && (
            <section className="subpage">
              <div className="welcome-row subpage-welcome"><div><p className="eyebrow">YOUR CAMPUS, CONNECTED</p><h1>Routes <span>& stops.</span></h1><p className="welcome-sub">Plan your ride and see the next vehicle at every stop.</p></div><button className="primary-button" onClick={() => navigate('report')}><Icon name="flag" size={16} /> Report an issue</button></div>
              <div className="route-toolbar"><label className="search-field"><Icon name="search" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search routes or stops..." /></label><span className="result-count">{filteredRoutes.length} routes running <span className="live-dot" /></span></div>
              <div className="routes-page-grid"><div className="all-routes">{filteredRoutes.map((route) => <RouteCard key={route.id} route={route} eta={arrivalFor(route)} selected={selectedRoute === route.code} onClick={() => setSelectedRoute(route.code)} detailed />)}{filteredRoutes.length === 0 && <div className="empty-state">No routes or stops match “{search}”. Try another search.</div>}</div>{currentRoute && <div className="route-detail-panel"><CampusMap routes={routes} selectedRoute={selectedRoute} onSelect={setSelectedRoute} tick={tick} /><div className="route-detail-title"><span className="route-color" style={{ backgroundColor: currentRoute.color }} /><div><p className="eyebrow">{currentRoute.code} · LIVE ROUTE</p><h2>{currentRoute.name}</h2></div></div><p className="route-detail-meta"><Icon name="clock" size={15} /> {currentRoute.frequency}<span>·</span><Icon name="bus" size={15} /> {currentRoute.vehicle}</p><div className="stop-list">{currentRoute.stops.map((stop, index) => <div className="stop-row" key={stop}><span className={`stop-timeline ${index === 0 ? 'stop-timeline--first' : ''}`}><i /></span><span className="stop-name"><strong>{stop}</strong><small>{index === 0 ? 'First stop' : `${index * 4 + 2} min from start`}</small></span><span className="stop-eta">{arrivalFor(currentRoute, index)} min</span><button className={`stop-action ${favorites.includes(stop) ? 'is-favorite' : ''}`} title={favorites.includes(stop) ? 'Remove favorite' : 'Save stop'} onClick={() => toggleFavorite(stop)}>{favorites.includes(stop) ? '★' : '☆'}</button></div>)}</div></div>}</div>
              <footer className="page-footer"><span>Shuttle Tracker <span>·</span> Internal Campus Transport</span><span>ETAs update automatically <strong>every minute</strong></span></footer>
            </section>
          )}

          {user.role === 'student' && page === 'favorites' && (
            <section className="subpage">
              <div className="welcome-row subpage-welcome"><div><p className="eyebrow">YOUR PERSONAL SHORTCUTS</p><h1>Saved <span>stops.</span></h1><p className="welcome-sub">Your favorite stops and arrival alerts, all in one place.</p></div><button className="outline-button" onClick={() => navigate('routes')}><Icon name="plus" size={16} /> Find a stop</button></div>
              <div className="favorites-summary"><span className="stat-icon stat-icon--green"><Icon name="bookmark" size={18} /></span><div><strong>{favorites.length} saved {favorites.length === 1 ? 'stop' : 'stops'}</strong><p>Arrival alerts are managed in Profile &amp; settings.</p></div></div>
              {favorites.length ? <div className="favorite-stop-grid">{favorites.map((stop) => {
                const linkedRoutes = routes.filter((route) => route.stops.includes(stop))
                return <article className="favorite-stop-card" key={stop}><div className="favorite-card-top"><span className="context-pin"><Icon name="pin" size={16} /></span><button className="remove-favorite" aria-label={`Remove ${stop} from saved stops`} onClick={() => toggleFavorite(stop)}>×</button></div><h2>{stop}</h2><p>{linkedRoutes.length} routes stop here</p><div className="favorite-arrivals">{linkedRoutes.map((route) => <span key={route.id}><i style={{ backgroundColor: route.color }} />{route.code}<strong>{arrivalFor(route)} min</strong></span>)}</div></article>
              })}</div> : <div className="empty-state empty-favorites"><span className="stat-icon stat-icon--green"><Icon name="bookmark" /></span><h2>No saved stops yet</h2><p>Save a stop to see its arrival times here.</p><button className="primary-button" onClick={() => navigate('routes')}>Explore routes <Icon name="arrow" size={14} /></button></div>}
              <footer className="page-footer"><span>Shuttle Tracker <span>·</span> Internal Campus Transport</span><span>Stay one step ahead of your ride</span></footer>
            </section>
          )}

        </div>
      </main>

      {toast && <div role="status" className="toast"><span className="toast-check"><Icon name="check" size={15} /></span>{toast}</div>}
    </div>
  )
}

function AuthScreen({ initialError, onCreateAccount, onLogin }: {
  initialError: string
  onCreateAccount: (account: { name: string; email: string; password: string }) => Promise<AuthUser>
  onLogin: (email: string, password: string) => Promise<AuthUser>
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(initialError)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const changeMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode)
    setError('')
  }
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Those passwords don’t match. Please try again.')
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'signup') {
        await onCreateAccount({ name: name.trim(), email: email.trim().toLowerCase(), password })
      } else {
        await onLogin(email.trim().toLowerCase(), password)
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <a className="auth-brand" href="#" onClick={(event) => event.preventDefault()}>
        <span className="brand-mark"><Icon name="route" size={21} /></span>
        <span>Shuttle <span className="brand-accent">Tracker</span><small>INTERNAL CAMPUS TRANSPORT</small></span>
      </a>
      <section className="auth-card">
        <div className="auth-form-panel">
          <div className="auth-mobile-greeting"><span className="live-dot" /> CAMPUS TRANSIT, MADE SIMPLE</div>
          <p className="eyebrow">{mode === 'signup' ? 'YOUR CAMPUS JOURNEY STARTS HERE' : 'WELCOME BACK'}</p>
          <h1>Shuttle Tracker: <span>Internal Campus Transport</span></h1>
          <p className="auth-intro">{mode === 'signup' ? 'Create your free student account to keep your campus moving.' : 'Sign in to find your next ride and pick up where you left off.'}</p>

          <div className="auth-mode-tabs" role="tablist" aria-label="Account options">
            <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'auth-tab auth-tab--active' : 'auth-tab'} onClick={() => changeMode('signup')} disabled={isSubmitting}>Create account</button>
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'auth-tab auth-tab--active' : 'auth-tab'} onClick={() => changeMode('login')} disabled={isSubmitting}>Sign in</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && <label className="auth-field">Full name<input autoComplete="name" name="name" placeholder="e.g. Alex Student" value={name} onChange={(event) => setName(event.target.value)} required /></label>}
            <label className="auth-field">Student email<input autoComplete="email" name="email" type="email" placeholder="you@university.edu" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label className="auth-field">Password<input autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} name="password" type="password" placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></label>
            {mode === 'signup' && <label className="auth-field">Confirm password<input autoComplete="new-password" name="confirm-password" type="password" placeholder="Enter your password again" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required /></label>}
            {error && <p className="auth-error" role="alert"><Icon name="alert" size={15} />{error}</p>}
            <button type="submit" className="primary-button auth-submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : mode === 'signup' ? 'Create my account' : 'Sign in'}<Icon name="arrow" size={15} /></button>
          </form>

          <p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : 'New to Shuttle Tracker?'} <button type="button" onClick={() => changeMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>
          <p className="auth-footnote">By continuing, you agree to use Shuttle Tracker in accordance with your campus transit policies.</p>
        </div>

        <aside className="auth-visual">
          <div className="auth-visual-top"><span><span className="live-dot" /> LIVE CAMPUS TRANSIT</span><span className="auth-weather"><Icon name="sun" size={15} /> 22°</span></div>
          <div className="auth-visual-copy"><p>MORE CAMPUS.<br /><span>LESS WAITING.</span></p><span>Every stop, every route, one easy ride away.</span></div>
          <div className="auth-map-art" aria-hidden="true">
            <svg viewBox="0 0 410 260" role="presentation">
              <path d="M-20 210 88 164l81-63 87 36 94-94 86 43M34-15l29 91 40 77 19 107m117-276-15 76-28 68 82 92m119-294-23 95-58 72 22 105" fill="none" stroke="#f9fcf8" strokeWidth="17" strokeLinecap="round" />
              <path d="M-20 210 88 164l81-63 87 36 94-94 86 43M34-15l29 91 40 77 19 107m117-276-15 76-28 68 82 92m119-294-23 95-58 72 22 105" fill="none" stroke="#dce8df" strokeWidth="1.5" strokeDasharray="4 6" />
              <path d="M40 190C93 171 108 114 171 101s68 69 119 36S352 59 390 88" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
              <path d="M40 190C93 171 108 114 171 101s68 69 119 36S352 59 390 88" fill="none" stroke="#398b73" strokeWidth="3" strokeLinecap="round" />
              <g fill="#e1eddf"><rect x="74" y="46" width="56" height="32" rx="7"/><rect x="224" y="178" width="68" height="36" rx="7"/><rect x="324" y="133" width="53" height="32" rx="7"/></g>
              <g fill="#8ca792" fontFamily="sans-serif" fontSize="8" fontWeight="700" letterSpacing="1"><text x="84" y="65">LIBRARY</text><text x="237" y="200">CAMPUS</text><text x="331" y="152">HOSTEL</text></g>
              <g transform="translate(202 105)"><circle r="17" fill="#fff"/><circle r="13" fill="#237f72"/><path d="M-5 2h10M-4-3h8" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></g>
              <g fill="#fff" stroke="#398b73" strokeWidth="2"><circle cx="40" cy="190" r="6"/><circle cx="171" cy="101" r="6"/><circle cx="290" cy="137" r="6"/><circle cx="390" cy="88" r="6"/></g>
            </svg>
            <div className="auth-arrival-card"><span className="auth-arrival-icon"><Icon name="bus" size={17} /></span><span><strong>North Campus Loop</strong><small><span className="live-dot" /> On its way</small></span><b>3 <small>min</small></b></div>
          </div>
          <div className="auth-visual-footer"><span><Icon name="zap" size={15} /> 100% electric campus rides</span><span>01 — 03</span></div>
        </aside>
      </section>
      <footer className="auth-page-footer"><span>© {new Date().getFullYear()} Shuttle Tracker</span><span>Made for campus life <i>✳</i></span><span><Icon name="pin" size={13} /> Lovely Professional University</span></footer>
      <p className="auth-demo-note">Your account is stored securely. Passwords are protected and never saved as plain text.</p>
    </main>
  )
}

function RouteCard({ route, eta, selected, onClick, detailed = false }: { route: Route; eta: number; selected: boolean; onClick: () => void; detailed?: boolean }) {
  const fullness = route.capacity ? Math.min(100, Math.round((route.occupied / route.capacity) * 100)) : 0
  return <button className={`route-card ${selected ? 'route-card--selected' : ''} ${detailed ? 'route-card--detailed' : ''}`} onClick={onClick}><div className="route-card-top"><span className="route-label" style={{ color: route.color, backgroundColor: `${route.color}14` }}>{route.code}</span><span className="route-service"><span className="live-dot" /> In service <Icon name="chevron" size={14} /></span></div><h3>{route.name}</h3><div className="route-card-meta"><span><Icon name="bus" size={14} />{route.vehicle}</span><span><Icon name="clock" size={14} />{route.frequency}</span></div><div className="route-card-bottom"><div className="route-stop-preview">{route.stops.slice(0, detailed ? 4 : 3).map((stop, index) => <span key={stop}><i className={index === 0 ? 'stop-dot-filled' : ''} />{stop}{index < Math.min(route.stops.length, detailed ? 4 : 3) - 1 && <b />}</span>)}</div><div className="route-card-eta"><strong>{eta}<small> min</small></strong><span>next arrival</span></div></div>{detailed && <div className="occupancy"><div><span>Vehicle capacity</span><strong>{route.occupied} / {route.capacity} riders</strong></div><div className="occupancy-track"><span style={{ width: `${fullness}%`, background: fullness > 75 ? '#e48b48' : route.color }} /></div><div className="route-full-stops">{route.stops.map((stop) => <span key={stop}><Icon name="pin" size={13} />{stop}</span>)}</div></div>}</button>
}

function CampusMap({ routes, selectedRoute, onSelect, tick }: { routes: Route[]; selectedRoute: string; onSelect: (id: string) => void; tick: number }) {
  if (!routes.length) return <div className="empty-state">No route data available.</div>
  const selected = routes.find((route) => route.code === selectedRoute) ?? routes[0]
  return <div className="campus-map" aria-label="Illustrated live map of the campus routes">
    <svg className="map-art" viewBox="0 0 680 285" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Map showing ${selected.name}`}>
      <rect width="680" height="285" fill="#eff3e9" />
      <path d="M0 50 130 23l70 35 90-35 104 34 85-22 201 27v69l-94 24 4 94-118 26-72-38-81 34-124-41-91 30-104-52Z" fill="#e7eddf" />
      <path d="M-25 210 157 136l139-37 149 53 130-64 146 5M79-15l47 98 37 78 4 149m176-314-14 81-2 86 82 133m179-285-39 99-2 104 51 84" fill="none" stroke="#fff" strokeWidth="19" strokeLinecap="round" />
      <path d="M-25 210 157 136l139-37 149 53 130-64 146 5M79-15l47 98 37 78 4 149m176-314-14 81-2 86 82 133m179-285-39 99-2 104 51 84" fill="none" stroke="#d9dfd4" strokeWidth="1.5" strokeDasharray="5 6" />
      <g fill="#dbe8d5"><rect x="210" y="35" width="73" height="43" rx="8" /><rect x="337" y="187" width="94" height="48" rx="8" /><rect x="515" y="183" width="70" height="49" rx="8" /><rect x="50" y="90" width="64" height="43" rx="8" /><rect x="448" y="31" width="71" height="40" rx="8" /></g>
      <g fill="#a5b99c" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600" letterSpacing="1"><text x="219" y="58">SCIENCE</text><text x="352" y="213">LIBRARY</text><text x="524" y="210">HOSTEL</text><text x="53" y="114">SPORTS</text><text x="457" y="54">CAFETERIA</text></g>
      <path d="M116 88 C172 89 184 167 260 155 S342 117 399 159 S462 190 535 157" fill="none" stroke="#dce4db" strokeWidth="5" strokeDasharray="2 7" />
      {routes.map((route) => {
        const isSelected = route.code === selectedRoute
        const paths: Record<string, string> = { R1: 'M108 195 C172 193 178 107 258 104 S341 99 372 151 S450 195 519 140', R2: 'M108 195 C177 214 219 221 289 201 S364 181 399 151 S470 87 536 92', R3: 'M519 140 C464 128 424 105 371 151 S278 209 199 176' }
        const path = paths[route.code] ?? paths.R1
        return <g key={route.id} className="map-route" onClick={() => onSelect(route.code)} role="button" aria-label={`Show ${route.name}`} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(route.code) }}><path d={path} fill="none" stroke="#fff" strokeWidth={isSelected ? 9 : 6} strokeLinecap="round" /><path d={path} fill="none" stroke={route.color} strokeWidth={isSelected ? 4 : 2.5} strokeLinecap="round" strokeDasharray={isSelected ? '0' : '5 5'} opacity={isSelected ? 1 : .68} /></g>
      })}
      {[['Main Gate', 108, 195], ['Library', 371, 151], ['Science Block', 258, 104], ['North Hostel', 519, 140], ['Sports Complex', 157, 176], ['Cafeteria', 399, 92], ['Admin Block', 289, 201]].map(([label, x, y]) => <g className="map-stop" key={label as string} transform={`translate(${x},${y})`}><circle r="8" fill="#fff" /><circle r="4" fill="#547d67" /><text x="11" y="-8">{label as string}</text></g>)}
      <g className="map-vehicle" transform={`translate(${[108, 199, 278, 350, 423, 495][tick % 6]},${[195, 176, 154, 140, 171, 165][tick % 6]})`}><circle r="12" fill="#fff" /><circle r="9" fill="#237f72" /><path d="M-4 2h8M-3-2h6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" /></g>
    </svg>
    <div className="map-controls"><button aria-label="Zoom in">+</button><button aria-label="Zoom out">−</button></div>
    <div className="map-attribution"><Icon name="pin" size={12} /> Lovely Professional University campus</div>
    <div className="selected-route-chip"><span style={{ backgroundColor: selected.color }} />{selected.code} · {selected.name}<span className="selected-eta">{Math.max(1, selected.nextArrival + (tick % 3))} min</span></div>
  </div>
}

export default App
