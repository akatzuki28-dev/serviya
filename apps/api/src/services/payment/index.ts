import type { PaymentService } from "./PaymentService";
import { MPPersonalPaymentService } from "./MPPersonalPaymentService";
import { MobbexPaymentService } from "./MobbexPaymentService";

export type { PaymentService, PaymentLink, PaymentEvent } from "./PaymentService";

export type PaymentProvider = "mobbex" | "mp";

// Proveedor activo según env. Default: "mobbex" (la cuenta MP del piloto está
// suspendida). Poné PAYMENT_PROVIDER=mp para volver a Mercado Pago.
export function resolveProvider(): PaymentProvider {
  return process.env["PAYMENT_PROVIDER"] === "mp" ? "mp" : "mobbex";
}

export function getPaymentService(
  provider: PaymentProvider = resolveProvider()
): PaymentService {
  return provider === "mp"
    ? new MPPersonalPaymentService()
    : new MobbexPaymentService();
}
