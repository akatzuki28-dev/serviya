// Constantes compartidas de estados de orden. NO es un módulo "use server":
// los archivos con "use server" solo pueden exportar funciones async, así que
// estas constantes (arrays/objetos) viven acá y las importan tanto el client
// component como el server action.

export const ORDER_STATUSES = [
  "PENDIENTE_PAGO",
  "PAGADA",
  "CONFIRMADA",
  "EN_CAMINO",
  "EN_PROGRESO",
  "COMPLETADA",
  "CANCELADA",
  "PAGO_FALLIDO",
  "REEMBOLSADA",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDIENTE_PAGO: "Pendiente de pago",
  PAGADA: "Pagada",
  CONFIRMADA: "Confirmada",
  EN_CAMINO: "En camino",
  EN_PROGRESO: "En progreso",
  COMPLETADA: "Completada",
  CANCELADA: "Cancelada",
  PAGO_FALLIDO: "Pago fallido",
  REEMBOLSADA: "Reembolsada",
};

// Color del punto según estado, para mantener la pista visual del badge.
export const STATUS_DOT: Record<OrderStatus, string> = {
  PENDIENTE_PAGO: "bg-amber-500",
  PAGADA: "bg-blue-500",
  CONFIRMADA: "bg-violet-500",
  EN_CAMINO: "bg-cyan-500",
  EN_PROGRESO: "bg-cyan-500",
  COMPLETADA: "bg-green-600",
  CANCELADA: "bg-red-500",
  PAGO_FALLIDO: "bg-red-500",
  REEMBOLSADA: "bg-orange-500",
};
