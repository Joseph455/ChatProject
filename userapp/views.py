# from django.shortcuts import render, get_object_or_404, redirect, reverse
# from django.http import Http404, HttpResponse
# from django.contrib.auth import login, logout, authenticate
# from django.contrib.auth.decorators import login_required
# from django.contrib.auth.models import User
# from userapp.forms import LoginForm, RegistartionForm
# # Create your views here.


# def account_view(request):
#     return render(request, "account.html", {"login_form": LoginForm, "register_form": RegistartionForm})


# def login_view(request):
#     if request.method == "POST":
#         form = LoginForm(request.POST)
#         if form.is_valid():
#             username, password = form.cleaned_data.get("username"), form.cleaned_data.get("password")
#             user = authenticate(request, username=username, password=password)
#             if user:
#                 login(request, user)
#                 return redirect(reverse("userapp:account"))
#             else:
#                 return HttpResponse(f"<h1>Invalid username or password</h1>")
#         else :
#             return HttpResponse(f"<h1>{form.errors}</h1>")
#     return redirect(reverse("userapp:account"))
    
            
# def registration_view(request):
#     if request.method == "POST":
#         form = RegistartionForm(request.POST)
#         if form.is_valid():
#             user = form.save()
#             user.set_password(form.cleaned_data.get("password"))
#             user.save()
#             login(request, user)
#             return redirect(reverse("userapp:account"))
#         else :
#             return HttpResponse(form.errors)
#     return redirect(reverse("userapp:account"))


# def logout_view(request):
#     logout(request)
#     return redirect(reverse("userapp:account"))

