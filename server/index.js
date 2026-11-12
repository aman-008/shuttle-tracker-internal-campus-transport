import { createHash, randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import express from 'express'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) })

const app = express()
const port = Number(process.env.PORT ?? 3001)
const mongoUri = process.env.MONGODB_URI
const sessionTtlDays = Number(process.env.SESSION_TTL_DAYS ?? 30)
const sessionCookieName = 'shuttle_session'
const isProduction = process.env.NODE_ENV === 'production'

if (!mongoUri) {
  throw new Error('MONGODB_URI is required. Copy server/.env.example to server/.env and configure your MongoDB connection.')
}
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.')
if (!Number.isInteger(sessionTtlDays) || sessionTtlDays < 1 || sessionTtlDays > 365) {
  throw new Error('SESSION_TTL_DAYS must be between 1 and 365.')
}

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['student', 'admin'], default: 'student', index: true },
  active: { type: Boolean, default: true },
  favoriteStops: { type: [mongoose.Schema.Types.ObjectId], ref: 'Stop', default: [] },
  favoriteRoutes: { type: [mongoose.Schema.Types.ObjectId], ref: 'Route', default: [] },
  preferences: {
    arrivalAlerts: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
  },
}, { timestamps: true })

const sessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true })

const stopSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 240 },
  location: {
    lat: { type: Number, default: 31.25 },
    lng: { type: Number, default: 75.7 },
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

const routeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  color: { type: String, default: '#237f72', match: /^#[0-9a-fA-F]{6}$/ },
  stops: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Stop' }],
  frequencyMinutes: { type: Number, min: 1, max: 180, default: 12 },
  firstTrip: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '07:00' },
  lastTrip: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '22:00' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true })

const vehicleSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  capacity: { type: Number, min: 1, max: 100, default: 20 },
  occupied: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['in_service', 'available', 'maintenance'], default: 'available' },
  location: {
    lat: { type: Number, default: 31.25 },
    lng: { type: Number, default: 75.7 },
  },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true })

const scheduleSchema = new mongoose.Schema({
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  departureTime: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  days: { type: [String], enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  direction: { type: String, default: 'Outbound', maxlength: 80 },
}, { timestamps: true })

const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  stop: { type: mongoose.Schema.Types.ObjectId, ref: 'Stop', default: null },
  type: { type: String, enum: ['crowding', 'delay', 'other'], required: true },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  status: { type: String, enum: ['open', 'reviewed', 'resolved'], default: 'open' },
}, { timestamps: true })

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 1000 },
  type: { type: String, enum: ['announcement', 'delay', 'service'], default: 'announcement' },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

const settingsSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'campus' },
  campusName: { type: String, default: 'Lovely Professional University', maxlength: 120 },
  serviceStart: { type: String, default: '07:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  serviceEnd: { type: String, default: '22:00', match: /^([01]\d|2[0-3]):[0-5]\d$/ },
  serviceDays: { type: [String], default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  announcement: { type: String, default: '', maxlength: 1000 },
}, { timestamps: true })

const User = mongoose.model('User', userSchema)
const Session = mongoose.model('Session', sessionSchema)
const Stop = mongoose.model('Stop', stopSchema)
const Route = mongoose.model('Route', routeSchema)
const Vehicle = mongoose.model('Vehicle', vehicleSchema)
const Schedule = mongoose.model('Schedule', scheduleSchema)
const Report = mongoose.model('Report', reportSchema)
const Notification = mongoose.model('Notification', notificationSchema)
const Settings = mongoose.model('Settings', settingsSchema)

app.disable('x-powered-by')
app.use(express.json({ limit: '20kb', strict: true }))
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait a few minutes and try again.' },
})

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function readSessionCookie(request) {
  const cookies = request.headers.cookie?.split(';') ?? []
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${sessionCookieName}=`))
  const token = entry?.trim().slice(sessionCookieName.length + 1)
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null
}

function setSessionCookie(response, token, expiresAt) {
  const attributes = [`${sessionCookieName}=${token}`, 'HttpOnly', 'Path=/', 'SameSite=Lax', `Expires=${expiresAt.toUTCString()}`]
  if (isProduction) attributes.push('Secure')
  response.setHeader('Set-Cookie', attributes.join('; '))
}

function clearSessionCookie(response) {
  const attributes = [`${sessionCookieName}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0']
  if (isProduction) attributes.push('Secure')
  response.setHeader('Set-Cookie', attributes.join('; '))
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active, preferences: user.preferences }
}

function validEmail(value) {
  return typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateCredentials(body, needsName) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Request body must be a JSON object.'
  if (needsName && (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.trim().length > 100)) {
    return 'Name must be between 2 and 100 characters.'
  }
  if (!validEmail(body.email)) return 'Enter a valid email address.'
  if (typeof body.password !== 'string' || body.password.length < 8 || Buffer.byteLength(body.password, 'utf8') > 72) {
    return 'Password must be between 8 and 72 characters.'
  }
  return null
}

function validId(id) {
  return mongoose.isValidObjectId(id)
}

function badRequest(response, message) {
  return response.status(400).json({ error: message })
}

async function createSession(user, response) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000)
  await Session.create({ tokenHash: hashToken(token), userId: user._id, expiresAt })
  setSessionCookie(response, token, expiresAt)
  return publicUser(user)
}

async function authenticate(request, response, next) {
  try {
    const token = readSessionCookie(request)
    if (!token) return response.status(401).json({ error: 'Sign in to continue.' })
    const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } })
    if (!session) {
      clearSessionCookie(response)
      return response.status(401).json({ error: 'Your session has expired. Please sign in again.' })
    }
    const user = await User.findById(session.userId)
    if (!user || !user.active) {
      await Session.deleteOne({ _id: session._id })
      clearSessionCookie(response)
      return response.status(401).json({ error: 'This account is unavailable. Please contact an administrator.' })
    }
    request.user = user
    request.session = session
    return next()
  } catch (error) {
    return next(error)
  }
}

function requireAdmin(request, response, next) {
  if (request.user?.role !== 'admin') return response.status(403).json({ error: 'Administrator access is required.' })
  return next()
}

function serializeRoute(route) {
  return {
    id: route.id,
    code: route.code,
    name: route.name,
    color: route.color,
    stops: route.stops.map((stop) => typeof stop === 'string' ? stop : stop.name),
    stopIds: route.stops.map((stop) => typeof stop === 'string' ? stop : stop.id),
    frequencyMinutes: route.frequencyMinutes,
    frequency: `Every ${route.frequencyMinutes} min`,
    firstTrip: route.firstTrip,
    lastTrip: route.lastTrip,
    status: route.status,
  }
}

function serializeStop(stop) {
  return { id: stop.id, code: stop.code, name: stop.name, description: stop.description, location: stop.location, status: stop.status }
}

function serializeVehicle(vehicle) {
  return {
    id: vehicle.id,
    code: vehicle.code,
    name: vehicle.name,
    route: vehicle.route ? { id: vehicle.route.id, code: vehicle.route.code, name: vehicle.route.name } : null,
    capacity: vehicle.capacity,
    occupied: vehicle.occupied,
    status: vehicle.status,
    location: vehicle.location,
    updatedAt: vehicle.updatedAt,
  }
}

function serializeSchedule(schedule) {
  return {
    id: schedule.id,
    route: schedule.route ? { id: schedule.route.id, code: schedule.route.code, name: schedule.route.name } : null,
    departureTime: schedule.departureTime,
    days: schedule.days,
    direction: schedule.direction,
  }
}

app.post('/api/auth/signup', authRateLimit, async (request, response, next) => {
  try {
    const validationError = validateCredentials(request.body, true)
    if (validationError) return badRequest(response, validationError)
    const email = request.body.email.trim().toLowerCase()
    const passwordHash = await bcrypt.hash(request.body.password, 12)
    const user = await User.create({ name: request.body.name.trim(), email, passwordHash, role: 'student' })
    return response.status(201).json({ user: await createSession(user, response) })
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' })
    if (error instanceof mongoose.Error && error.name === 'ValidationError') return badRequest(response, 'Please check your account details and try again.')
    return next(error)
  }
})

app.post('/api/auth/login', authRateLimit, async (request, response, next) => {
  try {
    const validationError = validateCredentials(request.body, false)
    if (validationError) return badRequest(response, validationError)
    const user = await User.findOne({ email: request.body.email.trim().toLowerCase() }).select('+passwordHash')
    if (!user || !user.active || !(await bcrypt.compare(request.body.password, user.passwordHash))) {
      return response.status(401).json({ error: 'Email or password is incorrect.' })
    }
    return response.json({ user: await createSession(user, response) })
  } catch (error) {
    return next(error)
  }
})

app.get('/api/auth/me', authenticate, (request, response) => response.json({ user: publicUser(request.user) }))

app.post('/api/auth/logout', async (request, response, next) => {
  try {
    const token = readSessionCookie(request)
    if (token) await Session.deleteOne({ tokenHash: hashToken(token) })
    clearSessionCookie(response)
    return response.status(204).end()
  } catch (error) {
    return next(error)
  }
})

app.get('/api/student/data', authenticate, async (request, response, next) => {
  try {
    const [routes, stops, vehicles, schedules, notifications, reports, settings, students] = await Promise.all([
      Route.find({ status: 'active' }).populate('stops').sort({ code: 1 }),
      Stop.find({ status: 'active' }).sort({ name: 1 }),
      Vehicle.find().populate('route').sort({ code: 1 }),
      Schedule.find().populate('route').sort({ departureTime: 1 }),
      Notification.find().populate('route').sort({ createdAt: -1 }).limit(50),
      Report.find({ user: request.user._id }).populate('route stop').sort({ createdAt: -1 }).limit(20),
      Settings.findOne({ key: 'campus' }),
      User.countDocuments({ active: true, role: 'student' }),
    ])
    const currentUser = await User.findById(request.user._id).populate('favoriteStops favoriteRoutes')
    return response.json({
      user: publicUser(currentUser),
      routes: routes.map(serializeRoute),
      stops: stops.map(serializeStop),
      vehicles: vehicles.map(serializeVehicle),
      schedules: schedules.map(serializeSchedule),
      notifications,
      reports,
      settings,
      summary: { students, activeShuttles: vehicles.filter((vehicle) => vehicle.status === 'in_service').length, routes: routes.length, openDelays: await Report.countDocuments({ type: 'delay', status: 'open' }) },
      favorites: {
        stops: (currentUser.favoriteStops ?? []).map(serializeStop),
        routes: (currentUser.favoriteRoutes ?? []).map(serializeRoute),
      },
    })
  } catch (error) {
    return next(error)
  }
})

app.patch('/api/student/profile', authenticate, async (request, response, next) => {
  try {
    const { name, preferences } = request.body ?? {}
    const update = {}
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return badRequest(response, 'Name must be between 2 and 100 characters.')
      update.name = name.trim()
    }
    if (preferences !== undefined) {
      if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) return badRequest(response, 'Preferences must be an object.')
      for (const key of ['arrivalAlerts', 'announcements']) {
        if (preferences[key] !== undefined && typeof preferences[key] !== 'boolean') return badRequest(response, `${key} must be true or false.`)
      }
      update.preferences = { ...request.user.preferences.toObject(), ...preferences }
    }
    const user = await User.findByIdAndUpdate(request.user._id, { $set: update }, { new: true, runValidators: true })
    return response.json({ user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
})

app.put('/api/student/favorites', authenticate, async (request, response, next) => {
  try {
    const { stopIds, routeIds } = request.body ?? {}
    if (!Array.isArray(stopIds) || !Array.isArray(routeIds) || [...stopIds, ...routeIds].some((id) => !validId(id))) {
      return badRequest(response, 'Favorites must contain valid stopIds and routeIds arrays.')
    }
    const [validStops, validRoutes] = await Promise.all([
      Stop.countDocuments({ _id: { $in: stopIds } }),
      Route.countDocuments({ _id: { $in: routeIds } }),
    ])
    if (validStops !== new Set(stopIds).size || validRoutes !== new Set(routeIds).size) return badRequest(response, 'One or more selected favorites could not be found.')
    const user = await User.findByIdAndUpdate(request.user._id, { favoriteStops: [...new Set(stopIds)], favoriteRoutes: [...new Set(routeIds)] }, { new: true }).populate('favoriteStops favoriteRoutes')
    return response.json({ stops: user.favoriteStops.map(serializeStop), routes: user.favoriteRoutes.map(serializeRoute) })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/student/reports', authenticate, async (request, response, next) => {
  try {
    const { type, message, routeId, stopId } = request.body ?? {}
    if (!['crowding', 'delay', 'other'].includes(type)) return badRequest(response, 'Choose crowding, delay, or other for your report.')
    if (typeof message !== 'string' || message.trim().length < 3 || message.trim().length > 500) return badRequest(response, 'Report details must be between 3 and 500 characters.')
    if (routeId && !validId(routeId)) return badRequest(response, 'Choose a valid route.')
    if (stopId && !validId(stopId)) return badRequest(response, 'Choose a valid stop.')
    const [route, stop] = await Promise.all([
      routeId ? Route.findById(routeId) : null,
      stopId ? Stop.findById(stopId) : null,
    ])
    if (routeId && !route) return badRequest(response, 'The selected route could not be found.')
    if (stopId && !stop) return badRequest(response, 'The selected stop could not be found.')
    const report = await Report.create({ user: request.user._id, route: route?._id, stop: stop?._id, type, message: message.trim() })
    return response.status(201).json({ report })
  } catch (error) {
    return next(error)
  }
})

app.use('/api/admin', authenticate, requireAdmin)

app.get('/api/admin/overview', async (request, response, next) => {
  try {
    const [students, activeShuttles, routes, openDelays, openReports, settings] = await Promise.all([
      User.countDocuments({ role: 'student', active: true }),
      Vehicle.countDocuments({ status: 'in_service' }),
      Route.countDocuments({ status: 'active' }),
      Report.countDocuments({ type: 'delay', status: 'open' }),
      Report.countDocuments({ status: 'open' }),
      Settings.findOne({ key: 'campus' }),
    ])
    return response.json({ students, activeShuttles, routes, openDelays, openReports, systemStatus: mongoose.connection.readyState === 1 ? 'Operational' : 'Database disconnected', settings })
  } catch (error) {
    return next(error)
  }
})

app.get('/api/admin/routes', async (request, response, next) => {
  try {
    const routes = await Route.find().populate('stops').sort({ code: 1 })
    return response.json(routes.map(serializeRoute))
  } catch (error) { return next(error) }
})

app.post('/api/admin/routes', async (request, response, next) => {
  try {
    const { code, name, color, stopIds = [], frequencyMinutes, firstTrip, lastTrip, status } = request.body ?? {}
    if (typeof code !== 'string' || !/^[A-Z0-9-]{2,12}$/i.test(code)) return badRequest(response, 'Route code must be 2–12 letters, numbers, or hyphens.')
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return badRequest(response, 'Route name must be between 2 and 100 characters.')
    if (!Array.isArray(stopIds) || stopIds.some((id) => !validId(id))) return badRequest(response, 'Select valid stops for the route.')
    const stops = await Stop.find({ _id: { $in: stopIds } })
    if (stops.length !== new Set(stopIds).size) return badRequest(response, 'One or more selected stops could not be found.')
    const route = await Route.create({ code, name: name.trim(), color, stops: stopIds, frequencyMinutes, firstTrip, lastTrip, status })
    return response.status(201).json(serializeRoute(await route.populate('stops')))
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: 'A route with this code already exists.' })
    if (error instanceof mongoose.Error.ValidationError) return badRequest(response, 'Check the route details, times, and frequency.')
    return next(error)
  }
})

app.patch('/api/admin/routes/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return badRequest(response, 'Invalid route id.')
    const allowed = ['code', 'name', 'color', 'frequencyMinutes', 'firstTrip', 'lastTrip', 'status']
    const update = Object.fromEntries(allowed.filter((key) => request.body?.[key] !== undefined).map((key) => [key, request.body[key]]))
    if (request.body?.stopIds !== undefined) {
      if (!Array.isArray(request.body.stopIds) || request.body.stopIds.some((id) => !validId(id))) return badRequest(response, 'Select valid stops for the route.')
      const count = await Stop.countDocuments({ _id: { $in: request.body.stopIds } })
      if (count !== new Set(request.body.stopIds).size) return badRequest(response, 'One or more selected stops could not be found.')
      update.stops = request.body.stopIds
    }
    if (update.code !== undefined) update.code = String(update.code).toUpperCase()
    const route = await Route.findByIdAndUpdate(request.params.id, update, { new: true, runValidators: true }).populate('stops')
    if (!route) return response.status(404).json({ error: 'Route not found.' })
    return response.json(serializeRoute(route))
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: 'A route with this code already exists.' })
    if (error instanceof mongoose.Error.ValidationError) return badRequest(response, 'Check the route details, times, and frequency.')
    return next(error)
  }
})

app.delete('/api/admin/routes/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return badRequest(response, 'Invalid route id.')
    const route = await Route.findByIdAndDelete(request.params.id)
    if (!route) return response.status(404).json({ error: 'Route not found.' })
    await Promise.all([
      Schedule.deleteMany({ route: route._id }),
      Vehicle.updateMany({ route: route._id }, { $set: { route: null, status: 'available' } }),
      User.updateMany({}, { $pull: { favoriteRoutes: route._id } }),
    ])
    return response.status(204).end()
  } catch (error) { return next(error) }
})

app.get('/api/admin/stops', async (request, response, next) => {
  try { return response.json((await Stop.find().sort({ name: 1 })).map(serializeStop)) } catch (error) { return next(error) }
})

app.post('/api/admin/stops', async (request, response, next) => {
  try {
    const { code, name, description = '', location, status } = request.body ?? {}
    if (typeof code !== 'string' || !/^[A-Z0-9-]{2,12}$/i.test(code)) return badRequest(response, 'Stop code must be 2–12 letters, numbers, or hyphens.')
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return badRequest(response, 'Stop name must be between 2 and 100 characters.')
    const stop = await Stop.create({ code, name: name.trim(), description, location, status })
    return response.status(201).json(serializeStop(stop))
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: 'A stop with this code already exists.' })
    if (error instanceof mongoose.Error.ValidationError) return badRequest(response, 'Check the stop details.')
    return next(error)
  }
})

app.patch('/api/admin/stops/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return badRequest(response, 'Invalid stop id.')
    const allowed = ['code', 'name', 'description', 'location', 'status']
    const update = Object.fromEntries(allowed.filter((key) => request.body?.[key] !== undefined).map((key) => [key, request.body[key]]))
    if (update.code !== undefined) update.code = String(update.code).toUpperCase()
    const stop = await Stop.findByIdAndUpdate(request.params.id, update, { new: true, runValidators: true })
    if (!stop) return response.status(404).json({ error: 'Stop not found.' })
    return response.json(serializeStop(stop))
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: 'A stop with this code already exists.' })
    if (error instanceof mongoose.Error.ValidationError) return badRequest(response, 'Check the stop details.')
    return next(error)
  }
})

app.delete('/api/admin/stops/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return badRequest(response, 'Invalid stop id.')
    const stop = await Stop.findByIdAndDelete(request.params.id)
    if (!stop) return response.status(404).json({ error: 'Stop not found.' })
    await Promise.all([
      Route.updateMany({ stops: stop._id }, { $pull: { stops: stop._id } }),
      User.updateMany({}, { $pull: { favoriteStops: stop._id } }),
    ])
    return response.status(204).end()
  } catch (error) { return next(error) }
})

app.get('/api/admin/vehicles', async (request, response, next) => {
  try { return response.json((await Vehicle.find().populate('route').sort({ code: 1 })).map(serializeVehicle)) } catch (error) { return next(error) }
})

app.post('/api/admin/vehicles', async (request, response, next) => {
  try {
    const { code, name, routeId, capacity, occupied, status, location } = request.body ?? {}
    if (typeof code !== 'string' || !/^[A-Z0-9-]{2,12}$/i.test(code)) return badRequest(response, 'Vehicle code must be 2–12 letters, numbers, or hyphens.')
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) return badRequest(response, 'Vehicle name must be between 2 and 100 characters.')
    if (routeId && !validId(routeId)) return badRequest(response, 'Select a valid route.')
    if (routeId && !(await Route.exists({ _id: routeId }))) return badRequest(response, 'The selected route could not be found.')
    const vehicle = await Vehicle.create({ code, name: name.trim(), route: routeId || null, capacity, occupied, status, location })
    return response.status(201).json(serializeVehicle(await vehicle.populate('route')))
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: 'A vehicle with this code already exists.' })
    if (error instanceof mongoose.Error.ValidationError) return badRequest(response, 'Check the vehicle details and capacity.')
    return next(error)
  }
})

app.patch('/api/admin/vehicles/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return badRequest(response, 'Invalid vehicle id.')
    const allowed = ['code', 'name', 'capacity', 'occupied', 'status', 'location']
    const update = Object.fromEntries(allowed.filter((key) => request.body?.[key] !== undefined).map((key) => [key, request.body[key]]))
    if (request.body?.routeId !== undefined) {
      if (request.body.routeId && !validId(request.body.routeId)) return badRequest(response, 'Select a valid route.')
      if (request.body.routeId && !(await Route.exists({ _id: request.body.routeId }))) return badRequest(response, 'The selected route could not be found.')
      update.route = request.body.routeId || null
    }
    if (update.code !== undefined) update.code = String(update.code).toUpperCase()
    if (update.occupied !== undefined && update.capacity !== undefined && update.occupied > update.capacity) return badRequest(response, 'Occupied seats cannot exceed vehicle capacity.')
    const vehicle = await Vehicle.findByIdAndUpdate(request.params.id, update, { new: true, runValidators: true }).populate('route')
    if (!vehicle) return response.status(404).json({ error: 'Vehicle not found.' })
    if (vehicle.occupied > vehicle.capacity) return badRequest(response, 'Occupied seats cannot exceed vehicle capacity.')
    return response.json(serializeVehicle(vehicle))
  } catch (error) {
    if (error?.code === 11000) return response.status(409).json({ error: 'A vehicle with this code already exists.' })
    if (error instanceof mongoose.Error.ValidationError) return badRequest(response, 'Check the vehicle details and capacity.')
    return next(error)
  }
})

app.delete('/api/admin/vehicles/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return badRequest(response, 'Invalid vehicle id.')
    const vehicle = await Vehicle.findByIdAndDelete(request.params.id)
    if (!vehicle) return response.status(404).json({ error: 'Vehicle not found.' })
    return response.status(204).end()
  } catch (error) { return next(error) }
})

app.get('/api/admin/schedules', async (request, response, next) => {
  try { return response.json((await Schedule.find().populate('route').sort({ departureTime: 1 })).map(serializeSchedule)) } catch (error) { return next(error) }
})

app.post('/api/admin/schedules', async (request, response, next) => {
  try {
    const { routeId, departureTime, days, direction } = request.body ?? {}
    if (!validId(routeId) || !(await Route.exists({ _id: routeId }))) return badRequest(response, 'Choose a valid route.')
    if (typeof departureTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(departureTime)) return badRequest(response, 'Enter a valid departure time.')
    if (days !== undefined && (!Array.isArray(days) || days.some((day) => !['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(day)))) return badRequest(response, 'Choose valid service days.')
    const schedule = await Schedule.create({ route: routeId, departureTime, days, direction })
    return response.status(201).json(serializeSchedule(await schedule.populate('route')))
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return badRequest(response, 'Check the timetable details.')
    return next(error)
  }
})

app.patch('/api/admin/schedules/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return badRequest(response, 'Invalid schedule id.')
    const update = {}
    if (request.body?.departureTime !== undefined) update.departureTime = request.body.departureTime
    if (request.body?.days !== undefined) update.days = request.body.days
    if (request.body?.direction !== undefined) update.direction = request.body.direction
    if (request.body?.routeId !== undefined) {
      if (!validId(request.body.routeId) || !(await Route.exists({ _id: request.body.routeId }))) return badRequest(response, 'Choose a valid route.')
      update.route = request.body.routeId
    }
    const schedule = await Schedule.findByIdAndUpdate(request.params.id, update, { new: true, runValidators: true }).populate('route')
    if (!schedule) return response.status(404).json({ error: 'Schedule not found.' })
    return response.json(serializeSchedule(schedule))
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return badRequest(response, 'Check the timetable details.')
    return next(error)
  }
})

app.delete('/api/admin/schedules/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return badRequest(response, 'Invalid schedule id.')
    const schedule = await Schedule.findByIdAndDelete(request.params.id)
    if (!schedule) return response.status(404).json({ error: 'Schedule not found.' })
    return response.status(204).end()
  } catch (error) { return next(error) }
})

app.get('/api/admin/reports', async (request, response, next) => {
  try {
    const reports = await Report.find().populate('route stop user', 'name email code title').sort({ createdAt: -1 }).limit(200)
    return response.json(reports)
  } catch (error) { return next(error) }
})

app.patch('/api/admin/reports/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return badRequest(response, 'Invalid report id.')
    if (!['open', 'reviewed', 'resolved'].includes(request.body?.status)) return badRequest(response, 'Choose open, reviewed, or resolved.')
    const report = await Report.findByIdAndUpdate(request.params.id, { status: request.body.status }, { new: true, runValidators: true }).populate('route stop user', 'name email code')
    if (!report) return response.status(404).json({ error: 'Report not found.' })
    return response.json(report)
  } catch (error) { return next(error) }
})

app.post('/api/admin/notifications', async (request, response, next) => {
  try {
    const { title, message, type = 'announcement', routeId } = request.body ?? {}
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) return badRequest(response, 'Announcement title must be between 3 and 120 characters.')
    if (typeof message !== 'string' || message.trim().length < 3 || message.trim().length > 1000) return badRequest(response, 'Announcement message must be between 3 and 1000 characters.')
    if (!['announcement', 'delay', 'service'].includes(type)) return badRequest(response, 'Choose announcement, delay, or service.')
    if (routeId && (!validId(routeId) || !(await Route.exists({ _id: routeId })))) return badRequest(response, 'Choose a valid route.')
    const notification = await Notification.create({ title: title.trim(), message: message.trim(), type, route: routeId || null, author: request.user._id })
    return response.status(201).json(await notification.populate('route'))
  } catch (error) { return next(error) }
})

app.get('/api/admin/users', async (request, response, next) => {
  try {
    const users = await User.find().select('name email role active createdAt preferences').sort({ createdAt: -1 }).limit(500)
    return response.json(users)
  } catch (error) { return next(error) }
})

app.patch('/api/admin/users/:id', async (request, response, next) => {
  try {
    if (!validId(request.params.id)) return badRequest(response, 'Invalid user id.')
    if (request.params.id === request.user.id && (request.body?.role === 'student' || request.body?.active === false)) {
      return response.status(409).json({ error: 'You cannot remove your own administrator access or deactivate your own account.' })
    }
    const update = {}
    if (request.body?.role !== undefined) {
      if (!['student', 'admin'].includes(request.body.role)) return badRequest(response, 'Role must be student or admin.')
      update.role = request.body.role
    }
    if (request.body?.active !== undefined) {
      if (typeof request.body.active !== 'boolean') return badRequest(response, 'Active must be true or false.')
      update.active = request.body.active
    }
    const target = await User.findById(request.params.id)
    if (!target) return response.status(404).json({ error: 'User not found.' })
    if ((update.role === 'student' || update.active === false) && target.role === 'admin' && target.active) {
      const activeAdmins = await User.countDocuments({ role: 'admin', active: true })
      if (activeAdmins <= 1) return response.status(409).json({ error: 'At least one active administrator must remain.' })
    }
    const user = await User.findByIdAndUpdate(request.params.id, update, { new: true, runValidators: true }).select('name email role active createdAt preferences')
    if (!user.active) await Session.deleteMany({ userId: user._id })
    return response.json(user)
  } catch (error) { return next(error) }
})

app.get('/api/admin/analytics', async (request, response, next) => {
  try {
    const [utilization, stopPopularity, delaysByRoute, reportCounts] = await Promise.all([
      Vehicle.aggregate([{ $group: { _id: null, total: { $sum: 1 }, occupied: { $sum: '$occupied' }, capacity: { $sum: '$capacity' } } }]),
      Route.aggregate([{ $unwind: '$stops' }, { $group: { _id: '$stops', routeCount: { $sum: 1 } } }, { $sort: { routeCount: -1 } }, { $limit: 10 }, { $lookup: { from: 'stops', localField: '_id', foreignField: '_id', as: 'stop' } }, { $unwind: '$stop' }, { $project: { name: '$stop.name', routeCount: 1 } }]),
      Report.aggregate([{ $match: { type: 'delay' } }, { $group: { _id: '$route', count: { $sum: 1 } } }, { $lookup: { from: 'routes', localField: '_id', foreignField: '_id', as: 'route' } }, { $unwind: { path: '$route', preserveNullAndEmptyArrays: true } }, { $project: { route: { $ifNull: ['$route.name', 'Unassigned'] }, count: 1 } }, { $sort: { count: -1 } }]),
      Report.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    ])
    const fleet = utilization[0] ?? { total: 0, occupied: 0, capacity: 0 }
    return response.json({
      vehicles: fleet.total,
      utilizationPercent: fleet.capacity ? Math.round((fleet.occupied / fleet.capacity) * 100) : 0,
      occupancy: { occupied: fleet.occupied, capacity: fleet.capacity },
      popularStops: stopPopularity,
      delaysByRoute,
      reports: reportCounts,
    })
  } catch (error) { return next(error) }
})

app.patch('/api/admin/settings', async (request, response, next) => {
  try {
    const allowed = ['campusName', 'serviceStart', 'serviceEnd', 'serviceDays', 'announcement']
    const update = Object.fromEntries(allowed.filter((key) => request.body?.[key] !== undefined).map((key) => [key, request.body[key]]))
    if (!Object.keys(update).length) return badRequest(response, 'Provide at least one setting to update.')
    const settings = await Settings.findOneAndUpdate({ key: 'campus' }, { $set: update, $setOnInsert: { key: 'campus' } }, { new: true, upsert: true, runValidators: true })
    return response.json(settings)
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) return badRequest(response, 'Check the transport settings.')
    return next(error)
  }
})

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))

const clientDist = fileURLToPath(new URL('../client/dist/', import.meta.url))
if (existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('/{*path}', (request, response, next) => {
    if (request.path.startsWith('/api/')) return next()
    return response.sendFile(join(clientDist, 'index.html'), (error) => {
      if (error) next(error)
    })
  })
}

app.use((error, request, response, _next) => {
  if (response.headersSent) return
  if (error instanceof SyntaxError && 'body' in error) return response.status(400).json({ error: 'Request body must be valid JSON.' })
  console.error('API request failed:', error)
  return response.status(500).json({ error: 'The service encountered an unexpected error. Please try again.' })
})

async function seedInitialData() {
  const defaults = [
    { code: 'MAIN-GATE', name: 'Main Gate', description: 'Main campus entrance', location: { lat: 31.253, lng: 75.704 } },
    { code: 'LIBRARY', name: 'Library', description: 'Central library stop', location: { lat: 31.255, lng: 75.708 } },
    { code: 'SCIENCE', name: 'Science Block', description: 'Science and labs', location: { lat: 31.258, lng: 75.705 } },
    { code: 'N-HOSTEL', name: 'North Hostel', description: 'North residence pickup', location: { lat: 31.257, lng: 75.713 } },
    { code: 'SPORTS', name: 'Sports Complex', description: 'Sports ground entrance', location: { lat: 31.254, lng: 75.699 } },
    { code: 'ADMIN', name: 'Admin Block', description: 'Administration building', location: { lat: 31.251, lng: 75.707 } },
    { code: 'CAFETERIA', name: 'Cafeteria', description: 'Main campus cafeteria', location: { lat: 31.26, lng: 75.711 } },
    { code: 'S-HOSTEL', name: 'South Hostel', description: 'South residence pickup', location: { lat: 31.25, lng: 75.714 } },
    { code: 'AUDITORIUM', name: 'Auditorium', description: 'University auditorium', location: { lat: 31.252, lng: 75.716 } },
  ]
  for (const stop of defaults) await Stop.updateOne({ code: stop.code }, { $setOnInsert: stop }, { upsert: true })
  const stops = await Stop.find()
  const byName = new Map(stops.map((stop) => [stop.name, stop._id]))
  const routeDefaults = [
    { code: 'R1', name: 'North Campus Loop', color: '#237f72', stopNames: ['Main Gate', 'Library', 'Science Block', 'North Hostel', 'Sports Complex'], frequencyMinutes: 12, firstTrip: '07:00', lastTrip: '22:00' },
    { code: 'R2', name: 'South Campus Express', color: '#e48b48', stopNames: ['Main Gate', 'Admin Block', 'Cafeteria', 'South Hostel', 'Auditorium'], frequencyMinutes: 8, firstTrip: '07:30', lastTrip: '21:30' },
    { code: 'R3', name: 'Hostel Connector', color: '#8474c8', stopNames: ['North Hostel', 'Library', 'Cafeteria', 'South Hostel'], frequencyMinutes: 15, firstTrip: '08:00', lastTrip: '22:00' },
  ]
  for (const route of routeDefaults) {
    await Route.updateOne({ code: route.code }, {
      $setOnInsert: { ...route, stops: route.stopNames.map((name) => byName.get(name)), stopNames: undefined },
    }, { upsert: true })
  }
  const routes = await Route.find()
  const routeByCode = new Map(routes.map((route) => [route.code, route._id]))
  const vehicleDefaults = [
    { code: 'SH-04', name: 'E-Shuttle 04', route: 'R1', capacity: 24, occupied: 14, status: 'in_service', location: { lat: 31.255, lng: 75.708 } },
    { code: 'ER-12', name: 'E-Rickshaw 12', route: 'R2', capacity: 8, occupied: 6, status: 'in_service', location: { lat: 31.251, lng: 75.707 } },
    { code: 'SH-02', name: 'E-Shuttle 02', route: 'R3', capacity: 20, occupied: 8, status: 'in_service', location: { lat: 31.257, lng: 75.713 } },
  ]
  for (const vehicle of vehicleDefaults) {
    const { route, ...fields } = vehicle
    await Vehicle.updateOne({ code: vehicle.code }, { $setOnInsert: { ...fields, route: routeByCode.get(route) } }, { upsert: true })
  }
  for (const [routeCode, departures] of Object.entries({ R1: ['07:00', '07:12', '07:24', '08:00', '08:12', '12:00', '16:00', '20:00'], R2: ['07:30', '07:38', '07:46', '08:00', '12:00', '16:00', '21:30'], R3: ['08:00', '08:15', '08:30', '12:00', '16:00', '20:00'] })) {
    const route = routeByCode.get(routeCode)
    for (const departureTime of departures) {
      await Schedule.updateOne({ route, departureTime, direction: 'Outbound' }, { $setOnInsert: { route, departureTime, direction: 'Outbound' } }, { upsert: true })
    }
  }
  await Settings.updateOne({ key: 'campus' }, { $setOnInsert: { key: 'campus', campusName: 'Lovely Professional University', serviceStart: '07:00', serviceEnd: '22:00' } }, { upsert: true })
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  if (!email && !password) {
    console.warn('ADMIN_EMAIL and ADMIN_PASSWORD are not configured; no administrator bootstrap account was created.')
    return
  }
  if (!validEmail(email) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Set a valid ADMIN_EMAIL and an ADMIN_PASSWORD of 12–72 bytes in server/.env to bootstrap an administrator.')
  }
  const passwordHash = await bcrypt.hash(password, 12)
  const result = await User.updateOne(
    { email },
    { $setOnInsert: { name: 'Transport Administrator', email, passwordHash }, $set: { role: 'admin', active: true } },
    { upsert: true },
  )
  if (result.upsertedCount) console.log('Created the configured transport administrator account.')
  else console.log('Ensured the configured transport administrator account has administrator access.')
}

await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10_000 })
console.log(`Connected to MongoDB database "${mongoose.connection.name}".`)
await seedInitialData()
await seedAdmin()

const server = app.listen(port, () => console.log(`Shuttle Tracker API listening on http://localhost:${port}`))

async function shutdown(signal) {
  console.log(`${signal} received. Shutting down...`)
  server.close(async (error) => {
    if (error) {
      console.error('Could not close the HTTP server cleanly:', error)
      process.exitCode = 1
    }
    await mongoose.disconnect()
  })
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))
