"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const FALLBACK_EXAMPLES = [
  "북한 과학기술법이 뭐야?",
  "소프트웨어 저작권 관련 법은?",
  "북한 형벌 체계는?",
];

interface Source { law_name?: string; article?: string; }
interface Msg {
  role: "user" | "assistant";
  text: string;
  sources: Source[];
  status: string;
}

export default function ChatWidget() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [displayText, setDisplayText] = useState("");
  const [input, setInput] = useState("");
  const [llm, setLlm] = useState("gemini");
  const [sid, setSid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toolStatus, setToolStatus] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [examplesLoaded, setExamplesLoaded] = useState(false);

  const textRef = useRef("");
  const rafId = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 추천 질문 동적 로딩
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/chat/suggestions`)
      .then(r => r.json())
      .then(d => { setExamples(d.questions?.length ? d.questions : FALLBACK_EXAMPLES); })
      .catch(() => { setExamples(FALLBACK_EXAMPLES); })
      .finally(() => { setExamplesLoaded(true); });
  }, []);

  // 스크롤 하단 유지
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, displayText]);

  // RAF 기반 디스플레이 업데이트 — 프레임당 최대 1회 렌더
  function scheduleTextUpdate() {
    if (rafId.current) return;
    rafId.current = requestAnimationFrame(() => {
      setDisplayText(textRef.current);
      rafId.current = 0;
    });
  }

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setInput("");
    // textarea 높이 초기화
    if (inputRef.current) inputRef.current.style.height = "auto";
    textRef.current = "";
    setDisplayText("");
    setToolStatus("💭 생각 중...");

    setMsgs((p) => [...p, { role: "user", text, sources: [], status: "" }]);

    let allSources: Source[] = [];

    try {
      const res = await fetch(`${API_BASE}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sid, llm }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += dec.decode(value, { stream: true });
        const blocks = buf.split("\n\n");
        buf = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;
          let etype = "", edata = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event: ")) etype = line.slice(7).trim();
            else if (line.startsWith("data: ")) edata = line.slice(6);
          }
          if (!edata) continue;
          let d: any;
          try { d = JSON.parse(edata); } catch { continue; }

          if (etype === "session" && d.session_id) {
            setSid(d.session_id);
          } else if (etype === "token") {
            textRef.current += d.text || "";
            setToolStatus("");
            scheduleTextUpdate();
          } else if (etype === "thinking") {
            // 에이전트 사고 과정 — 간략한 상태로 표시
            setToolStatus(`💭 ${(d.text || "분석 중...").slice(0, 60)}...`);
          } else if (etype === "tool_call") {
            const names: Record<string,string> = {
              search_laws: "법령 검색", get_article: "조문 조회",
              search_articles: "조문 내용 검색",
              compare_laws: "남북법 비교", lookup_term: "용어 조회",
            };
            const step = d.step ? `(${d.step})` : "";
            setToolStatus(`🔍 ${names[d.name] || d.name} ${step}`);
          } else if (etype === "tool_result") {
            setToolStatus("");
          } else if (etype === "validation") {
            // 인용 검증 결과
            const inv = d.invalid || [];
            if (inv.length > 0) {
              textRef.current += `\n\n> *인용 검증: ${inv.join(", ")} 확인 불가*`;
              scheduleTextUpdate();
            }
          } else if (etype === "done") {
            if (d.sources) {
              for (const s of d.sources) {
                if (s.law_name && !allSources.some((x) => x.law_name === s.law_name))
                  allSources.push(s);
              }
            }
          } else if (etype === "error") {
            textRef.current = `⚠️ ${d.message || "오류가 발생했습니다."}`;
            scheduleTextUpdate();
          }
        }
      }
    } catch {
      if (!textRef.current) textRef.current = "⚠️ 서버 연결에 실패했습니다.";
    } finally {
      // 어떤 경우든 반드시 실행 — busy 해제 + 최종 메시지 저장
      cancelAnimationFrame(rafId.current);
      rafId.current = 0;
      const finalText = textRef.current;
      if (finalText) {
        setMsgs((p) => [...p, { role: "assistant", text: finalText, sources: allSources, status: "" }]);
      }
      setDisplayText("");
      setToolStatus("");
      textRef.current = "";
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* 상단 바 */}
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", background: "#fff", padding: "8px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#666" }}>모델:</span>
          <select value={llm} onChange={(e) => setLlm(e.target.value)} disabled={busy}
            style={{ border: "1px solid #d1d5db", borderRadius: 4, padding: "3px 8px", fontSize: 13 }}>
            <option value="gemini">Gemini</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude</option>
          </select>
        </div>
        <button onClick={() => { setMsgs([]); setSid(null); setDisplayText(""); textRef.current = ""; }}
          disabled={busy || msgs.length === 0}
          style={{ fontSize: 13, color: "#666", cursor: "pointer", padding: "3px 12px", border: "none", background: "transparent" }}>
          초기화
        </button>
      </div>

      {/* 메시지 영역 */}
      <div ref={scrollRef} style={{ flex: "1 1 0", overflowY: "auto", padding: 16, minHeight: 0 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {msgs.length === 0 && !busy ? (
            <div style={{ textAlign: "center", paddingTop: 80 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>⚖️</div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>북한법 AI 상담</h2>
              <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 32 }}>북한 법령에 대해 궁금한 것을 질문해 보세요.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, margin: "0 auto", minHeight: 140 }}>
                {examplesLoaded ? examples.map((q) => (
                  <button key={q} onClick={() => send(q)}
                    style={{ textAlign: "left", padding: "12px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 14, cursor: "pointer" }}>
                    {q}
                  </button>
                )) : null}
              </div>
            </div>
          ) : (
            <>
              {msgs.map((m, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "85%", padding: "12px 16px", borderRadius: 16, fontSize: 14, lineHeight: 1.7,
                      ...(m.role === "user"
                        ? { background: "#2b6cb0", color: "#fff", whiteSpace: "pre-wrap" as const }
                        : { background: "#fff", border: "1px solid #e5e7eb" }),
                    }}>
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none prose-p:my-1 prose-li:my-0.5 prose-strong:text-gray-900">
                          <ReactMarkdown>{m.text}</ReactMarkdown>
                        </div>
                      ) : m.text}
                    </div>
                  </div>
                  {/* 출처 */}
                  {m.sources.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {m.sources.map((s, j) => s.law_name && (
                        <Link key={j} href={`/law/${encodeURIComponent(s.law_name)}`}
                          style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #bfdbfe", background: "#eff6ff", fontSize: 12, color: "#1d4ed8", textDecoration: "none" }}>
                          📖 {s.law_name}{s.article ? ` 제${s.article}조` : ""}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* 스트리밍 중인 AI 응답 */}
              {busy && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{ maxWidth: "85%", padding: "12px 16px", borderRadius: 16, fontSize: 14, lineHeight: 1.7, background: "#fff", border: "1px solid #e5e7eb" }}>
                      {displayText ? (
                        <div style={{ whiteSpace: "pre-wrap" }}>{displayText}</div>
                      ) : (
                        <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
                          <span className="dot dot1" />
                          <span className="dot dot2" />
                          <span className="dot dot3" />
                        </div>
                      )}
                    </div>
                  </div>
                  {toolStatus && (
                    <div style={{ marginTop: 4, fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
                      {toolStatus}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 입력 영역 */}
      <div style={{ flexShrink: 0, borderTop: "1px solid #e5e7eb", background: "#fff", padding: "12px 16px" }}>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }}
          style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // 자동 높이 조절: 내용에 맞춰 위로 확장
              const el = e.target;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 200) + "px";
            }}
            onKeyDown={(e) => {
              // Enter로 전송, Shift+Enter로 줄바꿈
              if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent as any).isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="북한 법령에 대해 질문해 보세요... (Shift+Enter: 줄바꿈)"
            disabled={busy}
            autoFocus
            rows={1}
            style={{
              flex: 1, padding: "10px 16px", border: "1px solid #d1d5db", borderRadius: 8,
              fontSize: 14, outline: "none", resize: "none", overflow: "hidden",
              lineHeight: 1.5, minHeight: 42, maxHeight: 200,
            }}
          />
          <button type="submit" disabled={busy || !input.trim()}
            style={{ padding: "10px 20px", borderRadius: 8, background: busy ? "#9ca3af" : "#1a365d", color: "#fff", border: "none", fontSize: 14, cursor: busy ? "default" : "pointer", flexShrink: 0, height: 42 }}>
            {busy ? "..." : "전송"}
          </button>
        </form>
      </div>

      {/* 푸터 */}
      <div style={{ flexShrink: 0, background: "#1a365d", color: "rgba(255,255,255,0.5)", padding: "8px 16px", textAlign: "center", fontSize: 11 }}>
        데이터 출처: 국가정보원 북한법률정보센터 &middot; 통일법제 데이터베이스 &copy; {new Date().getFullYear()} 북한법률정보센터
      </div>

      <style>{`
        .dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #9ca3af;
          animation: bounce 1.4s ease-in-out infinite;
        }
        .dot1 { animation-delay: 0s; }
        .dot2 { animation-delay: 0.2s; }
        .dot3 { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
