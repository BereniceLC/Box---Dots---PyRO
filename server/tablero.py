class Tablero:
    def __init__(self, filas=6, columnas=8):
        # PUNTOS
        self.filas = filas
        self.columnas = columnas

        # LÍNEAS
        self.horizontal = [[None for _ in range(columnas - 1)] for _ in range(filas)]
        self.vertical = [[None for _ in range(columnas)] for _ in range(filas - 1)]

        # CUADROS
        self.boxes = [[None for _ in range(columnas - 1)] for _ in range(filas - 1)]

    # -------------------------------
    # VALIDACIÓN DE MOVIMIENTO
    # -------------------------------
    def movimiento_valido(self, tipo, fila, col):
        if tipo == "H":
            if fila < 0 or fila >= self.filas or col < 0 or col >= self.columnas - 1:
                return False
            return self.horizontal[fila][col] is None

        elif tipo == "V":
            if fila < 0 or fila >= self.filas - 1 or col < 0 or col >= self.columnas:
                return False
            return self.vertical[fila][col] is None

        return False

    # -------------------------------
    # HACER MOVIMIENTO
    # -------------------------------
    def hacer_movimiento(self, tipo, fila, col, jugador_id):
        if not self.movimiento_valido(tipo, fila, col):
            return {
                "ok": False,
                "error": "Movimiento inválido"
            }

        # Marcar línea
        if tipo == "H":
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

        if tipo == "H":
            # Cuadro - arriba
            if fila > 0:
                if self._es_cuadro_completo(fila - 1, col):
                    self.boxes[fila - 1][col] = jugador_id
                    completados.append((fila - 1, col))

            # Cuadro - abajo
            if fila < self.filas - 1:
                if self._es_cuadro_completo(fila, col):
                    self.boxes[fila][col] = jugador_id
                    completados.append((fila, col))

        elif tipo == "V":
            # Cuadro - izquierda
            if col > 0:
                if self._es_cuadro_completo(fila, col - 1):
                    self.boxes[fila][col - 1] = jugador_id
                    completados.append((fila, col - 1))

            # Cuadro - derecha
            if col < self.columnas - 1:
                if self._es_cuadro_completo(fila, col):
                    self.boxes[fila][col] = jugador_id
                    completados.append((fila, col))

        return completados

    # -------------------------------
    # VERIFICAR SI UN CUADRO ESTÁ COMPLETO
    # -------------------------------
    def _es_cuadro_completo(self, fila, col):
        return (
            self.horizontal[fila][col] is not None and
            self.horizontal[fila + 1][col] is not None and
            self.vertical[fila][col] is not None and
            self.vertical[fila][col + 1] is not None and
            self.boxes[fila][col] is None
        )

    # -------------------------------
    # ESTADO DEL TABLERO
    # -------------------------------
    def obtener_estado(self):
        print(type(self.horizontal[0][0]))
        print(type(self.vertical[0][0]))
        print(type(self.boxes[0][0]))
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