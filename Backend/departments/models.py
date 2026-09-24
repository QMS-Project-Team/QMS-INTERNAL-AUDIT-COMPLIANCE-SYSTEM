from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=150, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
