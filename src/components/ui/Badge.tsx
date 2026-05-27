import { type HTMLAttributes } from "react";
import { classNames } from "./classNames";

type BadgeTone = "neutral" | "safe" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: "border-steel-500/80 bg-graphite-950 text-steel-100",
  safe: "border-local-500/80 bg-local-700/25 text-local-100",
  warning: "border-amberline-300/80 bg-amberline-700/25 text-amberline-100",
  danger: "border-danger-500/80 bg-danger-700/35 text-danger-100",
};

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        toneStyles[tone],
        className,
      )}
      {...props}
    />
  );
}
