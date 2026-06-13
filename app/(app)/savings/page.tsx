/**
 * /savings → redirige vers /design-match/epargne-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/epargne-v3/page.tsx avec sa Sidebar et sa Topbar
 * premium inline. La route prod /savings est un simple alias.
 */
import { redirect } from "next/navigation";

export default function SavingsIndexRedirect(): never {
  redirect("/design-match/epargne-v3");
}
