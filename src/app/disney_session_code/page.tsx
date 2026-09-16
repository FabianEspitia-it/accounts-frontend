"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestDisneySessionCode } from "@/lib/streaming-codes-client";

export default function DisneySessionCodePage() {
  return <CodeRequestScreen slug="disney_session_code" request={requestDisneySessionCode} />;
}
