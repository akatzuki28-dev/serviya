import type { PaymentService } from "./PaymentService";
import { MPPersonalPaymentService } from "./MPPersonalPaymentService";
import { MobbexPaymentService } from "./MobbexPaymentService";
import { UalaBisPaymentService } from "./UalaBisPaymentService";

export type { PaymentService, PaymentLink, PaymentEvent } from "./PaymentService";

export type PaymentProvider = "uala" | "mobbex" | "mp";

// Proveedor activo para cobros online. Default: "uala" (Ualá Bis — onboarding
// como persona física con DNI). Alternativas vía env PAYMENT_PROVIDER:
// "mobbex" o "mp" (este último si se reactiva la cuenta de Mercado Pago).
export function resolveProvider(): PaymentProvider {
  switch (process.env["PAYMENT_PROVIDER"]) {
    case "mp":
      return "mp";
    case "mobbex":
      return "mobbex";
    default:
      return "uala";
  }
}

export function getPaymentService(
  provider: PaymentProvider = resolveProvider()
): PaymentService {
  switch (provider) {
    case "mp":
      return new MPPersonalPaymentService();
    case "mobbex":
      return new MobbexPaymentService();
    default:
      return new UalaBisPaymentService();
  }
}
