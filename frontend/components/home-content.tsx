"use client";

import { useMemo, useCallback } from "react";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { TourCard } from "@/components/tour-card";
import { TopBar } from "@/components/top-bar";
import type { City } from "@/store/types";

const cities: { key: City }[] = [{ key: "kyiv" }, { key: "kharkiv" }];

export function HomeContent() {
  const { tours, selectedCity, setCity, fetchTours, language } = useAppStore();
  const dict = useI18n();

  const handleSetCity = useCallback(
    (city: typeof selectedCity) => {
      setCity(city);
      setTimeout(() => fetchTours(), 0);
    },
    [setCity, fetchTours],
  );

  const popularTours = useMemo(
    () => tours.filter((t) => t.city === selectedCity).slice(0, 4),
    [tours, selectedCity],
  );

  const filteredTours = useMemo(
    () => tours.filter((t) => t.city === selectedCity),
    [tours, selectedCity],
  );

  return (
    <div className="flex flex-col pb-safe">
      <TopBar />
      <div className="px-5 pt-2 pb-4">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl w-fit">
          {cities.map(({ key }) => (
            <button
              key={key}
              onClick={() => handleSetCity(key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 active-scale ${
                selectedCity === key
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {language === "uk"
                ? key === "kyiv"
                  ? "Київ"
                  : "Харків"
                : key === "kyiv"
                  ? "Kyiv"
                  : "Kharkiv"}
            </button>
          ))}
        </div>
      </div>
      <section>
        <div className="px-5 mb-3">
          <h2 className="text-lg font-bold text-foreground">
            {dict.home.popular}
          </h2>
        </div>
        <div className="flex gap-3 px-5 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
          {popularTours.map((tour) => (
            <TourCard key={tour.id} tour={tour} variant="horizontal" />
          ))}
        </div>
      </section>
      <section className="px-5 mt-4">
        <h2 className="text-lg font-bold text-foreground mb-3">
          {dict.home.allTours}
        </h2>
        <div className="flex flex-col gap-3">
          {filteredTours.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">{dict.home.noTours}</p>
            </div>
          ) : (
            filteredTours.map((tour) => (
              <TourCard key={tour.id} tour={tour} variant="vertical" />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
