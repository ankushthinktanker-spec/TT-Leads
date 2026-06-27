/**
 * Escape special regex characters in user input to prevent ReDoS attacks.
 */
export const escapeRegex = (str: string): string =>
    str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
