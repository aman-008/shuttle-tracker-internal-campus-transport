'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, Bell, BusFront, CalendarDays, ChartNoAxesCombined, ChevronRight, CircleHelp,
  ClipboardList, Flag, LayoutDashboard, LogOut, MapPinned, Menu, Route, Settings2,
  ShieldCheck, Signpost, UserRound, Users, X,
} from 'lucide-react'
import { errorMessage, getCurrentUser, getStudentData, signOut, type StudentData } from '@/lib/api'
import { initials } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { StudentPages } from '@/components/student-pages'
import { AdminPages } from '@/components/admin-pages'

const studentLinks = [
  { slug: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { slug: 'live-map', label: 'Live tracking', icon: MapPinned },
  { slug: 'routes', label: 'Routes', icon: Route },
  { slug: 'stops', label: 'Stops', icon: Signpost },
  { slug: 'timetable', label: 'Timetable', icon: CalendarDays },
  { slug: 'favorites', label: 'Favourites', icon: Activity },
  { slug: 'notifications', label: 'Notifications', icon: Bell },
  { slug: 'report', label: 'Report an issue', icon: Flag },
  { slug: 'profile', label: 'Profile', icon: UserRound },
]

const adminLinks = [
  { slug: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { slug: 'shuttles', label: 'Manage shuttles', icon: BusFront },
  { slug: 'routes', label: 'Manage routes', icon: Route },
  { slug: 'stops', label: 'Manage stops', icon: Signpost },
  { slug: 'schedules', label: 'Manage schedules', icon: CalendarDays },
  { slug: 'users', label: 'Manage users', icon: Users },
  { slug: 'notifications', label: 'Notifications', icon: Bell },
  { slug: 'reports', label: 'Crowd reports', icon: ClipboardList },
  { slug: 'analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { slug: 'settings', label: 'Campus settings', icon: Settings2 },
]

const pageTitles: Record<string, string> = {
  dashboard: 'Overview',
  'live-map': 'Live tracking',
  routes: 'Routes',
  stops: 'Stops',
  timetable: 'Timetable',
  favorites: 'Favourites',
  notifications: 'Notifications',
  report: 'Report an issue',
  profile: 'Profile',
  shuttles: 'Manage shuttles',
  schedules: 'Manage schedules',
  users: 'Manage users',
  reports: 'Crowd reports',
  analytics: 'Analytics',
  settings: 'Campus settings',
}

export function Workspace({ path }: { path: string[] }) {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const [checkingSession, setCheckingSession] = useState(true)
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [data, setData] = useState<StudentData | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [toast, setToast] = useState('')
  const isAdminPath = path[0] === 'admin'
  const page = path[1] ?? 'dashboard'
  const userId = user?.id
  const campusName = data?.settings?.campusName ?? 'Lovely Professional University'

  const refreshData = useCallback(async () => {
    try {
      const result = await getStudentData()
      setData(result)
      setUser(result.user)
      setLoadError('')
    } catch (error) {
      setLoadError(errorMessage(error, 'Campus data could not be loaded.'))
    }
  }, [setUser])

  useEffect(() => {
    let active = true
    const verify = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (active) setUser(currentUser)
      } catch (error) {
        if (active) setLoadError(errorMessage(error, 'Could not verify your session.'))
      } finally {
        if (active) setCheckingSession(false)
      }
    }
    void verify()
    return () => { active = false }
  }, [router, sessionAttempt, setUser])

  useEffect(() => {
    const onExpired = () => {
      setUser(null)
      router.replace('/login')
    }
    window.addEventListener('shuttle:session-expired', onExpired)
    return () => window.removeEventListener('shuttle:session-expired', onExpired)
  }, [router, setUser])

  useEffect(() => {
    if (!userId) return
    let active = true
    const load = async () => {
      try {
        const result = await getStudentData()
        if (active) {
          setData(result)
          setUser(result.user)
          setLoadError('')
        }
      } catch (error) {
        if (active) setLoadError(errorMessage(error, 'Campus data could not be loaded.'))
      }
    }
    void load()
    const interval = window.setInterval(() => { void load() }, page === 'live-map' ? 15_000 : 60_000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [page, userId, setUser])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const isAdmin = user?.role === 'admin'
  const pathAllowed = isAdmin ? isAdminPath : !isAdminPath
  const activeLinks = isAdmin ? adminLinks : studentLinks
  const activePage = activeLinks.some((item) => item.slug === page) ? page : 'dashboard'
  const title = pageTitles[activePage] ?? 'Overview'
  const notificationCount = data?.notifications.length ?? 0
  const nav = useMemo(() => activeLinks.map((item) => ({
    ...item,
    href: `${isAdmin ? '/admin' : '/dashboard'}/${item.slug}`,
  })), [activeLinks, isAdmin])

  useEffect(() => {
    if (!user) return
    if (!pathAllowed) {
      router.replace(`${isAdmin ? '/admin' : '/dashboard'}/dashboard`)
      return
    }
    if (!data) return
    if (!activeLinks.some((item) => item.slug === page)) {
      router.replace(`${isAdmin ? '/admin' : '/dashboard'}/dashboard`)
    }
  }, [activeLinks, data, isAdmin, page, pathAllowed, router, user])

  async function logout() {
    try {
      await signOut()
      setUser(null)
      router.replace('/login')
    } catch (error) {
      setToast(errorMessage(error, 'Could not sign out.'))
    }
  }

  if (checkingSession || !user || !data || !pathAllowed) {
    return <main className="workspace-loading" role="status" aria-live="polite"><span className="loading-mark" aria-hidden="true"><Route size={19} /></span><span>{loadError || 'Connecting to your campus workspace…'}</span>{loadError && <Button onClick={() => {
      setLoadError('')
      if (!user) {
        setCheckingSession(true)
        setSessionAttempt((attempt) => attempt + 1)
      } else {
        void refreshData()
      }
    }}>Try again</Button>}</main>
  }

  return <div className="workspace-shell">
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`workspace-sidebar ${mobileOpen ? 'workspace-sidebar--open' : ''}`}>
      <Link href="/" className="wordmark workspace-wordmark"><span className="wordmark-icon"><Route size={18} /></span> Shuttle<span>Tracker</span></Link>
      <div className="campus-card"><span className="campus-monogram">L</span><span><strong>{campusName}</strong><small>{isAdmin ? 'Operations workspace' : 'Student workspace'}</small></span><ChevronRight size={14} /></div>
      <p className="sidebar-label">WORKSPACE</p>
      <nav className="sidebar-nav" aria-label="Workspace navigation">
        {nav.map(({ slug, label, icon: Icon, href }) => <Link href={href} key={slug} onClick={() => setMobileOpen(false)} className={`sidebar-link ${activePage === slug ? 'sidebar-link--active' : ''}`} aria-current={activePage === slug ? 'page' : undefined}>
          <Icon size={17} strokeWidth={1.8} /><span>{label}</span>{slug === 'notifications' && notificationCount > 0 && <span className="sidebar-count">{notificationCount}</span>}
        </Link>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="simulation-note"><span className="simulation-icon"><CircleHelp size={15} /></span><div><strong>Tracking mode</strong><small>Simulated campus positions<br />Not connected to GPS</small></div></div>
        <div className="sidebar-profile">
          <span className="avatar">{initials(user.name)}</span><span className="sidebar-profile-copy"><strong>{user.name}</strong><small>{isAdmin ? 'Administrator' : 'Student account'}</small></span>
          <button type="button" className="logout-icon" title="Sign out" aria-label="Sign out" onClick={() => void logout()}><LogOut size={16} /></button>
        </div>
      </div>
    </aside>
    <main className="workspace-main">
      <header className="workspace-topbar">
        <div className="topbar-leading"><Button className="mobile-nav-button" variant="ghost" size="sm" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></Button><span className="breadcrumb-muted">Campus</span><ChevronRight size={14} /><strong>{title}</strong></div>
        <div className="topbar-actions"><span className="system-status"><i /> API connected</span><Link href={`${isAdmin ? '/admin' : '/dashboard'}/notifications`} className="topbar-notifications" aria-label={`Notifications, ${notificationCount} updates`}><Bell size={17} />{notificationCount > 0 && <i />}</Link><span className="topbar-divider" /><span className="topbar-user">{user.name}</span><span className="avatar avatar--small">{initials(user.name)}</span></div>
      </header>
      <div className="workspace-content">
        {loadError && <div className="inline-error" role="alert">{loadError}<Button size="sm" onClick={() => void refreshData()}>Retry</Button></div>}
        {isAdmin
          ? <AdminPages page={activePage} data={data} onRefresh={refreshData} onNotify={setToast} user={user} />
          : <StudentPages page={activePage} data={data} onRefresh={refreshData} onNotify={setToast} onUserUpdate={setUser} />}
      </div>
      <footer className="workspace-footer"><span>Shuttle Tracker <i>·</i> {campusName}</span><span><ShieldCheck size={14} /> Secure campus session</span></footer>
    </main>
    {toast && <div className="toast-message" role="status"><Activity size={16} />{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button></div>}
  </div>
}
