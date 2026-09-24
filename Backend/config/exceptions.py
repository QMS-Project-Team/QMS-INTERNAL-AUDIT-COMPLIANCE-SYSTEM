from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Report deletes blocked by on_delete=PROTECT as 409 instead of a 500."""

    if isinstance(exc, ProtectedError):
        blockers = sorted({
            str(obj._meta.verbose_name_plural) for obj in exc.protected_objects
        })
        return Response(
            {
                "detail": (
                    "This record is still in use and cannot be deleted. "
                    f"Linked: {', '.join(blockers)}."
                )
            },
            status=status.HTTP_409_CONFLICT,
        )

    return exception_handler(exc, context)
