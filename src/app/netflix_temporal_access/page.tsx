"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestNetflixTemporalAccess } from "@/lib/streaming-codes-client";

export default function NetflixTemporalAccessPage() {
  return <CodeRequestScreen slug="netflix_temporal_access" request={requestNetflixTemporalAccess} />;
}
