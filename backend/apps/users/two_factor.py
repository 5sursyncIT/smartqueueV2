"""Two-Factor Authentication (2FA) avec TOTP et SMS."""

from __future__ import annotations

import hmac
import secrets
import time
from base64 import b32encode
from hashlib import sha1
from io import BytesIO
from typing import TYPE_CHECKING

import qrcode
from django.conf import settings
from django.core.cache import cache

if TYPE_CHECKING:
    from apps.users.models import User


class TOTPService:
    """Service pour générer et valider des codes TOTP (Time-based One-Time Password)."""

    @staticmethod
    def generate_secret() -> str:
        """Génère une clé secrète aléatoire pour TOTP.

        Returns:
            str: Clé secrète en base32 (compatible avec Google Authenticator)
        """
        random_bytes = secrets.token_bytes(20)
        return b32encode(random_bytes).decode("utf-8")

    @staticmethod
    def get_totp_code(secret: str, time_step: int = 30) -> str:
        """Génère un code TOTP à 6 chiffres.

        Args:
            secret: Clé secrète en base32
            time_step: Durée de validité en secondes (défaut: 30s)

        Returns:
            str: Code à 6 chiffres
        """
        # Calculer le compteur basé sur le temps
        time_counter = int(time.time() // time_step)

        # Convertir le compteur en bytes (8 bytes, big-endian)
        counter_bytes = time_counter.to_bytes(8, byteorder="big")

        # Décoder le secret de base32
        from base64 import b32decode

        key = b32decode(secret.upper())

        # Générer HMAC-SHA1
        hmac_hash = hmac.new(key, counter_bytes, sha1).digest()

        # Dynamic truncation
        offset = hmac_hash[-1] & 0x0F
        truncated_hash = hmac_hash[offset : offset + 4]

        # Convertir en int
        code = int.from_bytes(truncated_hash, byteorder="big") & 0x7FFFFFFF

        # Garder seulement 6 chiffres
        code = code % 1_000_000

        return f"{code:06d}"

    @staticmethod
    def verify_totp_code(secret: str, code: str, window: int = 1) -> bool:
        """Vérifie un code TOTP avec une fenêtre de tolérance.

        Args:
            secret: Clé secrète en base32
            code: Code à vérifier
            window: Nombre de time steps à tolérer (défaut: 1 = ±30s)

        Returns:
            bool: True si le code est valide
        """
        # Vérifier le format
        if not code or not code.isdigit() or len(code) != 6:
            return False

        # Vérifier le code actuel et la fenêtre de tolérance
        for offset in range(-window, window + 1):
            time_counter = int(time.time() // 30) + offset
            expected_code = TOTPService._generate_code_for_counter(secret, time_counter)
            if expected_code == code:
                return True

        return False

    @staticmethod
    def _generate_code_for_counter(secret: str, time_counter: int) -> str:
        """Génère un code TOTP pour un compteur spécifique."""
        from base64 import b32decode

        counter_bytes = time_counter.to_bytes(8, byteorder="big")
        key = b32decode(secret.upper())
        hmac_hash = hmac.new(key, counter_bytes, sha1).digest()
        offset = hmac_hash[-1] & 0x0F
        truncated_hash = hmac_hash[offset : offset + 4]
        code = int.from_bytes(truncated_hash, byteorder="big") & 0x7FFFFFFF
        return f"{code % 1_000_000:06d}"

    @staticmethod
    def generate_qr_code(user: User, secret: str) -> bytes:
        """Génère un QR code pour configurer TOTP dans une app (Google Authenticator, etc.).

        Args:
            user: L'utilisateur
            secret: La clé secrète TOTP

        Returns:
            bytes: Image PNG du QR code
        """
        # Format: otpauth://totp/SmartQueue:email?secret=SECRET&issuer=SmartQueue
        issuer = "SmartQueue"
        account_name = user.email
        otpauth_url = (
            f"otpauth://totp/{issuer}:{account_name}"
            f"?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30"
        )

        # Générer le QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(otpauth_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        # Convertir en bytes
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        return buffer.getvalue()


class SMSTwoFactorService:
    """Service pour envoyer des codes 2FA par SMS."""

    CODE_LENGTH = 6
    CACHE_TIMEOUT = 300  # 5 minutes

    @staticmethod
    def generate_sms_code() -> str:
        """Génère un code aléatoire à 6 chiffres.

        Returns:
            str: Code à 6 chiffres
        """
        return f"{secrets.randbelow(1_000_000):06d}"

    @staticmethod
    def send_sms_code(user: User, phone_number: str) -> bool:
        """Envoie un code 2FA par SMS.

        Args:
            user: L'utilisateur
            phone_number: Numéro de téléphone

        Returns:
            bool: True si l'envoi a réussi
        """
        code = SMSTwoFactorService.generate_sms_code()

        # Stocker le code en cache (5 minutes)
        cache_key = f"sms_2fa:{user.id}"
        cache.set(cache_key, code, timeout=SMSTwoFactorService.CACHE_TIMEOUT)

        # Envoyer le SMS via Twilio
        try:
            from apps.notifications.sms import send_sms

            message = f"Votre code de vérification SmartQueue est: {code}. Valide 5 minutes."
            return send_sms(phone_number, message)
        except Exception:  # pragma: no cover
            # Log error mais ne pas exposer les détails
            return False

    @staticmethod
    def verify_sms_code(user: User, code: str) -> bool:
        """Vérifie un code SMS.

        Args:
            user: L'utilisateur
            code: Le code à vérifier

        Returns:
            bool: True si le code est valide
        """
        cache_key = f"sms_2fa:{user.id}"
        cached_code = cache.get(cache_key)

        if not cached_code:
            return False

        # Utiliser constant-time comparison pour éviter timing attacks
        is_valid = hmac.compare_digest(cached_code, code)

        # Supprimer le code après vérification (usage unique)
        if is_valid:
            cache.delete(cache_key)

        return is_valid


class BackupCodesService:
    """Service pour gérer les codes de backup (codes de récupération)."""

    CODES_COUNT = 8
    CODE_LENGTH = 10

    @staticmethod
    def generate_backup_codes() -> list[str]:
        """Génère une liste de codes de backup.

        Returns:
            list[str]: Liste de codes aléatoires
        """
        codes = []
        for _ in range(BackupCodesService.CODES_COUNT):
            # Format: XXXX-XXXX-XX (10 caractères alphanumériques)
            code_parts = [
                secrets.token_hex(2).upper(),
                secrets.token_hex(2).upper(),
                secrets.token_hex(1).upper(),
            ]
            codes.append("-".join(code_parts))
        return codes

    @staticmethod
    def hash_backup_code(code: str) -> str:
        """Hash un code de backup pour stockage sécurisé.

        Args:
            code: Le code en clair

        Returns:
            str: Hash du code
        """
        from django.contrib.auth.hashers import make_password

        return make_password(code)

    @staticmethod
    def verify_backup_code(code: str, hashed_code: str) -> bool:
        """Vérifie un code de backup.

        Args:
            code: Le code en clair
            hashed_code: Le hash stocké

        Returns:
            bool: True si le code correspond
        """
        from django.contrib.auth.hashers import check_password

        return check_password(code, hashed_code)
