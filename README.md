# Shuttle Tracker: Internal Campus Transport

A campus transit application for Lovely Professional University with dedicated student and administrator workspaces. Students can browse routes, stops, and schedules, save favourites, view service updates, and report issues. Administrators can manage the campus fleet and transit network.

## Features

### Students

- Dashboard with campus route and vehicle summaries
- Simulated live campus map and estimated arrivals
- Route, stop, and timetable browsing
- Saved favourite stops and routes
- Campus announcements and service notifications
- Crowding, delay, and other issue reports
- Profile and notification preferences

### Administrators

- Operations overview and fleet monitoring
- Route, stop, vehicle, and schedule management
- Rider report review and status updates
- Student announcements
- User roles and account status management
- Fleet utilization, popular stops, and delay analytics
- Campus service settings

## Technology

- React, TypeScript, and Vite frontend (`client/`)
- Express and Node.js API (`server/`)
- MongoDB with Mongoose
- Bcrypt password hashing and server-side sessions using HttpOnly cookies

Vehicle locations and arrival estimates are simulated. Real GPS tracking requires an authorized campus vehicle data feed.

## Run locally

Requirements: Node.js and a MongoDB instance.

1. Install dependencies:

   ```sh
   npm install
   npm install --prefix client
   ```

2. Create the private API configuration:

   ```sh
   cp server/.env.example server/.env
   ```

   Set `MONGODB_URI`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `server/.env`. Use a unique admin password of 12–72 UTF-8 bytes. Never commit or share this file; it is ignored by Git.

3. Start the API and frontend:

   ```sh
   npm run dev
   ```

   The frontend runs at `http://localhost:5173` and proxies `/api` requests to the API on port 3001.

4. Validate changes:

   ```sh
   npm run build
   npm run lint
   ```

The API seeds sample routes, stops, vehicles, schedules, and campus settings on startup without overwriting existing records. Public registration always creates student accounts; administrator access is provisioned from the server environment.

For production, configure `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `NODE_ENV=production` on the API host. Serve the frontend and API on the same origin or use a reverse proxy for `/api`. Production session cookies require HTTPS.

See [`client/README.md`](client/README.md) for additional setup and authentication details.
