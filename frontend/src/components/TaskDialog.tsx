import { Task } from "@/api";
import { colorForAssignee } from "@/lib/colors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  task: Task | null;
  allTasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (task: Task) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function TaskDialog({
  task,
  allTasks,
  open,
  onOpenChange,
  onDelete,
}: Props) {
  if (!task) return null;

  const nameById = new Map(allTasks.map((t) => [t.id, t.name]));
  const predecessorNames = task.predecessors
    .map((id) => nameById.get(id))
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: colorForAssignee(task.assignee) }}
            />
            {task.name}
          </DialogTitle>
          <DialogDescription>
            {task.description || "Без описания"}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">Исполнитель</dt>
          <dd className="col-span-2 font-medium">
            {task.assignee || "—"}
          </dd>

          <dt className="text-muted-foreground">Длительность</dt>
          <dd className="col-span-2 font-medium">{task.duration} дн.</dd>

          <dt className="text-muted-foreground">Начало</dt>
          <dd className="col-span-2 font-medium">{formatDate(task.start)}</dd>

          <dt className="text-muted-foreground">Окончание</dt>
          <dd className="col-span-2 font-medium">{formatDate(task.end)}</dd>

          <dt className="text-muted-foreground">Предшественники</dt>
          <dd className="col-span-2 font-medium">
            {predecessorNames.length > 0 ? predecessorNames.join(", ") : "—"}
          </dd>
        </dl>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="destructive"
            onClick={() => {
              onDelete(task);
              onOpenChange(false);
            }}
          >
            Удалить задачу
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
