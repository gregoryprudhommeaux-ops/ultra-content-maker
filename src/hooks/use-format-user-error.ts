"use client";

import { formatUserError, type UserErrorInfo } from "@/lib/errors/format-user-error";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

export function useFormatUserError() {
  const t = useTranslations("errors");

  return useCallback(
    (input: { errorCode?: string; detail?: string; fallbackMessage?: string }): UserErrorInfo =>
      formatUserError((key, values) => t(key, values), input),
    [t],
  );
}
