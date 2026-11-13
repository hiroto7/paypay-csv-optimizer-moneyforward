import type { ButtonHTMLAttributes } from "react";

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  // primaryはその場面で主となる操作に使う。
  variant?: "primary" | "secondary";
}

const variantClassNames = {
  primary:
    "bg-zinc-900 text-white enabled:hover:bg-zinc-700 disabled:cursor-wait disabled:bg-zinc-200 disabled:text-zinc-500",
  secondary:
    "border border-zinc-300 bg-white text-zinc-700 enabled:hover:bg-zinc-100 disabled:cursor-wait disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-400",
} as const;

export default function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 px-4 text-sm font-semibold ${variantClassNames[variant]} ${className}`}
      {...props}
    />
  );
}
