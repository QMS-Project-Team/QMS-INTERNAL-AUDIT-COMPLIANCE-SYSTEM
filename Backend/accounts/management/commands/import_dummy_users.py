import csv

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model


class Command(BaseCommand):
    help = "Import dummy users from a CSV file"

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_file",
            type=str,
            help="Path to the CSV file",
        )

    def handle(self, *args, **options):
        csv_file = options["csv_file"]

        User = get_user_model()

        try:
            with open(csv_file, newline="", encoding="utf-8") as file:
                reader = csv.DictReader(file)

                created_count = 0
                skipped_count = 0

                for row in reader:
                    employee_id = row["employee_id"]

                    if User.objects.filter(
                        employee_id=employee_id
                    ).exists():
                        self.stdout.write(
                            self.style.WARNING(
                                f"Skipped: {employee_id} already exists"
                            )
                        )
                        skipped_count += 1
                        continue

                    user = User(
                        employee_id=employee_id,
                        username=row["username"],
                        email=row["email"],
                        first_name=row["first_name"],
                        last_name=row["last_name"],
                        role=row["role"],
                        department=row["department"],
                    )

                    user.set_password(row["password"])
                    user.save()

                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Created: {user.username}"
                        )
                    )

                    created_count += 1

        except FileNotFoundError:
            raise CommandError(
                f"CSV file not found: {csv_file}"
            )

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                f"Import completed. "
                f"Created: {created_count}, "
                f"Skipped: {skipped_count}"
            )
        )