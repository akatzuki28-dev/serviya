"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { BookingProgress } from "@/components/booking/BookingProgress";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBookingStore } from "@/store/booking";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import {
  CreditCard,
  Building2,
  MapPin,
  Calendar,
  ChevronDown,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const CBU_ALIAS = process.env.NEXT_PUBLIC_CBU_ALIAS ?? "servi.ya.mp";
const CBU_NUMBER = process.env.NEXT_PUBLIC_CBU_NUMBER ?? "";

interface ConfirmCheckoutProps {
  serviceSlug: string;
}

export function ConfirmCheckoutClient({ serviceSlug }: ConfirmCheckoutProps) {
  const router = useRouter();
  const store = useBookingStore();
  const [mounted, setMounted] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"mobbex" | "transfer">(
    "mobbex"
  );
  const [notes, setNotes] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { data: quote, isLoading: quoteLoading } = useSWR(
    store.serviceType
      ? [
          `${process.env.NEXT_PUBLIC_API_URL}/api/pricing/quote`,
          store.serviceType,
          store.zone,
          store.extras,
        ]
      : null,
    ([url, serviceType, zone, extras]) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceType, zone, extras }),
      }).then((r) => r.json()),
    { revalidateOnFocus: false }
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || submitted) return;
    if (!store.serviceType || !store.scheduledAt || !store.address) {
      router.replace("/reservar");
    }
  }, [mounted, submitted, store.serviceType, store.scheduledAt, store.address, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    startTransition(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/orders`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceType: store.serviceType,
              scheduledAt: store.scheduledAt,
              zone: store.zone,
              extras: store.extras,
              addressSnapshot: store.address,
              paymentMethod,
              clientNotes: notes,
              guestEmail: guestEmail || undefined,
              guestPhone: guestPhone || undefined,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setSubmitError(data.error ?? "Error al procesar la reserva.");
          return;
        }

        // Marcar como enviado ANTES de tocar el store, así el guard de
        // arriba no dispara un replace("/reservar") al vaciarse el store.
        setSubmitted(true);

        if (paymentMethod === "mobbex" && data.paymentUrl) {
          store.reset();
          window.location.href = data.paymentUrl;
        } else {
          store.reset();
          router.push(`/orden/${data.order.id}/confirmada`);
        }
      } catch {
        setSubmitError("Error de conexión. Intenta de nuevo.");
      }
    });
  }

  if (!mounted || !store.serviceType || !store.scheduledAt || !store.address) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-full rounded-full" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-36 rounded-2xl" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <BookingProgress currentStep={3} />

      {/* Resumen */}
      <section className="rounded-2xl border border-border bg-background p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold" />
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Resumen del servicio
          </h2>
        </div>
        <dl className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light text-brand">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-serif text-lg text-foreground capitalize">
              {store.serviceName}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>
              {formatDate(store.scheduledAt)} a las{" "}
              {formatTime(store.scheduledAt)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>
              {store.address.street}, {store.address.city}
            </span>
          </div>
        </dl>

        {quoteLoading ? (
          <div className="mt-6 space-y-2 border-t border-border pt-5">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-6 w-1/3 rounded" />
          </div>
        ) : quote ? (
          <div className="mt-6 border-t border-border pt-5">
            {quote.breakdown?.map(
              (item: { label: string; amount: number }) => (
                <div
                  key={item.label}
                  className="flex justify-between py-1.5 text-sm text-muted"
                >
                  <span>{item.label}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              )
            )}
            <div className="mt-3 flex justify-between border-t border-border pt-3">
              <span className="font-medium text-foreground">Total</span>
              <span className="font-serif text-2xl text-foreground">
                {formatCurrency(quote.total)}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      {/* Datos de contacto */}
      <section className="rounded-2xl border border-border bg-background p-6 sm:p-8">
        <h2 className="mb-5 text-[11px] font-medium uppercase tracking-wider text-muted">
          Tus datos
        </h2>
        <div className="space-y-4">
          <Input
            id="guestEmail"
            type="email"
            label="Email para recibir confirmación"
            placeholder="hola@ejemplo.com"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            id="guestPhone"
            type="tel"
            label="WhatsApp (recomendado)"
            placeholder="+54 9 11 1234-5678"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
      </section>

      {/* Método de pago */}
      <section className="rounded-2xl border border-border bg-background p-6 sm:p-8">
        <h2 className="mb-5 text-[11px] font-medium uppercase tracking-wider text-muted">
          Forma de pago
        </h2>
        <div className="space-y-3">
          <label
            className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all duration-200 ${
              paymentMethod === "mobbex"
                ? "border-brand bg-brand-light shadow-[var(--shadow-soft)]"
                : "border-border hover:border-brand/30"
            }`}
          >
            <input
              type="radio"
              name="payment"
              value="mobbex"
              checked={paymentMethod === "mobbex"}
              onChange={() => setPaymentMethod("mobbex")}
              className="mt-1 accent-[var(--color-brand)]"
            />
            <div>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <CreditCard className="h-4 w-4 text-brand" />
                Tarjeta de crédito o débito
              </div>
              <p className="mt-1 text-sm text-muted">
                Pagá con tarjeta en cuotas de forma segura. Te llevamos al checkout.
              </p>
            </div>
          </label>

          <label
            className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 p-4 transition-all duration-200 ${
              paymentMethod === "transfer"
                ? "border-brand bg-brand-light shadow-[var(--shadow-soft)]"
                : "border-border hover:border-brand/30"
            }`}
          >
            <input
              type="radio"
              name="payment"
              value="transfer"
              checked={paymentMethod === "transfer"}
              onChange={() => setPaymentMethod("transfer")}
              className="mt-1 accent-[var(--color-brand)]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Building2 className="h-4 w-4 text-brand" />
                Transferencia bancaria
              </div>
              {paymentMethod === "transfer" && (
                <div className="mt-3 rounded-xl bg-surface p-4 text-sm">
                  <p className="font-medium text-foreground">
                    Alias: {CBU_ALIAS}
                  </p>
                  {CBU_NUMBER && (
                    <p className="text-muted">CBU: {CBU_NUMBER}</p>
                  )}
                  <p className="mt-2 text-muted">
                    Monto exacto:{" "}
                    <span className="font-medium text-foreground">
                      {quote ? formatCurrency(quote.total) : "..."}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-subtle">
                    Enviá el comprobante por WhatsApp para confirmar tu reserva.
                  </p>
                </div>
              )}
            </div>
          </label>
        </div>
      </section>

      {/* Nota al proveedor */}
      <section className="rounded-2xl border border-border bg-background p-6 sm:p-8">
        <details>
          <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wider text-muted flex items-center gap-2">
            <ChevronDown className="h-4 w-4" />
            Agregar nota al proveedor (opcional)
          </summary>
          <div className="mt-4">
            <textarea
              placeholder="Ej: Hay perro en la casa, traer aspiradora propia..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-subtle transition-colors duration-200 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
            <p className="mt-1 text-right text-xs text-subtle">
              {notes.length}/500
            </p>
          </div>
        </details>
      </section>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted">
        <ShieldCheck className="h-4 w-4 text-success" />
        <span>Pago 100% seguro. Garantía de satisfacción 24 hs.</span>
      </div>

      {submitError && (
        <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {submitError}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Atrás
        </Button>
        <Button type="submit" size="lg" loading={isPending}>
          {paymentMethod === "mobbex"
            ? "Pagar con tarjeta"
            : "Confirmar reserva"}
        </Button>
      </div>
    </form>
  );
}
