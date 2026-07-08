export type EditorSectionIconId =
  | "refine"
  | "analysis"
  | "cta"
  | "enrich"
  | "share"
  | "illustration"
  | "validate";

type Props = {
  id: EditorSectionIconId;
  className?: string;
};

export function EditorSectionIcon({ id, className = "h-4 w-4" }: Props) {
  const stroke = "currentColor";
  const common = {
    xmlns: "http://www.w3.org/2000/svg",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (id) {
    case "refine":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "analysis":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15V9" />
          <path d="M12 17V7" />
          <path d="M16 13v-2" />
        </svg>
      );
    case "cta":
      return (
        <svg {...common}>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-4.5A4 4 0 0 1 4 15V7a4 4 0 0 1 4-4h9a4 4 0 0 1 4 4Z" />
        </svg>
      );
    case "enrich":
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m8 11 4 4 4-4" />
          <path d="M5 21h14" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 3.9M15.4 6.6 8.6 10.5" />
        </svg>
      );
    case "illustration":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="m21 17-5.5-5.5L8 19" />
        </svg>
      );
    case "validate":
      return (
        <svg {...common}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    default:
      return null;
  }
}
