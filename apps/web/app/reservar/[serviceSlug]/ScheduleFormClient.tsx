"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingProgress } from "@/components/booking/BookingProgress";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useBookingStore } from "@/store/booking";
import { formatDate, formatTime } from "@/lib/utils";
import { MapPin, Locate, Calendar, Clock } from "lucide-react";

interface ScheduleFormProps {
  serviceSlug: string;
  availableSlots: string[];
}

export function ScheduleFormClient({
  serviceSlug,
  availableSlots,
}: ScheduleFormProps) {
  const router = useRouter();
  const { setSchedule, setAddress, scheduledAt, address } =
    useBookingStore();

  const [selectedSlot, setSelectedSlot] = useState<string | null>(scheduledAt);
  const [street, setStreet] = useState(address?.street ?? "");
  const [city, setCity] = useState(address?.city ?? "");
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const slotsByDay = availableSlots.reduce<Record<string, string[]>>(
    (acc, slot) => {
      const day = new Date(slot).toDateString();
      if (!acc[day]) acc[day] = [];
      acc[day]!.push(slot);
      return acc;
    },
    {}
  );

  async function handleGeolocate() {
    if (!navigator.geolocation) {
      setLocationError("Tu navegador no soporta geolocalización.");
      return;
    }
    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const street =
            `${data.address?.road ?? ""} ${data.address?.house_number ?? ""}`.trim();
          const city =
            data.address?.city ??
            data.address?.town ??
            data.address?.suburb ??
            "Buenos Aires";
          setStreet(street);
          setCity(city);
        } catch {
          setLocationError("No pudimos obtener tu dirección.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocationError("Permiso denegado. Ingresá tu dirección manualmente.");
        setLocating(false);
      }
    );
  }

  function handleContinue() {
    if (!selectedSlot || !street || !city) return;
    setSchedule(selectedSlot, city);
    setAddress({ street, city });
    router.push(`/reservar/${serviceSlug}/confirmar`);
  }

  const canContinue = selectedSlot && street.trim() && city.trim();

  return (
    <div className="space-y-8">
      <BookingProgress currentStep={2} />

      <section className="rounded-2xl border border-border bg-background p-6 sm:p-8">
        <div className="mb-5 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gold" />
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
            Fecha y hora
          </h2>
        </div>
        <div className="space-y-5">
          {Object.entries(slotsByDay).map(([day, slots]) => (
            <div key={day}>
              <p className="mb-2.5 text-sm font-medium text-foreground">
                {formatDate(slots[0]!)}
              </p>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200 cursor-pointer ${
                      selectedSlot === slot
                        ? "border-brand bg-brand text-background shadow-[var(--shadow-soft)]"
                        : "border-border bg-background text-foreground hover:border-brand/40 hover:shadow-[var(--shadow-soft)]"
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {formatTime(slot)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(slotsByDay).length === 0 && (
            <div className="rounded-xl bg-surface p-6 text-center">
              <p className="text-sm text-muted">
                No hay disponibilidad esta semana. Contactanos por WhatsApp.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-6 sm:p-8">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gold" />
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-muted">
              Dirección del servicio
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleGeolocate}
            loading={locating}
          >
            <Locate className="h-4 w-4" />
            Usar mi ubicación
          </Button>
        </div>

        <div className="space-y-4">
          <Input
            id="street"
            label="Calle y número"
            placeholder="Ej: Av. Corrientes 1234"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            autoComplete="street-address"
          />
          <Input
            id="city"
            label="Barrio / Ciudad"
            placeholder="Ej: Palermo, Buenos Aires"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          {locationError && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
              {locationError}
            </p>
          )}
        </div>
      </section>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => router.back()}>
          Atrás
        </Button>
        <Button size="lg" disabled={!canContinue} onClick={handleContinue}>
          Continuar
        </Button>
      </div>
    </div>
  );
}
