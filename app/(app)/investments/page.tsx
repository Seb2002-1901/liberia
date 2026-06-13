/**
 * /investments → redirige vers /design-match/investissements-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/investissements-v3/page.tsx avec sa Sidebar et sa
 * Topbar premium inline. La route prod /investments est un simple
 * alias.
 */
import { redirect } from "next/navigation";

export default function InvestmentsIndexRedirect(): never {
  redirect("/design-match/investissements-v3");
}
