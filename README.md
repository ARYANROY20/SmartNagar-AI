# SmartNagar

SmartNagar is a modern civic reporting and operations platform built to help citizens report local issues and help administrators resolve them faster. It brings together photo-based reporting, accurate location capture, complaint tracking, ward analytics, SLA monitoring, resolution proof, and citizen notifications in one clean workflow.

The goal is simple: make civic issue reporting more transparent, faster to act on, and easier for both citizens and city teams to trust.

## What SmartNagar Does

- Citizens can report potholes, garbage, streetlight issues, water problems, infrastructure damage, and other civic concerns.
- Reports include images, location, category, priority, description, and status.
- Administrators can review, assign, update, resolve, and archive complaints.
- Citizens can track progress through a clear timeline.
- City teams can monitor hotspots, overdue work, ward-wise trends, and resolution progress.

## Key Features

- **Photo-based complaint reporting** with camera upload and preview
- **Accurate location capture** using device GPS, image metadata, reverse geocoding, and manual map selection
- **Duplicate complaint detection** for nearby similar reports
- **Complaint timeline** from submission to resolution
- **SLA tracking** based on priority, category, urgency, and public impact
- **Before/after resolution proof** for transparent closure
- **Ward analytics** for localized civic insights
- **Live heatmap** to visualize complaint density
- **Admin task assignment** with department, officer/team, notes, and due dates
- **Citizen trust score** and voting support
- **Notifications** for status updates and support requests
- **Light and dark theme** with saved preference
- **Google Gemini image analysis** to suggest title, category, and priority from uploaded images

## Why It Stands Out

SmartNagar is not just a complaint form. It is an operations layer for civic response:

- Citizens see where their report is in the process.
- Admins can prioritize work using urgency, SLA, ward data, and complaint clusters.
- Resolution proof helps build public trust.
- Duplicate detection reduces repeated reports for the same issue.
- Ward analytics gives decision-makers a city-level view of recurring problems.

## Tech Stack

**Frontend**

- React
- Vite
- Tailwind CSS
- React Router
- Firebase Auth
- Leaflet and React Leaflet

**Backend**

- Node.js
- Express
- MongoDB
- Mongoose
- Firebase Admin
- Multer
- Google Gemini API for image analysis

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
- MongoDB Atlas database or local MongoDB instance
- Firebase project with Authentication enabled
- Firebase Admin service account for backend token verification
- Google Gemini API key for image analysis

## Local Setup

Clone the repository and install dependencies for both apps.

```bash
cd backend
npm install
```

```bash
cd ../frontend
npm install
```

## Backend Environment

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://USER:PASSWORD@HOST/SmartNagar
CLIENT_ORIGIN=http://localhost:5173

GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

ADMIN_SIGNUP_CODE=your_admin_signup_code
ADMIN_EMAILS=admin@example.com
```

Firebase Admin credentials are required for protected backend routes. Use one of these:

- Place your service account JSON at `backend/serviceAccountKey.json`
- Or configure Application Default Credentials in your hosting environment

Never commit `.env` files or service account keys.

Start the backend:

```bash
cd backend
npm run dev
```

## Frontend Environment

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_INTRO_HERO_IMAGE=https://your-image-url.example/city.jpg
```

Start the frontend:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

## Useful Scripts

Backend:

```bash
npm run dev
npm start
```

Frontend:

```bash
npm run dev
npm run build
npm run preview
```

## API Overview

Main route groups:

- `GET /api/health` - backend health check
- `/api/complaints` - reports, duplicate checks, comments, votes, assignment, archive, status, resolution proof
- `/api/users` - user sync, profile, notifications, support, anonymization, admin access
- `/api/analytics` - heatmap, summary, and ward analytics

Protected routes require a Firebase ID token:

```text
Authorization: Bearer <firebase_id_token>
```

## Deployment Notes

Recommended deployment:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- Auth: Firebase Authentication

For deployment, set:

Backend:

```env
MONGODB_URI=your_production_mongodb_uri
CLIENT_ORIGIN=https://your-frontend-domain.vercel.app
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
ADMIN_SIGNUP_CODE=your_admin_signup_code
ADMIN_EMAILS=admin@example.com
```

Frontend:

```env
VITE_API_BASE_URL=https://your-backend-domain.onrender.com
VITE_INTRO_HERO_IMAGE=https://your-image-url.example/city.jpg
```

Also add the deployed frontend domain to Firebase Authentication authorized domains.

## Notes

- Images are stored as data URLs with the complaint records.
- Location is stored as latitude and longitude in `[latitude, longitude]` order.
- Device location requires HTTPS or localhost and browser location permission.
- Google Gemini is used for image analysis. If the service is unavailable, reporting still works with fallback values.
- Archived complaints are hidden from normal views unless requested through filters.

## Troubleshooting

- **Network Error in frontend:** check `VITE_API_BASE_URL`, backend availability, and CORS `CLIENT_ORIGIN`.
- **MongoDB not connecting:** verify `MONGODB_URI` and MongoDB Atlas Network Access.
- **Firebase auth failing:** add your deployed frontend domain to Firebase Authentication authorized domains.
- **Admin dashboard inaccessible:** confirm `ADMIN_SIGNUP_CODE` and `ADMIN_EMAILS`.
- **Location not exact:** use HTTPS, allow browser location permission, and enable GPS/location services on the device.

## Vision

SmartNagar is designed for smarter, more accountable civic operations. It gives citizens a simple way to report issues and gives city teams the tools to prioritize, assign, prove, and communicate resolution work with transparency.
