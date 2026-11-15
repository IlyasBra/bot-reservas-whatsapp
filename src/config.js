// Configuración del negocio. Para adaptar el bot a otro negocio solo hay que editar este archivo.
// "Barbería Nórdica" es un negocio FICTICIO creado para la demo.

export const negocio = {
  nombre: "Barbería Nórdica",
  direccion: "Calle del Ejemplo 12, Madrid",
  zonaHoraria: "Europe/Madrid",

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

  servicios: [
    { id: "corte", nombre: "Corte de pelo", minutos: 30, precio: 15 },
    { id: "barba", nombre: "Arreglo de barba", minutos: 20, precio: 10 },
    { id: "corte_barba", nombre: "Corte + barba", minutos: 45, precio: 22 },
  ],

  pagos: "Aceptamos tarjeta, Bizum y efectivo.",

  // Preguntas frecuentes. Las palabras clave se escriben en minúsculas y sin tildes.
  faq: [
    {
      palabras: ["precio", "cuesta", "tarifa", "cuanto", "coste"],
      respuesta:
        "Nuestras tarifas:\n• Corte de pelo: 15 €\n• Arreglo de barba: 10 €\n• Corte + barba: 22 €",
    },
    {
      palabras: ["horario", "abierto", "abris", "abren", "cierran", "cierra", "a que hora"],
      respuesta: "Nuestro horario:\nLunes a viernes: 10:00 a 20:00\nSábados: 10:00 a 14:00\nDomingos: cerrado",
    },
    {
      palabras: ["donde", "direccion", "ubicacion", "llegar", "calle"],
      respuesta: "Estamos en Calle del Ejemplo 12, Madrid.",
    },
    {
      palabras: ["tarjeta", "bizum", "efectivo", "pagar", "pago"],
      respuesta: "Aceptamos tarjeta, Bizum y efectivo.",
    },
  ],
};
