"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import {
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon,
} from "lucide-react";

type WeatherState = {
  temperature: number | null;
  weatherCode: number | null;
  isDay: boolean;
};

const CITY_COORDINATES = {
  kyiv: { latitude: 50.4501, longitude: 30.5234 },
  kharkiv: { latitude: 49.9935, longitude: 36.2304 },
} as const;

function getWeatherIcon(
  weatherCode: number | null,
  isDay: boolean,
): LucideIcon {
  if (weatherCode === null) return Cloud;
  if (weatherCode === 0) return isDay ? Sun : Moon;
  if ([1, 2].includes(weatherCode)) return isDay ? CloudSun : Cloud;
  if (weatherCode === 3 || weatherCode === 45 || weatherCode === 48)
    return Cloud;
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
      weatherCode,
    )
  ) {
    return CloudRain;
  }
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return CloudSnow;
  return Cloud;
}

export function TopBar() {
  const { selectedCity, user, language } = useAppStore();
  const dict = useI18n();
  const [weather, setWeather] = useState<WeatherState>({
    temperature: null,
    weatherCode: null,
    isDay: true,
  });

  const cityLabel =
    language === "uk"
      ? selectedCity === "kyiv"
        ? "Київ"
        : "Харків"
      : selectedCity === "kyiv"
        ? "Kyiv"
        : "Kharkiv";
  const WeatherIcon = getWeatherIcon(weather.weatherCode, weather.isDay);

  useEffect(() => {
    const city = selectedCity === "kyiv" ? "kyiv" : "kharkiv";
    const coords = CITY_COORDINATES[city];
    const controller = new AbortController();

    const loadWeather = async () => {
      try {
        const params = new URLSearchParams({
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
          current: "temperature_2m,weather_code,is_day",
          timezone: "auto",
        });
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
          { signal: controller.signal },
        );

        if (!response.ok) return;

        const data = await response.json();
        const current = data?.current;
        if (!current) return;

        setWeather({
          temperature:
            typeof current.temperature_2m === "number"
              ? Math.round(current.temperature_2m)
              : null,
          weatherCode:
            typeof current.weather_code === "number"
              ? current.weather_code
              : null,
          isDay: current.is_day === 1,
        });
      } catch {
        return;
      }
    };

    loadWeather();

    return () => controller.abort();
  }, [selectedCity]);

  return (
    <header className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest">
            {dict.common.location}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-foreground">
              {cityLabel}
            </span>
            <WeatherIcon className="w-4 h-4 text-muted-foreground" />
            {weather.temperature !== null ? (
              <span className="text-sm font-medium text-muted-foreground">
                {weather.temperature}°C
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <Link href="/profile" className="active-scale">
        <div className="w-9 h-9 rounded-full bg-coral flex items-center justify-center text-white font-bold text-sm">
          {user?.name?.[0] ?? "?"}
        </div>
      </Link>
    </header>
  );
}
