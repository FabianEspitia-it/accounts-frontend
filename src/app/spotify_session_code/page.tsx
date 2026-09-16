"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestSpotifySessionCode } from "@/lib/streaming-codes-client";

export default function SpotifySessionCodePage() {
  return <CodeRequestScreen slug="spotify_session_code" request={requestSpotifySessionCode} />;
}
