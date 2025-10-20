from django.shortcuts import render

# Create your views here.
def home(request):
    return render(request, 'main.html')

def chart(request):
    return render(request, 'chart-page.html')

def canvas(request):
    return render(request, 'canvas3d.html')

