from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ('qms', '0001_initial'),
        ('checklists', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Audit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('department_code', models.CharField(max_length=30)),
                ('department_name', models.CharField(max_length=150)),
                ('audit_year', models.PositiveIntegerField()),
                ('cycle', models.PositiveSmallIntegerField(default=1)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('scheduled', 'Scheduled'), ('in_progress', 'In Progress'), ('awaiting_action', 'Awaiting Action'), ('awaiting_verification', 'Awaiting Verification'), ('closed', 'Closed'), ('cancelled', 'Cancelled')], default='draft', max_length=30)),
                ('scheduled_start', models.DateTimeField(blank=True, null=True)),
                ('scheduled_end', models.DateTimeField(blank=True, null=True)),
                ('created_by_username', models.CharField(max_length=150)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
                ('checklist', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='audits', to='checklists.checklist')),
                ('framework', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='audits', to='qms.framework')),
            ],
            options={'ordering': ['-audit_year', '-cycle', 'department_name']},
        ),
        migrations.CreateModel(
            name='AuditAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('employee_code', models.CharField(max_length=30)),
                ('employee_name', models.CharField(blank=True, max_length=150)),
                ('assignment_type', models.CharField(choices=[('primary', 'Primary'), ('secondary', 'Secondary')], max_length=20)),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('audit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='audits.audit')),
            ],
            options={},
        ),
        migrations.CreateModel(
            name='AuditSchedule',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start_at', models.DateTimeField()),
                ('end_at', models.DateTimeField()),
                ('confirmed_by_username', models.CharField(blank=True, max_length=150)),
                ('confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('department_confirmed', models.BooleanField(default=False)),
                ('department_confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('uploaded_to_bebonet', models.BooleanField(default=False)),
                ('uploaded_at', models.DateTimeField(blank=True, null=True)),
                ('audit', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='schedule', to='audits.audit')),
            ],
        ),
        migrations.CreateModel(
            name='ChecklistResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('result', models.CharField(choices=[('compliant', 'Compliant'), ('non_compliant', 'Non-Compliant'), ('not_applicable', 'Not Applicable'), ('pending', 'Pending')], default='pending', max_length=30)),
                ('response_value', models.TextField(blank=True)),
                ('auditor_comment', models.TextField(blank=True)),
                ('responded_by_employee_code', models.CharField(blank=True, max_length=30)),
                ('responded_at', models.DateTimeField(blank=True, null=True)),
                ('audit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='responses', to='audits.audit')),
                ('item', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='audit_responses', to='checklists.checklistitem')),
            ],
        ),
        migrations.CreateModel(
            name='Evidence',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file', models.FileField(upload_to='audit_evidence/%Y/%m/')),
                ('original_name', models.CharField(blank=True, max_length=255)),
                ('description', models.TextField(blank=True)),
                ('uploaded_by_employee_code', models.CharField(max_length=30)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('audit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='evidence', to='audits.audit')),
                ('response', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='evidence', to='audits.checklistresponse')),
            ],
        ),
        migrations.CreateModel(
            name='Finding',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('finding_type', models.CharField(choices=[('non_conformity', 'Non-Conformity'), ('suggestion', 'Suggestion')], max_length=30)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField()),
                ('severity', models.CharField(blank=True, choices=[('minor', 'Minor'), ('major', 'Major'), ('critical', 'Critical')], max_length=20)),
                ('raised_by_employee_code', models.CharField(max_length=30)),
                ('raised_at', models.DateTimeField(auto_now_add=True)),
                ('is_closed', models.BooleanField(default=False)),
                ('audit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='findings', to='audits.audit')),
                ('response', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='findings', to='audits.checklistresponse')),
            ],
        ),
        migrations.CreateModel(
            name='CorrectiveAction',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action_type', models.CharField(choices=[('correction', 'Correction'), ('corrective_action', 'Corrective Action'), ('preventive_action', 'Preventive Action'), ('risk_action', 'Risk Action')], max_length=30)),
                ('description', models.TextField(blank=True)),
                ('owner_employee_code', models.CharField(max_length=30)),
                ('due_date', models.DateField(blank=True, null=True)),
                ('status', models.CharField(choices=[('open', 'Open'), ('submitted', 'Submitted'), ('rework', 'Rework Required'), ('accepted', 'Accepted'), ('closed', 'Closed')], default='open', max_length=20)),
                ('submitted_at', models.DateTimeField(blank=True, null=True)),
                ('closed_at', models.DateTimeField(blank=True, null=True)),
                ('finding', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='actions', to='audits.finding')),
            ],
        ),
        migrations.CreateModel(
            name='Verification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('decision', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                ('comments', models.TextField(blank=True)),
                ('verified_by_employee_code', models.CharField(max_length=30)),
                ('verified_at', models.DateTimeField(auto_now_add=True)),
                ('action', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='verifications', to='audits.correctiveaction')),
            ],
        ),
        migrations.CreateModel(
            name='AuditReport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('report_type', models.CharField(choices=[('initial', 'Initial'), ('closure', 'Closure')], max_length=20)),
                ('content', models.TextField()),
                ('created_by_employee_code', models.CharField(max_length=30)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('confirmed_at', models.DateTimeField(blank=True, null=True)),
                ('audit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='reports', to='audits.audit')),
            ],
        ),
        migrations.AddConstraint(
            model_name='audit',
            constraint=models.UniqueConstraint(fields=('framework', 'department_code', 'audit_year', 'cycle'), name='unique_department_audit_cycle'),
        ),
        migrations.AddConstraint(
            model_name='auditassignment',
            constraint=models.UniqueConstraint(fields=('audit', 'employee_code'), name='unique_audit_employee_assignment'),
        ),
        migrations.AddConstraint(
            model_name='auditassignment',
            constraint=models.UniqueConstraint(fields=('audit', 'assignment_type'), name='unique_audit_assignment_type'),
        ),
        migrations.AddConstraint(
            model_name='checklistresponse',
            constraint=models.UniqueConstraint(fields=('audit', 'item'), name='unique_audit_checklist_response'),
        ),
        migrations.AddConstraint(
            model_name='correctiveaction',
            constraint=models.UniqueConstraint(fields=('finding', 'action_type'), name='unique_finding_action_type'),
        ),
        migrations.AddConstraint(
            model_name='auditreport',
            constraint=models.UniqueConstraint(fields=('audit', 'report_type'), name='unique_audit_report_type'),
        ),
    ]
