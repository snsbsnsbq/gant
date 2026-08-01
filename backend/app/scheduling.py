from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone


def project_start() -> datetime:
    """Default project start: today at midnight UTC."""
    now = datetime.now(timezone.utc)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def compute_starts(
    tasks: list[dict], start_date: datetime | None = None
) -> dict[str, datetime]:
    """Forward-pass schedule (CPM-style).

    Each task starts when all of its predecessors have finished; tasks without
    predecessors start at ``start_date``. Cycles are broken defensively so the
    function never loops forever. ``tasks`` items need ``id``, ``duration`` and
    ``predecessors`` (list of ids).
    """
    if start_date is None:
        start_date = project_start()

    duration = {t["id"]: max(int(t.get("duration", 1)), 0) for t in tasks}
    preds = {
        t["id"]: [p for p in t.get("predecessors", []) if p in duration]
        for t in tasks
    }

    indegree = {tid: 0 for tid in duration}
    adjacency: dict[str, list[str]] = defaultdict(list)
    for tid, parents in preds.items():
        for parent in parents:
            adjacency[parent].append(tid)
            indegree[tid] += 1

    queue = deque([tid for tid, deg in indegree.items() if deg == 0])
    order: list[str] = []
    while queue:
        node = queue.popleft()
        order.append(node)
        for child in adjacency[node]:
            indegree[child] -= 1
            if indegree[child] == 0:
                queue.append(child)

    # Any tasks left out were part of a cycle: append them so they still get a date.
    for tid in duration:
        if tid not in order:
            order.append(tid)

    starts: dict[str, datetime] = {}
    ends: dict[str, datetime] = {}
    for tid in order:
        parents = preds[tid]
        start = (
            max((ends.get(p, start_date) for p in parents), default=start_date)
            if parents
            else start_date
        )
        starts[tid] = start
        ends[tid] = start + timedelta(days=duration[tid])

    return starts
