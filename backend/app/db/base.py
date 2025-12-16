from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import des modèles pour que les migrations soient possibles plus tard
from app.db.models.user import User  # noqa
from app.db.models.company import Company  # noqa
from app.db.models.company_settings import CompanySettings  # noqa
from app.db.models.client import Client  # noqa
from app.db.models.project import Project, ProjectHistory  # noqa
from app.db.models.billing import Quote, Invoice, InvoicePayment  # noqa
from app.db.models.document import Document, DocumentFolder, DocumentHistory  # noqa
from app.db.models.followup import FollowUp, FollowUpHistory  # noqa
from app.db.models.conversation import Conversation, InboxMessage, MessageAttachment, InboxFolder, InternalNote  # noqa
from app.db.models.task import Task  # noqa
from app.db.models.checklist import ChecklistTemplate, ChecklistInstance  # noqa
from app.db.models.quote_otp import QuoteOTP  # noqa
from app.db.models.chatbot import ChatbotConversation, ChatbotMessage, ChatbotContextCache  # noqa

