# SMTP Configuration UI - Integration Complete

## Overview

Successfully integrated SMTP configuration interface into the SmartQueue system configuration page at `http://localhost:3000/superadmin/system`.

## Changes Made

### Backend

#### 1. Database Model (`apps/core/models.py`)
Added SMTP configuration fields to `SystemConfig` model:
- `smtp_host` - SMTP server hostname (default: localhost)
- `smtp_port` - SMTP server port (default: 1025)
- `smtp_use_tls` - Enable TLS encryption (default: False)
- `smtp_use_ssl` - Enable SSL encryption (default: False)
- `smtp_username` - SMTP authentication username (optional)
- `smtp_password` - SMTP authentication password (optional, encrypted)
- `smtp_from_email` - Default sender email (default: noreply@smartqueue.app)

#### 2. Migration
Created and applied migration: `0003_systemconfig_smtp_from_email_systemconfig_smtp_host_and_more`

#### 3. API Endpoints (`apps/core/views_system.py`)

**GET `/api/v1/admin/system/config/`**
- Returns complete system configuration including SMTP settings
- Excludes SMTP password (returns `smtp_password_set` boolean instead)
- Requires: `IsAdminUser` permission

**PATCH `/api/v1/admin/system/config/update/`**
- Updates system configuration
- Validates TLS/SSL mutual exclusivity
- Password optional (leave empty to keep existing)
- Requires: `IsAdminUser` permission

**GET `/api/v1/admin/system/smtp/status/`**
- Tests SMTP connection without sending email
- Returns connection status and configuration details
- Requires: `IsAdminUser` permission

**POST `/api/v1/admin/system/smtp/test/`**
- Sends test email to specified address
- Validates email delivery
- Request body: `{"test_email": "user@example.com"}`
- Requires: `IsAdminUser` permission

#### 4. URL Routes (`apps/core/urls.py`)
Added public (non-tenant) routes for system configuration.

### Frontend

#### 1. TypeScript Types (`lib/hooks/use-system-config.ts`)
Extended `SystemConfig` interface with SMTP fields:
```typescript
smtp_host: string;
smtp_port: number;
smtp_use_tls: boolean;
smtp_use_ssl: boolean;
smtp_username: string;
smtp_from_email: string;
smtp_password_set: boolean;
```

#### 2. SMTP Configuration Component (`components/system/smtp-config.tsx`)
Created comprehensive React component with:
- **Configuration Form**:
  - SMTP host and port inputs
  - TLS/SSL toggle switches (mutually exclusive validation)
  - Username/password authentication fields
  - From email configuration
- **Connection Status Indicator**:
  - Real-time connection check on mount
  - Visual status (Connected/Not Connected/Not Verified)
  - Color-coded icons
- **Test Email Functionality**:
  - Email input field
  - Send test button with loading state
  - Success/error toast notifications
- **Save Configuration**:
  - Update configuration with validation
  - Automatic connection check after save
  - Toast notifications for success/error

#### 3. System Page Integration (`app/superadmin/system/page.tsx`)
- Imported and added `SMTPConfiguration` component
- Positioned after "Canaux de notifications" card
- Passes initial SMTP configuration from API

## Testing

### Backend API Tests

All endpoints tested and working:

```bash
# Get configuration
curl -X GET 'http://localhost:8000/api/v1/admin/system/config/' \
  -H 'Authorization: Bearer {token}'

# Test SMTP status
curl -X GET 'http://localhost:8000/api/v1/admin/system/smtp/status/' \
  -H 'Authorization: Bearer {token}'

# Send test email
curl -X POST 'http://localhost:8000/api/v1/admin/system/smtp/test/' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{"test_email": "test@example.com"}'

# Update configuration
curl -X PATCH 'http://localhost:8000/api/v1/admin/system/config/update/' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_use_tls": true,
    "smtp_username": "user@gmail.com",
    "smtp_password": "app_password",
    "smtp_from_email": "noreply@smartqueue.app"
  }'
```

### Current Status

✅ Backend database migration applied
✅ Backend API endpoints working
✅ SMTP connection to Mailpit verified
✅ Test email sending successful
✅ Frontend component created
✅ Frontend TypeScript types updated
✅ Component integrated into system page

### Next Steps for User Testing

1. **Start Backend** (if not running):
   ```bash
   DJANGO_SETTINGS_MODULE=smartqueue_backend.settings.dev \
     .venv/bin/daphne -b 0.0.0.0 -p 8000 smartqueue_backend.asgi:application
   ```

2. **Start Mailpit** (if not running):
   ```bash
   docker-compose -f docker-compose.mailpit.yml up -d
   ```

3. **Start Frontend** (if not running):
   ```bash
   cd back_office
   npm run dev
   ```

4. **Access UI**:
   - Navigate to: `http://localhost:3000/superadmin/system`
   - Scroll down to "Configuration SMTP" card
   - Test the following:
     - View current SMTP configuration
     - Check connection status indicator
     - Send a test email
     - Modify SMTP settings and save
     - Verify emails in Mailpit UI: `http://localhost:8025`

## Features

### Security
- SMTP password stored encrypted in database
- Password never returned in API responses
- Password optional on update (keep existing if empty)
- Admin-only access via `IsAdminUser` permission

### Validation
- TLS and SSL cannot be enabled simultaneously
- Email address format validation for test emails
- SMTP connection testing before saving
- Real-time connection status verification

### User Experience
- Visual connection status indicator
- Toast notifications for all actions
- Loading states during async operations
- Helpful placeholder text and hints
- Common port examples (25, 587, 465, 1025)

## Configuration Examples

### Local Development (Mailpit)
```
Host: localhost
Port: 1025
TLS: No
SSL: No
Username: (empty)
Password: (empty)
From Email: noreply@smartqueue.app
```

### Gmail SMTP
```
Host: smtp.gmail.com
Port: 587
TLS: Yes
SSL: No
Username: your-email@gmail.com
Password: your-app-password
From Email: noreply@yourdomain.com
```

### SendGrid SMTP
```
Host: smtp.sendgrid.net
Port: 587
TLS: Yes
SSL: No
Username: apikey
Password: your-sendgrid-api-key
From Email: noreply@yourdomain.com
```

## Related Documentation

- [Email Local Setup](EMAIL_LOCAL_SETUP.md) - Mailpit configuration
- [Twilio Setup](TWILIO_SETUP.md) - SMS integration
- [Integration Complete](../INTEGRATION_COMPLETE.md) - All notification channels

## Date
October 26, 2025
