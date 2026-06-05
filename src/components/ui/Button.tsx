import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap";

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-on hover:bg-accent-hover active:bg-accent-pressed",
  secondary: "bg-base text-accent border border-accent hover:bg-accent-dim",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-sunken",
  destructive: "bg-error text-white hover:opacity-90",
};

interface ButtonProps extends Omit<ComponentProps<"button">, "className"> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}
