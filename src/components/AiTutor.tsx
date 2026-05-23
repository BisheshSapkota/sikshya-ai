import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
} from "react";
import {
  ArrowUp,
  FileText,
  Image as ImageIcon,
  Loader2,
  Menu,
  Paperclip,
  SquarePen,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  MAX_USER_MESSAGE_CHARS,
  WARN_USER_MESSAGE_CHARS,
  clampUserInput,
} from "../lib/chatLimits";
import {
  ACCEPTED_MIME,
  MAX_ATTACHMENTS,
  filesToAttachments,
  type PendingAttachment,
} from "../lib/fileUpload";
import { askGemini } from "../lib/geminiChat";

type DisplayAttachment = {
  id: string;
  name: string;
  previewUrl?: string;
  mimeType: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: DisplayAttachment[];
};

type AiTutorProps = {
  onMenuClick?: () => void;
  onNewChat?: () => void;
};

const SUGGESTIONS = [
  "Explain this SEE science question step by step",
  "Grade my 2-mark answer (I'll paste it)",
  "Solve the math in my uploaded photo",
  "Roman Nepali ma Force chapter summarize garidin",
];

function AssistantMarkdown({ text }: { text: string }) {
  const blocks: { label: string; body: string }[] = [];
  const regex =
    /^(Score out of \d+:|Strengths:|Weaknesses:|Model Answer:)([\s\S]*?)(?=^Score out of \d+:|^Strengths:|^Weaknesses:|^Model Answer:|$)/gim;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    blocks.push({ label: match[1].trim(), body: match[2].trim() });
  }

  if (blocks.length > 0) {
    return (
      <div className="space-y-3">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
          >
            <p className="mb-1 text-xs font-semibold uppercase text-slate-600">
              {b.label.replace(/:$/, "")}
            </p>
            <div className="prose prose-sm max-w-none text-slate-800">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {b.body}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

const AiTutor: FC<AiTutorProps> = ({ onMenuClick, onNewChat }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = input.length;
  const atLimit = charCount >= MAX_USER_MESSAGE_CHARS;
  const nearLimit = charCount >= WARN_USER_MESSAGE_CHARS;
  const hasContent = input.trim().length > 0 || pendingFiles.length > 0;
  const showEmpty = messages.length === 0 && !busy;

  // Auto scroll
  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy, pendingFiles]);

  // Autosize textarea height
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const removeFile = (id: string) => {
    setPendingFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  const onPickFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setFileError(null);
    const room = MAX_ATTACHMENTS - pendingFiles.length;
    if (room <= 0) {
      setFileError(`Max ${MAX_ATTACHMENTS} files per message.`);
      return;
    }
    const slice = Array.from(list).slice(0, room);
    const { ok, errors } = await filesToAttachments(slice);
    if (errors.length) {
      setFileError(errors.map((e) => `${e.name}: ${e.reason}`).join(" "));
    }
    if (ok.length) setPendingFiles((prev) => [...prev, ...ok]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Only allow send on explicit form submit or Enter keypress, never on input change
  const send = useCallback(async () => {
    const trimmed = clampUserInput(input.trim());
    // Prevent double sends or empty message
    if (busy || (!trimmed && pendingFiles.length === 0)) return;

    // Clean up: Only pass a single message string and relevant files—not large/history arrays!
    // So, for the model call, only use 'trimmed' (the message) and files to upload, nothing else.

    const displayAttachments: DisplayAttachment[] = pendingFiles.map((f) => ({
      id: f.id,
      name: f.name,
      previewUrl: f.previewUrl,
      mimeType: f.mimeType,
    }));

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed || "(See attached files)",
      attachments: displayAttachments.length ? displayAttachments : undefined,
    };

    const filesToSend = [...pendingFiles];
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPendingFiles([]);
    setFileError(null);
    setSubmitError(null);
    setBusy(true);

    // Optional: If there are arrays/messages you want cleared before firing async API, do so here.
    // We clear pendingFiles, and the input, so nothing large/left-over is inside the payload.

    try {
      // ONLY send a single message string (and, if needed, attachments)
      const reply = await askGemini({
        userText: trimmed,
        attachments: filesToSend,
        history: [], // Explicitly set history to empty array. Integrate with messages if needed for multi-turn mem.
      });
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: reply },
      ]);
    } catch (err: any) {
      let code = typeof err === "object" && err && "message" in err ? err.message : "";
      let text =
        "Something went wrong. Try a shorter message or smaller file.";
      if (code === "MISSING_API_KEY") {
        text = "Add `VITE_GEMINI_API_KEY` to `.env` and restart the dev server.";
      } else if (code === "EMPTY") {
        text = "Type a message or attach a file.";
      } else if (
        code?.toString().includes("429") ||
        (err && typeof err === "object" && "status" in err && err.status === 429)
      ) {
        text = "Too many requests! Please wait a moment and try again.";
      } else if (
        code?.includes("Request payload size exceeds the limit") ||
        code?.includes("413") // 413 Payload Too Large HTTP error
      ) {
        text =
          "Your message or files are too large. Please shorten your message or upload smaller files.";
      }
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: text },
      ]);
      setSubmitError(text);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [input, pendingFiles, busy]);

  const acceptTypes = ACCEPTED_MIME.join(",");

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-[#f4f4f5]">
      {/* Top bar — ChatGPT style */}
      <header className="flex shrink-0 items-center gap-2 border-b border-slate-200/80 bg-[#f4f4f5] px-3 py-2.5">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-200/80 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onMenuClick}
          className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-200/80 lg:inline-flex"
          aria-label="Toggle CDC grid"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-sm font-semibold text-slate-800">
          Sikshya AI
        </h1>
        <button
          type="button"
          onClick={onNewChat}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-200/80"
          aria-label="New chat"
        >
          <SquarePen className="h-5 w-5" />
        </button>
      </header>

      {/* Messages */}
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {showEmpty ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
            <h2 className="text-2xl font-semibold text-slate-800">
              What are you studying today?
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">
              One chat for every class and subject. Upload a photo of your
              question, a PDF, or paste text — I&apos;ll read it and help fast.
            </p>
            <div className="mt-8 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setInput(s.slice(0, MAX_USER_MESSAGE_CHARS))}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-xs text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl px-4 py-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`mb-8 ${m.role === "user" ? "" : ""}`}
              >
                {m.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] space-y-2">
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="flex flex-wrap justify-end gap-2">
                          {m.attachments.map((a) => (
                            <div
                              key={a.id}
                              className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                            >
                              {a.previewUrl ? (
                                <img
                                  src={a.previewUrl}
                                  alt={a.name}
                                  className="max-h-40 max-w-[200px] object-cover"
                                />
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600">
                                  {a.mimeType === "application/pdf" ? (
                                    <FileText className="h-4 w-4 text-red-500" />
                                  ) : (
                                    <FileText className="h-4 w-4" />
                                  )}
                                  <span className="max-w-[140px] truncate">
                                    {a.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {m.content !== "(See attached files)" && (
                        <div className="rounded-3xl bg-[#e8e8ea] px-4 py-2.5 text-[15px] text-slate-900">
                          <span className="whitespace-pre-wrap break-words">
                            {m.content}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      S
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <AssistantMarkdown text={m.content} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="mb-8 flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  S
                </div>
                <TypingIndicator />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer — Gemini / ChatGPT style */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="mx-auto w-full max-w-3xl">
          {fileError && (
            <p className="mb-2 text-center text-xs text-red-600">{fileError}</p>
          )}
          {submitError && (
            <p className="mb-2 text-center text-xs text-red-600">{submitError}</p>
          )}

          {pendingFiles.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingFiles.map((f) => (
                <div
                  key={f.id}
                  className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-white pr-8 shadow-sm"
                >
                  {f.previewUrl ? (
                    <img
                      src={f.previewUrl}
                      alt=""
                      className="h-14 w-14 rounded-l-lg object-cover"
                    />
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-2 text-xs text-slate-600">
                      {f.mimeType.startsWith("image/") ? (
                        <ImageIcon className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4 text-red-500" />
                      )}
                      <span className="max-w-[100px] truncate">{f.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(f.id)}
                    className="absolute right-1 top-1 rounded-full bg-slate-200 p-0.5 hover:bg-slate-300"
                    aria-label={`Remove ${f.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || !hasContent) return;
              await send();
            }}
            className="flex items-end gap-2 rounded-[26px] border border-slate-200 bg-white px-2 py-2 shadow-md focus-within:border-slate-300 focus-within:shadow-lg"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
              multiple
              className="hidden"
              onChange={(e) => void onPickFiles(e.target.files)}
              disabled={busy}
            />
            <button
              type="button"
              disabled={busy || pendingFiles.length >= MAX_ATTACHMENTS}
              onClick={() => {
                if (!busy) fileInputRef.current?.click();
              }}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-40"
              aria-label="Attach file"
              title="JPG, PNG, PDF, TXT (max 4 MB each)"
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(clampUserInput(e.target.value));
              }}
              onKeyDown={async (e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  !busy &&
                  hasContent
                ) {
                  e.preventDefault();
                  await send();
                }
              }}
              rows={1}
              disabled={busy}
              placeholder={busy ? "Sikshya AI is calculating..." : "Message Sikshya AI…"}
              className="max-h-40 min-h-[24px] flex-1 resize-none border-0 bg-transparent py-2 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
              aria-label="Message"
            />

            <button
              type="submit"
              disabled={busy || !hasContent}
              className="mb-0.5 flex h-9 w-24 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400"
              aria-label="Send"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="truncate text-xs">Sikshya AI is calculating...</span>
                </>
              ) : (
                <>
                  <ArrowUp className="h-5 w-5" />
                  <span className="ml-2 text-xs font-medium">Submit</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-2 text-center text-[10px] text-slate-400">
            Attach up to {MAX_ATTACHMENTS} files (photo, PDF, txt) ·{" "}
            <span
              className={
                atLimit
                  ? "text-red-500"
                  : nearLimit
                    ? "text-amber-600"
                    : ""
              }
            >
              {charCount}/{MAX_USER_MESSAGE_CHARS}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiTutor;
