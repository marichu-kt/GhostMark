import { type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { classNames } from "./classNames";

type NoticeTone = "info" | "warning" | "success" | "danger";

interface NoticeProps {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
}

const toneStyles: Record<NoticeTone, string> = {
  info: "border-steel-500 bg-graphite-900 text-steel-100",
  warning: "border-amberline-300 bg-amberline-700/20 text-amberline-100",
  success: "border-local-500 bg-local-700/25 text-local-100",
  danger: "border-danger-500 bg-danger-700/25 text-danger-100",
};

const icons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  danger: AlertTriangle,
};

export function Notice({ tone = "info", title, children }: NoticeProps) {
  const Icon = icons[tone];

  return (
    <div className={classNames("flex gap-3 rounded-md border p-3 text-sm", toneStyles[tone])}>
      <Icon className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
      <div className="grid gap-1">
        {title ? <strong className="font-semibold">{title}</strong> : null}
        <div className="leading-5">{children}</div>
      </div>
    </div>
  );
}
