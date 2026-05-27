# Minna Next v1 Release Notes (2026-05-26)

## Scope
- Next migration shell with Supabase SSR auth
- Pages migrated: `/login`, `/me`, `/toolbox`, `/lessons`, `/favorites`, `/messages`, `/chat`
- Role-aware lesson lock behavior on `/lessons`
- Friend requests and chat preview on `/messages`
- Chat operations on `/chat` (DM/group/create/send/invite/rename/leave/delete own message)
- Lesson metadata synchronized to full `1-50` across Next + docs course surfaces

## Security baseline
- Upgraded `next` and `eslint-config-next` to `15.5.18` (includes fix for CVE-2025-66478)

## Release status
- This tag is a production candidate (RC)
- Final go-live requires one-pass smoke test in target environment
