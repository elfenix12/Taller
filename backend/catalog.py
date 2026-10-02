def _items(pairs):
    return [{"id": i, "label": label} for i, label in pairs]


INVENTARIO = [
    {"id": "interiores", "label": "Interiores", "items": _items([
        ("documentos", "Documentos"), ("radio", "Radio"), ("pantalla", "Pantalla"),
        ("encendedor", "Encendedor"), ("tapetes_tela", "Tapetes de tela"),
        ("tapetes_plastico", "Tapetes de plástico")])},
    {"id": "motor", "label": "Motor", "items": _items([
        ("bateria", "Batería"), ("computadora", "Computadora"),
        ("tapones_depositos", "Tapones de depósitos")])},
    {"id": "exteriores", "label": "Exteriores", "items": _items([
        ("antena", "Antena"), ("polveras", "Polveras"), ("centros_rin", "Centros de rin"),
        ("placas_obj", "Placas")])},
    {"id": "cajuela", "label": "Cajuela", "items": _items([
        ("herramienta", "Herramienta"), ("reflejantes", "Reflejantes"),
        ("cables_corriente", "Cables pasa corriente"), ("llanta_refaccion", "Llanta de refacción"),
        ("llave_l", "Llave L o cruceta"), ("extintor", "Extintor"), ("gato", "Gato")])},
]

DANIOS = [
    {"id": "frente", "label": "Frente", "items": _items([
        ("defensa_delantera", "Defensa delantera"), ("cofre", "Cofre"),
        ("faro_izq", "Faro izq."), ("faro_der", "Faro der.")])},
    {"id": "laterales", "label": "Laterales", "items": _items([
        ("salpicadera_del_izq", "Salpicadera delantera izq."), ("salpicadera_del_der", "Salpicadera delantera der."),
        ("puerta_del_izq", "Puerta delantera izq."), ("puerta_del_der", "Puerta delantera der."),
        ("puerta_tras_izq", "Puerta trasera izq."), ("puerta_tras_der", "Puerta trasera der."),
        ("costado_izq", "Costado izq."), ("costado_der", "Costado der."),
        ("espejo_izq", "Espejo izq."), ("espejo_der", "Espejo der.")])},
    {"id": "superior", "label": "Superior", "items": _items([("techo", "Techo")])},
    {"id": "trasero", "label": "Trasero", "items": _items([
        ("cajuela", "Cajuela"), ("defensa_trasera", "Defensa trasera"),
        ("calavera_izq", "Calavera izq."), ("calavera_der", "Calavera der.")])},
    {"id": "cristales", "label": "Cristales", "items": _items([("parabrisas", "Parabrisas")])},
]

COMBUSTIBLE = ["Vacío", "1/4", "1/2", "3/4", "Lleno"]
TIPO_DANIO = ["Colisión", "Rayón", "Golpe", "Otro"]

CATALOG = {"inventario": INVENTARIO, "danios": DANIOS, "combustible": COMBUSTIBLE, "tipo_danio": TIPO_DANIO}

DEFAULT_SETTINGS = {
    "nombre": "Central de Carrocería y Pintura",
    "telefono": "(664) 976 4583",
    "direccion": "Manuel J. Clouthier No. 22216, Tijuana",
    "nota_legal": ("Sin este comprobante no se entrega la unidad. La empresa no se hace responsable por "
                   "objetos o daños no manifestados en la recepción del vehículo. Después de dos días de "
                   "terminado el trabajo, causará pensión."),
}
