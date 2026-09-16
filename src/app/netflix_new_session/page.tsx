"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestNetflixNewSession } from "@/lib/streaming-codes-client";

export default function NetflixNewSessionPage() {
  return <CodeRequestScreen slug="netflix_new_session" request={requestNetflixNewSession} />;
}
