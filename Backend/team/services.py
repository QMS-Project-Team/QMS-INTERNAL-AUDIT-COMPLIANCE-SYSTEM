import requests
<<<<<<< HEAD
from django.conf import settings


class MasterAPIError(Exception):
    """Base error for failures while reading the external Master API."""


class MasterAPIUnavailableError(MasterAPIError):
    pass


class MasterAPITimeoutError(MasterAPIError):
    pass


class MasterAPIResponseError(MasterAPIError):
    pass


def _get(path):
    url = f"{settings.MASTER_API_URL.rstrip('/')}/{path.lstrip('/')}"
    try:
        response = requests.get(url, timeout=settings.MASTER_API_TIMEOUT)
    except requests.exceptions.Timeout as exc:
        raise MasterAPITimeoutError from exc
    except requests.exceptions.ConnectionError as exc:
        raise MasterAPIUnavailableError from exc
    except requests.exceptions.RequestException as exc:
        raise MasterAPIUnavailableError from exc

    if not response.ok:
        raise MasterAPIResponseError

    try:
        return response.json()
    except ValueError as exc:
        raise MasterAPIResponseError from exc


def get_employees():
    return _get("employees/")


def get_departments():
    return _get("departments/")


def get_projects():
    return _get("projects/")
=======


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
>>>>>>> development
