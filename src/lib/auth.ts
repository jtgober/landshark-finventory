import type { NextAuthOptions } from "next-auth";
import { prisma } from "./prisma";

interface StravaProfile {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  city: string | null;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  providers: [
    {
      id: "strava",
      name: "Strava",
      type: "oauth",
      clientId: process.env.STRAVA_CLIENT_ID,
      clientSecret: process.env.STRAVA_CLIENT_SECRET,
      authorization: {
        url: "https://www.strava.com/oauth/authorize",
        params: {
          scope: "read,activity:read",
          approval_prompt: "auto",
          response_type: "code",
        },
      },
      token: "https://www.strava.com/oauth/token",
      userinfo: "https://www.strava.com/api/v3/athlete",
      checks: ["state"],
      client: { token_endpoint_auth_method: "client_secret_post" },
      profile(profile: StravaProfile) {
        return {
          id: String(profile.id),
          name: `${profile.firstname} ${profile.lastname}`.trim(),
          image: profile.profile,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Only runs on initial sign-in, when NextAuth hands us the OAuth
      // tokens and the Strava athlete profile together.
      if (account && profile) {
        const stravaProfile = profile as unknown as StravaProfile;

        const user = await prisma.user.upsert({
          where: { stravaAthleteId: BigInt(stravaProfile.id) },
          update: {
            firstName: stravaProfile.firstname,
            lastName: stravaProfile.lastname,
            profileImageUrl: stravaProfile.profile,
            city: stravaProfile.city,
            accessToken: account.access_token!,
            refreshToken: account.refresh_token!,
            tokenExpiresAt: new Date((account.expires_at ?? 0) * 1000),
            scope: (account.scope as string) ?? "",
          },
          create: {
            stravaAthleteId: BigInt(stravaProfile.id),
            firstName: stravaProfile.firstname,
            lastName: stravaProfile.lastname,
            profileImageUrl: stravaProfile.profile,
            city: stravaProfile.city,
            accessToken: account.access_token!,
            refreshToken: account.refresh_token!,
            tokenExpiresAt: new Date((account.expires_at ?? 0) * 1000),
            scope: (account.scope as string) ?? "",
          },
        });

        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
};
