"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestDisneyHomeCode } from "@/lib/streaming-codes-client";

export default function DisneyHomeCodePage() {
  return <CodeRequestScreen slug="disney_home_code" request={requestDisneyHomeCode} />;
}
