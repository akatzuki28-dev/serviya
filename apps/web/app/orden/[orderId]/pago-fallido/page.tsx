import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { XCircle, RefreshCw, MessageCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Pago fallido",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function PagoFallidoPage({ params }: Props) {
  const { orderId } = await params;

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-5 py-24 sm:py-32">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-danger/10">
            <XCircle className="h-10 w-10 text-danger" />
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl text-foreground">
            El pago <span className="italic text-danger">no se procesó</span>
          </h1>

          <p className="mt-3 text-muted leading-relaxed">
            Podés intentar pagar de nuevo o elegir transferencia bancaria como
            alternativa.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm">
            <span className="text-muted">N.° de orden:</span>
            <span className="font-mono font-medium text-foreground">
              {orderId.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="mt-8 space-y-3">
            <Button asChild className="w-full" size="lg">
              <Link href="/reservar">
                <RefreshCw className="h-4 w-4" />
                Intentar de nuevo
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>

          <p className="mt-8 text-sm text-muted">
            ¿Necesitás ayuda?{" "}
            <a
              href="https://wa.me/5491100000000"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand link-underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Contactanos por WhatsApp
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
