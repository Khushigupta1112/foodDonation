<div align="center">

# FoodShare 🍽️

**A food donation platform that connects people with surplus food to NGOs, shelters and volunteers who can pick it up before it goes to waste.**

Built with Next.js 16 · React 19 · SQLite (built-in `node:sqlite`) · Tailwind CSS v4

[Features](#features) · [Getting Started](#getting-started) · [The Claims Workflow](#the-claims-workflow) · [API](#api) · [Project Structure](#project-structure)

</div>

---

## Why FoodShare?

Every day, restaurants, caterers, wedding halls and households throw away perfectly good food while people nearby go hungry. FoodShare closes that gap with a simple, auditable workflow:

1. **Donors** post what they have — quantity, servings, best-before time, pickup window and address.
2. **Claimers** (NGOs, shelters, volunteers) browse live listings and request a pickup.
3. The **donor approves one claim**, the food is reserved, they coordinate the handover, and the meal is rescued.

## Features

| | |
|---|---|
| 🍱 **Donation listings** | Rich posts with category, servings, veg/non-veg, best-before time, pickup window, address, photo. |
| 🤝 **Claims workflow** | Request → approve/reject → reserved → picked up, with full status tracking on both sides. Only one claimer wins a donation; everyone else is notified via status. |
| 🔎 **Browse & filter** | Full-text search, city filter, category filter, veg-only toggle. Expired food is automatically hidden. |
| 👥 **Roles** | Donor accounts (post & manage food) and claimer accounts (NGOs/volunteers) with role-aware UI and API guards. |
| 📊 **Impact dashboard** | Meals rescued, live donations, CO₂ saved, per-user stats. |
| 🔐 **Auth** | Cookie sessions (httpOnly), scrypt password hashing, server-side session store. |
| 💾 **Zero-config database** | SQLite via Node's built-in `node:sqlite` — no external services, no API keys. |

## Getting Started

```bash
npm install
npm run db:seed   # optional: demo users + sample donations
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Donor | `donor@foodshare.test` | `password123` |
| Donor | `donor2@foodshare.test` | `password123` |
| NGO (claimer) | `ngo@foodshare.test` | `password123` |
| Volunteer (claimer) | `volunteer@foodshare.test` | `password123` |

## The Claims Workflow

```
 Donor posts            Claimer requests         Donor approves          Handover
┌────────────┐  claim  ┌──────────────┐ approve ┌────────────┐  pickup  ┌───────────┐
│  available ├────────►│    pending   ├────────►│  reserved  ├─────────►│ picked_up │
└────────────┘         └──────────────┘         └────────────┘          └───────────┘
      │                        │                      │
      │ cancel                 │ reject / cancel      │ claimer cancels → back to available
      ▼                        ▼                      ▼
  cancelled               rejected/cancelled        available
```

- Approving one claim automatically rejects all other pending claims for that donation.
- Donations past their best-before time are hidden from browse and can't be claimed.
- Cancelling a reserved donation cancels its active claim too.

## API

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account (`role`: `donor` \| `claimer`) |
| `POST` | `/api/auth/login` | — | Log in (sets httpOnly session cookie) |
| `POST` | `/api/auth/logout` | ✅ | Log out |
| `GET` | `/api/auth/me` | ✅ | Current user |
| `GET` | `/api/donations` | — | List available donations (`?q=&city=&category=&veg=1`) |
| `POST` | `/api/donations` | donor | Create donation |
| `GET` | `/api/donations/:id` | — | Donation detail (+ claims if you're the donor) |
| `PATCH` | `/api/donations/:id` | donor | `{ "action": "cancel" }` |
| `POST` | `/api/donations/:id/claims` | claimer | Request a pickup |
| `GET` | `/api/donations/:id/claims` | donor | List claims for your donation |
| `PATCH` | `/api/claims/:id` | ✅ | `{ "action": "approve" \| "reject" \| "complete" \| "cancel" }` |
| `GET` | `/api/stats` | — | Platform impact stats |

## Project Structure

```
app/
  api/            # route handlers (auth, donations, claims, stats)
  browse/         # searchable donation feed
  dashboard/      # role-aware dashboard (my donations / my claims)
  donate/         # post-donation form (donors only)
  donations/[id]/ # donation detail + claims management
  login/ register/
components/       # NavBar, DonationCard, forms, action buttons
lib/
  db.ts           # SQLite connection + schema (node:sqlite)
  auth.ts         # scrypt hashing, sessions, validation
  donations.ts    # domain logic & state transitions
  types.ts        # shared types & labels
scripts/seed.mjs  # demo data
legacy/           # original console-app prototype
```

## Deploying to Vercel (with Neon Postgres)

The app stores data in Postgres. Local development and production both connect through a single env var: `DATABASE_URL`.

### 1. Create a Neon database (~2 min)

1. Sign up at [neon.tech](https://neon.tech) — free plan, sign in with GitHub or Google (no credit card).
2. Create a project (any name, e.g. `foodshare`).
3. Copy the **connection string** — it looks like:
   `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

### 2. Seed your database (optional)

```powershell
cd foodDonation
$env:DATABASE_URL = "postgresql://...neon.tech/neondb?sslmode=require"
npm run db:seed
```

### 3. Local development

Put the connection string in `.env.local` (git-ignored):

```env
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
```

Then `npm run dev` as usual.

### 4. Deploy on Vercel

1. In [vercel.com/new](https://vercel.com/new), import `Khushigupta1112/foodDonation`.
2. Framework preset: **Next.js** (auto-detected). No build settings needed.
3. Add one Environment Variable:
   - `DATABASE_URL` = your Neon connection string
4. Deploy.

## Roadmap ideas

- 📍 Geolocation-based "near me" matching & distance sort
- 🔔 Email/WhatsApp notifications on claim events
- ⭐ Ratings & trust score for donors/claimers
- 🖼️ Direct photo uploads (S3/Cloudinary)
- 🧾 Food-safety checklist at pickup handover

---

> The original prototype (`legacy/FoodDonationApp.java`) was a console app — this is its full web evolution.
