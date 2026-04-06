"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Package } from "lucide-react";
import { TourCard } from "@/components/tour-card";
import { api } from "@/lib/api";
import { mapTour } from "@/lib/mappers";
import type { Tour } from "@/store/types";

export function MyToursContent() {
  const router = useRouter();
  const { tours, purchasedAccess } = useAppStore();
  const dict = useI18n();
  const [resolvedTours, setResolvedTours] = useState<Tour[]>([]);

  const purchasedIds = useMemo(
    () => Object.keys(purchasedAccess ?? {}).filter((id) => Boolean(purchasedAccess[id])),
    [purchasedAccess],
  );

  useEffect(() => {
    let active = true;

    const loadPurchasedTours = async () => {
      if (purchasedIds.length === 0) {
        if (active) setResolvedTours([]);
        return;
      }

      const cachedById = new Map(tours.map((tour) => [tour.id, tour]));
      const missingIds = purchasedIds.filter((id) => !cachedById.has(id));
      const fetchedTours = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const raw = await api.getTourById(id);
            return mapTour(raw as unknown as Record<string, unknown>);
          } catch {
            return null;
          }
        }),
      );

      const mergedById = new Map<string, Tour>();
      tours.forEach((tour) => {
        if (purchasedAccess[tour.id]) mergedById.set(tour.id, tour);
      });
      fetchedTours.forEach((tour) => {
        if (tour && purchasedAccess[tour.id]) mergedById.set(tour.id, tour);
      });

      const ordered = purchasedIds
        .map((id) => mergedById.get(id))
        .filter((tour): tour is Tour => Boolean(tour));

      if (active) setResolvedTours(ordered);
    };

    loadPurchasedTours();

    return () => {
      active = false;
    };
  }, [purchasedIds, purchasedAccess, tours]);

  return (
    <div className="flex flex-col pb-safe page-enter">
      <div className="flex items-center gap-3 px-5 pt-4 pb-5">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active-scale"
          aria-label={dict.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{dict.myTours.title}</h1>
      </div>

      {resolvedTours.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 px-8 py-16 gap-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground text-center">
            {dict.myTours.noTours}
          </h2>
          <p className="text-sm text-muted-foreground text-center leading-relaxed">
            {dict.myTours.noToursHint}
          </p>
          <Link
            href="/"
            className="px-8 py-3 bg-coral text-white rounded-2xl font-bold active-scale"
          >
            {dict.myTours.exploreTours}
          </Link>
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-4">
          {resolvedTours.map((tour) => (
            <div key={tour.id} className="flex flex-col gap-2">
              <TourCard tour={tour} variant="vertical" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
