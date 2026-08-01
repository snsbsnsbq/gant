from fastmcp import FastMCP

from app import services
from app.models import TaskCreate, TaskUpdate

mcp = FastMCP("gant-mcp")


@mcp.tool
async def list_tasks() -> list[dict]:
    """List all tasks in the plan with their schedule and dependencies."""
    tasks = await services.list_tasks()
    return [t.model_dump(mode="json") for t in tasks]


@mcp.tool
async def create_task(
    name: str,
    description: str = "",
    assignee: str = "",
    duration: int = 1,
    predecessors: list[str] | None = None,
) -> dict:
    """Create a task. ``predecessors`` may be task ids or existing task names.
    Duration is in days. The start date is computed from predecessors."""
    task = await services.create_task(
        TaskCreate(
            name=name,
            description=description,
            assignee=assignee,
            duration=duration,
            predecessors=predecessors or [],
        )
    )
    return task.model_dump(mode="json")


@mcp.tool
async def update_task(
    task_id: str,
    name: str | None = None,
    description: str | None = None,
    assignee: str | None = None,
    duration: int | None = None,
    predecessors: list[str] | None = None,
    start: str | None = None,
) -> dict:
    """Update fields of a task by id. ``start`` is an ISO date (e.g. 2026-08-01).
    Only provided fields change. ``predecessors`` accepts ids or names."""
    task = await services.update_task(
        task_id,
        TaskUpdate(
            name=name,
            description=description,
            assignee=assignee,
            duration=duration,
            predecessors=predecessors,
            start=start,
        ),
    )
    if task is None:
        raise ValueError(f"Task {task_id} not found")
    return task.model_dump(mode="json")


@mcp.tool
async def delete_task(task_id: str) -> dict:
    """Delete a task by id and remove it from other tasks' predecessors."""
    deleted = await services.delete_task(task_id)
    return {"deleted": deleted, "task_id": task_id}


@mcp.tool
async def reschedule_plan() -> list[dict]:
    """Recompute all start dates from dependencies (forward pass). Use after
    changing durations or predecessors to propagate the shifts."""
    tasks = await services.reschedule()
    return [t.model_dump(mode="json") for t in tasks]
