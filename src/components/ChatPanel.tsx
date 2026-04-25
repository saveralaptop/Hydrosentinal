import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Is this water safe to drink?",
  "Can I use it for fishing?",
  "Why is the status what it is?",
];

export const ChatPanel = () => {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! Ask me anything about the current water reading." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ask", { body: { question: q } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((m) => [...m, { role: "assistant", content: data.answer ?? "(no response)" }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to get answer";
      toast.error(msg);
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
      setMessages((m) => [...m.slice(-30), messages[messages.length - 1]]); // keep last 30 messages
    } finally {
      setLoading(false);
    }
  };

  return (
    // <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-card">
    <div className="flex h-[500px] flex-col rounded-2xl border border-border bg-card shadow-card">
    
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Ask HydroSentinel</p>
          <p className="text-xs text-muted-foreground">Made by Nikhil kumar</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" ref={containerRef}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-border px-3 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about the water…"
          className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring/50 placeholder:text-muted-foreground focus:ring-2"
          maxLength={500}
        />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};
