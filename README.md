# NCC Two-Day Event Registration & Management Website

Full-stack NCC Two-Day Event portal built with HTML/CSS/JavaScript and **Supabase** (PostgreSQL + Authentication + Row Level Security).

## Pages & Workflows
- **Home (`index.html`)**: NCC Navy Blue & White portal overview, live sample events (**Firing — ₹400**, **Drill — ₹400**), announcements, and two-day schedule.
- **Events (`events.html`, `event.html`)**: Event listing and full event details (description, date, time, venue, eligibility, rules, deadline, team size limits, slots left, fee, Open/Closed status).
- **Team Registration (`register.html`)**: Register a team for Firing or Drill with Team Name, College, NCC Unit, Team Leader, contact details, and dynamic Team Members list. Enforces duplicate-team prevention, team size limits, and available slots on PostgreSQL.
- **Login & Roles (`login.html`)**: Participant sign up, login, logout, and password reset via Supabase Auth. Admin role is assigned strictly in the backend.
- **Participant Dashboard (`my.html`)**: Displays participant profile, college & NCC unit, registered events separately (`Firing — ₹400`, `Drill — ₹400`), team members, registration status, payment status (`Pending` / `Paid` / `Failed` / `Refunded`), payment reference & receipt, QR pass, and certificate status/PDF download once approved and issued.
- **Admin Dashboard (`admin.html`)**: Dedicated admin sections for **Dashboard**, **Events**, **Teams**, **Participants**, **Payments**, **Attendance** (QR + manual check-in), **Certificates** (approve, reject, issue, revoke, bulk generate, download PDF), and **Settings** (role assignment, schedule, announcements).

## Verification Command
```bash
npm run check
```
See `DEPLOYMENT.md` for Supabase SQL setup and hosting instructions.
