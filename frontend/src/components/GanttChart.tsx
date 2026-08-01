import {
  Gantt,
  Task as GanttTask,
  ViewMode,
} from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { useRef, type CSSProperties } from "react";

import { Task } from "@/api";
import { colorForAssignee } from "@/lib/colors";

interface Props {
  tasks: Task[];
  viewIndex: number;
  onSelect: (task: Task) => void;
  onDateChange: (task: Task, start: Date, end: Date) => void;
}

export const VIEW_MODES: {
  label: string;
  mode: ViewMode;
  columnWidth: number;
}[] = [
  { label: "День", mode: ViewMode.Day, columnWidth: 60 },
  { label: "Неделя", mode: ViewMode.Week, columnWidth: 160 },
  { label: "Месяц", mode: ViewMode.Month, columnWidth: 220 },
];

const COLUMNS = [
  { key: "name", label: "Задача", width: 180 },
  { key: "assignee", label: "Исполнитель", width: 130 },
] as const;

const LIST_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

function cellStyle(width: number, withDivider: boolean): CSSProperties {
  return {
    minWidth: width,
    maxWidth: width,
    boxSizing: "border-box",
    padding: "0 8px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    ...(withDivider ? { borderRight: "1px solid #e6e4e4" } : null),
  };
}

export default function GanttChart({
  tasks,
  viewIndex,
  onSelect,
  onDateChange,
}: Props) {
  const view = VIEW_MODES[viewIndex];
  // gantt-task-react fires onClick after drag mouseup; skip that synthetic click
  const suppressClickRef = useRef(false);

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Нет задач. Загрузите Excel или попросите ассистента добавить задачи.
      </div>
    );
  }

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const assigneeById = new Map(tasks.map((t) => [t.id, t.assignee ?? ""]));

  const ganttTasks: GanttTask[] = tasks.map((t) => {
    const color = colorForAssignee(t.assignee);
    return {
      id: t.id,
      name: t.name,
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

  const TaskListHeader = ({
    headerHeight,
    fontFamily,
    fontSize,
  }: {
    headerHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
  }) => (
    <div style={{ fontFamily, fontSize }}>
      <div
        style={{
          height: headerHeight - 1,
          width: LIST_WIDTH,
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #e6e4e4",
          borderRight: "1px solid #e6e4e4",
        }}
      >
        {COLUMNS.map((c, i) => (
          <div
            key={c.key}
            style={cellStyle(c.width, i < COLUMNS.length - 1)}
            title={c.label}
          >
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );

  const TaskListTable = ({
    rowHeight,
    fontFamily,
    fontSize,
    tasks: rows,
  }: {
    rowHeight: number;
    rowWidth: string;
    fontFamily: string;
    fontSize: string;
    locale: string;
    tasks: GanttTask[];
    selectedTaskId: string;
    setSelectedTask: (taskId: string) => void;
    onExpanderClick: (task: GanttTask) => void;
  }) => (
    <div style={{ fontFamily, fontSize }}>
      {rows.map((t) => {
        const assignee = assigneeById.get(t.id) ?? "";
        const values: Record<(typeof COLUMNS)[number]["key"], string> = {
          name: t.name,
          assignee,
        };
        return (
          <div
            key={`${t.id}row`}
            style={{
              height: rowHeight,
              width: LIST_WIDTH,
              display: "flex",
              alignItems: "center",
              borderBottom: "1px solid #e6e4e4",
              borderRight: "1px solid #e6e4e4",
            }}
          >
            {COLUMNS.map((c, i) => (
              <div
                key={c.key}
                style={cellStyle(c.width, i < COLUMNS.length - 1)}
                title={values[c.key]}
              >
                {values[c.key]}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="flex h-full flex-col">
      <div className="gantt-container min-h-0 flex-1">
        <Gantt
          tasks={ganttTasks}
          viewMode={view.mode}
          columnWidth={view.columnWidth}
          listCellWidth={`${LIST_WIDTH}px`}
          fontFamily="'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif"
          locale="ru"
          TaskListHeader={TaskListHeader}
          TaskListTable={TaskListTable}
          onClick={(gt) => {
            if (suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            const task = byId.get(gt.id);
            if (task) onSelect(task);
          }}
          onDateChange={(gt) => {
            // Date change runs on mouseup before the trailing click event
            suppressClickRef.current = true;
            window.setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
            const task = byId.get(gt.id);
            if (task) onDateChange(task, gt.start, gt.end);
          }}
        />
      </div>
    </div>
  );
}
