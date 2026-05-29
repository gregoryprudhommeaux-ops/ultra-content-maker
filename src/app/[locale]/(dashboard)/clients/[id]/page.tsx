import { redirectWithLocale } from "@/i18n/server-navigation";

type Props = { params: Promise<{ locale: string; id: string }> };

/** Legacy multi-client hub — redirect to Persona (v3 single workspace). */
export default async function LegacyClientHubPage({ params }: Props) {
  const { locale } = await params;
  redirectWithLocale("/persona", locale);
}
