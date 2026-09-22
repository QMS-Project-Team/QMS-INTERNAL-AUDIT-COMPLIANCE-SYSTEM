"""TEAM is an integration layer for external master data.

Department, Project, and Employee master-data models intentionally do not live
in QMS. The external Master API is the source of truth. Audit-time snapshots,
when needed, belong to the audit domain rather than TEAM.
"""
