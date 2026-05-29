"use client";

type Props = {
  lines?: number;
};

export function EditorPanelPlaceholder({ lines = 3 }: Props) {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-4 rounded-md bg-gray-100"
          style={{ width: `${88 - i * 12}%` }}
        />
      ))}
    </div>
  );
}
