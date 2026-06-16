/**
 * /goals → redirige vers /design-match/objectifs-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/objectifs-v3/page.tsx avec sa Sidebar et sa Topbar
 * premium inline. La route prod /goals est un simple alias.
 */
import { redirect } from "next/navigation";

export default function GoalsIndexRedirect(): never {
  redirect("/design-match/objectifs-v3");
}
