"use client";

import { LABEL_CLASS } from "@/types/workspace";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type Props = {
  htmlFor: string;
  children: ReactNode;
  optional?: boolean;
};

export function OptionalLabel({ htmlFor, children, optional = true }: Props) {
  const t = useTranslations("common");

  return (
    <label className={LABEL_CLASS} htmlFor={htmlFor}>
      {children}
      {optional ? (
        <span className="font-normal text-ns-secondary/60"> {t("optional")}</span>
      ) : (
        <span className="font-normal text-ns-primary"> {t("required")}</span>
      )}
    </label>
  );
}
