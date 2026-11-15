# Bot de reservas por WhatsApp

[![Tests](https://github.com/IlyasBra/bot-reservas-whatsapp/actions/workflows/test.yml/badge.svg)](https://github.com/IlyasBra/bot-reservas-whatsapp/actions/workflows/test.yml)
![Node](https://img.shields.io/badge/node-%E2%89%A5%2020.6-339933)
![Dependencias](https://img.shields.io/badge/dependencias-0-brightgreen)
![Licencia](https://img.shields.io/badge/licencia-MIT-blue)

Asistente que permite a los clientes de un negocio **reservar cita hablando por WhatsApp**, sin descargar ninguna app ni registrarse. Pensado para peluquerías, clínicas, talleres, centros de estética y cualquier negocio que viva de las citas.

### 👉 [Probar la demo en el navegador](https://ilyasbra.github.io/bot-reservas-whatsapp/)

> La demo usa un negocio **ficticio** (Barbería Nórdica). El simulador ejecuta exactamente la misma lógica de conversación que el bot conectado a WhatsApp.

## Qué hace

- **Reserva guiada con botones y listas:** servicio → día → hora → confirmación.
- **Huecos calculados en tiempo real** según el horario, la duración de cada servicio, el número de puestos de trabajo y las citas ya reservadas. No permite reservar dos veces el mismo hueco, y lo vuelve a comprobar al confirmar.
- **Preguntas frecuentes** (precios, horario, dirección, formas de pago) respondidas sin salir del chat.
- **Paso a una persona:** si el cliente lo pide, el bot calla y deja la conversación en manos del equipo.
- **Seguro:** verificación del webhook, comprobación de la firma de Meta (`X-Hub-Signature-256`) y descarte de mensajes duplicados (Meta reintenta los envíos).
- **Sin dependencias:** solo módulos de Node.js.

## Diseño

El bot es **estructurado, no un chat libre con IA**: cada paso ofrece opciones concretas. Es el tipo de bot de reservas y soporte que admite la política de WhatsApp Business, y es predecible, barato y fácil de auditar.

```
Cliente (WhatsApp) ──► Webhook (src/server.js) ──► Lógica (src/flow.js) ──► Respuesta (src/whatsapp.js)
                                                         │
                                          función pura: estado + mensaje → nuevo estado + respuestas
```

`src/flow.js` no depende de Node ni de WhatsApp. Por eso la misma lógica se usa en el servidor, en la consola (`npm run chat`) y en el simulador web, y se puede probar con tests unitarios.

## Probarlo en local sin coste

Necesitas [Node.js](https://nodejs.org) 20.6 o superior. No hay que instalar nada más.

```bash
git clone https://github.com/IlyasBra/bot-reservas-whatsapp.git
cd bot-reservas-whatsapp

npm run chat   # conversa con el bot en la terminal
npm test       # ejecuta los tests
```

## Conectarlo a WhatsApp (gratis para probar)

Meta ofrece un **número de prueba** al crear una app en [Meta for Developers](https://developers.facebook.com/): permite enviar mensajes gratis a un máximo de 5 números verificados, sin método de pago. Es suficiente para desarrollar y hacer demos. Para atender a clientes reales hace falta un número propio y la verificación del negocio, y Meta cobra por mensajes (consulta su [tarifa de precios](https://developers.facebook.com/docs/whatsapp/pricing)).

1. Crea una app de tipo *Business* en Meta for Developers y añade el producto **WhatsApp**.
2. En *API Setup* copia el token temporal y el *Phone number ID*, y añade tu móvil como destinatario.
3. Copia `.env.example` a `.env` y rellena los valores.
4. Arranca el servidor: `npm start`.
5. Expón el puerto con un túnel gratuito (por ejemplo Cloudflare Tunnel o ngrok), porque Meta necesita una URL HTTPS pública.
6. En *Configuration* de la app, define el webhook `https://TU-URL/webhook` con tu `VERIFY_TOKEN` y suscríbete al campo `messages`.
7. Escribe "hola" al número de prueba.

Notas: el token temporal caduca a las 24 horas (se puede generar uno permanente con un usuario del sistema) y las plantillas creadas con el número de prueba no se trasladan a un número real.

## Adaptarlo a otro negocio

Todo lo específico del negocio está en [`src/config.js`](src/config.js): nombre, dirección, horario, servicios con su duración y precio, número de puestos, preguntas frecuentes. No hay que tocar la lógica.

## Estructura

```
src/config.js      Datos del negocio (servicios, horario, FAQ)
src/flow.js        Lógica de la conversación (función pura)
src/server.js      Webhook: verificación, firma, mensajes entrantes
src/whatsapp.js    Envío de mensajes con la Cloud API
src/store.js       Almacenamiento en memoria (demo)
src/consola.js     Chat de prueba en la terminal
test/              Tests unitarios (node:test)
index.html         Simulador web de la demo
```

## Estado y siguientes pasos

Esto es una **demo funcional**, no un producto terminado. Lo que no incluye todavía:

- [ ] Persistencia en base de datos (ahora las citas están en memoria y se pierden al reiniciar).
- [ ] Recordatorios automáticos 24 h antes con plantillas aprobadas de WhatsApp.
- [ ] Cancelar o cambiar una cita ya reservada desde el chat.
- [ ] Panel web para que el negocio gestione servicios, horarios y agenda.
- [ ] Varios negocios en una misma instalación (cada uno con su número).
- [ ] Aviso al equipo cuando un cliente pide hablar con una persona.
- [ ] Uso de IA para entender fechas escritas en lenguaje natural ("el jueves por la tarde"), manteniendo el flujo estructurado.

## Autor

Desarrollado por [@IlyasBra](https://github.com/IlyasBra). Si tu negocio necesita algo parecido, escríbeme a través de GitHub.

## Licencia

[MIT](LICENSE)
