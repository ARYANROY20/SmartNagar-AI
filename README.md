# SmartNagar AI

SmartNagar AI is a civic issue reporting platform for citizens and city administrators. Citizens can report local infrastructure issues with images and location data, while administrators can review complaints, update statuses, assign work, view heatmaps, and track resolution progress.

## Features

- Citizen authentication with Firebase Auth
- Image-based complaint reporting with optional Gemini AI issue analysis
- Location capture from device GPS, image EXIF data, or map selection
- Complaint tracking with status, priority, votes, comments, and notifications
- Admin dashboard for filtering, status updates, and task assignment
- Live complaint heatmap using Leaflet
- User profiles, trust score tracking, support notifications, and account anonymization
- Light/dark theme toggle with saved preference

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, Firebase Auth, Leaflet
- Backend: Node.js, Express, MongoDB, Mongoose, Firebase Admin, Multer
- AI: Google Gemini API

## Project Structure

```text
SmartNagar-AI/
  backend/
    controllers/
    middleware/
    models/
    routes/
    services/
    server.js
  frontend/
    src/
      components/
      contexts/
      lib/
      pages/
      services/
```

## Prerequisites

- Node.js 18 or newer
- MongoDB connection string
- Firebase project with Authentication enabled
- Firebase Admin service account for backend token verification
- Gemini API key for image analysis

## Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASSWORD@HOST/smartnagar
CLIENT_ORIGIN=http://localhost:5173

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

ADMIN_SIGNUP_CODE=your_admin_signup_code
ADMIN_EMAILS=admin@example.com,another-admin@example.com
```

Add Firebase Admin credentials using one of these options:

- Place a service account file at `backend/serviceAccountKey.json`
- Or configure Application Default Credentials in your environment

Do not commit real service account keys or `.env` files.

Run the backend:

```bash
npm run dev
```

The API runs on the configured `PORT`.

## Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_INTRO_HERO_IMAGE=https://your-real-hero-image-url.example/image.jpg
```

Run the frontend:

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## Running Both Apps Locally

Use two terminals:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

Make sure `backend/.env` has `CLIENT_ORIGIN` set to the frontend URL and `frontend/.env` has `VITE_API_BASE_URL` set to the backend URL.

## Build

```bash
cd frontend
npm run build
```

Preview the production build:

```bash
npm run preview
```

Start the backend in production mode:

```bash
cd backend
npm start
```

## API Overview

Main backend route groups:

- `GET /api/health` - health check
- `/api/complaints` - complaint creation, listing, tracking, votes, comments, assignment, archive status
- `/api/users` - user sync, profile, notifications, support, anonymization, admin access
- `/api/analytics` - heatmap and summary data

Protected routes require a Firebase ID token in the `Authorization` header:

```text
Authorization: Bearer <firebase_id_token>
```

## Environment Variables

Backend:

- `PORT` - backend server port
- `MONGODB_URI` - MongoDB connection URI
- `CLIENT_ORIGIN` or `FRONTEND_URL` - allowed frontend origin for CORS
- `GEMINI_API_KEY` - Gemini API key
- `GEMINI_MODEL` - Gemini model name
- `ADMIN_SIGNUP_CODE` - code required to request admin access
- `ADMIN_EMAILS` - comma-separated emails that should automatically be admins

Frontend:

- `VITE_API_BASE_URL` - backend base URL
- `VITE_INTRO_HERO_IMAGE` - optional real hero image URL for the intro screen

## Notes

- Uploaded complaint images are stored as data URLs in MongoDB records.
- Gemini analysis fails gracefully and returns fallback category/priority data if the AI service is unavailable.
- The app excludes archived complaints by default unless the API is queried with archive filters.
- If no real map center is available yet, the map components show a no-location state instead of using a fake location.

## Troubleshooting

- Backend starts but MongoDB is not connected: check `MONGODB_URI`.
- Frontend requests fail due to CORS: make sure `CLIENT_ORIGIN` matches the frontend URL exactly.
- Protected API routes return 401/403: verify Firebase Auth and backend service account credentials.
- AI analysis returns fallback data: check `GEMINI_API_KEY` and network access.
- Admin dashboard is inaccessible: add the user email to `ADMIN_EMAILS` or use `ADMIN_SIGNUP_CODE`.
