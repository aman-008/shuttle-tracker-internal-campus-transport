export function simulatedLocation(vehicleCode, frequencyMinutes, stops, now = Date.now()) {
  if (stops.length < 2) return null

  const durationSeconds = Math.max(120, frequencyMinutes * 60)
  const phaseOffset = [...vehicleCode].reduce((total, character) => total + character.charCodeAt(0), 0)
  const progress = ((Math.floor(now / 1000) + phaseOffset) % durationSeconds) / durationSeconds * stops.length
  const segment = Math.floor(progress) % stops.length
  const nextStop = (segment + 1) % stops.length
  const segmentProgress = progress - Math.floor(progress)
  const start = stops[segment].location
  const end = stops[nextStop].location

  return {
    lat: start.lat + (end.lat - start.lat) * segmentProgress,
    lng: start.lng + (end.lng - start.lng) * segmentProgress,
  }
}
