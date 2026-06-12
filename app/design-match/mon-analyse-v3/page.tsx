import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DesignMatchMonAnalyseV3Redirect() {
  redirect("/mon-analyse");
}
