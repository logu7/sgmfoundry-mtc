"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { normalizeName, type Customer } from "@/lib/db";

/**
 * Customer name input with memory: as soon as you type three characters it
 * lists customers from past certificates; picking one fills address, GSTIN and
 * contact. Typing an exact past name and tabbing out fills it too — that is the
 * "second time I type the same name it remembers" behaviour.
 */
export function CustomerInput({
  value,
  address,
  customers,
  onChange,
  onPick,
}: {
  value: string;
  address: string;
  customers: Customer[];
  onChange: (name: string) => void;
  onPick: (customer: Customer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  const suggestions = useMemo(() => {
    const q = normalizeName(query);
    if (q.length < 2) return [];
    const starts: Customer[] = [];
    const contains: Customer[] = [];
    for (const c of customers) {
      if (c.id === q) continue;
      if (c.id.startsWith(q)) starts.push(c);
      else if (c.id.includes(q)) contains.push(c);
      else {
        // match on any word, e.g. "castings" -> "sri castings pvt ltd"
        if (c.id.split(/[\s.,&()-]+/).some((w) => w.startsWith(q))) contains.push(c);
      }
    }
    return [...starts, ...contains]
      .sort((a, b) => b.use_count - a.use_count)
      .slice(0, 7);
  }, [customers, query]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function commitExact() {
    const key = normalizeName(query);
    const exact = customers.find((c) => c.id === key);
    if (exact) onPick(exact);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <label className="block">
        <span className="block text-xs font-medium text-slate-500 mb-1">
          To M/s (customer)
          {address ? (
            <span className="ml-2 text-emerald-600 font-normal">✓ address remembered</span>
          ) : null}
        </span>
        <div className="relative">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              onChange(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(commitExact, 120)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && suggestions.length) {
                e.preventDefault();
                setHighlight((h) => (h + 1) % suggestions.length);
              } else if (e.key === "ArrowUp" && suggestions.length) {
                e.preventDefault();
                setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
              } else if (e.key === "Enter" && open && suggestions[highlight]) {
                e.preventDefault();
                onPick(suggestions[highlight]);
                setQuery(suggestions[highlight].name);
                setOpen(false);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            autoComplete="off"
            placeholder="Start typing — past customers appear"
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
          {suggestions.length > 0 && open ? (
            <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
              {suggestions.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onPick(c);
                      setQuery(c.name);
                      setOpen(false);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      i === highlight ? "bg-slate-100" : ""
                    }`}
                  >
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {c.use_count} cert{c.use_count === 1 ? "" : "s"}
                    </span>
                    {c.address ? (
                      <span className="block truncate text-xs text-slate-500">{c.address}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </label>
    </div>
  );
}
