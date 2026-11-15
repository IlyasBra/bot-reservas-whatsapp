// Almacenamiento EN MEMORIA, suficiente para la demo. Al reiniciar el servidor se pierde todo.
// Para producción, sustituir por una base de datos (ver "Siguientes pasos" en el README).

export const sesiones = new Map(); // teléfono -> estado de la conversación
export const citas = []; // citas reservadas

const procesados = new Set();

/** Meta reintenta los webhooks: devuelve true si este mensaje ya se había tratado. */
export function yaProcesado(idMensaje) {
  if (procesados.has(idMensaje)) return true;
  procesados.add(idMensaje);
  if (procesados.size > 5000) procesados.delete(procesados.values().next().value);
  return false;
}
