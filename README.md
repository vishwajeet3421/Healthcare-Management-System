# Online Healthcare Management System (MERN)

Role-based web app for **Admin**, **Doctor** and **Patient** users.
**Stack:** MongoDB, Express, React (Vite), Node.js, JWT authentication.

## Run everything with two commands (from this folder)
Prerequisites: Node.js 18+ and MongoDB running locally (or put your Atlas URI in `server/.env`).

```bash
npm install     # installs root + server + client dependencies in one go
npm start       # starts the API (port 5000) AND the React app (port 5173) together
```
Open http://localhost:5173. Demo data is created automatically on first start.

## Demo accounts
| Role | Email | Password |
|---|---|---|
| Admin | admin@health.com | admin123 |
| Doctor | doctor@health.com | doctor123 |
| Doctor | doctor2@health.com | doctor123 |
| Patient | patient@health.com | patient123 |

## Modules
**Authentication** - login with role-based redirect, patient self-registration (name, email, password, phone, age, gender, address). Deactivated accounts cannot log in.

**Admin** - dashboard metric cards (users, doctors, patients, active appointments, overall rating) with quick links; user management (filter by role, create, edit, activate/deactivate); appointment overview (status filter, cancel, reassign to another doctor's slot); feedback management; system settings (working hours, default slot duration, appointment lead time).

**Doctor** - dashboard (today's appointments, upcoming slots, recent record updates); schedule management (create/update slots with date, start, end, max capacity; activate/deactivate); appointments (confirm, complete, cancel); medical records (diagnosis, prescription, clinical notes for completed appointments; history of treated patients).

**Patient** - dashboard; book appointment (choose doctor, see available slots, book); my appointments (status, cancel upcoming); medical history timeline; submit feedback on completed visits.

## Concurrency control
Slot capacity is checked and incremented in a single atomic MongoDB update, so two patients can never take the last place in a slot. Cancelling or reassigning releases the place. Overlapping slots, past dates, slots outside working hours, double booking and the lead-time rule are all validated on the server.

## Structure
```
server/  Express API: models, routes (auth, admin, doctor, patient), seed data
client/  React app: Login, Register, Admin, Doctor, Patient pages
```
Production: `npm run build --prefix client` then `npm start --prefix server` serves everything on port 5000.
