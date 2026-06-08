"use client";

import { cn, formatCurrency } from "@/lib/utils";
import {
  Sparkles,
  Wrench,
  Zap,
  Flame,
  Leaf,
  Paintbrush,
  Truck,
  MoreHorizontal,
} from "lucide-react";

export interface ServiceCardData {
  slug: string;
  name: string;
  basePrice: number;
  description?: string;
  category: string;
  comingSoon?: boolean;
}

const CATEGORY_CONFIG: Record<string, React.ElementType> = {
  limpieza: Sparkles,
  plomeria: Wrench,
  electricidad: Zap,
  gasista: Flame,
  jardineria: Leaf,
  pintura: Paintbrush,
  mudanza: Truck,
};

interface ServiceCardProps {
  service: ServiceCardData;
  selected?: boolean;
  onClick?: () => void;
}

export function ServiceCard({ service, selected, onClick }: ServiceCardProps) {
  const Icon = CATEGORY_CONFIG[service.category] ?? MoreHorizontal;
  const comingSoon = service.comingSoon;

  return (
    <button
      type="button"
      onClick={comingSoon ? undefined : onClick}
      disabled={comingSoon}
      aria-disabled={comingSoon}
      className={cn(
        "group relative w-full text-left rounded-2xl border p-6 transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        comingSoon
          ? "cursor-not-allowed border-border bg-surface/40 opacity-70"
          : selected
            ? "cursor-pointer border-brand bg-brand-light shadow-[var(--shadow-card)]"
            : "cursor-pointer border-border bg-background hover:border-brand/40 hover:shadow-[var(--shadow-soft)]"
      )}
      aria-pressed={selected}
    >
      {comingSoon && (
        <span className="absolute right-4 top-4 rounded-full bg-foreground/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-background">
          Próximamente
        </span>
      )}
      <div
        className={cn(
          "mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors",
          selected ? "bg-brand text-background" : "bg-surface text-brand"
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="font-serif text-xl text-foreground">{service.name}</h3>

      {service.description && (
        <p className="mt-2 text-sm text-muted leading-relaxed line-clamp-2">
          {service.description}
        </p>
      )}

      <div className="mt-5 flex items-baseline gap-2 border-t border-border pt-4">
        <span className="text-xs text-muted">Desde</span>
        <span className="font-serif text-xl text-foreground">
          {formatCurrency(service.basePrice)}
        </span>
      </div>

      {selected && !comingSoon && (
        <span
          className="absolute right-5 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-background"
          aria-hidden="true"
        >
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path
              d="M1 4L4 7L9 1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      )}
    </button>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border p-6">
      <div className="skeleton mb-5 h-11 w-11 rounded-full" />
      <div className="skeleton mb-2 h-5 w-3/4 rounded" />
      <div className="skeleton mb-4 h-4 w-full rounded" />
      <div className="skeleton h-6 w-1/3 rounded" />
    </div>
  );
}
