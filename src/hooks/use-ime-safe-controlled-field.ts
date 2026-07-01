"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
} from "react";

/**
 * Controlled string field that keeps IME/dead-key composition stable on macOS
 * and other platforms where parent re-renders would otherwise drop accents.
 */
export function useImeSafeControlledField(
  value: string,
  onChange: (value: string) => void,
) {
  const composingRef = useRef(false);
  const [local, setLocal] = useState(value);

  useEffect(() => {
    if (!composingRef.current) {
      setLocal(value);
    }
  }, [value]);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
  }, []);

  const onCompositionEnd = useCallback(
    (e: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      composingRef.current = false;
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      // compositionend can fire before the trailing input event (Safari/Chrome).
      // Defer commit so the final DOM value — including spaces — is read after IME settles.
      queueMicrotask(() => {
        const next = target.value;
        setLocal(next);
        onChange(next);
      });
    },
    [onChange],
  );

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = e.target.value;
      setLocal(next);
      if (!composingRef.current) {
        onChange(next);
      }
    },
    [onChange],
  );

  return {
    value: local,
    onChange: onInputChange,
    onCompositionStart,
    onCompositionEnd,
  };
}
