import { prisma } from "./prisma";

const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API_BASE = "https://www.strava.com/api/v3";

/**
 * Returns a valid access token for the given club member, refreshing it
 * with Strava first if it has expired (Strava access tokens last 6 hours).
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const isExpired = user.tokenExpiresAt.getTime() <= Date.now() + 60_000;
  if (!isExpired) return user.accessToken;

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: user.refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  await prisma.user.update({
    where: { id: userId },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(data.expires_at * 1000),
    },
  });

  return data.access_token;
}

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
  timezone: string;
  average_speed: number;
  max_speed: number;
  achievement_count: number;
}

/**
 * Fetches a single activity's detail from Strava on behalf of the member
 * that owns it. Called from the webhook handler for each create/update
 * event, never in bulk — there is no historical backfill.
 */
export async function fetchStravaActivity(userId: string, activityId: number): Promise<StravaActivity> {
  const accessToken = await getValidAccessToken(userId);

  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch Strava activity ${activityId}: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
