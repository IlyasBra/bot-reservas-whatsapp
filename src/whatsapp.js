// Envío de mensajes con la WhatsApp Cloud API de Meta.
// Si no hay credenciales en el entorno, escribe los mensajes en consola (modo local, sin coste).

const { WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_API_VERSION = "v23.0" } = process.env;

const recortar = (s, max) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

/** Convierte un mensaje interno (ver src/flow.js) en el cuerpo que espera la API. */
export function aPayload(para, msg) {
  const base = { messaging_product: "whatsapp", to: para };

  if (msg.tipo === "botones") {
    return {
      ...base,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: recortar(msg.texto, 1024) },
        action: {
          buttons: msg.botones.slice(0, 3).map((b) => ({
            type: "reply",
            reply: { id: b.id, title: recortar(b.titulo, 20) },
          })),
        },
      },
    };
  }

  if (msg.tipo === "lista") {
    return {
      ...base,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: recortar(msg.texto, 1024) },
        action: {
          button: recortar(msg.boton, 20),
          sections: [
            {
              title: "Opciones",
              rows: msg.filas.slice(0, 10).map((f) => ({
                id: f.id,
                title: recortar(f.titulo, 24),
                ...(f.descripcion ? { description: recortar(f.descripcion, 72) } : {}),
              })),
            },
          ],
        },
      },
    };
  }

  return { ...base, type: "text", text: { body: recortar(msg.texto, 4096) } };
}

export async function enviar(para, msg) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.log("[modo local] -> " + para + ": " + JSON.stringify(msg));
    return;
  }
  const url = "https://graph.facebook.com/" + WHATSAPP_API_VERSION + "/" + WHATSAPP_PHONE_NUMBER_ID + "/messages";
  const respuesta = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + WHATSAPP_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(aPayload(para, msg)),
  });
  if (!respuesta.ok) {
    throw new Error("WhatsApp API " + respuesta.status + ": " + (await respuesta.text()));
  }
}
