import Link from 'next/link'
import { ArrowDownRight, ArrowRight, BusFront, CircleDot, Clock3, MapPin, MoveUpRight, Route } from 'lucide-react'

const highlights = [
  { icon: MapPin, title: 'Know where to go', copy: 'Campus stops and route details, always within reach.' },
  { icon: Clock3, title: 'Plan your day', copy: 'Check scheduled departures before you head out.' },
  { icon: BusFront, title: 'Find your shuttle', copy: 'See simulated vehicle positions and estimated arrivals.' },
]

export default function HomePage() {
  return <main className="landing">
    <header className="landing-nav">
      <Link href="/" className="wordmark"><span className="wordmark-icon"><Route size={19} /></span> Shuttle<span>Tracker</span></Link>
      <nav aria-label="Public navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#features">Features</a>
      </nav>
      <div className="landing-actions"><Link href="/login" className="nav-signin">Sign in</Link><Link href="/register" className="button button--primary button--sm">Get started <ArrowRight size={15} /></Link></div>
    </header>
    <section className="landing-hero">
      <div className="hero-copy">
        <div className="eyebrow"><span className="status-dot" /> CAMPUS TRANSIT, CONNECTED</div>
        <h1>Make every<br />campus minute <span>count.</span></h1>
        <p>Find your next shuttle, check arrivals, and move between classes with less waiting and more confidence.</p>
        <div className="hero-actions"><Link href="/register" className="button button--primary">Get started <ArrowRight size={16} /></Link><Link href="/login" className="button button--ghost">Sign in to your account <MoveUpRight size={15} /></Link></div>
        <div className="hero-trust"><span><CircleDot size={13} /> Built for campus life</span><i /> Student and operations workspaces</div>
      </div>
      <div className="hero-visual" aria-label="Illustration of a shuttle route map">
        <div className="hero-visual-top"><span className="live-pill"><i /> CAMPUS NETWORK</span><span className="visual-coordinate">31°15&apos; N&nbsp; / &nbsp;75°42&apos; E</span></div>
        <div className="abstract-map">
          <div className="map-grid" />
          <svg viewBox="0 0 640 410" role="img" aria-label="Illustrated campus shuttle route">
            <path className="map-road" d="M-25 289 128 228l106-94 133 25 139-95 170 67M65-18l35 107 97 82 43 114 1 152m189-475-35 93 9 100 74 107 14 150m188-485-21 94-73 80-5 100 50 131" />
            <path className="map-road-line" d="M-25 289 128 228l106-94 133 25 139-95 170 67M65-18l35 107 97 82 43 114 1 152m189-475-35 93 9 100 74 107 14 150m188-485-21 94-73 80-5 100 50 131" />
            <path className="map-route" d="M46 269c92-25 116-102 196-132s121 89 203 44 111-100 167-83" />
            <path className="map-route-alt" d="M98 57c40 105 137 117 168 160s86 82 194 74 128-70 185-65" />
            <g className="map-stop"><circle cx="46" cy="269" r="9" /><circle cx="242" cy="137" r="9" /><circle cx="445" cy="181" r="9" /><circle cx="612" cy="98" r="9" /><circle cx="460" cy="291" r="9" /></g>
            <g className="map-shuttle" transform="translate(357 148)"><circle r="23" /><rect x="-10" y="-8" width="20" height="16" rx="4" /><path d="M-6 2h12M-6-4h.1M6-4h.1" /></g>
          </svg>
          <span className="map-place map-place--one">Main Gate</span><span className="map-place map-place--two">Library</span><span className="map-place map-place--three">North Hostel</span>
          <div className="route-float"><span className="route-float-icon"><BusFront size={16} /></span><span><strong>North Campus Loop</strong><small>Shuttle position is simulated</small></span><ArrowDownRight size={15} /></div>
        </div>
        <div className="hero-visual-footer"><span><i className="legend-line" /> Campus route</span><span><i className="legend-point" /> Pickup stop</span><span className="map-coordinates">Lovely Professional University</span></div>
      </div>
    </section>
    <section className="landing-proof" id="how-it-works">
      <span className="proof-caption">A smoother campus commute starts here</span>
      <span className="proof-divider" />
      <span className="proof-item"><MapPin size={16} /> Explore routes and stops</span>
      <span className="proof-item"><Clock3 size={16} /> Check schedules</span>
      <span className="proof-item"><BusFront size={16} /> Track campus shuttles</span>
    </section>
    <section className="landing-features" id="features">
      <div className="features-heading"><div><div className="eyebrow">YOUR CAMPUS, IN MOTION</div><h2>One place for your whole ride.</h2></div><p>Useful transit information for students. Clear operational tools for the people who keep campus moving.</p></div>
      <div className="feature-grid">{highlights.map(({ icon: Icon, title, copy }, index) => <article className="feature-card" key={title}><span className={`feature-icon feature-icon--${index}`}><Icon size={18} /></span><h3>{title}</h3><p>{copy}</p><span className="feature-index">0{index + 1}</span></article>)}</div>
    </section>
    <footer className="landing-footer"><Link href="/" className="wordmark"><span className="wordmark-icon"><Route size={16} /></span> Shuttle<span>Tracker</span></Link><span>Campus mobility, made clearer.</span><Link href="/login">Access your workspace <ArrowRight size={14} /></Link></footer>
  </main>
}
