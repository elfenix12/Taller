import os
import asyncio
import smtplib
import logging
from email.message import EmailMessage

logger = logging.getLogger("mailer")
REQUIRED = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM_NAME", "MAIL_TALLER"]


def is_configured() -> bool:
    return all(os.environ.get(k) for k in REQUIRED)


def _body(entry: dict, taller: dict) -> str:
    nombre = entry["cliente"].get("nombre") or "cliente"
    v = entry["vehiculo"]
    return (
        f"Hola {nombre}:\n\n"
        f"Gracias por confiar en {taller['nombre']}. Adjuntamos el comprobante de entrada de su vehículo "
        f"{v.get('marca', '')} {v.get('modelo', '')} con placas {v.get('placas', '')} (folio {entry['folio_str']}).\n\n"
        "Por favor conserve este documento; es necesario para la entrega de la unidad.\n\n"
        f"Atentamente,\n{taller['nombre']}\nTel. {taller['telefono']}\n{taller['direccion']}\n"
    )


def _send_sync(msg: EmailMessage):
    host, port = os.environ["SMTP_HOST"], int(os.environ["SMTP_PORT"])
    user, pwd = os.environ["SMTP_USER"], os.environ["SMTP_PASS"]
    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=30) as s:
            s.login(user, pwd)
            s.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=30) as s:
            s.starttls()
            s.login(user, pwd)
            s.send_message(msg)


async def send_entry(entry: dict, taller: dict, pdf: bytes) -> None:
    taller_mail = os.environ["MAIL_TALLER"]
    cliente_mail = (entry["cliente"].get("correo") or "").strip()
    msg = EmailMessage()
    msg["Subject"] = f"Entrada de vehículo - Folio {entry['folio_str']} - {entry['vehiculo'].get('placas', '')}"
    msg["From"] = f"{os.environ['MAIL_FROM_NAME']} <{os.environ['SMTP_USER']}>"
    if cliente_mail:
        msg["To"] = cliente_mail
        msg["Cc"] = taller_mail
    else:
        msg["To"] = taller_mail
    msg.set_content(_body(entry, taller))
    msg.add_attachment(pdf, maintype="application", subtype="pdf",
                       filename=f"Entrada_{entry['folio_str']}.pdf")
    await asyncio.to_thread(_send_sync, msg)
    logger.info("Correo enviado folio %s", entry["folio_str"])
