import os
import time
import Pyro5.api
from game_manager import GameManager


def localizar_nameserver(ns_host, ns_port):
    for intento in range(20):
        try:
            print(f"[Pyro Server] Buscando Name Server en {ns_host}:{ns_port}...")
            return Pyro5.api.locate_ns(
                host=ns_host,
                port=ns_port
            )
        except Exception as e:
            print(f"[Pyro Server] Name Server no disponible. Intento {intento + 1}/20:", e)
            time.sleep(1)

    raise RuntimeError("No se pudo conectar al Name Server de Pyro")


def main():
    ns_host = os.getenv("APP_PYRO_NS_HOST", "127.0.0.1")
    ns_port = int(os.getenv("APP_PYRO_NS_PORT", "9090"))

    pyro_host = os.getenv("APP_PYRO_HOST", "127.0.0.1")
    pyro_port = int(os.getenv("APP_PYRO_PORT", "50010"))

    daemon = Pyro5.api.Daemon(
        host=pyro_host,
        port=pyro_port
    )

    ns = localizar_nameserver(ns_host, ns_port)

    game_manager = GameManager()
    uri = daemon.register(game_manager)

    ns.register("game.manager", uri, safe=False)

    print("Servidor Pyro corriendo...")
    print("URI:", uri)

    daemon.requestLoop()


if __name__ == "__main__":
    main()