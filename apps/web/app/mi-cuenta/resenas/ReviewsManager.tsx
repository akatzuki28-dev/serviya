"use client";

import { useState, useTransition } from "react";
import { Star, MessageSquare, Loader2, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { createReview } from "./actions";

export interface Review {
  id: string;
  orderId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  provider?: { name: string } | null;
  order?: { serviceType: string; scheduledAt: string } | null;
}

export interface ReviewableOrder {
  id: string;
  serviceType: string;
  scheduledAt: string;
  providerName: string | null;
}

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange?: (n: number) => void;
}) {
  const interactive = typeof onChange === "function";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(n)}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
        >
          <Star
            className={`h-4 w-4 ${
              n <= value ? "fill-gold text-gold" : "text-subtle"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({ order }: { order: ReviewableOrder }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Elegí una calificación de 1 a 5 estrellas.");
      return;
    }
    startTransition(async () => {
      const result = await createReview({
        orderId: order.id,
        rating,
        comment: comment.trim() ? comment.trim() : null,
      });
      if (result.ok) {
        setDone(true);
      } else {
        setError(result.error);
      }
    });
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background p-5 text-sm text-foreground">
        <Check className="h-4 w-4 text-brand" />
        ¡Gracias por tu reseña!
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-border bg-background p-5"
    >
      <div>
        <p className="font-serif text-base text-foreground capitalize">
          {order.serviceType?.replace(/-/g, " ")}
        </p>
        <p className="text-xs text-muted">
          {formatDate(order.scheduledAt)}
          {order.providerName && ` · ${order.providerName}`}
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}

      <Stars value={rating} onChange={setRating} />

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Contanos cómo fue el servicio (opcional)"
        rows={2}
        maxLength={1000}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      />

      <Button type="submit" size="sm" loading={isPending}>
        Enviar reseña
      </Button>
    </form>
  );
}

export function ReviewsManager({
  reviews,
  reviewable,
}: {
  reviews: Review[];
  reviewable: ReviewableOrder[];
}) {
  const hasNothing = reviews.length === 0 && reviewable.length === 0;

  if (hasNothing) {
    return (
      <div className="rounded-2xl border border-border bg-background p-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface">
          <Star className="h-6 w-6 text-muted" />
        </div>
        <p className="font-serif text-lg text-foreground">
          Todavía no tenés reseñas
        </p>
        <p className="mt-1 text-sm text-muted">
          Cuando completes un servicio vas a poder calificarlo desde acá.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {reviewable.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-serif text-lg text-foreground">
            <MessageSquare className="h-4 w-4 text-brand" />
            Servicios para calificar
          </h2>
          <div className="space-y-3">
            {reviewable.map((o) => (
              <ReviewForm key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-lg text-foreground">
            Tus reseñas
          </h2>
          <div className="space-y-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-border bg-background p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-serif text-base text-foreground capitalize">
                      {r.order?.serviceType?.replace(/-/g, " ") ?? "Servicio"}
                    </p>
                    <p className="text-xs text-muted">
                      {r.order?.scheduledAt
                        ? formatDate(r.order.scheduledAt)
                        : formatDate(r.createdAt)}
                      {r.provider?.name && ` · ${r.provider.name}`}
                    </p>
                  </div>
                  <Stars value={r.rating} />
                </div>
                {r.comment && (
                  <p className="mt-3 text-sm text-foreground/80">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
