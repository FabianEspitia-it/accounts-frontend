"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestCrunchyrollLoginLink } from "@/lib/streaming-codes-client";

export default function CrunchyrollLinkPage() {
  return <CodeRequestScreen slug="crunchyroll_link" request={requestCrunchyrollLoginLink} />;
}
