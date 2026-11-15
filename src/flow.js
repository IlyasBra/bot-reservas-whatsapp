// Lógica de la conversación. Es una función PURA: recibe el estado, lo que escribe el cliente
// y el contexto (hora actual, citas ya reservadas) y devuelve el nuevo estado y los mensajes.
// No depende de Node ni de WhatsApp, así que se puede probar fácilmente y la misma lógica
// funciona en el servidor, en la consola y en el simulador web.
//
// Mensajes de salida (formato interno, src/whatsapp.js los convierte al formato de la API):
//   { tipo: "texto",   texto }
//   { tipo: "botones", texto, botones: [{ id, titulo }] }            (máx. 3 botones)
//   { tipo: "lista",   texto, boton, filas: [{ id, titulo, descripcion? }] }  (máx. 10 filas)
//
// Idiomas: español ("es") e inglés ("en"). El idioma se guarda en el estado de la conversación.
// Se elige por este orden: el que ya tenga la conversación, el detectado en el primer mensaje
// (si está escrito en inglés), ctx.idioma y negocio.idioma. El cliente puede cambiarlo escribiendo
// "english" o "español".

import { negocio as negocioPorDefecto } from "./config.js";

const TEXTOS = {
  es: {
    dias: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    meses: [
      "enero", "febrero", "marzo", "abril", "mayo", "junio",
      "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ],
    fecha: (dia, n, mes) => dia + " " + n + " de " + mes,
    franjas: { man: "Mañana", tar: "Tarde", ult: "Última hora" },
    btnReservar: "Reservar cita",
    btnInfo: "Precios y horario",
    btnHumano: "Hablar con alguien",
    saludo: (n) => "¡Hola! Soy el asistente de " + n + ".",
    queHacer: "¿Qué quieres hacer?",
    servicios: "Servicios",
    horario: "Horario",
    quieresReservar: "¿Quieres reservar una cita?",
    derivar: (n) =>
      "De acuerdo, te atenderá una persona de " + n + ' por este mismo chat. Si quieres volver al asistente, escribe "menu".',
    queServicio: "¿Qué servicio necesitas?",
    verServicios: "Ver servicios",
    sinHuecos: 'Ahora mismo no tengo huecos libres en los próximos días. Escribe "persona" y te ayudamos.',
    otraCosa: "¿Quieres hacer otra cosa?",
    queDia: (s) => "Perfecto: " + s + ". ¿Qué día te viene bien?",
    verDias: "Ver días",
    huecos: (n) => n + (n === 1 ? " hueco libre" : " huecos libres"),
    cuando: "¿Cuándo prefieres?",
    huecosEl: (f) => "Huecos libres el " + f + ":",
    verHoras: "Ver horas",
    resumen: (s, f, h, n) =>
      "Resumen de tu cita:\n• " + s + "\n• " + f + " a las " + h + "\n• " + n + "\n\n¿Confirmo la reserva?",
    btnConfirmar: "Confirmar",
    btnCambiar: "Cambiar",
    btnCancelar: "Cancelar",
    ocupado: "Vaya, ese hueco se acaba de ocupar. Elige otro, por favor.",
    reservado: (nombre, f, h, n, dir) =>
      "✅ ¡Reservado" + nombre + "! Te esperamos el " + f + " a las " + h + " en " + n + " (" + dir +
      ').\n\nPara cancelarla escribe "cancelar cita"; para cambiarla, escribe "persona".',
    noPasa: "Vale, no pasa nada.",
    loDejamos: "Vale, lo dejamos aquí.",
    noEntiendo: "No estoy seguro de haberte entendido.",
    idiomaCambiado: "Perfecto, seguimos en español.",
    miCita: (s, f, h) => "Tu próxima cita:\n• " + s + "\n• " + f + " a las " + h + "\n\n¿Quieres cancelarla?",
    sinCitas: "No tienes ninguna cita próxima con este número.",
    btnAnular: "Cancelar cita",
    btnMantener: "Mantenerla",
    cancelada: (f, h) => "Hecho, tu cita del " + f + " a las " + h + " queda cancelada. ¡Gracias por avisar!",
    mantenida: "Perfecto, tu cita sigue en pie.",
    algoMas: "¿Quieres hacer algo más?",
  },
  en: {
    dias: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    meses: [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ],
    fecha: (dia, n, mes) => dia + ", " + mes + " " + n,
    franjas: { man: "Morning", tar: "Afternoon", ult: "Evening" },
    btnReservar: "Book appointment",
    btnInfo: "Prices & hours",
    btnHumano: "Talk to someone",
    saludo: (n) => "Hi! I'm the assistant of " + n + ".",
    queHacer: "What would you like to do?",
    servicios: "Services",
    horario: "Hours",
    quieresReservar: "Would you like to book an appointment?",
    derivar: (n) =>
      "Okay, a person from " + n + ' will help you in this same chat. To go back to the assistant, type "menu".',
    queServicio: "Which service do you need?",
    verServicios: "See services",
    sinHuecos: 'I have no free slots in the coming days right now. Type "person" and we\'ll help you.',
    otraCosa: "Would you like to do something else?",
    queDia: (s) => "Great: " + s + ". Which day works for you?",
    verDias: "See days",
    huecos: (n) => n + (n === 1 ? " free slot" : " free slots"),
    cuando: "When do you prefer?",
    huecosEl: (f) => "Free slots on " + f + ":",
    verHoras: "See times",
    resumen: (s, f, h, n) =>
      "Your appointment:\n• " + s + "\n• " + f + " at " + h + "\n• " + n + "\n\nShall I confirm the booking?",
    btnConfirmar: "Confirm",
    btnCambiar: "Change",
    btnCancelar: "Cancel",
    ocupado: "Sorry, that slot was just taken. Please pick another one.",
    reservado: (nombre, f, h, n, dir) =>
      "✅ Booked" + nombre + "! See you on " + f + " at " + h + " at " + n + " (" + dir +
      ').\n\nTo cancel it, type "cancel appointment"; to change it, type "person".',
    noPasa: "No problem.",
    loDejamos: "Okay, let's leave it here.",
    noEntiendo: "I'm not sure I understood you.",
    idiomaCambiado: "Sure, let's continue in English.",
    miCita: (s, f, h) => "Your next appointment:\n• " + s + "\n• " + f + " at " + h + "\n\nWould you like to cancel it?",
    sinCitas: "You have no upcoming appointments with this number.",
    btnAnular: "Cancel appointment",
    btnMantener: "Keep it",
    cancelada: (f, h) => "Done, your appointment on " + f + " at " + h + " is cancelled. Thanks for letting us know!",
    mantenida: "Great, your appointment stays as it is.",
    algoMas: "Would you like to do anything else?",
  },
};

const FRANJAS = {
  man: { desde: 0, hasta: 13 * 60 },
  tar: { desde: 13 * 60, hasta: 17 * 60 },
  ult: { desde: 17 * 60, hasta: 24 * 60 },
};
const MAX_FILAS = 10;

// Palabras clave de las intenciones (en minúsculas y sin tildes), en español e inglés.
const CANCELAR = ["cancel", "salir", "exit"];
const PERSONA = ["person", "human", "agent", "llamar", "hablar con", "speak to", "speak with", "talk to", "call me"];
const RESERVA = ["cita", "reserv", "hueco", "turno", "cortar", "book", "appointment", "slot", "haircut"];
const SALUDO = ["hola", "buenas", "buenos", "menu", "inicio", "ayuda", "hello", "hey", "good morning", "good evening", "help", "start"];
const PIDE_INGLES = ["english", "ingles"];
const PIDE_ESPANOL = ["espanol", "spanish", "castellano"];
const MI_CITA = ["mi cita", "mis citas", "cancelar cita", "anular", "cancel appointment", "cancel booking", "cancel my", "my appointment", "my booking"];
const PARECE_INGLES =
  /\b(hello|hi|hey|book|appointment|price|prices|cost|how much|hours|open|where|address|haircut|beard|please|do you|can i|i want|i would|good morning|good evening|english)\b/;

// ---------- utilidades de fecha y texto ----------

const pad = (n) => String(n).padStart(2, "0");
const aIso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const aHora = (min) => pad(Math.floor(min / 60)) + ":" + pad(min % 60);
const deIso = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};
const fechaLarga = (iso, l) => {
  const d = deIso(iso);
  return l.fecha(l.dias[d.getDay()], d.getDate(), l.meses[d.getMonth()]);
};
const fechaCorta = (iso, l) => {
  const d = deIso(iso);
  return l.dias[d.getDay()].slice(0, 3) + " " + d.getDate() + " " + l.meses[d.getMonth()].slice(0, 3);
};
const esFecha = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s ?? "");
const normalizar = (t) =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const contiene = (t, palabras) => palabras.some((p) => t.includes(p));

// Texto del negocio en el idioma del cliente (con el español como base).
const campo = (c, clave) => (c.idioma !== "es" && c.negocio[c.idioma]?.[clave]) || c.negocio[clave];
const nombreServicio = (s, c) => (c.idioma !== "es" && s[c.idioma]) || s.nombre;

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

const menuMsg = (texto, l) =>
  btns(texto, [
    { id: "reservar", titulo: l.btnReservar },
    { id: "info", titulo: l.btnInfo },
    { id: "humano", titulo: l.btnHumano },
  ]);

export const estadoInicial = (idioma) => (idioma ? { paso: "inicio", idioma } : { paso: "inicio" });

const buscarServicio = (c, id) => c.negocio.servicios.find((s) => s.id === id);

// ---------- pasos de la conversación ----------

function irAlMenu(c, intro) {
  const l = c.l;
  return { estado: estadoInicial(), mensajes: [menuMsg((intro ?? l.saludo(c.negocio.nombre)) + " " + l.queHacer, l)] };
}

function info(c) {
  const n = c.negocio;
  const l = c.l;
  const servicios = n.servicios
    .map((s) => "• " + nombreServicio(s, c) + " (" + s.minutos + " min): " + s.precio + " €")
    .join("\n");
  const texto =
    "*" + n.nombre + "*\n📍 " + n.direccion + "\n\n*" + l.servicios + "*\n" + servicios +
    "\n\n*" + l.horario + "*\n" + campo(c, "horarioTexto") + "\n\n" + campo(c, "pagos");
  return { estado: estadoInicial(), mensajes: [txt(texto), menuMsg(l.quieresReservar, l)] };
}

function derivar(c) {
  return { estado: { paso: "humano" }, mensajes: [txt(c.l.derivar(c.negocio.nombre))] };
}

// Próxima cita (aún no pasada) de quien escribe, identificado por su teléfono.
function proximaCita(c) {
  if (!c.telefono) return undefined;
  const hoy = aIso(c.ahora);
  const ahoraMin = c.ahora.getHours() * 60 + c.ahora.getMinutes();
  return c.citas
    .filter((x) => x.telefono === c.telefono && (x.fecha > hoy || (x.fecha === hoy && x.min + x.minutos > ahoraMin)))
    .sort((a, b) => (a.fecha === b.fecha ? a.min - b.min : a.fecha < b.fecha ? -1 : 1))[0];
}

function miCita(c) {
  const l = c.l;
  const cita = proximaCita(c);
  if (!cita) return { estado: estadoInicial(), mensajes: [txt(l.sinCitas), menuMsg(l.queHacer, l)] };
  const servicio = buscarServicio(c, cita.servicio);
  const detalle = servicio ? nombreServicio(servicio, c) : cita.servicio;
  return {
    estado: { paso: "anular", fecha: cita.fecha, min: cita.min },
    mensajes: [
      btns(l.miCita(detalle, fechaLarga(cita.fecha, l), aHora(cita.min)), [
        { id: "anular", titulo: l.btnAnular },
        { id: "mantener", titulo: l.btnMantener },
      ]),
    ],
  };
}

// Solo se puede cancelar una cita del propio teléfono y que se haya mostrado antes (paso "anular").
function anular(estado, c) {
  const cita =
    estado.paso === "anular" && c.telefono
      ? c.citas.find((x) => x.telefono === c.telefono && x.fecha === estado.fecha && x.min === estado.min)
      : undefined;
  if (!cita) return irAlMenu(c);
  return {
    estado: estadoInicial(),
    cancelarCita: { fecha: cita.fecha, min: cita.min, telefono: cita.telefono },
    mensajes: [txt(c.l.cancelada(fechaLarga(cita.fecha, c.l), aHora(cita.min)))],
  };
}

function pedirServicio(c) {
  const filas = c.negocio.servicios.map((s) => ({
    id: "srv:" + s.id,
    titulo: nombreServicio(s, c),
    descripcion: s.minutos + " min · " + s.precio + " €",
  }));
  return { estado: { paso: "servicio" }, mensajes: [lst(c.l.queServicio, c.l.verServicios, filas)] };
}

function pedirDia(c, servicio) {
  const l = c.l;
  const dias = diasConHuecos(servicio, c, 7);
  if (dias.length === 0) {
    return { estado: estadoInicial(), mensajes: [txt(l.sinHuecos), menuMsg(l.otraCosa, l)] };
  }
  const filas = dias.map((d) => ({
    id: "dia:" + d.iso,
    titulo: fechaCorta(d.iso, l),
    descripcion: l.huecos(d.n),
  }));
  return {
    estado: { paso: "dia", servicio: servicio.id },
    mensajes: [lst(l.queDia(nombreServicio(servicio, c)), l.verDias, filas)],
  };
}

function pedirHora(estado, c, servicio, fecha, franja) {
  const l = c.l;
  let huecos = huecosDelDia(fecha, servicio, c);
  if (huecos.length === 0) return pedirDia(c, servicio);

  // Una lista admite 10 filas como máximo: si hay más huecos, se pregunta primero la franja.
  if (!franja && huecos.length > MAX_FILAS) {
    const botones = Object.entries(FRANJAS)
      .filter(([, f]) => huecos.some((h) => h >= f.desde && h < f.hasta))
      .map(([id]) => ({ id: "fr:" + id, titulo: l.franjas[id] }));
    return {
      estado: { ...estado, paso: "franja", servicio: servicio.id, fecha },
      mensajes: [btns(fechaLarga(fecha, l) + ". " + l.cuando, botones)],
    };
  }
  if (franja) {
    const f = FRANJAS[franja];
    huecos = huecos.filter((h) => h >= f.desde && h < f.hasta);
  }
  const filas = huecos.slice(0, MAX_FILAS).map((h) => ({ id: "hora:" + h, titulo: aHora(h) }));
  return {
    estado: { ...estado, paso: "hora", servicio: servicio.id, fecha },
    mensajes: [lst(l.huecosEl(fechaLarga(fecha, l)), l.verHoras, filas)],
  };
}

function pedirConfirmacion(estado, c, servicio, fecha, min) {
  const l = c.l;
  const detalle = nombreServicio(servicio, c) + " (" + servicio.minutos + " min, " + servicio.precio + " €)";
  return {
    estado: { ...estado, paso: "confirmar", servicio: servicio.id, fecha, min },
    mensajes: [
      btns(l.resumen(detalle, fechaLarga(fecha, l), aHora(min), c.negocio.nombre), [
        { id: "ok", titulo: l.btnConfirmar },
        { id: "cambiar", titulo: l.btnCambiar },
        { id: "no", titulo: l.btnCancelar },
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
    r.mensajes.unshift(txt(c.l.ocupado));
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
        c.l.reservado(
          primerNombre,
          fechaLarga(estado.fecha, c.l),
          aHora(estado.min),
          c.negocio.nombre,
          c.negocio.direccion,
        ),
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
    case "anular":
      return anular(estado, c);
    case "mantener":
      return irAlMenu(c, c.l.mantenida);
    case "no":
      return irAlMenu(c, c.l.noPasa);
    default:
      return irAlMenu(c);
  }
}

/**
 * @param {object} estado  Estado de la conversación (empezar con estadoInicial()).
 * @param {{tipo:"texto",texto:string}|{tipo:"boton",id:string}} entrada
 * @param {object} [ctx]   { ahora, citas, negocio, nombre, telefono, idioma }
 * @returns {{estado:object, mensajes:object[], nuevaCita?:object, cancelarCita?:object}}
 */
export function responder(estado, entrada, ctx = {}) {
  const base = { ahora: new Date(), citas: [], negocio: negocioPorDefecto, nombre: "", telefono: "", ...ctx };
  const est = estado ?? estadoInicial();
  const t = entrada.tipo === "boton" ? "" : normalizar(entrada.texto ?? "");

  // Con una persona al mando, el bot guarda silencio salvo que el cliente pida volver.
  if (est.paso === "humano" && entrada.tipo !== "boton" && !contiene(t, ["menu", "bot"])) {
    return { estado: est, mensajes: [] };
  }

  let idioma = est.idioma ?? (PARECE_INGLES.test(t) ? "en" : undefined) ?? base.idioma ?? base.negocio.idioma ?? "es";
  const pideInglesOEspanol = contiene(t, PIDE_INGLES) ? "en" : contiene(t, PIDE_ESPANOL) ? "es" : null;
  if (pideInglesOEspanol) idioma = pideInglesOEspanol;
  if (!TEXTOS[idioma]) idioma = "es";

  const c = { ...base, idioma, l: TEXTOS[idioma] };
  const con = (r) => ({ ...r, estado: { ...r.estado, idioma } });

  if (entrada.tipo === "boton") return con(porId(est, entrada.id, c));
  if (pideInglesOEspanol) return con(irAlMenu(c, c.l.idiomaCambiado));

  if (contiene(t, MI_CITA)) return con(miCita(c));
  if (contiene(t, CANCELAR)) return con(irAlMenu(c, c.l.loDejamos));
  if (contiene(t, PERSONA)) return con(derivar(c));

  const faq = c.negocio.faq.find((f) => contiene(t, [...f.palabras, ...(f.en?.palabras ?? [])]));
  if (faq) {
    const respuesta = (idioma !== "es" && faq[idioma]?.respuesta) || faq.respuesta;
    return con({ estado: estadoInicial(), mensajes: [txt(respuesta), menuMsg(c.l.algoMas, c.l)] });
  }

  if (contiene(t, RESERVA)) return con(pedirServicio(c));
  if (contiene(t, SALUDO) || t.split(/\W+/).includes("hi")) return con(irAlMenu(c));
  return con(irAlMenu(c, c.l.noEntiendo));
}
