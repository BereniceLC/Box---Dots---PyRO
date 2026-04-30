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

            if len(self.jugadores) >= 2:
                self.iniciada = True
                self.turno_actual = 0  # asegurar inicio consistente

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

            if self.tablero.juego_terminado():
                return {"ok": False, "error": "El juego ya terminó"}

            if tipo in ["H", "h"]:
                tipo = "horizontal" 
            elif tipo in ["V", "v"]:
                tipo = "vertical"

            if tipo not in ["horizontal", "vertical"]:
                return {"ok": False, "error": "Tipo inválido"}

            if not isinstance(fila, int) or not isinstance(col, int):
                return {"ok": False, "error": "Fila/col inválidas"}

            jugador = self._obtener_jugador(jugador_id)
            if not jugador:
                return {"ok": False, "error": "Jugador no encontrado"}

            if not self.jugadores:
                return {"ok": False, "error": "No hay jugadores"}

            jugador_actual = self.jugadores[self.turno_actual]

            if jugador_actual["id"] != jugador_id:
                return {"ok": False, "error": "No es tu turno"}

            resultado = self.tablero.hacer_movimiento(tipo, fila, col, jugador_id)

            if not resultado["ok"]:
                return resultado

            puntos = resultado["puntos"]
            cuadros = resultado["cuadros"]

            if puntos > 0:
                jugador["puntos"] += puntos
            else:
                if len(self.jugadores) > 0:
                    self.turno_actual = (self.turno_actual + 1) % len(self.jugadores)

            return {
                "ok": True,
                "puntos_ganados": puntos,
                "cuadros": cuadros,
                "turno": self.jugadores[self.turno_actual]["id"] if self.jugadores else None,
                "juego_terminado": self.tablero.juego_terminado()
            }

    # -------------------------------
    # ESTADO DE LA SALA
    # -------------------------------
    def obtener_estado(self):
        with self.lock:
            turno = None
            if self.jugadores and self.turno_actual < len(self.jugadores):
                turno = self.jugadores[self.turno_actual]["id"]

            return {
                "id_sala": self.id_sala,
                "jugadores": self.jugadores,
                "turno": turno,
                "tablero": self.tablero.obtener_estado(),
                "iniciada": self.iniciada,
                "terminado": self.tablero.juego_terminado()
            }