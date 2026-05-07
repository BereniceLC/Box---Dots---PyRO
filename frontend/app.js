let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

let idSala = null;
let jugadorId = null;
let estado = null;

let intervaloEstado = null;
let actualizandoEstado = false;

let ganadorMostrado = false;

const spacing = 60;
const offset = 50;
const API_URL = "http://26.2.172.238:5000"; // Cambia esto a tu IP y puerto

function mostrarPantalla(idPantalla) {
    const pantallas = document.querySelectorAll(".screen");

    pantallas.forEach(pantalla => {
        pantalla.classList.remove("active");
    });

    const pantallaActiva = document.getElementById(idPantalla);

    if (pantallaActiva) {
        pantallaActiva.classList.add("active");
    }
    }

    function mostrarCrearSala() {
    mostrarPantalla("pantallaCrear");
    }

    function mostrarUnirseSala() {
    mostrarPantalla("pantallaUnirse");
    }

    function volverAlMenu() {
    mostrarPantalla("pantallaMenu");
    }

    function mostrarJuego() {
    mostrarPantalla("pantallaJuego");
    }

    function mostrarMensajeJuego(mensaje) {
    const contenedor = document.getElementById("mensajeJuego");

    if (contenedor) {
        contenedor.textContent = mensaje;
    }
    }

async function copiarCodigoSala() {
    if (!idSala) {
        mostrarMensajeJuego("No hay código de sala para copiar.");
        return;
    }

    try {
        await navigator.clipboard.writeText(idSala);
        mostrarMensajeJuego(`Código ${idSala} copiado al portapapeles.`);
    } catch (error) {
        mostrarMensajeJuego(`Código de sala: ${idSala}`);
    }
}

function actualizarPanelJuego() {
    if (!estado || !estado.jugadores) return;

    const turnoTexto = document.getElementById("turnoActualTexto");
    const listaJugadores = document.getElementById("listaJugadores");

    const jugadorTurno = estado.jugadores.find(j => j.id === estado.turno);

    if (turnoTexto) {
        turnoTexto.textContent = jugadorTurno
        ? jugadorTurno.nombre
        : "Esperando...";
    }

    if (listaJugadores) {
        listaJugadores.innerHTML = "";

        estado.jugadores.forEach(jugador => {
        const fila = document.createElement("div");
        fila.className = "player-row";

        const color = obtenerColorJugador(jugador.id);

        fila.innerHTML = `
            <div class="player-name">
            <span class="color-dot" style="background:${color}"></span>
            <strong>${jugador.nombre}</strong>
            </div>
            <span>${jugador.puntos} pts</span>
        `;

        listaJugadores.appendChild(fila);
        });
    }
}

async function crearSalaDesdeMenu() {
    const nombreCrear = document.getElementById("nombreCrear").value.trim();

    if (!nombreCrear) {
        alert("Escribe tu nombre antes de crear una sala.");
        return;
    }

    const nombreOculto = document.getElementById("nombre");

    if (nombreOculto) {
        nombreOculto.value = nombreCrear;
    }

    await crearSala();
}

async function crearSala() {
    const nombre = document.getElementById("nombre").value.trim();

    if (!nombre) {
        alert("Escribe tu nombre antes de crear una sala.");
        return;
    }

    const res = await fetch(`${API_URL}/crear_sala`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ nombre })
    });

    if (!res.ok) {
        const text = await res.text();
        console.error("Error del servidor:", text);
        return;
    }

    const data = await res.json();

    if (!data.ok) {
        alert(data.error || "No se pudo crear la sala.");
        return;
    }

    idSala = data.id_sala;
    jugadorId = data.jugador.id;
    ganadorMostrado = false;

    const modalFinal = document.getElementById("modalFinal");
    if (modalFinal) {
        modalFinal.classList.add("hidden");
    }

    const codigoTexto = document.getElementById("codigoSalaTexto");
    const codigoJuego = document.getElementById("codigoSalaJuego");
    const codigoBox = document.getElementById("codigoCreadoBox");
    const inputSala = document.getElementById("idSalaInput");

    if (codigoTexto) codigoTexto.textContent = idSala;
    if (codigoJuego) codigoJuego.textContent = idSala;
    if (inputSala) inputSala.value = idSala;
    if (codigoBox) codigoBox.classList.remove("hidden");

    mostrarJuego();
    mostrarMensajeJuego(`Sala creada. Comparte el código ${idSala} con los demás jugadores.`);

    await actualizarEstado();
    iniciarActualizacionEstado();

    console.log("Sala creada:", data);
}

async function unirseSala() {
    const nombreInputUnirse = document.getElementById("nombreUnirse");
    const nombreInputNormal = document.getElementById("nombre");

    const nombre = (
    nombreInputUnirse?.value ||
    nombreInputNormal?.value ||
    ""
    ).trim();

    const id = document.getElementById("idSalaInput").value.trim().toUpperCase();

    if (!nombre) {
        alert("Escribe tu nombre antes de unirte a una sala.");
        return;
    }

    if (!id) {
        alert("Escribe el ID de la sala.");
        return;
    }

    const res = await fetch(`${API_URL}/unirse_sala`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            id_sala: id,
            nombre: nombre
        })
    });

    const data = await res.json();

    if (!data.ok) {
        alert(data.error || "No se pudo unir a la sala.");
        return;
    }

    idSala = id;
    jugadorId = data.jugador.id;

    ganadorMostrado = false;

    const modalFinal = document.getElementById("modalFinal");
    if (modalFinal) {
        modalFinal.classList.add("hidden");
    }

    const codigoJuego = document.getElementById("codigoSalaJuego");
    if (codigoJuego) {
        codigoJuego.textContent = idSala;
    }
    mostrarJuego();
    mostrarMensajeJuego(`Has unido a la sala ${idSala}.Esperando turno...`);

    console.log("Unido a sala:", idSala);
    console.log("Jugador:", jugadorId);

    actualizarEstado();

    await actualizarEstado();
    iniciarActualizacionEstado();
}

async function actualizarEstado() {
    if (!idSala) return;

    try {
        const res = await fetch(`${API_URL}/estado/${idSala}`, {
        cache: "no-store"
        });

        if (!res.ok) {
        const text = await res.text();
        console.error("Error obteniendo estado:", text);
        return;
        }

        const data = await res.json();

        if (data.ok === false) {
        console.error("Estado rechazado:", data.error);
        return;
        }

        if (!data.tablero) {
        console.error("Estado sin tablero:", data);
        return;
        }

        estado = data;
        dibujar();
        actualizarPanelJuego();
        mostrarMarcadorEnConsola();
        verificarFinDelJuego();

    } catch (error) {
        console.error("Error de red al actualizar estado:", error);
    }
}

function iniciarActualizacionEstado() {
    if (intervaloEstado) {
        clearInterval(intervaloEstado);
    }

  intervaloEstado = setInterval(actualizarEstado, 300);
}

function obtenerColorJugador(idJugador) {
     if (!estado || !estado.jugadores) {
      return "white";
    }

  const jugador = estado.jugadores.find(j => j.id === idJugador);

  if (!jugador) {
    return "white";
  }

  const colores = {
    rojo: "#e74c3c",
    azul: "#3498db",
    morado: "#9b59b6",
    verde: "#2ecc71"
  };

  return colores[jugador.color] || jugador.color || "white";
}

function obtenerNombreJugador(idJugador) {
    if (!estado || !estado.jugadores) return "Desconocido";

    const jugador = estado.jugadores.find(j => j.id === idJugador);
    return jugador ? jugador.nombre : "Desconocido";
    }

function obtenerJugadorPorId(idJugador) {
    if (!estado || !estado.jugadores) return null;
    return estado.jugadores.find(j => j.id === idJugador) || null;
    }

    function mostrarMarcadorEnConsola() {
    if (!estado || !estado.jugadores) return;

    console.clear();

    console.log("Sala:", estado.id_sala);
    console.log("Juego iniciado:", estado.iniciada);
    console.log("Juego terminado:", estado.terminado);

    const jugadorTurno = obtenerJugadorPorId(estado.turno);

    if (jugadorTurno) {
        console.log("Turno actual:", jugadorTurno.nombre, "| Color:", jugadorTurno.color);
    }

    console.table(
        estado.jugadores.map(j => ({
        nombre: j.nombre,
        color: j.color,
        puntos: j.puntos,
        esMiJugador: j.id === jugadorId,
        tieneTurno: j.id === estado.turno
        }))
    );

    if (estado.terminado) {
        mostrarGanadorEnConsola();
    }
}

function mostrarGanadorEnConsola() {
    if (!estado || !estado.jugadores || estado.jugadores.length === 0) return;

    const maxPuntos = Math.max(...estado.jugadores.map(j => j.puntos));
    const ganadores = estado.jugadores.filter(j => j.puntos === maxPuntos);

    if (ganadores.length === 1) {
        console.log("GANADOR:", ganadores[0].nombre, "con", maxPuntos, "puntos");
    } else {
        console.log(
        "EMPATE:",
        ganadores.map(j => j.nombre).join(", "),
        "con",
        maxPuntos,
        "puntos"
        );
    }
}

function verificarFinDelJuego() {
  if (!estado || !estado.terminado || ganadorMostrado) return;

  ganadorMostrado = true;

  const maxPuntos = Math.max(...estado.jugadores.map(j => j.puntos));
  const ganadores = estado.jugadores.filter(j => j.puntos === maxPuntos);

  const resultadoFinalTexto = document.getElementById("resultadoFinalTexto");
  const resultadoFinalPuntajes = document.getElementById("resultadoFinalPuntajes");
  const modalFinal = document.getElementById("modalFinal");

  if (!resultadoFinalTexto || !resultadoFinalPuntajes || !modalFinal) return;

  if (ganadores.length === 1) {
    resultadoFinalTexto.textContent =
      `Ganador: ${ganadores[0].nombre} con ${maxPuntos} puntos`;
  } else {
    resultadoFinalTexto.textContent =
      `Empate entre ${ganadores.map(j => j.nombre).join(", ")} con ${maxPuntos} puntos`;
  }

  const jugadoresOrdenados = [...estado.jugadores].sort((a, b) => b.puntos - a.puntos);

  resultadoFinalPuntajes.innerHTML = "";

  jugadoresOrdenados.forEach(jugador => {
    const fila = document.createElement("div");
    fila.className = "final-score-row";

    const color = obtenerColorJugador(jugador.id);

    fila.innerHTML = `
      <div class="final-player">
        <span class="color-dot" style="background:${color}"></span>
        <span>${jugador.nombre}</span>
      </div>
      <strong>${jugador.puntos} pts</strong>
    `;

    resultadoFinalPuntajes.appendChild(fila);
  });

  modalFinal.classList.remove("hidden");
}

function volverAlMenuDesdeFinal() {
  const modalFinal = document.getElementById("modalFinal");
  const codigoCreadoBox = document.getElementById("codigoCreadoBox");
  const codigoSalaTexto = document.getElementById("codigoSalaTexto");
  const codigoSalaJuego = document.getElementById("codigoSalaJuego");
  const turnoActualTexto = document.getElementById("turnoActualTexto");
  const listaJugadores = document.getElementById("listaJugadores");
  const mensajeJuego = document.getElementById("mensajeJuego");
  const idSalaInput = document.getElementById("idSalaInput");
  const nombreCrear = document.getElementById("nombreCrear");
  const nombreUnirse = document.getElementById("nombreUnirse");
  const nombreOculto = document.getElementById("nombre");

  if (intervaloEstado) {
    clearInterval(intervaloEstado);
    intervaloEstado = null;
  }

  if (modalFinal) modalFinal.classList.add("hidden");
  if (codigoCreadoBox) codigoCreadoBox.classList.add("hidden");
  if (codigoSalaTexto) codigoSalaTexto.textContent = "------";
  if (codigoSalaJuego) codigoSalaJuego.textContent = "------";
  if (turnoActualTexto) turnoActualTexto.textContent = "Esperando...";
  if (listaJugadores) listaJugadores.innerHTML = "Esperando jugadores...";
  if (mensajeJuego) mensajeJuego.textContent = "Crea o únete a una sala para comenzar.";
  if (idSalaInput) idSalaInput.value = "";
  if (nombreCrear) nombreCrear.value = "";
  if (nombreUnirse) nombreUnirse.value = "";
  if (nombreOculto) nombreOculto.value = "";

  idSala = null;
  jugadorId = null;
  estado = null;
  ganadorMostrado = false;

  mostrarPantalla("pantallaMenu");
}

function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!estado) return;

    const { horizontal, vertical, boxes } = estado.tablero;
    
    // Dibujar cuadros ganados
    boxes.forEach((fila, i) => {
    fila.forEach((dueno, j) => {
        if (dueno) {
        ctx.fillStyle = obtenerColorJugador(dueno);
        ctx.globalAlpha = 0.25;

        ctx.fillRect(
            offset + j * spacing + 5,
            offset + i * spacing + 5,
            spacing - 10,
            spacing - 10
        );

        ctx.globalAlpha = 1;

        ctx.fillStyle = "white";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const nombre = obtenerNombreJugador(dueno);
        const inicial = nombre.charAt(0).toUpperCase();

        ctx.fillText(
            inicial,
            offset + j * spacing + spacing / 2,
            offset + i * spacing + spacing / 2
        );
        }
    });
    });

    // Dibujar puntos
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 8; j++) {
            ctx.beginPath();
            ctx.arc(offset + j * spacing, offset + i * spacing, 5, 0, Math.PI * 2);
            ctx.fillStyle = "white";
            ctx.fill();
        }
    }

    // Dibujar líneas horizontales
    horizontal.forEach((fila, i) => {
    fila.forEach((linea, j) => {
    if (linea) {
      ctx.strokeStyle = obtenerColorJugador(linea);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(offset + j * spacing, offset + i * spacing);
      ctx.lineTo(offset + (j + 1) * spacing, offset + i * spacing);
      ctx.stroke();
    }
  });
});

    // Dibujar líneas verticales
vertical.forEach((fila, i) => {
  fila.forEach((linea, j) => {
    if (linea) {
      ctx.strokeStyle = obtenerColorJugador(linea);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(offset + j * spacing, offset + i * spacing);
      ctx.lineTo(offset + j * spacing, offset + (i + 1) * spacing);
      ctx.stroke();
    }
  });
});
}

// Detectar clics
canvas.addEventListener("click", async (e) => {
    if (!estado) return;

    const x = e.offsetX;
    const y = e.offsetY;

    let mejor = null;
    let minDist = 15;

    // Buscar línea horizontal más cercana
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 7; j++) {
            let x1 = offset + j * spacing;
            let y1 = offset + i * spacing;
            let x2 = offset + (j + 1) * spacing;
            let y2 = y1;

            let dist = distanciaLinea(x, y, x1, y1, x2, y2);

            if (dist < minDist) {
                minDist = dist;
                mejor = { tipo: "H", fila: i, col: j };
            }
        }
    }

    // Buscar línea vertical
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 8; j++) {
            let x1 = offset + j * spacing;
            let y1 = offset + i * spacing;
            let x2 = x1;
            let y2 = offset + (i + 1) * spacing;

            let dist = distanciaLinea(x, y, x1, y1, x2, y2);

            if (dist < minDist) {
                minDist = dist;
                mejor = { tipo: "V", fila: i, col: j };
            }
        }
    }

    if (mejor) {
        try {
            const res = await fetch(`${API_URL}/movimiento`, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                id_sala: idSala,
                jugador_id: jugadorId,
                tipo: mejor.tipo,
                fila: mejor.fila,
                col: mejor.col
            })
            });

            if (!res.ok) {
            const text = await res.text();
            console.error("Error del servidor en movimiento:", text);
            return;
            }

            const data = await res.json();
            console.log("Respuesta movimiento:", data);

            if (!data.ok) {
            alert(data.error || "Movimiento rechazado");
            await actualizarEstado();
            return;
            }

            await actualizarEstado();

        } catch (error) {
            console.error("Error de red al enviar movimiento:", error);
        }
    }
});

function distanciaLinea(px, py, x1, y1, x2, y2) {
    let A = px - x1;
    let B = py - y1;
    let C = x2 - x1;
    let D = y2 - y1;

    let dot = A * C + B * D;
    let len_sq = C * C + D * D;
    let param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    let dx = px - xx;
    let dy = py - yy;

    return Math.sqrt(dx * dx + dy * dy);
}