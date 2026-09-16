"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestNetflixPasswordReset } from "@/lib/streaming-codes-client";

export default function NetflixPasswordResetPage() {
  return <CodeRequestScreen slug="netflix_password_reset" request={requestNetflixPasswordReset} />;
}
