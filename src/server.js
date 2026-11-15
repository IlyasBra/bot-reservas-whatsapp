// Servidor del webhook de WhatsApp. Sin dependencias: solo módulos de Node.

import http from "node:http";
import crypto from "node:crypto";
import { negocio } from "./config.js";
import { responder, estadoInicial } from "./flow.js";
import { enviar } from "./whatsapp.js";
import { sesiones, citas, yaProcesado, agregarCita, quitarCita } from "./store.js";

process.env.TZ ??= negocio.zonaHoraria;
const { VERIFY_TOKEN, APP_SECRET, ADMIN_TOKEN, PORT = 3000 } = process.env;

function extraerEntrada(m) {
  if (m.type === "text") return { tipo: "texto", texto: m.text?.body ?? "" };
  if (m.type === "interactive") {
    const r = m.interactive?.button_reply ?? m.interactive?.list_reply;
    if (r) return { tipo: "boton", id: r.id };
  }
  return { tipo: "texto", texto: "" }; // audios, imágenes, etc.: se responde con el menú
}

async function procesar(cuerpo) {
  for (const entrada of cuerpo.entry ?? []) {
    for (const cambio of entrada.changes ?? []) {
      const valor = cambio.value ?? {};
      const nombres = new Map((valor.contacts ?? []).map((c) => [c.wa_id, c.profile?.name ?? ""]));
      for (const m of valor.messages ?? []) {
        if (yaProcesado(m.id)) continue;
        const estado = sesiones.get(m.from) ?? estadoInicial();
        const r = responder(estado, extraerEntrada(m), {
          citas,
          nombre: nombres.get(m.from) ?? "",
          telefono: m.from,
        });
        sesiones.set(m.from, r.estado);
        if (r.nuevaCita) {
          agregarCita(r.nuevaCita);
          console.log("[cita] " + r.nuevaCita.fecha + " " + r.nuevaCita.min + " min - " + r.nuevaCita.servicio);
        }
        if (r.cancelarCita && quitarCita(r.cancelarCita)) {
          console.log("[cancelación] " + r.cancelarCita.fecha + " " + r.cancelarCita.min + " min");
        }
        if (r.estado.paso === "humano" && estado.paso !== "humano") {
          console.log("[derivación] un cliente pide atención humana");
        }
        for (const msg of r.mensajes) await enviar(m.from, msg);
      }
    }
  }
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    const trozos = [];
    req.on("data", (t) => trozos.push(t));
    req.on("end", () => resolve(Buffer.concat(trozos)));
    req.on("error", reject);
  });
}

function firmaValida(cuerpo, firma) {
  const esperada = "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(cuerpo).digest("hex");
  const a = Buffer.from(esperada);
  const b = Buffer.from(firma ?? "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Acceso del negocio a su agenda: cabecera "Authorization: Bearer <ADMIN_TOKEN>". Sin ADMIN_TOKEN, desactivado.
function esAdmin(req) {
  if (!ADMIN_TOKEN) return false;
  const a = Buffer.from(req.headers.authorization ?? "");
  const b = Buffer.from("Bearer " + ADMIN_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const fin = (res, codigo, texto = "") => {
  res.writeHead(codigo, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(texto);
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/health") return fin(res, 200, "ok");
    if (url.pathname === "/citas" && req.method === "GET") {
      if (!esAdmin(req)) return fin(res, 401);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(citas));
    }
    if (url.pathname !== "/webhook") return fin(res, 404);

    // Verificación inicial del webhook por parte de Meta
    if (req.method === "GET") {
      const valido =
        url.searchParams.get("hub.mode") === "subscribe" &&
        VERIFY_TOKEN &&
        url.searchParams.get("hub.verify_token") === VERIFY_TOKEN;
      return valido ? fin(res, 200, url.searchParams.get("hub.challenge") ?? "") : fin(res, 403);
    }

    if (req.method === "POST") {
      const cuerpo = await leerCuerpo(req);
      if (APP_SECRET && !firmaValida(cuerpo, req.headers["x-hub-signature-256"])) return fin(res, 401);
      fin(res, 200); // Meta exige responder en menos de 10 segundos: se contesta antes de procesar
      try {
        await procesar(JSON.parse(cuerpo.toString("utf8")));
      } catch (error) {
        console.error("Error procesando el webhook:", error);
      }
      return;
    }
    fin(res, 405);
  })
  .listen(PORT, () => {
    console.log("Bot de " + negocio.nombre + " escuchando en http://localhost:" + PORT + "/webhook");
    if (!APP_SECRET) console.warn("Aviso: APP_SECRET no definido, no se comprueba la firma de Meta.");
  });
