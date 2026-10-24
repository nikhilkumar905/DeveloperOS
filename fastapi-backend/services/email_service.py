"""Transactional email (verification and password-reset codes) over SMTP.

Configure with SMTP_HOST, SMTP_PORT (587 STARTTLS or 465 SSL), SMTP_USER, SMTP_PASSWORD, SMTP_FROM.
For Gmail use smtp.gmail.com:587 and an App Password (Google Account -> Security -> App passwords).

Without SMTP settings, development mode prints the email to the server log so the flow is testable;
production refuses to send (the endpoint returns 503) rather than silently dropping codes.
"""
import asyncio
import os
import smtplib
import ssl
from email.message import EmailMessage
from html import escape

from services.auth_service import is_production

APP_NAME = "PersonalOS"


class EmailNotConfigured(RuntimeError):
    pass


def smtp_configured() -> bool:
    return all(os.getenv(k) for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD"))


def delivery_mode() -> str:
    if smtp_configured():
        return "smtp"
    return "disabled" if is_production() else "console"


def _send_sync(to: str, subject: str, text: str, html: str) -> None:
    msg = EmailMessage()
    msg["From"] = os.getenv("SMTP_FROM") or os.getenv("SMTP_USER")
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    host, port = os.getenv("SMTP_HOST"), int(os.getenv("SMTP_PORT", "587"))
    context = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as server:
            server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=20) as server:
            server.starttls(context=context)
            server.login(os.getenv("SMTP_USER"), os.getenv("SMTP_PASSWORD"))
            server.send_message(msg)


async def send_email(to: str, subject: str, text: str, html: str) -> None:
    mode = delivery_mode()
    if mode == "smtp":
        await asyncio.to_thread(_send_sync, to, subject, text, html)
    elif mode == "console":
        print(f"[email:dev] To: {to} | Subject: {subject}\n{text}\n", flush=True)
    else:
        raise EmailNotConfigured("Email delivery is not configured")


def _code_email(heading: str, intro: str, code: str, footer: str) -> tuple:
    text = f"{heading}\n\n{intro}\n\n    {code}\n\nThis code expires in 10 minutes. {footer}\n\n— {APP_NAME}"
    html = f"""<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
  <h2 style="margin:0 0 12px">{escape(heading)}</h2>
  <p style="margin:0 0 20px;color:#334155">{escape(intro)}</p>
  <div style="font-size:32px;letter-spacing:8px;font-weight:700;background:#f1f5f9;border-radius:8px;padding:16px;text-align:center">{escape(code)}</div>
  <p style="margin:20px 0 0;color:#64748b;font-size:13px">This code expires in 10 minutes. {escape(footer)}</p>
  <p style="margin:24px 0 0;color:#94a3b8;font-size:12px">— {APP_NAME}</p>
</div>"""
    return text, html


async def send_verification_code(to: str, code: str) -> None:
    text, html = _code_email(f"Verify your {APP_NAME} email", "Use this code to finish creating your account:", code,
                             "If you didn't sign up, you can ignore this email.")
    await send_email(to, f"{code} is your {APP_NAME} verification code", text, html)


async def send_password_reset_code(to: str, code: str) -> None:
    text, html = _code_email(f"Reset your {APP_NAME} password", "Use this code to set a new password:", code,
                             "If you didn't request this, your password is unchanged and you can ignore this email.")
    await send_email(to, f"{code} is your {APP_NAME} password reset code", text, html)


async def send_account_exists_notice(to: str) -> None:
    """Sent when someone tries to register an email that already has an account (the API response
    is identical either way, so registration can't be used to discover who has an account)."""
    text = (f"Someone tried to create a {APP_NAME} account with this email, but you already have one.\n\n"
            "If this was you, log in instead (or use 'Forgot password'). If not, you can ignore this email.")
    html = f"<div style=\"font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px\"><p>{escape(text)}</p></div>"
    await send_email(to, f"Your {APP_NAME} account", text, html)
