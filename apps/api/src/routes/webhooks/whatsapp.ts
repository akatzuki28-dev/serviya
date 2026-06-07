import { Router } from "express";
import { validateWhatsAppWebhook } from "../../middlewares/validateWebhook";
import { WhatsAppService } from "../../services/WhatsAppService";

export const whatsappWebhookRouter = Router();
const wa = new WhatsAppService();

// GET — verificación del webhook por Meta
whatsappWebhookRouter.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env["WA_VERIFY_TOKEN"]) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send("Forbidden");
  }
});

// POST — mensajes entrantes
whatsappWebhookRouter.post("/", validateWhatsAppWebhook, async (req, res) => {
  res.status(200).send("OK");

  try {
    const entries = req.body?.entry as any[] | undefined;
    if (!entries) return;

    for (const entry of entries) {
      const changes = entry.changes as any[] | undefined;
      for (const change of changes ?? []) {
        const messages = change.value?.messages as any[] | undefined;
        for (const message of messages ?? []) {
          await handleIncomingMessage(message);
        }
      }
    }
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
  }
});

async function handleIncomingMessage(message: any) {
  const from: string = message.from;
  const type: string = message.type;

  if (type === "image") {
    // Comprobante de pago recibido
    await wa.sendText(
      from,
      "Recibimos tu comprobante de transferencia. Lo estamos verificando y te confirmamos en breve."
    );
    // TODO: notificar al admin por email/Slack
    return;
  }

  if (type === "text") {
    const text: string = message.text?.body?.toLowerCase() ?? "";

    if (text.includes("cancelar")) {
      await wa.sendText(
        from,
        "Para cancelar tu servicio, ingresá a tu cuenta en nuestra web o escribinos al soporte."
      );
      return;
    }

    if (text.includes("reprogramar")) {
      await wa.sendText(
        from,
        "Para reprogramar tu servicio, ingresá a Mis Órdenes en nuestra web."
      );
      return;
    }

    if (text.includes("soporte") || text.includes("hablar") || text.includes("ayuda")) {
      await wa.sendText(
        from,
        "Te estamos conectando con un agente. En breve te contactamos."
      );
      // TODO: notificar al admin (Slack/email)
      return;
    }

    // Intent no reconocido
    await wa.sendText(
      from,
      "Hola! Para ayudarte mejor, respondé con: 'cancelar', 'reprogramar' o 'soporte'."
    );
  }
}
