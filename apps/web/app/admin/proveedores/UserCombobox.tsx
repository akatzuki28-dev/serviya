"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X, User as UserIcon } from "lucide-react";
import { searchUsers, type AdminUserLite } from "./actions";

interface UserComboboxProps {
  value: string | null;
  initialUser?: AdminUserLite | null;
  onChange: (id: string | null) => void;
}

export function UserCombobox({ value, initialUser, onChange }: UserComboboxProps) {
  const [selected, setSelected] = useState<AdminUserLite | null>(
    initialUser ?? null
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminUserLite[]>([]);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Run a search whenever the query changes, debounced
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      startTransition(async () => {
        const rows = await searchUsers(query);
        setResults(rows);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [query, open]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(u: AdminUserLite) {
    setSelected(u);
    onChange(u.id);
    setOpen(false);
    setQuery("");
  }

  function handleClear() {
    setSelected(null);
    onChange(null);
    setQuery("");
  }

  return (
    <div ref={wrapperRef} className="relative">
      {selected ? (
        <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <UserIcon className="h-4 w-4 text-muted" />
            <div>
              <p className="text-foreground">{selected.email}</p>
              <p className="text-[11px] text-subtle">
                {selected.role}
                {selected.phone ? ` · ${selected.phone}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-1 text-muted hover:bg-surface hover:text-foreground"
            aria-label="Quitar usuario vinculado"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
            <Search className="h-4 w-4 text-muted" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Buscar por email o teléfono..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
            />
          </div>

          {open && (
            <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-border bg-background shadow-[var(--shadow-lift)]">
              {results.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-subtle">
                  {query.trim() === ""
                    ? "Escribí para buscar usuarios"
                    : "Sin resultados"}
                </p>
              ) : (
                <ul className="py-1">
                  {results.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(u)}
                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-surface"
                      >
                        <UserIcon className="mt-0.5 h-4 w-4 text-muted" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-foreground">{u.email}</p>
                          <p className="text-[11px] text-subtle">
                            {u.role}
                            {u.phone ? ` · ${u.phone}` : ""}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
      {value && !selected && (
        <p className="mt-1 text-[11px] text-subtle">
          Usuario vinculado: <span className="font-mono">{value}</span>
        </p>
      )}
    </div>
  );
}
