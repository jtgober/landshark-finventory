import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchStravaActivity } from "@/lib/strava";

/**
 * Strava's one-time webhook subscription handshake: it GETs this URL with
 * a challenge and expects it echoed back if our verify token matches.
 * See scripts/create-webhook-subscription.mjs for how the subscription
 * itself gets created.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "verification failed" }, { status: 403 });
}

interface StravaWebhookEvent {
  object_type: "activity" | "athlete";
  object_id: number;
  aspect_type: "create" | "update" | "delete";
  owner_id: number;
  subscription_id: number;
  event_time: number;
  updates?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  const event = (await req.json()) as StravaWebhookEvent;

  // Strava expects a 200 within a couple seconds and will eventually
  // disable the subscription after repeated failures, so we always ack
  // and just log processing errors rather than surfacing them.
  try {
    await processEvent(event);
  } catch (err) {
    console.error("Failed to process Strava webhook event", event, err);
  }

  return NextResponse.json({}, { status: 200 });
}

async function processEvent(event: StravaWebhookEvent) {
  if (event.object_type !== "activity") return;

  const user = await prisma.user.findUnique({
    where: { stravaAthleteId: BigInt(event.owner_id) },
  });
  // Athlete hasn't connected their Strava account to the club site.
  if (!user) return;

  if (event.aspect_type === "delete") {
    await prisma.activity.deleteMany({
      where: { stravaActivityId: BigInt(event.object_id) },
    });
    return;
  }

  const activity = await fetchStravaActivity(user.id, event.object_id);

  const data = {
    name: activity.name,
    sportType: activity.sport_type,
    distanceMeters: activity.distance,
    movingTimeSeconds: activity.moving_time,
    elapsedTimeSeconds: activity.elapsed_time,
    totalElevationGain: activity.total_elevation_gain,
    startDate: new Date(activity.start_date),
    startDateLocal: new Date(activity.start_date_local),
    timezone: activity.timezone,
    averageSpeed: activity.average_speed,
    maxSpeed: activity.max_speed,
    achievementCount: activity.achievement_count,
  };

  await prisma.activity.upsert({
    where: { stravaActivityId: BigInt(activity.id) },
    update: data,
    create: {
      ...data,
      stravaActivityId: BigInt(activity.id),
      userId: user.id,
    },
  });
}
