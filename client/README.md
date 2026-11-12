# Shuttle Tracker: Internal Campus Transport

Shuttle Tracker is a responsive campus transit app for Lovely Professional University, with separate student and administrator workspaces backed by MongoDB.

## Features

- Student account signup and sign-in with server-side sessions and MongoDB persistence
- Student dashboard, simulated live map, routes, stops, timetables, and saved favourites
- Student notifications, issue reports, profile, and arrival/announcement preferences
- Admin overview, fleet monitoring, and management for routes, stops, vehicles, schedules, reports, notifications, users, analytics, and campus settings
- Environment-seeded administrator account; public signup always creates student accounts
- Responsive layout for desktop, tablet, and mobile screens

## Run locally

1. Install the root and frontend dependencies:

```sh
npm install
npm install --prefix client
```

2. Configure MongoDB:

```sh
cp server/.env.example server/.env
```

Set `MONGODB_URI` in `server/.env` to your local MongoDB connection string or MongoDB Atlas connection string. For Atlas, create a database user and allow your development IP address in Network Access. Keep the URI private; `server/.env` is ignored by git.

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env` to bootstrap the administrator. The password must be 12–72 UTF-8 bytes. Keep both values private. If they are omitted, the API starts without creating an administrator account.

3. Start the API and frontend together from the project root:

```sh
npm run dev
```

The API connects to MongoDB before it starts listening. The frontend proxies `/api` requests to the API on port 3001. A database or configuration error is reported in the API terminal and on the sign-in form.

Run the production build and lint checks from the project root:

```sh
npm run build
npm run lint
```

For production, set `MONGODB_URI`, `NODE_ENV=production`, and any required `PORT` on the API host. Serve the frontend and API on the same origin, or configure a reverse proxy to forward `/api` to the API. Production sessions use Secure, HttpOnly, SameSite cookies.

## Data and authentication

Sign-up stores the user's name, normalized email, role, preferences, and a bcrypt password hash in MongoDB. Passwords are never stored as plain text. Sign-in checks the hash and creates a random, HttpOnly session cookie; the session token is stored hashed in MongoDB and expires after `SESSION_TTL_DAYS` (30 days by default). Sign-out removes the server-side session. Only an environment-seeded administrator can access admin endpoints; the admin bootstrap promotes the configured email but does not replace an existing account's password.

Routes, stops, vehicles, schedules, reports, notifications, favourites, user preferences, and campus settings are stored in MongoDB. Initial demo routes and fleet records are seeded on API startup without overwriting existing records. Vehicle locations and arrival estimates are simulated; connect an authorized campus vehicle feed for actual GPS tracking and production ETA accuracy.
