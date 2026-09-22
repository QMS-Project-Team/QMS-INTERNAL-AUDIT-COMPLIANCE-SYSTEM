from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('qms', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Checklist',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('department_code', models.CharField(max_length=30)),
                ('department_name', models.CharField(max_length=150)),
                ('title', models.CharField(max_length=200)),
                ('version', models.CharField(default='1.0', max_length=50)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('framework', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='checklists', to='qms.framework')),
            ],
            options={'ordering': ['framework', 'department_name', 'title']},
        ),
        migrations.CreateModel(
            name='ChecklistItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('item_number', models.PositiveIntegerField()),
                ('requirement', models.TextField()),
                ('guidance', models.TextField(blank=True)),
                ('response_type', models.CharField(choices=[('yes_no', 'Yes / No'), ('text', 'Text'), ('number', 'Number'), ('date', 'Date')], default='yes_no', max_length=20)),
                ('is_mandatory', models.BooleanField(default=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('checklist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='checklists.checklist')),
            ],
            options={'ordering': ['sort_order', 'item_number', 'id']},
        ),
        migrations.AddConstraint(
            model_name='checklist',
            constraint=models.UniqueConstraint(fields=('framework', 'department_code', 'version'), name='unique_checklist_framework_department_version'),
        ),
        migrations.AddConstraint(
            model_name='checklistitem',
            constraint=models.UniqueConstraint(fields=('checklist', 'item_number'), name='unique_checklist_item_number'),
        ),
    ]
