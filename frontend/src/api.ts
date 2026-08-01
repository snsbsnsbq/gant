export interface Task {
  id: string;
  name: string;
  description: string;
  assignee: string;
  duration: number;
  predecessors: string[];
  start: string;
  end: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
  result: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  tool_calls: ToolCall[];
}

const BASE = "/api";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  list: () => fetch(`${BASE}/tasks`).then((r) => handle<Task[]>(r)),

  update: (id: string, data: Partial<Task>) =>
    fetch(`${BASE}/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handle<Task>(r)),

  remove: (id: string) =>
    fetch(`${BASE}/tasks/${id}`, { method: "DELETE" }).then((r) =>
      handle<void>(r)
    ),

  seed: () => fetch(`${BASE}/seed`, { method: "POST" }).then((r) => handle<Task[]>(r)),

  importExcel: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return fetch(`${BASE}/import`, { method: "POST", body: form }).then((r) =>
      handle<Task[]>(r)
    );
  },

  exportUrl: `${BASE}/export`,

  chat: (message: string, history: ChatTurn[]) =>
    fetch(`${BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
    }).then((r) => handle<ChatResponse>(r)),
};
