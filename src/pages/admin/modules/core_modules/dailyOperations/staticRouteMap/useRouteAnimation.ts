import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RouteGeometry } from "./types";

export interface LatLng {
  latitude: number;
  longitude: number;
}

// ORS Directions returns a FeatureCollection; a hand-authored fallback may
// be a bare LineString or single Feature — flatten all three shapes (same
// ones StaticRouteMapView's L.geoJSON() already accepts) into one ordered
// [lng, lat] coordinate path to animate along.
function extractLineCoordinates(geometry: RouteGeometry): Array<[number, number]> {
  if (geometry.type === "LineString") return geometry.coordinates as Array<[number, number]>;
  if (geometry.type === "Feature") {
    return geometry.geometry?.type === "LineString"
      ? (geometry.geometry.coordinates as Array<[number, number]>)
      : [];
  }
  if (geometry.type === "FeatureCollection") {
    return geometry.features.flatMap((feature) =>
      feature.geometry?.type === "LineString"
        ? (feature.geometry.coordinates as Array<[number, number]>)
        : [],
    );
  }
  return [];
}

// Planar distance is fine at city scale (matches the existing nearest-leg
// distance approach used for detour placement) — no need for haversine.
function distanceBetween(a: [number, number], b: [number, number]): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

const METERS_PER_DEGREE_LATITUDE = 111_000;
const DEMO_SPEED_KMH = 350; // playback speed for a legible demo, not real-time travel
const BASE_SPEED_DEGREES_PER_SECOND = (DEMO_SPEED_KMH * 1000) / 3600 / METERS_PER_DEGREE_LATITUDE;

export function useRouteAnimation(geometry: RouteGeometry | undefined) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [position, setPosition] = useState<LatLng | null>(null);

  const frameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const distanceTraveledRef = useRef(0);

  const coordinates = useMemo(
    () => (geometry ? extractLineCoordinates(geometry) : []),
    [geometry],
  );
  const totalLength = useMemo(
    () =>
      coordinates.reduce(
        (sum, point, index) => (index === 0 ? 0 : sum + distanceBetween(coordinates[index - 1], point)),
        0,
      ),
    [coordinates],
  );

  const positionAtDistance = useCallback(
    (distance: number): LatLng | null => {
      if (coordinates.length < 2 || totalLength === 0) return null;
      const target = ((distance % totalLength) + totalLength) % totalLength;
      let covered = 0;
      for (let i = 1; i < coordinates.length; i++) {
        const segmentLength = distanceBetween(coordinates[i - 1], coordinates[i]);
        if (covered + segmentLength >= target || i === coordinates.length - 1) {
          const t = segmentLength === 0 ? 0 : (target - covered) / segmentLength;
          const [lngA, latA] = coordinates[i - 1];
          const [lngB, latB] = coordinates[i];
          return { latitude: latA + (latB - latA) * t, longitude: lngA + (lngB - lngA) * t };
        }
        covered += segmentLength;
      }
      return null;
    },
    [coordinates, totalLength],
  );

  const stopAnimationFrame = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    lastTimestampRef.current = null;
  }, []);

  useEffect(() => stopAnimationFrame, [geometry, stopAnimationFrame]);

  useEffect(() => {
    if (!isPlaying || coordinates.length < 2 || totalLength === 0) return;

    const step = (timestamp: number) => {
      if (lastTimestampRef.current === null) lastTimestampRef.current = timestamp;
      const deltaSeconds = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      distanceTraveledRef.current += deltaSeconds * BASE_SPEED_DEGREES_PER_SECOND * speed;
      const traveled = distanceTraveledRef.current % totalLength;
      setProgress(traveled / totalLength);
      setPosition(positionAtDistance(distanceTraveledRef.current));

      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return stopAnimationFrame;
  }, [isPlaying, speed, coordinates.length, totalLength, positionAtDistance, stopAnimationFrame]);

  const play = useCallback(() => {
    if (coordinates.length < 2) return;
    if (position === null) setPosition(positionAtDistance(distanceTraveledRef.current));
    setIsPlaying(true);
  }, [coordinates.length, position, positionAtDistance]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    distanceTraveledRef.current = 0;
    setProgress(0);
    setPosition(coordinates.length >= 2 ? positionAtDistance(0) : null);
  }, [coordinates.length, positionAtDistance]);

  return {
    isPlaying,
    speed,
    setSpeed,
    progress,
    position,
    canPlay: coordinates.length >= 2,
    play,
    pause,
    reset,
  };
}
