from datetime import datetime, timedelta

from bson import ObjectId
from bson.errors import InvalidId

from app import excel
from app.db import get_db
from app.models import Task, TaskCreate, TaskUpdate, serialize_task
from app.scheduling import compute_starts, project_start

COLLECTION = "tasks"


def _oid(task_id: str) -> ObjectId | None:
    try:
        return ObjectId(task_id)
    except (InvalidId, TypeError):
        return None


async def _all_docs() -> list[dict]:
    cursor = get_db()[COLLECTION].find()
    return [doc async for doc in cursor]


def _sort_docs(docs: list[dict]) -> list[dict]:
    return sorted(docs, key=lambda d: (d.get("start") is None, d.get("start")))


async def list_tasks() -> list[Task]:
    docs = _sort_docs(await _all_docs())
    return [serialize_task(doc) for doc in docs]


async def get_task(task_id: str) -> Task | None:
    oid = _oid(task_id)
    if oid is None:
        return None
    doc = await get_db()[COLLECTION].find_one({"_id": oid})
    return serialize_task(doc) if doc else None


async def _resolve_predecessors(values: list[str]) -> list[str]:
    """Accept predecessor ids or names and normalize to existing ids."""
    if not values:
        return []
    docs = await _all_docs()
    ids = {str(d["_id"]) for d in docs}
    name_to_id = {str(d.get("name", "")).strip().lower(): str(d["_id"]) for d in docs}
    resolved: list[str] = []
    for value in values:
        value = str(value).strip()
        if value in ids:
            resolved.append(value)
        elif value.lower() in name_to_id:
            resolved.append(name_to_id[value.lower()])
    return resolved


async def _start_from_predecessors(predecessors: list[str], duration: int) -> datetime:
    docs = await _all_docs()
    by_id = {str(d["_id"]): d for d in docs}
    if not predecessors:
        return project_start()
    ends = []
    for pid in predecessors:
        d = by_id.get(pid)
        if d and d.get("start"):
            ends.append(d["start"] + timedelta(days=int(d.get("duration", 1))))
    return max(ends) if ends else project_start()


async def create_task(data: TaskCreate) -> Task:
    predecessors = await _resolve_predecessors(data.predecessors)
    start = data.start or await _start_from_predecessors(predecessors, data.duration)
    doc = {
        "name": data.name,
        "description": data.description,
        "assignee": data.assignee,
        "duration": int(data.duration),
        "predecessors": predecessors,
        "start": start,
    }
    result = await get_db()[COLLECTION].insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_task(doc)


async def update_task(task_id: str, data: TaskUpdate) -> Task | None:
    oid = _oid(task_id)
    if oid is None:
        return None

    changes: dict = {}
    payload = data.model_dump(exclude_unset=True)
    for field in ("name", "description", "assignee", "start"):
        if field in payload and payload[field] is not None:
            changes[field] = payload[field]
    if "duration" in payload and payload["duration"] is not None:
        changes["duration"] = int(payload["duration"])
    if "predecessors" in payload and payload["predecessors"] is not None:
        changes["predecessors"] = await _resolve_predecessors(payload["predecessors"])

    if not changes:
        return await get_task(task_id)

    doc = await get_db()[COLLECTION].find_one_and_update(
        {"_id": oid}, {"$set": changes}, return_document=True
    )
    return serialize_task(doc) if doc else None


async def delete_task(task_id: str) -> bool:
    oid = _oid(task_id)
    if oid is None:
        return False
    # Remove this task from any predecessor lists.
    await get_db()[COLLECTION].update_many(
        {"predecessors": task_id}, {"$pull": {"predecessors": task_id}}
    )
    result = await get_db()[COLLECTION].delete_one({"_id": oid})
    return result.deleted_count > 0


async def clear_tasks() -> None:
    await get_db()[COLLECTION].delete_many({})


async def reschedule() -> list[Task]:
    """Recompute start dates for every task from its dependencies."""
    docs = await _all_docs()
    payload = [
        {
            "id": str(d["_id"]),
            "duration": int(d.get("duration", 1)),
            "predecessors": [str(p) for p in d.get("predecessors", [])],
        }
        for d in docs
    ]
    starts = compute_starts(payload)
    for tid, start in starts.items():
        await get_db()[COLLECTION].update_one({"_id": _oid(tid)}, {"$set": {"start": start}})
    return await list_tasks()


async def replace_all(raw_tasks: list[dict]) -> list[Task]:
    """Replace the whole plan from parsed rows (predecessors given by name)."""
    await clear_tasks()
    if not raw_tasks:
        return []

    name_to_id: dict[str, str] = {}
    docs: list[dict] = []
    for record in raw_tasks:
        doc = {
            "name": record.get("name", ""),
            "description": record.get("description", ""),
            "assignee": record.get("assignee", ""),
            "duration": int(record.get("duration", 1)),
            "predecessors": [],  # filled after all ids are known
            "start": project_start(),
            "_pred_names": record.get("predecessor_names", []),
        }
        result = await get_db()[COLLECTION].insert_one(
            {k: v for k, v in doc.items() if k != "_pred_names"}
        )
        doc["_id"] = result.inserted_id
        name_to_id[doc["name"].strip().lower()] = str(result.inserted_id)
        docs.append(doc)

    for doc in docs:
        predecessors = [
            name_to_id[name.strip().lower()]
            for name in doc["_pred_names"]
            if name.strip().lower() in name_to_id
        ]
        await get_db()[COLLECTION].update_one(
            {"_id": doc["_id"]}, {"$set": {"predecessors": predecessors}}
        )

    return await reschedule()


async def import_excel(data: bytes) -> list[Task]:
    return await replace_all(excel.parse_excel(data))


async def export_excel() -> bytes:
    return excel.build_excel(await list_tasks())
