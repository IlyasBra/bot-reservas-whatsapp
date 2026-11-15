// Configuración del negocio. Para adaptar el bot a otro negocio solo hay que editar este archivo.
// "Barbería Nórdica" es un negocio FICTICIO creado para la demo.
// Los textos en español son la base; el bloque "en" (y los campos "en" de servicios y FAQ) los traduce al inglés.

export const negocio = {
  nombre: "Barbería Nórdica",
  direccion: "Calle del Ejemplo 12, Madrid",
  zonaHoraria: "Europe/Madrid",
  idioma: "es", // idioma por defecto: "es" o "en" (el cliente puede cambiarlo escribiendo "english" o "español")

  puestos: 2, // sillones: citas que pueden solaparse a la vez
  pasoMinutos: 30, // separación entre huecos ofrecidos
  antelacionMinutos: 30, // no se ofrecen huecos que empiecen en menos de este tiempo
  diasVista: 14, // cuántos días hacia delante se buscan huecos

  // Horario por día de la semana (0 = domingo). [hora de apertura, hora de cierre]. Sin entrada = cerrado.
  horario: {
    1: [10, 20],
    2: [10, 20],
    3: [10, 20],
    4: [10, 20],
    5: [10, 20],
    6: [10, 14],
  },
  horarioTexto: "Lunes a viernes: 10:00 a 20:00\nSábados: 10:00 a 14:00\nDomingos: cerrado",
  pagos: "Aceptamos tarjeta, Bizum y efectivo.",

  servicios: [
    { id: "corte", nombre: "Corte de pelo", en: "Haircut", minutos: 30, precio: 15 },
    { id: "barba", nombre: "Arreglo de barba", en: "Beard trim", minutos: 20, precio: 10 },
    { id: "corte_barba", nombre: "Corte + barba", en: "Haircut + beard", minutos: 45, precio: 22 },
  ],

  // Preguntas frecuentes. Las palabras clave se escriben en minúsculas y sin tildes.
  faq: [
    {
      palabras: ["precio", "cuesta", "tarifa", "cuanto", "coste"],
      respuesta:
        "Nuestras tarifas:\n• Corte de pelo: 15 €\n• Arreglo de barba: 10 €\n• Corte + barba: 22 €",
      en: {
        palabras: ["price", "prices", "cost", "how much", "rates"],
        respuesta: "Our prices:\n• Haircut: 15 €\n• Beard trim: 10 €\n• Haircut + beard: 22 €",
      },
    },
    {
      palabras: ["horario", "abierto", "abris", "abren", "cierran", "cierra", "a que hora"],
      respuesta: "Nuestro horario:\nLunes a viernes: 10:00 a 20:00\nSábados: 10:00 a 14:00\nDomingos: cerrado",
      en: {
        palabras: ["hours", "opening", "open", "close", "what time"],
        respuesta: "Our hours:\nMonday to Friday: 10:00 to 20:00\nSaturday: 10:00 to 14:00\nSunday: closed",
      },
    },
    {
      palabras: ["donde", "direccion", "ubicacion", "llegar", "calle"],
      respuesta: "Estamos en Calle del Ejemplo 12, Madrid.",
      en: {
        palabras: ["where", "address", "location", "directions", "find you"],
        respuesta: "We're at Calle del Ejemplo 12, Madrid.",
      },
    },
    {
      palabras: ["tarjeta", "bizum", "efectivo", "pagar", "pago"],
      respuesta: "Aceptamos tarjeta, Bizum y efectivo.",
      en: {
        palabras: ["card", "bizum", "cash", "pay", "payment"],
        respuesta: "We accept card, Bizum and cash.",
      },
    },
  ],

  en: {
    horarioTexto: "Monday to Friday: 10:00 to 20:00\nSaturday: 10:00 to 14:00\nSunday: closed",
    pagos: "We accept card, Bizum and cash.",
  },
};
