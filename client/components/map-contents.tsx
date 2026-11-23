'use client'

import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import type { Route, Stop, Vehicle } from '@/lib/api'
import { distanceKm, nextArrivalMinutes } from '@/lib/utils'

const shuttleMarker = L.divIcon({
  className: 'shuttle-marker',
  html: '<span class="shuttle-marker-glyph">↗</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

const stopMarker = L.divIcon({
  className: 'stop-marker',
  html: '<span class="stop-marker-glyph"></span>',
  iconSize: [17, 17],
  iconAnchor: [8, 8],
})

function FitCampus({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = points.map((point) => point.join(',')).join(';')
  useEffect(() => {
    const positions = key ? key.split(';').map((point) => point.split(',').map(Number) as [number, number]) : []
    if (positions.length > 1) map.fitBounds(positions, { padding: [38, 38], maxZoom: 16 })
    else if (positions.length === 1) map.setView(positions[0], 15)
  }, [key, map])
  return null
}

export default function MapContents({ routes, stops, vehicles, selectedRouteId }: {
  routes: Route[]
  stops: Stop[]
  vehicles: Vehicle[]
  selectedRouteId?: string
}) {
  const stopById = new Map(stops.map((stop) => [stop.id, stop]))
  const focusRoutes = selectedRouteId ? routes.filter((route) => route.id === selectedRouteId) : routes
  const routePositions = focusRoutes.map((route) => ({
    route,
    positions: route.stopIds
      .map((id) => stopById.get(id))
      .filter((stop): stop is Stop => Boolean(stop))
      .map((stop) => [stop.location.lat, stop.location.lng] as [number, number]),
  })).filter((item) => item.positions.length > 1)
  const visibleStops = selectedRouteId
    ? stops.filter((stop) => focusRoutes.some((route) => route.stopIds.includes(stop.id)))
    : stops
  const visibleVehicles = selectedRouteId
    ? vehicles.filter((vehicle) => vehicle.route?.id === selectedRouteId)
    : vehicles
  const bounds = [
    ...routePositions.flatMap((item) => item.positions),
    ...visibleStops.map((stop) => [stop.location.lat, stop.location.lng] as [number, number]),
    ...visibleVehicles.map((vehicle) => [vehicle.location.lat, vehicle.location.lng] as [number, number]),
  ]

  return <MapContainer center={[31.255, 75.707]} zoom={15} scrollWheelZoom className="leaflet-map">
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
    />
    <FitCampus points={bounds} />
    {routePositions.map(({ route, positions }) => <Polyline
      key={route.id}
      positions={positions}
      pathOptions={{ color: route.color, weight: 4, opacity: selectedRouteId ? 0.95 : 0.72 }}
    />)}
    {visibleStops.map((stop) => <Marker key={stop.id} position={[stop.location.lat, stop.location.lng]} icon={stopMarker}>
      <Popup><div className="map-popup"><strong>{stop.name}</strong><span>{stop.code} · Campus stop</span></div></Popup>
    </Marker>)}
    {visibleVehicles.map((vehicle) => {
      const vehicleRoute = routes.find((route) => route.id === vehicle.route?.id)
      const orderedStops = vehicleRoute?.stopIds.map((id) => stopById.get(id)).filter((stop): stop is Stop => Boolean(stop)) ?? []
      const closestIndex = orderedStops.reduce((closest, stop, index) => {
        const closestStop = orderedStops[closest]
        return closestStop && distanceKm(vehicle.location, stop.location) < distanceKm(vehicle.location, closestStop.location) ? index : closest
      }, 0)
      const nextStop = orderedStops.length ? orderedStops[(closestIndex + 1) % orderedStops.length] : undefined
      return <Marker key={vehicle.id} position={[vehicle.location.lat, vehicle.location.lng]} icon={shuttleMarker}>
        <Popup><div className="map-popup"><strong>{vehicle.name}</strong><span>{vehicle.code} · {vehicle.route?.code ?? 'Unassigned'}</span><span className="popup-status">{vehicle.status.replace('_', ' ')} · {vehicle.occupied}/{vehicle.capacity} riders</span>{nextStop && <span>Est. {nextArrivalMinutes(vehicle, nextStop)} min to {nextStop.name}</span>}<span>Simulated position · not GPS</span></div></Popup>
      </Marker>
    })}
  </MapContainer>
}
