from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand

from accounts.models import User
from departments.models import Department
from frameworks.models import Checklist, ChecklistItem, Framework


FRAMEWORKS = [
    ("ISO9001", "ISO 9001", "Quality management systems"),
    ("ISO27001", "ISO 27001", "Information security management"),
    ("HIPAA", "HIPAA", "Health data privacy and security"),
]

ITEMS = {
    "ISO9001": [
        "Are documented procedures available and up to date?",
        "Are quality objectives defined and measured?",
        "Is there evidence of management review?",
        "Are nonconformities recorded and followed up?",
        "Are training records maintained for staff?",
    ],
    "ISO27001": [
        "Is access to systems reviewed periodically?",
        "Are information assets inventoried and classified?",
        "Are security incidents logged and analysed?",
        "Are backups performed and restore-tested?",
        "Is a risk assessment performed and current?",
    ],
    "HIPAA": [
        "Is PHI access restricted to authorised personnel?",
        "Are PHI disclosures logged?",
        "Has HIPAA awareness training been completed?",
        "Are business associate agreements in place?",
    ],
}


class Command(BaseCommand):
    help = (
        "Seed demo data: departments, frameworks, master checklists "
        "with items, and users from dummy_users.csv. Safe to re-run."
    )

    def handle(self, *args, **options):

        for code, _label in User.Department.choices:
            Department.objects.get_or_create(name=code)

        for code, name, description in FRAMEWORKS:
            framework, _ = Framework.objects.get_or_create(
                code=code,
                defaults={"name": name, "description": description},
            )

            for department, label in User.Department.choices:
                checklist, created = Checklist.objects.get_or_create(
                    framework=framework,
                    department=department,
                    defaults={"name": f"{name} - {label} Checklist"},
                )

                if not created:
                    continue

                ChecklistItem.objects.bulk_create([
                    ChecklistItem(
                        checklist=checklist,
                        item_code=f"{code}-{department}-{index:02d}",
                        question=question,
                        order=index,
                    )
                    for index, question in enumerate(ITEMS[code], start=1)
                ])

        csv_path = Path(settings.BASE_DIR) / "dummy_users.csv"
        call_command("import_dummy_users", str(csv_path))

        self.stdout.write(self.style.SUCCESS("Demo data ready."))
