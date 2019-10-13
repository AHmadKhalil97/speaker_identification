from django.http import JsonResponse
from django.shortcuts import render
from speaker_identify_app.models import Person


# Create your views here.
def index(request):
    return render(request, 'index.html')


def enroll_it(request, data):
    # data = request.GET['myVariableToSend']
    p_name = data.split(':')[0]
    p_profile_id = data.split(':')[1]
    person = Person(name=p_name, profile_id=p_profile_id)

    if Person.objects.filter(name=p_name) or Person.objects.filter(profile_id=p_profile_id):
        return JsonResponse({"msg": 'Failed!! Person Already Registered.'}, safe=False)
    else:
        person.save()
        return JsonResponse({"msg": 'Success!! Person Enrolled Successfully.'}, safe=False)


def get_ids(request):
    ids = Person.objects.values_list('profile_id', flat=True).distinct()
    return JsonResponse({"ids": list(ids)}, safe=True)


def get_speaker(request, id):
    if Person.objects.filter(profile_id=id):
        name = Person.objects.get(profile_id=id).name
    else:
        name = 'Unknown'
    return JsonResponse({"speaker": name}, safe=True)
