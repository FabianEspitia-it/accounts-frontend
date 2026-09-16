"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestUniversalActivationCode } from "@/lib/streaming-codes-client";

export default function UniversalActivationCodePage() {
  return <CodeRequestScreen slug="universal_activation_code" request={requestUniversalActivationCode} />;
}
