// Lógica de la conversación. Es una función PURA: recibe el estado, lo que escribe el cliente
// y el contexto (hora actual, citas ya reservadas) y devuelve el nuevo estado y los mensajes.
// No depende de Node ni de WhatsApp, así que se puede probar fácilmente y la misma lógica
// funciona en el servidor, en la consola y en el simulador web.
//
// Mensajes de salida (formato interno, src/whatsapp.js los convierte al formato de la API):
//   { tipo: "texto",   texto }
//   { tipo: "botones", texto, botones: [{ id, titulo }] }            (máx. 3 botones)
//   { tipo: "lista",   texto, boton, filas: [{ id, titulo, descripcion? }] }  (máx. 10 filas)

import { negocio as negocioPorDefecto } from "./config.js";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const FRANJAS = {
  man: { nombre: "Mañana", desde: 0, hasta: 13 * 60 },
  tar: { nombre: "Tarde", desde: 13 * 60, hasta: 17 * 60 },
  ult: { nombre: "Última hora", desde: 17 * 60, hasta: 24 * 60 },
};
const MAX_FILAS = 10;

// ---------- utilidades de fecha y texto ----------

const pad = (n) => String(n).padStart(2, "0");
const aIso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const aHora = (min) => pad(Math.floor(min / 60)) + ":" + pad(min % 60);
const deIso = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
const fechaLarga = (iso) => {
  const d = deIso(iso);
  return DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()];
};
const fechaCorta = (iso) => {
  const d = deIso(iso);
  return DIAS[d.getDay()].slice(0, 3) + " " + d.getDate() + " " + MESES[d.getMonth()].slice(0, 3);
};
const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");
const normalizar = (t) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const contiene = (t, palabras) => palabras.some((p) => t.includes(p));

// ---------- disponibilidad ----------

/** Minutos desde medianoche de los huecos libres de un día para un servicio. */
export function huecosDelDia(iso, servicio, ctx) {
  const { ahora, citas, negocio } = ctx;
  const franja = negocio.horario[deIso(iso).getDay()];
  if (!franja) return [];
  const hoy = aIso(ahora);
  if (iso < hoy) return [];
  const limite = ahora.getHours() * 60 + ahora.getMinutes() + negocio.antelacionMinutos;
  const [abre, cierra] = franja;
  const huecos = [];
  for (let min = abre * 60; min + servicio.minutos <= cierra * 60; min += negocio.pasoMinutos) {
    if (iso === hoy && min < limite) continue;
    const ocupados = citas.filter(
      (c) => c.fecha === iso && c.min < min + servicio.minutos && min < c.min + c.minutos,
    ).length;
    if (ocupados < negocio.puestos) huecos.push(min);
  }
  return huecos;
}

function diasConHuecos(servicio, ctx, max) {
  const dias = [];
  for (let i = 0; i < ctx.negocio.diasVista && dias.length < max; i++) {
    const d = new Date(ctx.ahora.getFullYear(), ctx.ahora.getMonth(), ctx.ahora.getDate() + i, 12);
    const iso = aIso(d);
    const n = huecosDelDia(iso, servicio, ctx).length;
    if (n > 0) dias.push({ iso, n });
  }
  return dias;
}

// ---------- constructores de mensajes ----------

const txt = (texto) => ({ tipo: "texto", texto });
const btns = (texto, botones) => ({ tipo: "botones", texto, botones });
const lst = (texto, boton, filas) => ({ tipo: "lista", texto, boton, filas });

const menuMsg = (texto) =>
  btns(texto, [
    { id: "reservar", titulo: "Reservar cita" },
    { id: "info", titulo: "Precios y horario" },
    { id: "humano", titulo: "Hablar con alguien" },
  ]);

export const estadoInicial = () => ({ paso: "inicio" });

const buscarServicio = (c, id) => c.negocio.servicios.find((s) => s.id === id);

// ---------- pasos de la conversación ----------

function irAlMenu(c, intro) {
  const saludo = "¡Hola! Soy el asistente de " + c.negocio.nombre + ".";
  return { estado: estadoInicial(), mensajes: [menuMsg((intro ?? saludo) + " ¿Qué quieres hacer?")] };
}

function info(c) {
  const n = c.negocio;
  const servicios = n.servicios.map((s) => "• " + s.nombre + " (" + s.minutos + " min): " + s.precio + " €").join("\n");
  const texto =
    "*" + n.nombre + "*\n📍 " + n.direccion + "\n\n*Servicios*\n" + servicios +
    "\n\n*Horario*\n" + n.horarioTexto + "\n\n" + n.pagos;
  return { estado: estadoInicial(), mensajes: [txt(texto), menuMsg("¿Quieres reservar una cita?")] };
}

function derivar(c) {
  return {
    estado: { paso: "humano" },
    mensajes: [
      txt(
        "De acuerdo, te atenderá una persona de " + c.negocio.nombre +
          ' por este mismo chat. Si quieres volver al asistente, escribe "menu".',
      ),
    ],
  };
}

function pedirServicio(c) {
  const filas = c.negocio.servicios.map((s) => ({
    id: "srv:" + s.id,
    titulo: s.nombre,
    descripcion: s.minutos + " min · " + s.precio + " €",
  }));
  return { estado: { paso: "servicio" }, mensajes: [lst("¿Qué servicio necesitas?", "Ver servicios", filas)] };
}

function pedirDia(c, servicio) {
  const dias = diasConHuecos(servicio, c, 7);
  if (dias.length === 0) {
    return {
      estado: estadoInicial(),
      mensajes: [
        txt("Ahora mismo no tengo huecos libres en los próximos días. Escribe \"persona\" y te ayudamos."),
        menuMsg("¿Quieres hacer otra cosa?"),
      ],
    };
  }
  const filas = dias.map((d) => ({
    id: "dia:" + d.iso,
    titulo: fechaCorta(d.iso),
    descripcion: d.n + (d.n === 1 ? " hueco libre" : " huecos libres"),
  }));
  return {
    estado: { paso: "dia", servicio: servicio.id },
    mensajes: [lst("Perfecto: " + servicio.nombre + ". ¿Qué día te viene bien?", "Ver días", filas)],
  };
}

function pedirHora(estado, c, servicio, fecha, franja) {
  let huecos = huecosDelDia(fecha, servicio, c);
  if (huecos.length === 0) return pedirDia(c, servicio);

  // Una lista admite 10 filas como máximo: si hay más huecos, se pregunta primero la franja.
  if (!franja && huecos.length > MAX_FILAS) {
    const botones = Object.entries(FRANJAS)
      .filter(([, f]) => huecos.some((h) => h >= f.desde && h < f.hasta))
      .map(([id, f]) => ({ id: "fr:" + id, titulo: f.nombre }));
    return {
      estado: { ...estado, paso: "franja", servicio: servicio.id, fecha },
      mensajes: [btns(fechaLarga(fecha) + ". ¿Cuándo prefieres?", botones)],
    };
  }
  if (franja) {
    const f = FRANJAS[franja];
    huecos = huecos.filter((h) => h >= f.desde && h < f.hasta);
  }
  const filas = huecos.slice(0, MAX_FILAS).map((h) => ({ id: "hora:" + h, titulo: aHora(h) }));
  return {
    estado: { ...estado, paso: "hora", servicio: servicio.id, fecha },
    mensajes: [lst("Huecos libres el " + fechaLarga(fecha) + ":", "Ver horas", filas)],
  };
}

function pedirConfirmacion(estado, c, servicio, fecha, min) {
  const texto =
    "Resumen de tu cita:\n• " + servicio.nombre + " (" + servicio.minutos + " min, " + servicio.precio + " €)\n• " +
    fechaLarga(fecha) + " a las " + aHora(min) + "\n• " + c.negocio.nombre + "\n\n¿Confirmo la reserva?";
  return {
    estado: { ...estado, paso: "confirmar", servicio: servicio.id, fecha, min },
    mensajes: [
      btns(texto, [
        { id: "ok", titulo: "Confirmar" },
        { id: "cambiar", titulo: "Cambiar" },
        { id: "no", titulo: "Cancelar" },
      ]),
    ],
  };
}

function confirmar(estado, c) {
  const servicio = buscarServicio(c, estado.servicio);
  if (!servicio || !esFecha(estado.fecha) || !Number.isInteger(estado.min)) return pedirServicio(c);

  // Se vuelve a comprobar el hueco por si alguien lo ha reservado mientras tanto.
  if (!huecosDelDia(estado.fecha, servicio, c).includes(estado.min)) {
    const r = pedirHora(estado, c, servicio, estado.fecha);
    r.mensajes.unshift(txt("Vaya, ese hueco se acaba de ocupar. Elige otro, por favor."));
    return r;
  }
  const nuevaCita = {
    servicio: servicio.id,
    fecha: estado.fecha,
    min: estado.min,
    minutos: servicio.minutos,
    telefono: c.telefono,
    nombre: c.nombre,
  };
  const primerNombre = c.nombre ? ", " + c.nombre.split(" ")[0] : "";
  return {
    estado: estadoInicial(),
    nuevaCita,
    mensajes: [
      txt(
        "✅ ¡Reservado" + primerNombre + "! Te esperamos el " + fechaLarga(estado.fecha) + " a las " +
          aHora(estado.min) + " en " + c.negocio.nombre + " (" + c.negocio.direccion + ').\n\nSi necesitas cambiarla, escribe "persona" y te atendemos.',
      ),
    ],
  };
}

// Respuestas a botones y listas: el id indica la acción.
function porId(estado, id, c) {
  const [tipo, valor] = id.split(":");
  const servicio = buscarServicio(c, tipo === "srv" ? valor : estado.servicio);
  switch (tipo) {
    case "reservar":
    case "cambiar":
      return pedirServicio(c);
    case "info":
      return info(c);
    case "humano":
      return derivar(c);
    case "srv":
      return servicio ? pedirDia(c, servicio) : pedirServicio(c);
    case "dia":
      return servicio && esFecha(valor) ? pedirHora(estado, c, servicio, valor) : pedirServicio(c);
    case "fr":
      return servicio && esFecha(estado.fecha) && FRANJAS[valor]
        ? pedirHora(estado, c, servicio, estado.fecha, valor)
        : pedirServicio(c);
    case "hora": {
      const min = Number(valor);
      return servicio && esFecha(estado.fecha) && Number.isInteger(min)
        ? pedirConfirmacion(estado, c, servicio, estado.fecha, min)
        : pedirServicio(c);
    }
    case "ok":
      return confirmar(estado, c);
    case "no":
      return irAlMenu(c, "Vale, no pasa nada.");
    default:
      return irAlMenu(c);
  }
}

/**
 * @param {object} estado  Estado de la conversación (empezar con estadoInicial()).
 * @param {{tipo:"texto",texto:string}|{tipo:"boton",id:string}} entrada
 * @param {object} [ctx]   { ahora, citas, negocio, nombre, telefono }
 * @returns {{estado:object, mensajes:object[], nuevaCita?:object}}
 */
export function responder(estado, entrada, ctx = {}) {
  const c = { ahora: new Date(), citas: [], negocio: negocioPorDefecto, nombre: "", telefono: "", ...ctx };
  const est = estado ?? estadoInicial();

  if (entrada.tipo === "boton") return porId(est, entrada.id, c);

  const t = normalizar(entrada.texto ?? "");
  // Con una persona al mando, el bot guarda silencio salvo que el cliente pida volver.
  if (est.paso === "humano" && !contiene(t, ["menu", "bot"])) return { estado: est, mensajes: [] };

  if (contiene(t, ["cancelar", "salir"])) return irAlMenu(c, "Vale, lo dejamos aquí.");
  if (contiene(t, ["persona", "humano", "agente", "llamar", "hablar con"])) return derivar(c);

  const faq = c.negocio.faq.find((f) => contiene(t, f.palabras));
  if (faq) return { estado: estadoInicial(), mensajes: [txt(faq.respuesta), menuMsg("¿Quieres hacer algo más?")] };

  if (contiene(t, ["cita", "reserv", "hueco", "turno", "cortar"])) return pedirServicio(c);
  if (contiene(t, ["hola", "buenas", "buenos", "menu", "inicio", "ayuda"])) return irAlMenu(c);
  return irAlMenu(c, "No estoy seguro de haberte entendido.");
}
