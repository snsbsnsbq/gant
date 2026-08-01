import io
import re

from openpyxl import Workbook, load_workbook

from app.models import Task

# Header aliases (Russian primary, English fallbacks) -> canonical field.
HEADER_MAP = {
    "задача": "name",
    "task": "name",
    "name": "name",
    "название": "name",
    "описание": "description",
    "description": "description",
    "исполнитель": "assignee",
    "assignee": "assignee",
    "owner": "assignee",
    "длительность": "duration",
    "duration": "duration",
    "предшественники": "predecessors",
    "predecessors": "predecessors",
    "depends on": "predecessors",
}

EXPORT_HEADERS = [
    ("name", "Задача"),
    ("description", "Описание"),
    ("assignee", "Исполнитель"),
    ("duration", "Длительность"),
    ("predecessors", "Предшественники"),
]


def _split_predecessors(value: str) -> list[str]:
    if not value:
        return []
    parts = re.split(r"[,;\n]+", str(value))
    return [p.strip() for p in parts if p.strip()]


def parse_excel(data: bytes) -> list[dict]:
    """Parse an uploaded xlsx into raw task dicts.

    Predecessors are returned as *names* (``predecessor_names``); the caller
    resolves them to ids after tasks are created.
    """
    wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    ws = wb.active

    rows = ws.iter_rows(values_only=True)
    try:
        header = next(rows)
    except StopIteration:
        return []

    columns: dict[int, str] = {}
    for idx, cell in enumerate(header):
        if cell is None:
            continue
        key = str(cell).strip().lower()
        if key in HEADER_MAP:
            columns[idx] = HEADER_MAP[key]

    tasks: list[dict] = []
    for row in rows:
        record = {"name": "", "description": "", "assignee": "", "duration": 1}
        predecessor_names: list[str] = []
        for idx, field in columns.items():
            value = row[idx] if idx < len(row) else None
            if field == "duration":
                try:
                    record["duration"] = max(int(float(value)), 0) if value is not None else 1
                except (TypeError, ValueError):
                    record["duration"] = 1
            elif field == "predecessors":
                predecessor_names = _split_predecessors(value)
            else:
                record[field] = str(value).strip() if value is not None else ""

        if not record["name"]:
            continue
        record["predecessor_names"] = predecessor_names
        tasks.append(record)

    return tasks


def build_excel(tasks: list[Task]) -> bytes:
    """Serialize tasks back into an xlsx matching the input format."""
    id_to_name = {t.id: t.name for t in tasks}

    wb = Workbook()
    ws = wb.active
    ws.title = "Tasks"
    ws.append([title for _, title in EXPORT_HEADERS])

    for task in tasks:
        predecessor_names = ", ".join(
            id_to_name.get(pid, "") for pid in task.predecessors if pid in id_to_name
        )
        ws.append(
            [task.name, task.description, task.assignee, task.duration, predecessor_names]
        )

    for column_cells in ws.columns:
        length = max((len(str(c.value)) if c.value is not None else 0) for c in column_cells)
        ws.column_dimensions[column_cells[0].column_letter].width = min(max(length + 2, 12), 60)

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
