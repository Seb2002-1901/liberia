/**
 * /plan → redirige vers /design-match/plan-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/plan-v3/page.tsx avec sa Sidebar et sa Topbar
 * premium inline. La route prod /plan est un simple alias.
 */
import { redirect } from "next/navigation";

export default function PlanIndexRedirect(): never {
  redirect("/design-match/plan-v3");
}
