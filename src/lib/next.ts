/** Only same-site paths, so ?next= can't send people to another domain. */
export const safeNext = (next: string | null, fallback = '/board') => (next && /^\/(?!\/)/.test(next) ? next : fallback)
