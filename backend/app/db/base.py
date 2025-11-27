from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import des modèles pour que les migrations soient possibles plus tard
from app.db.models.user import User  # noqa
from app.db.models.company import Company  # noqa
from app.db.models.company_settings import CompanySettings  # noqa
from app.db.models.client import Client  # noqa
from app.db.models.task import Task, ChecklistTemplate  # noqa
from app.db.models.project import Project, ProjectHistory  # noqa
from app.db.models.billing import Quote, Invoice  # noqa
from app.db.models.document import Document, DocumentFolder, DocumentHistory  # noqa
from app.db.models.followup import FollowUp, FollowUpTemplate  # noqa

