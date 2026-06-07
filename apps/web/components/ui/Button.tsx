import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "group relative inline-flex items-center justify-center gap-2",
    "whitespace-nowrap font-medium tracking-tight",
    "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-background hover:bg-brand-soft shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] focus-visible:ring-brand rounded-full",
        gold:
          "bg-gold text-foreground hover:bg-gold-soft shadow-[var(--shadow-soft)] focus-visible:ring-gold rounded-full",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-surface hover:border-brand focus-visible:ring-brand rounded-full",
        ghost:
          "text-foreground hover:bg-surface focus-visible:ring-brand rounded-full",
        link: "text-brand p-0 h-auto link-underline focus-visible:ring-brand",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-13 px-8 text-base py-3.5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
