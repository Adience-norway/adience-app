import type { Locale } from "./locales";
import no, { type Dictionary } from "./dictionaries/no";
import en from "./dictionaries/en";

const dictionaries: Record<Locale, Dictionary> = { no, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary, Locale };
