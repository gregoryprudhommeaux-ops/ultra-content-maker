import { SignupForm } from "@/components/auth/signup-form";
import { getTranslations } from "next-intl/server";

export default async function SignupPage() {
  const t = await getTranslations("auth.signup");

  return (
    <div>
      <h2 className="mb-1 text-xl font-semibold text-ns-tertiary">{t("title")}</h2>
      <p className="mb-6 text-sm text-ns-secondary">{t("subtitle")}</p>
      <SignupForm />
    </div>
  );
}
