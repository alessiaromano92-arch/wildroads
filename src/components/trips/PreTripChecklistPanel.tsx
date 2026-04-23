"use client";

import { useCallback, useId, useMemo, useState } from "react";
import type { JournalTrip, PreTripChecklistItem } from "@/context/journal-trips-context";
import { useJournalTrips } from "@/context/journal-trips-context";

type Props = {
  trip: JournalTrip;
  /** Stacked under a trip card on the dashboard (shared edge, square top). */
  variant?: "default" | "dashboard";
};

function newItemId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `pre-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function ToggleChevron() {
  return (
    <svg
      className="pre-trip-checklist-slip__chevron-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 7l5 5-5 5" />
    </svg>
  );
}

export function PreTripChecklistPanel({
  trip,
  variant = "default",
}: Props) {
  const { updateTripPreTripChecklist } = useJournalTrips();
  const items = trip.preTripChecklist ?? [];
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const persist = useCallback(
    (next: PreTripChecklistItem[]) => {
      updateTripPreTripChecklist(trip.id, next);
    },
    [trip.id, updateTripPreTripChecklist],
  );

  const summary = useMemo(() => {
    if (items.length === 0) return "";
    const done = items.filter((i) => i.done).length;
    return `${done} of ${items.length} done`;
  }, [items]);

  const addFromDraft = () => {
    const label = draft.trim();
    if (!label) return;
    persist([...items, { id: newItemId(), label, done: false }]);
    setDraft("");
  };

  const toggleDone = (id: string, done: boolean) => {
    const rest = items.filter((it) => it.id !== id);
    const cur = items.find((it) => it.id === id);
    if (!cur) return;
    const updated = { ...cur, done };
    if (done) {
      persist([
        ...rest.filter((i) => !i.done),
        ...rest.filter((i) => i.done),
        updated,
      ]);
    } else {
      persist([
        updated,
        ...rest.filter((i) => !i.done),
        ...rest.filter((i) => i.done),
      ]);
    }
  };

  const updateLabel = (id: string, label: string) => {
    persist(items.map((it) => (it.id === id ? { ...it, label } : it)));
  };

  const removeItem = (id: string) => {
    persist(items.filter((it) => it.id !== id));
  };

  const slipMods =
    variant === "dashboard"
      ? " pre-trip-checklist-slip--dashboard"
      : "";

  const noChecklistItems = items.length === 0;

  return (
    <section
      className={`pre-trip-checklist-slip mb-0${slipMods}${open ? " pre-trip-checklist-slip--open" : ""}`}
      aria-label="To-do list"
    >
      <button
        type="button"
        className="pre-trip-checklist-slip__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        id={`pre-trip-checklist-trigger-${trip.id}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className={`pre-trip-checklist-slip__toggle-text${
            noChecklistItems ? " pre-trip-checklist-slip__toggle-text--solo" : ""
          }`}
        >
          {!noChecklistItems ? (
            <span className="pre-trip-checklist-slip__ledger">{summary}</span>
          ) : null}
          <span className="pre-trip-checklist-slip__title block text-left">
            To-do list
          </span>
        </span>
        <span className="pre-trip-checklist-slip__chevron" aria-hidden>
          <ToggleChevron />
        </span>
      </button>

      {open ? (
        <div id={panelId} role="region" aria-labelledby={`pre-trip-checklist-trigger-${trip.id}`}>
          <div className="pre-trip-checklist-slip__below-toggle">
            <p className="pre-trip-checklist-slip__hint mt-0">
              Scratch things down here—they stay on this trip like the rest of your
              journal.
            </p>
          </div>

          <div className="pre-trip-checklist-slip__pad">
            {items.length === 0 ? (
              <p className="pre-trip-checklist-slip__hint min-h-[var(--check-line)] py-1 text-camp-navy/60">
                First line is free—add a task below.
              </p>
            ) : (
              <ul className="m-0 list-none p-0">
                {items.map((item) => (
                  <li key={item.id} className="pre-trip-checklist-slip__row">
                    <span className="pre-trip-checklist-slip__check">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(e) => toggleDone(item.id, e.target.checked)}
                        aria-label={`Done: ${item.label || "task"}`}
                      />
                    </span>
                    <input
                      className={`pre-trip-checklist-slip__line-input ${
                        item.done ? "pre-trip-checklist-slip__line-input--done" : ""
                      }`}
                      value={item.label}
                      onChange={(e) => updateLabel(item.id, e.target.value)}
                      placeholder="Write your task here…"
                      aria-label="Task text"
                    />
                    <button
                      type="button"
                      className="pre-trip-checklist-slip__remove"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove: ${item.label || "task"}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="pre-trip-checklist-slip__scratch">
              <span className="pre-trip-checklist-slip__check">
                <input
                  type="checkbox"
                  disabled
                  tabIndex={-1}
                  aria-hidden={true}
                  className="pre-trip-checklist-slip__scratch-check"
                />
              </span>
              <input
                className="pre-trip-checklist-slip__scratch-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFromDraft();
                  }
                }}
                placeholder="Type your next task…"
                aria-label="New checklist item"
              />
              <button
                type="button"
                onClick={addFromDraft}
                className="pre-trip-checklist-slip__add-text"
              >
                + Add item
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
