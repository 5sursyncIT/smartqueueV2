# Configuration Twilio pour SmartQueue

## 📱 Vue d'ensemble

Ce guide vous explique comment configurer l'intégration Twilio pour envoyer des SMS et des messages WhatsApp dans SmartQueue.

---

## 🔑 Credentials Twilio

D'après votre compte Twilio, voici les informations nécessaires :

- **Account SID**: `ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
- **Auth Token**: Disponible dans votre console Twilio (cliquez sur "Show auth token")
- **Numéro virtuel**: `+1234567890`

---

## ⚙️ Configuration Backend

### 1. Modifier le fichier `.env`

Éditez le fichier `backend/.env` et ajoutez vos credentials Twilio :

```bash
# Twilio (SMS & WhatsApp)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here  # À récupérer depuis la console Twilio
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Numéro sandbox WhatsApp de Twilio
```

### 2. Installer les dépendances

La bibliothèque Twilio devrait déjà être installée, mais vérifiez :

```bash
cd backend
source .venv/bin/activate
pip install twilio
```

### 3. Redémarrer les services

```bash
# Redémarrer Django/Daphne
make run-backend

# Redémarrer Celery worker (pour les notifications asynchrones)
make celery
```

---

## 🧪 Test de l'intégration

### Test 1: Envoi manuel depuis Django shell

```bash
cd backend
source .venv/bin/activate
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py shell
```

```python
from twilio.rest import Client
from django.conf import settings

# Tester la connexion
client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

# Envoyer un SMS de test
message = client.messages.create(
    body="Test SMS depuis SmartQueue! 🎉",
    from_=settings.TWILIO_PHONE_NUMBER,
    to="+221XXXXXXXXX"  # Remplacer par votre numéro de téléphone
)

print(f"SMS envoyé! SID: {message.sid}")
print(f"Statut: {message.status}")
```

### Test 2: Via l'API SmartQueue

#### 2.1 Créer un template de notification

```bash
curl -X POST http://localhost:8000/api/v1/admin/notification-templates/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant": "TENANT_ID",
    "name": "Test SMS",
    "channel": "sms",
    "event": "custom",
    "subject": "",
    "body": "Bonjour {{customer_name}}, ceci est un test SMS depuis SmartQueue!",
    "is_active": true
  }'
```

#### 2.2 Envoyer une notification de test

```python
from apps.notifications.tasks import render_and_send_notification

# Envoyer une notification
render_and_send_notification.delay(
    template_id="TEMPLATE_UUID",
    recipient="+221XXXXXXXXX",  # Votre numéro
    context={"customer_name": "Youssoupha"},
    tenant_id="TENANT_UUID"
)
```

### Test 3: Test automatique lors de la création d'un ticket

Lorsqu'un ticket est créé, si le client a activé les notifications SMS, un message sera automatiquement envoyé :

```bash
# Créer un ticket via l'API
curl -X POST http://localhost:8000/api/v1/tenants/demo-bank/tickets/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "queue_id": "QUEUE_UUID",
    "customer_id": "CUSTOMER_UUID",
    "priority": "normal"
  }'
```

---

## 📱 Configuration WhatsApp

### Activer le Sandbox WhatsApp de Twilio

1. Allez dans votre console Twilio : https://console.twilio.com/
2. Naviguez vers **Messaging** → **Try it out** → **Send a WhatsApp message**
3. Suivez les instructions pour activer le sandbox WhatsApp
4. Notez le numéro WhatsApp du sandbox (généralement `+14155238886`)

### Configuration dans `.env`

```bash
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Test WhatsApp

```python
from apps.notifications.models import Notification

# Créer une notification WhatsApp
notification = Notification.objects.create(
    tenant_id="TENANT_UUID",
    channel="whatsapp",
    recipient="whatsapp:+221XXXXXXXXX",  # Votre numéro avec préfixe whatsapp:
    subject="",
    body="Bonjour! Ceci est un test WhatsApp depuis SmartQueue 🎉",
)

# Envoyer
from apps.notifications.tasks import send_notification
send_notification.delay(str(notification.id))
```

---

## 🔍 Vérification et Débogage

### Logs Twilio

Consultez les logs d'envoi dans la console Twilio :
- https://console.twilio.com/us1/monitor/logs/sms

### Logs Django

```bash
# Voir les logs Celery
tail -f celery.log

# Voir les notifications en base de données
python manage.py shell
>>> from apps.notifications.models import Notification
>>> Notification.objects.all().order_by('-created_at')[:10]
```

### Statuts de notification

```python
# Vérifier le statut d'une notification
notification = Notification.objects.get(id="NOTIFICATION_UUID")
print(f"Statut: {notification.status}")
print(f"Message d'erreur: {notification.error_message}")
print(f"Provider ID (Twilio SID): {notification.provider_id}")
```

---

## 💰 Coûts et Limites

### Compte Trial Twilio

Avec votre compte trial ($15.50 de crédit) :
- **SMS** : ~$0.0075 par SMS aux USA/Canada, variable selon les pays
- **WhatsApp** : ~$0.005 par message

### Limites du compte Trial

- Vous pouvez uniquement envoyer des messages aux numéros vérifiés
- Pour ajouter un numéro vérifié : Console Twilio → **Phone Numbers** → **Verified Caller IDs**

### Passer en compte Production

Pour envoyer des messages à n'importe quel numéro :
1. Complétez la vérification de votre compte
2. Ajoutez un moyen de paiement
3. Le compte passera automatiquement en mode production

---

## 📝 Templates de Messages SMS

Voici quelques templates utiles pour SmartQueue :

### Ticket Créé

```
Bonjour {{customer_name}},

Votre ticket #{{ticket_number}} a été créé pour {{service_name}}.

File d'attente: {{queue_name}}
Temps d'attente estimé: {{eta_minutes}} minutes

Merci de votre patience!
- SmartQueue
```

### Ticket Appelé

```
{{customer_name}}, c'est votre tour!

Ticket #{{ticket_number}}
Rendez-vous au guichet de {{agent_name}}

- SmartQueue
```

### Ticket Presque Appelé (5 min avant)

```
{{customer_name}}, votre tour approche!

Ticket #{{ticket_number}}
Encore environ 5 minutes d'attente.

Merci de rester disponible.
- SmartQueue
```

---

## 🔐 Sécurité

### Protéger vos credentials

- ❌ **Ne committez JAMAIS** le fichier `.env` dans Git
- ✅ Le fichier `.env` est déjà dans `.gitignore`
- ✅ Utilisez des variables d'environnement en production
- ✅ Rotez régulièrement votre Auth Token Twilio

### Variables d'environnement en production

```bash
# Exemple avec Docker
docker run -e TWILIO_ACCOUNT_SID=ACc... -e TWILIO_AUTH_TOKEN=xxx ...

# Exemple avec systemd
Environment="TWILIO_ACCOUNT_SID=ACc..."
Environment="TWILIO_AUTH_TOKEN=xxx"
```

---

## ✅ Checklist de Configuration

- [ ] Credentials Twilio ajoutés dans `.env`
- [ ] Bibliothèque `twilio` installée
- [ ] Services Django et Celery redémarrés
- [ ] Test SMS manuel réussi
- [ ] Templates de notification créés
- [ ] Numéro(s) de test vérifié(s) dans Twilio
- [ ] WhatsApp sandbox activé (optionnel)
- [ ] Logs vérifiés (pas d'erreurs)

---

## 📚 Ressources

- **Documentation Twilio SMS** : https://www.twilio.com/docs/sms
- **Documentation Twilio WhatsApp** : https://www.twilio.com/docs/whatsapp
- **Console Twilio** : https://console.twilio.com/
- **Tarifs Twilio** : https://www.twilio.com/sms/pricing

---

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs Celery : `tail -f celery.log`
2. Consultez les logs Twilio : https://console.twilio.com/us1/monitor/logs
3. Vérifiez le statut de vos notifications dans la BDD
4. Assurez-vous que le numéro destinataire est vérifié (compte trial)

Pour plus d'aide, consultez :
- [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md)
- [Backend Devbook](./backend_devbook.md)
