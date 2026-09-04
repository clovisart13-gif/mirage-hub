import { useEffect, useRef, useState, useLayoutEffect, memo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import {
  Brain, LogOut, Send, Paperclip, Mic, MicOff, Copy, Check, X, Image as ImageIcon,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  imageUrl?: string;
};

// ── Markdown isolado do React (evita insertBefore) ─────────────────────────
function MarkdownMessage({ content }: { content: string }) {
  const mdRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mdRef.current) return;
    const html = DOMPurify.sanitize(marked.parse(content) as string);
    mdRef.current.innerHTML = html;
  }, [content]);
  return (
    <div
      ref={mdRef}
      className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-pre:p-3 prose-pre:rounded-lg prose-a:text-violet-400 prose-code:text-violet-300 prose-ul:my-1 prose-ol:my-1"
    />
  );
}

// ── Botão copiar isolado — estado próprio, não re-renderiza o pai ──────────
const CopyButton = memo(({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    function markCopied() {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(content).then(markCopied).catch(fallback);
    } else {
      fallback();
    }
    function fallback() {
      const el = document.createElement('textarea');
      el.value = content;
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      try { document.execCommand('copy'); markCopied(); } catch (_) {}
      document.body.removeChild(el);
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all active:scale-95
        ${copied
          ? 'text-green-300 bg-green-500/15 border-green-400/30'
          : 'text-violet-300 bg-violet-500/10 border-violet-400/30 active:bg-violet-500/20'
        }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
});
CopyButton.displayName = 'CopyButton';

// ── Helper: file → base64 ──────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function Chat() {
  const { isAuthenticated, session, signOut } = useAuth();
  const [, setLocation] = useLocation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // Imagem/vídeo anexado
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gravação de áudio
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Redirect se não autenticado
  useEffect(() => {
    if (!isAuthenticated) setLocation('/');
  }, [isAuthenticated, setLocation]);

  // Carregar histórico
  useEffect(() => {
    if (!session?.access_token) return;
    fetch('/api/mentor/history', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: Message[]) => setMessages(data))
      .catch(() => {});
  }, [session?.access_token]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, isStreaming]);

  // Auto-resize textarea
  useLayoutEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 72)}px`;
  }, [input]);

  // Selecionar arquivo
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const preview = await fileToBase64(file);
    setSelectedPreview(preview);
    e.target.value = '';
  }

  function clearFile() {
    setSelectedFile(null);
    setSelectedPreview(null);
  }

  // Gravação de áudio
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
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          transcribeAudio(blob);
        };
        mr.start();
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
      } catch {
        alert('Microfone não disponível. Verifique as permissões.');
      }
    }
  }

  async function transcribeAudio(blob: Blob) {
    if (!session?.access_token) return;
    setIsTranscribing(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const res = await fetch('/api/mentor/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ mediaBase64: b64, mediaMime: blob.type }),
      });
      if (res.ok) {
        const { text } = await res.json() as { text: string };
        if (text) setInput(prev => prev ? `${prev} ${text}` : text);
      }
    } catch {}
    finally { setIsTranscribing(false); }
  }

  // Enviar mensagem
  async function handleSend() {
    const text = input.trim();
    const hasFile = !!selectedFile;
    if ((!text && !hasFile) || !session?.access_token || isStreaming) return;

    // Preparar base64 da imagem se houver
    let imageBase64: string | undefined;
    let imagePreviewUrl: string | undefined;
    if (selectedFile) {
      imageBase64 = await fileToBase64(selectedFile);
      imagePreviewUrl = imageBase64;
    }

    setInput('');
    clearFile();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text || (hasFile ? '📎 Arquivo enviado' : ''),
      created_at: new Date().toISOString(),
      imageUrl: imagePreviewUrl,
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingText('');
    let fullResponse = '';

    try {
      const body: Record<string, unknown> = { message: text || 'Analise este arquivo' };
      if (imageBase64) body.imageBase64 = imageBase64;

      const response = await fetch('/api/mentor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('API Error');

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data) as { content?: string };
                if (parsed.content) {
                  fullResponse += parsed.content;
                  setStreamingText(fullResponse);
                }
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
      if (fullResponse) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullResponse,
          created_at: new Date().toISOString(),
        }]);
      }
      setStreamingText('');
    }
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Agora';
    return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const canSend = (input.trim() !== '' || !!selectedFile) && !isStreaming && !isTranscribing;
  const micBusy = isRecording || isTranscribing;

  return (
    <div className="flex flex-col h-full bg-background w-full">
      {/* Arquivo input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple={false}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header fixo */}
      <header className="flex-none pt-[env(safe-area-inset-top)] bg-background/95 backdrop-blur-md border-b border-border/40 sticky top-0 z-10">
        <div className="h-14 flex items-center justify-between px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-sm">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground text-sm tracking-wide leading-tight">ATHOS</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Assistente Mirage</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground active:text-foreground active:scale-95 transition-all"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Área de mensagens */}
      <main className="flex-1 overflow-y-auto px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-4 space-y-4 overscroll-contain">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-600/30 to-indigo-600/30 flex items-center justify-center border border-violet-500/20">
              <Brain className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-white/50 text-sm">ATHOS está pronto para te ajudar</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end ml-8' : 'items-start mr-8'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-1.5 mb-1 ml-1">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
                  <Brain className="w-3 h-3 text-white" />
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">ATHOS</span>
              </div>
            )}

            <div className={`px-4 py-3 rounded-2xl text-sm ${
              msg.role === 'user'
                ? 'bg-violet-600/25 text-white rounded-tr-sm'
                : 'bg-white/5 border border-white/8 text-gray-100 rounded-tl-sm'
            }`}>
              {msg.imageUrl && (
                <img
                  src={msg.imageUrl}
                  alt="Anexo"
                  className="max-w-full max-h-52 rounded-xl mb-2 object-contain border border-white/10"
                />
              )}
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              ) : (
                <MarkdownMessage content={msg.content} />
              )}
            </div>

            <div className={`flex items-center gap-2 mt-1 ${msg.role === 'user' ? 'mr-1' : 'ml-1'}`}>
              <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
              {msg.role === 'assistant' && <CopyButton content={msg.content} />}
            </div>
          </div>
        ))}

        {/* Streaming */}
        {isStreaming && (
          <div className="flex flex-col items-start mr-8">
            <div className="flex items-center gap-1.5 mb-1 ml-1">
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center">
                <Brain className="w-3 h-3 text-white" />
              </div>
              <span className="text-[11px] text-muted-foreground font-medium">ATHOS</span>
            </div>
            <div className="px-4 py-3 bg-white/5 border border-white/8 text-gray-100 rounded-2xl rounded-tl-sm">
              {streamingText ? (
                <>
                  <p className="whitespace-pre-wrap break-words text-sm">{streamingText}</p>
                  <span className="inline-block w-1.5 h-4 bg-violet-400 animate-pulse ml-0.5 rounded-sm align-middle" />
                </>
              ) : (
                <div className="flex gap-1 items-center h-5">
                  {[0, 150, 300].map(delay => (
                    <div
                      key={delay}
                      className="w-2 h-2 bg-violet-400/60 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} className="h-2" />
      </main>

      {/* Input fixo no rodapé */}
      <footer className="flex-none bg-background border-t border-border/40 pb-[env(safe-area-inset-bottom)]">
        <div className="p-3 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] space-y-2">
          {/* Preview do arquivo selecionado */}
          {selectedPreview && (
            <div className="relative inline-flex">
              {selectedFile?.type.startsWith('video/') ? (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                  <ImageIcon className="w-4 h-4 text-violet-400" />
                  <span className="text-xs text-white/70 truncate max-w-[160px]">{selectedFile.name}</span>
                </div>
              ) : (
                <img
                  src={selectedPreview}
                  alt="Preview"
                  className="max-h-28 max-w-[200px] rounded-xl object-contain border border-violet-500/30"
                />
              )}
              <button
                onClick={clearFile}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-md"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          )}

          {/* Indicador de gravação */}
          {isRecording && (
            <div className="flex items-center gap-2 text-xs text-red-400 px-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Gravando… {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
            </div>
          )}
          {isTranscribing && (
            <div className="flex items-center gap-2 text-xs text-violet-400 px-1">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
              Transcrevendo…
            </div>
          )}

          {/* Barra de input */}
          <div className="flex items-end gap-2">
            {/* Botão anexar */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isStreaming}
              className="flex-none w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground active:scale-90 active:bg-white/10 transition-all disabled:opacity-40"
            >
              <Paperclip className="w-4.5 h-4.5" />
            </button>

            {/* Textarea */}
            <div className="flex-1 flex items-end gap-2 bg-input/40 border border-border/50 rounded-2xl px-3 py-1 focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary/40 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Mensagem..."
                disabled={isStreaming || micBusy}
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none py-2 text-[15px] leading-relaxed disabled:opacity-50 min-h-[40px]"
                rows={1}
              />
            </div>

            {/* Botão microfone */}
            <button
              onClick={toggleRecording}
              disabled={isStreaming || isTranscribing}
              className={`flex-none w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 ${
                isRecording
                  ? 'bg-red-500 text-white'
                  : 'bg-white/5 border border-white/10 text-muted-foreground active:bg-white/10'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Botão enviar */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex-none w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40 disabled:scale-100 shadow-sm"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
