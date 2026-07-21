import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

interface StreamChunk {
  content?: string;
  done?: boolean;
  error?: string;
}

interface SmartPortfolioChatProps {
  projectNames: string[];
  onProjectMentioned?: (projectName: string) => void;
  suggestedQuestions?: string[];
}
const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:5138";


const STREAM_ENDPOINT = `${API_BASE_URL}/api/portfolio/chat/stream`;

const DEFAULT_SUGGESTIONS = [
  "What is your strongest tech stack?",
  "Tell me about the Infinity Bank project.",
  "What testing experience do you have?",
];

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SmartPortfolioChat({
  projectNames,
  onProjectMentioned,
  suggestedQuestions = DEFAULT_SUGGESTIONS,
}: SmartPortfolioChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: "assistant",
      content:
        "Hi, I'm Yusif's AI avatar. Ask me anything about my .NET/full-stack experience, projects, or background.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mentionedInCurrentReplyRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const detectProjectMentions = useCallback(
    (fullText: string) => {
      if (!onProjectMentioned) return;
      for (const name of projectNames) {
        if (!mentionedInCurrentReplyRef.current.has(name) && fullText.includes(name)) {
          mentionedInCurrentReplyRef.current.add(name);
          onProjectMentioned(name);
        }
      }
    },
    [projectNames, onProjectMentioned]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setErrorMessage(null);
      mentionedInCurrentReplyRef.current = new Set();

      const userMessage: ChatMessage = { id: createId(), role: "user", content: trimmed };
      const history = messages.map(({ role, content }) => ({ role, content }));

      const assistantMessageId = createId();
      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);
      setInput("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(STREAM_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, history }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let accumulatedText = "";

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";

          for (const frame of frames) {
            const line = frame.trim();
            if (!line.startsWith("data:")) continue;

            const jsonText = line.slice("data:".length).trim();
            if (!jsonText) continue;

            let chunk: StreamChunk;
            try {
              chunk = JSON.parse(jsonText) as StreamChunk;
            } catch {
              continue;
            }

            if (chunk.error) {
              setErrorMessage(chunk.error);
              continue;
            }

            if (chunk.content) {
              accumulatedText += chunk.content;
              const snapshot = accumulatedText;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantMessageId ? { ...m, content: snapshot } : m))
              );
              detectProjectMentions(snapshot);
            }

            if (chunk.done) {
              break;
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setErrorMessage("Connection to the AI service was interrupted. Please try again.");
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [messages, isStreaming, detectProjectMentions]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Header — 30% structural color (slate-900) */}
      <div className="flex items-center justify-between rounded-t-xl bg-slate-900 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
            Ask Yusif&apos;s AI Avatar
          </h2>
          <p className="text-xs text-slate-400">Grounded in his real CV data — no guessing.</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      {/* Message list — 60% neutral background */}
      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                message.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-slate-900 px-4 py-2.5 text-sm text-white"
                  : "max-w-[80%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800"
              }
            >
              {message.content || (
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {errorMessage}
          </div>
        )}
        <div ref={scrollAnchorRef} />
      </div>

      {/* Quick-reply suggestions */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
          {suggestedQuestions.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => void sendMessage(question)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition hover:border-amber-400 hover:text-amber-600"
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {/* Input — 10% accent color on the send button */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-200 p-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about my experience, skills, or projects..."
          disabled={isStreaming}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={isStreaming || input.trim().length === 0}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isStreaming ? "..." : "Send"}
        </button>
      </form>
    </div>
  );
}
