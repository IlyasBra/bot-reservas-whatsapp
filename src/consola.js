// Chat de prueba en la terminal: usa exactamente la misma lógica que el bot de WhatsApp.
// No necesita cuenta de Meta ni claves. Ejecutar con: npm run chat

import readline from "node:readline";
import { stdin, stdout } from "node:process";
import { responder, estadoInicial } from "./flow.js";

const citas = [];
let estado = estadoInicial();
let opciones = [];

function mostrar(msg) {
  console.log("\n\x1b[32mBot:\x1b[0m " + msg.texto);
  if (msg.tipo === "botones") opciones = msg.botones;
  if (msg.tipo === "lista") opciones = msg.filas;
  if (msg.tipo !== "texto") {
    opciones.forEach((o, i) =>
      console.log("  " + (i + 1) + ". " + o.titulo + (o.descripcion ? " (" + o.descripcion + ")" : "")),
    );
  }
}

function turno(entrada) {
  const r = responder(estado, entrada, { citas, nombre: "Alex", telefono: "34600000000" });
  estado = r.estado;
  if (r.nuevaCita) citas.push(r.nuevaCita);
  if (r.cancelarCita) {
    const i = citas.findIndex((c) => c.fecha === r.cancelarCita.fecha && c.min === r.cancelarCita.min);
    if (i >= 0) citas.splice(i, 1);
  }
  opciones = [];
  r.mensajes.forEach(mostrar);
  stdout.write("\n> ");
}

console.log('Chat de prueba. Escribe un mensaje o el número de una opción. "salir" para terminar.');
turno({ tipo: "texto", texto: "hola" });

const rl = readline.createInterface({ input: stdin });
for await (const linea of rl) {
  const texto = linea.trim();
  if (texto.toLowerCase() === "salir") break;
  const elegida = /^\d+$/.test(texto) ? opciones[Number(texto) - 1] : undefined;
  turno(elegida ? { tipo: "boton", id: elegida.id } : { tipo: "texto", texto });
}
rl.close();
console.log("\nCitas reservadas en esta sesión: " + citas.length);
