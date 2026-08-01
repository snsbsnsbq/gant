from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field


class TaskBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    description: str = ""
    assignee: str = ""
    duration: int = Field(default=1, ge=0)
    predecessors: list[str] = Field(default_factory=list)


class TaskCreate(TaskBase):
    start: datetime | None = None


class TaskUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    assignee: str | None = None
    duration: int | None = Field(default=None, ge=0)
    predecessors: list[str] | None = None
    start: datetime | None = None


class Task(TaskBase):
    id: str
    start: datetime
    end: datetime


def serialize_task(doc: dict) -> Task:
    start: datetime = doc["start"]
    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    duration = int(doc.get("duration", 1))
    return Task(
        id=str(doc["_id"]),
        name=doc["name"],
        description=doc.get("description", ""),
        assignee=doc.get("assignee", ""),
        duration=duration,
        predecessors=[str(p) for p in doc.get("predecessors", [])],
        start=start,
        end=start + timedelta(days=duration),
    )
