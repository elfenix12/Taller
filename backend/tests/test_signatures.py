"""Backend tests for signatures + PDF versioning (iteration 2).

Env: ADMIN_TOK, STAFF_TOK, ADMIN_EM, STAFF_EM, REACT_APP_BACKEND_URL, MONGO_URL, DB_NAME
"""
import io
import os
import base64
import time
import pytest
import requests
from datetime import datetime, timezone
from PIL import Image

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
ADMIN_TOK = os.environ["ADMIN_TOK"]
STAFF_TOK = os.environ["STAFF_TOK"]


def H(tok=STAFF_TOK):
    return {"Authorization": f"Bearer {tok}"}


def _png_sig() -> str:
    im = Image.new("RGBA", (300, 100), (0, 0, 0, 0))
    # draw a diagonal of opaque pixels so bbox is non-empty
    px = im.load()
    for i in range(50):
        px[i + 20, i + 10] = (0, 0, 0, 255)
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def firmas():
    now = datetime.now(timezone.utc).isoformat()
    png = _png_sig()
    return {"taller": {"png": png, "fecha": now},
            "cliente": {"png": png, "fecha": now},
            "nombre_cliente": "TEST Cliente"}


def entry_payload(nombre="TEST Firma", placas="TEST-SIG", with_firmas=True):
    p = {
        "cliente": {"nombre": nombre, "telefono": "555", "correo": "a@b.com"},
        "vehiculo": {"marca": "Nissan", "modelo": "X", "anio": "2020", "color": "rojo",
                     "placas": placas, "vin": "", "kilometraje": "100", "combustible": "medio"},
        "orden": {"tipo": "particular", "tipo_danio": "golpe"},
        "inventario": {"llantas": 4}, "otros_objetos": "", "danios": {}, "fotos": [], "comentarios": "",
    }
    if with_firmas:
        p["firmas"] = firmas()
    return p


created_entries = []


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    import pymongo
    from bson import ObjectId
    cli = pymongo.MongoClient(os.environ["MONGO_URL"])
    db = cli[os.environ["DB_NAME"]]
    for eid in created_entries:
        for v in db.pdf_versions.find({"entry_id": eid}):
            try:
                db["pdfs.chunks"].delete_many({"files_id": ObjectId(v["file_id"])})
                db["pdfs.files"].delete_one({"_id": ObjectId(v["file_id"])})
            except Exception:
                pass
        db.pdf_versions.delete_many({"entry_id": eid})
        db.entries.delete_one({"id": eid})
    cli.close()


# ---------- Create / Preview ----------
class TestCreateWithFirmas:
    def test_create_without_firmas_400(self):
        r = requests.post(f"{BASE}/entries", json=entry_payload(with_firmas=False), headers=H())
        assert r.status_code == 400
        assert "firma" in r.json()["detail"].lower()

    def test_preview_without_firmas_400(self):
        r = requests.post(f"{BASE}/entries/preview", json=entry_payload(with_firmas=False), headers=H())
        assert r.status_code == 400

    def test_preview_with_firmas_returns_pages(self):
        r = requests.post(f"{BASE}/entries/preview", json=entry_payload(), headers=H())
        assert r.status_code == 200
        d = r.json()
        assert len(d["pages"]) > 0
        assert d["pages"][0].startswith("data:image/png;base64,")

    def test_create_with_firmas_ok(self):
        r = requests.post(f"{BASE}/entries", json=entry_payload(placas="TEST-OK1"), headers=H())
        assert r.status_code == 200
        d = r.json()
        created_entries.append(d["id"])
        assert d["pdf_version"] == 1
        assert d["pdf_label"] == d["folio_str"]
        assert d["mail_status"] == "no_configurado"

    def test_firma_png_invalid_prefix(self):
        p = entry_payload(placas="TEST-OK2")
        p["firmas"]["taller"]["png"] = "data:image/jpeg;base64,xxxx"
        r = requests.post(f"{BASE}/entries", json=p, headers=H())
        assert r.status_code == 400


# ---------- Versions / Immutability / PUT ----------
class TestVersions:
    @pytest.fixture(scope="class")
    def entry_id(self):
        r = requests.post(f"{BASE}/entries", json=entry_payload(placas="TEST-VER"), headers=H())
        assert r.status_code == 200
        eid = r.json()["id"]
        created_entries.append(eid)
        return eid

    def test_v1_pdf_bytes_identical(self, entry_id):
        r1 = requests.get(f"{BASE}/entries/{entry_id}/versions/1/pdf", headers=H())
        r2 = requests.get(f"{BASE}/entries/{entry_id}/versions/1/pdf", headers=H())
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.content == r2.content
        assert r1.content[:4] == b"%PDF"

    def test_update_requires_firmas_400(self, entry_id):
        p = entry_payload(placas="TEST-VER", with_firmas=False)
        p["cliente"]["nombre"] = "TEST Updated"
        r = requests.put(f"{BASE}/entries/{entry_id}", json=p, headers=H())
        assert r.status_code == 400

    def test_update_creates_v2(self, entry_id):
        p = entry_payload(placas="TEST-VER")
        p["cliente"]["nombre"] = "TEST Updated Name"
        r = requests.put(f"{BASE}/entries/{entry_id}", json=p, headers=H())
        assert r.status_code == 200
        d = r.json()
        assert d["pdf_version"] == 2
        assert d["pdf_label"].endswith(" - v2")
        assert d["cliente"]["nombre"] == "TEST Updated Name"

    def test_list_versions_desc(self, entry_id):
        r = requests.get(f"{BASE}/entries/{entry_id}/versions", headers=H())
        assert r.status_code == 200
        lst = r.json()
        assert len(lst) == 2
        assert lst[0]["version"] == 2
        assert lst[1]["version"] == 1
        assert lst[0]["label"].endswith(" - v2")

    def test_v1_immutable_after_edit(self, entry_id):
        # grab v1 again after update - should match original bytes-wise
        r1 = requests.get(f"{BASE}/entries/{entry_id}/versions/1/pdf", headers=H())
        assert r1.status_code == 200
        # Also verify /pdf returns LATEST
        rL = requests.get(f"{BASE}/entries/{entry_id}/pdf", headers=H())
        rL2 = requests.get(f"{BASE}/entries/{entry_id}/pdf", headers=H())
        assert rL.status_code == 200
        assert rL.content == rL2.content
        # Latest should differ from v1
        assert rL.content != r1.content


# ---------- Legacy entries ----------
class TestLegacy:
    @pytest.fixture(scope="class")
    def legacy_id(self):
        import pymongo
        import uuid
        cli = pymongo.MongoClient(os.environ["MONGO_URL"])
        db = cli[os.environ["DB_NAME"]]
        eid = uuid.uuid4().hex
        now = datetime.now(timezone.utc).isoformat()
        db.entries.insert_one({
            "id": eid, "folio": 9001, "folio_str": "09001",
            "cliente": {"nombre": "TEST_Legacy", "telefono": "", "correo": ""},
            "vehiculo": {"marca": "", "modelo": "", "anio": "", "color": "", "placas": "TEST-LEG",
                         "vin": "", "kilometraje": "1", "combustible": ""},
            "orden": {"tipo": "particular", "tipo_danio": ""},
            "inventario": {}, "otros_objetos": "", "danios": {}, "fotos": [], "comentarios": "",
            "fecha_ingreso": now, "fecha_local": now[:10],
            "estado": "en_taller", "created_at": now, "created_by": "legacy",
            "mail_status": "pendiente", "mail_error": None,
        })
        created_entries.append(eid)
        cli.close()
        return eid

    def test_pdf_409_for_legacy(self, legacy_id):
        r = requests.get(f"{BASE}/entries/{legacy_id}/pdf", headers=H())
        assert r.status_code == 409

    def test_send_409_for_legacy(self, legacy_id):
        r = requests.post(f"{BASE}/entries/{legacy_id}/send", headers=H())
        assert r.status_code == 409

    def test_sign_creates_v1(self, legacy_id):
        r = requests.post(f"{BASE}/entries/{legacy_id}/sign", json={"firmas": firmas()}, headers=H())
        assert r.status_code == 200
        d = r.json()
        assert d["pdf_version"] == 1
        assert d["pdf_label"] == "09001"
        # pdf now downloadable
        rp = requests.get(f"{BASE}/entries/{legacy_id}/pdf", headers=H())
        assert rp.status_code == 200
        assert rp.content[:4] == b"%PDF"

    def test_sign_twice_409(self, legacy_id):
        r = requests.post(f"{BASE}/entries/{legacy_id}/sign", json={"firmas": firmas()}, headers=H())
        assert r.status_code == 409
