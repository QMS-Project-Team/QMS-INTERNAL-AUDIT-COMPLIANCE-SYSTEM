from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from audits.models import Audit, AuditNotification, AuditAssignment, CorrectiveAction


class Command(BaseCommand):
    help = 'Create and issue QMS audit milestone reminders and escalation notifications.'

    def handle(self, *args, **options):
        now = timezone.now()
        created = 0
        sent = 0
        for audit in Audit.objects.select_related('schedule').prefetch_related('assignments'):
            if not audit.scheduled_start or audit.status in [Audit.Status.CLOSED, Audit.Status.CANCELLED]:
                continue
            recipients = list(audit.assignments.values_list('employee_code', flat=True))
            if audit.created_by_username:
                recipients.append(audit.created_by_username)
            recipients = list(dict.fromkeys(recipients))
            milestones = [
                ('t_minus_30', audit.scheduled_start - timedelta(days=30), 'T-30 reminder: audit preparation and auditor nomination should be complete.'),
                ('t_minus_20', audit.scheduled_start - timedelta(days=20), 'T-20 escalation: audit preparation or confirmation is still pending.'),
                ('t_minus_15', audit.scheduled_start - timedelta(days=15), 'T-15 reminder: upload the audit schedule/combined confirmation to Bebonet.'),
                ('t_minus_7', audit.scheduled_start - timedelta(days=7), 'T-7 reminder: department confirmation of the audit schedule is due.'),
                ('nc_deadline', audit.scheduled_start + timedelta(days=10), 'NC/action deadline: non-conformities and required actions should be resolved within the defined audit window.'),
                ('audit_deadline', audit.scheduled_start + timedelta(days=15), 'Audit deadline: closure should be completed within 15 days of audit start.'),
            ]
            for kind, due_at, message in milestones:
                if due_at > now:
                    continue
                for recipient in recipients:
                    obj, was_created = AuditNotification.objects.get_or_create(
                        audit=audit, notification_type=kind, recipient_username=recipient,
                        defaults={'message': message, 'due_at': due_at},
                    )
                    created += int(was_created)
                    if obj.sent_at is not None:
                        continue
                    local = User.objects.filter(username=recipient).first()
                    if local and local.email:
                        send_mail(
                            subject=f'QMS Audit Reminder - Audit {audit.id}',
                            message=message,
                            from_email=None,
                            recipient_list=[local.email],
                            fail_silently=True,
                        )
                    obj.sent_at = now
                    obj.save(update_fields=['sent_at'])
                    sent += 1
        self.stdout.write(self.style.SUCCESS(f'Processed audit reminders: created={created}, sent={sent}'))
