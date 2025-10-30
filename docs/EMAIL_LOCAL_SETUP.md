# Configuration Email Local - SmartQueue

## 📧 Vue d'ensemble

Ce guide explique comment configurer un serveur SMTP local pour tester les emails en développement sans envoyer de vrais emails.

---

## 🎯 Pourquoi un serveur SMTP local?

**Avantages:**
- ✅ Pas besoin de credentials SendGrid
- ✅ Tous les emails sont capturés localement
- ✅ Interface web pour voir les emails
- ✅ Aucun email n'est vraiment envoyé
- ✅ Gratuit et illimité
- ✅ Parfait pour le développement et les tests

---

## 🚀 Option 1: Mailpit (Recommandé)

### Installation avec Docker

**1. Lancer Mailpit avec Docker Compose:**

```bash
# Depuis la racine du projet
docker-compose -f docker-compose.mailpit.yml up -d
```

**2. Vérifier que Mailpit fonctionne:**

```bash
docker ps | grep mailpit
```

Vous devriez voir:
```
smartqueue-mailpit   Up   0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

**3. Accéder à l'interface web:**

Ouvrez votre navigateur: http://localhost:8025

Vous verrez l'interface Mailpit prête à capturer les emails!

### Installation sans Docker (Alternative)

```bash
# Linux/macOS
wget https://github.com/axllent/mailpit/releases/latest/download/mailpit-linux-amd64.tar.gz
tar -xzf mailpit-linux-amd64.tar.gz
sudo mv mailpit /usr/local/bin/
mailpit

# Ou avec Go
go install github.com/axllent/mailpit@latest
mailpit
```

---

## ⚙️ Configuration Django

La configuration est déjà dans `/backend/.env`:

```bash
# SMTP Local (Mailpit)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_USE_TLS=False
EMAIL_USE_SSL=False
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@smartqueue.app
```

**Note:** Si `SENDGRID_API_KEY` est vide, le système utilisera automatiquement le SMTP local.

---

## 🧪 Tests

### Test 1: Email simple via Django shell

```bash
cd backend
source .venv/bin/activate
DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev python manage.py shell
```

```python
from django.core.mail import send_mail

send_mail(
    subject='Test Email depuis SmartQueue',
    message='Ceci est un test du serveur SMTP local!',
    from_email='noreply@smartqueue.app',
    recipient_list=['test@example.com'],
    fail_silently=False,
)

print("✅ Email envoyé! Vérifiez http://localhost:8025")
```

### Test 2: Email HTML

```python
from django.core.mail import EmailMultiAlternatives

subject = 'Test Email HTML - SmartQueue'
text_content = 'Ceci est le contenu texte.'
html_content = '''
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #4CAF50;">🎉 Test Email HTML</h2>
    <p>Ceci est un test d'email HTML depuis SmartQueue!</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Détails:</strong><br>
        Service: Test Service<br>
        Date: Aujourd'hui
    </div>
    <p>Cordialement,<br>L'équipe SmartQueue</p>
</body>
</html>
'''

msg = EmailMultiAlternatives(
    subject=subject,
    body=text_content,
    from_email='noreply@smartqueue.app',
    to=['test@example.com']
)
msg.attach_alternative(html_content, "text/html")
msg.send()

print("✅ Email HTML envoyé! Vérifiez http://localhost:8025")
```

### Test 3: Via le système de notification SmartQueue

```python
from apps.notifications.models import Notification
from apps.notifications.tasks import send_notification
from apps.tenants.models import Tenant

# Récupérer un tenant
tenant = Tenant.objects.first()

# Créer une notification email
notification = Notification.objects.create(
    tenant=tenant,
    channel='email',
    recipient='test@example.com',
    subject='Test Notification Email',
    body='''
    <html>
    <body>
        <h2>Bonjour!</h2>
        <p>Ceci est un test de notification email via SmartQueue.</p>
    </body>
    </html>
    ''',
)

# Envoyer
send_notification(str(notification.id))

# Vérifier le statut
notification.refresh_from_db()
print(f"Status: {notification.status}")
print("Vérifiez http://localhost:8025")
```

### Test 4: Notification automatique lors de la création d'un ticket

```python
from apps.tickets.models import Ticket
from apps.queues.models import Queue
from apps.customers.models import Customer

# Créer un client avec email
customer = Customer.objects.create(
    tenant=tenant,
    email="client@example.com",
    phone="+221770000000",
    first_name="Test",
    last_name="Client",
    notify_email=True,  # Activer les notifications email
    notify_sms=False,
)

# Créer un ticket
queue = Queue.objects.filter(tenant=tenant).first()
ticket = Ticket.objects.create(
    tenant=tenant,
    queue=queue,
    customer=customer,
    priority=0
)

print(f"✅ Ticket créé: #{ticket.number}")
print("Un email devrait être envoyé automatiquement!")
print("Vérifiez http://localhost:8025")
```

---

## 🔍 Interface Web Mailpit

### Accès

URL: http://localhost:8025

### Fonctionnalités

- **Inbox**: Voir tous les emails capturés
- **Source**: Voir le code source de l'email (HTML/texte)
- **Headers**: Voir tous les headers SMTP
- **Preview**: Prévisualisation HTML
- **Search**: Rechercher dans les emails
- **API**: API REST pour les tests automatisés

### API REST

```bash
# Liste des emails
curl http://localhost:8025/api/v1/messages

# Détails d'un email
curl http://localhost:8025/api/v1/message/{id}

# Supprimer tous les emails
curl -X DELETE http://localhost:8025/api/v1/messages
```

---

## 🐛 Dépannage

### Problème 1: Port 1025 déjà utilisé

```bash
# Vérifier quel processus utilise le port
sudo lsof -i :1025

# Arrêter Mailpit
docker-compose -f docker-compose.mailpit.yml down

# Ou changer le port dans docker-compose.mailpit.yml et .env
```

### Problème 2: Emails non reçus

**Vérifications:**
1. Mailpit est-il en cours d'exécution?
   ```bash
   docker ps | grep mailpit
   ```

2. Django utilise-t-il la bonne configuration?
   ```bash
   python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.EMAIL_HOST)
   >>> print(settings.EMAIL_PORT)
   ```

3. Voir les logs Mailpit:
   ```bash
   docker logs smartqueue-mailpit
   ```

### Problème 3: Erreur de connexion

```python
# Tester la connexion SMTP directement
import smtplib

try:
    server = smtplib.SMTP('localhost', 1025)
    server.ehlo()
    print("✅ Connexion réussie!")
    server.quit()
except Exception as e:
    print(f"❌ Erreur: {e}")
```

---

## 📊 Comparaison des solutions

| Solution | Interface Web | API REST | Docker | Sans Docker |
|----------|---------------|----------|---------|-------------|
| **Mailpit** | ✅ Moderne | ✅ | ✅ | ✅ |
| **MailHog** | ✅ Basique | ❌ | ✅ | ✅ |
| **smtp4dev** | ✅ .NET | ❌ | ✅ | Windows |
| **Python SMTP** | ❌ | ❌ | ❌ | ✅ Simple |

---

## 🚀 Commandes utiles

```bash
# Lancer Mailpit
docker-compose -f docker-compose.mailpit.yml up -d

# Arrêter Mailpit
docker-compose -f docker-compose.mailpit.yml down

# Voir les logs
docker logs -f smartqueue-mailpit

# Redémarrer Mailpit
docker-compose -f docker-compose.mailpit.yml restart

# Supprimer et recréer
docker-compose -f docker-compose.mailpit.yml down -v
docker-compose -f docker-compose.mailpit.yml up -d
```

---

## 📝 Configuration pour la production

En production, vous utiliserez SendGrid ou un autre service SMTP réel.

### Basculer vers SendGrid

1. Obtenir une clé API SendGrid
2. Modifier `.env`:
   ```bash
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Le système détectera automatiquement SendGrid et l'utilisera au lieu du SMTP local.

---

## ✅ Checklist

- [ ] Mailpit installé et lancé
- [ ] Interface web accessible (http://localhost:8025)
- [ ] Configuration Django mise à jour
- [ ] Test email simple réussi
- [ ] Test email HTML réussi
- [ ] Test via le système de notification réussi
- [ ] Templates email fonctionnels

---

## 📚 Ressources

- **Mailpit GitHub**: https://github.com/axllent/mailpit
- **Documentation Django Email**: https://docs.djangoproject.com/en/4.2/topics/email/
- **Templates email SmartQueue**: Voir les templates créés avec `create_default_templates`

---

## 🆘 Support

Si vous rencontrez des problèmes:
1. Vérifiez que Mailpit fonctionne: `docker ps | grep mailpit`
2. Consultez les logs: `docker logs smartqueue-mailpit`
3. Testez la connexion SMTP manuellement
4. Vérifiez les settings Django

Pour plus d'aide, consultez:
- [TWILIO_SETUP.md](./TWILIO_SETUP.md)
- [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md)
