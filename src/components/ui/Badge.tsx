import { type HTMLAttributes } from "react";
import { classNames } from "./classNames";

type BadgeTone = "neutral" | "safe" | "warning" | "danger";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneStyles: Record<BadgeTone, string> = {
  neutral: "border-steel-500 bg-graphite-900 text-steel-100",
  safe: "border-local-500 bg-local-700/30 text-local-100",
  warning: "border-amberline-300 bg-amberline-700/30 text-amberline-100",
  danger: "border-danger-500 bg-danger-700/40 text-danger-100",
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
