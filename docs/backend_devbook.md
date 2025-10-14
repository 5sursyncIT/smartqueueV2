# Backend Developer Book - SmartQueue

## 📋 Table des matières

1. [Architecture Backend](#architecture-backend)
2. [Configuration de l'environnement](#configuration-de-lenvironnement)
3. [Structure du projet](#structure-du-projet)
4. [Modèles de données](#modèles-de-données)
5. [API REST](#api-rest)
6. [WebSockets temps réel](#websockets-temps-réel)
7. [Multi-tenancy](#multi-tenancy)
8. [Authentification & autorisation](#authentification--autorisation)
9. [Tâches asynchrones](#tâches-asynchrones)
10. [Tests](#tests)
11. [Déploiement](#déploiement)

## 🏗️ Architecture Backend

### Stack technique
- **Framework** : Django 4.2+ avec Django REST Framework
- **Base de données** : PostgreSQL 14+
- **Cache/Broker** : Redis 7+
- **WebSockets** : Django Channels
- **Tâches async** : Celery
- **Recherche** : OpenSearch/Elasticsearch (optionnel)

### Composants principaux
```
smartqueue-backend/
├── apps/
│   ├── tenants/          # Gestion multi-tenant
│   ├── authentication/   # Auth & permissions
│   ├── queues/          # Files d'attente
│   ├── tickets/         # Gestion des tickets
│   ├── appointments/    # Rendez-vous
│   ├── agents/          # Gestion des agents
│   ├── notifications/   # Système de notifications
│   ├── analytics/       # Analytics & reporting
│   └── integrations/    # Intégrations externes
├── core/                # Configuration & utilitaires
├── websockets/          # Consumers WebSocket
└── tasks/               # Tâches Celery
```

## ⚙️ Configuration de l'environnement

### Variables d'environnement
```bash
# Base de données
DATABASE_URL=postgresql://user:password@localhost:5432/smartqueue
DATABASE_REPLICA_URL=postgresql://user:password@localhost:5432/smartqueue_replica

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1

# Sécurité
SECRET_KEY=your-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1,.smartqueue.app
CORS_ALLOWED_ORIGINS=https://app.smartqueue.com

# Intégrations
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
SENDGRID_API_KEY=your-sendgrid-key
```

### Installation
```bash
# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate

# Installer les dépendances
pip install -r requirements.txt

# Migrations
python manage.py migrate

# Créer un superutilisateur
python manage.py createsuperuser
```

## 📁 Structure du projet

### Apps Django
Chaque app suit la structure MVT de Django avec des ajouts spécifiques :

```
apps/queues/
├── models.py           # Modèles Queue, QueueRule
├── serializers.py      # Sérializers DRF
├── views.py           # ViewSets API
├── permissions.py     # Permissions personnalisées
├── filters.py         # Filtres DRF
├── tasks.py           # Tâches Celery
├── consumers.py       # WebSocket consumers
├── algorithms.py      # Algorithmes de file
└── tests/
    ├── test_models.py
    ├── test_views.py
    └── test_algorithms.py
```

## 🗄️ Modèles de données

### Modèle Tenant (Multi-tenancy)
```python
class Tenant(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    plan = models.CharField(max_length=50, choices=PLAN_CHOICES)
    locale = models.CharField(max_length=10, default='fr')
    timezone = models.CharField(max_length=50, default='UTC')
    data_retention_days = models.IntegerField(default=365)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'tenants'
```

### Modèle Queue
```python
class Queue(TenantAwareModel):
    site = models.ForeignKey('sites.Site', on_delete=models.CASCADE)
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    algorithm = models.CharField(max_length=50, choices=ALGO_CHOICES, default='fifo')
    max_capacity = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'queues'
        unique_together = ['tenant', 'site', 'service']
```

### Modèle Ticket
```python
class Ticket(TenantAwareModel):
    queue = models.ForeignKey(Queue, on_delete=models.CASCADE)
    customer = models.ForeignKey('customers.Customer', null=True, on_delete=models.SET_NULL)
    number = models.CharField(max_length=20)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    priority = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    eta_seconds = models.IntegerField(null=True)
    agent = models.ForeignKey('agents.Agent', null=True, on_delete=models.SET_NULL)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    called_at = models.DateTimeField(null=True)
    started_at = models.DateTimeField(null=True)
    ended_at = models.DateTimeField(null=True)
    
    class Meta:
        db_table = 'tickets'
        ordering = ['created_at']
```

## 🔌 API REST

### Structure des ViewSets
```python
class TicketViewSet(TenantViewSetMixin, ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [IsTenantUser, HasScope('write:queue')]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = TicketFilter
    ordering_fields = ['created_at', 'priority']
    
    def get_queryset(self):
        return Ticket.objects.filter(
            tenant=self.request.tenant
        ).select_related('queue', 'customer', 'agent')
    
    def perform_create(self, serializer):
        ticket = serializer.save(
            tenant=self.request.tenant,
            number=self.generate_ticket_number()
        )
        # Notification temps réel
        self.notify_ticket_created(ticket)
        # Tâche asynchrone pour ETA
        calculate_eta.delay(ticket.id)
    
    @action(detail=True, methods=['post'])
    def call(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = 'appelé'
        ticket.called_at = timezone.now()
        ticket.save()
        
        # WebSocket notification
        self.notify_ticket_called(ticket)
        return Response({'status': 'called'})
```

### Endpoints principaux
```
# Tickets
POST   /api/v1/tenants/{tenant}/tickets/
GET    /api/v1/tenants/{tenant}/tickets/
GET    /api/v1/tenants/{tenant}/tickets/{id}/
POST   /api/v1/tenants/{tenant}/tickets/{id}/call/
POST   /api/v1/tenants/{tenant}/tickets/{id}/transfer/

# Queues
GET    /api/v1/tenants/{tenant}/queues/
GET    /api/v1/tenants/{tenant}/queues/{id}/
GET    /api/v1/tenants/{tenant}/queues/{id}/stats/

# Agents
POST   /api/v1/tenants/{tenant}/agents/{id}/call-next/
POST   /api/v1/tenants/{tenant}/agents/{id}/set-status/
```

## 🔄 WebSockets temps réel

### Consumer de Queue
```python
class QueueConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.tenant_id = self.scope['url_route']['kwargs']['tenant_id']
        self.queue_id = self.scope['url_route']['kwargs']['queue_id']
        self.queue_group = f"queue_{self.tenant_id}_{self.queue_id}"
        
        # Vérifier les permissions
        if not await self.check_permissions():
            await self.close()
            return
            
        await self.channel_layer.group_add(
            self.queue_group,
            self.channel_name
        )
        await self.accept()
    
    async def ticket_created(self, event):
        await self.send_json({
            'type': 'ticket.created',
            'ticket': event['ticket']
        })
    
    async def ticket_called(self, event):
        await self.send_json({
            'type': 'ticket.called',
            'ticket': event['ticket']
        })
```

### Routing WebSocket
```python
# websockets/routing.py
websocket_urlpatterns = [
    path('ws/tenants/<str:tenant_id>/queues/<int:queue_id>/', QueueConsumer.as_asgi()),
    path('ws/tenants/<str:tenant_id>/displays/<int:display_id>/', DisplayConsumer.as_asgi()),
    path('ws/tenants/<str:tenant_id>/agents/<int:agent_id>/', AgentConsumer.as_asgi()),
]
```

## 🏢 Multi-tenancy

### Modèle de base tenant-aware
```python
class TenantAwareModel(models.Model):
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    
    class Meta:
        abstract = True
    
    def save(self, *args, **kwargs):
        if not self.tenant_id:
            raise ValueError("Tenant is required")
        super().save(*args, **kwargs)
```

### Middleware tenant
```python
class TenantMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Extraire tenant du header ou URL
        tenant_slug = self.extract_tenant(request)
        if tenant_slug:
            try:
                request.tenant = Tenant.objects.get(slug=tenant_slug, is_active=True)
            except Tenant.DoesNotExist:
                return HttpResponse(status=404)
        
        return self.get_response(request)
```

### Row Level Security (RLS)
```sql
-- Activer RLS sur les tables
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Politique de sécurité
CREATE POLICY tenant_isolation ON tickets
    FOR ALL TO django_app
    USING (tenant_id = current_setting('app.current_tenant_id')::integer);
```

## 🔐 Authentification & autorisation

### Permissions personnalisées
```python
class IsTenantUser(BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Vérifier que l'utilisateur appartient au tenant
        return request.user.tenant_memberships.filter(
            tenant=request.tenant,
            is_active=True
        ).exists()

class HasScope(BasePermission):
    def __init__(self, required_scope):
        self.required_scope = required_scope
    
    def has_permission(self, request, view):
        token = request.auth
        if not token:
            return False
        
        return self.required_scope in token.get('scopes', [])
```

### JWT avec scopes
```python
def create_access_token(user, tenant, scopes):
    payload = {
        'user_id': user.id,
        'tenant_id': tenant.id,
        'scopes': scopes,
        'exp': timezone.now() + timedelta(hours=1),
        'iat': timezone.now(),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
```

## ⚡ Tâches asynchrones

### Configuration Celery
```python
# core/celery.py
from celery import Celery

app = Celery('smartqueue')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Tâches périodiques
app.conf.beat_schedule = {
    'calculate-etas': {
        'task': 'tickets.tasks.calculate_all_etas',
        'schedule': 30.0,  # Toutes les 30 secondes
    },
    'send-reminders': {
        'task': 'appointments.tasks.send_reminders',
        'schedule': crontab(minute='*/5'),  # Toutes les 5 minutes
    },
}
```

### Tâches principales
```python
# tickets/tasks.py
@shared_task
def calculate_eta(ticket_id):
    ticket = Ticket.objects.get(id=ticket_id)
    
    # Algorithme ETA simple
    queue_position = Ticket.objects.filter(
        queue=ticket.queue,
        status='en_attente',
        created_at__lt=ticket.created_at
    ).count()
    
    avg_service_time = get_average_service_time(ticket.queue)
    eta_seconds = queue_position * avg_service_time
    
    ticket.eta_seconds = eta_seconds
    ticket.save()
    
    # Notification WebSocket
    notify_eta_updated(ticket)

@shared_task
def send_notification(notification_id):
    notification = Notification.objects.get(id=notification_id)
    
    if notification.channel == 'sms':
        send_sms(notification)
    elif notification.channel == 'email':
        send_email(notification)
    elif notification.channel == 'whatsapp':
        send_whatsapp(notification)
```

## 🧪 Tests

### Tests unitaires
```python
class TicketModelTest(TestCase):
    def setUp(self):
        self.tenant = TenantFactory()
        self.queue = QueueFactory(tenant=self.tenant)
    
    def test_ticket_creation(self):
        ticket = Ticket.objects.create(
            tenant=self.tenant,
            queue=self.queue,
            number='A001',
            channel='web'
        )
        self.assertEqual(ticket.status, 'en_attente')
        self.assertIsNotNone(ticket.created_at)
```

### Tests d'API
```python
class TicketAPITest(APITestCase):
    def setUp(self):
        self.tenant = TenantFactory()
        self.user = UserFactory()
        self.client.force_authenticate(user=self.user)
        self.client.defaults['HTTP_X_TENANT'] = self.tenant.slug
    
    def test_create_ticket(self):
        data = {
            'queue_id': self.queue.id,
            'channel': 'web'
        }
        response = self.client.post('/api/v1/tickets/', data)
        self.assertEqual(response.status_code, 201)
```

### Tests WebSocket
```python
class QueueConsumerTest(WebsocketCommunicator):
    async def test_ticket_notification(self):
        communicator = WebsocketCommunicator(
            QueueConsumer.as_asgi(),
            f"/ws/tenants/{self.tenant.id}/queues/{self.queue.id}/"
        )
        
        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        
        # Créer un ticket
        ticket = await database_sync_to_async(TicketFactory)()
        
        # Vérifier la notification
        message = await communicator.receive_json_from()
        self.assertEqual(message['type'], 'ticket.created')
```

## 🚀 Déploiement

### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["gunicorn", "core.wsgi:application", "--bind", "0.0.0.0:8000"]
```

### Docker Compose (développement)
```yaml
version: '3.8'

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: smartqueue
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  web:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis
    environment:
      DATABASE_URL: postgresql://postgres:password@db:5432/smartqueue
      REDIS_URL: redis://redis:6379/0

  celery:
    build: .
    command: celery -A core worker -l info
    depends_on:
      - db
      - redis

  celery-beat:
    build: .
    command: celery -A core beat -l info
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
```

### Kubernetes (production)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smartqueue-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: smartqueue-api
  template:
    metadata:
      labels:
        app: smartqueue-api
    spec:
      containers:
      - name: api
        image: smartqueue/api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: smartqueue-secrets
              key: database-url
```

## 📊 Monitoring & observabilité

### Métriques personnalisées
```python
from prometheus_client import Counter, Histogram

ticket_created_counter = Counter('tickets_created_total', 'Total tickets created', ['tenant', 'channel'])
api_request_duration = Histogram('api_request_duration_seconds', 'API request duration')

@api_request_duration.time()
def create_ticket(request):
    # Logique de création
    ticket_created_counter.labels(tenant=request.tenant.slug, channel='web').inc()
```

### Logging structuré
```python
import structlog

logger = structlog.get_logger()

def create_ticket(request, data):
    logger.info(
        "ticket_creation_started",
        tenant_id=request.tenant.id,
        user_id=request.user.id,
        queue_id=data.get('queue_id')
    )
```

---

## 🔧 Commandes utiles

```bash
# Lancer le serveur de développement
python manage.py runserver

# Lancer Celery worker
celery -A core worker -l info

# Lancer Celery beat
celery -A core beat -l info

# Migrations
python manage.py makemigrations
python manage.py migrate

# Tests
python manage.py test
pytest

# Shell Django
python manage.py shell

# Créer un tenant
python manage.py create_tenant --name "Demo Bank" --slug "demo-bank"
```

Ce guide couvre les aspects essentiels du développement backend pour SmartQueue. Chaque section peut être approfondie selon les besoins spécifiques du projet.