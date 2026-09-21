#!/usr/bin/env node
// One-time admin script: registers this app's callback URL with Strava's
// webhook system. Strava allows exactly one push subscription per API
// application, shared across every athlete who has connected.
//
// APP_URL must be a publicly reachable HTTPS URL — Strava calls
// {APP_URL}/api/strava/webhook (GET) to verify it during this request, so
// the app must already be deployed and running (or tunneled, e.g. ngrok,
// for local testing) before you run this.
import "dotenv/config";

const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN, APP_URL } = process.env;

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_WEBHOOK_VERIFY_TOKEN || !APP_URL) {
  console.error(
    "Missing required env vars. Need STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN, APP_URL."
  );
  process.exit(1);
}

const res = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    client_id: STRAVA_CLIENT_ID,
    client_secret: STRAVA_CLIENT_SECRET,
    callback_url: `${APP_URL}/api/strava/webhook`,
    verify_token: STRAVA_WEBHOOK_VERIFY_TOKEN,
  }),
});

const data = await res.json();
console.log(res.status, data);
