# eBMR — Electronic Batch Manufacturing Record

A web-based pharmaceutical batch manufacturing management system that digitises and regulates the entire production lifecycle, from batch creation through quality review to final release. Built with compliance-first design: every action is logged, critical transitions require electronic signatures, and role-based access controls enforce regulatory workflows.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Project Structure](#project-structure)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Test Users & Credentials](#test-users--credentials)
6. [Product Templates & Materials](#product-templates--materials)
7. [Role System](#role-system)
8. [Application Pages & Routes](#application-pages--routes)
9. [The Full Batch Lifecycle](#the-full-batch-lifecycle)
10. [State Transition Matrix](#state-transition-matrix)
11. [Step Execution & Auto-Deviation Flow](#step-execution--auto-deviation-flow)
12. [Material Issuance Flow](#material-issuance-flow)
13. [Deviations Workflow](#deviations-workflow)
14. [Issues Workflow](#issues-workflow)
15. [Electronic Signatures](#electronic-signatures)
16. [Audit Trail](#audit-trail)
17. [Authentication & Token Flow](#authentication--token-flow)
18. [Data Model](#data-model)
19. [API Reference](#api-reference)
20. [Testing Checklist](#testing-checklist)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | NestJS (Node.js + TypeScript) |
| Database | PostgreSQL via Prisma ORM |
| Job queues / async audit | Bull + Redis |
| Auth | JWT (access + refresh) + Passport.js |
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite |
| UI library | Ant Design v5 |
| State management | Redux Toolkit |
| HTTP client | Axios (with auto token-refresh interceptor) |
| Barcode / QR | html5-qrcode (scan), react-barcode (generate) |
| Date utilities | dayjs |

---

## Project Structure

```
eBMR/
├── ebmr-backend/          # NestJS API server
│   ├── prisma/
│   │   ├── schema.prisma  # Full data model
│   │   └── migrations/    # DB migration history
│   └── src/
│       ├── auth/          # Login, JWT, refresh token
│       ├── batches/       # Batch CRUD, state transitions, steps
│       ├── deviations/    # Deviation management
│       ├── issues/        # Issue tracking
│       ├── materials/     # Material master data
│       ├── bom/           # Bill of Materials & issuances
│       ├── audit/         # Audit log (append-only)
│       └── seed/          # Database seed (users, templates, materials)
│
└── ebmr-frontend/         # React + Vite SPA
    └── src/
        ├── pages/         # Route-level page components
        ├── components/    # Shared UI (StepWizard, ESignatureModal, BarcodeScanner…)
        ├── store/         # Redux slices
        └── api/           # Axios instances & API call functions
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (running locally or via Docker)
- Redis (running locally or use Upstash cloud URL)

### Backend

```bash
cd ebmr-backend
npm install

# Copy and configure your environment
cp .env.example .env        # then fill in DATABASE_URL, REDIS_URL, JWT secrets

# Run migrations and seed the database, then start
npm run start:migrate

# OR — if DB is already seeded, just start in watch mode
npm run start:dev
```

Backend listens on **http://localhost:3001** by default.

### Frontend

```bash
cd ebmr-frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**.

> The frontend proxies `/api` requests to `http://localhost:3001` in development.
> Set `VITE_API_URL` for production builds.

---

## Environment Variables

### Backend (`.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — (required) |
| `REDIS_URL` | Redis URL (Upstash or local) | — |
| `REDIS_HOST` | Redis host (if not using URL) | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `JWT_SECRET` | Access token signing key | `dev_jwt_secret_change_in_prod` |
| `JWT_REFRESH_SECRET` | Refresh token signing key | `dev_refresh_secret_change_in_prod` |
| `JWT_EXPIRES_IN` | Access token expiry | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `8h` |
| `PORT` | HTTP port | `3001` |

### Frontend (`.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend base URL (production only) |

---

## Test Users & Credentials

All passwords: **`Test@1234`**

| Email | Name | Role |
|-------|------|------|
| `batch_operator@ebmr.dev` | Alex Operator | BATCH_OPERATOR |
| `supervisor@ebmr.dev` | Sam Supervisor | SUPERVISOR |
| `qa_reviewer@ebmr.dev` | Quinn Reviewer | QA_REVIEWER |
| `qa_manager@ebmr.dev` | Morgan Manager | QA_MANAGER |
| `qualified_person@ebmr.dev` | Jordan QP | QUALIFIED_PERSON |

---

## Product Templates & Materials

### Batch Templates

Two reusable product templates are seeded:

| Product Code | Product Name | Steps |
|-------------|-------------|-------|
| `PARA-500` | Paracetamol 500mg Tablet | Dispensing → Dry Mixing → Granulation → Compression → Final Inspection |
| `AMOX-250` | Amoxicillin 250mg Capsule | Dispensing → Blending → Capsule Filling → Polishing → Final Inspection |

Each step has **required fields** with defined min/max ranges. Entering values outside these ranges automatically triggers a deviation.

### Materials Master (9 seeded items)

| Material Code | Name | Unit |
|--------------|------|------|
| `MAT-PARA-API` | Paracetamol API | g |
| `MAT-STARCH` | Starch BP | g |
| `MAT-MGST` | Magnesium Stearate | g |
| `MAT-PVP` | PVP K-30 | g |
| `MAT-WATER` | Purified Water | mL |
| `MAT-AMOX-API` | Amoxicillin Trihydrate API | g |
| `MAT-LACTOSE` | Lactose Monohydrate | g |
| `MAT-GELCAP` | Gelatin Capsules (Size 1) | units |
| `MAT-TALC` | Talc BP | g |

---

## Role System

Roles are hierarchical — a higher role can do everything a lower role can.

| Role | Level | Key Capabilities |
|------|-------|-----------------|
| `BATCH_OPERATOR` | 1 | Create batches, enter step data, issue materials |
| `SUPERVISOR` | 2 | + Approve line clearance, begin production, submit to QA, skip steps, manage BoM |
| `QA_REVIEWER` | 3 | + Manually raise/close deviations, place batches on HOLD, toggle DEVIATION state |
| `QA_MANAGER` | 4 | + Approve QA review and send batch to Qualified Person |
| `QUALIFIED_PERSON` | 5 | + Release or reject batches (cannot create batches) |

---

## Application Pages & Routes

### Public

| Route | Description |
|-------|-------------|
| `/login` | Email + password login form |

### Protected (require valid JWT)

| Route | Description |
|-------|-------------|
| `/` | Redirect → `/dashboard` |
| `/dashboard` | Table of all batches with state, deviations count, timestamps |
| `/batches/new` | Create a new batch (hidden for QUALIFIED_PERSON) |
| `/batches/:id` | Batch detail — tabbed view (Overview, Steps, Materials, Deviations, Issues, Audit) |
| `/batches/:id/audit` | Dedicated full audit trail for a batch |
| `/deviations` | List of all deviations with filters |
| `/deviations/:id` | Deviation detail and status management |
| `/issues` | List of all quality issues with filters |
| `/issues/:id` | Issue detail, assignment, resolution |
| `/materials` | Material master list |
| `/bom` | Bill of Materials template definitions |

---

## The Full Batch Lifecycle

This is the end-to-end journey a batch takes from creation to release, with the actors responsible at each stage.

```
                  ┌──────────────────────────────────────────────────────────────┐
                  │                  BATCH STATE MACHINE                         │
                  └──────────────────────────────────────────────────────────────┘

[BATCH_OPERATOR]
  1. Create batch → select template (PARA-500 or AMOX-250), enter batch number & size
     State: DRAFT

  2. Initiate batch (no e-sig required)
     DRAFT ──────────────────────────────────────────► INITIATED

[SUPERVISOR]
  3. Approve line clearance ★ (e-signature required)
     INITIATED ─────────────────────────────────────► LINE_CLEARANCE

  4. Begin production ★ (e-signature required)
     LINE_CLEARANCE ─────────────────────────────────► IN_PROGRESS

[BATCH_OPERATOR / any role]
  5. Complete manufacturing steps one by one
     - Enter actual measured values per field
     - Values validated against min/max ranges
     - Out-of-range values AUTO-RAISE a deviation

  6. Issue materials (via BoM tab)
     - Scan barcode or manually enter lot number
     - Record issued quantity vs required quantity

[QA_REVIEWER] (optional, at any point during IN_PROGRESS)
  7a. Place batch ON HOLD if issues arise
      IN_PROGRESS ───────────────────────────────────► HOLD
      HOLD ──────────────────────────────────────────► IN_PROGRESS  (resume)

  7b. Mark batch as DEVIATION state if unresolved deviations block progress
      IN_PROGRESS ───────────────────────────────────► DEVIATION
      DEVIATION ─────────────────────────────────────► IN_PROGRESS  (cleared)

[SUPERVISOR]
  8. Submit batch to QA after all steps complete ★ (e-signature required)
     IN_PROGRESS ────────────────────────────────────► PENDING_QA

[QA_MANAGER]
  9. Review and approve for Qualified Person ★ (e-signature required)
     PENDING_QA ─────────────────────────────────────► PENDING_QP

[QUALIFIED_PERSON]
  10a. Release batch ★ (e-signature required)
       PENDING_QP ────────────────────────────────────► RELEASED  ✓

  10b. Reject batch ★ (e-signature required)
       PENDING_QP ────────────────────────────────────► REJECTED  ✗
```

`★` = Critical transition — requires the user to re-enter their password (electronic signature).

---

## State Transition Matrix

| From State | To State | Min Role Required | E-Signature? | Signature Meaning |
|-----------|---------|-------------------|:------------:|------------------|
| DRAFT | INITIATED | BATCH_OPERATOR | No | Performed By |
| INITIATED | LINE_CLEARANCE | SUPERVISOR | Yes | Verified By |
| LINE_CLEARANCE | IN_PROGRESS | SUPERVISOR | Yes | Verified By |
| IN_PROGRESS | PENDING_QA | SUPERVISOR | Yes | Verified By |
| IN_PROGRESS | HOLD | QA_REVIEWER | No | Approved By |
| IN_PROGRESS | DEVIATION | QA_REVIEWER | No | Approved By |
| DEVIATION | IN_PROGRESS | QA_REVIEWER | No | Approved By |
| DEVIATION | HOLD | QA_REVIEWER | No | Approved By |
| HOLD | IN_PROGRESS | QA_REVIEWER | No | Approved By |
| HOLD | DEVIATION | QA_REVIEWER | No | Approved By |
| PENDING_QA | PENDING_QP | QA_MANAGER | Yes | Approved By |
| PENDING_QA | HOLD | QA_REVIEWER | No | Approved By |
| PENDING_QP | RELEASED | QUALIFIED_PERSON | Yes | Released By |
| PENDING_QP | REJECTED | QUALIFIED_PERSON | Yes | Approved By |

---

## Step Execution & Auto-Deviation Flow

Each batch template defines a series of manufacturing steps. Steps are shown in the **Steps tab** of the batch detail page.

### How steps work

1. User opens a batch in `IN_PROGRESS` (or `LINE_CLEARANCE`) state.
2. Opens the **Steps** tab — a wizard shows each step in sequence.
3. Each step contains one or more **required fields** (e.g., "Blend Temperature", "Tablet Hardness").
4. Each field has a defined **min** and **max** acceptable range.
5. User enters the **actual measured value** and submits.
6. Backend validates:
   - If value is **within range** → step marked `COMPLETED`.
   - If value is **out of range** → step still completes, but a **Deviation is automatically raised**.
7. Steps can be **skipped** by SUPERVISOR or higher with a reason.
8. All step completions (and skips) are recorded in the audit log.

### Auto-Deviation example

```
Step: Granulation
Field: Granule Moisture Content (%)
Expected range: 2.0 – 4.0 %
Actual entered: 5.2 %

→ Step marked COMPLETED
→ Deviation auto-raised:
   fieldName: "Granule Moisture Content"
   expectedRange: "2.0 - 4.0"
   actualValue: 5.2
   status: OPEN
```

---

## Material Issuance Flow

Each batch template has a **Bill of Materials (BoM)** — a list of materials with `qtyPerKg` (quantity required per 1 kg of batch output).

### How issuance works

1. Open the batch detail → **Materials tab**.
2. The required quantity for each material is auto-calculated:
   ```
   requiredQty = bomItem.qtyPerKg × batch.batchSize
   ```
3. Click **Issue Material** for a BoM line item.
4. In the modal:
   - Either **scan the material barcode/QR** using the camera, or enter the lot number manually.
   - The system looks up the material by code and pre-fills details.
   - Enter the **issued quantity**.
5. Submit — the issuance is recorded with: lotNumber, requiredQty, issuedQty, issuedBy, issuedAt.
6. The entry appears in the issuances list for that batch.

### Barcode/QR lookup

- `GET /api/materials/barcode/:code` — looks up a material by its `materialCode`.
- The barcode scanner component (`BarcodeScanner.tsx`) reads the camera feed and resolves the code automatically.
- Barcode labels can be generated and printed from the Materials master list page.

---

## Deviations Workflow

Deviations represent out-of-specification conditions during manufacturing.

### Sources

| Source | How |
|--------|-----|
| Auto-raised | Step field value outside min/max range on step completion |
| Manually raised | QA_REVIEWER+ creates via Deviations page or batch detail |

### Deviation lifecycle

```
OPEN  ──────────────────► UNDER_REVIEW  ──────────────────► CLOSED
        (QA_REVIEWER+)                      (QA_REVIEWER+,
                                             with resolution notes)
```

### Fields

- `batchId`, `stepNumber`, `fieldName`
- `expectedRange` (string, e.g., `"2.0 - 4.0"`)
- `actualValue` (float)
- `raisedBy`, `raisedAt`
- `status` (OPEN / UNDER_REVIEW / CLOSED)
- `resolutionNotes`, `closedBy`, `closedAt`

### Access rules

| Action | Min Role |
|--------|----------|
| View deviations | Any authenticated user |
| Manually raise deviation | QA_REVIEWER |
| Update status (→ UNDER_REVIEW) | QA_REVIEWER |
| Close deviation (with notes) | QA_REVIEWER |

---

## Issues Workflow

Issues are a general quality tracking mechanism — they can be batch-related or standalone.

### Issue lifecycle

```
OPEN  ──► IN_PROGRESS  ──► RESOLVED  ──► CLOSED
```

### Fields

- `title`, `description`
- `severity` (LOW / MEDIUM / HIGH / CRITICAL)
- `status` (OPEN / IN_PROGRESS / RESOLVED / CLOSED)
- `batchId` (optional — link to a specific batch)
- `raisedBy`, `assignedTo` (optional), `resolvedBy` (optional)
- `resolution` (text, filled on resolve)

### Access rules

| Action | Min Role |
|--------|----------|
| Create issue | Any authenticated user |
| Assign issue | Any authenticated user |
| Resolve issue (with resolution text) | Any authenticated user |
| Close issue | Any authenticated user |

---

## Electronic Signatures

Critical state transitions require the user to re-authenticate by entering their password. This acts as an electronic signature under pharmaceutical GMP (Good Manufacturing Practice) regulations.

### How it works

1. User attempts a critical transition (e.g., INITIATED → LINE_CLEARANCE).
2. An **E-Signature Modal** appears (`ESignatureModal.tsx`).
3. User enters their current password.
4. Frontend sends the transition request with the password included.
5. Backend verifies the password via bcrypt against the stored hash.
6. If valid, transition proceeds and a signature record is appended to `batch.signatures`:
   ```json
   {
     "userId": "...",
     "userName": "Sam Supervisor",
     "userRole": "SUPERVISOR",
     "timestamp": "2026-03-30T10:15:00Z",
     "meaning": "Verified By",
     "transition": "INITIATED → LINE_CLEARANCE"
   }
   ```
7. All signatures are visible in the **Overview tab** of the batch.

The password is **never stored** from this flow — only verified in-flight via bcrypt.

---

## Audit Trail

Every meaningful action in the system is recorded in an **append-only** `AuditLog` table. Rows are never updated or deleted.

### What gets logged

- User login events
- Batch created / state changed
- Step completed / skipped (with before/after values)
- Deviation raised / status changed / closed
- Material issuance recorded
- Issue created / status changed / resolved
- E-signatures added

### Audit log fields

| Field | Description |
|-------|-------------|
| `eventType` | Human-readable event name (e.g., `BATCH_STATE_CHANGED`) |
| `entityType` | Type of entity affected (e.g., `Batch`, `Deviation`) |
| `entityId` | ID of the affected entity |
| `batchId` | FK to Batch (if batch-related) |
| `actorId` | User who performed the action |
| `actorRole` | Role of that user at the time |
| `timestamp` | When it happened |
| `beforeState` | JSON snapshot before the change |
| `afterState` | JSON snapshot after the change |
| `metadata` | Extra context (e.g., field name, value, signature) |

### Viewing the audit trail

- Per-batch: open batch detail → **Audit Trail tab**, or navigate to `/batches/:id/audit`.
- Displayed chronologically with actor name, role, event type, and before/after state.

---

## Authentication & Token Flow

### Login

```
POST /api/auth/login
Body: { email, password }

Response:
{
  accessToken: "eyJ...",    // JWT, expires in 15 minutes
  refreshToken: "eyJ...",   // JWT, expires in 8 hours (stored in DB)
  user: { id, email, name, role }
}
```

Tokens are stored in **localStorage** by the frontend.

### JWT payload

```json
{
  "sub": "<userId>",
  "email": "supervisor@ebmr.dev",
  "role": "SUPERVISOR",
  "name": "Sam Supervisor"
}
```

### Automatic token refresh

Axios intercepts every 401 response:
1. Sends `POST /api/auth/refresh` with the stored refresh token.
2. Receives a new access token.
3. Retries the original failed request.
4. If refresh also fails → clears localStorage and redirects to `/login`.

### Route protection

All non-login routes are wrapped in a `PrivateRoute` component that checks for a valid access token in localStorage. Missing or expired tokens without a valid refresh cause an immediate redirect to `/login`.

---

## Data Model

```
User
 ├── Batch[]             (initiated_by)
 ├── AuditLog[]
 ├── Deviation[]         (raised_by)
 ├── MaterialIssuance[]
 └── Issue[]             (raised_by / assigned_to / resolved_by)

BatchTemplate
 ├── Batch[]
 └── BomItem[]

Batch
 ├── steps               (JSON — step definitions + actual values + status)
 ├── signatures          (JSON array of e-signature records)
 ├── Deviation[]
 ├── AuditLog[]
 ├── MaterialIssuance[]
 └── Issue[]

Deviation
 └── Batch

BomItem
 ├── BatchTemplate
 ├── Material
 └── MaterialIssuance[]

MaterialIssuance
 ├── Batch
 ├── BomItem
 └── Material

Issue
 └── Batch (optional)

AuditLog
 ├── User  (actor)
 └── Batch (optional)
```

### Batch States (enum)

```
DRAFT → INITIATED → LINE_CLEARANCE → IN_PROGRESS → PENDING_QA → PENDING_QP → RELEASED
                                         ↕               ↑                  ↘ REJECTED
                                        HOLD             |
                                         ↕               |
                                      DEVIATION ─────────┘
```

---

## API Reference

All endpoints are prefixed with `/api`.

### Auth

| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/auth/login` | Login with email + password |
| POST | `/auth/refresh` | Exchange refresh token for new access token |
| GET | `/auth/me` | Get current user info |

### Batches

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/batches` | List all batches |
| POST | `/batches` | Create new batch |
| GET | `/batches/templates` | List available product templates |
| GET | `/batches/:id` | Get batch detail |
| PUT | `/batches/:id/transition` | Perform state transition |
| PUT | `/batches/:id/steps/:stepNumber/complete` | Complete a step |
| PUT | `/batches/:id/steps/:stepNumber/skip` | Skip a step (SUPERVISOR+) |
| POST | `/batches/:id/signature` | Add manual signature |

### Deviations

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/deviations` | List deviations (filterable) |
| POST | `/deviations` | Manually create a deviation |
| GET | `/deviations/:id` | Get deviation detail |
| PUT | `/deviations/:id/status` | Update status |
| PUT | `/deviations/:id/close` | Close with resolution notes |

### Issues

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/issues` | List issues (filterable) |
| POST | `/issues` | Create new issue |
| GET | `/issues/:id` | Get issue detail |
| PUT | `/issues/:id/status` | Update status |
| PUT | `/issues/:id/resolve` | Resolve with resolution text |
| PUT | `/issues/:id/close` | Close issue |

### Materials

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/materials` | List all materials |
| POST | `/materials` | Create material |
| GET | `/materials/:id` | Get material by ID |
| PUT | `/materials/:id` | Update material |
| GET | `/materials/barcode/:code` | Look up material by material code |

### Bill of Materials

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/bom/templates/:templateId` | Get BoM for a template |
| POST | `/bom/templates/:templateId/items` | Add item to BoM |
| DELETE | `/bom/items/:id` | Remove BoM item |
| GET | `/bom/batches/:batchId` | Get required materials for a batch |
| GET | `/bom/batches/:batchId/issuances` | Get all issuances for a batch |
| POST | `/bom/batches/:batchId/issuances` | Record material issuance |

---

## Testing Checklist

Use this list to verify all major functionality end-to-end.

### Authentication
- [ ] Login with each of the 5 test users (all passwords: `Test@1234`)
- [ ] Confirm redirect to `/dashboard` on successful login
- [ ] Confirm failed login shows error message
- [ ] Log out and confirm redirect to `/login`
- [ ] Verify token auto-refresh (wait 15 min or manipulate localStorage to test)

### Dashboard
- [ ] View batch list — table shows batch number, product, state, deviations, dates
- [ ] Filter by state
- [ ] Click a batch row to navigate to batch detail
- [ ] Verify "Create Batch" button is hidden for QUALIFIED_PERSON

### Batch Creation
- [ ] Create batch as BATCH_OPERATOR — select PARA-500, enter batch number + size
- [ ] Create batch as BATCH_OPERATOR — select AMOX-250
- [ ] Confirm new batch appears in dashboard in DRAFT state

### Batch State Transitions (full happy path — use separate sessions per role)
- [ ] BATCH_OPERATOR: DRAFT → INITIATED (no e-sig prompt)
- [ ] SUPERVISOR: INITIATED → LINE_CLEARANCE (e-sig prompt appears, enter password)
- [ ] SUPERVISOR: LINE_CLEARANCE → IN_PROGRESS (e-sig prompt)
- [ ] SUPERVISOR: IN_PROGRESS → PENDING_QA (e-sig prompt, after steps done)
- [ ] QA_MANAGER: PENDING_QA → PENDING_QP (e-sig prompt)
- [ ] QUALIFIED_PERSON: PENDING_QP → RELEASED (e-sig prompt)
- [ ] QUALIFIED_PERSON: PENDING_QP → REJECTED (separate batch, e-sig prompt)

### E-Signature
- [ ] Enter wrong password on a critical transition — confirm rejection
- [ ] Enter correct password — confirm transition proceeds
- [ ] Verify signature record appears in batch Overview tab

### Steps
- [ ] Complete a step with all values within range — step shows COMPLETED, no deviation raised
- [ ] Complete a step with a value out of range — step completes AND deviation auto-raised
- [ ] Attempt to skip a step as BATCH_OPERATOR — confirm it is blocked
- [ ] Skip a step as SUPERVISOR with a reason
- [ ] Verify step completion appears in audit trail

### Deviations
- [ ] View auto-raised deviation in batch detail Deviations tab
- [ ] Navigate to `/deviations` and see it listed
- [ ] As QA_REVIEWER: update status OPEN → UNDER_REVIEW
- [ ] As QA_REVIEWER: close deviation with resolution notes
- [ ] As QA_REVIEWER: manually raise a deviation from the Deviations page
- [ ] Attempt to close a deviation as BATCH_OPERATOR — confirm blocked
- [ ] Place batch in DEVIATION state and then resume to IN_PROGRESS

### Hold State
- [ ] As QA_REVIEWER: transition IN_PROGRESS → HOLD
- [ ] Confirm steps cannot be completed while on HOLD
- [ ] As QA_REVIEWER: transition HOLD → IN_PROGRESS to resume

### Materials & Bill of Materials
- [ ] Navigate to `/materials` — view seeded material list
- [ ] Add a new material (name, code, unit)
- [ ] Navigate to `/bom` — view BoM for PARA-500 and AMOX-250
- [ ] Add a new BoM item to a template (as SUPERVISOR+)
- [ ] Delete a BoM item
- [ ] Open a batch in IN_PROGRESS → Materials tab
- [ ] Issue a material by entering lot number manually
- [ ] Issue a material using the barcode scanner
- [ ] Verify issued quantities appear in the issuance list

### Issues
- [ ] Create an issue as BATCH_OPERATOR (no batch link, severity LOW)
- [ ] Create an issue linked to a specific batch (severity HIGH)
- [ ] Assign issue to another user
- [ ] Update status OPEN → IN_PROGRESS
- [ ] Resolve issue with resolution text
- [ ] Close issue
- [ ] View issue in `/issues/:id`

### Audit Trail
- [ ] Open `/batches/:id/audit` for a batch that has gone through several transitions
- [ ] Verify login event, batch creation, state changes, step completions all appear
- [ ] Verify before/after state is shown for state changes
- [ ] Verify actor name and role are shown for each event
- [ ] Verify e-signature events are logged

### Role Restrictions (negative tests)
- [ ] BATCH_OPERATOR cannot skip steps
- [ ] BATCH_OPERATOR cannot manually raise a deviation
- [ ] BATCH_OPERATOR cannot close a deviation
- [ ] BATCH_OPERATOR cannot perform SUPERVISOR-level transitions
- [ ] QUALIFIED_PERSON cannot see "Create Batch" button
- [ ] SUPERVISOR cannot perform QA_MANAGER-level transitions
- [ ] Wrong-role user attempting an API call directly returns 403

### Token & Session
- [ ] Refresh token works after access token expires
- [ ] Logging out clears localStorage and prevents accessing protected routes
- [ ] Opening a protected route when logged out redirects to `/login`
