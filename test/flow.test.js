import { test } from "node:test";
import assert from "node:assert/strict";
import { responder, estadoInicial, huecosDelDia } from "../src/flow.js";
import { negocio } from "../src/config.js";

// Lunes 16 de noviembre de 2026, 09:00
const AHORA = new Date(2026, 10, 16, 9, 0);
const ctx = (extra = {}) => ({ ahora: AHORA, citas: [], negocio, ...extra });
const boton = (id) => ({ tipo: "boton", id });
const texto = (t) => ({ tipo: "texto", texto: t });
const corte = negocio.servicios.find((s) => s.id === "corte");
const corteBarba = negocio.servicios.find((s) => s.id === "corte_barba");

test("un saludo muestra el menú con tres botones", () => {
  const r = responder(estadoInicial(), texto("Hola, buenas"), ctx());
  assert.equal(r.mensajes[0].tipo, "botones");
  assert.deepEqual(r.mensajes[0].botones.map((b) => b.id), ["reservar", "info", "humano"]);
});

test("flujo completo: servicio, día, franja, hora y confirmación crean la cita", () => {
  let r = responder(estadoInicial(), boton("reservar"), ctx());
  assert.equal(r.mensajes[0].tipo, "lista");

  r = responder(r.estado, boton("srv:corte"), ctx());
  assert.equal(r.mensajes[0].filas[0].id, "dia:2026-11-16");

  r = responder(r.estado, boton("dia:2026-11-16"), ctx());
  assert.equal(r.mensajes[0].tipo, "botones"); // hay más de 10 huecos: pregunta la franja

  r = responder(r.estado, boton("fr:man"), ctx());
  assert.equal(r.mensajes[0].filas[0].id, "hora:600"); // 10:00

  r = responder(r.estado, boton("hora:600"), ctx());
  assert.match(r.mensajes[0].texto, /10:00/);

  r = responder(r.estado, boton("ok"), ctx({ nombre: "Alex Pérez", telefono: "34600000000" }));
  assert.deepEqual(r.nuevaCita, {
    servicio: "corte",
    fecha: "2026-11-16",
    min: 600,
    minutos: 30,
    telefono: "34600000000",
    nombre: "Alex Pérez",
  });
  assert.match(r.mensajes[0].texto, /Reservado, Alex/);
});

test("no se ofrecen huecos pasados ni con menos de 30 minutos de antelación", () => {
  const tarde = new Date(2026, 10, 16, 15, 10);
  const huecos = huecosDelDia("2026-11-16", corte, ctx({ ahora: tarde }));
  assert.equal(huecos[0], 16 * 60); // 15:30 queda fuera (empieza en menos de 30 min)
});

test("los domingos no hay huecos", () => {
  assert.deepEqual(huecosDelDia("2026-11-22", corte, ctx()), []);
});

test("los huecos respetan las citas que se solapan y los sillones disponibles", () => {
  const unSillon = { ...negocio, puestos: 1 };
  const citas = [{ fecha: "2026-11-16", min: 660, minutos: 30 }]; // 11:00-11:30
  const huecos = huecosDelDia("2026-11-16", corteBarba, ctx({ negocio: unSillon, citas }));
  assert.ok(huecos.includes(600)); // 10:00-10:45 no solapa
  assert.ok(!huecos.includes(630)); // 10:30-11:15 solapa
  assert.ok(!huecos.includes(660)); // 11:00-11:45 solapa
  assert.ok(huecos.includes(690)); // 11:30-12:15 no solapa

  // Con dos sillones, una sola cita no bloquea el hueco
  assert.ok(huecosDelDia("2026-11-16", corteBarba, ctx({ citas })).includes(660));
});

test("no permite reservar dos veces el mismo hueco", () => {
  const unSillon = { ...negocio, puestos: 1 };
  const citas = [{ fecha: "2026-11-16", min: 600, minutos: 30 }];
  const estado = { paso: "confirmar", servicio: "corte", fecha: "2026-11-16", min: 600 };
  const r = responder(estado, boton("ok"), ctx({ negocio: unSillon, citas }));
  assert.equal(r.nuevaCita, undefined);
  assert.match(r.mensajes[0].texto, /ocupar/);
});

test("responde preguntas frecuentes sin salir del bot", () => {
  const r = responder(estadoInicial(), texto("¿Cuánto cuesta un corte?"), ctx());
  assert.match(r.mensajes[0].texto, /15 €/);
  assert.equal(r.mensajes[1].tipo, "botones");
});

test("al pedir una persona el bot calla hasta que el cliente escribe menú", () => {
  let r = responder(estadoInicial(), boton("humano"), ctx());
  assert.equal(r.estado.paso, "humano");
  r = responder(r.estado, texto("¿me oyes?"), ctx());
  assert.deepEqual(r.mensajes, []);
  r = responder(r.estado, texto("menu"), ctx());
  assert.equal(r.mensajes[0].tipo, "botones");
});

test("un texto que no entiende devuelve al menú", () => {
  const r = responder(estadoInicial(), texto("asdf qwer"), ctx());
  assert.match(r.mensajes[0].texto, /No estoy seguro/);
});

test("un id manipulado o fuera de orden no rompe el flujo", () => {
  for (const id of ["dia:no-es-fecha", "hora:abc", "hora:600", "fr:xyz", "ok", "srv:inventado", "algo"]) {
    const r = responder(estadoInicial(), boton(id), ctx());
    assert.ok(r.mensajes.length > 0, id);
    assert.equal(r.nuevaCita, undefined, id);
  }
});

test("todos los mensajes cumplen los límites de la API de WhatsApp", () => {
  const vistos = [];
  const recorrer = (estado, entrada) => {
    const r = responder(estado, entrada, ctx());
    vistos.push(...r.mensajes);
    return r;
  };
  let r = recorrer(estadoInicial(), texto("hola"));
  recorrer(estadoInicial(), boton("info"));
  r = recorrer(r.estado, boton("reservar"));
  for (const s of negocio.servicios) {
    let x = recorrer(r.estado, boton("srv:" + s.id));
    x = recorrer(x.estado, boton("dia:2026-11-17"));
    for (const f of ["man", "tar", "ult"]) {
      const y = recorrer(x.estado, boton("fr:" + f));
      const hora = y.mensajes[0].filas?.[0];
      if (hora) recorrer(y.estado, boton(hora.id));
    }
  }
  for (const m of vistos) {
    if (m.tipo === "botones") {
      assert.ok(m.botones.length <= 3);
      m.botones.forEach((b) => assert.ok(b.titulo.length <= 20, b.titulo));
    }
    if (m.tipo === "lista") {
      assert.ok(m.filas.length >= 1 && m.filas.length <= 10);
      assert.ok(m.boton.length <= 20);
      m.filas.forEach((f) => {
        assert.ok(f.titulo.length <= 24, f.titulo);
        assert.ok((f.descripcion ?? "").length <= 72);
      });
    }
    assert.ok((m.texto ?? "").length <= 1024);
  }
});
