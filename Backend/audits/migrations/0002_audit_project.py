from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('audits', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='audit',
            name='project_code',
            field=models.CharField(blank=True, max_length=30),
        ),
        migrations.AddField(
            model_name='audit',
            name='project_name',
            field=models.CharField(blank=True, max_length=150),
        ),
    ]
