from flask import Flask, request, jsonify
from flask_cors import CORS
from pyro_client import PyroClient
from flask import jsonify
import uuid

salas = {}

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://127.0.0.1:5500"}})

pyro = PyroClient()

@app.route("/")
def home():
    return {"mensaje": "Backend funcionando"}

@app.route("/crear_sala", methods=["POST"])
def crear_sala():
    id_sala = str(uuid.uuid4())

    salas[id_sala] = {
        "horizontal": [],
        "vertical": [],
        "boxes": []
    }

    return {"id_sala": id_sala}

@app.route("/unirse_sala", methods=["POST"])
def unirse():
    data = request.json
    return jsonify(pyro.unirse_sala(data["id_sala"], data["nombre"]))


#@app.route("/estado/<id_sala>", methods=["GET"])
#def estado(id_sala):
#    return jsonify(pyro.obtener_estado(id_sala))

@app.route("/estado/<id_sala>")
def estado(id_sala):
    try:
        if id_sala not in salas:
            return {"error": "Sala no existe"}, 404

        estado = salas[id_sala]
        return jsonify(estado)

    except Exception as e:
        print("ERROR:", e)
        return {"error": str(e)}, 500

@app.route("/movimiento", methods=["POST"])
def movimiento():
    data = request.json
    return jsonify(
        pyro.hacer_movimiento(
            data["id_sala"],
            data["jugador_id"],
            data["tipo"],
            data["fila"],
            data["col"]
        )
    )

if __name__ == "__main__":
    app.run(debug=True)