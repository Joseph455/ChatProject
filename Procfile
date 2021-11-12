web: gunicorn ChatProject.asgi:application --port $PORT --bind 0.0.0.0 -v2
chatWorker: python manage.py runworker --settings=ChatProject.settings -v2
