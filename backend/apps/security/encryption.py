"""Services de chiffrement pour protéger les données sensibles."""

from __future__ import annotations

import base64
import os
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from django.conf import settings


class EncryptionService:
    """Service pour chiffrer et déchiffrer les données sensibles."""

    @staticmethod
    def _get_encryption_key() -> bytes:
        """Récupère la clé de chiffrement depuis les settings.

        Returns:
            bytes: Clé de chiffrement Fernet
        """
        # Utiliser la SECRET_KEY Django pour dériver une clé Fernet
        secret = settings.SECRET_KEY.encode()

        # Utiliser un sel fixe (dans un environnement de production, ceci devrait être configurable)
        salt = b"smartqueue-encryption-salt"

        # Dériver une clé de 32 bytes avec PBKDF2
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend(),
        )

        key = base64.urlsafe_b64encode(kdf.derive(secret))
        return key

    @staticmethod
    def encrypt(data: str | bytes) -> str:
        """Chiffre des données.

        Args:
            data: Données à chiffrer (str ou bytes)

        Returns:
            str: Données chiffrées en base64
        """
        if isinstance(data, str):
            data = data.encode("utf-8")

        key = EncryptionService._get_encryption_key()
        fernet = Fernet(key)
        encrypted = fernet.encrypt(data)

        return encrypted.decode("utf-8")

    @staticmethod
    def decrypt(encrypted_data: str | bytes) -> str:
        """Déchiffre des données.

        Args:
            encrypted_data: Données chiffrées

        Returns:
            str: Données déchiffrées

        Raises:
            InvalidToken: Si le déchiffrement échoue
        """
        if isinstance(encrypted_data, str):
            encrypted_data = encrypted_data.encode("utf-8")

        key = EncryptionService._get_encryption_key()
        fernet = Fernet(key)

        try:
            decrypted = fernet.decrypt(encrypted_data)
            return decrypted.decode("utf-8")
        except InvalidToken:
            raise ValueError("Impossible de déchiffrer les données")

    @staticmethod
    def encrypt_dict(data: dict) -> dict:
        """Chiffre les valeurs sensibles d'un dictionnaire.

        Args:
            data: Dictionnaire contenant des données sensibles

        Returns:
            dict: Dictionnaire avec valeurs chiffrées
        """
        import json

        json_str = json.dumps(data)
        encrypted = EncryptionService.encrypt(json_str)

        return {"encrypted": encrypted}

    @staticmethod
    def decrypt_dict(encrypted_data: dict) -> dict:
        """Déchiffre un dictionnaire.

        Args:
            encrypted_data: Dictionnaire avec clé "encrypted"

        Returns:
            dict: Dictionnaire déchiffré
        """
        import json

        encrypted_str = encrypted_data.get("encrypted", "")
        if not encrypted_str:
            return {}

        decrypted_str = EncryptionService.decrypt(encrypted_str)
        return json.loads(decrypted_str)


class FieldEncryption:
    """Classe helper pour chiffrer des champs de modèles Django."""

    @staticmethod
    def encrypt_field(value: Any) -> str:
        """Chiffre un champ.

        Args:
            value: Valeur à chiffrer

        Returns:
            str: Valeur chiffrée
        """
        if value is None:
            return ""

        return EncryptionService.encrypt(str(value))

    @staticmethod
    def decrypt_field(encrypted_value: str) -> str:
        """Déchiffre un champ.

        Args:
            encrypted_value: Valeur chiffrée

        Returns:
            str: Valeur déchiffrée
        """
        if not encrypted_value:
            return ""

        try:
            return EncryptionService.decrypt(encrypted_value)
        except (ValueError, InvalidToken):
            return ""


class TokenService:
    """Service pour générer et vérifier des tokens sécurisés."""

    @staticmethod
    def generate_token(length: int = 32) -> str:
        """Génère un token aléatoire sécurisé.

        Args:
            length: Longueur du token en bytes (défaut: 32)

        Returns:
            str: Token hexadécimal
        """
        return os.urandom(length).hex()

    @staticmethod
    def generate_api_key() -> str:
        """Génère une clé API sécurisée.

        Returns:
            str: Clé API au format sq_xxx...
        """
        token = TokenService.generate_token(32)
        return f"sq_{token}"

    @staticmethod
    def hash_api_key(api_key: str) -> str:
        """Hash une clé API pour stockage sécurisé.

        Args:
            api_key: La clé API en clair

        Returns:
            str: Hash de la clé
        """
        from django.contrib.auth.hashers import make_password

        return make_password(api_key)

    @staticmethod
    def verify_api_key(api_key: str, hashed_key: str) -> bool:
        """Vérifie une clé API.

        Args:
            api_key: La clé API en clair
            hashed_key: Le hash stocké

        Returns:
            bool: True si la clé correspond
        """
        from django.contrib.auth.hashers import check_password

        return check_password(api_key, hashed_key)


class PII Protection:
    """Protection des informations personnellement identifiables (PII)."""

    @staticmethod
    def mask_email(email: str) -> str:
        """Masque une adresse email.

        Args:
            email: Email à masquer

        Returns:
            str: Email masqué (ex: j***@example.com)
        """
        if "@" not in email:
            return email

        local, domain = email.split("@", 1)

        if len(local) <= 2:
            masked_local = local[0] + "*"
        else:
            masked_local = local[0] + ("*" * (len(local) - 1))

        return f"{masked_local}@{domain}"

    @staticmethod
    def mask_phone(phone: str) -> str:
        """Masque un numéro de téléphone.

        Args:
            phone: Numéro à masquer

        Returns:
            str: Numéro masqué (ex: +221 ** *** **34)
        """
        if len(phone) < 4:
            return "***"

        # Garder les 2 premiers et 2 derniers caractères
        return phone[:2] + ("*" * (len(phone) - 4)) + phone[-2:]

    @staticmethod
    def redact_sensitive_data(data: dict, sensitive_fields: list[str]) -> dict:
        """Redacte les champs sensibles d'un dictionnaire.

        Args:
            data: Dictionnaire de données
            sensitive_fields: Liste des champs à redacter

        Returns:
            dict: Dictionnaire avec champs redactés
        """
        redacted = data.copy()

        for field in sensitive_fields:
            if field in redacted:
                if "email" in field.lower():
                    redacted[field] = PIIProtection.mask_email(str(redacted[field]))
                elif "phone" in field.lower():
                    redacted[field] = PIIProtection.mask_phone(str(redacted[field]))
                else:
                    redacted[field] = "***REDACTED***"

        return redacted
