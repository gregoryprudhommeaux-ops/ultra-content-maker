import { useTranslations } from "next-intl";

type Props = {
  namespace?: "pricing" | "subscription";
  className?: string;
  variant?: "light" | "dark";
  showMode?: boolean;
};

export function SupportTotalHeading({
  namespace = "pricing",
  className = "",
  variant = "light",
  showMode = false,
}: Props) {
  const t = useTranslations(namespace === "pricing" ? "pricing.support" : "subscription.support");

  const titleClass =
    variant === "dark"
      ? "text-2xl font-bold tracking-tight text-white md:text-3xl"
      : "text-2xl font-bold tracking-tight text-ns-tertiary md:text-3xl";

  const modeClass =
    variant === "dark" ? "text-sm text-white/75" : "text-sm text-ns-secondary";

  return (
    <div className={className}>
      <h2 className={titleClass}>{t("title")}</h2>
      {showMode ? <p className={`mt-2 max-w-2xl leading-relaxed ${modeClass}`}>{t("titleMode")}</p> : null}
    </div>
  );
}
