import { redirect } from "next/navigation";
import { InviteClient } from "./invite-client";

const INVITE_ACCESS_CODE = process.env.INVITE_ACCESS_CODE;

interface InvitePageProps {
  params: Promise<{
    code: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;

  // Check if whitelist mode is enabled
  if (process.env.NEXT_PUBLIC_IS_ONLY_WHITELIST !== "true") {
    redirect("/");
  }

  // Validate the access code on server
  const isValidCode = INVITE_ACCESS_CODE && code === INVITE_ACCESS_CODE;

  return <InviteClient code={code} isValidCode={isValidCode} />;
}
