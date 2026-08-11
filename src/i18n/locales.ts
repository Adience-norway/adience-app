// Flat list of supported locales. Norwegian is the default and stays
// unprefixed (/, /demo, /registrer) to avoid changing any existing links,
// bookmarks, or printed QR codes. Every other locale gets its own literal
// route folder (e.g. src/app/en/...) — add a new folder + dictionary entry
// here to support another language later.
export const locales = ["no", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "no";
