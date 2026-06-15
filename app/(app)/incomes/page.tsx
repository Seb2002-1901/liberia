/**
 * /incomes → redirige vers /design-match/revenus-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/revenus-v3/page.tsx avec sa Sidebar et sa Topbar
 * premium inline. La route prod /incomes est un simple alias.
 */
import { redirect } from "next/navigation";

export default function IncomesIndexRedirect(): never {
  redirect("/design-match/revenus-v3");
}
