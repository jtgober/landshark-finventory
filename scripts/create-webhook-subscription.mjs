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

// .trim() guards against a stray trailing space/newline from copy-pasting
// values into .env, which would otherwise silently break the request.
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID?.trim();
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET?.trim();
const STRAVA_WEBHOOK_VERIFY_TOKEN = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN?.trim();
const APP_URL = process.env.APP_URL?.trim().replace(/\/+$/, "");

if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_WEBHOOK_VERIFY_TOKEN || !APP_URL) {
  console.error(
    "Missing required env vars. Need STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN, APP_URL."
  );
  process.exit(1);
}

const callbackUrl = `${APP_URL}/api/strava/webhook`;

// Non-secret diagnostics only — lengths, not values, so nothing sensitive
// gets printed to the terminal.
console.log("callback_url:", callbackUrl);
console.log(
  "client_id length:",
  STRAVA_CLIENT_ID.length,
  "| client_secret length:",
  STRAVA_CLIENT_SECRET.length,
  "| verify_token length:",
  STRAVA_WEBHOOK_VERIFY_TOKEN.length
);

// Strava's push_subscriptions endpoint expects form-encoded data, not JSON —
// sending JSON here returns a generic 400 "bad request" with no useful detail.
const body = new URLSearchParams({
  client_id: STRAVA_CLIENT_ID,
  client_secret: STRAVA_CLIENT_SECRET,
  callback_url: callbackUrl,
  verify_token: STRAVA_WEBHOOK_VERIFY_TOKEN,
});

const res = await fetch("https://www.strava.com/api/v3/push_subscriptions", {
  method: "POST",
  body,
});

const data = await res.json();
console.log(res.status, data);
