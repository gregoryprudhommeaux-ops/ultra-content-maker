import { redirectWithLocale } from "@/i18n/server-navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function LegacyClientsPage({ params }: Props) {
  const { locale } = await params;
  redirectWithLocale("/setup/llm", locale);
}
