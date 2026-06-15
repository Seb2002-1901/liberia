/**
 * /opportunities → redirige vers /design-match/opportunites-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/opportunites-v3/page.tsx avec sa Sidebar et sa
 * Topbar premium inline. La route prod /opportunities est un simple
 * alias.
 */
import { redirect } from "next/navigation";

export default function OpportunitiesIndexRedirect(): never {
  redirect("/design-match/opportunites-v3");
}
