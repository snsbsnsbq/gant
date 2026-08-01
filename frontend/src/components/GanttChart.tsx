import { useState } from "react";
import {
  Gantt,
  Task as GanttTask,
  ViewMode,
} from "gantt-task-react";
import "gantt-task-react/dist/index.css";

import { Task } from "@/api";
import { colorForAssignee } from "@/lib/colors";
import { Button } from "@/components/ui/button";

interface Props {
  tasks: Task[];
  onSelect: (task: Task) => void;
  onDateChange: (task: Task, start: Date, end: Date) => void;
}

const VIEW_MODES: { label: string; mode: ViewMode; columnWidth: number }[] = [
  { label: "День", mode: ViewMode.Day, columnWidth: 60 },
  { label: "Неделя", mode: ViewMode.Week, columnWidth: 160 },
  { label: "Месяц", mode: ViewMode.Month, columnWidth: 220 },
];

export default function GanttChart({ tasks, onSelect, onDateChange }: Props) {
  const [viewIndex, setViewIndex] = useState(0);
  const view = VIEW_MODES[viewIndex];

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Нет задач. Загрузите Excel или попросите ассистента добавить задачи.
      </div>
    );
  }

  const byId = new Map(tasks.map((t) => [t.id, t]));

  const ganttTasks: GanttTask[] = tasks.map((t) => {
    const color = colorForAssignee(t.assignee);
    return {
      id: t.id,
      name: t.assignee ? `${t.name} · ${t.assignee}` : t.name,
      start: new Date(t.start),
      end: new Date(t.end),
      progress: 0,
      type: "task",
      dependencies: t.predecessors,
      isDisabled: false,
      styles: {
        backgroundColor: color,
        backgroundSelectedColor: color,
        progressColor: color,
        progressSelectedColor: color,
      },
    };
  });

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Масштаб:</span>
        {VIEW_MODES.map((vm, i) => (
          <Button
            key={vm.label}
            size="sm"
            variant={i === viewIndex ? "default" : "outline"}
            onClick={() => setViewIndex(i)}
          >
            {vm.label}
          </Button>
        ))}
      </div>

      <div className="gantt-container min-h-0 flex-1">
        <Gantt
          tasks={ganttTasks}
          viewMode={view.mode}
          columnWidth={view.columnWidth}
          listCellWidth="220px"
          locale="ru"
          onClick={(gt) => {
            const task = byId.get(gt.id);
            if (task) onSelect(task);
          }}
          onDateChange={(gt) => {
            const task = byId.get(gt.id);
            if (task) onDateChange(task, gt.start, gt.end);
          }}
        />
      </div>
    </div>
  );
}
