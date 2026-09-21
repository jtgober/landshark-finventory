#!/usr/bin/env node
// Deletes a push subscription by id (get the id from view-webhook-subscription.mjs).
// Usage: node scripts/delete-webhook-subscription.mjs <subscription_id>
import "dotenv/config";

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = process.env;
const id = process.argv[2];

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
  console.error("Missing required env vars. Need STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET.");
  process.exit(1);
}

if (!id) {
  console.error("Usage: node scripts/delete-webhook-subscription.mjs <subscription_id>");
  process.exit(1);
}

const params = new URLSearchParams({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET });
const res = await fetch(`https://www.strava.com/api/v3/push_subscriptions/${id}?${params}`, { method: "DELETE" });
console.log(res.status);
