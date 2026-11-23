import test from 'node:test'
import assert from 'node:assert/strict'
import { simulatedLocation } from './simulation.js'

const stops = [
  { location: { lat: 31.25, lng: 75.7 } },
  { location: { lat: 31.26, lng: 75.71 } },
  { location: { lat: 31.255, lng: 75.72 } },
]

test('simulated positions are stable for the same vehicle and timestamp', () => {
  const first = simulatedLocation('SH-04', 12, stops, 1_800_000_000_000)
  const second = simulatedLocation('SH-04', 12, stops, 1_800_000_000_000)

  assert.deepEqual(first, second)
})

test('simulated positions advance along route stops over time', () => {
  const first = simulatedLocation('SH-04', 12, stops, 1_800_000_000_000)
  const next = simulatedLocation('SH-04', 12, stops, 1_800_000_015_000)

  assert.notDeepEqual(next, first)
  assert.ok(next)
  assert.ok(next.lat >= 31.25 && next.lat <= 31.26)
  assert.ok(next.lng >= 75.7 && next.lng <= 75.72)
})

test('routes without enough stops do not produce a vehicle position', () => {
  assert.equal(simulatedLocation('SH-04', 12, stops.slice(0, 1), 1_800_000_000_000), null)
})
