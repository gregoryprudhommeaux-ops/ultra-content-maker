import { AuthProvider } from "@/components/auth/auth-provider";
import { InviteOnboardingClient } from "@/components/invite/invite-onboarding-client";

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  return (
    <AuthProvider>
      <InviteOnboardingClient token={token} />
    </AuthProvider>
  );
}
