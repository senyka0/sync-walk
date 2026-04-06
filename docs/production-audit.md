# Production Readiness Audit — SyncWalk

Generated: 2026-02-27

## CRITICAL (must fix before production)

### 1. Hardcoded secrets in code
- **File:** `backend/app/config.py`
- **Issue:** `JWT_SECRET`, `DATABASE_URL`, and other sensitive fields have default values. If `.env` is missing, the app runs with known credentials.
- **Fix:** Remove all defaults for sensitive fields. Fail at startup if they're unset.
- **Effort:** 30 min

### 2. No input validation on Pydantic schemas
- **File:** `backend/app/schemas/user.py`
- **Issue:** `name: str` and `password: str` have zero constraints — empty passwords and 10MB names are accepted.
- **Fix:** Add `Field(min_length=1, max_length=100)` on `name`, `Field(min_length=8, max_length=128)` on `password`. Review all schemas.
- **Effort:** 1 hr

### 3. No rate limiting anywhere
- **Files:** All API routes
- **Issue:** No rate limiter on login, registration, or payment endpoints. Brute-force attacks are trivial.
- **Fix:** Add `slowapi` or custom middleware with per-IP limits.
- **Effort:** 1 hr

### 4. Socket events have zero authentication or authorization
- **File:** `backend/app/sockets/events.py`
- **Issue:** Anyone can emit `cmd_play`, `transfer_host`, or `start_tour` for any room. The `auth` param in `connect()` is received but never verified. No check that the sender is the host for host-only commands.
- **Fix:** Verify JWT in `connect()`, reject unauthenticated clients. Check host role before processing host-only commands.
- **Effort:** 4 hr

### 5. CORS is too permissive
- **File:** `backend/app/main.py`
- **Issue:** `allow_methods=["*"]`, `allow_headers=["*"]`, and `localhost:3000` hardcoded. In production this is too open.
- **Fix:** Restrict to specific methods/headers, remove localhost origin, use env var for allowed origins.
- **Effort:** 30 min

### 6. No HTTPS enforcement
- **Files:** `docker-compose.yml`, `nginx/conf.d/default.conf`
- **Issue:** Only HTTP is active. `ssl.conf.example` exists but isn't enabled. Payment data requires HTTPS.
- **Fix:** Activate SSL config with Let's Encrypt, add HTTP→HTTPS redirect.
- **Effort:** 1 hr

---

## HIGH (should fix before going live)

### 7. Room access codes are guessable
- **File:** `backend/app/services/room.py`
- **Issue:** 6-char alphanumeric code with no collision check and no brute-force protection on the lookup endpoint.
- **Fix:** Add collision check on creation, rate-limit room lookup, consider longer codes.
- **Effort:** 1 hr

### 8. No refresh token rotation
- **File:** `backend/app/core/security.py`
- **Issue:** Refresh tokens are created but there's no endpoint to use them, no revocation, no rotation. A leaked token is valid for 7 days.
- **Fix:** Add `POST /api/v1/auth/refresh` endpoint, implement token rotation and a revocation list (Redis).
- **Effort:** 3 hr

### 9. `connected_users` is in-memory only
- **File:** `backend/app/sockets/events.py`
- **Issue:** `connected_users: dict` breaks with multiple uvicorn workers.
- **Fix:** Move to Redis hash.
- **Effort:** 2 hr

### 10. `sync_loop` drifts from actual playback
- **File:** `backend/app/sockets/sync.py`
- **Issue:** Server adds 5000ms every 5 seconds to `current_time_ms` instead of using the host's reported position.
- **Fix:** Have the host periodically report its real position; sync loop should only broadcast, not increment.
- **Effort:** 2 hr

### 11. No database connection pool tuning
- **File:** `backend/app/core/database.py`
- **Issue:** No `pool_timeout`, `pool_recycle`, or `pool_pre_ping` set. Stale connections can cause silent failures.
- **Fix:** Add `pool_timeout=30`, `pool_recycle=1800`, `pool_pre_ping=True`.
- **Effort:** 15 min

### 12. Payment callback has no IP whitelist
- **File:** `backend/app/services/payment.py` / payment route
- **Issue:** Any HTTP client can POST a fake WayForPay callback and mark payments as approved.
- **Fix:** Whitelist WayForPay server IPs in the callback route.
- **Effort:** 30 min

---

## MEDIUM (should address for quality)

### 13. No structured logging
- **Issue:** Only socket files use `logging`. API routes, auth, and payment services have none.
- **Fix:** Add structured logging (JSON format) across all services. Consider `structlog`.
- **Effort:** 2 hr

### 14. No error handling middleware
- **Issue:** Unhandled exceptions return raw tracebacks in dev. In production, this leaks internal details.
- **Fix:** Add a global exception handler that returns generic errors and logs details.
- **Effort:** 1 hr

### 15. Postgres and Redis unprotected in Docker
- **File:** `docker-compose.yml`
- **Issue:** Redis runs without `requirepass`, Postgres uses `changeme` password.
- **Fix:** Set strong passwords via `.env`, add `--requirepass` to Redis command.
- **Effort:** 15 min

### 16. No auto-migration on deploy
- **Issue:** Alembic is configured but not run automatically. Seed script uses `create_all()` which bypasses Alembic.
- **Fix:** Add `alembic upgrade head` to deploy script / Docker entrypoint.
- **Effort:** 30 min

### 17. JWT stored in localStorage (XSS risk)
- **File:** `frontend/store/index.ts`
- **Issue:** `authToken` is persisted via Zustand → localStorage, vulnerable to XSS.
- **Fix:** Use `httpOnly` secure cookies (requires backend changes to set cookies), or accept the risk with strong CSP headers.
- **Effort:** 4 hr (cookie approach)

### 18. Shallow health check
- **File:** `backend/app/main.py`
- **Issue:** `/health` returns `{"status": "ok"}` without checking Postgres or Redis.
- **Fix:** Ping both services and return degraded status if either fails.
- **Effort:** 30 min

### 19. Audio CORS wildcard
- **File:** `nginx/conf.d/default.conf`
- **Issue:** `Access-Control-Allow-Origin: *` on `/audio/` lets anyone hotlink audio files.
- **Fix:** Restrict to your domain.
- **Effort:** 5 min

---

## LOW (polish / post-MVP)

- [ ] No tests (zero unit or integration tests)
- [ ] No CI pipeline (GitHub Actions / GitLab CI)
- [ ] No backup automation (scripts exist but nothing scheduled)
- [ ] No PWA service worker (`serwist`/`next-pwa` not configured)
- [ ] No monitoring (Sentry, Prometheus, uptime checks)
- [ ] `asyncio.ensure_future` is deprecated → use `asyncio.create_task`
- [ ] WayForPay uses MD5 (required by their API spec, not changeable)

---

## Priority Order

| # | Item | Severity | Effort |
|---|------|----------|--------|
| 1 | Remove default secrets, fail on missing env | CRITICAL | 30 min |
| 2 | Add input validation to all schemas | CRITICAL | 1 hr |
| 3 | Authenticate socket connections (verify JWT) | CRITICAL | 2 hr |
| 4 | Authorize socket commands (check host role) | CRITICAL | 2 hr |
| 5 | Add rate limiting to auth + payment routes | CRITICAL | 1 hr |
| 6 | Set up HTTPS with Let's Encrypt | CRITICAL | 1 hr |
| 7 | Whitelist WayForPay IPs on callback | HIGH | 30 min |
| 8 | Move `connected_users` to Redis | HIGH | 2 hr |
| 9 | Add refresh token endpoint + rotation | HIGH | 3 hr |
| 10 | Tune DB connection pool | HIGH | 15 min |
| 11 | Brute-force protection on room codes | HIGH | 1 hr |
| 12 | Fix sync_loop drift | HIGH | 2 hr |
| 13 | Add structured logging | MEDIUM | 2 hr |
| 14 | Global error handler middleware | MEDIUM | 1 hr |
| 15 | Protect Redis with password | MEDIUM | 15 min |
| 16 | Auto-migrate on deploy | MEDIUM | 30 min |
| 17 | Deeper health check | MEDIUM | 30 min |
| 18 | Restrict audio CORS | MEDIUM | 5 min |
| 19 | Move JWT to httpOnly cookies | MEDIUM | 4 hr |

**Total estimated effort for items 1-6 (minimum before real users): ~7.5 hours**
