# Guide de Dépannage SMTP - Emails Non Reçus

## Problème Actuel

Les emails sont envoyés avec succès depuis Django, mais ne sont pas reçus dans la boîte de réception.

## Diagnostic

D'après les logs:
```
Configuration utilisée:
- Serveur SMTP: mail.5sursync.com
- Port: 587
- TLS: Non ❌
- SSL: Non
- Authentification: Oui
- From: support@5sursync.com
- To: ydiop@5sursync.com
```

### ⚠️ Problème Principal: TLS Désactivé sur Port 587

**Le port 587 nécessite TLS (STARTTLS) pour fonctionner correctement!**

Sans TLS:
- L'authentification peut échouer silencieusement
- Les emails peuvent être rejetés par le serveur
- Les messages peuvent être marqués comme spam
- Le serveur peut refuser la connexion

## Solution Recommandée

### Option 1: Activer TLS (RECOMMANDÉ)

Dans l'interface `http://localhost:3000/superadmin/system`, section "Configuration SMTP":

1. **Activez le switch TLS** ✓
2. **Gardez SSL désactivé** ✗
3. **Port: 587**
4. Cliquez sur "Enregistrer la configuration"
5. Envoyez un nouvel email de test

```
Configuration correcte pour port 587:
✓ Host: mail.5sursync.com
✓ Port: 587
✓ TLS: Activé (STARTTLS)
✗ SSL: Désactivé
✓ Username: support@5sursync.com (ou juste 'support' selon votre serveur)
✓ Password: votre_mot_de_passe
✓ From: support@5sursync.com
```

### Option 2: Utiliser le Port 465 avec SSL

Si votre serveur supporte SSL/TLS direct:

1. **Port: 465**
2. **TLS: Désactivé** ✗
3. **SSL: Activé** ✓
4. Authentification requise

## Autres Causes Possibles

### 1. Credentials Incorrects

**Symptômes:**
- Erreur: "Incorrect authentication data"
- Email non envoyé

**Solutions:**
- Vérifiez que le username est correct (essayez `support@5sursync.com` OU juste `support`)
- Vérifiez le mot de passe
- Contactez votre hébergeur pour confirmer les credentials

### 2. Email Marqué comme SPAM

**Symptômes:**
- Email envoyé avec succès
- Pas d'erreur dans les logs
- Email non reçu

**Solutions:**
- ✓ Vérifiez le dossier SPAM/Courrier indésirable
- ✓ Ajoutez `support@5sursync.com` à vos contacts
- ✓ Vérifiez les règles de filtrage de votre boîte email
- ✓ Vérifiez que le domaine 5sursync.com a des enregistrements SPF/DKIM configurés

### 3. Restrictions du Serveur SMTP

**Symptômes:**
- Email envoyé mais jamais reçu
- Pas d'erreur visible

**Solutions:**
- Vérifiez avec votre hébergeur si le serveur SMTP a des restrictions
- Certains serveurs n'autorisent l'envoi que depuis certaines IP
- Vérifiez les quotas d'envoi (emails par heure/jour)

### 4. Domaine Non Vérifié

**Symptômes:**
- Email envoyé mais rejeté silencieusement

**Solutions:**
- Vérifiez que le domaine 5sursync.com est configuré sur le serveur SMTP
- Vérifiez que l'adresse `support@5sursync.com` existe et peut envoyer
- Contactez votre hébergeur pour vérifier la configuration du domaine

### 5. Délai de Livraison

**Symptômes:**
- Email envoyé mais pas encore reçu

**Solutions:**
- Attendez 5-10 minutes
- Les emails peuvent prendre du temps selon les serveurs
- Vérifiez l'état des serveurs email (expéditeur et destinataire)

## Test Manuel de Configuration

### Vérifier la Connexion SMTP

```bash
# Test avec openssl (port 587 - STARTTLS)
openssl s_client -connect mail.5sursync.com:587 -starttls smtp

# Test avec openssl (port 465 - SSL/TLS)
openssl s_client -connect mail.5sursync.com:465

# Commandes à taper après connexion:
EHLO localhost
AUTH LOGIN
(entrez username en base64)
(entrez password en base64)
MAIL FROM:<support@5sursync.com>
RCPT TO:<ydiop@5sursync.com>
DATA
Subject: Test manuel
From: support@5sursync.com
To: ydiop@5sursync.com

Ceci est un test manuel.
.
QUIT
```

### Encoder Username/Password en Base64

```bash
echo -n "support@5sursync.com" | base64
echo -n "votre_mot_de_passe" | base64
```

## Configurations SMTP Courantes

### Gmail SMTP
```
Host: smtp.gmail.com
Port: 587
TLS: ✓ Activé
SSL: ✗ Désactivé
Username: votre-email@gmail.com
Password: App Password (pas le mot de passe normal!)
```

### Office 365 / Outlook
```
Host: smtp.office365.com
Port: 587
TLS: ✓ Activé
SSL: ✗ Désactivé
Username: votre-email@outlook.com
Password: votre_mot_de_passe
```

### SendGrid
```
Host: smtp.sendgrid.net
Port: 587
TLS: ✓ Activé
SSL: ✗ Désactivé
Username: apikey
Password: votre_api_key_sendgrid
```

### cPanel / Hébergement Web Standard
```
Host: mail.votre-domaine.com
Port: 587 (ou 465)
TLS: ✓ Activé (pour 587)
SSL: ✓ Activé (pour 465)
Username: votre-email@votre-domaine.com (ou juste 'username')
Password: votre_mot_de_passe
```

## Checklist de Vérification

Avant de contacter le support, vérifiez:

- [ ] TLS activé pour port 587 (ou SSL pour port 465)
- [ ] Username correct (email complet ou juste username)
- [ ] Mot de passe correct
- [ ] Adresse email d'expéditeur existe et peut envoyer
- [ ] Adresse email destinataire est correcte
- [ ] Dossier SPAM vérifié
- [ ] Attendu 5-10 minutes pour la livraison
- [ ] Serveur SMTP accessible depuis votre réseau
- [ ] Pas de quota d'envoi dépassé
- [ ] Enregistrements SPF/DKIM configurés pour le domaine

## Logs et Diagnostic

Pour voir les logs détaillés du serveur Django:

```bash
# Terminal où le serveur Django tourne
# Les logs SMTP apparaissent directement dans la console
```

Pour activer les logs SMTP détaillés (mode debug):

Ajoutez dans `backend/smartqueue_backend/settings/dev.py`:

```python
# Debug SMTP
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_DEBUG = True  # Active les logs détaillés

# OU pour test sans envoi réel:
# EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

## Contact Support

Si le problème persiste après avoir activé TLS:

**Informations à fournir à votre hébergeur:**
- Serveur SMTP: mail.5sursync.com
- Port utilisé: 587
- TLS/SSL: Activé
- Username: support@5sursync.com
- Message d'erreur exact (si disponible)
- Logs du serveur SMTP côté hébergeur

**Questions à poser:**
1. Le port 587 est-il ouvert et accessible?
2. TLS/STARTTLS est-il requis sur ce port?
3. Quel format de username est requis? (email complet ou juste 'support')
4. Y a-t-il des restrictions d'envoi (IP, domaine, quota)?
5. Les enregistrements SPF/DKIM sont-ils configurés?

## Action Immédiate

**➡️ ALLEZ DANS L'INTERFACE ET ACTIVEZ TLS!**

1. Ouvrez: `http://localhost:3000/superadmin/system`
2. Scrollez jusqu'à "Configuration SMTP"
3. **Activez le switch TLS** (il devrait passer au bleu/vert)
4. Cliquez sur "Enregistrer la configuration"
5. Envoyez un nouveau test email
6. Vérifiez votre boîte de réception (et le dossier SPAM) après 2-3 minutes

---

**Date:** 26 Octobre 2025
**Problème:** Emails non reçus avec port 587 sans TLS
**Solution:** Activer TLS pour port 587
