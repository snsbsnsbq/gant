import { useEffect, useRef, useState } from "react";
import { Upload, Download, RotateCcw } from "lucide-react";

import { api, Task } from "@/api";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import GanttChart, { VIEW_MODES } from "@/components/GanttChart";
import ChatPanel from "@/components/ChatPanel";
import TaskDialog from "@/components/TaskDialog";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<Task | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewIndex, setViewIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    try {
      setTasks(await api.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить план");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleImport(file: File) {
    setBusy(true);
    try {
      const imported = await api.importExcel(file);
      setTasks(imported);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка импорта Excel");
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setBusy(true);
    try {
      setTasks(await api.seed());
    } finally {
      setBusy(false);
    }
  }

  async function handleDateChange(task: Task, start: Date, end: Date) {
    const duration = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86_400_000)
    );
    await api.update(task.id, { start: start.toISOString(), duration });
    await refresh();
  }

  async function handleDelete(task: Task) {
    await api.remove(task.id);
    await refresh();
  }

  function openTask(task: Task) {
    setSelected(task);
    setDialogOpen(true);
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Gant"
            className="h-12 w-12 object-contain"
          />
          <div>
            <h1 className="text-lg font-semibold leading-tight">Gant</h1>
            <p className="ai-shimmer text-xs font-medium">
              Диаграмма Гантта с AI-ассистентом
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Масштаб:</span>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={String(viewIndex)}
              onValueChange={(value) => {
                if (value) setViewIndex(Number(value));
              }}
            >
              {VIEW_MODES.map((vm, i) => (
                <ToggleGroupItem key={vm.label} value={String(i)}>
                  {vm.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="h-6 w-px bg-border" aria-hidden />
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <Upload /> Импорт Excel
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={api.exportUrl}>
              <Download /> Экспорт Excel
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={handleReset}
          >
            <RotateCcw /> Сбросить
          </Button>
        </div>
      </header>

      {error && (
        <div className="border-b bg-destructive/10 px-6 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <main className="grid min-h-0 flex-1 grid-cols-[1fr_380px]">
        <section className="min-h-0 overflow-hidden">
          <GanttChart
            tasks={tasks}
            viewIndex={viewIndex}
            onSelect={openTask}
            onDateChange={handleDateChange}
          />
        </section>
        <aside className="min-h-0 border-l">
          <ChatPanel onPlanChanged={refresh} />
        </aside>
      </main>

      <TaskDialog
        task={selected}
        allTasks={tasks}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDelete={handleDelete}
      />
    </div>
  );
}
