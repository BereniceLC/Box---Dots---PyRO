let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

let idSala = null;
let jugadorId = null;
let estado = null;

const spacing = 60;
const offset = 50;
const API_URL = "http://26.2.172.238:5000"; // Cambia esto a tu IP y puerto

async function crearSala() {
    const nombre = document.getElementById("nombre").value;

    const res = await fetch(`${API_URL}/crear_sala`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ nombre })
    });

    if (!res.ok) {
    const text = await res.text(); // para ver el error real (HTML o JSON roto)
    console.error("Error del servidor:", text);
    return; // evita que intente hacer res.json()
    }

    const data = await res.json();

    idSala = data.id_sala;
    jugadorId = data.jugador.id;

    console.log("Sala creada:", data);

    actualizarEstado();
    if(!window.intervaloEstado) {
        window.intervaloEstado = setInterval(actualizarEstado, 1000);
    }
}

async function unirseSala() {
    const nombre = document.getElementById("nombre").value.trim();
    const id = document.getElementById("idSalaInput").value.trim();

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

    console.log("Unido a sala:", idSala);
    console.log("Jugador:", jugadorId);

    actualizarEstado();

    if (!window.intervaloEstado) {
        window.intervaloEstado = setInterval(actualizarEstado, 1000);
    }
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

    } catch (error) {
        console.error("Error de red al actualizar estado:", error);
    }
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

function dibujar() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!estado) return;

    const { horizontal, vertical, boxes } = estado.tablero;

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