"""Backend API tests for Central de Carrocería y Pintura app.
Requires env vars ADMIN_TOK, STAFF_TOK, ADMIN_EM, STAFF_EM, REACT_APP_BACKEND_URL.
"""
import io
import os
import pytest
import requests
from PIL import Image

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") + "/api"
ADMIN_TOK = os.environ["ADMIN_TOK"]
STAFF_TOK = os.environ["STAFF_TOK"]
ADMIN_EM = os.environ["ADMIN_EM"]
STAFF_EM = os.environ["STAFF_EM"]


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# cleanup store
created = {"entries": [], "photos": [], "emails": []}


@pytest.fixture(scope="session", autouse=True)
def cleanup():
    yield
    s = requests.Session()
    for eid in created["entries"]:
        try:
            # no delete endpoint; just leave; test entries flagged by TEST_ prefix
            pass
        except Exception:
            pass
    # best-effort: remove allowed emails we added
    for em in created["emails"]:
        try:
            s.delete(f"{BASE}/users/{em}", headers=H(ADMIN_TOK))
        except Exception:
            pass


# ---------- Auth ----------
class TestAuth:
    def test_me_ok(self):
        r = requests.get(f"{BASE}/auth/me", headers=H(ADMIN_TOK))
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EM
        assert d["role"] == "admin"

    def test_me_no_token(self):
        r = requests.get(f"{BASE}/auth/me")
        assert r.status_code == 401

    def test_me_bad_token(self):
        r = requests.get(f"{BASE}/auth/me", headers=H("not_a_real_token_xyz"))
        assert r.status_code == 401

    def test_me_email_not_allowed(self):
        """Create user whose email is NOT in allowed_emails -> 403."""
        import pymongo
        import time
        cli = pymongo.MongoClient(os.environ["MONGO_URL"])
        db = cli[os.environ["DB_NAME"]]
        from datetime import datetime, timedelta
        tok = f"test_session_noaccess_{int(time.time()*1000)}"
        uid = f"test-noaccess-{int(time.time()*1000)}"
        em = f"test.noaccess.{int(time.time()*1000)}@example.com"
        db.users.insert_one({"user_id": uid, "email": em, "name": "TEST NoAccess", "created_at": datetime.utcnow()})
        db.user_sessions.insert_one({"user_id": uid, "session_token": tok,
                                     "expires_at": datetime.utcnow() + timedelta(days=1),
                                     "created_at": datetime.utcnow()})
        try:
            r = requests.get(f"{BASE}/auth/me", headers=H(tok))
            assert r.status_code == 403
        finally:
            db.user_sessions.delete_one({"session_token": tok})
            db.users.delete_one({"user_id": uid})
            cli.close()


# ---------- Catalog/Settings ----------
class TestSettings:
    def test_catalog(self):
        r = requests.get(f"{BASE}/catalog", headers=H(STAFF_TOK))
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, dict)

    def test_settings_get_mail_not_configured(self):
        r = requests.get(f"{BASE}/settings", headers=H(STAFF_TOK))
        assert r.status_code == 200
        d = r.json()
        assert d["mail_configured"] is False
        assert "nombre" in d

    def test_settings_put(self):
        payload = {"nombre": "TEST Taller", "telefono": "555-1234",
                   "direccion": "TEST calle 1", "nota_legal": "TEST nota legal"}
        r = requests.put(f"{BASE}/settings", json=payload, headers=H(ADMIN_TOK))
        assert r.status_code == 200
        d = r.json()
        assert d["nombre"] == "TEST Taller"
        # verify persisted
        r2 = requests.get(f"{BASE}/settings", headers=H(STAFF_TOK))
        assert r2.json()["nombre"] == "TEST Taller"


# ---------- Users CRUD (admin only) ----------
class TestUsers:
    def test_list_as_staff_403(self):
        r = requests.get(f"{BASE}/users", headers=H(STAFF_TOK))
        assert r.status_code == 403

    def test_list_as_admin(self):
        r = requests.get(f"{BASE}/users", headers=H(ADMIN_TOK))
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_add_remove(self):
        import time
        em = f"test.added.{int(time.time()*1000)}@example.com"
        r = requests.post(f"{BASE}/users", json={"email": em, "role": "staff"}, headers=H(ADMIN_TOK))
        assert r.status_code == 200
        assert r.json()["email"] == em
        created["emails"].append(em)
        # staff cannot add
        r2 = requests.post(f"{BASE}/users", json={"email": "x@y.com"}, headers=H(STAFF_TOK))
        assert r2.status_code == 403
        # delete
        r3 = requests.delete(f"{BASE}/users/{em}", headers=H(ADMIN_TOK))
        assert r3.status_code == 200

    def test_add_invalid_email(self):
        r = requests.post(f"{BASE}/users", json={"email": "not-an-email"}, headers=H(ADMIN_TOK))
        assert r.status_code == 400

    def test_cannot_remove_self(self):
        r = requests.delete(f"{BASE}/users/{ADMIN_EM}", headers=H(ADMIN_TOK))
        assert r.status_code == 400


# ---------- Photos ----------
def _png_bytes():
    im = Image.new("RGB", (200, 150), (120, 180, 220))
    b = io.BytesIO()
    im.save(b, "PNG")
    return b.getvalue()


class TestPhotos:
    def test_upload_and_fetch(self):
        files = {"file": ("TEST.png", _png_bytes(), "image/png")}
        r = requests.post(f"{BASE}/photos", files=files, headers=H(STAFF_TOK))
        assert r.status_code == 200
        pid = r.json()["id"]
        created["photos"].append(pid)
        r2 = requests.get(f"{BASE}/photos/{pid}", headers=H(STAFF_TOK))
        assert r2.status_code == 200
        assert r2.headers["content-type"].startswith("image/jpeg")
        assert len(r2.content) > 100

    def test_upload_invalid(self):
        files = {"file": ("bad.txt", b"not an image at all", "text/plain")}
        r = requests.post(f"{BASE}/photos", files=files, headers=H(STAFF_TOK))
        assert r.status_code == 400

    def test_fetch_404(self):
        r = requests.get(f"{BASE}/photos/doesnotexist", headers=H(STAFF_TOK))
        assert r.status_code == 404


# ---------- Entries ----------
def _entry_payload(nombre="TEST Cliente", placas="TEST-001", km="12345"):
    return {
        "cliente": {"nombre": nombre, "telefono": "555", "correo": "a@b.com"},
        "vehiculo": {"marca": "Nissan", "modelo": "Tsuru", "anio": "2015", "color": "rojo",
                     "placas": placas, "vin": "", "kilometraje": km, "combustible": "medio"},
        "orden": {"tipo": "particular", "tipo_danio": "golpe"},
        "inventario": {"llantas": 4, "gato": 1},
        "otros_objetos": "TEST otros",
        "danios": {"delantera": "rayón"},
        "fotos": [],
        "comentarios": "TEST comentarios",
    }


class TestEntries:
    def test_create_missing_fields(self):
        p = _entry_payload()
        p["cliente"]["nombre"] = ""
        r = requests.post(f"{BASE}/entries", json=p, headers=H(STAFF_TOK))
        assert r.status_code == 400
        assert "nombre" in r.json()["detail"].lower()

    def test_preview_does_not_consume_folio(self):
        # get current counter via creating one baseline entry
        r0 = requests.post(f"{BASE}/entries", json=_entry_payload(nombre="TEST Baseline", placas="TEST-BASE"),
                           headers=H(STAFF_TOK))
        assert r0.status_code == 200
        f0 = r0.json()["folio"]
        created["entries"].append(r0.json()["id"])
        # Now preview many times
        for _ in range(3):
            rp = requests.post(f"{BASE}/entries/preview", json=_entry_payload(nombre="TEST Prev", placas="TEST-PRV"),
                               headers=H(STAFF_TOK))
            assert rp.status_code == 200
            d = rp.json()
            assert "pages" in d and "size_bytes" in d
            assert len(d["pages"]) > 0
        # create another real -> folio should be f0+1
        r1 = requests.post(f"{BASE}/entries", json=_entry_payload(nombre="TEST After", placas="TEST-AFT"),
                           headers=H(STAFF_TOK))
        assert r1.status_code == 200
        created["entries"].append(r1.json()["id"])
        assert r1.json()["folio"] == f0 + 1
        assert r1.json()["folio_str"] == str(f0 + 1).zfill(5)
        assert r1.json()["mail_status"] == "no_configurado"
        assert r1.json()["estado"] == "en_taller"

    def test_list_search_and_filter(self):
        # create entry with uniq placas
        import time
        placas = f"TST{int(time.time())%100000}"
        p = _entry_payload(nombre="TEST Search Juan", placas=placas, km="99999")
        p["orden"]["siniestro"] = "SIN-TEST-123"
        p["orden"]["reporte"] = "REP-TEST-456"
        r = requests.post(f"{BASE}/entries", json=p, headers=H(STAFF_TOK))
        assert r.status_code == 200
        eid = r.json()["id"]
        folio_str = r.json()["folio_str"]
        created["entries"].append(eid)

        # search by placas
        r1 = requests.get(f"{BASE}/entries", params={"q": placas}, headers=H(STAFF_TOK))
        assert r1.status_code == 200
        assert any(e["id"] == eid for e in r1.json())
        # by cliente
        r2 = requests.get(f"{BASE}/entries", params={"q": "Search Juan"}, headers=H(STAFF_TOK))
        assert any(e["id"] == eid for e in r2.json())
        # by folio
        r3 = requests.get(f"{BASE}/entries", params={"q": folio_str}, headers=H(STAFF_TOK))
        assert any(e["id"] == eid for e in r3.json())
        # by siniestro
        r4 = requests.get(f"{BASE}/entries", params={"q": "SIN-TEST-123"}, headers=H(STAFF_TOK))
        assert any(e["id"] == eid for e in r4.json())
        # by reporte
        r5 = requests.get(f"{BASE}/entries", params={"q": "REP-TEST-456"}, headers=H(STAFF_TOK))
        assert any(e["id"] == eid for e in r5.json())
        # default estado en_taller present
        rD = requests.get(f"{BASE}/entries", headers=H(STAFF_TOK))
        assert any(e["id"] == eid for e in rD.json())
        # change estado entregado and ensure NOT in default list
        rE = requests.patch(f"{BASE}/entries/{eid}/estado", json={"estado": "entregado"}, headers=H(STAFF_TOK))
        assert rE.status_code == 200
        assert rE.json()["estado"] == "entregado"
        rD2 = requests.get(f"{BASE}/entries", headers=H(STAFF_TOK))
        assert not any(e["id"] == eid for e in rD2.json())
        rD3 = requests.get(f"{BASE}/entries", params={"estado": "entregado"}, headers=H(STAFF_TOK))
        assert any(e["id"] == eid for e in rD3.json())

    def test_desde_hasta(self):
        from datetime import date
        today = date.today().isoformat()
        r = requests.get(f"{BASE}/entries", params={"estado": "en_taller", "desde": today, "hasta": today},
                         headers=H(STAFF_TOK))
        assert r.status_code == 200
        for e in r.json():
            assert e["fecha_local"] >= today

    def test_update_entry(self):
        p = _entry_payload(nombre="TEST Edit", placas="TEST-EDT")
        r = requests.post(f"{BASE}/entries", json=p, headers=H(STAFF_TOK))
        eid = r.json()["id"]
        created["entries"].append(eid)
        p["cliente"]["nombre"] = "TEST Edit Updated"
        rU = requests.put(f"{BASE}/entries/{eid}", json=p, headers=H(STAFF_TOK))
        assert rU.status_code == 200
        assert rU.json()["cliente"]["nombre"] == "TEST Edit Updated"
        rG = requests.get(f"{BASE}/entries/{eid}", headers=H(STAFF_TOK))
        assert rG.json()["cliente"]["nombre"] == "TEST Edit Updated"

    def test_pdf(self):
        p = _entry_payload(nombre="TEST Pdf", placas="TEST-PDF")
        r = requests.post(f"{BASE}/entries", json=p, headers=H(STAFF_TOK))
        eid = r.json()["id"]
        created["entries"].append(eid)
        rP = requests.get(f"{BASE}/entries/{eid}/pdf", headers=H(STAFF_TOK))
        assert rP.status_code == 200
        assert rP.headers["content-type"].startswith("application/pdf")
        assert rP.content[:4] == b"%PDF"
        assert len(rP.content) < 15 * 1024 * 1024

    def test_send_returns_no_configurado(self):
        p = _entry_payload(nombre="TEST Send", placas="TEST-SND")
        r = requests.post(f"{BASE}/entries", json=p, headers=H(STAFF_TOK))
        eid = r.json()["id"]
        created["entries"].append(eid)
        rS = requests.post(f"{BASE}/entries/{eid}/send", headers=H(STAFF_TOK))
        assert rS.status_code == 200
        assert rS.json()["mail_status"] == "no_configurado"

    def test_estado_invalid(self):
        p = _entry_payload(nombre="TEST EstBad", placas="TEST-EST")
        r = requests.post(f"{BASE}/entries", json=p, headers=H(STAFF_TOK))
        eid = r.json()["id"]
        created["entries"].append(eid)
        rI = requests.patch(f"{BASE}/entries/{eid}/estado", json={"estado": "weird"}, headers=H(STAFF_TOK))
        assert rI.status_code == 400

    def test_get_404(self):
        r = requests.get(f"{BASE}/entries/doesnotexist", headers=H(STAFF_TOK))
        assert r.status_code == 404
