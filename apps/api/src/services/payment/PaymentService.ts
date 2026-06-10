import type { Order } from "@sp/db";

export interface PaymentLink {
  url: string;
  externalId: string; // mp_preference_id en piloto
}

export type PaymentEventStatus =
  | "approved"
  | "rejected"
  | "cancelled"
  | "pending"
  | "refunded"
  | "charged_back";

export interface PaymentEvent {
  orderId: string;
  paymentId: string;
  status: PaymentEventStatus;
  amount: number;
}

export interface PaymentService {
  createPaymentLink(order: Order): Promise<PaymentLink>;
  verifyWebhook(payload: unknown, signature: string): Promise<PaymentEvent>;
  refund(paymentId: string, amount: number): Promise<void>;
}
