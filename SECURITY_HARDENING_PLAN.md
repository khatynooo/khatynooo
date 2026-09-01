# Security Hardening Plan

This file documents the first hardening pass for authentication, JWT, login, CORS, and Docker.

## Changes to apply

- Move security controls into the application instead of relying on runtime monkey-patching.
- Require `JWT_SECRET` in production and reject the known insecure default.
- Use explicit JWT algorithm validation and short-lived access tokens.
- Add a refresh-token strategy with rotation/revocation before enabling long-lived sessions.
- Add login rate limiting that is enforced by the application itself and is suitable for multi-instance deployment when backed by a shared store.
- Restrict CORS to configured origins.
- Reduce global JSON/urlencoded request limits and apply larger limits only to upload endpoints.
- Return minimal public health information.
- Run the production container as the non-root `node` user.
- Use `npm ci` where a lockfile is present.
- Do not provide production database passwords as insecure defaults.

## Important deployment note

After these changes, set `JWT_SECRET` and `POSTGRES_PASSWORD` through the deployment secret manager/environment. Do not copy example values into production.
