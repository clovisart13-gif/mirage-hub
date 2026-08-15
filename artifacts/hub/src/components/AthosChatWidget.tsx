import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Brain, X, Send, Loader2, Minimize2, Maximize2 } from "lucide-react";
import MarkdownContent from "@/components/MarkdownContent";

const ADMIN_EMAIL = "clovisart13@gmail.com";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const QUICK = [
  "Status do Hub",
  "Listar workflows n8n",
  "Próximos passos",
];

export function AthosChatWidget() {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const [pulse, setPulse] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamContent]);

  if (!isAdmin) return null;

  const authHeader = () => ({ Authorization: `Bearer ${session?.access_token}` });

  async function sendMessage(text: string = input) {
    const msg = text.trim();
    if (!msg || isStreaming) return;
    setInput("");
    setIsStreaming(true);
    setStreamContent("");
    setMessages(prev => [...prev, { id: Date.now(), role: "user", content: msg }]);

    try {
      const res = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) { accumulated += data.content; setStreamContent(accumulated); }
            if (data.done) {
              setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", content: accumulated }]);
              setStreamContent("");
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { id: Date.now() + 2, role: "assistant", content: `❌ ${err.message}` }]);
      setStreamContent("");
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setPulse(false); }}
          className="fixed bottom-36 right-5 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-900/50 hover:scale-105 active:scale-95 transition-all"
        >
          <Brain className="w-6 h-6 text-white" />
          {pulse && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-400 border-2 border-background animate-ping" />
          )}
          {pulse && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-500 border-2 border-background" />
          )}
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div
          className={`fixed right-4 z-50 bg-[#111] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col transition-all duration-200 ${
            minimized ? "bottom-4 w-72 h-12" : "bottom-4 w-80 sm:w-96 h-[520px]"
          }`}
          style={{ maxHeight: "calc(100vh - 96px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">ATHOS_MENTOR</span>
              <span className="text-[10px] text-violet-400 border border-violet-500/30 rounded-full px-1.5 py-0.5">Admin</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(!minimized)} className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-colors">
                {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => setOpen(false)} className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Quick actions */}
              <div className="flex gap-1.5 px-3 py-2 overflow-x-auto flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {QUICK.map(q => (
                  <button key={q} onClick={() => sendMessage(q)} disabled={isStreaming}
                    className="flex-none text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-violet-500/40 transition-all disabled:opacity-40">
                    {q}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ scrollbarWidth: "none" }}>
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center pb-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-violet-400" />
                    </div>
                    <p className="text-xs text-white/35 max-w-[180px]">Pergunte sobre workflows, banco de dados, status do Hub ou próximos passos</p>
                  </div>
                )}

                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 flex-shrink-0 flex items-center justify-center mt-0.5">
                        <Brain className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                      msg.role === "user"
                        ? "bg-violet-600/20 border border-violet-500/25 text-white/90 rounded-tr-sm"
                        : "bg-white/5 border border-white/8 text-white/80 rounded-tl-sm"
                    }`}>
                      {msg.role === "assistant" ? (
                        <MarkdownContent content={msg.content} className="prose prose-invert max-w-none text-xs prose-p:my-0.5 prose-p:leading-relaxed prose-code:text-violet-300 prose-strong:text-white prose-headings:text-white prose-li:my-0" />
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isStreaming && streamContent && (
                  <div className="flex gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <Brain className="w-3 h-3 text-white" />
                    </div>
                    <div className="max-w-[85%] rounded-xl rounded-tl-sm px-3 py-2 bg-white/5 border border-white/8 text-xs text-white/80">
                      {/* Renderiza como texto durante streaming para evitar race condition de DOM com ReactMarkdown */}
                      <p className="whitespace-pre-wrap leading-relaxed">{streamContent}</p>
                      <span className="inline-block w-1 h-3 bg-violet-400 animate-pulse ml-0.5 rounded-sm" />
                    </div>
                  </div>
                )}

                {isStreaming && !streamContent && (
                  <div className="flex gap-2">
                    <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-600 to-indigo-600 flex-shrink-0 flex items-center justify-center">
                      <Brain className="w-3 h-3 text-white" />
                    </div>
                    <div className="rounded-xl rounded-tl-sm px-3 py-2.5 bg-white/5 border border-white/8">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-1 h-1 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-white/8">
                <div className="flex gap-2 items-end">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); }}}
                    placeholder="Pergunte ao ATHOS..."
                    disabled={isStreaming}
                    className="flex-1 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 transition-colors disabled:opacity-50"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || isStreaming}
                    className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-700 flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-colors"
                  >
                    {isStreaming ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
