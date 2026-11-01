"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { lawYearParts, matchLaws, type LawIndexEntry } from "@/lib/lawSearch";

/**
 * 법령명 자동완성 입력(T50). 부분 일치·별칭·초성(ㅎㅂ → 형법)으로 찾고, ↑↓·Enter·Esc 와 터치로 고른다.
 * WAI-ARIA combobox(목록 팝업) 패턴: input[role=combobox] + ul[role=listbox], aria-activedescendant.
 * 색인은 같은 출처의 /law-index 에서 한 번만 받아 탭이 살아 있는 동안 같이 쓴다.
 */
let indexPromise: Promise<LawIndexEntry[]> | null = null;

export function loadLawIndex(): Promise<LawIndexEntry[]> {
  indexPromise ??= fetch("/law-index")
    .then((r) => (r.ok ? r.json() : { laws: [] }))
    .then((d: { laws?: LawIndexEntry[] }) => d.laws || [])
    .catch(() => {
      indexPromise = null; // 실패는 담지 않는다(다음 입력 때 다시 시도)
      return [];
    });
  return indexPromise;
}

export function useLawIndex(): LawIndexEntry[] {
  const [index, setIndex] = useState<LawIndexEntry[]>([]);
  useEffect(() => {
    let alive = true;
    loadLawIndex().then((v) => alive && setIndex(v));
    return () => {
      alive = false;
    };
  }, []);
  return index;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  /** 목록에서 법령을 골랐을 때(정식 이름) */
  onSelect: (name: string) => void;
  /** 목록을 고르지 않고 Enter 를 눌렀을 때(폼 제출은 부모가) */
  onEnter?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** 어두운 바탕(헤더·히어로)에서 목록 글자색 */
  label?: string;
  autoFocus?: boolean;
  limit?: number;
  name?: string;
}

export default function LawNameInput({
  value,
  onChange,
  onSelect,
  onEnter,
  placeholder = "법령명을 입력하세요",
  className = "",
  inputClassName = "",
  label = "법령명",
  autoFocus,
  limit = 8,
  name,
}: Props) {
  const index = useLawIndex();
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState(false);   // 방금 고른 직후에는 목록을 다시 띄우지 않는다(다시 입력하면 풀림)
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => matchLaws(index, value, limit), [index, value, limit]);
  const show = open && !picked && matches.length > 0 && value.trim().length > 0;

  const pick = (n: string) => {
    onChange(n);
    onSelect(n);
    setOpen(false);
    setActive(-1);
    setPicked(true);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return; // 한글 조합 중 Enter·화살표는 조합 확정용
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (matches.length ? (i + 1) % matches.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (matches.length ? (i <= 0 ? matches.length - 1 : i - 1) : -1));
    } else if (e.key === "Enter") {
      if (show && active >= 0 && matches[active]) {
        e.preventDefault();
        pick(matches[active].entry.n);
      } else {
        setOpen(false);
        if (onEnter) {
          e.preventDefault();
          onEnter();
        }
      }
    } else if (e.key === "Escape") {
      if (show) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        name={name}
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && active >= 0 ? `${id}-opt-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
          setPicked(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className={inputClassName}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={`${label} 후보`}
        hidden={!show}
        className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-left text-gray-900 shadow-lg"
      >
        {matches.map((m, i) => {
          const years = lawYearParts(m.entry.y, m.entry.v);
          return (
            <li
              key={m.entry.n}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown 의 기본 동작을 막아 입력창 포커스(blur→닫힘)를 지키고, 고르기는 click 에서 한다.
              // 터치로 목록을 스크롤할 때는 click 이 생기지 않아 잘못 골라지지 않는다.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(m.entry.n)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer flex-wrap items-baseline justify-between gap-x-3 px-3 py-2.5 text-sm ${
                i === active ? "bg-navy-light/10" : "hover:bg-gray-50"
              }`}
            >
              <span className="min-w-0">
                <span className="font-medium">{m.entry.n}</span>
                {m.via && <span className="ml-1.5 text-xs text-gray-500">({m.via})</span>}
                {m.entry.t && <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[11px] text-amber-800">본문 미확보</span>}
              </span>
              {years.length > 0 && <span className="whitespace-nowrap text-xs tabular-nums text-gray-500">{years.join(" · ")}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
