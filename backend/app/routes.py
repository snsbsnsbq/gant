from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import Response
from pydantic import BaseModel

from app import seed, services
from app.agent import run_agent
from app.excel import ExcelValidationError
from app.models import Task, TaskCreate, TaskUpdate

router = APIRouter(prefix="/api", tags=["gant"])

EXCEL_MEDIA_TYPE = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)


class ChatTurn(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatTurn] = []


@router.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@router.get("/tasks", response_model=list[Task])
async def get_tasks() -> list[Task]:
    return await services.list_tasks()


@router.post("/tasks", response_model=Task, status_code=201)
async def create_task(data: TaskCreate) -> Task:
    return await services.create_task(data)


@router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str) -> Task:
    task = await services.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/tasks/{task_id}", response_model=Task)
async def patch_task(task_id: str, data: TaskUpdate) -> Task:
    task = await services.update_task(task_id, data)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.delete("/tasks/{task_id}", status_code=204)
async def remove_task(task_id: str) -> None:
    deleted = await services.delete_task(task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found")


@router.post("/tasks/reschedule", response_model=list[Task])
async def reschedule() -> list[Task]:
    return await services.reschedule()


@router.post("/import", response_model=list[Task])
async def import_excel(file: UploadFile = File(...)) -> list[Task]:
    data = await file.read()
    try:
        return await services.import_excel(data)
    except ExcelValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Не удалось обработать файл. Проверьте, что это корректный Excel-файл.",
        )


@router.get("/export")
async def export_excel() -> Response:
    data = await services.export_excel()
    return Response(
        content=data,
        media_type=EXCEL_MEDIA_TYPE,
        headers={"Content-Disposition": 'attachment; filename="gant-plan.xlsx"'},
    )


@router.post("/seed", response_model=list[Task])
async def reset_seed() -> list[Task]:
    await seed.reset_seed()
    return await services.list_tasks()


@router.post("/chat")
async def chat(req: ChatRequest) -> dict:
    try:
        return await run_agent(
            req.message, [turn.model_dump() for turn in req.history]
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
