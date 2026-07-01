"use client";

import { useImeSafeControlledField } from "@/hooks/use-ime-safe-controlled-field";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type ImeSafeInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

type ImeSafeTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange"
> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function ImeSafeInput({ value, onValueChange, ...props }: ImeSafeInputProps) {
  const field = useImeSafeControlledField(value, onValueChange);
  return <input {...props} {...field} />;
}

export function ImeSafeTextarea({
  value,
  onValueChange,
  ...props
}: ImeSafeTextareaProps) {
  const field = useImeSafeControlledField(value, onValueChange);
  return <textarea {...props} {...field} />;
}
