const GUEST_KEY = "wildroads-trips-guest";

function userKey(userId: string) {
  return `wildroads-trips-${userId}`;
}

export function loadTripsJson(userId: string | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    return userId
      ? localStorage.getItem(userKey(userId))
      : sessionStorage.getItem(GUEST_KEY);
  } catch {
    return null;
  }
}

export function saveTripsJson(userId: string | null, json: string): void {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      localStorage.setItem(userKey(userId), json);
    } else {
      sessionStorage.setItem(GUEST_KEY, json);
    }
  } catch {
    /* quota / private mode */
  }
}
