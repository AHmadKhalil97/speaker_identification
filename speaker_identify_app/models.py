from django.db import models


# Create your models here.
class Person(models.Model):
    name = models.CharField(max_length=40)
    profile_id = models.CharField(max_length=80)

    def __str__(self):
        return self.name
