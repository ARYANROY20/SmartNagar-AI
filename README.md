# SmartNagar AI

AI-powered civic issue reporting PWA with Firebase Auth, a Vite React frontend, and an Express/MongoDB backend.

## Structure

- `frontend/` - React + Vite PWA. Firebase is used for authentication only.
- `backend/` - Express API, MongoDB Atlas via Mongoose, Firebase Admin token verification, Multer image uploads, and Gemini issue analysis.
- `firebase-applet-config.json` - Firebase client config used by the frontend.

## Backend

```bash
cd backend
npm install
npm run dev
```

Set `backend/.env`:

```bash
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/smartnagar
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
```

For Firebase Admin, either configure Application Default Credentials or save a Firebase service account as `backend/serviceAccountKey.json`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `frontend/.env`:

```bash
VITE_API_BASE_URL=http://localhost:5000
```
