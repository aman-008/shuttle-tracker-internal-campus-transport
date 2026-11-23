'use client'

import dynamic from 'next/dynamic'
import type { Route, Stop, Vehicle } from '@/lib/api'

const MapContents = dynamic(() => import('./map-contents'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading campus map…</div>,
})

export function MapView({ routes, stops, vehicles, selectedRouteId }: {
  routes: Route[]
  stops: Stop[]
  vehicles: Vehicle[]
  selectedRouteId?: string
}) {
  return <div className="map-frame">
    <MapContents routes={routes} stops={stops} vehicles={vehicles} selectedRouteId={selectedRouteId} />
  </div>
}
