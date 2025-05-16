import { redirect } from "@remix-run/node";

export async function loader() {
  // Redirect to the main app page
  return redirect("/app");
}

export default function AnalyticsLanding() {
  return null;
}
