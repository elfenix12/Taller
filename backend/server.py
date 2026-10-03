from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import Response as RawResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pymongo import ReturnDocument
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from pathlib import Path
from bson import Binary, ObjectId
import io
import base64
import os
import re
import uuid
import logging
import httpx
from PIL import Image as PILImage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from catalog import CATALOG, DEFAULT_SETTINGS  # noqa: E402
import mailer  # noqa: E402
from pdf_gen import build_pdf, pdf_pages_png  # noqa: E402

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
fs = AsyncIOMotorGridFSBucket(db, bucket_name="pdfs")
TZ = ZoneInfo("America/Tijuana")
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

app = FastAPI()
api = APIRouter(prefix="/api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Models ----------
class Cliente(BaseModel):
    nombre: str = ""
    telefono: str = ""
    correo: str = ""


class Vehiculo(BaseModel):
    marca: str = ""
    modelo: str = ""
    anio: str = ""
    color: str = ""
    placas: str = ""
    vin: str = ""
    kilometraje: str = ""
    combustible: str = ""


class Orden(BaseModel):
    tipo: str = "particular"
    aseguradora: str = ""
    poliza: str = ""
    siniestro: str = ""
    reporte: str = ""
    tipo_danio: str = ""
    tipo_danio_otro: str = ""


class Firma(BaseModel):
    png: str
    fecha: str


class Firmas(BaseModel):
    taller: Optional[Firma] = None
    cliente: Optional[Firma] = None
    nombre_cliente: str = ""


class SignIn(BaseModel):
    firmas: Firmas


class EntryIn(BaseModel):
    cliente: Cliente = Field(default_factory=Cliente)
    vehiculo: Vehiculo = Field(default_factory=Vehiculo)
    orden: Orden = Field(default_factory=Orden)
    inventario: Dict[str, int] = Field(default_factory=dict)
    otros_objetos: str = ""
    danios: Dict[str, str] = Field(default_factory=dict)
    fotos: List[str] = Field(default_factory=list)
    comentarios: str = ""
    fecha_ingreso: Optional[str] = None
    firmas: Optional[Firmas] = None


class PreviewIn(EntryIn):
    entry_id: Optional[str] = None


class SettingsIn(BaseModel):
    nombre: str
    telefono: str
    direccion: str
    nota_legal: str


class AllowedIn(BaseModel):
    email: str
    role: str = "staff"


class StatusIn(BaseModel):
    estado: str


class SessionIn(BaseModel):
    session_id: str


# ---------- Auth ----------
async def get_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "No autenticado")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(401, "Sesión inválida")
    exp = sess["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(401, "Sesión expirada")
    user = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "Usuario no encontrado")
    allowed = await db.allowed_emails.find_one({"email": user["email"].lower()}, {"_id": 0})
    if not allowed:
        raise HTTPException(403, "Tu cuenta no tiene acceso a esta app")
    user["role"] = allowed.get("role", "staff")
    return user


async def require_admin(user: dict = Depends(get_user)) -> dict:
    if user["role"] != "admin":
        raise HTTPException(403, "Solo un administrador puede hacer esto")
    return user


@api.post("/auth/session")
async def create_session(body: SessionIn, response: Response):
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    async with httpx.AsyncClient(timeout=20) as hc:
        r = await hc.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": body.session_id})
    if r.status_code != 200:
        raise HTTPException(401, "No se pudo validar la sesión de Google")
    data = r.json()
    email = data["email"].lower()
    if not await db.allowed_emails.find_one({"email": email}):
        raise HTTPException(403, f"El correo {email} no está autorizado. Pide acceso al administrador del taller.")
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name"), "picture": data.get("picture")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({"user_id": user_id, "email": email, "name": data.get("name"),
                                   "picture": data.get("picture"), "created_at": now_iso()})
    await db.user_sessions.insert_one({"user_id": user_id, "session_token": data["session_token"],
                                       "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
                                       "created_at": now_iso()})
    response.set_cookie("session_token", data["session_token"], httponly=True, secure=True, samesite="none",
                        path="/", max_age=7 * 24 * 3600)
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    allowed = await db.allowed_emails.find_one({"email": email}, {"_id": 0})
    user["role"] = allowed.get("role", "staff")
    return user


@api.get("/auth/me")
async def me(user: dict = Depends(get_user)):
    return user


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"ok": True}


# ---------- Catalog & settings ----------
async def get_taller() -> dict:
    doc = await db.settings.find_one({"key": "taller"}, {"_id": 0, "key": 0})
    return {**DEFAULT_SETTINGS, **(doc or {})}


@api.get("/catalog")
async def catalog(user: dict = Depends(get_user)):
    return CATALOG


@api.get("/settings")
async def get_settings(user: dict = Depends(get_user)):
    return {**(await get_taller()), "mail_configured": mailer.is_configured()}


@api.put("/settings")
async def put_settings(body: SettingsIn, user: dict = Depends(get_user)):
    await db.settings.update_one({"key": "taller"}, {"$set": body.model_dump()}, upsert=True)
    return {**(await get_taller()), "mail_configured": mailer.is_configured()}


@api.get("/users")
async def list_allowed(user: dict = Depends(require_admin)):
    return await db.allowed_emails.find({}, {"_id": 0}).sort("added_at", 1).to_list(500)


@api.post("/users")
async def add_allowed(body: AllowedIn, user: dict = Depends(require_admin)):
    email = body.email.strip().lower()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(400, "Correo inválido")
    role = "admin" if body.role == "admin" else "staff"
    await db.allowed_emails.update_one({"email": email}, {"$set": {"email": email, "role": role},
                                                          "$setOnInsert": {"added_at": now_iso()}}, upsert=True)
    return {"email": email, "role": role}


@api.delete("/users/{email}")
async def remove_allowed(email: str, user: dict = Depends(require_admin)):
    email = email.lower()
    if email == user["email"].lower():
        raise HTTPException(400, "No puedes quitarte acceso a ti mismo")
    await db.allowed_emails.delete_one({"email": email})
    uids = [u["user_id"] async for u in db.users.find({"email": email}, {"user_id": 1})]
    if uids:
        await db.user_sessions.delete_many({"user_id": {"$in": uids}})
    return {"ok": True}


# ---------- Photos ----------
@api.post("/photos")
async def upload_photo(file: UploadFile = File(...), user: dict = Depends(get_user)):
    raw = await file.read()
    try:
        im = PILImage.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Archivo de imagen inválido")
    im.thumbnail((1280, 1280))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=80, optimize=True)
    pid = uuid.uuid4().hex
    await db.photos.insert_one({"id": pid, "data": Binary(buf.getvalue()), "created_at": now_iso(),
                                "created_by": user["user_id"]})
    return {"id": pid}


@api.get("/photos/{pid}")
async def get_photo(pid: str, user: dict = Depends(get_user)):
    doc = await db.photos.find_one({"id": pid}, {"_id": 0, "data": 1})
    if not doc:
        raise HTTPException(404, "Foto no encontrada")
    return RawResponse(bytes(doc["data"]), media_type="image/jpeg", headers={"Cache-Control": "private, max-age=86400"})


async def load_photos(ids: List[str]) -> List[bytes]:
    docs = {d["id"]: bytes(d["data"]) async for d in db.photos.find({"id": {"$in": ids}}, {"_id": 0})}
    return [docs[i] for i in ids if i in docs]


# ---------- Entries ----------
def validate_required(e: EntryIn):
    missing = [n for n, v in [("nombre del cliente", e.cliente.nombre), ("placas", e.vehiculo.placas),
                              ("kilometraje", e.vehiculo.kilometraje)] if not v.strip()]
    if missing:
        raise HTTPException(400, "Faltan datos obligatorios: " + ", ".join(missing))
    if len(e.fotos) > 20:
        raise HTTPException(400, "Máximo 20 fotos por entrada")


def validate_firmas(f: Optional[Firmas]) -> dict:
    if not f or not f.taller or not f.cliente:
        raise HTTPException(400, "Faltan las firmas del taller y del cliente")
    for firma in (f.taller, f.cliente):
        if not firma.png.startswith("data:image/png;base64,") or len(firma.png) > 3_000_000:
            raise HTTPException(400, "Firma inválida")
        try:
            PILImage.open(io.BytesIO(base64.b64decode(firma.png.split(",", 1)[1]))).verify()
        except Exception:
            raise HTTPException(400, "Firma inválida")
    return f.model_dump()


def clean(e: EntryIn) -> dict:
    d = e.model_dump(exclude={"entry_id", "firmas"})
    d["inventario"] = {k: max(1, int(v)) for k, v in d["inventario"].items() if v}
    d["vehiculo"]["placas"] = d["vehiculo"]["placas"].strip().upper()
    return d


async def make_pdf(entry: dict, firmas: dict, label: str) -> bytes:
    data = {**entry, "firmas": firmas, "folio_label": label}
    return build_pdf(data, await get_taller(), await load_photos(entry.get("fotos", [])))


def version_label(folio_str: str, v: int) -> str:
    return folio_str if v == 1 else f"{folio_str} - v{v}"


async def create_version(entry: dict, firmas: dict, user: dict) -> dict:
    v = await db.pdf_versions.count_documents({"entry_id": entry["id"]}) + 1
    label = version_label(entry["folio_str"], v)
    pdf = await make_pdf(entry, firmas, label)
    file_id = await fs.upload_from_stream(f"Entrada_{label}.pdf", pdf, metadata={"entry_id": entry["id"], "version": v})
    await db.pdf_versions.insert_one({
        "entry_id": entry["id"], "version": v, "label": label, "file_id": str(file_id), "size": len(pdf),
        "created_at": now_iso(), "created_by": user["email"], "firmas": firmas})
    await db.entries.update_one({"id": entry["id"]}, {"$set": {"pdf_version": v, "pdf_label": label}})
    return {"pdf_version": v, "pdf_label": label}


async def get_version(eid: str, v: Optional[int] = None) -> dict:
    filt = {"entry_id": eid, **({"version": v} if v else {})}
    doc = await db.pdf_versions.find_one(filt, {"_id": 0, "firmas": 0}, sort=[("version", -1)])
    if not doc:
        raise HTTPException(409, "Esta entrada aún no tiene PDF firmado. Captura las firmas.")
    return doc


async def read_pdf(ver: dict) -> bytes:
    stream = await fs.open_download_stream(ObjectId(ver["file_id"]))
    return await stream.read()


async def try_send(entry: dict) -> dict:
    ver = await get_version(entry["id"])
    if not mailer.is_configured():
        result = {"mail_status": "no_configurado", "mail_error": None}
    else:
        try:
            await mailer.send_entry({**entry, "pdf_label": ver["label"]}, await get_taller(), await read_pdf(ver))
            result = {"mail_status": "enviado", "mail_error": None, "mail_sent_at": now_iso()}
        except Exception as ex:
            logger.error("Fallo envío de correo folio %s: %s", entry["folio_str"], type(ex).__name__)
            result = {"mail_status": "fallido", "mail_error": "No se pudo enviar el correo. Revisa la conexión o la configuración e intenta reenviar."}
    await db.entries.update_one({"id": entry["id"]}, {"$set": result})
    return result


async def get_entry_or_404(eid: str) -> dict:
    doc = await db.entries.find_one({"id": eid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Entrada no encontrada")
    return doc


@api.post("/entries/preview")
async def preview(body: PreviewIn, user: dict = Depends(get_user)):
    firmas = validate_firmas(body.firmas)
    entry = clean(body)
    entry["fecha_ingreso"] = entry.get("fecha_ingreso") or now_iso()
    label = "POR ASIGNAR"
    if body.entry_id:
        existing = await get_entry_or_404(body.entry_id)
        entry["fecha_ingreso"] = existing["fecha_ingreso"]
        v = await db.pdf_versions.count_documents({"entry_id": body.entry_id}) + 1
        label = version_label(existing["folio_str"], v)
    pdf = await make_pdf(entry, firmas, label)
    return {"pages": pdf_pages_png(pdf), "size_bytes": len(pdf)}


@api.post("/entries")
async def create_entry(body: EntryIn, user: dict = Depends(get_user)):
    validate_required(body)
    firmas = validate_firmas(body.firmas)
    entry = clean(body)
    counter = await db.counters.find_one_and_update({"_id": "folio"}, {"$inc": {"seq": 1}}, upsert=True,
                                                    return_document=ReturnDocument.AFTER)
    fecha = entry.get("fecha_ingreso") or now_iso()
    entry.update({
        "id": uuid.uuid4().hex, "folio": counter["seq"], "folio_str": str(counter["seq"]).zfill(5),
        "fecha_ingreso": fecha, "fecha_local": datetime.fromisoformat(fecha).astimezone(TZ).strftime("%Y-%m-%d"),
        "estado": "en_taller", "created_at": now_iso(), "created_by": user["email"],
        "mail_status": "pendiente", "mail_error": None,
    })
    await db.entries.insert_one(dict(entry))
    entry.update(await create_version(entry, firmas, user))
    entry.update(await try_send(entry))
    return entry


@api.get("/entries")
async def list_entries(q: str = "", estado: str = "en_taller", desde: str = "", hasta: str = "",
                       user: dict = Depends(get_user)):
    filt: dict = {}
    if estado in ("en_taller", "entregado"):
        filt["estado"] = estado
    if desde or hasta:
        filt["fecha_local"] = {k: v for k, v in (("$gte", desde), ("$lte", hasta)) if v}
    if q.strip():
        rx = {"$regex": re.escape(q.strip()), "$options": "i"}
        ors = [{"vehiculo.placas": rx}, {"cliente.nombre": rx}, {"folio_str": rx},
               {"orden.siniestro": rx}, {"orden.reporte": rx}]
        if q.strip().isdigit():
            ors.append({"folio": int(q.strip())})
        filt["$or"] = ors
    return await db.entries.find(filt, {"_id": 0}).sort("folio", -1).to_list(500)


@api.get("/entries/{eid}")
async def get_entry(eid: str, user: dict = Depends(get_user)):
    return await get_entry_or_404(eid)


@api.put("/entries/{eid}")
async def update_entry(eid: str, body: EntryIn, user: dict = Depends(get_user)):
    validate_required(body)
    firmas = validate_firmas(body.firmas)
    await get_entry_or_404(eid)
    data = clean(body)
    data.pop("fecha_ingreso", None)
    data.update({"updated_at": now_iso(), "updated_by": user["email"]})
    await db.entries.update_one({"id": eid}, {"$set": data})
    await create_version(await get_entry_or_404(eid), firmas, user)
    return await get_entry_or_404(eid)


@api.post("/entries/{eid}/sign")
async def sign_legacy(eid: str, body: SignIn, user: dict = Depends(get_user)):
    firmas = validate_firmas(body.firmas)
    entry = await get_entry_or_404(eid)
    if await db.pdf_versions.count_documents({"entry_id": eid}):
        raise HTTPException(409, "Esta entrada ya tiene un PDF firmado")
    await create_version(entry, firmas, user)
    return await get_entry_or_404(eid)


@api.get("/entries/{eid}/versions")
async def list_versions(eid: str, user: dict = Depends(get_user)):
    await get_entry_or_404(eid)
    return await db.pdf_versions.find({"entry_id": eid}, {"_id": 0, "firmas": 0, "file_id": 0}).sort("version", -1).to_list(200)


@api.get("/entries/{eid}/versions/{v}/pdf")
async def version_pdf(eid: str, v: int, user: dict = Depends(get_user)):
    return await pdf_response(await get_version(eid, v))


@api.patch("/entries/{eid}/estado")
async def set_estado(eid: str, body: StatusIn, user: dict = Depends(get_user)):
    if body.estado not in ("en_taller", "entregado"):
        raise HTTPException(400, "Estado inválido")
    await get_entry_or_404(eid)
    await db.entries.update_one({"id": eid}, {"$set": {"estado": body.estado, "estado_at": now_iso()}})
    return await get_entry_or_404(eid)


@api.get("/entries/{eid}/pdf")
async def entry_pdf(eid: str, user: dict = Depends(get_user)):
    await get_entry_or_404(eid)
    return await pdf_response(await get_version(eid))


async def pdf_response(ver: dict):
    return RawResponse(await read_pdf(ver), media_type="application/pdf",
                       headers={"Content-Disposition": f'attachment; filename="Entrada_{ver["label"].replace(" ", "")}.pdf"'})


@api.post("/entries/{eid}/send")
async def resend(eid: str, user: dict = Depends(get_user)):
    entry = await get_entry_or_404(eid)
    return await try_send(entry)


app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    admin = os.environ["ADMIN_EMAIL"].lower()
    await db.allowed_emails.update_one({"email": admin}, {"$set": {"role": "admin"},
                                                          "$setOnInsert": {"email": admin, "added_at": now_iso()}},
                                       upsert=True)
    await db.entries.create_index("id", unique=True)
    await db.photos.create_index("id", unique=True)
    await db.user_sessions.create_index("session_token")
    await db.pdf_versions.create_index([("entry_id", 1), ("version", 1)], unique=True)
    logger.info("Correo configurado: %s", mailer.is_configured())


@app.on_event("shutdown")
async def shutdown():
    client.close()
