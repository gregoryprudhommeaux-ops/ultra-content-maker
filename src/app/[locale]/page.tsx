import { LandingPage } from "@/components/landing/landing-page";

type Props = {
  searchParams: Promise<{ marketing?: string }>;
};

export default async function LocaleHomePage({ searchParams }: Props) {
  const { marketing } = await searchParams;
  return <LandingPage isMarketing={marketing === "1"} />;
}
