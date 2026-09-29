---
trigger: always_on
---

## No Dual Source of Truth

One domain = one provider/context. Shim/alias allowed, but shim MUST NOT own `useState`, `localStorage`, or Firestore writes.

### Rules

1. **Design System is single source** — `DesignSystemContext` owns:
   - DOM: `data-design-system` + `data-theme` + `--ds-*` vars
   - Persistence: `localStorage app_design_system_*` + `container.repos.user.updateDesignSystem` (`designSystemPreference`)
   - `ThemeContext` is pure alias: `activeTheme = ds.activeSystem`, `setTheme = ds.setSystem`, `applyAndSaveTheme = ds.applyAndSaveSystem`, `isDark = false` (all 3 systems light). No state, no effect, no storage.

2. **User profile — no dual field drift** — `UserProfile` has `designSystemPreference` (primary) + `themePreference` (deprecated read-fallback only). Writes go only to `designSystemPreference`. Reads: try `designSystemPreference` first, fallback `mapLegacyThemeToDesignSystem(themePreference)`.

3. **Firestore `users/{uid}` — never overwrite on cache miss**:
   - `createUserProfile` MUST check `getDoc` `exists()` first; if exists, return existing — never `setDoc` overwrite.
   - `AuthContext.fetchProfile` MUST distinguish `offline/unavailable` error vs `null`:
     - `offline` → `return` (keep existing `profile`, do NOT create new `isOnboarded:false`)
     - `null` (server-confirmed missing) → create with `isOnboarded:false`
     - `isOnboarded === undefined` (legacy doc) → treat as `true`, do NOT force onboarding wizard
   - Use `getDocFromServer` or guard exists check for named database `ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7` (offline `persistentLocalCache` miss).

4. **Firebase config** — `firebase.json` MUST specify `"database": "ai-studio-97dcf1e2-31b5-4f50-ac68-ea4891b875c7"` so `firebase deploy --only firestore` targets the app's named database, not `(default)`.

5. **CSS tokens** — `DesignSystemContext` injects `--ds-*`; `src/index.css` `[data-design-system]` blocks map to `var(--ds-*)` via coercions, not duplicate hex. Brutalism overrides `rounded-*`/`shadow`/`border` via `var(--ds-*)` tokens; `apple-glass` is light — do NOT include it in `@custom-variant dark`.

### Detection checklist (run when touching these areas)

- `grep -R "THEME_OPTIONS\|ThemeKey\|themePreference\|designSystemPreference" src --include="*.ts" --include="*.tsx"`
- `grep -R "data-theme\|data-design-system" src --include="*.ts" --include="*.tsx" | grep -v "DesignSystemContext"`
- Verify `firebase.json` has `database` key
- Verify `package.json` vs `package-lock.json` version sync after bump (`npm install --package-lock-only`)
