"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import type { Tour } from "@/store/types";

interface TourCardProps {
  tour: Tour;
  variant?: "horizontal" | "vertical";
}

export function TourCard({ tour, variant = "vertical" }: TourCardProps) {
  const { language } = useAppStore();
  const dict = useI18n();
  const localizedTitle =
    language === "uk" ? (tour.titleUk ?? tour.title) : tour.title;

  if (variant === "horizontal") {
    return (
      <Link href={`/tours/${tour.id}`} className="block active-scale">
        <div className="relative w-52 rounded-2xl overflow-hidden shadow-md bg-card shrink-0">
          <div className="relative h-36">
            <img
              src={tour.coverImage}
              alt={localizedTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-navy/80 via-navy/20 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-white font-semibold text-sm leading-tight line-clamp-2 text-balance">
                {localizedTitle}
              </p>
            </div>
          </div>
          <div className="px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <p className="text-xs">
                {tour.durationMin} {dict.common.min}
              </p>
            </div>
              <p className="text-xs font-bold text-coral">
                {dict.tour.fromPrice.replace(
                  "{price}",
                  String(tour.individualPrice),
                )}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/tours/${tour.id}`} className="block active-scale">
      <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
        <div className="relative h-44">
          <img
            src={tour.coverImage}
            alt={localizedTitle}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-navy/60 to-transparent" />
        </div>
        <div className="p-4">
          <h3 className="font-bold text-foreground text-base leading-tight mb-1 text-balance">
            {localizedTitle}
          </h3>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">
                  {tour.durationMin} {dict.common.min}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span className="text-xs">
                  {tour.stopsCount} {dict.common.stops}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-coral">
                ₴{tour.individualPrice}
              </span>
              <div className="text-[10px] text-muted-foreground">
                {dict.tour.groupPrice.replace("{price}", String(tour.groupPrice))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
