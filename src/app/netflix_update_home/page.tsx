"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestNetflixUpdateHome } from "@/lib/streaming-codes-client";

export default function NetflixUpdateHomePage() {
  return <CodeRequestScreen slug="netflix_update_home" request={requestNetflixUpdateHome} />;
}
