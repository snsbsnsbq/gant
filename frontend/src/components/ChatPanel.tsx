import { useEffect, useRef, useState, FormEvent, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";

import { api, ChatTurn } from "@/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  onPlanChanged: () => void;
}

const SUGGESTIONS = [
  "Что ты умеешь?",
  "Увеличь срок выполнения задачи",
  "Создай новую задачу",
];

const WELCOME =
  "Привет! Я помогу отредактировать диаграмму Гантта. Напишите запрос или выберите пример ниже.";

export default function ChatPanel({ onPlanChanged }: Props) {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy, showWelcome]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [input]);

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
        { role: "assistant", content: res.reply },
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

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        <div className="space-y-3">
          {showWelcome && (
            <div className="mr-auto max-w-[90%] animate-in fade-in duration-500 rounded-lg border bg-card px-3 py-2 text-sm text-card-foreground">
              <div className="whitespace-pre-wrap break-words">{WELCOME}</div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "w-fit max-w-[90%] rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "mr-auto border bg-card text-card-foreground"
              )}
            >
              <div className="whitespace-pre-wrap break-words">
                {m.content || "…"}
              </div>
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

        {messages.length === 0 && (
          <div className="mt-auto flex flex-col items-end gap-2 pt-6">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border bg-card px-3 py-1.5 text-right text-sm text-card-foreground transition-colors hover:bg-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={onSubmit} className="relative border-t p-3">
        <div className="pointer-events-none absolute inset-x-0 -top-8 h-8 bg-gradient-to-b from-transparent to-background" />
        <div className="flex items-end gap-1 rounded-3xl border border-border p-1">
          <Textarea
            autoFocus
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={busy}
            placeholder="Введите свой запрос"
            className="min-h-9 max-h-32 flex-1 resize-none overflow-y-auto border-none bg-transparent px-3 py-1.5 text-base leading-6 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-sm placeholder:leading-6 placeholder:text-muted-foreground"
          />
          <Button
            type="submit"
            size="icon"
            className="size-9 shrink-0 rounded-full bg-primary hover:bg-primary/90"
            disabled={busy || input.trim() === ""}
          >
            <ArrowUp className="size-5 text-primary-foreground" />
          </Button>
        </div>
      </form>
    </div>
  );
}
