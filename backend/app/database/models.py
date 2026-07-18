from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Integer,
    JSON
)

from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    email = Column(Text, unique=True, nullable=False)
    name = Column(Text)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    sites = relationship(
        "Site",
        back_populates="user"
    )



class Site(Base):
    __tablename__ = "sites"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False
    )

    url = Column(Text)
    name = Column(Text)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    user = relationship(
        "User",
        back_populates="sites"
    )

    scans = relationship(
        "Scan",
        back_populates="site"
    )



class Scan(Base):
    __tablename__ = "scans"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    site_id = Column(
        UUID(as_uuid=True),
        ForeignKey("sites.id"),
        nullable=False
    )

    status = Column(
        Text,
        default="pending"
    )

    max_pages = Column(Integer)

    started_at = Column(DateTime)

    finished_at = Column(DateTime)


    site = relationship(
        "Site",
        back_populates="scans"
    )

    pages = relationship(
        "Page",
        back_populates="scan"
    )



class Page(Base):
    __tablename__ = "pages"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    scan_id = Column(
        UUID(as_uuid=True),
        ForeignKey("scans.id"),
        nullable=False
    )

    url = Column(Text)

    screenshot_url = Column(Text)

    scanned_at = Column(
        DateTime
    )

    status = Column(Text)


    scan = relationship(
        "Scan",
        back_populates="pages"
    )

    violations = relationship(
        "Violation",
        back_populates="page"
    )



class Violation(Base):
    __tablename__ = "violations"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    page_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pages.id"),
        nullable=False
    )

    rule = Column(Text)

    wcag_criteria = Column(
        ARRAY(Text)
    )

    impact = Column(Text)

    selector = Column(Text)

    details = Column(
        JSON
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


    page = relationship(
        "Page",
        back_populates="violations"
    )

    fix = relationship(
        "Fix",
        back_populates="violation"
    )



class Fix(Base):
    __tablename__ = "fixes"


    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    violation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("violations.id"),
        nullable=False
    )

    method = Column(Text)

    code_diff = Column(Text)

    applied_at = Column(DateTime)

    status = Column(Text)


    violation = relationship(
        "Violation",
        back_populates="fix"
    )
