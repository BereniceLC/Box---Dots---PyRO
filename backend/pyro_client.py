import os
import time
import threading
import Pyro5.api


class PyroClient:
    def __init__(self):
        self.uri = None
        self.lock = threading.Lock()

        self.ns_host = os.getenv("APP_PYRO_NS_HOST", "127.0.0.1")
        self.ns_port = int(os.getenv("APP_PYRO_NS_PORT", "9090"))

    def _localizar_nameserver(self):
        for intento in range(20):
            try:
                print(f"[PyroClient] Buscando Name Server en {self.ns_host}:{self.ns_port}...")
                return Pyro5.api.locate_ns(
                    host=self.ns_host,
                    port=self.ns_port
                )
            except Exception as e:
                print(f"[PyroClient] Name Server no disponible. Intento {intento + 1}/20:", e)
                time.sleep(1)

        raise RuntimeError("No se pudo conectar al Name Server de Pyro")

    def _resolver_uri(self):
        if self.uri is not None:
            return self.uri

        with self.lock:
            if self.uri is not None:
                return self.uri

            ns = self._localizar_nameserver()

            for intento in range(30):
                try:
                    print(f"[PyroClient] Buscando objeto game.manager. Intento {intento + 1}/30...")
                    self.uri = ns.lookup("game.manager")
                    print("[PyroClient] URI encontrada:", self.uri)
                    return self.uri

                except Exception as e:
                    print(f"[PyroClient] game.manager aún no disponible:", e)
                    time.sleep(1)

            raise RuntimeError("No se encontró el objeto Pyro game.manager")

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