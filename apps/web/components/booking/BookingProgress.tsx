"use client";

import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Servicio" },
  { label: "Fecha y lugar" },
  { label: "Pago" },
  { label: "Listo" },
];

interface BookingProgressProps {
  currentStep: 1 | 2 | 3 | 4;
}

export function BookingProgress({ currentStep }: BookingProgressProps) {
  return (
    <nav aria-label="Pasos de reserva" className="w-full">
      <ol className="flex items-center">
        {STEPS.map((step, index) => {
          const n = index + 1;
          const done = n < currentStep;
          const active = n === currentStep;

          return (
            <li key={step.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center min-w-0">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium transition-all duration-300",
                    done && "bg-brand text-background",
                    active && "bg-brand text-background ring-4 ring-brand-light",
                    !done && !active && "bg-surface text-muted border border-border"
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L4 7L9 1"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    n
                  )}
                </span>
                <span
                  className={cn(
                    "mt-1.5 hidden text-[11px] uppercase tracking-wider sm:block whitespace-nowrap",
                    active ? "text-foreground font-medium" : "text-muted"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-3 h-px flex-1 transition-colors duration-500",
                    done ? "bg-brand" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
