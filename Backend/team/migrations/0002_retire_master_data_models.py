from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("team", "0001_initial"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="employee",
            name="department",
        ),
        migrations.RemoveField(
            model_name="employee",
            name="projects",
        ),
        migrations.RemoveField(
            model_name="project",
            name="department",
        ),
        migrations.DeleteModel(
            name="Department",
        ),
        migrations.DeleteModel(
            name="Employee",
        ),
        migrations.DeleteModel(
            name="Project",
        ),
    ]
