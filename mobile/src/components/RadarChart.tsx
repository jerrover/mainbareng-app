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
  if (val >= 90) return { grade: 'S', color: '#F59E0B' };
  if (val >= 80) return { grade: 'A', color: '#C084FC' };
  if (val >= 70) return { grade: 'B', color: '#38BDF8' };
  if (val >= 60) return { grade: 'C', color: '#34D399' };
  return { grade: 'D', color: '#94A3B8' };
};

const VB_WIDTH = 310;
const VB_HEIGHT = 236;
const CENTER_X = 155;
const CENTER_Y = 118;
const RADIUS = 76;

export default function RadarChart({
  data,
  size = 310,
  maxValue = 100,
  levels = 3,
  accentColor = THEME.colors.primary,
  onPressPoint,
}: RadarChartProps) {
  const totalPoints = data.length;
  if (totalPoints < 3) {
    return null;
  }

  const angleSlice = (Math.PI * 2) / totalPoints;

  const getCoordinates = (val: number, index: number, customR = RADIUS) => {
    const angle = index * angleSlice - Math.PI / 2;
    const scaledR = (val / maxValue) * customR;
    return {
      x: CENTER_X + scaledR * Math.cos(angle),
      y: CENTER_Y + scaledR * Math.sin(angle),
    };
  };

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
        stroke={isOuter ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.07)'}
        strokeWidth="1"
        fill="none"
      />
    );
  });

  const axisSpokes = data.map((_, i) => {
    const { x, y } = getCoordinates(maxValue, i);
    return (
      <Line
        key={`axis-spoke-${i}`}
        x1={CENTER_X}
        y1={CENTER_Y}
        x2={x}
        y2={y}
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth="1"
      />
    );
  });

  const dataPolygonPoints = data
    .map((item, i) => {
      const { x, y } = getCoordinates(item.value, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // Label placement per vertex around the pentagon (full names + inline numeric score)
  const getLabelLayout = (index: number) => {
    const angle = index * angleSlice - Math.PI / 2;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const edgePt = getCoordinates(maxValue, index);

    if (Math.abs(cosA) < 0.2 && sinA < 0) {
      // Top vertex
      return { x: edgePt.x, yName: edgePt.y - 26, anchor: 'middle' as const };
    }
    if (cosA > 0.4 && sinA < 0.2) {
      // Upper-right vertex
      return { x: edgePt.x + 10, yName: edgePt.y - 4, anchor: 'start' as const };
    }
    if (cosA < -0.4 && sinA < 0.2) {
      // Upper-left vertex
      return { x: edgePt.x - 10, yName: edgePt.y - 4, anchor: 'end' as const };
    }
    // Bottom vertices
    return {
      x: edgePt.x + (cosA > 0 ? 8 : -8),
      yName: edgePt.y + 18,
      anchor: 'middle' as const,
    };
  };

  const chartHeight = Math.round((size * VB_HEIGHT) / VB_WIDTH);

  return (
    <View style={styles.chartWrapper}>
      <Svg width={size} height={chartHeight} viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}>
        {gridRings}
        {axisSpokes}

        <Polygon
          points={dataPolygonPoints}
          fill="rgba(213, 255, 64, 0.12)"
          stroke={accentColor}
          strokeWidth="2"
        />

        {data.map((item, i) => {
          const { x, y } = getCoordinates(item.value, i);
          return (
            <Circle
              key={`vertex-${item.key}`}
              cx={x}
              cy={y}
              r="3"
              fill={accentColor}
              onPress={() => onPressPoint && onPressPoint(item)}
            />
          );
        })}

        {data.map((item, i) => {
          const layout = getLabelLayout(i);
          const isTopScore = item.value >= 90;
          return (
            <G key={`label-${item.key}`} onPress={() => onPressPoint && onPressPoint(item)}>
              <SvgText
                x={layout.x}
                y={layout.yName}
                fill={THEME.colors.textSecondary}
                fontSize="10"
                fontFamily={THEME.typography.fonts.semiBold}
                textAnchor={layout.anchor}
              >
                {item.name}
              </SvgText>
              <SvgText
                x={layout.x}
                y={layout.yName + 15}
                fill={isTopScore ? accentColor : THEME.colors.text}
                fontSize="12"
                fontFamily={THEME.typography.fonts.extraBold}
                textAnchor={layout.anchor}
              >
                {item.value}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
