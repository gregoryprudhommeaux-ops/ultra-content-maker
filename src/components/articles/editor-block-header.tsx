import {
  EditorSectionIcon,
  type EditorSectionIconId,
} from "@/components/articles/editor-section-icon";
import { BODY_TEXT, META_LABEL } from "@/lib/ui/nextstep";
import type { ReactNode } from "react";

type Props = {
  title: string;
  hint?: string;
  eyebrow?: string;
  icon?: EditorSectionIconId;
  actions?: ReactNode;
  titleExtra?: ReactNode;
};

export function EditorBlockHeader({
  title,
  hint,
  eyebrow,
  icon,
  actions,
  titleExtra,
}: Props) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {icon ? (
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ns-alternate/70 bg-ns-brand-light text-ns-secondary"
            aria-hidden
          >
            <EditorSectionIcon id={icon} />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          {eyebrow ? <p className={META_LABEL}>{eyebrow}</p> : null}
          <div className={`flex flex-wrap items-center gap-2 ${eyebrow ? "mt-1" : ""}`}>
            <h2 className="text-sm font-semibold leading-snug text-ns-hero md:text-base">{title}</h2>
            {titleExtra ? (
              <span onClick={(event) => event.stopPropagation()}>{titleExtra}</span>
            ) : null}
          </div>
          {hint ? <p className={`mt-1 ${BODY_TEXT}`}>{hint}</p> : null}
        </div>
      </div>
      {actions ? <div className="shrink-0 pt-0.5">{actions}</div> : null}
    </div>
  );
}
