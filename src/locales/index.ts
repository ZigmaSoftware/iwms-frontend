/**
 * Locale resources, assembled from per-module files — loaded on demand per
 * language instead of all three being bundled into the app's main entry
 * chunk. Only the active language's ~2,800 lines of translation data is
 * fetched at startup; the other two languages are fetched only if the user
 * actually switches to them (see i18n.ts's ensureLanguageLoaded/
 * switchLanguage), and cached after their first load.
 *
 * File layout, mirroring the admin sidebar:
 *
 *   locales/
 *     common/                 shared strings + login
 *     admin/superadmin/       Super Admin
 *     admin/masters/          Masters
 *     admin/coreModules/      Core Modules
 *     admin/reports/          Reports
 *     dashboard/dashboard/    Dashboard
 *     dashboard/grievance/    Grievance
 *     dashboard/reports/      Reports
 *     dashboard/weighbridge/  Weighbridge
 *
 * Each folder holds one file per language, so a module's three translations
 * sit side by side and a missing one is obvious.
 *
 * IMPORTANT: translation KEYS are unchanged. This merges the pieces back into
 * exactly the shape i18n received before, so every existing
 * t("admin.staff_template.list_title") keeps working — the split is purely
 * file organisation.
 */

export type LanguageCode = "en" | "ta" | "hi";

type Part = Record<string, unknown>;

/** Rebuilds { translation: { common, login, dashboard, admin } }. */
const assemble = (common: Part, admin: Part[], dashboard: Part[]) => ({
  translation: {
    ...common,
    dashboard: Object.assign({}, ...dashboard) as Part,
    admin: Object.assign({}, ...admin) as Part,
  },
});

async function loadEn() {
  const [
    common,
    adminSuperadmin, adminMasters, adminCore, adminReports,
    dash, grievance, dashReports, weighbridge,
  ] = await Promise.all([
    import("./common/en").then((m) => m.default),
    import("./admin/superadmin/en").then((m) => m.default),
    import("./admin/masters/en").then((m) => m.default),
    import("./admin/coreModules/en").then((m) => m.default),
    import("./admin/reports/en").then((m) => m.default),
    import("./dashboard/dashboard/en").then((m) => m.default),
    import("./dashboard/grievance/en").then((m) => m.default),
    import("./dashboard/reports/en").then((m) => m.default),
    import("./dashboard/weighbridge/en").then((m) => m.default),
  ]);
  return assemble(
    common,
    [adminSuperadmin, adminMasters, adminCore, adminReports],
    [dash, grievance, dashReports, weighbridge],
  );
}

async function loadTa() {
  const [
    common,
    adminSuperadmin, adminMasters, adminCore, adminReports,
    dash, grievance, dashReports, weighbridge,
  ] = await Promise.all([
    import("./common/ta").then((m) => m.default),
    import("./admin/superadmin/ta").then((m) => m.default),
    import("./admin/masters/ta").then((m) => m.default),
    import("./admin/coreModules/ta").then((m) => m.default),
    import("./admin/reports/ta").then((m) => m.default),
    import("./dashboard/dashboard/ta").then((m) => m.default),
    import("./dashboard/grievance/ta").then((m) => m.default),
    import("./dashboard/reports/ta").then((m) => m.default),
    import("./dashboard/weighbridge/ta").then((m) => m.default),
  ]);
  return assemble(
    common,
    [adminSuperadmin, adminMasters, adminCore, adminReports],
    [dash, grievance, dashReports, weighbridge],
  );
}

async function loadHi() {
  const [
    common,
    adminSuperadmin, adminMasters, adminCore, adminReports,
    dash, grievance, dashReports, weighbridge,
  ] = await Promise.all([
    import("./common/hi").then((m) => m.default),
    import("./admin/superadmin/hi").then((m) => m.default),
    import("./admin/masters/hi").then((m) => m.default),
    import("./admin/coreModules/hi").then((m) => m.default),
    import("./admin/reports/hi").then((m) => m.default),
    import("./dashboard/dashboard/hi").then((m) => m.default),
    import("./dashboard/grievance/hi").then((m) => m.default),
    import("./dashboard/reports/hi").then((m) => m.default),
    import("./dashboard/weighbridge/hi").then((m) => m.default),
  ]);
  return assemble(
    common,
    [adminSuperadmin, adminMasters, adminCore, adminReports],
    [dash, grievance, dashReports, weighbridge],
  );
}

export function loadLocale(lang: LanguageCode) {
  if (lang === "ta") return loadTa();
  if (lang === "hi") return loadHi();
  return loadEn();
}

// Tracks which languages have had their translation bundle merged into the
// live i18next instance already, so switching back to a language already
// loaded this session is a no-op instead of re-fetching/re-merging it.
// Lives here (not in i18n.ts) so callers that only need to *load and merge
// a language into an existing i18n instance* — e.g. LanguageSwitcher — don't
// have to import i18n.ts and re-run its module-level i18n.init() side effect.
const loadedLanguages = new Set<LanguageCode>();

export function isLanguageLoaded(lang: LanguageCode) {
  return loadedLanguages.has(lang);
}

export function markLanguageLoaded(lang: LanguageCode) {
  loadedLanguages.add(lang);
}
