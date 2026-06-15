/**
 * /expenses → redirige vers /design-match/depenses-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/depenses-v3/page.tsx avec sa Sidebar et sa Topbar
 * premium inline. La route prod /expenses est un simple alias.
 */
import { redirect } from "next/navigation";

export default function ExpensesIndexRedirect(): never {
  redirect("/design-match/depenses-v3");
}
