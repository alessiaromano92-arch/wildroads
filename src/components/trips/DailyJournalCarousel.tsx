"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { JournalTrip } from "@/context/journal-trips-context";
import { useJournalTrips } from "@/context/journal-trips-context";
import { parseTripLocalDate } from "@/lib/build-trip-days";
import { computeTripSearchBiasCenter } from "@/lib/trip-search-bias";
import {
  DailySummary,
  type DailySummaryMapHandle,
} from "@/components/trips/DailySummary";
import {
  DailyJournalDayForm,
  type DailyJournalDayFormHandle,
} from "@/components/trips/DailyJournalDayForm";

type Props = {
  trip: JournalTrip;
};

function calendarParts(dateISO: string) {
  const d = parseTripLocalDate(dateISO);
  if (Number.isNaN(d.getTime())) {
    return { weekday: "—", dayOfMonth: "—" };
  }
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    dayOfMonth: String(d.getDate()),
  };
}

function ChevronLeftIcon() {
  return (
    <svg
      className="field-guide-cal-nav-ico"
      viewBox="0 0 24 24"
      width={22}
      height={22}
      aria-hidden
    >
      <path
        d="M14 7l-5 5 5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="field-guide-cal-nav-ico"
      viewBox="0 0 24 24"
      width={22}
      height={22}
      aria-hidden
    >
      <path
        d="M10 7l5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DailyJournalCarousel({ trip }: Props) {
  const { updateTripDayJournal } = useJournalTrips();
  /** Day forms strip: scroll position is updated when the calendar changes day (no user horizontal scroll). */
  const slidesScrollRef = useRef<HTMLDivElement>(null);
  /** Horizontal scroll for the date tabs row only (never use scrollIntoView on tabs — it can scroll the whole page sideways). */
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const activeCalCellRef = useRef<HTMLButtonElement | null>(null);
  const dayFormApiRef = useRef<Record<string, DailyJournalDayFormHandle | null>>(
    {},
  );
  const summaryMapRef = useRef<DailySummaryMapHandle | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const days = trip.days;

  const scrollToDaySlide = (index: number, behavior: ScrollBehavior = "smooth") => {
    const el = slidesScrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(index, days.length - 1));
    const child = el.children.item(clamped) as HTMLElement | null;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft, behavior });
  };

  const calendarMonthLabel = useMemo(() => {
    if (days.length === 0) return "";
    const first = parseTripLocalDate(days[0]!.dateISO);
    const last = parseTripLocalDate(days[days.length - 1]!.dateISO);
    if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) {
      return "";
    }
    const sameMonth =
      first.getMonth() === last.getMonth() &&
      first.getFullYear() === last.getFullYear();
    if (sameMonth) {
      return first.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }
    return `${first.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${last.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }, [days]);

  useEffect(() => {
    const el = slidesScrollRef.current;
    if (!el || days.length === 0) return;

    const onScroll = () => {
      const scrollLeft = el.scrollLeft;
      let closest = 0;
      let minDiff = Infinity;
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i] as HTMLElement;
        const diff = Math.abs(child.offsetLeft - scrollLeft);
        if (diff < minDiff) {
          minDiff = diff;
          closest = i;
        }
      }
      setActiveIndex(Math.min(closest, days.length - 1));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [days.length]);

  /** Scroll only the calendar strip so the active tab stays visible — avoids window scroll-x from scrollIntoView. */
  useLayoutEffect(() => {
    const cell = activeCalCellRef.current;
    const grid = calendarGridRef.current;
    if (!cell || !grid) return;

    const cellRect = cell.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const cellLeftInGrid = cellRect.left - gridRect.left + grid.scrollLeft;
    const targetScrollLeft =
      cellLeftInGrid - (grid.clientWidth - cellRect.width) / 2;
    const maxScroll = Math.max(0, grid.scrollWidth - grid.clientWidth);
    const nextLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll));

    grid.scrollTo({ left: nextLeft, behavior: "smooth" });
  }, [activeIndex]);

  /**
   * Horizontal slides share one flex row; by default the row is as tall as the tallest slide.
   * Lock the strip to the visible day’s height so a short “saved” view isn’t stretched by other days.
   */
  useLayoutEffect(() => {
    const strip = slidesScrollRef.current;
    if (!strip || days.length === 0) return;

    const activeSlide = () =>
      strip.children.item(activeIndex) as HTMLElement | null;

    const applyHeight = () => {
      const slide = activeSlide();
      if (!slide) return;
      const cs = getComputedStyle(strip);
      const padY =
        parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      strip.style.height = `${slide.offsetHeight + padY}px`;
    };

    const slideEl = activeSlide();
    if (!slideEl) return;

    applyHeight();
    const ro = new ResizeObserver(applyHeight);
    ro.observe(slideEl);

    return () => {
      ro.disconnect();
      strip.style.height = "";
    };
  }, [activeIndex, days.length]);

  const tripSearchBiasCenter = useMemo(
    () => computeTripSearchBiasCenter(trip),
    [trip],
  );

  if (days.length === 0) return null;

  const visibleDay = days[activeIndex] ?? days[0];
  const visibleEntry = trip.dayJournal?.[visibleDay.dateISO];

  const canGoPrev = activeIndex > 0;
  const canGoNext = activeIndex < days.length - 1;

  const summaryShowsMap = visibleEntry?.isSubmitted === true;

  const daysStripClass = [
    "field-guide-calendar-days",
    canGoPrev ? "field-guide-calendar-days--fade-left" : "",
    canGoNext ? "field-guide-calendar-days--fade-right" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="field-guide-carousel">
      <div className="field-guide-calendar-shell">
        <div
          className="field-guide-calendar"
          role="tablist"
          aria-label="Trip days on the calendar"
        >
          {calendarMonthLabel ? (
            <div className="field-guide-calendar-head">{calendarMonthLabel}</div>
          ) : null}
          <div className={daysStripClass}>
            {canGoPrev ? (
              <button
                type="button"
                className="field-guide-cal-nav field-guide-cal-nav--prev"
                aria-label="Previous day"
                onClick={() => scrollToDaySlide(activeIndex - 1)}
              >
                <ChevronLeftIcon />
              </button>
            ) : null}
            {canGoNext ? (
              <button
                type="button"
                className="field-guide-cal-nav field-guide-cal-nav--next"
                aria-label="Next day"
                onClick={() => scrollToDaySlide(activeIndex + 1)}
              >
                <ChevronRightIcon />
              </button>
            ) : null}
            <div ref={calendarGridRef} className="field-guide-calendar-grid">
              {days.map((d, i) => {
                const { weekday, dayOfMonth } = calendarParts(d.dateISO);
                return (
                  <button
                    key={d.dateISO}
                    ref={i === activeIndex ? activeCalCellRef : undefined}
                    type="button"
                    role="tab"
                    aria-selected={i === activeIndex}
                    aria-label={`${weekday} ${dayOfMonth}, trip day ${d.dayNumber}`}
                    className={`field-guide-cal-cell ${i === activeIndex ? "field-guide-cal-cell--active" : ""}`}
                    onClick={() => scrollToDaySlide(i, "instant")}
                  >
                    <span className="field-guide-cal-wd">{weekday}</span>
                    <span className="field-guide-cal-dom">{dayOfMonth}</span>
                    <span className="field-guide-cal-trip">Day {d.dayNumber}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        id="trip-journal-daily-summary"
        className={`field-guide-journal-combined scroll-mt-6${summaryShowsMap ? "" : " field-guide-journal-combined--map-hidden"}`}
      >
        <DailySummary
          ref={summaryMapRef}
          dateISO={visibleDay.dateISO}
          dayLabel={visibleDay.label}
          entry={visibleEntry}
          showMap={summaryShowsMap}
          onEditSubmittedDay={
            visibleEntry?.isSubmitted
              ? () =>
                  dayFormApiRef.current[visibleDay.dateISO]?.requestEdit()
              : undefined
          }
        />

        <div className="field-guide-map-tear-line" aria-hidden />

        <div ref={slidesScrollRef} className="field-guide-slides">
          {days.map((day) => {
            const stored = trip.dayJournal?.[day.dateISO];
            const formKey = `${day.dateISO}:${JSON.stringify(stored ?? null)}`;
            return (
              <div key={day.dateISO} className="field-guide-slide">
                <DailyJournalDayForm
                  key={formKey}
                  ref={(api) => {
                    if (api) dayFormApiRef.current[day.dateISO] = api;
                    else delete dayFormApiRef.current[day.dateISO];
                  }}
                  mergedJournalLayout
                  day={day}
                  stored={stored}
                  tripSearchBiasCenter={tripSearchBiasCenter}
                  onSave={(entry) =>
                    updateTripDayJournal(trip.id, day.dateISO, entry)
                  }
                  readOnlyMapTapEnabled={
                    Boolean(stored?.isSubmitted) &&
                    summaryShowsMap &&
                    day.dateISO === visibleDay.dateISO
                  }
                  onReadOnlyMapFocusAt={(lat, lng) =>
                    summaryMapRef.current?.focusAt(lat, lng)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
