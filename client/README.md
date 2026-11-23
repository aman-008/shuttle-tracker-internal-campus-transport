# Shuttle Tracker frontend

The frontend is a Next.js App Router application using TypeScript, Tailwind CSS, Axios, Zustand, Lucide, Leaflet, and Recharts.

## Development

Run from the repository root with `npm run dev`. The Next.js app is available at `http://localhost:3000`; the API at `http://localhost:3001` is proxied through `/api`.

The API owns authentication, authorization, validation, and persistence. The browser uses its HttpOnly session cookie; the Zustand store keeps only the current user in memory and does not persist session credentials.

## Production

Build and start from the repository root with `npm run build` and `npm start`. Next.js serves the web application and forwards `/api` requests to the Express API on `API_PORT` (3001 by default).
