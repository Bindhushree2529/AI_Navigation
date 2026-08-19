import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";

interface Detection {
  label: string;
  confidence: number;
  distanceM?: number;
  boundingBox?: { x1: number; y1: number; x2: number; y2: number };
  category: string;
}

interface Props {
  detections: Detection[];
}

const CATEGORY_COLORS: Record<string, string> = {
  PERSON: "#3b82f6",
  VEHICLE: "#f59e0b",
  OBSTACLE: "#8b5cf6",
  STAIRCASE: "#06b6d4",
  TRAFFIC_SIGNAL: "#22c55e",
  HAZARD: "#ef4444",
};

export function DetectionOverlay({ detections }: Props) {
  const { width, height } = useWindowDimensions();

  if (!detections.length) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
      {/* Detection list at bottom */}
      <View style={styles.list}>
        {detections.slice(0, 4).map((d, i) => (
          <View
            key={i}
            style={[styles.chip, { borderColor: CATEGORY_COLORS[d.category] ?? "#64748b" }]}
          >
            <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[d.category] ?? "#64748b" }]} />
            <Text style={styles.chipText}>
              {d.label}
              {d.distanceM ? ` · ${d.distanceM}m` : ""}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    position: "absolute",
    bottom: 130,
    left: 16,
    right: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
