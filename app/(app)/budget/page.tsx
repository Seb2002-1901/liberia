/**
 * /budget → redirige vers /design-match/budget-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/budget-v3/page.tsx avec sa Sidebar et sa Topbar
 * premium inline. La route prod /budget est un simple alias.
 */
import { redirect } from "next/navigation";

export default function BudgetIndexRedirect(): never {
  redirect("/design-match/budget-v3");
}
