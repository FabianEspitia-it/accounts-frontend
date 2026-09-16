"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestHboSessionCode } from "@/lib/streaming-codes-client";

export default function HboSessionCodePage() {
  return <CodeRequestScreen slug="hbo_session_code" request={requestHboSessionCode} />;
}
