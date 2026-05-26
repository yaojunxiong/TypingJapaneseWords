# Minna Next v1 Release Notes (2026-05-26)

## Scope
- Next migration shell with Supabase SSR auth
- Pages migrated: `/login`, `/me`, `/toolbox`, `/lessons`, `/favorites`, `/messages`, `/chat`
- Role-aware lesson lock behavior on `/lessons`
- Friend requests and chat preview on `/messages`
- Chat operations on `/chat` (DM/group/create/send/invite/rename/leave/delete own message)

## Security baseline
- Upgraded `next` and `eslint-config-next` to `15.3.6` (patched for CVE-2025-66478 in 15.3.x line)

## Release status
- This tag is a production candidate (RC)
- Final go-live requires one-pass smoke test in target environment
