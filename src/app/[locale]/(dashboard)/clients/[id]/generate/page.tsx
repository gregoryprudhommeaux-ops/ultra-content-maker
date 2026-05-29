import { redirectWithLocale } from "@/i18n/server-navigation";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function LegacyClientGeneratePage({ params }: Props) {
  const { locale } = await params;
  redirectWithLocale("/articles/new", locale);
}
