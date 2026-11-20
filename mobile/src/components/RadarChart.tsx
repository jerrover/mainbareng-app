import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { THEME } from '../theme';

export interface RadarDataPoint {
  key: string;
  label: string; // e.g., 'TMW'
  name: string;  // e.g., 'Teamwork'
  value: number; // 0 - 100
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  maxValue?: number;
  levels?: number;
  accentColor?: string;
  onPressPoint?: (point: RadarDataPoint) => void;
}

export const getPointGrade = (val: number): { grade: 'S' | 'A' | 'B' | 'C' | 'D'; color: string } => {
  if (val >= 90) return { grade: 'S', color: '#F59E0B' }; // Gold / Amber
  if (val >= 80) return { grade: 'A', color: '#C084FC' }; // Purple / Violet
  if (val >= 70) return { grade: 'B', color: '#38BDF8' }; // Cyan / Sky Blue
  if (val >= 60) return { grade: 'C', color: '#34D399' }; // Mint / Emerald
  return { grade: 'D', color: '#94A3B8' };                // Muted Slate
};

export default function RadarChart({
  data,
  size = 270,
  maxValue = 100,
  levels = 4,
  accentColor = THEME.colors.primary,
  onPressPoint,
}: RadarChartProps) {
  const center = size / 2;
  const radius = size * 0.28; // ruang lega untuk circular badge & title luar
  const totalPoints = data.length;

  if (totalPoints < 3) {
    return null;
  }

  const angleSlice = (Math.PI * 2) / totalPoints;

  // Konversi polar (angle, r) ke kartesian (x, y)
  // Index 0 dimulai dari -Math.PI / 2 (-90 deg) agar tegak lurus di puncak
  const getCoordinates = (val: number, index: number, customR = radius) => {
    const angle = index * angleSlice - Math.PI / 2;
    const scaledR = (val / maxValue) * customR;
    const x = center + scaledR * Math.cos(angle);
    const y = center + scaledR * Math.sin(angle);
    return { x, y };
  };

  // 1. Grid Cincin Konsentris Pentagon (Web Structure)
  const gridRings = Array.from({ length: levels }).map((_, levelIndex) => {
    const factor = (levelIndex + 1) / levels;
    const pointsStr = data
      .map((_, i) => {
        const { x, y } = getCoordinates(maxValue * factor, i);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

    const isOuter = levelIndex === levels - 1;

    return (
      <Polygon
        key={`grid-ring-${levelIndex}`}
        points={pointsStr}
        stroke={isOuter ? 'rgba(192, 194, 184, 0.40)' : 'rgba(192, 194, 184, 0.16)'}
        strokeWidth={isOuter ? '1.5' : '1'}
        fill={isOuter ? 'rgba(255, 255, 255, 0.015)' : 'none'}
      />
    );
  });

  // 2. Garis Sumbu (Spokes) dari titik tengah ke tiap sudut pentagon
  const axisSpokes = data.map((_, i) => {
    const { x, y } = getCoordinates(maxValue, i);
    return (
      <Line
        key={`axis-spoke-${i}`}
        x1={center}
        y1={center}
        x2={x}
        y2={y}
        stroke="rgba(192, 194, 184, 0.25)"
        strokeWidth="1"
        strokeDasharray="2,3"
      />
    );
  });

  // 3. Poligon Data Pemain (Area Fill + Border Neon)
  const dataPolygonPoints = data
    .map((item, i) => {
      const { x, y } = getCoordinates(item.value, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // 4. Circular Grade Badges & Axis Titles (Aesthetic mirip game TFT / Esports)
  const axisElements = data.map((item, i) => {
    const badgeCoord = getCoordinates(maxValue * 1.24, i);
    const titleCoord = getCoordinates(maxValue * 1.58, i);
    const pointGrade = getPointGrade(item.value);

    return (
      <G
        key={`axis-elem-${item.key}`}
        onPress={() => onPressPoint && onPressPoint(item)}
      >
        {/* Title Sumbu */}
        <SvgText
          x={titleCoord.x}
          y={titleCoord.y + 3}
          fill={THEME.colors.textSecondary}
          fontSize="10"
          fontWeight="bold"
          fontFamily={THEME.typography.fonts.bold}
          textAnchor="middle"
        >
          {item.name}
        </SvgText>

        {/* Circular Badge Grade (S/A/B/C/D) */}
        <Circle
          cx={badgeCoord.x}
          cy={badgeCoord.y}
          r="9.5"
          stroke={pointGrade.color}
          strokeWidth="1.6"
          fill="rgba(15, 20, 25, 0.90)"
        />
        <SvgText
          x={badgeCoord.x}
          y={badgeCoord.y + 3.5}
          fill={pointGrade.color}
          fontSize="9.5"
          fontWeight="bold"
          fontFamily={THEME.typography.fonts.bold}
          textAnchor="middle"
        >
          {pointGrade.grade}
        </SvgText>
      </G>
    );
  });

  return (
    <View style={styles.chartWrapper}>
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Cincin Grid */}
        {gridRings}

        {/* Garis Jari-Jari */}
        {axisSpokes}

        {/* Area Nilai Poligon */}
        <Polygon
          points={dataPolygonPoints}
          fill="rgba(213, 255, 64, 0.16)"
          stroke={accentColor}
          strokeWidth="2"
        />

        {/* Titik Vertex (Node Bulat Bercahaya) */}
        {data.map((item, i) => {
          const { x, y } = getCoordinates(item.value, i);
          const pointGrade = getPointGrade(item.value);
          return (
            <Circle
              key={`vertex-${item.key}`}
              cx={x}
              cy={y}
              r="3.5"
              fill={THEME.colors.background}
              stroke={pointGrade.color}
              strokeWidth="2"
              onPress={() => onPressPoint && onPressPoint(item)}
            />
          );
        })}

        {/* Badges & Titles */}
        {axisElements}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});
