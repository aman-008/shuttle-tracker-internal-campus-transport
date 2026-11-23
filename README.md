# Shuttle Tracker

Shuttle Tracker is a college-project demonstration of an internal campus transport workspace for Lovely Professional University. It provides separate student and administrator interfaces backed by MongoDB.

> **Demonstration notice:** Vehicle movement is simulated by the server. This project does not collect real GPS locations or provide real-time vehicle tracking.

## Architecture

- **Frontend:** Next.js App Router, React 19, TypeScript, Axios, Zustand, Leaflet
- **Backend:** Express 5, Mongoose, bcryptjs
- **Database:** MongoDB
- **Authentication:** HttpOnly, SameSite session cookies stored as hashed tokens in MongoDB
- **Styling:** Responsive CSS dashboard
- **Deployment:** One Render web service; Next.js proxies `/api/*` to the Express API

The frontend polls the API for student data and refreshes live-map data every 15 seconds. The backend calculates sample vehicle positions along configured route stops every 15 seconds.

## Features

- Student registration and sign-in
- Role-protected student and administrator workspaces
- Campus dashboard, routes, stops and timetable
- Saved favourite routes and stops
- Crowd and delay reporting
- Published campus notifications
- Admin fleet, route, stop, schedule and account management
- Report review, analytics and campus settings
- Responsive desktop and mobile navigation
- Loading, retry, empty and form error states

## Demo accounts

The demo student account is seeded automatically:

| Role | Email | Password |
|---|---|---|
| Student | `student@campus.demo` | `StudentDemo123!` |
| Administrator | Configure through `ADMIN_EMAIL` | Configure through `ADMIN_PASSWORD` |

Do not publish real administrator or database passwords. Demo credentials are demonstration values only.

## Local setup

Requirements: Node.js 24 and a reachable MongoDB database.

1. Install dependencies:

   ```sh
   npm ci
   npm ci --prefix client
   ```

2. Create the private server environment file:

   ```sh
   cp server/.env.example server/.env
   ```

3. Set these values in `server/.env`:

   ```text
   MONGODB_URI=<your MongoDB connection string>
   ADMIN_EMAIL=<demo administrator email>
   ADMIN_PASSWORD=<demo administrator password>
   DEMO_STUDENT_EMAIL=student@campus.demo
   DEMO_STUDENT_PASSWORD=StudentDemo123!
   ```

Use a MongoDB database user with read/write access and a unique administrator password of at least 12 characters.

4. Start the application:

   ```sh
   npm run dev
   ```

5. Open `http://localhost:3000`.

Next.js uses port `3000`; the Express API uses port `3001`. The Next.js proxy keeps browser API requests under the same origin.

## Validation

```sh
npm run build
npm run lint
node --test server/simulation.test.js
```

## Deployment

Configure `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional demo account variables as secret environment values. Add the deployment IP to MongoDB Atlas Network Access.

Never place MongoDB credentials or administrator passwords in frontend environment variables or browser storage. Production session cookies require HTTPS.

## Demonstration checklist

- [ ] Start both frontend and backend.
- [ ] Sign in with the administrator account.
- [ ] Verify Overview, shuttles, routes, stops, schedules, users, reports, analytics and settings.
- [ ] Create, edit and delete one demonstration route or stop, then restore the sample data if needed.
- [ ] Sign out and sign in with `student@campus.demo`.
- [ ] Verify the dashboard, live map, routes, stops, timetable, favourites and notifications.
- [ ] Save one favourite stop and one favourite route.
- [ ] Submit a crowd or delay report and resolve it as the administrator.
- [ ] Open the live map and explain that shuttle icons move through a server-side simulation.
