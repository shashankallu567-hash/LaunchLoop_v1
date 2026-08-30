"""Pydantic models for LaunchLoop AI."""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ---------- Audience DNA ----------
class AudienceProfileCreate(BaseModel):
    name: str
    description: str = ""
    demographics: str = ""
    motivations: List[str] = Field(default_factory=list)
    pain_points: List[str] = Field(default_factory=list)
    interests: List[str] = Field(default_factory=list)
    desires: List[str] = Field(default_factory=list)
    content_triggers: List[str] = Field(default_factory=list)
    channels: List[str] = Field(default_factory=list)
    sharing_behavior: str = ""
    tone: str = "confident"


class AudienceProfile(AudienceProfileCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=new_id)
    user_id: str
    created_at: str = Field(default_factory=now_iso)
    updated_at: str = Field(default_factory=now_iso)


# ---------- Launch Twin / Generation ----------
class GenerateRequest(BaseModel):
    product_name: str
    product_description: str
    goal: str = "awareness"
    platforms: List[str] = Field(default_factory=list)
    audience_id: Optional[str] = None
    audience_inline: Optional[Dict[str, Any]] = None


# ---------- Campaigns ----------
class CampaignCreate(BaseModel):
    product_name: str
    product_description: str
    goal: str = "awareness"
    platforms: List[str] = Field(default_factory=list)
    audience_id: Optional[str] = None
    audience_snapshot: Optional[Dict[str, Any]] = None
    angle: Dict[str, Any]


class OutcomeOverride(BaseModel):
    impressions: int
    engagement: int
    shares: int
    conversions: int
