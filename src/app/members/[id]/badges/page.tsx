import { redirect } from "next/navigation";

// The trophy case used to live at /members/<id>/badges; keep old links and bookmarks working.
export default async function OldBadgesRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/members/${id}/trophy-case`);
}
