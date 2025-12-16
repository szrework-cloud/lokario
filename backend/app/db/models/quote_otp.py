"""
Modèle pour stocker les codes OTP de validation de signature de devis.
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone, timedelta
from app.db.base import Base
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, timezone, timedelta


class QuoteOTP(Base):
    """
    Code OTP pour valider l'email avant de signer un devis.
    """
    __tablename__ = "quote_otps"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False)  # Email à valider
    code = Column(String(6), nullable=False)  # Code OTP (6 chiffres)
    expires_at = Column(DateTime(timezone=True), nullable=False)  # Date d'expiration (15 minutes)
    verified = Column(Boolean, default=False, nullable=False)  # Si le code a été vérifié
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relations
    quote = relationship("Quote", backref="otp_codes")
    
    def is_valid(self) -> bool:
        """Vérifie si le code OTP est encore valide."""
        if self.verified:
            return False
        
        # S'assurer que les deux datetimes sont timezone-aware
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            # Si le datetime n'a pas de timezone, on suppose UTC
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        return expires_at > now
    
    def verify(self) -> bool:
        """Marque le code comme vérifié."""
        if not self.is_valid():
            return False
        self.verified = True
        return True
