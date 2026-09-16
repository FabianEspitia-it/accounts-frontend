"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestNetflixSessionCode } from "@/lib/streaming-codes-client";

export default function NetflixSessionCodePage() {
  return <CodeRequestScreen slug="netflix_session_code" request={requestNetflixSessionCode} />;
}
