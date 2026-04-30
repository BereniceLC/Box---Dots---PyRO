import threading
import uuid
from tablero import Tablero


class Sala:
    COLORES = ["rojo", "azul", "morado", "verde"]

    def __init__(self, id_sala):
        self.id_sala = id_sala
        self.tablero = Tablero()

        self.jugadores = []
        self.turno_actual = 0

        self.lock = threading.Lock()
        self.iniciada = False

    # -------------------------------
    # AGREGAR JUGADOR
    # -------------------------------
    def agregar_jugador(self, nombre):
        with self.lock:
            if len(self.jugadores) >= 4:
                return {"ok": False, "error": "Sala llena"}

            jugador_id = str(uuid.uuid4())
            color = self.COLORES[len(self.jugadores)]

            jugador = {
                "id": jugador_id,
                "nombre": nombre,
                "color": color,
                "puntos": 0
            }

            self.jugadores.append(jugador)

            # Iniciar automáticamente cuando haya al menos 2 jugadores
            if len(self.jugadores) >= 2:
                self.iniciada = True

            return {
                "ok": True,
                "jugador": jugador
            }

    # -------------------------------
    # OBTENER JUGADOR
    # -------------------------------
    def _obtener_jugador(self, jugador_id):
        for j in self.jugadores:
            if j["id"] == jugador_id:
                return j
        return None

    # -------------------------------
    # HACER MOVIMIENTO
    # -------------------------------
    def hacer_movimiento(self, jugador_id, tipo, fila, col):
        with self.lock:
            if not self.iniciada:
                return {"ok": False, "error": "La partida no ha iniciado"}

            jugador = self._obtener_jugador(jugador_id)
            if not jugador:
                return {"ok": False, "error": "Jugador no encontrado"}

            jugador_actual = self.jugadores[self.turno_actual]

            if jugador_actual["id"] != jugador_id:
                return {"ok": False, "error": "No es tu turno"}

            resultado = self.tablero.hacer_movimiento(tipo, fila, col, jugador_id)

            if not resultado["ok"]:
                return resultado

            cuadros = resultado["cuadros"]
            puntos = resultado["puntos"]

            # Sumar puntos
            if puntos > 0:
                jugador["puntos"] += puntos
            else:
                # Cambiar turno solo si no hizo punto
                self.turno_actual = (self.turno_actual + 1) % len(self.jugadores)

            return {
                "ok": True,
                "puntos_ganados": puntos,
                "cuadros": cuadros,
                "turno": self.jugadores[self.turno_actual]["id"],
                "juego_terminado": self.tablero.juego_terminado()
            }

    # -------------------------------
    # ESTADO DE LA SALA
    # -------------------------------
    def obtener_estado(self):
        return {
            "id_sala": self.id_sala,
            "jugadores": self.jugadores,
            "turno": self.jugadores[self.turno_actual]["id"] if self.jugadores else None,
            "tablero": self.tablero.obtener_estado(),
            "iniciada": self.iniciada,
            "terminado": self.tablero.juego_terminado()
        }