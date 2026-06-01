import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from pyro_client import PyroClient

from mongo_store import (
    inicializar_indices,
    autenticar_o_registrar,
    obtener_leaderboard,
    registrar_resultado_partida
)

app = Flask(__name__)

# CORS correcto (no duplicado)
CORS(app)

# Cliente PyRO
pyro = PyroClient()

try:
    inicializar_indices()
    print("[MongoDB] Índices inicializados correctamente")
except Exception as e:
    print("[MongoDB] No se pudieron inicializar los índices:", e)


@app.route("/")
def home():
    return jsonify({"mensaje": "Backend funcionando"})


# ✅ Crear sala (ahora SOLO con PyRO)
@app.route("/crear_sala", methods=["POST"])
def crear_sala():
    try:
        data = request.get_json() or {}
        nombre = data.get("nombre", "Jugador")

        resultado = pyro.crear_sala(nombre)

        return jsonify(resultado)

    except Exception as e:
        print("ERROR crear_sala:", e)
        return jsonify({"error": str(e)}), 500


# ✅ Unirse a sala
@app.route("/unirse_sala", methods=["POST"])
def unirse():
    try:
        data = request.get_json()

        if not data or "id_sala" not in data or "nombre" not in data:
            return jsonify({"error": "Datos incompletos"}), 400

        resultado = pyro.unirse_sala(data["id_sala"], data["nombre"])

        return jsonify(resultado)

    except Exception as e:
        print("ERROR unirse:", e)
        return jsonify({"error": str(e)}), 500


# ✅ Obtener estado (desde PyRO, no local)
@app.route("/estado/<id_sala>", methods=["GET"])
def estado(id_sala):
    inicio = time.time()

    try:
        estado = pyro.obtener_estado(id_sala)
        fin = time.time()
        print(f"[TIEMPO] /estado/{id_sala} tardó {fin - inicio:.3f} segundos")

        return jsonify(estado)

    except Exception as e:
        fin = time.time()
        print(f"[ERROR estado] tardó {fin - inicio:.3f} segundos")
        return jsonify({"error": str(e)}), 500


# ✅ Movimiento (validado + PyRO)
@app.route("/movimiento", methods=["POST"])
def movimiento():
    inicio = time.time()

    try:
        data = request.get_json()

        required = ["id_sala", "jugador_id", "tipo", "fila", "col"]
        if not data or not all(k in data for k in required):
            return jsonify({"error": "Datos incompletos"}), 400

        resultado = pyro.hacer_movimiento(
            data["id_sala"],
            data["jugador_id"],
            data["tipo"],
            data["fila"],
            data["col"]
        )
        fin = time.time()
        print(f"[TIEMPO] /movimiento tardó {fin - inicio:.3f} segundos")

        return jsonify(resultado)

    except Exception as e:
        fin = time.time()
        print(f"[ERROR movimiento] tardó {fin - inicio:.3f} segundos")
        return jsonify({"error": str(e)}), 500

@app.route("/salir_sala", methods=["POST"])
def salir_sala():
    try:
        data = request.get_json() or {}

        id_sala = data.get("id_sala")
        jugador_id = data.get("jugador_id")

        if not id_sala or not jugador_id:
            return jsonify({
                "ok": False,
                "error": "Faltan datos para salir de la sala"
            }), 400

        resultado = pyro.salir_sala(id_sala, jugador_id)

        status = 200 if resultado.get("ok") else 400

        return jsonify(resultado), status

    except Exception as e:
        print("ERROR salir_sala:", e)
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/auth", methods=["POST"])
def auth():
    try:
        data = request.get_json() or {}

        username = data.get("username", "")
        password = data.get("password", "")

        resultado = autenticar_o_registrar(username, password)

        status = 200 if resultado.get("ok") else 400
        return jsonify(resultado), status

    except Exception as e:
        print("ERROR auth:", e)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/leaderboard", methods=["GET"])
def leaderboard():
    try:
        limit = int(request.args.get("limit", 10))
        datos = obtener_leaderboard(limit)

        return jsonify({
            "ok": True,
            "leaderboard": datos
        })

    except Exception as e:
        print("ERROR leaderboard:", e)
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/registrar_resultado", methods=["POST"])
def registrar_resultado():
    try:
        data = request.get_json() or {}
        id_sala = data.get("id_sala")

        if not id_sala:
            return jsonify({"ok": False, "error": "Falta id_sala"}), 400

        estado = pyro.obtener_estado(id_sala)

        if estado.get("registrar_resultado_global") is False:
            return jsonify({
                "ok": True,
                "registrado": False,
                "mensaje": "La partida terminó por abandono y no suma puntos al ranking"
            }), 200

        if not estado.get("terminado"):
            return jsonify({
                "ok": False,
                "error": "La partida todavía no ha terminado"
            }), 400

        jugadores = estado.get("jugadores", [])

        resultado = registrar_resultado_partida(id_sala, jugadores)

        status = 200 if resultado.get("ok") else 400
        return jsonify(resultado), status

    except Exception as e:
        print("ERROR registrar_resultado:", e)
        return jsonify({"ok": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)