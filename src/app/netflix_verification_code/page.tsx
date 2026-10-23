"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestNetflixVerificationCode } from "@/lib/streaming-codes-client";

export default function NetflixVerificationCodePage() {
  return <CodeRequestScreen slug="netflix_verification_code" request={requestNetflixVerificationCode} />;
}
