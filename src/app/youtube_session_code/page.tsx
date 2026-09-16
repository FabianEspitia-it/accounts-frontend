"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestYoutubeSessionCode } from "@/lib/streaming-codes-client";

export default function YoutubeSessionCodePage() {
  return <CodeRequestScreen slug="youtube_session_code" request={requestYoutubeSessionCode} />;
}
