import uuid
import Pyro5.api

from sala import Sala


@Pyro5.api.expose
class GameManager:
    def __init__(self):
        self.salas = {}

    # -------------------------------
    # CREAR SALA
    # -------------------------------
    def crear_sala(self, nombre_jugador):
        id_sala = str(uuid.uuid4())

        sala = Sala(id_sala)
        self.salas[id_sala] = sala

        resultado = sala.agregar_jugador(nombre_jugador)

        return {
            "ok": True,
            "id": id_sala,  # 🔥 cambiado (ANTES id_sala)
            "jugador": resultado["jugador"]
        }

    # -------------------------------
    # UNIRSE A SALA
    # -------------------------------
    def unirse_sala(self, id_sala, nombre_jugador):
        sala = self.salas.get(id_sala)

        if not sala:
            return {"ok": False, "error": "Sala no existe"}

        return sala.agregar_jugador(nombre_jugador)

    # -------------------------------
    # OBTENER ESTADO
    # -------------------------------
    def obtener_estado(self, id_sala):
        sala = self.salas.get(id_sala)

        if not sala:
            return {"ok": False, "error": "Sala no existe"}

        return {
            "id_sala": sala.id,
            "jugadores": [
                {
                    "id": j.id,
                    "nombre": j.nombre,
                    "color": j.color,
                    "puntos": j.puntos
                } for j in sala.jugadores
            ],
            "turno": sala.turno_actual.id if sala.turno_actual else None,
            "tablero": sala.tablero.obtener_estado()
        }

    # -------------------------------
    # 🔥 NUEVO — HACER MOVIMIENTO
    # -------------------------------
    def hacer_movimiento(self, id_sala, jugador_id, tipo, fila, col):
        sala = self.salas.get(id_sala)

        if not sala:
            return {"ok": False, "error": "Sala no existe"}

        try:
            resultado = sala.hacer_movimiento(
                jugador_id,
                tipo,
                fila,
                col
            )
            return resultado

        except Exception as e:
            return {"ok": False, "error": str(e)}