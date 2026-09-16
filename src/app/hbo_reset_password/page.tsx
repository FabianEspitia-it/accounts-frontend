"use client";

import CodeRequestScreen from "@/components/site/CodeRequestScreen";
import { requestHboPasswordReset } from "@/lib/streaming-codes-client";

export default function HboResetPasswordPage() {
  return <CodeRequestScreen slug="hbo_reset_password" request={requestHboPasswordReset} />;
}
