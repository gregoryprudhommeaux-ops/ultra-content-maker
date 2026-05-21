type NsMarkProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-8 w-8 rounded-md text-xs",
  md: "h-10 w-10 rounded-lg text-sm",
  lg: "h-12 w-12 rounded-lg text-base",
} as const;

/** NextStep Services mark — shared across NS Suite products */
export function NsMark({ size = "md", className = "" }: NsMarkProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-ns-primary font-black text-black ${SIZE_CLASS[size]} ${className}`}
      aria-hidden
    >
      NS
    </div>
  );
}
