# CodePulse Dashboard Integration Tasks

- `[x]` Server Configuration
  - `[x]` Modularize API route handlers into `backend/controllers/apiController.js`
  - `[x]` Move routing pathways to `backend/routes/api.js`
  - `[x]` Simplify Express boot orchestrator in `backend/server.js`
  - `[x]` Configure `backend/nodemon.json` to ignore data updates and prevent restart loops
- `[x]` Dashboard Frontend (Vite + React)
  - `[x]` Create Vite React project folder `frontend/`
  - `[x]` Configure Tailwind CSS v3 and PostCSS compilation configs
  - `[x]` Build responsive glassmorphic dashboard in `frontend/src/App.jsx`
  - `[x]` Remove unused layout sheets (`App.css`) and configure Vite server proxy
- `[x]` Direct Submission Links & Env Clean-up
  - `[x]` Move `.env` configurations inside the `backend/` folder
  - `[x]` Update server dotenv paths and `.gitignore` safety settings
  - `[x]` Add "View Their Solution" CTAs in email templates using submission IDs
  - `[x]` Add "(View Code)" links next to problem titles in React activity timeline
- `[x]` Verification & Compilation
  - `[x]` Restore root `package.json` concurrently dev scripts
  - `[x]` Compile production bundle `npm run build` with 0 warnings
