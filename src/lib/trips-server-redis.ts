import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

function redisKey(userId: string) {
  return `wildroads:trips:${userId}`;
}

export function getTripsRedis(): Redis | null {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    client = null;
    return null;
  }
  client = new Redis({ url, token });
  return client;
}

/** `null` = cloud store not configured. Missing key reads as empty object string. */
export async function readUserTripsJson(userId: string): Promise<string | null> {
  const r = getTripsRedis();
  if (!r) return null;
  const v = await r.get<string>(redisKey(userId));
  if (v == null || v === "") return "{}";
  return typeof v === "string" ? v : JSON.stringify(v);
}

export async function writeUserTripsJson(userId: string, json: string): Promise<void> {
  const r = getTripsRedis();
  if (!r) throw new Error("Trips cloud store is not configured");
  await r.set(redisKey(userId), json);
}
