import secrets 
import string
import Pyro5.api

from sala import Sala


@Pyro5.api.expose
class GameManager:
    def __init__(self):
        self.salas = {}
    def generar_codigo_sala(self):
        caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

        while True:
         codigo = "".join(secrets.choice(caracteres) for _ in range(6))

         if codigo not in self.salas:
            return codigo
         
    # -------------------------------
    # CREAR SALA
    # -------------------------------
    def crear_sala(self, nombre_jugador):
        id_sala = self.generar_codigo_sala()

        sala = Sala(id_sala)

        resultado = sala.agregar_jugador(nombre_jugador)

        self.salas[id_sala] = sala
        return {
            "ok": True,
            "id_sala": id_sala,  #  cambiado (ANTES id_sala)
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
        return sala.obtener_estado()

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