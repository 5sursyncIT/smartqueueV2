"""Add email verification fields to User model."""

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0002_agentprofile_counter_number_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_verified',
            field=models.BooleanField(default=False, help_text='Email vérifié'),
        ),
        migrations.AddField(
            model_name='user',
            name='email_verification_token',
            field=models.CharField(max_length=255, null=True, blank=True, help_text='Token de vérification email'),
        ),
        migrations.AddField(
            model_name='user',
            name='email_verification_sent_at',
            field=models.DateTimeField(null=True, blank=True, help_text='Date envoi email vérification'),
        ),
        migrations.AddField(
            model_name='user',
            name='email_verified_at',
            field=models.DateTimeField(null=True, blank=True, help_text='Date vérification email'),
        ),
    ]
