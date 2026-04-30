from flask import Flask, request, jsonify
from flask_cors import CORS
from pyro_client import PyroClient

app = Flask(__name__)

# CORS correcto (no duplicado)
CORS(app, resources={r"/*": {"origins": "http://127.0.0.1:5500"}})

# Cliente PyRO
pyro = PyroClient()


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
    try:
        estado = pyro.obtener_estado(id_sala)
        return jsonify(estado)

    except Exception as e:
        print("ERROR estado:", e)
        return jsonify({"error": str(e)}), 500


# ✅ Movimiento (validado + PyRO)
@app.route("/movimiento", methods=["POST"])
def movimiento():
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

        return jsonify(resultado)

    except Exception as e:
        print("ERROR movimiento:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)