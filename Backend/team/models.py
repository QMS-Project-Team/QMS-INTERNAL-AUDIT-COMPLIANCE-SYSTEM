from django.db import models


class Department(models.Model):
    external_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Project(models.Model):
    external_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='projects'
    )

    def __str__(self):
        return self.name


class Employee(models.Model):
    external_id = models.CharField(max_length=20, unique=True)

    name = models.CharField(max_length=100)
    email = models.EmailField()
    contact = models.CharField(max_length=15)
    role = models.CharField(max_length=100)

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='employees'
    )

    projects = models.ManyToManyField(
        Project,
        related_name='members',
        blank=True
    )

    def __str__(self):
        return self.name