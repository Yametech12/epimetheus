# Release Notes

## [Current Version] - 2026-04-04

### Added
- Integrated "Dark Mind Breakdowns" and "Behavioral Blueprints" into personality types (TDI, TJI, NDI, NJI, TDR, TJR).
- Created `AGENTS.md` to track past mistakes and enforce architectural lessons learned.
- Added `RELEASE_NOTES.md` to track project changes.

### Changed
- **Architecture Enforcement:** Moved `app/applet/update_types2.js` to `scripts/update_personality_types.ts` to enforce project structure rules.
- **Security:** Updated `firestore.rules` and `AuthContext.tsx` to use the correct admin email (`oraclemaster41@gmail.com`) for the remixed app environment.
- **Database:** Successfully provisioned and connected a new Firebase project for the remixed application.

### Fixed
- Addressed hardcoded admin email issues from previous iterations.
