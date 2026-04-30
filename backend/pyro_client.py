import Pyro5.api


class PyroClient:

    def _get_proxy(self):
        try:
            ns = Pyro5.api.locate_ns()
            uri = ns.lookup("game.manager")
            return Pyro5.api.Proxy(uri)
        except Exception as e:
            print("ERROR PyRO conexión:", e)
            raise


    def crear_sala(self, nombre):
        with self._get_proxy() as proxy:
            return proxy.crear_sala(nombre)


    def unirse_sala(self, id_sala, nombre):
        with self._get_proxy() as proxy:
            return proxy.unirse_sala(id_sala, nombre)


    def obtener_estado(self, id_sala):
        with self._get_proxy() as proxy:
            return proxy.obtener_estado(id_sala)


    # ✅ CORREGIDO — ya no accede a objeto sala directo
    def hacer_movimiento(self, id_sala, jugador_id, tipo, fila, col):
        with self._get_proxy() as proxy:
            return proxy.hacer_movimiento(
                id_sala,
                jugador_id,
                tipo,
                fila,
                col
            )