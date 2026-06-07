import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  PENDIENTE_PAGO: "bg-amber-100 text-amber-800",
  PAGADA: "bg-blue-100 text-blue-800",
  CONFIRMADA: "bg-violet-100 text-violet-800",
  EN_CAMINO: "bg-cyan-100 text-cyan-800",
  EN_PROGRESO: "bg-cyan-100 text-cyan-800",
  COMPLETADA: "bg-green-100 text-green-800",
  CANCELADA: "bg-red-100 text-red-800",
  PAGO_FALLIDO: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  PAGADA: "Pagada",
  CONFIRMADA: "Confirmada",
  EN_CAMINO: "En camino",
  EN_PROGRESO: "En progreso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
  PAGO_FALLIDO: "Pago fallido",
};

interface BadgeProps {
  status: string;
  className?: string;
}

export function OrderStatusBadge({ status, className }: BadgeProps) {
  const style = statusStyles[status] ?? "bg-gray-100 text-gray-800";
  const label = statusLabels[status] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        style,
        className
      )}
    >
      {label}
    </span>
  );
}
