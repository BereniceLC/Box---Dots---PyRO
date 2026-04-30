import Pyro5.api

#from backend.app import estado


class PyroClient:

    def _get_proxy(self):
        uri = Pyro5.api.locate_ns().lookup("game.manager")
        return Pyro5.api.Proxy(uri)

    def crear_sala(self, nombre):
        with self._get_proxy() as proxy:
            return proxy.crear_sala(nombre)

    def unirse_sala(self, id_sala, nombre):
        with self._get_proxy() as proxy:
            return proxy.unirse_sala(id_sala, nombre)

    def obtener_estado(self, id_sala):
        with self._get_proxy() as proxy:
            estado = proxy.obtener_estado(id_sala)
            return estado

    def hacer_movimiento(self, id_sala, jugador_id, tipo, fila, col):
        with self._get_proxy() as proxy:
            sala = proxy.obtener_sala(id_sala)
            return sala.hacer_movimiento(jugador_id, tipo, fila, col)