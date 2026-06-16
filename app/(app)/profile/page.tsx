/**
 * /profile → redirige vers /design-match/profil-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/profil-v3/page.tsx avec sa Sidebar et sa Topbar
 * premium inline. La route prod /profile est un simple alias.
 */
import { redirect } from "next/navigation";

export default function ProfileIndexRedirect(): never {
  redirect("/design-match/profil-v3");
}
