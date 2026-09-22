from rest_framework.permissions import BasePermission


class IsDirector(BasePermission):
    message = "Only Directors can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "DIRECTOR"
        )


class IsManager(BasePermission):
    message = "Only Managers can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "MANAGER"
        )


class IsQMS(BasePermission):
    message = "Only QMS users can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "QMS"
        )


class IsAuditor(BasePermission):
    message = "Only Auditors can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "AUDITOR"
        )


class IsTeamMember(BasePermission):
    message = "Only Team Members can access this resource."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == "TEAM_MEMBER"
        )