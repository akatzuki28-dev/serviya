import { cn } from "@/lib/utils";

interface ContainerProps {
  size?: "narrow" | "default" | "wide";
  className?: string;
  children: React.ReactNode;
}

export function Container({
  size = "default",
  className,
  children,
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-8",
        size === "narrow" && "max-w-4xl",
        size === "default" && "max-w-6xl",
        size === "wide" && "max-w-7xl",
        className
      )}
    >
      {children}
    </div>
  );
}

interface EyebrowProps {
  className?: string;
  children: React.ReactNode;
}

export function Eyebrow({ className, children }: EyebrowProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.18em] text-muted",
        className
      )}
    >
      <span className="gold-divider" />
      <span>{children}</span>
    </span>
  );
}
