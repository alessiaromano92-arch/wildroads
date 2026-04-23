/** Session flag: user started Clerk OAuth redirect from this tab. */
export const OAUTH_PENDING_KEY = "wildroads_oauth_pending";

export function markOAuthPending() {
  try {
    sessionStorage.setItem(OAUTH_PENDING_KEY, "1");
  } catch {
    /* private mode or storage blocked */
  }
}

export function clearOAuthPending() {
  try {
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export function consumeOAuthPending(): boolean {
  try {
    if (sessionStorage.getItem(OAUTH_PENDING_KEY) !== "1") return false;
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}
