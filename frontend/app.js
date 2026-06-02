let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

let idSala = null;
let jugadorId = null;
let estado = null;

let intervaloEstado = null;
let actualizandoEstado = false;

let ganadorMostrado = false;

let resultadoGlobalRegistrado = false;

let lineaPreview = null;
let musicaIniciada = false;

const spacing = 60;
const offset = 50;
const API_PORT = window.location.port === "30080" ? "30050" : "5000";
const API_URL = `http://${window.location.hostname}:${API_PORT}`;

const MUSIC_VOLUME_KEY = "boxdots_music_volume";
const MUSIC_MUTED_KEY = "boxdots_music_muted";

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

    function mostrarMensajeJuego(mensaje, tipo = "info") {
      const contenedor = document.getElementById("mensajeJuego");

      if (!contenedor) return;

      contenedor.textContent = mensaje;

      contenedor.classList.remove(
        "is-info",
        "is-success",
        "is-warning",
        "is-error"
      );

      contenedor.classList.add(`is-${tipo}`);
    }


async function copiarCodigoSala() {
    if (!idSala) {
        mostrarMensajeJuego("No hay código de sala para copiar.", "warning");
        return;
    }

    try {
        await navigator.clipboard.writeText(idSala);
        mostrarMensajeJuego(`Código ${idSala} copiado al portapapeles.`, "success");
    } catch (error) {
        mostrarMensajeJuego(`Código de sala: ${idSala}`, "error");
    }
}

async function autenticarUsuario(username, password) {
  const res = await fetch(`${API_URL}/auth`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      username,
      password
    })
  });

  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.error || "No se pudo autenticar el usuario");
  }

  return data.usuario;
}


async function cargarLeaderboard() {
  const contenedor = document.getElementById("leaderboardLista");

  if (contenedor) {
    contenedor.innerHTML = `
      <div class="leaderboard-empty">
        Cargando ranking...
      </div>
    `;
  }

  try {
    const res = await fetch(`${API_URL}/leaderboard?limit=10`, {
      cache: "no-store"
    });

    const data = await res.json();

    if (!data.ok) {
      throw new Error(data.error || "No se pudo cargar el ranking");
    }

    if (!contenedor) return;

    if (!data.leaderboard || data.leaderboard.length === 0) {
      contenedor.innerHTML = `
        <div class="leaderboard-empty">
          Aún no hay puntuaciones.<br>
          Termina una partida para aparecer en el ranking.
        </div>
      `;
      return;
    }

    contenedor.innerHTML = "";

    data.leaderboard.forEach((jugador, index) => {
      const fila = document.createElement("div");
      fila.className = "leaderboard-row";

      const nombre = jugador.username || "Jugador";
      const iniciales = nombre
        .trim()
        .split(/\s+/)
        .map(parte => parte.charAt(0))
        .join("")
        .substring(0, 2)
        .toUpperCase();

      const posicion = index + 1;
      const partidas = jugador.games_played ?? 0;
      const victorias = jugador.wins ?? 0;
      const puntos = jugador.total_points ?? 0;

      fila.innerHTML = `
        <span class="rank-medal rank-${posicion <= 3 ? posicion : "normal"}">
          ${posicion}
        </span>

        <span class="rank-avatar">
          ${iniciales || "?"}
        </span>

        <span class="rank-info">
          <strong>${nombre}</strong>
          <small>${partidas} partidas | ${victorias} victorias</small>
        </span>

        <strong class="rank-points">${puntos} pts</strong>
      `;

      contenedor.appendChild(fila);
    });

  } catch (error) {
    console.error("Error leaderboard:", error);

    if (contenedor) {
      contenedor.innerHTML = `
        <div class="leaderboard-error">
          No se pudo cargar el ranking.<br>
          Verifica que el backend esté encendido.
        </div>
      `;
    }
  }
}


async function registrarResultadoGlobal() {
  if (!idSala || resultadoGlobalRegistrado) return;

  if (estado && estado.registrar_resultado_global === false) {
    resultadoGlobalRegistrado = true;
    console.log("Partida por abandono: no se registra resultado global.");
    return;
  }

  resultadoGlobalRegistrado = true;

  try {
    const res = await fetch(`${API_URL}/registrar_resultado`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        id_sala: idSala
      })
    });

    const data = await res.json();

    console.log("Resultado global registrado:", data);

    await cargarLeaderboard();

  } catch (error) {
    console.error("Error registrando resultado global:", error);
  }
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function obtenerIniciales(nombre) {
  return String(nombre || "J")
    .trim()
    .split(/\s+/)
    .map(parte => parte.charAt(0))
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function obtenerAvatarJugador(jugador) {
  const avatares = {
    rojo: "assets/avatars/avatar-rojo.png",
    azul: "assets/avatars/avatar-azul.png",
    verde: "assets/avatars/avatar-verde.png",
    morado: "assets/avatars/avatar-morado.png"
  };

  return avatares[jugador?.color] || "assets/avatars/avatar-default.png";
}

function actualizarPanelJuego() {
  if (!estado || !estado.jugadores) return;

  const turnoTexto = document.getElementById("turnoActualTexto");
  const turnoBadgeTexto = document.getElementById("turnoBadgeTexto");
  const turnoDetalleTexto = document.getElementById("turnoDetalleTexto");
  const listaJugadores = document.getElementById("listaJugadores");
  const jugadoresTurnoBar = document.getElementById("jugadoresTurnoBar");
  const estadoSalaTexto = document.getElementById("estadoSalaTexto");
  const estadoSalaDetalle = document.getElementById("estadoSalaDetalle");
  const contadorJugadores = document.getElementById("contadorJugadores");
  const boardCard = document.querySelector(".board-card");

  const jugadores = estado.jugadores || [];
  const jugadorTurno = jugadores.find(j => j.id === estado.turno);
  const esMiTurno = jugadorTurno && jugadorTurno.id === jugadorId;

  if (contadorJugadores) {
    contadorJugadores.textContent = `${jugadores.length} / 4`;
  }

  if (estadoSalaTexto && estadoSalaDetalle) {
    if (estado.terminado) {
      estadoSalaTexto.textContent = "Partida finalizada";
      estadoSalaDetalle.textContent = "La partida ya terminó.";
    } else if (estado.iniciada) {
      estadoSalaTexto.textContent = "Partida en curso";
      estadoSalaDetalle.textContent = "Los jugadores están jugando por turnos.";
    } else {
      estadoSalaTexto.textContent = "Sala activa";
      estadoSalaDetalle.textContent = "Esperando a que entre otro jugador...";
    }
  }

  if (turnoTexto) {
    if (estado.terminado) {
      turnoTexto.textContent = "Juego terminado";
    } else if (jugadorTurno) {
      turnoTexto.textContent = esMiTurno
        ? "Es tu turno"
        : `Turno de ${jugadorTurno.nombre}`;
    } else {
      turnoTexto.textContent = "Esperando...";
    }
  }

  if (turnoBadgeTexto) {
    if (estado.terminado) {
      turnoBadgeTexto.textContent = "Finalizado";
      turnoBadgeTexto.className = "turn-badge ended";
    } else if (esMiTurno) {
      turnoBadgeTexto.textContent = "Tu turno";
      turnoBadgeTexto.className = "turn-badge my-turn";
    } else if (jugadorTurno) {
      turnoBadgeTexto.textContent = "Espera";
      turnoBadgeTexto.className = "turn-badge waiting-turn";
    } else {
      turnoBadgeTexto.textContent = "Esperando";
      turnoBadgeTexto.className = "turn-badge waiting-turn";
    }
  }

  if (turnoDetalleTexto) {
    if (estado.terminado) {
      turnoDetalleTexto.textContent = "Revisa el resultado final de la partida.";
    } else if (esMiTurno) {
      turnoDetalleTexto.textContent = "Elige una línea del tablero. Si completas un cuadro, conservas el turno.";
    } else if (jugadorTurno) {
      turnoDetalleTexto.textContent = `Espera a que ${jugadorTurno.nombre} realice su movimiento.`;
    } else {
      turnoDetalleTexto.textContent = "Cuando haya suficientes jugadores, comenzará la partida.";
    }
  }

  if (boardCard) {
    boardCard.classList.toggle("is-my-turn", Boolean(esMiTurno && !estado.terminado));
    boardCard.classList.toggle("is-waiting-turn", Boolean(!esMiTurno && jugadorTurno && !estado.terminado));
  }

  if (listaJugadores) {
    listaJugadores.innerHTML = "";

    if (jugadores.length === 0) {
      listaJugadores.innerHTML = `
        <div class="player-row player-empty">
          Esperando jugadores...
        </div>
      `;
    }

    jugadores.forEach(jugador => {
      const fila = document.createElement("div");
      const color = obtenerColorJugador(jugador.id);
      const esJugadorActual = jugador.id === jugadorId;
      const tieneTurno = jugador.id === estado.turno;

      fila.className = `player-row player-row-v2 ${tieneTurno ? "active-turn" : ""} ${esJugadorActual ? "is-me" : ""}`;

      fila.style.setProperty("--player-color", color);

      fila.innerHTML = `
        <div class="player-name">
          <span class="color-dot" style="background:${color}"></span>

          <span class="player-avatar">
            <img
              src="${obtenerAvatarJugador(jugador)}" 
              alt="Avatar de ${escaparHTML(jugador.nombre)}"
            >
          </span>

          <div>
            <strong>${escaparHTML(jugador.nombre)}</strong>
            ${jugador.abandono ? `<small>AbandonÃ³</small>` : esJugadorActual ? `<small>T\u00fa</small>` : ""}
          </div>
        </div>

        <span class="player-score">${jugador.puntos} pts</span>
      `;

      listaJugadores.appendChild(fila);
    });
  }

  if (jugadoresTurnoBar) {
    jugadoresTurnoBar.innerHTML = "";

    jugadores.forEach(jugador => {
      const chip = document.createElement("div");
      const color = obtenerColorJugador(jugador.id);
      const esJugadorActual = jugador.id === jugadorId;
      const tieneTurno = jugador.id === estado.turno;

      chip.className = `turn-player-chip ${tieneTurno ? "active" : ""} ${esJugadorActual ? "is-me" : ""}`;
      chip.style.setProperty("--player-color", color);

      chip.innerHTML = `
        <span class="turn-chip-avatar">
          <img 
            src="${obtenerAvatarJugador(jugador)}" 
            alt="Avatar de ${escaparHTML(jugador.nombre)}"
          >
        </span>


        <span class="turn-chip-info">
          <strong>${escaparHTML(jugador.nombre)}</strong>
          <small>
            ${jugador.puntos} pts${jugador.abandono ? " · Salió" : esJugadorActual ? " · T\u00fa" : ""}
          </small>
        </span>
      `;

      jugadoresTurnoBar.appendChild(chip);
    });

    while (jugadoresTurnoBar.children.length < 4) {
      const waitingChip = document.createElement("div");
      waitingChip.className = "turn-player-chip waiting";
      waitingChip.innerHTML = `
        <span class="turn-chip-avatar empty">+</span>
        <span class="turn-chip-info">
          <strong>Esperando</strong>
          <small>Jugador disponible</small>
        </span>
      `;
      jugadoresTurnoBar.appendChild(waitingChip);
    }
  }
}

async function crearSalaDesdeMenu() {
  const nombreCrear = document.getElementById("nombreCrear").value.trim();
  const passwordCrear = document.getElementById("passwordCrear").value.trim();

  if (!nombreCrear) {
    alert("Escribe tu usuario antes de crear una sala.");
    return;
  }

  if (!passwordCrear) {
    alert("Escribe tu contraseña.");
    return;
  }

  try {
    const usuario = await autenticarUsuario(nombreCrear, passwordCrear);

    const nombreOculto = document.getElementById("nombre");

    if (nombreOculto) {
      nombreOculto.value = usuario.username;
    }

    resultadoGlobalRegistrado = false;

    await crearSala();

  } catch (error) {
    alert(error.message);
  }
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
    resultadoGlobalRegistrado = false;

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
    mostrarMensajeJuego(
      `Sala creada. Comparte el código ${idSala} con los demás jugadores.`,
      "success"
    );

    await actualizarEstado();
    iniciarActualizacionEstado();

    console.log("Sala creada:", data);
}

async function unirseSala() {
    const nombreInputUnirse = document.getElementById("nombreUnirse");
    const nombreInputNormal = document.getElementById("nombre");

    let nombre = (
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

    const passwordUnirse = document.getElementById("passwordUnirse").value.trim();

    if (!passwordUnirse) {
    alert("Escribe tu contraseña.");
    return;
    }

    try {
    const usuario = await autenticarUsuario(nombre, passwordUnirse);
    nombre = usuario.username;
    } catch (error) {
    alert(error.message);
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
    resultadoGlobalRegistrado = false;

    const modalFinal = document.getElementById("modalFinal");
    if (modalFinal) {
        modalFinal.classList.add("hidden");
    }

    const codigoJuego = document.getElementById("codigoSalaJuego");
    if (codigoJuego) {
        codigoJuego.textContent = idSala;
    }
    mostrarJuego();
    mostrarMensajeJuego(
      `Te uniste a la sala ${idSala}. Esperando turno...`,
      "success"
    );

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

  const resultadoFinalTexto = document.getElementById("resultadoFinalTexto");
  const resultadoFinalPuntajes = document.getElementById("resultadoFinalPuntajes");
  const modalFinal = document.getElementById("modalFinal");

  if (!resultadoFinalTexto || !resultadoFinalPuntajes || !modalFinal) return;

  if (estado.motivo_final === "abandono") {
    const ganadorAbandono = estado.ganador_abandono;

    resultadoFinalTexto.textContent = ganadorAbandono
      ? `Ganador por abandono: ${ganadorAbandono.nombre}`
      : "La partida terminó por abandono";

    resultadoFinalPuntajes.innerHTML = "";

    estado.jugadores.forEach(jugador => {
      const fila = document.createElement("div");
      fila.className = "final-score-row";

      const color = obtenerColorJugador(jugador.id);
      const estadoJugador = jugador.abandono ? "Abandonó" : "Activo";

      fila.innerHTML = `
        <div class="final-player">
          <span class="color-dot" style="background:${color}"></span>
          <span>${escaparHTML(jugador.nombre)} - ${estadoJugador}</span>
        </div>
        <strong>${jugador.puntos} pts</strong>
      `;

      resultadoFinalPuntajes.appendChild(fila);
    });

    modalFinal.classList.remove("hidden");
    registrarResultadoGlobal();
    return;
  }

  const maxPuntos = Math.max(...estado.jugadores.map(j => j.puntos));
  const ganadores = estado.jugadores.filter(j => j.puntos === maxPuntos);

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
  registrarResultadoGlobal();
}

async function salirPartidaLocal() {
  if (!idSala || !jugadorId) {
    volverAlMenuDesdeFinal();
    return;
  }

  const confirmar = confirm(
    "¿Quieres salir de la partida?\n\nSi la partida ya inició, el jugador restante ganará por abandono, pero no se sumarán puntos al ranking."
  );

  if (!confirmar) return;

  try {
    const res = await fetch(`${API_URL}/salir_sala`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        id_sala: idSala,
        jugador_id: jugadorId
      })
    });

    const data = await res.json();

    if (!data.ok) {
      mostrarMensajeJuego(data.error || "No se pudo salir de la partida.", "error");
      return;
    }

    mostrarMensajeJuego(data.mensaje || "Saliste de la partida.", "success");

    volverAlMenuDesdeFinal();
    await cargarLeaderboard();

  } catch (error) {
    console.error("Error al salir de la partida:", error);
    mostrarMensajeJuego("Error de red al salir de la partida.", "error");
  }
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
  resultadoGlobalRegistrado = false;

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

    const filasPuntos =horizontal.length;
    const columnasPuntos = horizontal[0].length + 1;
    for (let i = 0; i < filasPuntos; i++) {
        for (let j = 0; j < columnasPuntos; j++) {
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

dibujarPreviewMovimiento();
}

function obtenerJugadorTurnoActual() {
  if (!estado || !estado.jugadores) return null;
  return estado.jugadores.find(jugador => jugador.id === estado.turno) || null;
}

function esTurnoDelJugadorActual() {
  return Boolean(
    estado &&
    jugadorId &&
    estado.turno &&
    estado.turno === jugadorId &&
    !estado.terminado
  );
}

function obtenerPuntosJugadorActual() {
  if (!estado || !estado.jugadores || !jugadorId) return 0;

  const jugador = estado.jugadores.find(j => j.id === jugadorId);
  return jugador ? jugador.puntos : 0;
}

function obtenerLineaMasCercana(x, y) {
  if (!estado || !estado.tablero) return null;

  const { horizontal, vertical } = estado.tablero;

  let mejor = null;
  let minDist = 15;

  for (let i = 0; i < horizontal.length; i++) {
    for (let j = 0; j < horizontal[i].length; j++) {
      if (horizontal[i][j]) continue;

      const x1 = offset + j * spacing;
      const y1 = offset + i * spacing;
      const x2 = offset + (j + 1) * spacing;
      const y2 = y1;

      const dist = distanciaLinea(x, y, x1, y1, x2, y2);

      if (dist < minDist) {
        minDist = dist;
        mejor = {
          tipo: "H",
          fila: i,
          col: j
        };
      }
    }
  }

  for (let i = 0; i < vertical.length; i++) {
    for (let j = 0; j < vertical[i].length; j++) {
      if (vertical[i][j]) continue;

      const x1 = offset + j * spacing;
      const y1 = offset + i * spacing;
      const x2 = x1;
      const y2 = offset + (i + 1) * spacing;

      const dist = distanciaLinea(x, y, x1, y1, x2, y2);

      if (dist < minDist) {
        minDist = dist;
        mejor = {
          tipo: "V",
          fila: i,
          col: j
        };
      }
    }
  }

  return mejor;
}

function esMismaLinea(lineaA, lineaB) {
  if (!lineaA && !lineaB) return true;
  if (!lineaA || !lineaB) return false;

  return (
    lineaA.tipo === lineaB.tipo &&
    lineaA.fila === lineaB.fila &&
    lineaA.col === lineaB.col
  );
}

function limpiarPreviewMovimiento() {
  if (!lineaPreview) return;

  lineaPreview = null;
  dibujar();
}

function dibujarPreviewMovimiento() {
  if (!lineaPreview || !esTurnoDelJugadorActual()) return;

  const color = obtenerColorJugador(jugadorId);

  let x1;
  let y1;
  let x2;
  let y2;

  if (lineaPreview.tipo === "H") {
    x1 = offset + lineaPreview.col * spacing;
    y1 = offset + lineaPreview.fila * spacing;
    x2 = offset + (lineaPreview.col + 1) * spacing;
    y2 = y1;
  } else {
    x1 = offset + lineaPreview.col * spacing;
    y1 = offset + lineaPreview.fila * spacing;
    x2 = x1;
    y2 = offset + (lineaPreview.fila + 1) * spacing;
  }

  ctx.save();

  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = 9;
  ctx.lineCap = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
  ctx.lineWidth = 2;
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  ctx.restore();
}

canvas.addEventListener("mousemove", (e) => {
  if (!estado || !estado.tablero || !esTurnoDelJugadorActual()) {
    limpiarPreviewMovimiento();
    return;
  }

  const nuevaPreview = obtenerLineaMasCercana(e.offsetX, e.offsetY);

  if (esMismaLinea(lineaPreview, nuevaPreview)) return;

  lineaPreview = nuevaPreview;
  dibujar();
});

canvas.addEventListener("mouseleave", () => {
  limpiarPreviewMovimiento();
});

// Detectar clics
canvas.addEventListener("click", async (e) => {
  if (!estado || !estado.tablero) {
    mostrarMensajeJuego("La partida todavía no está lista.", "warning");
    return;
  }

  if (estado.terminado) {
    mostrarMensajeJuego("La partida ya terminó. Revisa el resultado final.", "warning");
    return;
  }

  const jugadorTurno = obtenerJugadorTurnoActual();

  if (!jugadorTurno) {
    mostrarMensajeJuego("La partida está esperando jugadores.", "warning");
    return;
  }

  if (!esTurnoDelJugadorActual()) {
    mostrarMensajeJuego(
      `No es tu turno. Espera a que juegue ${jugadorTurno.nombre}.`,
      "warning"
    );
    return;
  }

  const x = e.offsetX;
  const y = e.offsetY;

  const mejor = obtenerLineaMasCercana(x, y);

  if (!mejor) {
    mostrarMensajeJuego("Selecciona una línea disponible del tablero.", "warning");
    return;
  }

  lineaPreview = null;
  dibujar();

  const puntosAntes = obtenerPuntosJugadorActual();

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
      mostrarMensajeJuego("Error del servidor al registrar el movimiento.", "error");
      return;
    }

    const data = await res.json();

    console.log("Respuesta movimiento:", data);

    if (!data.ok) {
      mostrarMensajeJuego(data.error || "Movimiento rechazado.", "warning");
      await actualizarEstado();
      return;
    }

    await actualizarEstado();

    const puntosDespues = obtenerPuntosJugadorActual();

    if (puntosDespues > puntosAntes) {
      mostrarMensajeJuego(
        "¡Completaste un cuadro! Conservas el turno.",
        "success"
      );
    } else {
      mostrarMensajeJuego(
        "Movimiento registrado. Esperando el siguiente turno.",
        "success"
      );
    }

  } catch (error) {
    console.error("Error de red al enviar movimiento:", error);
    mostrarMensajeJuego("Error de red al enviar el movimiento.", "error");
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

function obtenerAudioMusica() {
  return document.getElementById("bgMusic");
}

function obtenerVolumenGuardado() {
  const volumenGuardado = localStorage.getItem(MUSIC_VOLUME_KEY);
  const volumen = volumenGuardado !== null ? Number(volumenGuardado) : 35;

  if (Number.isNaN(volumen)) return 35;

  return Math.min(100, Math.max(0, volumen));
}

function estaMusicaSilenciada() {
  return localStorage.getItem(MUSIC_MUTED_KEY) === "true";
}

function actualizarIconoMusica() {
  const audio = obtenerAudioMusica();
  const icono = document.getElementById("musicIcon");
  const control = document.getElementById("musicControl");

  if (!audio || !icono || !control) return;

  const estaSonando = musicaIniciada && !audio.paused && !audio.muted && audio.volume > 0;

  control.classList.toggle("is-muted", audio.muted || audio.volume === 0);
  control.classList.toggle("is-playing", estaSonando);

  if (audio.muted || audio.volume === 0) {
    icono.textContent = "🔇";
  } else if (estaSonando) {
    icono.textContent = "🔊";
  } else {
    icono.textContent = "♪";
  }
}

function inicializarMusica() {
  const audio = obtenerAudioMusica();
  const slider = document.getElementById("musicVolume");

  if (!audio) return;

  const volumen = obtenerVolumenGuardado();
  const silenciada = estaMusicaSilenciada();

  audio.volume = volumen / 100;
  audio.muted = silenciada;

  if (slider) {
    slider.value = volumen;
  }

  actualizarIconoMusica();
}

async function iniciarMusica() {
  const audio = obtenerAudioMusica();

  if (!audio) return false;

  try {
    if (audio.volume === 0) {
      audio.volume = 0.35;
      localStorage.setItem(MUSIC_VOLUME_KEY, "35");

      const slider = document.getElementById("musicVolume");
      if (slider) slider.value = 35;
    }

    audio.muted = false;
    localStorage.setItem(MUSIC_MUTED_KEY, "false");

    await audio.play();

    musicaIniciada = true;
    actualizarIconoMusica();

    return true;

  } catch (error) {
    console.warn("No se pudo reproducir la música:", error);
    actualizarIconoMusica();
    return false;
  }
}

async function toggleMusic() {
  const audio = obtenerAudioMusica();

  if (!audio) return;

  if (!musicaIniciada || audio.paused) {
    const iniciado = await iniciarMusica();

    if (iniciado) {
      mostrarMensajeJuego?.("Música activada.", "success");
    }

    return;
  }

  audio.muted = !audio.muted;
  localStorage.setItem(MUSIC_MUTED_KEY, String(audio.muted));

  actualizarIconoMusica();

  if (audio.muted) {
    mostrarMensajeJuego?.("Música silenciada.", "info");
  } else {
    mostrarMensajeJuego?.("Música activada.", "success");
  }
}

async function cambiarVolumenMusica(valor) {
  const audio = obtenerAudioMusica();

  if (!audio) return;

  const volumen = Math.min(100, Math.max(0, Number(valor)));

  audio.volume = volumen / 100;
  localStorage.setItem(MUSIC_VOLUME_KEY, String(volumen));

  if (volumen === 0) {
    audio.muted = true;
    localStorage.setItem(MUSIC_MUTED_KEY, "true");
  } else {
    audio.muted = false;
    localStorage.setItem(MUSIC_MUTED_KEY, "false");
  }

  if (!musicaIniciada || audio.paused) {
    await iniciarMusica();
  }

  actualizarIconoMusica();
}

function conectarControlesMusica() {
  const botonMusica = document.getElementById("musicToggle");
  const sliderMusica = document.getElementById("musicVolume");

  if (botonMusica) {
    botonMusica.addEventListener("click", toggleMusic);
  }

  if (sliderMusica) {
    sliderMusica.addEventListener("input", (e) => {
      cambiarVolumenMusica(e.target.value);
    });
  }
}

window.addEventListener("load", () => {
    cargarLeaderboard();
    inicializarMusica();
    conectarControlesMusica();
});
