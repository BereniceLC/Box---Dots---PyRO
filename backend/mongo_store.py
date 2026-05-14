from datetime import datetime, timezone

from pymongo import MongoClient, DESCENDING, ASCENDING
from pymongo.errors import DuplicateKeyError
from werkzeug.security import generate_password_hash, check_password_hash

import os

MONGO_URI = os.getenv("MONGO_URI") or "mongodb://127.0.0.1:27017"
MONGO_DB = os.getenv("MONGO_DB") or "boxdots_pyro"

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
db = client[MONGO_DB]

usuarios = db["usuarios"]
partidas = db["partidas"]


def ahora():
    return datetime.now(timezone.utc)


def inicializar_indices():
    usuarios.create_index("username_lower", unique=True)


def limpiar_username(username):
    return username.strip()


def usuario_publico(usuario):
    return {
        "username": usuario.get("username"),
        "total_points": usuario.get("total_points", 0),
        "games_played": usuario.get("games_played", 0),
        "wins": usuario.get("wins", 0),
        "draws": usuario.get("draws", 0),
        "losses": usuario.get("losses", 0)
    }


def autenticar_o_registrar(username, password):
    username = limpiar_username(username)
    password = password.strip()

    if len(username) < 3:
        return {"ok": False, "error": "El usuario debe tener al menos 3 caracteres"}

    if len(password) < 4:
        return {"ok": False, "error": "La contraseña debe tener al menos 4 caracteres"}

    username_lower = username.lower()
    fecha = ahora()

    usuario = usuarios.find_one({"username_lower": username_lower})

    if usuario:
        password_hash = usuario.get("password_hash")

        if not check_password_hash(password_hash, password):
            return {""
            "ok": False,
            "error": "Ese nombre de usuario ya existe.Usa la contraseña correcta o elige otro usuario"
            }

        usuarios.update_one(
            {"username_lower": username_lower},
            {"$set": {"last_login": fecha}}
        )

        return {
            "ok": True,
            "usuario": usuario_publico(usuario)
        }

    nuevo_usuario = {
        "username": username,
        "username_lower": username_lower,
        "password_hash": generate_password_hash(password),
        "total_points": 0,
        "games_played": 0,
        "wins": 0,
        "draws": 0,
        "losses": 0,
        "created_at": fecha,
        "updated_at": fecha,
        "last_login": fecha
    }

    try:
        usuarios.insert_one(nuevo_usuario)
    except DuplicateKeyError:
        return {"ok": False, "error": "Ese usuario ya existe"}

    return {
        "ok": True,
        "usuario": usuario_publico(nuevo_usuario)
    }


def obtener_leaderboard(limit=10):
    cursor = (
        usuarios
        .find(
            {},
            {
                "_id": 0,
                "username": 1,
                "total_points": 1,
                "games_played": 1,
                "wins": 1,
                "draws": 1,
                "losses": 1
            }
        )
        .sort([
            ("total_points", DESCENDING),
            ("wins", DESCENDING),
            ("games_played", ASCENDING)
        ])
        .limit(limit)
    )

    return list(cursor)


def registrar_resultado_partida(id_sala, jugadores):
    if not id_sala:
        return {"ok": False, "error": "ID de sala inválido"}

    if not jugadores:
        return {"ok": False, "error": "No hay jugadores para registrar"}

    fecha = ahora()
    jugadores_limpios = []

    for jugador in jugadores:
        username = limpiar_username(jugador.get("nombre", ""))
        puntos = int(jugador.get("puntos", 0))

        if not username:
            continue

        jugadores_limpios.append({
            "username": username,
            "username_lower": username.lower(),
            "points": puntos
        })

    if not jugadores_limpios:
        return {"ok": False, "error": "No hay usuarios válidos para registrar"}

    max_puntos = max(j["points"] for j in jugadores_limpios)
    ganadores = [j for j in jugadores_limpios if j["points"] == max_puntos]
    ganadores_lower = {j["username_lower"] for j in ganadores}
    empate = len(ganadores) > 1

    documento_partida = {
        "_id": id_sala,
        "room_id": id_sala,
        "players": jugadores_limpios,
        "winners": [j["username"] for j in ganadores],
        "max_points": max_puntos,
        "draw": empate,
        "created_at": fecha
    }

    try:
        partidas.insert_one(documento_partida)
    except DuplicateKeyError:
        return {
            "ok": True,
            "registrado": False,
            "mensaje": "Esta partida ya había sido registrada"
        }

    for jugador in jugadores_limpios:
        inc = {
            "total_points": jugador["points"],
            "games_played": 1
        }

        if jugador["username_lower"] in ganadores_lower:
            if empate:
                inc["draws"] = 1
            else:
                inc["wins"] = 1
        else:
            inc["losses"] = 1

        usuarios.update_one(
            {"username_lower": jugador["username_lower"]},
            {
                "$inc": inc,
                "$set": {
                    "updated_at": fecha
                }
            }
        )

    return {
        "ok": True,
        "registrado": True,
        "ganadores": [j["username"] for j in ganadores],
        "max_points": max_puntos,
        "draw": empate
    }