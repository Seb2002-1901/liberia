/**
 * /coach → redirige vers /design-match/coach-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/coach-v3/page.tsx avec sa Sidebar et sa Topbar
 * premium inline. La route prod /coach est un simple alias.
 *
 * Le sous-chemin /coach/[id] (chat conversation réel) reste
 * intact dans /(app)/coach/[id] et n'est pas affecté par ce
 * redirect — seul l'index /coach renvoie vers la V3.
 */
import { redirect } from "next/navigation";

export default function CoachIndexRedirect(): never {
  redirect("/design-match/coach-v3");
}
