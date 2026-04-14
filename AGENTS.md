# Past Mistakes & Lessons Learned

- **Hardcoded Admin Emails:** Avoid hardcoding admin emails in `firestore.rules` and `AuthContext.tsx`. Use environment variables or dynamic checks to ensure flexibility across different environments (e.g., remixed apps).
- **Firestore Error Handling:** Always use the `handleFirestoreError` function to catch and format Firestore errors. This ensures errors are properly logged and surfaced for debugging.
- **Architecture Rules:** Keep utility scripts (like data migration or refactoring scripts) in a dedicated `scripts/` directory, rather than mixed within the application source code (e.g., `app/applet/`).
- **Data Migrations:** When programmatically updating data files (like `personalityTypes.ts`), ensure scripts are well-documented, written in TypeScript, and use proper AST or JSON parsing instead of fragile regex replacements where possible.
