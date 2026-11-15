// Almacenamiento de las citas en un archivo JSON (sin dependencias), suficiente para un negocio pequeño.
// Las citas sobreviven a los reinicios. Las sesiones de conversación se guardan en memoria: si el servidor
// se reinicia, el cliente simplemente vuelve al menú. Para varios negocios o más volumen, sustituir por
// una base de datos (ver "Estado y siguientes pasos" en el README).
//
// DATA_FILE: ruta del archivo (por defecto data/citas.json). Vacío = solo en memoria.

import fs from "node:fs";
import path from "node:path";

const ARCHIVO = process.env.DATA_FILE ?? "data/citas.json";

function cargar() {
  if (!ARCHIVO) return [];
  try {
    const datos = JSON.parse(fs.readFileSync(ARCHIVO, "utf8"));
    return Array.isArray(datos) ? datos : [];
  } catch {
    return []; // el archivo aún no existe o no se puede leer
  }
}

function guardar() {
  if (!ARCHIVO) return;
  try {
    fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
    const temporal = ARCHIVO + ".tmp";
    fs.writeFileSync(temporal, JSON.stringify(citas, null, 2));
    fs.renameSync(temporal, ARCHIVO); // escritura atómica: nunca queda un archivo a medias
  } catch (error) {
    console.error("No se pudieron guardar las citas:", error.message);
  }
}

export const sesiones = new Map(); // teléfono -> estado de la conversación
export const citas = cargar();

export function agregarCita(cita) {
  citas.push(cita);
  guardar();
}

/** Elimina una cita (misma fecha, hora y teléfono). Devuelve true si existía. */
export function quitarCita({ fecha, min, telefono }) {
  const i = citas.findIndex((c) => c.fecha === fecha && c.min === min && c.telefono === telefono);
  if (i < 0) return false;
  citas.splice(i, 1);
  guardar();
  return true;
}

const procesados = new Set();

/** Meta reintenta los webhooks: devuelve true si este mensaje ya se había tratado. */
export function yaProcesado(idMensaje) {
  if (procesados.has(idMensaje)) return true;
  procesados.add(idMensaje);
  if (procesados.size > 5000) procesados.delete(procesados.values().next().value);
  return false;
}
