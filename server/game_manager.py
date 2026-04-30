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
            "id_sala": id_sala,
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
    # OBTENER SALA
    # -------------------------------
    def obtener_estado(self, id_sala):
        sala = self.salas[id_sala]

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
            "turno": sala.turno_actual.id,
            "tablero": sala.tablero.obtener_estado()
        }