import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function DesignMatchCoachV3Redirect() {
  redirect("/coach");
}
