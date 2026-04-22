import moment from "moment";

/**
 * Normalizes a string by converting it to lowercase and removing accents/diacritics.
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Checks if a value (or any of its properties if it's an object) matches a normalized search term.
 */
export const matchesValue = (value: any, termNormalized: string): boolean => {
  if (value === null || value === undefined) return false;

  // Handle arrays
  if (Array.isArray(value)) {
    return value.some((v) => matchesValue(v, termNormalized));
  }

  // Handle objects recursively
  if (typeof value === "object") {
    return Object.values(value).some((v) => matchesValue(v, termNormalized));
  }

  // Handle primitive values
  const stringValue = normalizeText(String(value));
  if (stringValue.includes(termNormalized)) return true;

  // Special date handling: if it looks like a date, try matching common display format
  if (typeof value === "string") {
    // Basic heuristics to avoid parsing every string as a date
    if (value.includes("-") || value.includes("/")) {
      const date = moment(value, [moment.ISO_8601, "YYYY-MM-DD", "YYYY/MM/DD", "DD/MM/YYYY"], true);
      if (date.isValid()) {
        const commonFormat = date.format("DD/MM/YYYY");
        if (commonFormat.includes(termNormalized)) return true;
      }
    }
  }

  return false;
};

/**
 * Performs an "intelligent" search where all words in the searchTerm must be found 
 * within the item (in any order and across any fields).
 * 
 * @param item The object to search within.
 * @param searchTerm The search string entered by the user.
 * @returns boolean True if all terms are found.
 */
export const intelligentSearch = <T>(item: T, searchTerm: string): boolean => {
  const trimmed = searchTerm.trim();
  if (!trimmed) return true;

  // Split search term into individual words
  const terms = normalizeText(trimmed).split(/\s+/).filter(Boolean);
  
  // IMPORTANT: All words in the search must match at least one field in the item
  return terms.every(term => matchesValue(item, term));
};
