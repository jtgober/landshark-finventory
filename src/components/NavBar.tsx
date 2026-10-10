import { getSessionUser } from "@/lib/admin";
import MobileNav from "@/components/MobileNav";

export default async function NavBar() {
  const user = await getSessionUser();

  return <MobileNav isAdmin={!!user?.isAdmin} userId={user?.id ?? null} />;
}
