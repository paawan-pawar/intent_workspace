from sqlalchemy import Column, String, JSON
from app.db.database import Base

class Preference(Base):
    __tablename__ = "preferences"

    role_id = Column(String, primary_key=True, index=True)
    pinned_ids = Column(JSON, default=list)
    hidden_ids = Column(JSON, default=list)
    widget_order = Column(JSON, default=dict)
    widget_spans = Column(JSON, default=dict)
    saved_layouts = Column(JSON, default=dict)
