import { useEffect, useRef, useState, FormEvent } from "react";
import { Send } from "lucide-react";

import { api, ChatTurn, ToolCall } from "@/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Message extends ChatTurn {
  toolCalls?: ToolCall[];
}

interface Props {
  onPlanChanged: () => void;
}

const SUGGESTIONS = [
  "Сдвинь тестирование на 3 дня позже",
  "Переназначь все задачи Бориса на Анну",
  "Добавь задачу «Документация» на 3 дня после деплоя",
];

export default function ChatPanel({ onPlanChanged }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy) return;

    const history: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setBusy(true);
    setError(null);

    try {
      const res = await api.chat(text, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply, toolCalls: res.tool_calls },
      ]);
      if (res.tool_calls.length > 0) onPlanChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка запроса");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Ассистент планирования</h2>
        <p className="text-xs text-muted-foreground">
          Редактируйте план на естественном языке
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Примеры команд:
            </p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-md border bg-card px-3 py-2 text-left text-sm text-card-foreground transition-colors hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[90%] rounded-lg px-3 py-2 text-sm",
              m.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto border bg-card text-card-foreground"
            )}
          >
            <div className="whitespace-pre-wrap break-words">
              {m.content || "…"}
            </div>
            {m.toolCalls && m.toolCalls.length > 0 && (
              <details className="mt-2 text-xs opacity-80">
                <summary className="cursor-pointer">
                  {m.toolCalls.length} действ. с планом
                </summary>
                <ul className="mt-1 space-y-1">
                  {m.toolCalls.map((tc, j) => (
                    <li key={j} className="font-mono">
                      {tc.name}({JSON.stringify(tc.arguments)})
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}

        {busy && (
          <div className="mr-auto max-w-[90%] rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
            думаю…
          </div>
        )}
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t p-3">
        <Input
          placeholder="Например: перенеси интеграцию на неделю позже"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <Button type="submit" size="icon" disabled={busy}>
          <Send />
        </Button>
      </form>
    </div>
  );
}
