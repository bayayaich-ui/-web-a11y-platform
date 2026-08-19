import json

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    TypeDecorator
)

from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.database.database import Base


class WcagCriteriaType(TypeDecorator):
    """Store WCAG references in a dialect-safe way.

    SQLite test tables are TEXT-backed and cannot bind Python lists to ARRAY(Text),
    while PostgreSQL uses native arrays for the production schema. This adapter keeps
    both behaviors compatible without dropping any validation data.
    """

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return ARRAY(Text)
        return Text()

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, (list, tuple)):
            values = list(value)
            if dialect.name == "sqlite":
                return json.dumps(values)
            return values
        if isinstance(value, str):
            return value
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except (TypeError, ValueError):
                pass
        return value


class User(Base):
    __tablename__ = "users"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    email = Column(Text, unique=True, nullable=False)
    name = Column(Text)
    password_hash = Column(Text, nullable=True)

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
    max_depth = Column(Integer)
    scan_mode = Column(Text, default="single_page")

    pages_scanned = Column(Integer, default=0)
    score_global = Column(Integer)

    violations_critical = Column(Integer, default=0)
    violations_serious = Column(Integer, default=0)
    violations_moderate = Column(Integer, default=0)
    violations_minor = Column(Integer, default=0)

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
        WcagCriteriaType()
    )

    impact = Column(Text)

    element = Column(Text)
    message = Column(Text)
    
    priority = Column(Text)
    diagnostic = Column(JSON)

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
