import { type HTMLAttributes } from "react";
import { classNames } from "./classNames";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={classNames(
        "rounded-md border border-graphite-700 bg-graphite-850 shadow-panel",
        className,
      )}
      {...props}
    />
  );
}
