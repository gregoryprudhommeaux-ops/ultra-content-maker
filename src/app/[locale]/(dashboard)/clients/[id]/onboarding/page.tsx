import { redirectWithLocale } from "@/i18n/server-navigation";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function LegacyClientOnboardingPage({ params }: Props) {
  const { locale } = await params;
  redirectWithLocale("/setup/author?tab=essential", locale);
}
