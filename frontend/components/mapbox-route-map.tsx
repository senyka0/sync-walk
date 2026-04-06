"use client";

import { useEffect, useRef, useState } from "react";
import type { TourPoint } from "@/store/types";

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

interface MapboxRouteMapProps {
  points: TourPoint[];
  currentIndex?: number;
  userLocation?: { latitude: number; longitude: number } | null;
  className?: string;
}

function highlightStop(
  map: mapboxgl.Map,
  points: TourPoint[],
  index: number | undefined,
) {
  if (!points.length) return;
  if (index == null || index < 0 || index >= points.length) return;

  const p = points[index];

  const source = map.getSource("active-stop") as
    | mapboxgl.GeoJSONSource
    | undefined;

  map.easeTo({
    center: [p.longitude, p.latitude],
    duration: 300,
  });

  if (!source) return;

  source.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [p.longitude, p.latitude],
        },
        properties: {},
      },
    ],
  });
}

function updateUserLocation(
  map: mapboxgl.Map,
  userLocation: { latitude: number; longitude: number } | null | undefined,
) {
  const source = map.getSource("user-location") as
    | mapboxgl.GeoJSONSource
    | undefined;
  if (!source) return;

  if (!userLocation) {
    source.setData({
      type: "FeatureCollection",
      features: [],
    });
    return;
  }

  source.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [userLocation.longitude, userLocation.latitude],
        },
        properties: {},
      },
    ],
  });
}

export function MapboxRouteMap({
  points,
  currentIndex,
  userLocation,
  className,
}: MapboxRouteMapProps) {
  const [isClient, setIsClient] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const isLoadedRef = useRef(false);
  const currentIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (currentIndex == null) return;
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    if (!isClient) return;
    if (!containerRef.current) return;
    if (!points.length) return;
    if (!MAPBOX_ACCESS_TOKEN) return;
    if (mapRef.current) return;

    const load = async () => {
      const mapbox =
        (await import("mapbox-gl")) as unknown as typeof import("mapbox-gl");

      const first = points[0];
      const map = new mapbox.Map({
        container: containerRef.current as HTMLDivElement,
        style: "mapbox://styles/mapbox/streets-v11",
        center: [first.longitude, first.latitude],
        zoom: 13,
        accessToken: MAPBOX_ACCESS_TOKEN,
      });

      mapRef.current = map;

      map.on("load", () => {
        const coordinates = points.map((p) => [p.longitude, p.latitude]);

        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates,
            },
            properties: {},
          },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          paint: {
            "line-color": "#E94560",
            "line-width": 4,
          },
        });

        map.addSource("stops", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: points.map((p, index) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [p.longitude, p.latitude],
              },
              properties: {
                index,
              },
            })),
          },
        });

        map.addLayer({
          id: "stops-circle",
          type: "circle",
          source: "stops",
          paint: {
            "circle-radius": 4,
            "circle-color": "#FFFFFF",
            "circle-stroke-color": "#E94560",
            "circle-stroke-width": 2,
          },
        });

        map.addSource("active-stop", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "active-stop-circle",
          type: "circle",
          source: "active-stop",
          paint: {
            "circle-radius": 7,
            "circle-color": "#E94560",
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 2,
          },
        });

        map.addSource("user-location", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "user-location-pulse",
          type: "circle",
          source: "user-location",
          paint: {
            "circle-radius": 12,
            "circle-color": "#3B82F6",
            "circle-opacity": 0.25,
          },
        });

        map.addLayer({
          id: "user-location-dot",
          type: "circle",
          source: "user-location",
          paint: {
            "circle-radius": 6,
            "circle-color": "#3B82F6",
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 2,
          },
        });

        const bounds = new mapbox.LngLatBounds();
        coordinates.forEach((c) => bounds.extend(c as [number, number]));
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { padding: 40, duration: 0 });
        }

        const initialIndex =
          currentIndexRef.current != null ? currentIndexRef.current : 0;
        highlightStop(map, points, initialIndex);
        updateUserLocation(map, userLocation);
        isLoadedRef.current = true;
      });
    };

    load();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      isLoadedRef.current = false;
    };
  }, [points, isClient]);

  useEffect(() => {
    if (!isClient) return;
    const map = mapRef.current;
    if (!map) return;
    if (!isLoadedRef.current) return;
    if (!points.length) return;
    if (currentIndex == null) return;

    highlightStop(map, points, currentIndex);
  }, [currentIndex, points, isClient]);

  useEffect(() => {
    if (!isClient) return;
    const map = mapRef.current;
    if (!map) return;
    if (!isLoadedRef.current) return;

    updateUserLocation(map, userLocation);
  }, [userLocation, isClient]);

  if (!isClient) {
    return <div className={className} />;
  }

  return <div ref={containerRef} className={className} />;
}
