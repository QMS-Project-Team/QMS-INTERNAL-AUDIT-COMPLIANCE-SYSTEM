import requests


MASTER_API_URL = "http://127.0.0.1:8001/api"


def get_employees():
    response = requests.get(
        f"{MASTER_API_URL}/employees/",
        timeout=5
    )

    response.raise_for_status()

    return response.json()


def get_departments():
    response = requests.get(
        f"{MASTER_API_URL}/departments/",
        timeout=5
    )

    response.raise_for_status()

    return response.json()


def get_projects():
    response = requests.get(
        f"{MASTER_API_URL}/projects/",
        timeout=5
    )

    response.raise_for_status()

    return response.json()
