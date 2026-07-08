import { useId, useRef } from "react";
import type { KeyboardEvent } from "react";
import { cx } from "./utils";
import "./ui-overlay.css";

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  /** id da aba ativa (controlado). */
  value: string;
  onChange: (id: string) => void;
  /** Rótulo acessível do tablist. */
  label?: string;
  className?: string;
}

/** Índice da próxima aba habilitada a partir de `start`, andando `delta`. */
function nextEnabledIndex(
  items: readonly TabItem[],
  start: number,
  delta: 1 | -1,
): number {
  const len = items.length;
  const walk = (candidate: number, remaining: number): number => {
    if (remaining === 0) return start;
    const idx = (candidate + len) % len;
    if (!items[idx]?.disabled) return idx;
    return walk(idx + delta, remaining - 1);
  };
  return walk(start + delta, len);
}

function edgeEnabledIndex(items: readonly TabItem[], fromEnd: boolean): number {
  const list = fromEnd ? [...items].reverse() : [...items];
  const found = list.findIndex((item) => !item.disabled);
  if (found < 0) return -1;
  return fromEnd ? items.length - 1 - found : found;
}

/**
 * Tabs Eyris — underline 2px, role tablist/tab, aria-selected e navegação
 * por setas (ativação segue o foco).
 */
export function Tabs({ items, value, onChange, label, className }: TabsProps) {
  const baseId = useId();
  const refs = useRef(new Map<string, HTMLButtonElement>());

  function activate(index: number): void {
    const item = items[index];
    if (!item || item.disabled) return;
    refs.current.get(item.id)?.focus();
    if (item.id !== value) onChange(item.id);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    const handlers: Record<string, () => number> = {
      ArrowRight: () => nextEnabledIndex(items, index, 1),
      ArrowLeft: () => nextEnabledIndex(items, index, -1),
      Home: () => edgeEnabledIndex(items, false),
      End: () => edgeEnabledIndex(items, true),
    };
    const resolve = handlers[event.key];
    if (!resolve) return;
    event.preventDefault();
    const target = resolve();
    if (target >= 0) activate(target);
  }

  return (
    <div className={cx("ui-tabs", className)} role="tablist" aria-label={label}>
      {items.map((item, index) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.id}`}
            className="ui-tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            ref={(el) => {
              if (el) refs.current.set(item.id, el);
              else refs.current.delete(item.id);
            }}
            onClick={() => activate(index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
