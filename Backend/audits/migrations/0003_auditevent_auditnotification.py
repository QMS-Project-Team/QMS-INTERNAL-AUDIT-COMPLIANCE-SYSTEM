from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('audits', '0002_audit_project')]
    operations = [
        migrations.CreateModel(
            name='AuditEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(max_length=60)),
                ('actor_employee_code', models.CharField(blank=True, max_length=30)),
                ('actor_username', models.CharField(blank=True, max_length=150)),
                ('message', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('audit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='audits.audit')),
            ],
            options={'ordering': ['-created_at', '-id']},
        ),
        migrations.CreateModel(
            name='AuditNotification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_type', models.CharField(max_length=60)),
                ('recipient_username', models.CharField(max_length=150)),
                ('message', models.TextField()),
                ('due_at', models.DateTimeField()),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('audit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to='audits.audit')),
            ],
            options={'ordering': ['due_at', 'id']},
        ),
        migrations.AddConstraint(
            model_name='auditnotification',
            constraint=models.UniqueConstraint(fields=('audit', 'notification_type', 'recipient_username'), name='unique_audit_notification_recipient'),
        ),
    ]
