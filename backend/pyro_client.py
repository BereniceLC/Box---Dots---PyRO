import threading
import Pyro5.api


class PyroClient:
    def __init__(self):
        self.uri = None
        self.lock = threading.Lock()

    def _resolver_uri(self):
        if self.uri is not None:
            return self.uri

        with self.lock:
            if self.uri is None:
                print("[PyroClient] Buscando Name Server...")
                ns = Pyro5.api.locate_ns()
                self.uri = ns.lookup("game.manager")
                print("[PyroClient] URI encontrada:", self.uri)

        return self.uri

    def _llamar(self, metodo, *args):
        try:
            uri = self._resolver_uri()

            with Pyro5.api.Proxy(uri) as proxy:
                funcion = getattr(proxy, metodo)
                return funcion(*args)

        except Exception as e:
            print("[PyroClient] Error, reiniciando URI:", e)

            with self.lock:
                self.uri = None

            uri = self._resolver_uri()

            with Pyro5.api.Proxy(uri) as proxy:
                funcion = getattr(proxy, metodo)
                return funcion(*args)

    def crear_sala(self, nombre):
        return self._llamar("crear_sala", nombre)

    def unirse_sala(self, id_sala, nombre):
        return self._llamar("unirse_sala", id_sala, nombre)

    def obtener_estado(self, id_sala):
        return self._llamar("obtener_estado", id_sala)

    def hacer_movimiento(self, id_sala, jugador_id, tipo, fila, col):
        return self._llamar(
            "hacer_movimiento",
            id_sala,
            jugador_id,
            tipo,
            fila,
            col
        )