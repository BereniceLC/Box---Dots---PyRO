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

        self.finalizada_por_abandono = False
        self.ganador_abandono_id = None

    # -------------------------------
    # AGREGAR JUGADOR
    # -------------------------------
    def agregar_jugador(self, nombre):
        with self.lock:
            nombre = (nombre or "").strip()

            if not nombre:
                return {"ok": False, "error": "Nombre de jugador inválido"}

            if self.esta_terminada():
                return {"ok": False, "error": "La partida ya terminó"}

            if any(
                j["nombre"].strip().lower() == nombre.lower()
                and j.get("activo", True)
                for j in self.jugadores
            ):
                return {"ok": False, "error": "Ese usuario ya está dentro de la sala"}

            jugadores_activos = self._jugadores_activos()

            if len(jugadores_activos) >= 4:
                return {"ok": False, "error": "Sala llena"}

            jugador_id = str(uuid.uuid4())

            color = self.COLORES[len(self.jugadores) % len(self.COLORES)]

            jugador = {
                "id": jugador_id,
                "nombre": nombre,
                "color": color,
                "puntos": 0,
                "activo": True,
                "abandono": False
            }

            self.jugadores.append(jugador)

            if len(self._jugadores_activos()) >= 2 and not self.iniciada:
                self.iniciada = True
                self.turno_actual = 0
                self._normalizar_turno()

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

    def _jugadores_activos(self):
        return [j for j in self.jugadores if j.get("activo", True)]

    def esta_terminada(self):
        return self.tablero.juego_terminado() or self.finalizada_por_abandono

    def _normalizar_turno(self):
        if not self.jugadores:
            self.turno_actual = 0
            return

        if self.turno_actual >= len(self.jugadores):
            self.turno_actual = 0

        if not self._jugadores_activos():
            self.turno_actual = 0
            return

        for _ in range(len(self.jugadores)):
            jugador_actual = self.jugadores[self.turno_actual]

            if jugador_actual.get("activo", True):
                return

            self.turno_actual = (self.turno_actual + 1) % len(self.jugadores)

    def _avanzar_turno(self):
        if not self.jugadores:
            self.turno_actual = 0
            return

        for _ in range(len(self.jugadores)):
            self.turno_actual = (self.turno_actual + 1) % len(self.jugadores)

            jugador_actual = self.jugadores[self.turno_actual]

            if jugador_actual.get("activo", True):
                return

    # -------------------------------
    # SALIR DE SALA / ABANDONAR
    # -------------------------------
    def salir_jugador(self, jugador_id):
        with self.lock:
            jugador = self._obtener_jugador(jugador_id)

            if not jugador:
                return {"ok": False, "error": "Jugador no encontrado"}

            # Si la partida todavía no inició, se remueve al jugador.
            if not self.iniciada:
                self.jugadores = [
                    j for j in self.jugadores
                    if j["id"] != jugador_id
                ]

                if self.turno_actual >= len(self.jugadores):
                    self.turno_actual = 0

                return {
                    "ok": True,
                    "mensaje": "Jugador salió de la sala",
                    "sala_vacia": len(self.jugadores) == 0,
                    "partida_terminada": False,
                    "registrar_resultado_global": False
                }

            # Si la partida ya estaba terminada, solo se confirma salida.
            if self.esta_terminada():
                jugador["activo"] = False
                jugador["abandono"] = True

                return {
                    "ok": True,
                    "mensaje": "Jugador salió de una partida ya finalizada",
                    "sala_vacia": len(self._jugadores_activos()) == 0,
                    "partida_terminada": True,
                    "registrar_resultado_global": False
                }

            # Si la partida ya inició, se marca como abandono.
            jugador["activo"] = False
            jugador["abandono"] = True

            activos = self._jugadores_activos()

            # Si queda un solo jugador, gana por abandono.
            if len(activos) == 1:
                ganador = activos[0]
                self.finalizada_por_abandono = True
                self.ganador_abandono_id = ganador["id"]
                self.turno_actual = self.jugadores.index(ganador)

                return {
                    "ok": True,
                    "mensaje": f"{ganador['nombre']} gana por abandono del rival",
                    "sala_vacia": False,
                    "partida_terminada": True,
                    "ganador": ganador,
                    "registrar_resultado_global": False
                }

            # Si no queda nadie activo, la sala queda vacía.
            if len(activos) == 0:
                self.finalizada_por_abandono = True
                self.ganador_abandono_id = None

                return {
                    "ok": True,
                    "mensaje": "La partida terminó porque todos abandonaron",
                    "sala_vacia": True,
                    "partida_terminada": True,
                    "registrar_resultado_global": False
                }

            # Si aún quedan varios jugadores activos, se ajusta el turno.
            self._normalizar_turno()

            return {
                "ok": True,
                "mensaje": "Jugador abandonó la partida",
                "sala_vacia": False,
                "partida_terminada": False,
                "registrar_resultado_global": False
            }

    # -------------------------------
    # HACER MOVIMIENTO
    # -------------------------------
    def hacer_movimiento(self, jugador_id, tipo, fila, col):
        with self.lock:
            if not self.iniciada:
                return {"ok": False, "error": "La partida no ha iniciado"}

            if self.esta_terminada():
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

            if not jugador.get("activo", True):
                return {"ok": False, "error": "Este jugador abandonó la partida"}

            if not self.jugadores:
                return {"ok": False, "error": "No hay jugadores"}

            self._normalizar_turno()

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
                self._avanzar_turno()

            self._normalizar_turno()

            turno = None

            if self.jugadores and not self.esta_terminada():
                turno = self.jugadores[self.turno_actual]["id"]

            return {
                "ok": True,
                "puntos_ganados": puntos,
                "cuadros": cuadros,
                "turno": turno,
                "juego_terminado": self.esta_terminada()
            }

    # -------------------------------
    # ESTADO DE LA SALA
    # -------------------------------
    def obtener_estado(self):
        with self.lock:
            self._normalizar_turno()

            turno = None

            if self.jugadores and not self.esta_terminada():
                turno = self.jugadores[self.turno_actual]["id"]

            ganador_abandono = None

            if self.ganador_abandono_id:
                ganador_abandono = self._obtener_jugador(self.ganador_abandono_id)

            mensaje_final = None

            if self.finalizada_por_abandono and ganador_abandono:
                mensaje_final = f"Ganador por abandono: {ganador_abandono['nombre']}"

            return {
                "id_sala": self.id_sala,
                "jugadores": self.jugadores,
                "turno": turno,
                "tablero": self.tablero.obtener_estado(),
                "iniciada": self.iniciada,
                "terminado": self.esta_terminada(),
                "motivo_final": "abandono" if self.finalizada_por_abandono else "tablero_completo",
                "ganador_abandono": ganador_abandono,
                "mensaje_final": mensaje_final,
                "registrar_resultado_global": not self.finalizada_por_abandono
            }