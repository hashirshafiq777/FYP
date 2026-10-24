# LegalDocReader

A bilingual (English / Urdu) AI-powered legal and policy document analyzer, built as a web
application. Final-year project, KIET.

**What exists today — Module 1 complete:** the authentication foundation (registration,
login, session handling with server-side token revocation), **role-based permissions**,
**per-user data isolation**, and the designed front end — Sign-Up, Login and a bilingual
Dashboard inside an app shell, with the other four sections routed to polished
"coming soon" pages.

Auth is wired to the real API. Everything on the dashboard except the signed-in user's
name and email is clearly-marked placeholder data. Document upload, OCR, indexing, RAG,
drafting and export are later modules — see
[Conventions for future modules](#conventions-for-future-modules).

```
.
├── backend/            FastAPI + MongoDB REST API under /api/v1
├── frontend/           React + Vite + TypeScript web app
├── docker-compose.yml  Optional: MongoDB only
└── README.md
```

---

## Module 1 status

| Task | Scope | Where it lives | Completion check |
| ---- | ----- | -------------- | ---------------- |
| **M1-T1** Project Setup | Frontend/backend folders, config, test database, both apps run locally | `backend/`, `frontend/`, `backend/app/core/config.py` | Both start; `GET /api/v1/health` returns `{"status":"ok","database":"ok"}` |
| **M1-T2** User Registration | Name/email/password form, duplicate email rejected, password hashed | `api/v1/auth.py`, `services/auth_service.py`, `pages/SignUp.tsx` | `201` on valid; `409` on duplicate (case-insensitive); `422` on invalid |
| **M1-T3** User Login | Login form, hashed-password verification, session, redirect | `api/v1/auth.py`, `auth/AuthContext.tsx`, `pages/Login.tsx` | Valid login opens the dashboard; bad credentials give one generic `401` |
| **M1-T4** Logout & Session Handling | Logout endpoint, protected routes and APIs, expiry clears state | `api/deps.py`, `revoked_tokens` TTL index, `auth/ProtectedRoute.tsx` | After logout the same token gets `401`; protected URLs redirect to `/login?reason=expired` |
| **M1-T5** User Roles | user/admin permissions enforced in APIs | `api/deps.py` (`require_admin`), `api/v1/admin.py`, `scripts/promote_admin.py` | A normal user's valid token gets `403` on every admin route, by direct request |
| **M1-T7** User Data Isolation | `owner_id` on private records, queries filtered by caller | `services/document_service.py`, `api/v1/documents.py` | Account A cannot read, modify or delete account B's records (`404`) |
| **M1-T6** User Workspace | Dashboard navigation, four sections, loading and empty states | `layouts/AppShell.tsx`, `pages/Dashboard.tsx`, `pages/ComingSoon.tsx` | All four sections reachable with consistent navigation |

**Working checkpoint** — register, log in and log out with two accounts; private data stays
isolated; the workspace opens. Covered by `backend/tests/test_data_isolation.py` and
`backend/tests/test_roles.py` (93 backend tests, 148 frontend tests).

> Document upload, OCR, extraction, indexing, RAG, drafting and export are **not** in
> Module 1. The `documents` endpoints store metadata only; `status` already carries the
> pipeline states a later module will set.

---

## Table of contents

- [Prerequisites](#prerequisites)
- [MongoDB setup](#mongodb-setup)
- [Backend](#backend)
- [Frontend](#frontend)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [Running the whole thing](#running-the-whole-thing)
- [Decisions](#decisions)
- [Conventions for future modules](#conventions-for-future-modules)
- [Known hardening items](#known-hardening-items)

---

## Prerequisites

| Tool    | Version                | Notes                                        |
| ------- | ---------------------- | -------------------------------------------- |
| Python  | 3.11 or newer          | Verified on 3.14.7.                          |
| Node.js | 20 or newer            | Verified on 24.14.1 with npm 11.11.0.        |
| MongoDB | 6.0 or newer, or Atlas | See below. The Atlas free tier (M0) is enough. |
| Git     | any recent version     |                                              |

---

## MongoDB setup

Pick **one** of the three options, then put the resulting URI in `backend/.env`.

### Option A — MongoDB Atlas (no local install)

1. Create a free cluster at <https://www.mongodb.com/cloud/atlas>.
2. **Database Access** → add a database user with a password.
3. **Network Access** → add your current IP address (or `0.0.0.0/0` for development only).
4. **Connect** → *Drivers* → copy the connection string into `backend/.env`:

   ```ini
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

   If the password contains any of `@ : / ? # [ ] %`, URL-encode it (for example `@` becomes `%40`).

### Option B — Docker (MongoDB only)

```bash
docker compose up -d        # from the repository root
```

```ini
MONGODB_URI=mongodb://localhost:27017
```

Stop with `docker compose down`, or `docker compose down -v` to delete the data too.

### Option C — Local install

Install MongoDB Community Server from
<https://www.mongodb.com/try/download/community>, make sure the service is running, then:

```ini
MONGODB_URI=mongodb://localhost:27017
```

> Collections (`users`, `revoked_tokens`) and their indexes are created automatically on
> application startup. There is no migration step.

---

## Backend

FastAPI + Pydantic v2 + PyMongo (async) + Argon2 + PyJWT.

### Setup

```bash
cd backend

python -m venv .venv
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Windows (Git Bash):
source .venv/Scripts/activate
# macOS / Linux:
source .venv/bin/activate

pip install -r requirements-dev.txt    # requirements.txt alone for runtime only

cp .env.example .env                   # then edit .env
```

Generate a real `JWT_SECRET`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Run

```bash
uvicorn app.main:app --reload
```

| URL                                  | What it is                                          |
| ------------------------------------ | --------------------------------------------------- |
| <http://localhost:8000/docs>          | Swagger UI (**Authorize** button for bearer tokens) |
| <http://localhost:8000/redoc>         | ReDoc                                               |
| <http://localhost:8000/openapi.json>  | OpenAPI schema                                      |
| <http://localhost:8000/api/v1/health> | Health check                                        |

To use Swagger against protected endpoints: call `POST /api/v1/auth/login`, copy the
`access_token`, click **Authorize**, paste the token, then call `/auth/me`.

### Test

```bash
cd backend
pytest                 # 93 tests
pytest -v              # per-test names
pytest tests/test_auth_flow.py::test_logout_revokes_the_token
```

Tests run against a **separate database** whose name must end in `_test`
(`TEST_MONGODB_DB_NAME`, default `legaldocreader_test`). They reuse the same `MONGODB_URI`
as the app, refuse to start if the name does not end in `_test`, and drop the database when
the run finishes. Your development data is never touched.

### Layout

```
backend/app/
├── main.py                 App, CORS, lifespan (connect → indexes → serve → close)
├── core/
│   ├── config.py           Pydantic settings + JWT secret policy
│   ├── security.py         Argon2 hashing, JWT encode/decode
│   └── errors.py           Error types + centralised handlers
├── api/
│   ├── deps.py             get_current_user + require_admin
│   └── v1/
│       ├── router.py       Mounts the v1 routes
│       ├── health.py
│       ├── auth.py         signup / login / me / logout
│       ├── documents.py    Private, owner-scoped records
│       └── admin.py        Admin-only routes
├── schemas/                user.py, auth.py, document.py
├── services/               auth_service.py, document_service.py, admin_service.py
└── db/                     mongo.py, indexes.py

backend/scripts/
└── promote_admin.py        Make the first admin (signup never can)
```

---

## Frontend

React 19 + Vite + TypeScript + react-router + plain CSS. No UI kit, no icon library, no
CSS framework.

**See [`frontend/README.md`](frontend/README.md)** for the design system, the i18n/RTL
layer, validation rules, error handling and how to swap the dashboard's placeholder data
for real endpoints. The essentials:

### Setup and run

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The app calls the API at the **same origin** it was served from (`/api/v1`); the Vite dev
server proxies `/api` to `http://127.0.0.1:8000`. Nothing to configure for local work.

**Sharing a dev URL (VS Code port forwarding, ngrok, …): forward port 5173 only** — the
API comes through the same tunnel. Set that port's visibility to *Public* if someone else
must open it; a private tunnel answers with a sign-in page, which the app reports as a
network error. See [`frontend/README.md`](frontend/README.md#port-forwarding--sharing-a-dev-url).

Set `VITE_API_BASE_URL` in `frontend/.env.local` only when the API is on a different host
(a deployed backend). Note that **Vite does not read `.env.example`** — copy it to
`.env.local` first.

### Other commands

```bash
npm run build        # tsc -b && vite build  → dist/
npm run typecheck    # TypeScript only
npm run lint         # oxlint
npm test             # vitest run (148 tests)
npm run preview      # serve the production build
```

### Routes

| Route         | Page             | Access      |
| ------------- | ---------------- | ----------- |
| `/`           | redirect         | Any         |
| `/login`      | Login            | Public only |
| `/signup`     | Sign-Up          | Public only |
| `/dashboard`  | Dashboard        | Protected   |
| `/documents`  | Coming soon      | Protected   |
| `/chat`       | Coming soon      | Protected   |
| `/agreements` | Coming soon      | Protected   |
| `/history`    | Coming soon      | Protected   |
| anything else | 404              | Any         |

`/` goes to `/dashboard` when signed in and `/login` otherwise. Protected routes redirect
signed-out visitors to `/login`, remembering where they were headed; a revoked or expired
token sends them to `/login?reason=expired` with an explanatory banner.

Flow: **Sign-Up → confirmation banner on the Login page with the email pre-filled → Login
→ Dashboard**. Signup returns no token, so the app never pretends the user is signed in
after registering. Log out calls `POST /auth/logout` (which revokes the token server-side),
clears local state and returns to Login.

The UI is fully bilingual: an **English | اردو** toggle switches every string, sets
`<html lang>` and `<html dir>`, and mirrors the layout (the sidebar moves to the right).
Everything on the dashboard except the signed-in user's name and email is placeholder
data, marked with a **Sample data** badge.

### Layout

```
frontend/src/
├── main.tsx                Fonts, stylesheets, I18nProvider → Router → AuthProvider
├── App.tsx                 Routes, AuthGate, root redirect
├── api/                    client.ts (ApiError, timeout, 401), auth.ts
├── auth/                   Context, hook, AuthGate, Protected/PublicOnly routes
├── components/             Icons, form fields, buttons, banners, chips, skeletons,
│                           language toggle, logo, user menu, dashboard widgets
├── data/                   dashboardData.ts — typed placeholder data + loader
├── i18n/                   en.ts, ur.ts, provider, useI18n hook
├── layouts/                AuthLayout (brand panel), AppShell (sidebar/drawer/topbar)
├── lib/                    validation.ts, apiErrors.ts, initials.ts
├── pages/                  Login, SignUp, Dashboard, ComingSoon, NotFound
├── styles/                 tokens.css + base/components/auth/shell/dashboard
└── test/                   Vitest setup and provider helper
```

---

## Environment variables

### `backend/.env` (copy from `backend/.env.example`)

| Variable                      | Required            | Default                     | Description                                                                                                                  |
| ----------------------------- | ------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                     | no                  | `dev`                       | `dev` \| `test` \| `prod`. Outside `dev` the JWT secret policy is enforced and exception details are hidden from responses.   |
| `MONGODB_URI`                 | yes                 | `mongodb://localhost:27017` | Local URI or Atlas `mongodb+srv://…`.                                                                                        |
| `MONGODB_DB_NAME`             | no                  | `legaldocreader`            | Application database.                                                                                                        |
| `JWT_SECRET`                  | **yes outside dev** | example value               | HMAC signing key. Must be at least 32 characters and not the example value when `APP_ENV` is not `dev`, or startup fails.     |
| `JWT_ALGORITHM`               | no                  | `HS256`                     | JWT signing algorithm.                                                                                                       |
| `ARGON2_TIME_COST`            | no                  | `3`                         | Argon2id iterations. Defaults sit above the OWASP minimum (m=19 MiB, t=2, p=1).                                              |
| `ARGON2_MEMORY_COST_KIB`      | no                  | `65536`                     | Argon2id memory in KiB (64 MiB). Raise if the server can afford it.                                                          |
| `ARGON2_PARALLELISM`          | no                  | `4`                         | Argon2id lanes. The test suite overrides all three with low values so it is not minutes of pure hashing.                     |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | no                  | `60`                        | Access token lifetime.                                                                                                       |
| `CORS_ORIGINS`                | no                  | `http://localhost:5173`     | Comma-separated allowed browser origins. Only matters when the browser calls the API cross-origin; the dev proxy makes it same-origin. |
| `TEST_MONGODB_DB_NAME`        | no                  | `legaldocreader_test`       | Database used by `pytest`. **Must end in `_test`.**                                                                          |

### `frontend/.env.local` (copy from `frontend/.env.example`)

| Variable            | Required | Default                        | Description                                                             |
| ------------------- | -------- | ------------------------------ | ----------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | no       | `/api/v1` (same origin)        | Set only when the API is on a different host. Vite exposes only `VITE_`-prefixed variables, and does **not** read `.env.example`. |

> `.env` is git-ignored; `.env.example` is committed. Never commit real credentials.

---

## API reference

Base URL: `http://localhost:8000/api/v1`

Every error uses the same envelope:

```json
{ "error": { "code": "machine_readable_code", "message": "Human readable message.", "details": [] } }
```

`details` is present only for validation errors.

### `GET /health`

| Status | When                    |
| ------ | ----------------------- |
| `200`  | MongoDB answered a ping |
| `503`  | MongoDB unreachable     |

```bash
curl -i http://localhost:8000/api/v1/health
```

```http
HTTP/1.1 200 OK

{"status":"ok","database":"ok"}
```

```http
HTTP/1.1 503 Service Unavailable

{"error":{"code":"database_unavailable","message":"Database is unavailable."}}
```

### `POST /auth/signup`

Creates an account. **Returns no token** — the client must then log in.
`full_name` is trimmed (1–100 characters), `email` is trimmed and lower-cased, `password`
is 8–128 characters. `role` cannot be set here; every signup is a `user`.

| Status | When                                              |
| ------ | ------------------------------------------------- |
| `201`  | Account created                                   |
| `409`  | Email already registered (case-insensitive)       |
| `422`  | Validation error (bad email, short password, …)   |

```bash
curl -i -X POST http://localhost:8000/api/v1/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Ayesha Khan","email":"Ayesha@Example.com","password":"S3cure-pass!"}'
```

```http
HTTP/1.1 201 Created

{"id":"6adbd0b95dde127ba5bbc230","full_name":"Ayesha Khan","email":"ayesha@example.com","role":"user","created_at":"2026-10-23T21:25:13.360639Z"}
```

```http
HTTP/1.1 409 Conflict

{"error":{"code":"email_already_registered","message":"An account with this email already exists."}}
```

```http
HTTP/1.1 422 Unprocessable Content

{"error":{"code":"validation_error","message":"Request validation failed.","details":[{"field":"email","message":"value is not a valid email address: An email address must have an @-sign.","type":"value_error"},{"field":"password","message":"String should have at least 8 characters","type":"string_too_short"}]}}
```

### `POST /auth/login`

| Status | When                                                          |
| ------ | ------------------------------------------------------------- |
| `200`  | Credentials accepted                                          |
| `401`  | Wrong password **or** unknown email — identical body for both |
| `422`  | Malformed body                                                |

```bash
curl -i -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ayesha@example.com","password":"S3cure-pass!"}'
```

```http
HTTP/1.1 200 OK

{"access_token":"eyJhbGciOiJIUzI1NiIs…","token_type":"bearer","expires_in":3600}
```

```http
HTTP/1.1 401 Unauthorized

{"error":{"code":"invalid_credentials","message":"Incorrect email or password."}}
```

Token claims are `sub` (user id), `jti` (uuid4), `iat` and `exp`. The role is **not** in the
token; it is read from the database on every request.

### `GET /auth/me`

Requires `Authorization: Bearer <token>`.

| Status | When                                                                                                     |
| ------ | -------------------------------------------------------------------------------------------------------- |
| `200`  | Valid token                                                                                              |
| `401`  | Missing, malformed, expired, revoked, or unknown-user token (the response carries `WWW-Authenticate: Bearer`) |

```bash
curl -i http://localhost:8000/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
```

```http
HTTP/1.1 200 OK

{"id":"6adbd0b95dde127ba5bbc230","full_name":"Ayesha Khan","email":"ayesha@example.com","role":"user","created_at":"2026-10-23T21:25:13.360000Z"}
```

```http
HTTP/1.1 401 Unauthorized
www-authenticate: Bearer

{"error":{"code":"not_authenticated","message":"Not authenticated."}}
```

### `POST /auth/logout`

Requires a valid token. Records the token's `jti` in `revoked_tokens`, so the same token is
refused afterwards even though it has not expired.

| Status | When                                      |
| ------ | ----------------------------------------- |
| `204`  | Token revoked (no body)                   |
| `401`  | Missing, invalid or already-revoked token |

```bash
curl -i -X POST http://localhost:8000/api/v1/auth/logout -H "Authorization: Bearer $TOKEN"
```

```http
HTTP/1.1 204 No Content
```

Calling `/auth/me` with the same token now returns:

```http
HTTP/1.1 401 Unauthorized

{"error":{"code":"not_authenticated","message":"Token has been revoked."}}
```

### `GET /admin/users`  *(admin only)*

Requires a bearer token **for an account whose role is `admin`**. The role is read from
the database on every request, so a promotion or demotion takes effect immediately — a
token minted while the user was an admin stops working the moment the role is removed.

| Status | When                                   |
| ------ | -------------------------------------- |
| `200`  | Caller is an admin                     |
| `401`  | Missing, invalid, expired or revoked token |
| `403`  | Valid token, but not an admin          |

```bash
curl -i "http://localhost:8000/api/v1/admin/users?limit=50&skip=0"   -H "Authorization: Bearer $TOKEN"
```

```http
HTTP/1.1 200 OK

{"items":[{"id":"6adb…","full_name":"Ayesha Khan","email":"ayesha@example.com","role":"user","created_at":"2026-10-23T21:25:13Z"}],"total":1}
```

```http
HTTP/1.1 403 Forbidden

{"error":{"code":"forbidden","message":"You do not have permission to perform this action."}}
```

Password hashes are never selected, let alone returned.

### `PATCH /admin/users/{user_id}/role`  *(admin only)*

| Status | When                                                     |
| ------ | -------------------------------------------------------- |
| `200`  | Role changed                                             |
| `401`  | Not authenticated                                        |
| `403`  | Not an admin — **or** an admin trying to change their own role |
| `404`  | No such user (also returned for a malformed id)          |
| `422`  | Role is not `user` or `admin`                            |

```bash
curl -i -X PATCH http://localhost:8000/api/v1/admin/users/6adb…/role   -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json'   -d '{"role":"admin"}'
```

An admin cannot change their **own** role. Without that guard a sole admin could demote
themselves and leave no way back in through the API.

### Documents  *(private, per-user)*

Metadata only — upload, extraction, OCR and indexing belong to a later module. Every route
requires authentication and is scoped to the caller's own records.

| Method   | Path                      | Status codes                        |
| -------- | ------------------------- | ----------------------------------- |
| `POST`   | `/documents`              | `201`, `401`, `422`                 |
| `GET`    | `/documents`              | `200`, `401`                        |
| `GET`    | `/documents/{id}`         | `200`, `401`, `404`                 |
| `PATCH`  | `/documents/{id}`         | `200`, `401`, `404`, `422`          |
| `DELETE` | `/documents/{id}`         | `204`, `401`, `404`                 |

```bash
curl -i -X POST http://localhost:8000/api/v1/documents   -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json'   -d '{"title":"Office Lease 2026","language":"en","doc_type":"contract"}'
```

```http
HTTP/1.1 201 Created

{"id":"6adc…","title":"Office Lease 2026","language":"en","doc_type":"contract","status":"queued","created_at":"…","updated_at":"…"}
```

**A record belonging to another account returns `404`, not `403`.** A 403 would confirm
that the id exists, which turns the endpoint into an oracle for enumerating other people's
data. From the caller's point of view, a record they do not own simply is not there.

`owner_id` is assigned from the session and is **never** accepted in a request body
(`extra="forbid"` rejects the attempt with 422) and **never** returned in a response.

**Admins are not exempt.** Admins manage the shared legal knowledge base (a later module);
users' private documents are private from everyone, which is the promise the product makes
about confidential contracts.

### Making the first admin

Signup can never create an admin — `role` is server-assigned and always `user` — so the
first one is made out of band:

```bash
cd backend
python -m scripts.promote_admin ibad@yopmail.com            # promote
python -m scripts.promote_admin ibad@yopmail.com --role user  # demote
python -m scripts.promote_admin --list                      # show every account and role
```

After that, admins can manage roles through `PATCH /admin/users/{id}/role`.

### Data model

`users`

| Field           | Type              | Notes                                  |
| --------------- | ----------------- | -------------------------------------- |
| `_id`           | ObjectId          |                                        |
| `full_name`     | string            | Trimmed, 1–100 characters              |
| `email`         | string            | Trimmed, lower-cased, **unique index** |
| `password_hash` | string            | Argon2; never leaves the API           |
| `role`          | `user` \| `admin` | Server-assigned, defaults to `user`    |
| `created_at`    | UTC datetime      |                                        |

`revoked_tokens`

| Field        | Type         | Notes                                                                                                   |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------- |
| `jti`        | string       | Unique index                                                                                            |
| `expires_at` | UTC datetime | **TTL index**, `expireAfterSeconds=0` — rows delete themselves once the JWT would have expired anyway   |

`documents` — private, per-user

| Field        | Type         | Notes                                                                 |
| ------------ | ------------ | --------------------------------------------------------------------- |
| `_id`        | ObjectId     |                                                                       |
| `owner_id`   | ObjectId     | The owning account. **Compound index `(owner_id, created_at desc)`**  |
| `title`      | string       | Trimmed, 1–200 characters                                             |
| `language`   | `en` \| `ur` |                                                                       |
| `doc_type`   | `contract` \| `policy` \| `scan` \| `agreement` |                               |
| `status`     | `queued` → `extracting` → `ocr` → `indexing` → `ready` \| `failed` | Only `queued` is set so far |
| `created_at` | UTC datetime |                                                                       |
| `updated_at` | UTC datetime |                                                                       |

---

## Running the whole thing

Two terminals:

```bash
# terminal 1
cd backend && uvicorn app.main:app --reload

# terminal 2
cd frontend && npm run dev
```

Open <http://localhost:5173>, then: create an account → you are sent to Login with a
confirmation banner and your email pre-filled → sign in → the Dashboard shows your name
and email → reload the page (the session survives) → switch to **اردو** and watch the
layout mirror → **Log out** → you are back on Login, and opening
<http://localhost:5173/dashboard> redirects you to Login again.

---

## Decisions

Decisions made while building this foundation, with the reasoning.

1. **Web app, not mobile.** The product needs a side-by-side document viewer, DOCX/PDF
   export, and mixed LTR/RTL text. All three are considerably easier on the web.
2. **PyMongo's `AsyncMongoClient`, not Motor.** Motor is in maintenance mode; the async API
   now lives in PyMongo itself, so this is the forward-looking choice and one dependency fewer.
3. **Argon2id (`argon2-cffi`) over bcrypt.** Memory-hard, the current OWASP recommendation,
   and not subject to bcrypt's 72-byte password truncation.
4. **Stateless JWT plus a revocation list, rather than server-side sessions.** Keeps the API
   stateless for ordinary requests while still making logout *actually* end the session. The
   TTL index keeps the revocation list small on its own — a revoked `jti` is dropped once the
   token would have expired anyway, so the collection never needs pruning.
5. **The role is not a token claim.** `get_current_user` loads the user from MongoDB on every
   request. A little more I/O, but a role change (or a deletion) takes effect immediately
   instead of whenever the token expires. This is also what will make the planned
   `require_admin` dependency trustworthy.
6. **Signup returns a user, not a token.** It keeps registration and authentication separate
   and leaves room for email verification later without changing the contract.
7. **Identical 401 for wrong password and unknown email, plus a dummy Argon2 verification on
   the unknown-email path.** Without the dummy hash the unknown-email branch returns much
   faster, and that timing difference alone reveals which addresses are registered.
8. **`HTTPBearer(auto_error=False)`.** FastAPI's default returns `403` when the
   `Authorization` header is missing, which is the wrong code; raising `401` ourselves (with
   `WWW-Authenticate: Bearer`) matches the HTTP spec and what clients expect.
9. **A centralised error envelope.** One `{"error": {...}}` shape for validation, 4xx and
   unexpected errors, so the frontend has exactly one error path. Exception details are
   included outside `prod` and stripped in `prod`.
10. **Settings validation refuses a weak `JWT_SECRET` outside `dev`.** Missing, shorter than
    32 characters, or still the example value makes startup fail rather than quietly running
    with a guessable signing key. `dev` stays frictionless.
11. **A unique index *and* an application-level duplicate check on email.** The pre-check
    gives a clean `409`; the index is what actually guarantees uniqueness, and
    `DuplicateKeyError` is caught so two concurrent signups still produce `409` rather than
    a 500.
12. **Tests use a `_test`-suffixed database and refuse to run otherwise.** The guard runs at
    conftest import time, so a misconfigured run aborts during collection — before a single
    query reaches a real database. The database is dropped afterwards.
13. **Token in memory, mirrored in `sessionStorage`.** A reload keeps the session, and it
    ends when the tab closes. Every `sessionStorage` access is wrapped in `try/catch`,
    because it throws in some privacy modes. See [Known hardening items](#known-hardening-items).
14. **The stored token is revalidated against `/auth/me` on app load** rather than trusted.
    An expired or revoked token therefore starts the app signed out, and the Workspace never
    renders with stale user data.
15. **CSS logical properties everywhere** (`padding-inline`, `margin-block`,
    `max-inline-size`…). Adding Urdu later becomes a matter of setting `dir="rtl"` rather
    than rewriting the stylesheet.
16. **Plain CSS, no UI library.** Three screens do not justify the dependency, and it leaves
    the choice open for the document viewer, which has the harder requirements.
17. **Dependencies are pinned exactly** in `requirements.txt`, `requirements-dev.txt` and
    `package.json`, so a fresh clone resolves to the versions this was verified against.
18. **`docker-compose.yml` runs MongoDB only.** It is a convenience for developers without a
    local install — not an orchestration story.

---

## Conventions for future modules

These describe how the next modules should be built. **None of this is implemented yet.**

### Adding a feature

A new feature is three files:

```
backend/app/api/v1/<module>.py             routes — thin, no logic
backend/app/schemas/<module>.py            request/response models
backend/app/services/<module>_service.py   all logic
```

Then register the router in `app/api/v1/router.py`.

### AI providers

Create `backend/app/ai/` **only when the first AI task starts**, with a thin,
provider-agnostic wrapper so OpenAI and Gemini can be swapped without touching callers.
No AI, vector, embedding or OCR dependency belongs in the project before then.

### Private data vs. the shared knowledge base

**Implemented** — see [`app/services/document_service.py`](backend/app/services/document_service.py)
for the working pattern to copy.

Every private record carries `owner_id` (ObjectId) and `created_at`. Service functions for
private data take the current user and **always** filter by it. The pattern worth copying
is that there is no way to *reach* a record without naming its owner — one `_owned_filter`
helper builds every query, and no public function accepts a bare id:

```python
def _owned_filter(current_user: CurrentUser, document_id: str | None = None) -> dict:
    query = {"owner_id": ObjectId(current_user.id)}   # always present
    if document_id is not None:
        query["_id"] = ObjectId(document_id)          # added to the same filter
    return query
```

Someone else's record is reported as **404, not 403** — a 403 confirms the id exists.
Admins do not bypass ownership. The shared legal knowledge base has **no** owner and is
admin-managed; users' private documents are private from everyone.

### Long-running jobs

OCR and indexing start with FastAPI `BackgroundTasks` plus a `status` field on the record:

```
queued → extracting → ocr → indexing → ready | failed
```

Introduce a dedicated worker (and the infrastructure it needs) only if a measured need
appears — not in advance.

### Admin endpoints

**Implemented** — `require_admin` lives in [`app/api/deps.py`](backend/app/api/deps.py)
and is layered on top of `get_current_user`, reading `role` from the database-loaded user:

```python
async def require_admin(current_user: CurrentUserDep) -> CurrentUser:
    if current_user.role != "admin":
        raise ForbiddenError()
    return current_user
```

New admin routes depend on `AdminUserDep` and re-check nothing themselves, so there is one
gate to audit rather than a check repeated in every handler. Signup can never create an
admin; the first one is made with `python -m scripts.promote_admin <email>`.

---

## Known hardening items

Deliberate, documented trade-offs to revisit before any real deployment.

- **Move the access token to an httpOnly, Secure, SameSite cookie.** The token currently
  lives in memory and is mirrored in `sessionStorage`, which is readable by any script on
  the page, so it is exposed to XSS. A cookie plus CSRF protection is the proper fix; it was
  left out here because it changes the auth contract on both sides and belongs with a
  refresh-token design rather than in the foundation.
- **Refresh tokens.** There is one 60-minute access token and no refresh flow, so a user is
  signed out when it expires.
- **Rate limiting** on `/auth/login` and `/auth/signup` (explicitly out of scope here).
- **Email verification** on signup.
- **Password reset.**
- **`CORS_ORIGINS` must be set to the real origin in production** — the default only covers
  the local Vite dev server.
