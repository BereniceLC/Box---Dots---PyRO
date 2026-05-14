from pymongo import MongoClient

MONGO_URI = "mongodb://127.0.0.1:27017"

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)

try:
    client.admin.command("ping")
    print("Conexión correcta a MongoDB local")

    db = client["boxdots_pyro"]
    print("Base seleccionada:", db.name)

except Exception as e:
    print("Error conectando a MongoDB local:")
    print(e)
    