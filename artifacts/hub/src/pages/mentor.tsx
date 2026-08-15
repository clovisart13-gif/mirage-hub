import { useState, useRef, useEffect, useCallback, memo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Send, Trash2, RefreshCw, Zap, ChevronRight, Bot, User,
  Loader2, AlertCircle, Settings, X, CheckCircle2, XCircle, Eye, EyeOff,
  ImageIcon, Paperclip, Mic, MicOff, Copy, Check, Smartphone,
} from "lucide-react";
import MarkdownContent from "@/components/MarkdownContent";

const ADMIN_EMAIL = "clovisart13@gmail.com";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  attachmentUrl?: string;
  messageType?: string;
  createdAt: string;
}

interface N8nConfig {
  n8n_base_url: string;
  n8n_api_key: string;
  instagram_access_token: string;
  meta_app_id: string;
  meta_app_secret: string;
  instagram_account_id: string;
  instagram_page_id: string;
  instagram_page_name: string;
  instagram_username: string;
}

const QUICK_ACTIONS = [
  { label: "Listar workflows n8n", message: "Liste todos os workflows disponíveis no n8n" },
  { label: "Tabelas Supabase", message: "Liste todas as tabelas do banco de dados Supabase" },
  { label: "Status do Hub", message: "Qual o estado atual do Mirage Hub? O que está pronto e o que falta?" },
  { label: "Arquivos Athos", message: "Liste os arquivos do repositório Athos Control Center" },
  { label: "Próximos passos", message: "Quais são os próximos passos mais críticos para o ecossistema Mirage?" },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Botão copiar completamente isolado — tem seu próprio estado, não re-renderiza MessageBubble ──
// Isso elimina o erro insertBefore: MessageBubble (que contém MarkdownContent) jamais
// re-renderiza por causa de um clique no botão copiar.
const CopyButton = memo(({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    function markCopied() {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(content).then(markCopied).catch(() => {
        fallback();
      });
    } else {
      fallback();
    }
    function fallback() {
      const el = document.createElement("textarea");
      el.value = content;
      el.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(el);
      el.focus();
      el.select();
      try { document.execCommand("copy"); markCopied(); } catch (_) {}
      document.body.removeChild(el);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`self-start flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all
        ${copied
          ? "text-green-300 bg-green-500/15 border-green-400/40"
          : "text-violet-300 bg-violet-500/15 border-violet-400/40 hover:bg-violet-500/25"
        }`}
      title="Copiar resposta"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
});

// ── Memoized message bubble — só re-renderiza se a msg mudar ─────────────────
const MessageBubble = memo(({ msg }: { msg: Message }) => {
  return (
    <div className={`group flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
        msg.role === "user" ? "bg-white/10" : "bg-gradient-to-br from-violet-600 to-indigo-600"
      }`}>
        {msg.role === "user" ? <User className="w-4 h-4 text-white/70" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className="flex flex-col gap-1 max-w-[80%]">
        <div className={`rounded-2xl px-4 py-3 text-sm ${
          msg.role === "user"
            ? "bg-violet-600/20 border border-violet-500/30 text-white/90 rounded-tr-sm"
            : "bg-white/5 border border-white/10 text-white/85 rounded-tl-sm"
        }`}>
          {(msg.imageUrl || msg.attachmentUrl) && (
            <img
              src={msg.imageUrl || msg.attachmentUrl}
              alt="Imagem anexada"
              className="max-w-xs max-h-64 rounded-lg mb-2 object-contain border border-white/10"
            />
          )}
          {msg.role === "assistant" ? (
            <MarkdownContent content={msg.content} className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 prose-code:text-violet-300 prose-headings:text-white prose-strong:text-white prose-a:text-violet-400 prose-table:text-white/80" />
          ) : (
            <p className="whitespace-pre-wrap">{msg.content !== "Analise esta imagem" ? msg.content : ""}</p>
          )}
          <div className="text-[10px] text-white/20 mt-1.5">
            {new Date(msg.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        {msg.role === "assistant" && <CopyButton content={msg.content} />}
      </div>
    </div>
  );
});

type StreamPhase = "thinking" | "executing" | "interpreting" | null;

const PHASE_LABELS: Record<NonNullable<StreamPhase>, string> = {
  thinking:     "Pensando…",
  executing:    "Executando ação",
  interpreting: "Interpretando resultado…",
};

const PHASE_COLORS: Record<NonNullable<StreamPhase>, string> = {
  thinking:     "text-violet-300",
  executing:    "text-amber-300",
  interpreting: "text-sky-300",
};

function ThinkingIndicator({ phase, action, elapsed }: { phase: StreamPhase; action: string | null; elapsed: number }) {
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  const label = phase === "executing" && action
    ? `Executando: ${action.replace(/_/g, " ")}`
    : phase ? PHASE_LABELS[phase] : "Processando…";
  const color = phase ? PHASE_COLORS[phase] : "text-white/40";

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white/5 border border-white/10 min-w-[200px]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 items-center">
            {[0, 1, 2].map(i => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${phase === "executing" ? "bg-amber-400" : phase === "interpreting" ? "bg-sky-400" : "bg-violet-400"} animate-bounce`} style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <span className={`text-xs font-medium ${color}`}>{label}</span>
        </div>
        <div className="text-[10px] text-white/25 mt-1.5 flex items-center gap-1">
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          {timeStr} aguardando resposta
        </div>
      </div>
    </div>
  );
}

// ── Memoized messages list — NÃO re-renderiza ao digitar no input ─────────────
const MessagesList = memo(({
  messages,
  isLoadingHistory,
  streamingContent,
  isStreaming,
  streamingPhase,
  streamingAction,
  elapsedSeconds,
  onQuickAction,
  onOpenSettings,
  n8nConfigured,
}: {
  messages: Message[];
  isLoadingHistory: boolean;
  streamingContent: string;
  isStreaming: boolean;
  streamingPhase: StreamPhase;
  streamingAction: string | null;
  elapsedSeconds: number;
  onQuickAction: (msg: string) => void;
  onOpenSettings: () => void;
  n8nConfigured: boolean;
}) => (
  <>
    {isLoadingHistory && (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-white/30" />
      </div>
    )}

    {!isLoadingHistory && messages.length === 0 && (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600/30 to-indigo-600/30 flex items-center justify-center border border-violet-500/20">
          <Brain className="w-8 h-8 text-violet-400" />
        </div>
        <div>
          <p className="text-white/70 font-medium">ATHOS_MENTOR está pronto</p>
          <p className="text-white/30 text-sm mt-1">Mentor estratégico do ecossistema Mirage + R2PB</p>
          <p className="text-white/20 text-xs mt-1 flex items-center justify-center gap-1">
            <ImageIcon className="w-3 h-3" />
            Cole ou arraste prints diretamente no chat
          </p>
        </div>
        {!n8nConfigured && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm hover:bg-amber-500/20 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configurar conexão com n8n para ver seus workflows
          </button>
        )}
        <div className="flex flex-col gap-2 w-full max-w-sm">
          {QUICK_ACTIONS.slice(0, 3).map((action) => (
            <button
              key={action.label}
              onClick={() => onQuickAction(action.message)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-violet-500/40 transition-all text-sm text-left"
            >
              <ChevronRight className="w-4 h-4 text-violet-400" />
              {action.message}
            </button>
          ))}
        </div>
      </div>
    )}

    {messages.map((msg) => (
      <MessageBubble key={msg.id} msg={msg} />
    ))}

    {isStreaming && streamingContent && (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-600 to-indigo-600">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-white/5 border border-white/10 text-white/85">
          {/* Texto simples durante streaming — evita race condition de DOM com ReactMarkdown */}
          <p className="whitespace-pre-wrap leading-relaxed text-white/85">{streamingContent}</p>
          <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse ml-0.5 rounded-sm" />
        </div>
      </div>
    )}

    {isStreaming && !streamingContent && (
      <ThinkingIndicator phase={streamingPhase} action={streamingAction} elapsed={elapsedSeconds} />
    )}

    {/* Quando está em fase de execução/interpretação mas já há conteúdo visível */}
    {isStreaming && streamingContent && (streamingPhase === "executing" || streamingPhase === "interpreting") && (
      <div className="flex items-center gap-2 pl-11 pb-1">
        <div className={`flex gap-1 items-center`}>
          {[0,1,2].map(i => (
            <span key={i} className={`w-1 h-1 rounded-full ${streamingPhase === "executing" ? "bg-amber-400" : "bg-sky-400"} animate-bounce`} style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <span className={`text-[11px] font-medium ${streamingPhase === "executing" ? "text-amber-300" : "text-sky-300"}`}>
          {streamingPhase === "executing" && streamingAction
            ? `Executando: ${streamingAction.replace(/_/g, " ")}`
            : "Interpretando resultado…"}
        </span>
        <span className="text-[10px] text-white/20 ml-1">{Math.floor(elapsedSeconds / 60) > 0 ? `${Math.floor(elapsedSeconds/60)}m ` : ""}{elapsedSeconds % 60}s</span>
      </div>
    )}
  </>
));

// ── Memoized chat input — isolado do resto da página ─────────────────────────
const ChatInput = memo(({
  isStreaming,
  pastedImage,
  onSend,
  onClearImage,
  onImageFile,
  onPaste,
  authToken,
}: {
  isStreaming: boolean;
  pastedImage: string | null;
  onSend: (text: string) => void;
  onClearImage: () => void;
  onImageFile: (file: File) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  authToken?: string;
}) => {
  const [localInput, setLocalInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(localInput);
      setLocalInput("");
    }
  }

  function handleSendClick() {
    onSend(localInput);
    setLocalInput("");
  }

  async function transcribeAudio(blob: Blob) {
    setIsTranscribing(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const res = await fetch("/api/mentor/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ mediaBase64: b64, mediaMime: blob.type }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { text } = await res.json() as { text: string };
      if (text) setLocalInput(prev => prev ? `${prev} ${text}` : text);
    } catch {
      // silently fail — user can type manually
    } finally {
      setIsTranscribing(false);
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          transcribeAudio(blob);
        };
        mr.start();
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      } catch {
        alert("Microfone não disponível. Verifique as permissões do navegador.");
      }
    }
  }

  const canSend = (localInput.trim() !== "" || pastedImage !== null) && !isStreaming && !isTranscribing;
  const micBusy = isRecording || isTranscribing;

  return (
    <div className="px-4 pb-4 pt-2 border-t border-white/10 bg-[#111]">
      <div className="max-w-4xl mx-auto space-y-2">
        {pastedImage && (
          <div className="relative inline-flex">
            <img
              src={pastedImage}
              alt="Imagem a enviar"
              className="max-h-36 max-w-xs rounded-xl object-contain border border-violet-500/40 bg-white/5"
            />
            <button
              onClick={onClearImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
            <div className="absolute bottom-1.5 left-1.5 text-[10px] text-white/60 bg-black/50 px-1.5 py-0.5 rounded-md">
              Pronta para enviar
            </div>
          </div>
        )}

        {isRecording && (
          <div className="flex items-center gap-2 text-xs text-red-400 px-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Gravando… {Math.floor(recordingTime / 60).toString().padStart(2, "0")}:{(recordingTime % 60).toString().padStart(2, "0")}
            <span className="text-white/30">— clique no microfone para parar</span>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0];
              if (file) onImageFile(file);
              e.target.value = "";
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isStreaming || micBusy}
            className="text-white/40 hover:text-violet-400 h-11 w-11 p-0 flex-shrink-0 rounded-xl border border-white/10 hover:border-violet-500/40"
            title="Anexar imagem"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleRecording}
            disabled={isStreaming || isTranscribing}
            className={`h-11 w-11 p-0 flex-shrink-0 rounded-xl border transition-colors ${
              isRecording
                ? "text-red-400 border-red-500/50 bg-red-500/10 hover:bg-red-500/20"
                : isTranscribing
                ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
                : "text-white/40 hover:text-violet-400 border-white/10 hover:border-violet-500/40"
            }`}
            title={isRecording ? "Parar gravação" : isTranscribing ? "Transcrevendo…" : "Gravar áudio"}
          >
            {isTranscribing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : isRecording
              ? <MicOff className="w-4 h-4" />
              : <Mic className="w-4 h-4" />}
          </Button>

          <Textarea
            value={localInput}
            onChange={e => setLocalInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
            placeholder={
              isRecording ? "Gravando… clique no microfone para parar"
              : isTranscribing ? "Transcrevendo áudio…"
              : pastedImage ? "Adicione um comentário ou envie só a imagem…"
              : "Fale com o ATHOS_MENTOR… Cole um print com Ctrl+V · arraste imagens · ou grave áudio"
            }
            rows={1}
            className="flex-1 min-h-[44px] max-h-32 resize-none bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-500/50 rounded-xl"
            disabled={isStreaming || isRecording || isTranscribing}
          />
          <Button
            onClick={handleSendClick}
            disabled={!canSend}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 w-11 p-0 flex-shrink-0"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        <p className="text-center text-[10px] text-white/20">
          Acesso exclusivo ao administrador Mirage · Cole prints com Ctrl+V · Arraste imagens · Grave áudio com o microfone
        </p>
      </div>
    </div>
  );
});

// ── Página principal ──────────────────────────────────────────────────────────
export default function MentorPage() {
  const { user, session } = useAuth();
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [pastedImage, setPastedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState<StreamPhase>(null);
  const [streamingAction, setStreamingAction] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [streamingContent, setStreamingContent] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const emptyConfig: N8nConfig = { n8n_base_url: "", n8n_api_key: "", instagram_access_token: "", meta_app_id: "", meta_app_secret: "", instagram_account_id: "", instagram_page_id: "", instagram_page_name: "", instagram_username: "" };
  const [config, setConfig] = useState<N8nConfig>(emptyConfig);
  const [editConfig, setEditConfig] = useState<N8nConfig>(emptyConfig);
  const [showKey, setShowKey] = useState(false);
  const [showInstagramToken, setShowInstagramToken] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [shortLivedToken, setShortLivedToken] = useState("");
  const [detectedAccounts, setDetectedAccounts] = useState<{ slug: string; username: string; account_id: string; page_name: string }[]>([]);
  const [tenantForm, setTenantForm] = useState({ slug: "", account_id: "", access_token: "", username: "", page_id: "" });
  const [isSavingTenant, setIsSavingTenant] = useState(false);
  const [tenantResult, setTenantResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedTenants, setSavedTenants] = useState<{ slug: string; account_id: string }[]>([]);
  const [lookupForm, setLookupForm] = useState({ slug: "", page_id: "" });
  const [isLooking, setIsLooking] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const [isSavingDirect, setIsSavingDirect] = useState(false);
  const [exchangeResult, setExchangeResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectResult, setDetectResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; count?: number; error?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) navigate("/hub");
  }, [user, isAdmin]);

  // ── Carrega histórico assim que o token estiver disponível ──────────────────
  const sessionTokenRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!session?.access_token) return;
    if (sessionTokenRef.current === session.access_token) return;
    sessionTokenRef.current = session.access_token;
    loadHistory();
    loadConfig();
  }, [session?.access_token]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, streamingContent]);

  const authHeader = useCallback(() => ({ Authorization: `Bearer ${session?.access_token}` }), [session]);

  // ── Polling: sincroniza mensagens do Mobile a cada 5s ───────────────────────
  const isStreamingRef = useRef(false);
  const lastMsgIdRef = useRef<number>(0);
  useEffect(() => { isStreamingRef.current = isStreaming; }, [isStreaming]);
  useEffect(() => {
    const id = setInterval(async () => {
      if (isStreamingRef.current) return;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) return;
        const sinceId = lastMsgIdRef.current;
        const url = sinceId > 0
          ? `/api/mentor/history?limit=100&since=${sinceId}`
          : "/api/mentor/history?limit=100";
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return;
        const data: Message[] = await res.json();
        if (data.length > 0) {
          lastMsgIdRef.current = data[data.length - 1].id;
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const fresh = data.filter(m => !existingIds.has(m.id));
            return fresh.length > 0 ? [...prev, ...fresh] : prev;
          });
        }
      } catch {}
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  async function loadHistory() {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/mentor/history?limit=100", { headers: authHeader() });
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);
        if (data.length > 0) lastMsgIdRef.current = data[data.length - 1].id;
      }
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function loadConfig() {
    try {
      const res = await fetch("/api/mentor/config", { headers: authHeader() });
      if (res.ok) {
        const data: N8nConfig = await res.json();
        setConfig(data);
        setEditConfig({ n8n_base_url: data.n8n_base_url, n8n_api_key: "", instagram_access_token: "", meta_app_id: data.meta_app_id, meta_app_secret: "", instagram_account_id: data.instagram_account_id, instagram_page_id: data.instagram_page_id, instagram_page_name: data.instagram_page_name, instagram_username: data.instagram_username });
      }
    } catch {}
  }

  async function saveConfig() {
    setIsSavingConfig(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/mentor/config", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(editConfig),
      });
      if (res.ok) {
        await loadConfig();
        setTestResult({ success: true, count: 0 });
      } else {
        setTestResult({ success: false, error: "Erro ao salvar configurações." });
      }
    } finally { setIsSavingConfig(false); }
  }

  async function loadTenants() {
    try {
      const res = await fetch("/api/mentor/config/tenant-instagram", { headers: authHeader() });
      if (res.ok) {
        const data = await res.json();
        setSavedTenants(data.tenants ?? []);
      }
    } catch {}
  }

  async function saveTenantInstagram() {
    if (!tenantForm.slug.trim() || !tenantForm.account_id.trim()) return;
    setIsSavingTenant(true);
    setTenantResult(null);
    try {
      const res = await fetch("/api/mentor/config/tenant-instagram", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify(tenantForm),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTenantResult({ success: true, message: `Tenant "${data.slug}" salvo! Chaves: ${data.saved.join(", ")}` });
        setTenantForm({ slug: "", account_id: "", access_token: "", username: "", page_id: "" });
        await loadTenants();
      } else {
        setTenantResult({ success: false, message: data.error ?? "Erro ao salvar." });
      }
    } catch (err: any) {
      setTenantResult({ success: false, message: err.message });
    } finally { setIsSavingTenant(false); }
  }

  async function lookupPageInstagram() {
    if (!lookupForm.slug.trim() || !lookupForm.page_id.trim()) return;
    setIsLooking(true);
    setLookupResult(null);
    try {
      const params = new URLSearchParams({ page_id: lookupForm.page_id.trim(), slug: lookupForm.slug.trim() });
      const res = await fetch(`/api/mentor/config/lookup-page-instagram?${params}`, { headers: authHeader() });
      const data = await res.json();
      if (res.ok && data.success) {
        setLookupResult({ success: true, message: `✅ Encontrado! @${data.username ?? "?"} · ID: ${data.account_id} · salvo como _${data.slug}` });
        setLookupForm({ slug: "", page_id: "" });
        await loadTenants();
      } else {
        setLookupResult({ success: false, message: data.error ?? "Erro desconhecido" });
      }
    } catch (err: any) {
      setLookupResult({ success: false, message: err.message });
    } finally { setIsLooking(false); }
  }

  async function detectInstagram() {
    setIsDetecting(true);
    setDetectResult(null);
    try {
      const res = await fetch("/api/mentor/config/detect-instagram", { headers: authHeader() });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.accounts && data.accounts.length > 0) {
          setDetectedAccounts(data.accounts);
          setDetectResult({ success: true, message: `${data.accounts.length} conta(s) detectada(s) e salvas com chaves por tenant.` });
        } else {
          const parts = [];
          if (data.page_name) parts.push(`Página: ${data.page_name}`);
          if (data.instagram_username) parts.push(`@${data.instagram_username}`);
          if (data.instagram_account_id) parts.push(`ID: ${data.instagram_account_id}`);
          const warn = data.warning ? ` ⚠️ ${data.warning}` : "";
          setDetectResult({ success: true, message: (parts.join(" · ") || "Detectado!") + warn });
        }
        await loadConfig();
      } else {
        setDetectResult({ success: false, message: data.error ?? "Erro desconhecido" });
      }
    } catch (err: any) {
      setDetectResult({ success: false, message: err.message });
    } finally { setIsDetecting(false); }
  }

  async function saveInstagramTokenDirect() {
    if (!shortLivedToken.trim()) return;
    setIsSavingDirect(true);
    setExchangeResult(null);
    try {
      const res = await fetch("/api/mentor/config/save-instagram-token", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ token: shortLivedToken.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExchangeResult({ success: true, message: `✓ Token salvo (…${shortLivedToken.trim().slice(-4)})` });
        setShortLivedToken("");
        await loadConfig();
      } else {
        setExchangeResult({ success: false, message: data.error ?? "Erro ao salvar" });
      }
    } catch (err: any) {
      setExchangeResult({ success: false, message: err.message });
    } finally { setIsSavingDirect(false); }
  }

  async function exchangeInstagramToken() {
    if (!shortLivedToken.trim()) return;
    setIsExchanging(true);
    setExchangeResult(null);
    try {
      const res = await fetch("/api/mentor/config/exchange-instagram-token", {
        method: "POST",
        headers: { ...authHeader(), "Content-Type": "application/json" },
        body: JSON.stringify({ short_token: shortLivedToken.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.accounts && data.accounts.length > 0) {
          setDetectedAccounts(data.accounts);
        }
        const msg = data.token_type === "page_never_expires"
          ? `Token permanente salvo! ${data.accounts?.length > 0 ? `${data.accounts.length} tenant(s) configurados automaticamente.` : `Página: ${data.page_name ?? ""}${data.instagram_username ? ` (@${data.instagram_username})` : ""} — não expira.`}`
          : data.warning
            ? `Token de ${data.expires_in_days} dias salvo (…${data.token_suffix}). Aviso: ${data.warning}`
            : `Token de ${data.expires_in_days} dias salvo! (…${data.token_suffix})`;
        setExchangeResult({ success: true, message: msg });
        setShortLivedToken("");
        await loadConfig();
      } else {
        setExchangeResult({ success: false, message: data.error ?? "Erro desconhecido" });
      }
    } catch (err: any) {
      setExchangeResult({ success: false, message: err.message });
    } finally { setIsExchanging(false); }
  }

  async function testN8n() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/mentor/config/test-n8n", { headers: authHeader() });
      setTestResult(await res.json());
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally { setIsTesting(false); }
  }

  async function clearHistory() {
    if (!confirm("Limpar todo o histórico?")) return;
    await fetch("/api/mentor/history", { method: "DELETE", headers: authHeader() });
    setMessages([]);
  }

  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    try {
      const reader = new FileReader();
      reader.onload = () => setPastedImage(reader.result as string);
      reader.readAsDataURL(file);
    } catch {}
  }, []);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const imageItem = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) await handleImageFile(file);
    }
  }, [handleImageFile]);

  const sendMessage = useCallback(async (text: string) => {
    const imageUrl = pastedImage ?? undefined;
    if (!text.trim() && !imageUrl) return;
    if (isStreaming) return;

    const userMessage = text.trim() || "Analise esta imagem";
    setPastedImage(null);
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingPhase("thinking");
    setStreamingAction(null);
    setElapsedSeconds(0);

    // Timer — incrementa a cada segundo enquanto processa
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000);

    setMessages(prev => [...prev, {
      id: Date.now(), role: "user", content: userMessage, imageUrl, createdAt: new Date().toISOString(),
    }]);

    try {
      const { data: freshSession } = await supabase.auth.getSession();
      const freshToken = freshSession.session?.access_token;
      const res = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${freshToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, imageUrl }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.phase) {
              setStreamingPhase(data.phase as StreamPhase);
              if (data.action) setStreamingAction(data.action);
              else setStreamingAction(null);
            }
            if (data.content) { accumulated += data.content; setStreamingContent(accumulated); }
            if (data.done) {
              setMessages(prev => [...prev, {
                id: Date.now() + 1, role: "assistant", content: accumulated, createdAt: new Date().toISOString(),
              }]);
              setStreamingContent("");
            }
            if (data.error) throw new Error(data.error);
          } catch {}
        }
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: Date.now() + 2, role: "assistant", content: `❌ Erro: ${err.message}`, createdAt: new Date().toISOString(),
      }]);
      setStreamingContent("");
    } finally {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setIsStreaming(false);
      setStreamingPhase(null);
      setStreamingAction(null);
    }
  }, [pastedImage, isStreaming, authHeader]);

  const openSettings = useCallback(() => { setShowSettings(true); loadConfig(); loadTenants(); }, []);

  const n8nConfigured = config.n8n_base_url && config.n8n_api_key;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-2">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-muted-foreground">Acesso restrito ao administrador Mirage.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen bg-[#0d0d0d] text-white"
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async e => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) await handleImageFile(file);
      }}
    >
      {dragOver && (
        <div className="fixed inset-0 z-50 bg-violet-600/20 border-2 border-violet-500 border-dashed flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <ImageIcon className="w-16 h-16 text-violet-400 mx-auto mb-3" />
            <p className="text-violet-300 text-xl font-semibold">Solte a imagem aqui</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#111]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold tracking-tight text-white">ATHOS_MENTOR</div>
            <div className="text-xs text-white/40">Mentor Cognitivo Estratégico</div>
          </div>
          <Badge variant="outline" className="ml-2 text-xs border-violet-500/40 text-violet-400 bg-violet-500/10">Admin</Badge>
          {n8nConfigured ? (
            <Badge variant="outline" className="text-xs border-green-500/40 text-green-400 bg-green-500/10">n8n conectado</Badge>
          ) : (
            <button onClick={openSettings} className="flex items-center gap-1.5 text-xs border border-amber-500/40 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full hover:bg-amber-500/20 transition-colors">
              <AlertCircle className="w-3 h-3" />
              Configurar n8n
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/athos-mobile/"
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir ATHOS no celular (mesma conversa)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-violet-300 bg-violet-500/10 border border-violet-400/30 hover:bg-violet-500/20 transition-colors"
          >
            <Smartphone className="w-3.5 h-3.5" />
            Mobile
          </a>
          <Button variant="ghost" size="sm" onClick={openSettings} className="text-white/50 hover:text-white"><Settings className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={loadHistory} disabled={isLoadingHistory} className="text-white/50 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-white/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-white/5 bg-[#111] scrollbar-hide">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => sendMessage(action.message)}
            disabled={isStreaming}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-violet-500/50 hover:bg-violet-500/10 transition-all disabled:opacity-40"
          >
            <Zap className="w-3 h-3" />
            {action.label}
          </button>
        ))}
      </div>

      {/* Messages — memoizado, não re-renderiza ao digitar */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <MessagesList
          messages={messages}
          isLoadingHistory={isLoadingHistory}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          streamingPhase={streamingPhase}
          streamingAction={streamingAction}
          elapsedSeconds={elapsedSeconds}
          onQuickAction={sendMessage}
          onOpenSettings={openSettings}
          n8nConfigured={!!n8nConfigured}
        />
      </div>

      {/* Input — memoizado com estado local */}
      <ChatInput
        isStreaming={isStreaming}
        pastedImage={pastedImage}
        onSend={sendMessage}
        onClearImage={() => setPastedImage(null)}
        onImageFile={handleImageFile}
        onPaste={handlePaste}
        authToken={session?.access_token}
      />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-violet-400" />
                <span className="font-semibold text-white">Configurações do ATHOS_MENTOR</span>
              </div>
              <button onClick={() => { setShowSettings(false); setTestResult(null); }} className="text-white/40 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* n8n */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                  <span className="text-sm font-medium text-white/80">Conexão com n8n (ATOS_EXECUTOR)</span>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-white/50">URL base do n8n</Label>
                  <Input value={editConfig.n8n_base_url} onChange={e => setEditConfig(p => ({ ...p, n8n_base_url: e.target.value }))} placeholder="https://seu-n8n.app.n8n.cloud" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-violet-500/50" />
                  <p className="text-[10px] text-white/30">Ex: https://n8n.seudominio.com ou https://xxx.app.n8n.cloud</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-white/50">API Key do n8n</Label>
                    {config.n8n_api_key && <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">✓ Salva</span>}
                  </div>
                  <div className="relative">
                    <Input type={showKey ? "text" : "password"} value={editConfig.n8n_api_key} onChange={e => setEditConfig(p => ({ ...p, n8n_api_key: e.target.value }))} placeholder={config.n8n_api_key ? "Deixe em branco para manter a chave atual" : "Cole sua API Key aqui"} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-500/50 pr-10" />
                    <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/30">No n8n: Settings → API → Create API Key</p>
                </div>
              </div>

              {/* Instagram / Meta */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-pink-400" />
                  <span className="text-sm font-medium text-white/80">Instagram / Meta</span>
                </div>

                {/* App ID */}
                <div className="space-y-1">
                  <Label className="text-xs text-white/50">App ID da Meta</Label>
                  <Input
                    value={editConfig.meta_app_id}
                    onChange={e => setEditConfig(p => ({ ...p, meta_app_id: e.target.value }))}
                    placeholder="123456789012345"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-500/50"
                  />
                </div>

                {/* App Secret */}
                <div className="space-y-1">
                  <Label className="text-xs text-white/50">App Secret da Meta</Label>
                  <div className="relative">
                    <Input
                      type={showAppSecret ? "text" : "password"}
                      value={editConfig.meta_app_secret}
                      onChange={e => setEditConfig(p => ({ ...p, meta_app_secret: e.target.value }))}
                      placeholder={config.meta_app_secret ? "Deixe em branco para manter" : "Cole o App Secret"}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-500/50 pr-10"
                    />
                    <button type="button" onClick={() => setShowAppSecret(!showAppSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                      {showAppSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-white/30">Meus Apps → MIRAGE HUB MARKETING → Configurações → Básico</p>
                </div>

                {/* Token status + renovação */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60 font-medium">Token ativo</span>
                    {config.instagram_access_token
                      ? <span className="text-[10px] text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full">✓ Salvo</span>
                      : <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Não configurado</span>
                    }
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-white/40 uppercase tracking-wide">Token de acesso Instagram</Label>
                    <Input
                      value={shortLivedToken}
                      onChange={e => { setShortLivedToken(e.target.value); setExchangeResult(null); }}
                      placeholder="Cole o token gerado no Explorador (EAAxx...)"
                      className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/25 focus-visible:ring-pink-500/50"
                    />
                    <Button
                      type="button"
                      onClick={saveInstagramTokenDirect}
                      disabled={isSavingDirect || !shortLivedToken.trim()}
                      className="w-full bg-pink-600 hover:bg-pink-700 text-white text-xs h-8"
                    >
                      {isSavingDirect ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      {isSavingDirect ? "Salvando…" : "Salvar token"}
                    </Button>
                    <Button
                      type="button"
                      onClick={exchangeInstagramToken}
                      disabled={isExchanging || !shortLivedToken.trim()}
                      variant="outline"
                      className="w-full border-pink-500/30 text-pink-300 hover:text-pink-200 hover:border-pink-400/50 text-xs h-7"
                    >
                      {isExchanging ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      {isExchanging ? "Convertendo…" : "Converter para 60 dias (precisa de App ID+Secret)"}
                    </Button>
                  </div>

                  {exchangeResult && (
                    <div className={`flex items-start gap-1.5 text-xs rounded p-2 ${exchangeResult.success ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                      {exchangeResult.success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                      <span>{exchangeResult.message}</span>
                    </div>
                  )}
                </div>

                {/* IDs manuais da conta (preenchidos automaticamente pelo exchange ou manualmente) */}
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-white/40 uppercase tracking-wide">IDs da conta Instagram</p>
                    <Button type="button" onClick={detectInstagram} disabled={isDetecting} className="h-6 px-2 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white">
                      {isDetecting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      {isDetecting ? "Detectando…" : "Detectar automaticamente"}
                    </Button>
                  </div>
                  {detectResult && (
                    <div className={`flex items-start gap-1.5 text-xs rounded p-2 ${detectResult.success ? "bg-indigo-500/10 text-indigo-300" : "bg-red-500/10 text-red-300"}`}>
                      {detectResult.success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                      <span>{detectResult.message}</span>
                    </div>
                  )}

                  {/* Lista de contas por tenant — aparece após detecção automática */}
                  {detectedAccounts.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-white/40 uppercase tracking-wide">Contas salvas por tenant</p>
                      {detectedAccounts.map(acc => (
                        <div key={acc.slug} className="flex items-center justify-between rounded bg-white/5 border border-white/10 px-2.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">_{acc.slug}</span>
                            <span className="text-xs text-white/70">@{acc.username}</span>
                          </div>
                          <span className="text-[10px] text-white/40 font-mono">{acc.account_id}</span>
                        </div>
                      ))}
                      <p className="text-[10px] text-white/30">Cada tenant usa exclusivamente a chave <code className="text-white/50">instagram_account_id_slug</code>. Para 50 tenants: basta conectar cada página ao app e clicar em Detectar.</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-white/40">Instagram Business Account ID</Label>
                      <Input
                        value={editConfig.instagram_account_id}
                        onChange={e => setEditConfig(p => ({ ...p, instagram_account_id: e.target.value }))}
                        placeholder="17841400..."
                        className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20 focus-visible:ring-violet-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-white/40">Facebook Page ID</Label>
                      <Input
                        value={editConfig.instagram_page_id}
                        onChange={e => setEditConfig(p => ({ ...p, instagram_page_id: e.target.value }))}
                        placeholder="123456789..."
                        className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20 focus-visible:ring-violet-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-white/40">Username Instagram</Label>
                      <Input
                        value={editConfig.instagram_username}
                        onChange={e => setEditConfig(p => ({ ...p, instagram_username: e.target.value }))}
                        placeholder="r2pbfabricaderoupas"
                        className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20 focus-visible:ring-violet-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-white/40">Nome da Página</Label>
                      <Input
                        value={editConfig.instagram_page_name}
                        onChange={e => setEditConfig(p => ({ ...p, instagram_page_name: e.target.value }))}
                        placeholder="R2PB Confecções"
                        className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/20 focus-visible:ring-violet-500/50"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/30">Se fez o exchange, esses campos são preenchidos automaticamente. Caso contrário, preencha manualmente: Business Manager → Configurações → Contas do Instagram.</p>
                </div>

                {/* ── Buscar Instagram de outro tenant pelo Page ID ── */}
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                    <p className="text-[11px] font-medium text-white/70">Adicionar tenant por Page ID</p>
                    <span className="text-[10px] text-white/30 ml-auto">mesmo admin, páginas diferentes</span>
                  </div>
                  <p className="text-[10px] text-white/40">Cole o ID da página Facebook do tenant e o slug do sistema. O Instagram vinculado é detectado automaticamente.</p>
                  <div className="flex gap-2">
                    <div className="space-y-1 w-24 shrink-0">
                      <Label className="text-[10px] text-white/40">Slug</Label>
                      <Input
                        value={lookupForm.slug}
                        onChange={e => setLookupForm(p => ({ ...p, slug: e.target.value }))}
                        placeholder="mirage"
                        className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/25 focus-visible:ring-orange-500/50"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <Label className="text-[10px] text-white/40">Facebook Page ID</Label>
                      <Input
                        value={lookupForm.page_id}
                        onChange={e => setLookupForm(p => ({ ...p, page_id: e.target.value }))}
                        placeholder="Cole o ID numérico da página (ex: 107543..."
                        className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/25 focus-visible:ring-orange-500/50"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={lookupPageInstagram}
                    disabled={isLooking || !lookupForm.slug.trim() || !lookupForm.page_id.trim()}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs h-8"
                  >
                    {isLooking ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {isLooking ? "Buscando…" : "Buscar Instagram e salvar"}
                  </Button>
                  {lookupResult && (
                    <div className={`flex items-start gap-1.5 text-xs rounded p-2 ${lookupResult.success ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                      {lookupResult.success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                      <span>{lookupResult.message}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-white/30">
                    Para achar o Page ID: acesse a página no Facebook → Sobre → ID da Página. Ou: Business Manager → Páginas → clique na página → URL contém o ID.
                  </p>
                </div>

                {/* ── Adicionar por Account ID manual ── */}
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <p className="text-[11px] font-medium text-white/70">Adicionar por Instagram Account ID</p>
                    <span className="text-[10px] text-white/30 ml-auto">override manual</span>
                  </div>
                  <p className="text-[10px] text-white/40">
                    Se a detecção automática falhar, obtenha o Account ID numérico do Instagram em{" "}
                    <a href="https://commentpicker.com/instagram-id.php" target="_blank" rel="noreferrer" className="text-cyan-400 underline">commentpicker.com/instagram-id.php</a>{" "}
                    e cole abaixo. O token de usuário já salvo será usado automaticamente.
                  </p>
                  <div className="flex gap-2">
                    <div className="space-y-1 w-24 shrink-0">
                      <Label className="text-[10px] text-white/40">Slug</Label>
                      <Input
                        value={tenantForm.slug}
                        onChange={e => setTenantForm(p => ({ ...p, slug: e.target.value }))}
                        placeholder="mirage"
                        className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/25 focus-visible:ring-cyan-500/50"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <Label className="text-[10px] text-white/40">Instagram Account ID</Label>
                      <Input
                        value={tenantForm.account_id}
                        onChange={e => setTenantForm(p => ({ ...p, account_id: e.target.value }))}
                        placeholder="17841400000000000 (numérico)"
                        className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/25 focus-visible:ring-cyan-500/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-white/40">Username (opcional)</Label>
                    <Input
                      value={tenantForm.username}
                      onChange={e => setTenantForm(p => ({ ...p, username: e.target.value }))}
                      placeholder="gestaomirage"
                      className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/25 focus-visible:ring-cyan-500/50"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={saveTenantInstagram}
                    disabled={isSavingTenant || !tenantForm.slug.trim() || !tenantForm.account_id.trim()}
                    className="w-full bg-cyan-700 hover:bg-cyan-800 text-white text-xs h-8"
                  >
                    {isSavingTenant ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    {isSavingTenant ? "Salvando…" : "Salvar Account ID"}
                  </Button>
                  {tenantResult && (
                    <div className={`flex items-start gap-1.5 text-xs rounded p-2 ${tenantResult.success ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}>
                      {tenantResult.success ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                      <span>{tenantResult.message}</span>
                    </div>
                  )}
                </div>

                {/* ── Tenants configurados ── */}
                {savedTenants.length > 0 && (
                  <div className="space-y-1.5 border-t border-white/10 pt-3">
                    <p className="text-[10px] text-white/40 uppercase tracking-wide">Tenants com Instagram configurado</p>
                    {savedTenants.map(t => (
                      <div key={t.slug} className="flex items-center justify-between rounded bg-white/5 border border-white/10 px-2.5 py-1.5">
                        <span className="font-mono text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded">_{t.slug}</span>
                        <span className="text-[10px] text-white/40 font-mono">{t.account_id}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {testResult && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${testResult.success ? "bg-green-500/10 border border-green-500/20 text-green-300" : "bg-red-500/10 border border-red-500/20 text-red-300"}`}>
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                  <span>{testResult.success ? `✅ Conectado! ${testResult.count} workflow${testResult.count !== 1 ? "s" : ""} encontrado${testResult.count !== 1 ? "s" : ""}.` : `❌ ${testResult.error}`}</span>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button onClick={saveConfig} disabled={isSavingConfig} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white">
                  {isSavingConfig ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
                <Button onClick={testN8n} disabled={isTesting} variant="outline" className="border-white/20 text-white/70 hover:text-white hover:border-white/40">
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Testar n8n"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
