import type { ReactNode } from "react";

type MarketingPageIntroProps = {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  hint?: string;
  className?: string;
  variant?: "light" | "dark";
};

/** Centered marketing intro — same rhythm as /pricing (eyebrow → title → body). */
export function MarketingPageIntro({
  eyebrow,
  title,
  children,
  hint,
  className = "",
  variant = "light",
}: MarketingPageIntroProps) {
  const onDark = variant === "dark";

  return (
    <div className={`mx-auto max-w-3xl text-center ${className}`}>
      {eyebrow ? (
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-ns-primary">{eyebrow}</p>
      ) : null}
      <h1
        className={`text-balance text-3xl font-bold tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-tight ${eyebrow ? "mt-3" : ""} ${onDark ? "text-white" : "text-ns-tertiary"}`}
      >
        {title}
      </h1>
      {children ? <div className="mt-4 space-y-2">{children}</div> : null}
      {hint ? (
        <p className={`mt-4 text-sm font-medium text-pretty ${onDark ? "text-ns-primary" : "text-ns-primary"}`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function MarketingIntroParagraph({
  children,
  variant = "light",
}: {
  children: ReactNode;
  variant?: "light" | "dark";
}) {
  return (
    <p
      className={`text-pretty text-base leading-relaxed md:text-[1.05rem] md:leading-relaxed ${variant === "dark" ? "text-white/70" : "text-ns-secondary"}`}
    >
      {children}
    </p>
  );
}
