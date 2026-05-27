import { type ButtonHTMLAttributes, forwardRef } from "react";
import { classNames } from "./classNames";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
type ButtonSize = "sm" | "md" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "border-brand-red bg-brand-red text-white hover:bg-danger-700",
  secondary: "border-steel-500 bg-graphite-800 text-steel-100 hover:border-steel-300 hover:bg-graphite-700",
  ghost: "border-transparent bg-transparent text-steel-100 hover:bg-graphite-800",
  danger: "border-danger-500 bg-danger-700 text-danger-100 hover:bg-danger-500",
  quiet: "border-graphite-700 bg-graphite-900 text-steel-200 hover:border-steel-500 hover:bg-graphite-800",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  icon: "h-9 w-9 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = "Button";
