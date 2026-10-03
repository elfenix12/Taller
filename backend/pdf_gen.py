import io
import base64
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo
from PIL import Image as PILImage
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, Image,
                                KeepTogether)
from catalog import INVENTARIO, DANIOS

LOGO = Path(__file__).parent / "assets" / "logo.png"
TZ = ZoneInfo("America/Tijuana")
MAX_BYTES = 14_500_000
BLACK = colors.HexColor("#0A0A0A")
GREY = colors.HexColor("#F1F5F9")
LINE = colors.HexColor("#94A3B8")

S = {
    "t": ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=15, leading=18),
    "h": ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=colors.white),
    "b": ParagraphStyle("b", fontName="Helvetica", fontSize=8.5, leading=11),
    "bb": ParagraphStyle("bb", fontName="Helvetica-Bold", fontSize=8.5, leading=11),
    "small": ParagraphStyle("s", fontName="Helvetica", fontSize=8, leading=10),
    "title": ParagraphStyle("ti", fontName="Helvetica-Bold", fontSize=13, leading=16, alignment=2),
    "right": ParagraphStyle("r", fontName="Helvetica", fontSize=9, leading=12, alignment=2),
}
W = letter[0] - 72


def fmt_fecha(iso: str) -> str:
    if not iso:
        return ""
    return datetime.fromisoformat(iso).astimezone(TZ).strftime("%d/%m/%Y %H:%M")


def P(text, style="b"):
    from xml.sax.saxutils import escape
    return Paragraph(escape(str(text or "")).replace("\n", "<br/>"), S[style])


def section_header(text, width=W):
    t = Table([[P(text.upper(), "h")]], colWidths=[width])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BLACK),
                           ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    return t


def kv_box(title, rows, width):
    data = [[P(title.upper(), "h"), ""]] + [[P(k, "bb"), P(v or "—")] for k, v in rows]
    t = Table(data, colWidths=[width * 0.38, width * 0.62])
    t.setStyle(TableStyle([
        ("SPAN", (0, 0), (-1, 0)), ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("BOX", (0, 0), (-1, -1), 1, BLACK), ("INNERGRID", (0, 1), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def inv_table(group, inventario, width):
    data = [[P(group["label"].upper(), "h"), P("Cant.", "h"), P("Sí", "h"), P("No", "h")]]
    for it in group["items"]:
        q = int(inventario.get(it["id"]) or 0)
        data.append([P(it["label"]), P(str(q) if q else "—"), P("X" if q else "", "bb"), P("" if q else "X", "bb")])
    t = Table(data, colWidths=[width * 0.58, width * 0.16, width * 0.13, width * 0.13])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK), ("BOX", (0, 0), (-1, -1), 1, BLACK),
        ("INNERGRID", (0, 1), (-1, -1), 0.4, LINE), ("ALIGN", (1, 1), (-1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 2), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


def _photo_flowable(data: bytes, max_px: int, quality: int, box_w: float):
    im = PILImage.open(io.BytesIO(data)).convert("RGB")
    im.thumbnail((max_px, max_px))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality, optimize=True)
    buf.seek(0)
    ratio = im.height / im.width
    w = box_w
    h = w * ratio
    if h > box_w * 0.9:
        h = box_w * 0.9
        w = h / ratio
    return Image(buf, width=w, height=h)


def _build(entry: dict, taller: dict, photos: list, max_px: int, quality: int) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=30, bottomMargin=30,
                            title=f"Entrada de vehículo {entry.get('folio_str', '')}")
    c, v, o = entry.get("cliente", {}), entry.get("vehiculo", {}), entry.get("orden", {})
    story = []

    logo = Image(str(LOGO), width=0.62 * inch * 882 / 1100, height=0.62 * inch) if LOGO.exists() else P("")
    info = [P(taller["nombre"].upper(), "t"), P(f"Tel. {taller['telefono']}"), P(taller["direccion"])]
    folio = entry.get("folio_label") or entry.get("folio_str", "")
    right = [P("ENTRADA DE VEHÍCULO", "title"), Paragraph(f"Folio: <b>{folio}</b>", S["right"]),
             P(f"Ingreso: {fmt_fecha(entry.get('fecha_ingreso'))}", "right")]
    head = Table([[logo, info, right]], colWidths=[0.75 * inch, W * 0.5, W - 0.75 * inch - W * 0.5])
    head.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                              ("LINEBELOW", (0, 0), (-1, 0), 2, BLACK), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    story += [head, Spacer(1, 8)]

    half = (W - 8) / 2
    es_aseg = o.get("tipo") == "aseguradora"
    tipo_danio = o.get("tipo_danio") or ""
    if tipo_danio == "Otro" and o.get("tipo_danio_otro"):
        tipo_danio = f"Otro: {o['tipo_danio_otro']}"
    orden = kv_box("Orden", [
        ("Tipo", "Aseguradora" if es_aseg else "Particular"),
        ("Aseguradora", o.get("aseguradora") if es_aseg else ""), ("Póliza", o.get("poliza") if es_aseg else ""),
        ("Siniestro", o.get("siniestro") if es_aseg else ""), ("Reporte", o.get("reporte") if es_aseg else ""),
        ("Tipo de daño", tipo_danio)], half)
    cliente = kv_box("Cliente", [("Nombre", c.get("nombre")), ("Teléfono", c.get("telefono")),
                                 ("Correo", c.get("correo"))], half)
    row = Table([[orden, cliente]], colWidths=[half + 8, half])
    row.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                             ("RIGHTPADDING", (0, 0), (0, 0), 8), ("RIGHTPADDING", (1, 0), (1, 0), 0)]))
    story += [row, Spacer(1, 8)]

    vrows = [("Marca", v.get("marca")), ("Modelo", v.get("modelo")), ("Año", v.get("anio")), ("Color", v.get("color")),
             ("Placas", v.get("placas")), ("VIN", v.get("vin")), ("Kilometraje", v.get("kilometraje")),
             ("Combustible", v.get("combustible"))]
    q = W / 8
    vdata = [[P("VEHÍCULO", "h")] + [""] * 7]
    for i in range(0, 8, 4):
        cells = []
        for k, val in vrows[i:i + 4]:
            cells += [P(k, "bb"), P(val or "—")]
        vdata.append(cells)
    vt = Table(vdata, colWidths=[q * 1.1, q * 0.9] * 4)
    vt.setStyle(TableStyle([("SPAN", (0, 0), (-1, 0)), ("BACKGROUND", (0, 0), (-1, 0), BLACK),
                            ("BOX", (0, 0), (-1, -1), 1, BLACK), ("INNERGRID", (0, 1), (-1, -1), 0.4, LINE),
                            ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    story += [vt, Spacer(1, 10), section_header("Inventario de entrada"), Spacer(1, 4)]

    inv = entry.get("inventario", {})
    tables = [inv_table(g, inv, half) for g in INVENTARIO]
    grid = Table([[tables[0], tables[1]], [tables[2], tables[3]]], colWidths=[half + 8, half])
    grid.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                              ("RIGHTPADDING", (0, 0), (0, -1), 8), ("RIGHTPADDING", (1, 0), (1, -1), 0),
                              ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story += [grid]
    story += [KeepTogether([P("Otros objetos:", "bb"), P(entry.get("otros_objetos") or "Ninguno")]), Spacer(1, 10)]

    danios = entry.get("danios", {})
    labels = {it["id"]: (g["label"], it["label"]) for g in DANIOS for it in g["items"]}
    drows = [[P("Zona", "bb"), P("Parte", "bb"), P("Nota", "bb")]]
    for zid, nota in danios.items():
        if zid in labels:
            drows.append([P(labels[zid][0]), P(labels[zid][1]), P(nota or "—")])
    dblock = [section_header("Zonas dañadas"), Spacer(1, 4)]
    if len(drows) > 1:
        dt = Table(drows, colWidths=[W * 0.18, W * 0.32, W * 0.5], repeatRows=1)
        dt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), GREY), ("BOX", (0, 0), (-1, -1), 1, BLACK),
                                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        dblock.append(dt)
    else:
        dblock.append(P("Sin daños registrados."))
    story += dblock + [Spacer(1, 10)]
    story += [KeepTogether([section_header("Comentarios generales"), Spacer(1, 4),
                            P(entry.get("comentarios") or "Sin comentarios.")]), Spacer(1, 10)]

    if photos:
        cw = (W - 16) / 3
        cells = [_photo_flowable(p, max_px, quality, cw) for p in photos]
        rows = [cells[i:i + 3] + [""] * (3 - len(cells[i:i + 3])) for i in range(0, len(cells), 3)]
        gt = Table(rows, colWidths=[cw + 8, cw + 8, cw])
        gt.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                                ("LEFTPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
        story += [section_header(f"Galería de fotos ({len(photos)})"), Spacer(1, 6), gt, Spacer(1, 6)]

    legal = Table([[P(taller["nota_legal"], "bb")]], colWidths=[W])
    legal.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 1.2, BLACK), ("BACKGROUND", (0, 0), (-1, -1), GREY),
                               ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    firmas = entry.get("firmas") or {}
    if not firmas.get("taller") or not firmas.get("cliente"):
        raise ValueError("El PDF requiere ambas firmas")
    sig_w = (W - 24) / 2
    nombre = firmas.get("nombre_cliente") or c.get("nombre") or ""
    t_box = sig_box(firmas["taller"], "Firma del taller", "", sig_w)
    c_box = sig_box(firmas["cliente"], "Firma del cliente", nombre, sig_w)
    sig = Table([[t_box, "", c_box]], colWidths=[sig_w, 24, sig_w])
    sig.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                             ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story += [KeepTogether([Spacer(1, 6), legal, Spacer(1, 18), sig])]

    doc.build(story)
    return buf.getvalue()


def sig_box(firma: dict, label: str, nombre, width):
    raw = base64.b64decode(firma["png"].split(",", 1)[1])
    im = PILImage.open(io.BytesIO(raw)).convert("RGBA")
    bbox = im.getchannel("A").getbbox()
    if bbox:
        im = im.crop(bbox)
    buf = io.BytesIO()
    im.save(buf, "PNG")
    buf.seek(0)
    max_w, max_h = width - 16, 66
    r = min(max_w / im.width, max_h / im.height)
    rows = [[Image(buf, width=im.width * r, height=im.height * r, mask="auto")], [P(label, "bb")]]
    if nombre is not None:
        rows.append([P(nombre)])
    rows.append([P(f"Firmado: {fmt_fecha(firma['fecha'])}", "small")])
    t = Table(rows, colWidths=[width], rowHeights=[74] + [None] * (len(rows) - 1))
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 1, BLACK), ("LINEBELOW", (0, 0), (0, 0), 0.6, LINE),
                           ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (0, 0), "BOTTOM"),
                           ("TOPPADDING", (0, 1), (-1, -1), 2), ("BOTTOMPADDING", (0, 1), (-1, -1), 2)]))
    return t


def build_pdf(entry: dict, taller: dict, photos: list) -> bytes:
    for max_px, quality in [(1100, 72), (800, 60), (600, 50)]:
        pdf = _build(entry, taller, photos, max_px, quality)
        if len(pdf) <= MAX_BYTES:
            return pdf
    return pdf


def pdf_pages_png(pdf: bytes, zoom: float = 1.4) -> list:
    import base64
    import pymupdf
    out = []
    with pymupdf.open(stream=pdf, filetype="pdf") as d:
        for page in d:
            pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom))
            out.append("data:image/png;base64," + base64.b64encode(pix.tobytes("png")).decode())
    return out
