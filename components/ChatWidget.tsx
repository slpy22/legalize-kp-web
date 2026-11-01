"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatSidebar } from "@/components/ChatSidebarProvider";
import { track } from "@/lib/track";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const FALLBACK_EXAMPLES = [
  "북한 과학기술법이 뭐야?",
  "소프트웨어 저작권 관련 법은?",
  "북한 형벌 체계는?",
];

interface Source { law_name?: string; article?: string; }

/** /api/v1/chat/quota(T51) — 회원 여부, 비회원 남은 횟수, ClewPath 서비스 한도 도달 여부 */
interface ChatQuota {
  enabled: boolean;
  member: boolean;
  free_per_day: number | null;
  remaining: number | null;
  login_url: string | null;
  service: { exhausted: boolean; message: string | null };
}
interface Msg {
  role: "user" | "assistant";
  text: string;
  sources: Source[];
  status: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// 응답 본문의 '법명 제N조 [제M항]' 을 클릭 가능한 마크다운 링크로 변환한다.
// sources 로 확보한 실제 DB 법령명을 기준으로, '제N조'를 가장 가까운 앞선 법령
// 문맥에 연결한다. (백엔드 _extract_sources_self 와 동일한 문맥추적 방식)
// 링크 href 는 커스텀 스킴(#lref/법령명/조/항) 이며, 아래 커스텀 <a> 가 가로챈다.
function linkifyRefs(text: string, sources: Source[]): string {
  const names = Array.from(
    new Set(sources.map((s) => s.law_name?.trim()).filter(Boolean) as string[])
  );
  if (names.length === 0) return text;

  // 실제 법령명 + 짧은형(마지막 어절, 예: '조선…민주주의…헌법' → '헌법') 매핑
  const shortMap: Record<string, string> = {};
  for (const n of names) {
    shortMap[n] = n;
    const short = n.split(/\s+/).pop() || "";
    if (short && !(short in shortMap)) shortMap[short] = n;
  }
  const forms = Object.keys(shortMap).sort((a, b) => b.length - a.length);
  const nameAlt = forms.map(escapeRegex).join("|");
  const re = new RegExp(`(${nameAlt})|제\\s*(\\d+)\\s*조(?:\\s*제\\s*(\\d+)\\s*항)?`, "g");

  let current = names.length === 1 ? names[0] : "";
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) {
      // 법령명 매치 → 문맥만 갱신(원문 그대로 두고 링크는 안 검)
      current = shortMap[m[1]] || current;
      continue;
    }
    if (!current) continue; // 문맥 법령 없으면 링크 생략
    const art = m[2];
    const clause = m[3] || "";
    const matched = m[0];
    out += text.slice(last, m.index);
    const href = `#lref/${encodeURIComponent(current)}/${art}/${clause}`;
    out += `[${matched}](${href})`;
    last = m.index + matched.length;
  }
  out += text.slice(last);
  return out;
}

export default function ChatWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [displayText, setDisplayText] = useState("");
  const [input, setInput] = useState("");
  const [llm, setLlm] = useState("self");
  const [sid, setSid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toolStatus, setToolStatus] = useState("");
  const [examples, setExamples] = useState<string[]>([]);
  const [examplesLoaded, setExamplesLoaded] = useState(false);
  // T51 이용 한도 — 서버가 강제하고, 화면은 남은 횟수·로그인 안내·서비스 한도 안내를 보인다
  const [quota, setQuota] = useState<ChatQuota | null>(null);
  const [quotaLoaded, setQuotaLoaded] = useState(false);   // 홈 예시 질문은 한도 상태를 받은 뒤에 보낸다
  const limited = !!quota?.enabled && !quota.member && quota.remaining === 0;
  const serviceFull = !!quota?.service.exhausted;
  const loginHref = `${quota?.login_url || "/login"}?next=${encodeURIComponent(pathname || "/")}`;

  function refreshQuota() {
    fetch(`${API_BASE}/api/v1/chat/quota`, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((q: ChatQuota | null) => {
        if (!q) return;
        setQuota(q);
        // ClewPath 서비스 한도에 닿으면 자체 에이전트는 쓸 수 없으므로 Gemini 로 돌린다(선택지도 막음)
        if (q.service.exhausted) setLlm((v) => (v === "self" ? "gemini" : v));
      })
      .catch(() => {})
      .finally(() => setQuotaLoaded(true));
  }
  useEffect(refreshQuota, []);

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

  // 홈 등의 예시 질문(T42): 사이드바가 질문과 함께 열리면 바로 보낸다
  const { pendingQuestion, takePendingQuestion } = useChatSidebar();
  useEffect(() => {
    if (!pendingQuestion || busy || !quotaLoaded) return;
    const q = takePendingQuestion();
    // T51: 홈 예시 질문도 같은 한도 — 비회원이 다 썼으면 보내지 않고 로그인 안내가 보인다(서버도 막는다)
    if (q && !limited) send(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingQuestion, busy, quotaLoaded]);

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
    if (!text.trim() || busy || limited) return;
    track("chat"); // T43: 사용 여부만 — 질문 내용은 보내지 않는다
    setBusy(true);
    setInput("");
    // textarea 높이 초기화
    if (inputRef.current) inputRef.current.style.height = "auto";
    textRef.current = "";
    setDisplayText("");
    setToolStatus("💭 생각 중...");

    setMsgs((p) => [...p, { role: "user", text, sources: [], status: "" }]);

    let allSources: Source[] = [];
    // T52 보완: 비회원 턴 id(응답 머리) — 답 토큰 없이 끝나면 이 id 로 1회 되돌리기를 청한다(서버가 실패 여부를 확인)
    let turn: string | null = null;
    let answered = false;

    try {
      const res = await fetch(`${API_BASE}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sid, llm }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      turn = res.headers.get("X-Chat-Turn");

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
            if (d.text) answered = true;
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
            // T51: 비회원 하루 한도 → 남은 횟수 0 으로(입력을 막고 로그인 안내), 서비스 한도 → Gemini 로
            if (d.code === "free_quota") setQuota((q) => (q ? { ...q, remaining: 0 } : q));
            if (d.code === "service_exhausted") refreshQuota();
          }
        }
      }
    } catch {
      if (!textRef.current) textRef.current = "⚠️ 서버 연결에 실패했습니다.";
    } finally {
      // T52 보완: 답 없이 끝난 비회원 질문은 횟수를 되돌려 받는다(하루 1번까지 — 서버가 판단)
      if (turn && !answered) {
        try {
          const rf = await fetch(`${API_BASE}/api/v1/chat/refund`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ turn }),
          });
          if (rf.ok) textRef.current += "\n\n(답을 드리지 못해 이번 질문은 횟수에서 빼 드렸습니다.)";
        } catch {
          /* 되돌리기 실패는 조용히 넘어간다 */
        }
      }
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
      refreshQuota();
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  // 인라인 조문 링크 클릭 → 왼쪽 메인 영역에 해당 조문 표시(사이드바는 유지)
  function openArticle(law: string, art: string) {
    const q = art ? `?highlight=${encodeURIComponent(art)}` : "";
    const hash = art ? `#article-${art}` : "";
    router.push(`/law/${encodeURIComponent(law)}${q}${hash}`);
  }

  // ReactMarkdown 용 커스텀 <a>: #lref/ 스킴은 조문 뷰어로, 그 외는 새 탭 링크.
  const mdComponents = {
    a(props: any) {
      const { href, children } = props;
      if (typeof href === "string" && href.startsWith("#lref/")) {
        const parts = href.slice(6).split("/");
        const law = decodeURIComponent(parts[0] || "");
        const art = parts[1] || "";
        return (
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); openArticle(law, art); }}
            style={{ color: "#1d4ed8", textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer", fontWeight: 500 }}
          >
            {children}
          </a>
        );
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8" }}>
          {children}
        </a>
      );
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* 상단 바 */}
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e5e7eb", background: "#fff", padding: "8px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#666" }}>모델:</span>
          <select value={llm} onChange={(e) => setLlm(e.target.value)} disabled={busy}
            style={{ border: "1px solid #d1d5db", borderRadius: 4, padding: "3px 8px", fontSize: 13 }}>
            <option value="self" disabled={serviceFull}>자체 에이전트{serviceFull ? "(오늘 한도 도달)" : ""}</option>
            <option value="gemini">Gemini</option>
          </select>
        </div>
        <button onClick={() => { setMsgs([]); setSid(null); setDisplayText(""); textRef.current = ""; }}
          disabled={busy || msgs.length === 0}
          style={{ fontSize: 13, color: "#666", cursor: "pointer", padding: "3px 12px", border: "none", background: "transparent" }}>
          초기화
        </button>
      </div>

      {/* T51: ClewPath 서비스 일일 한도 — 모두에게 안내 */}
      {serviceFull && quota?.service.message && (
        <p role="status" style={{ flexShrink: 0, margin: 0, padding: "8px 16px", background: "#fffbeb", borderBottom: "1px solid #fde68a", color: "#92400e", fontSize: 13 }}>
          {quota.service.message}
        </p>
      )}

      {/* 메시지 영역 */}
      <div ref={scrollRef} style={{ flex: "1 1 0", overflowY: "auto", padding: 16, minHeight: 0 }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {msgs.length === 0 && !busy ? (
            <div style={{ textAlign: "center", paddingTop: 80 }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <Image src="/brand/nk-law-mark.png" alt="북한법률정보센터 로고" width={56} height={56} unoptimized />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>북한법 AI 상담</h2>
              <p style={{ fontSize: 14, color: "#9ca3af", marginBottom: 32 }}>북한 법령에 대해 궁금한 것을 질문해 보세요.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400, margin: "0 auto", minHeight: 140 }}>
                {examplesLoaded ? examples.map((q) => (
                  <button key={q} onClick={() => send(q)} disabled={limited}
                    style={{ textAlign: "left", padding: "12px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff", fontSize: 14, cursor: limited ? "default" : "pointer", opacity: limited ? 0.5 : 1 }}>
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
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={mdComponents}
                            urlTransform={(url) => (url.startsWith("#lref/") ? url : defaultUrlTransform(url))}
                          >
                            {linkifyRefs(m.text, m.sources)}
                          </ReactMarkdown>
                        </div>
                      ) : m.text}
                    </div>
                  </div>
                  {/* 출처 */}
                  {m.sources.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {m.sources.map((s, j) => {
                        if (!s.law_name) return null;
                        const name = s.law_name.trim();
                        const art = s.article ? s.article.trim() : "";
                        const query = art ? `?highlight=${art}` : "";
                        const hash = art ? `#article-${art}` : "";
                        const url = `/law/${encodeURIComponent(name)}${query}${hash}`;
                        return (
                          <button key={j} onClick={() => router.push(url)}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #bfdbfe", background: "#eff6ff", fontSize: 12, color: "#1d4ed8", textDecoration: "none", cursor: "pointer" }}>
                            📖 {name}{art ? ` 제${art}조` : ""}
                          </button>
                        );
                      })}
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
        {/* T51: 비회원이 하루 한도를 다 쓰면 로그인 안내 + 버튼, 입력은 막는다 */}
        {limited && (
          <div role="status" style={{ maxWidth: 720, margin: "0 auto 10px", padding: "12px 14px", borderRadius: 8, background: "#eff6ff", border: "1px solid #bfdbfe", fontSize: 14, color: "#1e3a8a", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <span style={{ flex: "1 1 220px" }}>
              비회원은 하루 {quota?.free_per_day ?? 3}번 질문할 수 있습니다. 로그인하면 횟수 제한 없이 이용할 수 있습니다.
            </span>
            <a href={loginHref} style={{ padding: "8px 16px", borderRadius: 8, background: "#1a365d", color: "#fff", fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>
              로그인
            </a>
          </div>
        )}
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
            // T41: 예전 문구는 "(Shift+Enter: 줄바꿈)" 까지 붙어 모든 폭에서 두 줄이 되어 둘째 줄이 잘렸다.
            // 한 줄 문구로 줄이고, 줄바꿈 안내는 아래 .chat-hint(마우스 기기에서만)로 옮겼다.
            placeholder={limited ? "로그인하면 이어서 질문할 수 있습니다" : "북한 법령에 대해 질문하세요"}
            disabled={busy || limited}
            autoFocus
            rows={1}
            className="chat-input"
            style={{
              flex: 1, padding: "10px 16px", border: "1px solid #d1d5db", borderRadius: 8,
              outline: "none", resize: "none", overflow: "hidden",
              lineHeight: 1.5, minHeight: 42, maxHeight: 200,
            }}
          />
          <button type="submit" disabled={busy || limited || !input.trim()}
            style={{ padding: "10px 20px", borderRadius: 8, background: busy ? "#9ca3af" : "#1a365d", color: "#fff", border: "none", fontSize: 14, cursor: busy ? "default" : "pointer", flexShrink: 0, height: 42 }}>
            {busy ? "..." : "전송"}
          </button>
        </form>
        {/* Shift+Enter 안내(T41). 화면 키보드에는 Shift+Enter 가 없어 마우스·키보드 기기에서만 보인다 */}
        <p className="chat-hint">Enter 전송 · Shift+Enter 줄바꿈</p>
        {/* T51: 비회원 남은 횟수 */}
        {quota?.enabled && !quota.member && !limited && quota.remaining != null && (
          <p style={{ maxWidth: 720, margin: "6px auto 0", fontSize: 12, color: "#6b7280" }}>
            비회원 오늘 남은 질문 {quota.remaining}회 ·{" "}
            <a href={loginHref} style={{ color: "#1d4ed8", textDecoration: "underline" }}>로그인하면 횟수 제한 없음</a>
          </p>
        )}
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
        /* T41: 입력창 글자. 터치 기기는 16px — iOS Safari 는 16px 보다 작은 입력창에 손대면 화면을 확대한다 */
        .chat-input { font-size: 14px; }
        .chat-input::placeholder { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (pointer: coarse) { .chat-input { font-size: 16px; } }
        .chat-hint { display: none; max-width: 720px; margin: 6px auto 0; font-size: 12px; color: #9ca3af; }
        @media (hover: hover) and (pointer: fine) { .chat-hint { display: block; } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
