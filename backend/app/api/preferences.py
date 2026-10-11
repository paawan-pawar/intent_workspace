from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Dict, Any
from app.db.database import get_db
from app.db.models import Preference

router = APIRouter()

class PreferencesSchema(BaseModel):
    pinned_ids: List[str] = []
    hidden_ids: List[str] = []
    widget_order: Dict[str, int] = {}
    widget_spans: Dict[str, int] = {}
    saved_layouts: Dict[str, Any] = {}

@router.get("/preferences/{role}", response_model=PreferencesSchema)
async def get_preferences(role: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Preference).where(Preference.role_id == role))
    pref = result.scalars().first()
    if not pref:
        return PreferencesSchema()
    
    return PreferencesSchema(
        pinned_ids=pref.pinned_ids or [],
        hidden_ids=pref.hidden_ids or [],
        widget_order=pref.widget_order or {},
        widget_spans=pref.widget_spans or {},
        saved_layouts=pref.saved_layouts or {}
    )

@router.put("/preferences/{role}", response_model=PreferencesSchema)
async def update_preferences(role: str, prefs: PreferencesSchema, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Preference).where(Preference.role_id == role))
    pref = result.scalars().first()
    
    if not pref:
        pref = Preference(role_id=role)
        db.add(pref)
        
    pref.pinned_ids = prefs.pinned_ids
    pref.hidden_ids = prefs.hidden_ids
    pref.widget_order = prefs.widget_order
    pref.widget_spans = prefs.widget_spans
    pref.saved_layouts = prefs.saved_layouts
    
    await db.commit()
    await db.refresh(pref)
    
    return PreferencesSchema(
        pinned_ids=pref.pinned_ids,
        hidden_ids=pref.hidden_ids,
        widget_order=pref.widget_order,
        widget_spans=pref.widget_spans,
        saved_layouts=pref.saved_layouts
    )
