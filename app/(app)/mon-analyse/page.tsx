/**
 * /mon-analyse → redirige vers /design-match/mon-analyse-v3.
 *
 * Pattern Dashboard (validé) : la VRAIE page V3 vit dans
 * /design-match/mon-analyse-v3/page.tsx avec sa Sidebar et sa
 * Topbar premium inline. La route prod /mon-analyse est un
 * simple alias.
 */
import { redirect } from "next/navigation";

export default function MonAnalyseIndexRedirect(): never {
  redirect("/design-match/mon-analyse-v3");
}
