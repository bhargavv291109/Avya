AVYA V3 — REAL REVIEW DATABASE + ADMIN PANEL

WHAT'S INCLUDED
- Existing AVYA premium front-end
- Real SQLite database for customer reviews
- Public review submission form
- Reviews remain pending until approved
- Admin dashboard at /admin
- Approve / reject / delete reviews
- Feature / unfeature approved reviews
- Public site automatically displays approved reviews
- Environment variables for admin password and session secret

REQUIREMENTS
- Node.js 18+
- npm

RUN LOCALLY
1. Open a terminal in this folder.
2. Run: npm install
3. Copy .env.example to .env
4. Edit .env and set ADMIN_PASSWORD and SESSION_SECRET.
5. Run: npm start
6. Open: http://localhost:3000
7. Admin: http://localhost:3000/admin

DATABASE
The first run automatically creates avya_reviews.db in the project folder.

IMPORTANT SECURITY
- Never publish your .env file.
- Use a strong admin password.
- Change SESSION_SECRET before deploying.
- For production, use HTTPS and a persistent disk/database.
- This review system only publishes reviews after manual approval.

DEPLOYMENT
This version needs a Node.js server. Static-only hosting such as GitHub Pages cannot run the backend.
For online deployment, use a Node-capable host and persistent storage for SQLite, or migrate the database to PostgreSQL/Supabase.

ACCOUNT RECOVERY SERVICE
Keep AVYA's account-recovery offering limited to legitimate recovery guidance through the platform's official recovery process. Do not advertise bypassing passwords, OTPs, MFA, or security controls.
