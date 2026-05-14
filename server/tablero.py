class Tablero:
    def __init__(self, filas=9, columnas=9):
        self.filas = filas
        self.columnas = columnas

        self.horizontal = [[None for _ in range(columnas - 1)] for _ in range(filas)]
        self.vertical = [[None for _ in range(columnas)] for _ in range(filas - 1)]
        self.boxes = [[None for _ in range(columnas - 1)] for _ in range(filas - 1)]

    # -------------------------------
    # VALIDACIÓN DE MOVIMIENTO
    # -------------------------------
    def movimiento_valido(self, tipo, fila, col):
        if tipo == "horizontal":
            if fila < 0 or fila >= self.filas or col < 0 or col >= self.columnas - 1:
                return False
            return self.horizontal[fila][col] is None

        elif tipo == "vertical":
            if fila < 0 or fila >= self.filas - 1 or col < 0 or col >= self.columnas:
                return False
            return self.vertical[fila][col] is None

        return False

    # -------------------------------
    # HACER MOVIMIENTO
    # -------------------------------
    def hacer_movimiento(self, tipo, fila, col, jugador_id):
        # Normalizar tipo
        if tipo in ["H", "h"]:
            tipo = "horizontal"
        elif tipo in ["V", "v"]:
            tipo = "vertical"

        # Validación básica
        if not isinstance(fila, int) or not isinstance(col, int):
            return {"ok": False, "error": "Fila/col inválidas"}

        if tipo not in ["horizontal", "vertical"]:
            return {"ok": False, "error": "Tipo inválido"}

        if not self.movimiento_valido(tipo, fila, col):
            return {
                "ok": False,
                "error": "Movimiento inválido"
            }

        # Marcar línea
        if tipo == "horizontal":
            self.horizontal[fila][col] = jugador_id
        else:
            self.vertical[fila][col] = jugador_id

        # Verificar cuadros
        cuadros_completados = self._verificar_cuadros(tipo, fila, col, jugador_id)

        return {
            "ok": True,
            "cuadros": cuadros_completados,
            "puntos": len(cuadros_completados)
        }

    # -------------------------------
    # VERIFICAR CUADROS
    # -------------------------------
    def _verificar_cuadros(self, tipo, fila, col, jugador_id):
        completados = []

        if tipo == "horizontal":
            # arriba
            if fila > 0 and self._es_cuadro_completo(fila - 1, col):
                if self.boxes[fila - 1][col] is None:
                    self.boxes[fila - 1][col] = jugador_id
                    completados.append((fila - 1, col))

            # abajo
            if fila < self.filas - 1 and self._es_cuadro_completo(fila, col):
                if self.boxes[fila][col] is None:
                    self.boxes[fila][col] = jugador_id
                    completados.append((fila, col))

        elif tipo == "vertical":
            # izquierda
            if col > 0 and self._es_cuadro_completo(fila, col - 1):
                if self.boxes[fila][col - 1] is None:
                    self.boxes[fila][col - 1] = jugador_id
                    completados.append((fila, col - 1))

            # derecha
            if col < self.columnas - 1 and self._es_cuadro_completo(fila, col):
                if self.boxes[fila][col] is None:
                    self.boxes[fila][col] = jugador_id
                    completados.append((fila, col))

        return completados

    # -------------------------------
    # VERIFICAR SI UN CUADRO ESTÁ COMPLETO
    # -------------------------------
    def _es_cuadro_completo(self, fila, col):
        try:
            return (
                self.horizontal[fila][col] is not None and
                self.horizontal[fila + 1][col] is not None and
                self.vertical[fila][col] is not None and
                self.vertical[fila][col + 1] is not None and
                self.boxes[fila][col] is None
            )
        except IndexError:
            return False

    # -------------------------------
    # ESTADO DEL TABLERO
    # -------------------------------
    def obtener_estado(self):
        return {
            "horizontal": self.horizontal,
            "vertical": self.vertical,
            "boxes": self.boxes
        }

    # -------------------------------
    # VERIFICAR SI TERMINÓ EL JUEGO
    # -------------------------------
    def juego_terminado(self):
        for fila in self.boxes:
            for box in fila:
                if box is None:
                    return False
        return True