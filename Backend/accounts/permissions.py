from rest_framework.permissions import BasePermission


class IsDirector(BasePermission):
    message = "Only Directors can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "DIRECTOR"
        )


class IsQMS(BasePermission):
    message = "Only QMS users can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "QMS"
        )


class IsEmployee(BasePermission):
    message = "Only Employees can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "EMPLOYEE"
        )


class IsDirectorOrQMS(BasePermission):
    message = "Only Directors or QMS users can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in ["DIRECTOR", "QMS"]
        )