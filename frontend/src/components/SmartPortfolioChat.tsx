import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

// ---------------------------------------------------------------------------
// Types & Configuration
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
    "Tell me about your IT traineeships at Akvelon and EPAM.",
    "What automated testing and DevOps tooling experience do you have?",
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
                "Hi, I'm Yusif's AI avatar. Ask me anything about my **.NET/full-stack IT traineeships**, automated testing stack (xUnit, Selenium), practical coding projects, or academic background.",
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
        <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden text-slate-100">
            {/* Header — 30% Structural Base (Slate-900) */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 font-bold text-white shadow-inner">
                        YA
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold tracking-wide text-white">
                            Yusif&apos;s AI Copilot
                        </h2>
                        <p className="text-xs text-slate-400">Grounded in verified traineeship &amp; CV data</p>
                    </div>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </span>
            </div>

            {/* Message List — 60% Dominant Dark Background */}
            <div className="flex-1 space-y-5 overflow-y-auto bg-slate-900/40 p-5">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                        <div
                            className={
                                message.role === "user"
                                    ? "max-w-[80%] rounded-2xl rounded-tr-none bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-md"
                                    : "max-w-[85%] rounded-2xl rounded-tl-none border border-slate-800 bg-slate-900/90 px-4 py-3 text-sm text-slate-200 shadow-md"
                            }
                        >
                            {message.role === "user" ? (
                                message.content
                            ) : message.content ? (
                                <div className="prose prose-invert prose-sm max-w-none space-y-2.5 break-words leading-relaxed">
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => <p className="mb-2.5 last:mb-0 text-slate-200">{children}</p>,
                                            strong: ({ children }) => (
                                                <strong className="font-semibold text-emerald-400">{children}</strong>
                                            ),
                                            ul: ({ children }) => (
                                                <ul className="list-disc pl-5 space-y-1 mb-2.5 text-slate-300">{children}</ul>
                                            ),
                                            ol: ({ children }) => (
                                                <ol className="list-decimal pl-5 space-y-1 mb-2.5 text-slate-300">{children}</ol>
                                            ),
                                            li: ({ children }) => <li className="pl-1">{children}</li>,
                                            code: ({ children }) => (
                                                <code className="bg-slate-950 text-indigo-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-800">
                                                    {children}
                                                </code>
                                            ),
                                            a: ({ href, children }) => (
                                                <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 font-medium"
                                                >
                                                    {children}
                                                </a>
                                            ),
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                </div>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 py-1 px-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
                </span>
                            )}
                        </div>
                    </div>
                ))}
                {errorMessage && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                        {errorMessage}
                    </div>
                )}
                <div ref={scrollAnchorRef} />
            </div>

            {/* Quick-Reply Suggestions */}
            {messages.length <= 1 && (
                <div className="flex flex-wrap gap-2 border-t border-slate-800/80 bg-slate-900/60 px-5 py-3">
                    {suggestedQuestions.map((question) => (
                        <button
                            key={question}
                            type="button"
                            onClick={() => void sendMessage(question)}
                            className="rounded-full border border-slate-700/80 bg-slate-800/60 px-3.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-indigo-500 hover:bg-slate-800 hover:text-indigo-300"
                        >
                            {question}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area — 10% Accent Focus (Indigo-600) */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 p-3">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about IT traineeships, automated testing stack, or architecture..."
                    disabled={isStreaming}
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-900/50 disabled:text-slate-600"
                />
                <button
                    type="submit"
                    disabled={isStreaming || input.trim().length === 0}
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
                >
                    {isStreaming ? "..." : "Send"}
                </button>
            </form>
        </div>
    );
}