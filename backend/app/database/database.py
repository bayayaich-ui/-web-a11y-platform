from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import DATABASE_URL

# Créer la connexion avec PostgreSQL
engine = create_engine(
    DATABASE_URL
)

# Créer les sessions pour communiquer avec la DB
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base utilisée pour créer les modèles SQLAlchemy
Base = declarative_base()


# Fonction pour obtenir une session DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
