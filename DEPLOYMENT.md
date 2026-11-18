# View My Startup deployment

Open `ViewMyStartup.code-workspace` in VS Code to work on the frontend and backend together. The projects remain separate repositories, matching the two supplied ZIP archives.

## Frontend: Netlify

Connect the frontend GitHub repository to Netlify and set its base directory to the frontend repository root. `netlify.toml` configures the Vite build (`npm ci && npm run build`), `dist` publish folder, the production API URL, and React Router fallback. Netlify will build and deploy on pushes to the production branch selected in its site settings.

To point the site at a different API, update `VITE_API_BASE` in `netlify.toml` or set the same variable in Netlify's site environment settings. Set it to the URL shown for the Render API service, with no trailing slash.

## Backend: Render

Connect the backend GitHub repository to Render as a Blueprint using `render.yaml`. The Blueprint creates a new `viewmystartup-api` web service and a new `viewmystartup-postgres` database in Singapore. It builds the Node/Prisma app, runs pending migrations at startup, seeds mock data on the first successful deploy only, checks the API and DB through `/health`, and connects the API to the database's internal connection string. Render automatically deploys commits from the connected branch.

The Blueprint uses Render's free plans to avoid creating a charge. Free Postgres expires 30 days after creation, so upgrade the database before relying on it for persistent production data. If Render assigns a different service hostname, update `VITE_API_BASE` in `netlify.toml` to the URL shown in the Render Dashboard.

## Local development

In the backend folder, run `npm ci` once and then `npm run local`. This starts the local PostgreSQL database, applies Prisma migrations, loads sample data only when the database is empty, and starts both the API and Vite. Open `http://localhost:5173`; the API runs at `http://localhost:3000`.

Press Ctrl+C in the terminal to stop the local app. PostgreSQL data is retained in the ignored `.local-postgres` folder for the next run. The backend `.env` contains only the local database connection string and is ignored by Git.
