# Mabar API Reference

Base URL: `https://mainbareng-app.vercel.app` (live `dev`) · `http://localhost:3001` (local `dev`).

All `/api/profile/*` endpoints require Supabase Auth header: `Authorization: Bearer <access_token>`. Session and venue endpoints currently have no auth middleware enforced.

> Note: Wave 1–4 routes are live on `dev` (`https://mainbareng-app.vercel.app`). Branch `main` has not been synced with Wave 3–4 yet.

---

## Profile Endpoints (Auth Required)

### Get My Profile

```
GET /api/profile/me
```

Returns current user's profile. Auto-creates a fallback row (`credit_score: 100`) if not yet present in `profiles`.

**Response `200`**

```json
{
  "success": true,
  "profile": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@student.umn.ac.id",
    "full_name": "Jerikho",
    "avatar_url": null,
    "phone_number": "081234567890",
    "credit_score": 100,
    "total_sessions_completed": 0,
    "show_up_rate": 100,
    "is_suspended": false,
    "created_at": "2026-11-10T00:00:00Z",
    "updated_at": "2026-11-10T00:00:00Z"
  }
}
```

---

### Update My Profile

```
PUT /api/profile/me
```

All fields optional; omitted or empty `full_name` is ignored.

**Request**

```json
{
  "full_name": "Jerikho Ruben",
  "phone_number": "081234567890",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**Response `200`** — same shape as `GET /api/profile/me`.

---

### List My Activity Profiles

```
GET /api/profile/activities
```

**Response `200`**

```json
{
  "success": true,
  "activities": [
    {
      "id": "a1b2c3d4-0000-0000-0000-000000000001",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "activity_type": "badminton",
      "in_game_name": "Jer",
      "game_id_tag": null,
      "preferred_role": "doubles",
      "skill_rating_level": "Intermediate",
      "skill_rating_points": 1400,
      "created_at": "2026-11-10T00:00:00Z",
      "updated_at": "2026-11-10T00:00:00Z"
    }
  ]
}
```

---

### Upsert Activity Profile

```
POST /api/profile/activities
```

Upserts on `(user_id, activity_type)`. `activity_type` is required and normalized to lowercase. Defaults: `skill_rating_level` = `"Beginner"`, `skill_rating_points` = `1200`.

**Request**

```json
{
  "activity_type": "futsal",
  "in_game_name": "Jer10",
  "game_id_tag": null,
  "preferred_role": "anchor",
  "skill_rating_level": "Intermediate",
  "skill_rating_points": 1400
}
```

**Response `200`**

```json
{
  "success": true,
  "activity": {
    "id": "a1b2c3d4-0000-0000-0000-000000000002",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "activity_type": "futsal",
    "in_game_name": "Jer10",
    "game_id_tag": null,
    "preferred_role": "anchor",
    "skill_rating_level": "Intermediate",
    "skill_rating_points": 1400,
    "created_at": "2026-11-11T03:00:00Z",
    "updated_at": "2026-11-11T03:00:00Z"
  }
}
```

---

### Get My Credit Score History

```
GET /api/profile/me/credit-history
```

Returns Credit Score ledger entries (`credit_transactions`) for the authenticated user, ordered by `created_at` descending.

**Response `200`**

```json
{
  "success": true,
  "transactions": [
    {
      "id": "d1e2f3a4-0000-0000-0000-000000000001",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "session_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "delta": 5,
      "reason": "COMMENDED_SPORTSMANSHIP",
      "balance_after": 100,
      "created_at": "2026-11-11T13:00:00Z"
    }
  ]
}
```

---

## Session & Venue Endpoints (No Auth Middleware)

### List Venues

```
GET /api/venues?category=sports
```

Query `category` is optional (`sports` | `esports`). Ordered by `name`.

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "GOR Candra Wijaya International Badminton Centre",
      "address": "Jl. Jelupang Utama No.15, Serpong Utara",
      "city": "Tangerang Selatan",
      "category": "sports",
      "supported_activities": ["badminton"],
      "rate_hourly_min": 75000,
      "rate_hourly_max": 120000,
      "contact_whatsapp": "6281298765431",
      "maps_url": "https://maps.google.com/?q=GOR+Candra+Wijaya",
      "created_at": "2026-11-10T00:00:00Z",
      "updated_at": "2026-11-10T00:00:00Z"
    }
  ]
}
```

---

### List Sessions

```
GET /api/sessions?category=sports&mode=scheduled
```

Queries `category` (`sports` | `esports`) and `mode` (`play_now` | `scheduled`) are optional. Ordered by `start_time` ascending. Includes joined `profiles` (host) and `venues`.

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      "host_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Badminton Santai Gading Serpong",
      "activity_type": "badminton",
      "session_category": "sports",
      "session_mode": "scheduled",
      "status": "OPEN",
      "venue_id": "11111111-1111-1111-1111-111111111111",
      "custom_location": null,
      "start_time": "2026-11-12T19:00:00Z",
      "duration_minutes": 60,
      "end_time": null,
      "max_slots": 8,
      "min_credit_score": 70,
      "required_skill_level": null,
      "team_format": "2_teams",
      "estimated_cost_total": 180000,
      "notes": null,
      "created_at": "2026-11-11T03:00:00Z",
      "updated_at": "2026-11-11T03:00:00Z",
      "profiles": {
        "full_name": "Jerikho",
        "credit_score": 100
      },
      "venues": {
        "name": "GOR Candra Wijaya International Badminton Centre",
        "address": "Jl. Jelupang Utama No.15, Serpong Utara"
      }
    }
  ]
}
```

---

### Create Session

```
POST /api/sessions/create
```

Required fields: `host_id`, `title`, `activity_type`, `max_slots` (`> 1`), `start_time`. Returns HTTP `200` on insert.

Defaults: `session_category` = `"sports"`, `session_mode` = `"scheduled"`, `venue_id` = `null`, `min_credit_score` = `70`, `team_format` = `"2_teams"`, `estimated_cost_total` = `0`, `status` = `"OPEN"`.

**Request**

```json
{
  "host_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Badminton Santai Gading Serpong",
  "activity_type": "badminton",
  "session_category": "sports",
  "session_mode": "scheduled",
  "venue_id": "11111111-1111-1111-1111-111111111111",
  "custom_location": null,
  "start_time": "2026-11-12T19:00:00Z",
  "max_slots": 8,
  "min_credit_score": 70,
  "team_format": "2_teams",
  "estimated_cost_total": 180000
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "host_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Badminton Santai Gading Serpong",
    "activity_type": "badminton",
    "session_category": "sports",
    "session_mode": "scheduled",
    "status": "OPEN",
    "venue_id": "11111111-1111-1111-1111-111111111111",
    "custom_location": null,
    "start_time": "2026-11-12T19:00:00Z",
    "duration_minutes": 60,
    "end_time": null,
    "max_slots": 8,
    "min_credit_score": 70,
    "required_skill_level": null,
    "team_format": "2_teams",
    "estimated_cost_total": 180000,
    "notes": null,
    "created_at": "2026-11-11T03:00:00Z",
    "updated_at": "2026-11-11T03:00:00Z"
  }
}
```

---

### Join Session

```
POST /api/sessions/join
```

Calls `join_session_atomic` RPC with row-level lock (`FOR UPDATE`). Assigns the lowest open slot and sets session `status` to `"LOCKED"` when full.

**Request**

```json
{
  "session_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  "user_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Joined successfully",
  "slot_number": 1,
  "session_locked": false
}
```

**Response `400`** — rule rejection (not full payload):

```json
{
  "success": false,
  "message": "Credit score below session requirement"
}
```

Rejection `message` values: `Session not found` | `Session is no longer open for joining` | `User profile not found` | `Account is suspended` | `Credit score below session requirement` | `User already joined this session` | `Session is full` | `No vacant slot available`

---

### Split Teams

```
POST /api/sessions/:id/teams/split
```

Splits active participants (`attendance_status != 'CANCELLED'`) into `Team A` and `Team B` using skill rating (80%) + credit score (20%), then updates `assigned_team` in `session_participants`. Requires at least 2 active participants. No request body required.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "session_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "team_a": {
      "name": "Team A",
      "total_skill": 1450,
      "average_skill": 1450,
      "members": [
        {
          "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          "session_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          "user_id": "550e8400-e29b-41d4-a716-446655440000",
          "is_guest": false,
          "guest_name": null,
          "invited_by_user_id": null,
          "lock_as_duo": false,
          "slot_number": 1,
          "assigned_team": "Team A",
          "skill_rating_points": 1450,
          "full_name": "Andi",
          "credit_score": 100
        }
      ]
    },
    "team_b": {
      "name": "Team B",
      "total_skill": 1350,
      "average_skill": 1350,
      "members": [
        {
          "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
          "session_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          "user_id": "660e8400-e29b-41d4-a716-446655440001",
          "is_guest": false,
          "guest_name": null,
          "invited_by_user_id": null,
          "lock_as_duo": false,
          "slot_number": 2,
          "assigned_team": "Team B",
          "skill_rating_points": 1350,
          "full_name": "Budi",
          "credit_score": 95
        }
      ]
    },
    "skill_difference_percent": 6.9
  }
}
```

---

### Update Session Status

```
PATCH /api/sessions/:id/status
```

Host-only status transition. When transitioning to `"COMPLETED"`, recalculates `total_sessions_completed` and `show_up_rate` in `profiles` for all non-`CANCELLED` participants in the session.

Allowed transitions:
- `OPEN` → `LOCKED` \| `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED`
- `LOCKED` → `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED`
- `IN_PROGRESS` → `COMPLETED` \| `CANCELLED`
- `COMPLETED` / `CANCELLED` → final (all further changes rejected with `400`)

**Request**

```json
{
  "host_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "host_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Badminton Santai Gading Serpong",
    "status": "COMPLETED",
    "updated_at": "2026-11-11T13:00:00Z"
  }
}
```

Errors: `400` (invalid UUID/payload or disallowed status transition), `403` (`host_id` is not session host), `404` (session not found), `409` (concurrent status conflict).

---

### Get Review Targets

```
GET /api/sessions/:id/review-targets?reviewer_id=<user_uuid>
```

Returns active session participants eligible for post-match peer review (excludes `reviewer_id` and `CANCELLED` participants), ordered by `slot_number` ascending. Session status must be `"COMPLETED"`.

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "participant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
      "display_name": "Budi",
      "is_guest": false,
      "assigned_team": "Team B"
    }
  ]
}
```

Errors: `400` (invalid UUIDs or session not `COMPLETED`), `403` (`reviewer_id` is not an active participant), `404` (session not found).

---

### Submit Peer Reviews

```
POST /api/sessions/:id/reviews
```

Executes `submit_peer_reviews_atomic` RPC. Session must be `"COMPLETED"`; `reviewer_id` and non-guest `target_participant_id`s must be active participants; self-review is rejected (`400`). Items with `"is_guest": true` are skipped and listed in `skipped_guests`. Duplicate `(session_id, reviewer_id, target_user_id)` returns `409`.

Credit Score delta rules (`CREDIT_SCORE_RULES`), capped cumulatively at `-25..+10` per `(target_user_id, session_id)`, with final `credit_score` clamped `0..100` (`is_suspended = credit_score <= 50`):
- `attendance`: `on_time` (`+2`, `ATTEND_ON_TIME`) \| `late` (`-5`, `LATE_ARRIVAL`) \| `no_show` (`-20`, `NO_SHOW`)
- `sportsmanship`: `good` (`+5`, `COMMENDED_SPORTSMANSHIP`, ignored if `attendance = "no_show"`) \| `okay` (`0`) \| `poor` (`0`)
- `level_fit`: `lower` \| `accurate` \| `higher` (recorded without Credit Score delta)

Also updates target participant `attendance_status` (`ATTENDED` / `NO_SHOW` by majority reviewer vote; ties resolve to `ATTENDED`) and recalculates `total_sessions_completed` and `show_up_rate`.

**Request**

```json
{
  "reviewer_id": "550e8400-e29b-41d4-a716-446655440000",
  "reviews": [
    {
      "target_participant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
      "attendance": "on_time",
      "sportsmanship": "good",
      "level_fit": "accurate",
      "notes": "Main rapi",
      "is_guest": false
    }
  ]
}
```

**Response `201`**

```json
{
  "success": true,
  "data": {
    "session_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "reviewer_id": "550e8400-e29b-41d4-a716-446655440000",
    "submitted_count": 1,
    "skipped_guests": [],
    "results": [
      {
        "review_id": "dddddddd-dddd-dddd-dddd-dddddddddddd",
        "target_participant_id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
        "target_user_id": "660e8400-e29b-41d4-a716-446655440001",
        "delta_applied": 7,
        "credit_score_after": 100,
        "is_suspended": false,
        "attendance_status": "ATTENDED",
        "total_sessions_completed": 1,
        "show_up_rate": 100
      }
    ]
  }
}
```

Errors: `400` (invalid payload, session not `COMPLETED`, non-participant target, or self-review), `403` (`reviewer_id` is not an active participant), `404` (session not found), `409` (duplicate review).

---

## Utility Endpoints

### Health Check

```
GET /health
```

**Response `200`**

```json
{
  "status": "ok",
  "service": "mabar-backend",
  "version": "1.0.0",
  "timestamp": "2026-11-11T03:00:00.000Z"
}
```

### Root / Email Confirmation

- `GET /` — returns service metadata and mounted route prefixes.
- `GET /auth/confirmed` — returns HTML landing page for Supabase email confirmation redirect (`mabar://login`).

---

## Allowed Values

| Field | Allowed Values |
| --- | --- |
| `category` / `session_category` | `sports` \| `esports` |
| `session_mode` | `play_now` \| `scheduled` |
| `team_format` | `2_teams` \| `free_for_all` |
| `skill_rating_level` | `Beginner` \| `Intermediate` \| `Advanced` |
| `status` (session) | `OPEN` \| `LOCKED` \| `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED` |
| `attendance` (review) | `on_time` \| `late` \| `no_show` |
| `sportsmanship` (review) | `good` \| `okay` \| `poor` |
| `level_fit` (review) | `lower` \| `accurate` \| `higher` |

## Error Codes

Error JSON uses `{ "success": false, "message": "..." }` or `{ "success": false, "error": "..." }` depending on the route — read `message || error` on the client.

| Status | Condition |
| --- | --- |
| 400 | Invalid UUID/payload, join rule rejected, fewer than 2 participants on split, disallowed status transition, session not `COMPLETED`, non-participant target, or self-review |
| 401 | Missing, malformed, or expired Bearer token (`/api/profile/*`) |
| 403 | Non-host updating session status or non-participant calling `review-targets` / `reviews` |
| 404 | Session not found or route not deployed yet on target environment |
| 409 | Duplicate `(session_id, reviewer_id, target_user_id)` review or concurrent status change |
| 500 | Database / Supabase / RPC query error |
