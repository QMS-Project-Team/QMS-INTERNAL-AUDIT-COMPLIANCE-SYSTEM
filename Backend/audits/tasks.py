
from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.mail import send_mail ,get_connection
from django.utils import timezone
from django.conf import settings 
from .models import (
    AnnualAuditPlan,
    Notification,
    Project,
    AuditorAssignment,
    AuditReminderLog,
    AuditSchedule
)
from datetime import timedelta
@shared_task
def test_celery_task():
    return "Celery is working with the QMS project!"

@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def send_annual_audit_plan_notification(self, plan_id):
   

    try:
        plan = AnnualAuditPlan.objects.get(id=plan_id)
        User = get_user_model()

        directors = User.objects.filter(role="DIRECTOR")

        subject = f"Annual Audit Plan - {plan.audit_year}"

        message = (
            f"Dear Director,\n\n"
            f"QMS has created or updated the annual audit plan "
            f"for {plan.audit_year}.\n\n"
            f"Cycle 1: {plan.cycle_1_start} to {plan.cycle_1_end}\n"
            f"Cycle 2: {plan.cycle_2_start} to {plan.cycle_2_end}\n\n"
            f"Please create or confirm the projects required "
            f"for these audit cycles.\n\n"
            f"Regards,\nQMS System"
        )
        for director in directors:
            # Create/update the in-app notification.
            Notification.objects.update_or_create(
                recipient=director,
                notification_type=(
                    Notification.NotificationType.ANNUAL_AUDIT_PLAN
                ),
                title=subject,
                message=message,
                is_read=False,
            )
            
            # Send an email if the Director has an email address.
            if director.email:
                email_config = settings.MAILERS["default"]

                with get_connection(
                    backend=email_config["BACKEND"],
                    **email_config["OPTIONS"]
                ) as email_connection:

                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[director.email],
                        connection=email_connection,
                        fail_silently=False,
                    )

        return f"Notifications processed for audit plan {plan_id}."

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def send_project_created_notification(self, project_id):
    try:
        project = Project.objects.select_related(
            "department", "project_owner"
        ).get(id=project_id)

        User = get_user_model()

        # Notify all QMS users
        qms_users = User.objects.filter(role=User.Role.QMS)

        subject = f"New Project Created: {project.project_code}"

        message = (
            "Dear QMS Team,\n\n"
            "A new project has been created in the QMS system.\n\n"
            f"Project Code: {project.project_code}\n"
            f"Project Name: {project.name}\n"
            f"Department: {project.department.name}\n"
            f"Project Owner: {project.project_owner.username}\n"
            f"Status: {project.get_status_display()}\n\n"
            "Please review the project and proceed with the "
            "applicable audit planning activities.\n\n"
            "Regards,\nQMS System"
        )

        for user in qms_users:
            # Create the in-app notification without duplicating it
            Notification.objects.get_or_create(
                recipient=user,
                notification_type=Notification.NotificationType.PROJECT,
                title=subject,
                defaults={
                    "message": message,
                    "is_read": False,
                },
            )

            # Send the email if the QMS user has an email address
            if user.email:
                email_config = settings.MAILERS["default"]

                with get_connection(
                    backend=email_config["BACKEND"],
                    **email_config["OPTIONS"]
                ) as email_connection:

                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        connection=email_connection,
                        fail_silently=False,
                    )

        return f"Project notification processed for project {project_id}."

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
)
def send_auditor_assignment_notification(self, assignment_id):
    try:
        assignment = AuditorAssignment.objects.select_related(
            "audit",
            "audit__project",
            "audit__framework",
            "auditor",
        ).get(id=assignment_id)

        audit = assignment.audit
        auditor = assignment.auditor

        subject = f"Auditor Assignment - {audit.audit_code}"

        message = (
            f"Dear {auditor.username},\n\n"
            "You have been assigned as an internal auditor.\n\n"
            f"Audit Code: {audit.audit_code}\n"
            f"Project: {audit.project.name}\n"
            f"Framework: {audit.framework.name}\n"
            f"Assignment Type: "
            f"{assignment.get_assignment_type_display()}\n"
            f"Planned Start Date: {audit.planned_start_date}\n"
            f"Planned End Date: {audit.planned_end_date}\n\n"
            "Please log in to the QMS system and complete your "
            "auditor orientation before starting the audit.\n\n"
            "Regards,\nQMS System"
        )

        # Create one in-app notification for this assignment.
        notification, created = Notification.objects.get_or_create(
            recipient=auditor,
            notification_type=(
                Notification.NotificationType.AUDIT_ASSIGNMENT
            ),
            title=subject,
            defaults={
                "message": message,
                "is_read": False,
            },
        )

        # Send email only if a notification already existed
        # or was just created. See the retry note below.
        if auditor.email:
            email_config = settings.MAILERS["default"]

            with get_connection(
                backend=email_config["BACKEND"],
                **email_config["OPTIONS"]
            ) as email_connection:

                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[auditor.email],
                    connection=email_connection,
                    fail_silently=False,
                )

        return (
            f"Auditor assignment notification processed "
            f"for assignment {assignment_id}."
        )

    except AuditorAssignment.DoesNotExist:
        # The assignment may have been removed before execution.
        return f"Assignment {assignment_id} not found."

    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_scheduled_audit_reminders(self):
    try:
        today = timezone.localdate()
        print(today)
        
        reminder_days_list = [15, 7]

        for reminder_days in reminder_days_list:

            target_date = today + timedelta(days=reminder_days)

            schedules = AuditSchedule.objects.filter(
                scheduled_start__date=target_date,
                status__in=[
                    AuditSchedule.Status.SCHEDULED,
                    AuditSchedule.Status.CONFIRMED,
                ],
                audit__status__in=[
                    "ASSIGNED",
                    "IN_PROGRESS",
                ],
            ).select_related(
                "audit",
                "audit__project",
                "audit__framework",
            )
            print(schedules)
            for schedule in schedules:

                audit = schedule.audit

                assignments = AuditorAssignment.objects.filter(
                    audit=audit
                ).select_related("auditor")

                for assignment in assignments:

                    auditor = assignment.auditor

                    # Check whether this reminder was already sent.
                    already_sent = AuditReminderLog.objects.filter(
                        audit=audit,
                        auditor=auditor,
                        reminder_days=reminder_days,
                    ).exists()

                    if already_sent:
                        continue

                    subject = (
                        f"Audit Reminder - {audit.audit_code} - "
                        f"{reminder_days} Days Remaining"
                    )

                    message = (
                        f"Dear {auditor.username},\n\n"
                        f"This is a reminder that your internal audit "
                        f"is scheduled in {reminder_days} days.\n\n"
                        f"Audit Code: {audit.audit_code}\n"
                        f"Project: {audit.project.name}\n"
                        f"Framework: {audit.framework.name}\n"
                        f"Assignment Type: "
                        f"{assignment.get_assignment_type_display()}\n"
                        f"Scheduled Start: {schedule.scheduled_start}\n"
                        f"Scheduled End: {schedule.scheduled_end}\n\n"
                        "Please prepare for the upcoming audit and "
                        "ensure your auditor orientation is completed.\n\n"
                        "Regards,\nQMS System"
                    )

                    # Create in-app notification.
                    Notification.objects.get_or_create(
                        recipient=auditor,
                        notification_type=(
                            Notification.NotificationType.AUDIT_REMINDER
                        ),
                        title=subject,
                        defaults={
                            "message": message,
                            "is_read": False,
                        },
                    )
                    print(auditor.email)
                    print('harjotttttt')
                    # Send email if the auditor has an email address.
                    if auditor.email:
                        email_config = settings.MAILERS["default"]
                        email_options = email_config["OPTIONS"]

                        print("SMTP HOST:", email_options.get("host"))
                        print("SMTP PORT:", email_options.get("port"))
                        print("USERNAME CONFIGURED:", bool(email_options.get("username")))
                        print("PASSWORD CONFIGURED:", bool(email_options.get("password")))
                        print("TLS:", email_options.get("use_tls"))

                        with get_connection(
                            backend=email_config["BACKEND"],
                            **email_config["OPTIONS"]
                        ) as email_connection:

                            send_mail(
                                subject=subject,
                                message=message,
                                from_email=settings.DEFAULT_FROM_EMAIL,
                                recipient_list=[auditor.email],
                                connection=email_connection,
                                fail_silently=False,
                            )

                    # Record the reminder after successful processing.
                    AuditReminderLog.objects.create(
                        audit=audit,
                        auditor=auditor,
                        reminder_days=reminder_days,
                    )

        return "Scheduled audit reminders processed successfully."

    except Exception as exc:
        raise self.retry(exc=exc)