import logging
from typing import Optional

from sqlmodel import Session

from ..models import audit_log, AuditLogType

logger = logging.getLogger(__name__)


def log_event(
    db: Session,
    *,
    action: str,
    detail: str,
    log_type: AuditLogType,
    admin_email: str,
    ip_address: Optional[str] = None,
) -> None:
    """
    Persists a single audit log entry.

    Commits immediately so the record is materialised regardless of
    whether the caller's surrounding transaction later rolls back.
    Swallows persistence failures and emits them to the application
    logger rather than propagating — audit failures must not block
    legitimate admin operations.

    Args:
        db (Session): Active SQLModel session.
        action (str): Machine-readable event identifier, e.g. "admin_login".
        detail (str): Human-readable description for display in the audit UI.
        log_type (AuditLogType): Category per the allowed type enumeration.
        admin_email (str): Email of the acting admin, or "system" for
            automated events.
        ip_address (Optional[str]): Caller's IP. None for system events.
    """
    try:
        entry = audit_log(
            action=action,
            detail=detail,
            type=log_type,
            admin_email=admin_email,
            ip_address=ip_address,
        )
        db.add(entry)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error(
            "Audit log write failed — action=%s admin=%s error=%s",
            action,
            admin_email,
            exc,
        )