import { redirectWithLocale } from "@/i18n/server-navigation";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function LegacyClientBrainPage({ params }: Props) {
  const { locale } = await params;
  redirectWithLocale("/persona", locale);
}
