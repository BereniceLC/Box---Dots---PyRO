import Pyro5.api
from game_manager import GameManager


def main():
    daemon = Pyro5.api.Daemon(host="127.0.0.1")
    ns = Pyro5.api.locate_ns(host="127.0.0.1")

    game_manager = GameManager()

    uri = daemon.register(game_manager)
    ns.register("game.manager", uri)

    print("Servidor Pyro corriendo...")
    daemon.requestLoop()


if __name__ == "__main__":
    main()