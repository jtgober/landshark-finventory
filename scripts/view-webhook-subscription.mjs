#!/usr/bin/env node
// Lists the current push subscription for this app (there can be at most one).
import "dotenv/config";

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = process.env;

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
  console.error("Missing required env vars. Need STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET.");
  process.exit(1);
}

const params = new URLSearchParams({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET });
const res = await fetch(`https://www.strava.com/api/v3/push_subscriptions?${params}`);
console.log(res.status, await res.json());
