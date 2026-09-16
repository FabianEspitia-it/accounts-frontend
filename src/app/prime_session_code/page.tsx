"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestPrimeSessionCode } from "@/lib/streaming-codes-client";

export default function PrimeSessionCodePage() {
  return <CodeRequestScreen slug="prime_session_code" request={requestPrimeSessionCode} />;
}
