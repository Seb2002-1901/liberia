/**
 * /settings → redirige vers /design-match/parametres-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/parametres-v3/page.tsx avec sa Sidebar et sa Topbar
 * premium inline. La route prod /settings est un simple alias.
 *
 * Les sous-routes /settings/memory et /settings/subscription restent
 * accessibles par URL directe (intactes, indépendantes de cet index).
 */
import { redirect } from "next/navigation";

export default function SettingsIndexRedirect(): never {
  redirect("/design-match/parametres-v3");
}
