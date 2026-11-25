import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Rect, Line, Circle, Path, Polyline } from 'react-native-svg';
import { THEME } from '../theme';

export interface LobbyHeroHeaderProps {
  title: string;
  roomCode: string;
  status?: string;
  activityType?: string;
  kickoffStr: string;
  remainingStr: string;
  venueTitle: string;
  minCreditScore: number;
  fullTargetCostPerPlayer: number;
  venueTotalCost: number;
  filledSlots: number;
  totalSlots: number;
  onBack: () => void;
  onShare: () => void;
  onOpenMaps: () => void;
}

function SportWatermark({ activityType = '' }: { activityType?: string }) {
  const act = activityType.toLowerCase();
  const stroke = 'rgba(255, 255, 255, 0.075)';

  if (act.includes('badminton')) {
    return (
      <Svg width={190} height={190} viewBox="0 0 200 200" fill="none" style={styles.watermarkSvg}>
        <Rect x="15" y="15" width="170" height="170" stroke={stroke} strokeWidth="1.2" />
        <Line x1="32" y1="15" x2="32" y2="185" stroke={stroke} strokeWidth="1.2" />
        <Line x1="168" y1="15" x2="168" y2="185" stroke={stroke} strokeWidth="1.2" />
        <Line x1="15" y1="100" x2="185" y2="100" stroke={stroke} strokeWidth="1.2" strokeDasharray="4 4" />
        <Line x1="15" y1="70" x2="185" y2="70" stroke={stroke} strokeWidth="1.2" />
        <Line x1="15" y1="130" x2="185" y2="130" stroke={stroke} strokeWidth="1.2" />
        <Line x1="100" y1="15" x2="100" y2="70" stroke={stroke} strokeWidth="1.2" />
        <Line x1="100" y1="130" x2="100" y2="185" stroke={stroke} strokeWidth="1.2" />
      </Svg>
    );
  }

  if (act.includes('basket')) {
    return (
      <Svg width={190} height={190} viewBox="0 0 200 200" fill="none" style={styles.watermarkSvg}>
        <Rect x="15" y="15" width="170" height="170" stroke={stroke} strokeWidth="1.2" />
        <Circle cx="100" cy="100" r="30" stroke={stroke} strokeWidth="1.2" />
        <Path d="M 50 15 L 50 75 A 45 45 0 0 0 150 75 L 150 15" stroke={stroke} strokeWidth="1.2" />
        <Rect x="70" y="15" width="60" height="60" stroke={stroke} strokeWidth="1.2" />
        <Circle cx="100" cy="35" r="8" stroke={stroke} strokeWidth="1.2" />
      </Svg>
    );
  }

  // Default: Futsal / Mini Soccer pitch blueprint
  return (
    <Svg width={190} height={190} viewBox="0 0 200 200" fill="none" style={styles.watermarkSvg}>
      <Rect x="10" y="10" width="180" height="180" stroke={stroke} strokeWidth="1.2" />
      <Line x1="10" y1="100" x2="190" y2="100" stroke={stroke} strokeWidth="1.2" />
      <Circle cx="100" cy="100" r="32" stroke={stroke} strokeWidth="1.2" />
      <Circle cx="100" cy="100" r="2.5" fill="rgba(255,255,255,0.14)" />
      <Rect x="55" y="10" width="90" height="40" stroke={stroke} strokeWidth="1.2" />
      <Rect x="75" y="10" width="50" height="18" stroke={stroke} strokeWidth="1.2" />
      <Path d="M78 50 C78 62 122 62 122 50" stroke={stroke} strokeWidth="1.2" />
      <Rect x="55" y="150" width="90" height="40" stroke={stroke} strokeWidth="1.2" />
      <Rect x="75" y="172" width="50" height="18" stroke={stroke} strokeWidth="1.2" />
      <Path d="M78 150 C78 138 122 138 122 150" stroke={stroke} strokeWidth="1.2" />
    </Svg>
  );
}

function getActivityShortLabel(activityType: string = ''): string {
  const act = activityType.toLowerCase();
  if (act.includes('futsal')) return 'FUTSAL';
  if (act.includes('badminton')) return 'BADMINTON';
  if (act.includes('basket')) return 'BASKET';
  if (act.includes('mlbb')) return 'MLBB';
  return activityType ? activityType.toUpperCase() : 'MABAR';
}

function getStatusDisplay(status: string = 'OPEN') {
  switch (status) {
    case 'LOCKED':
      return { label: 'PENUH', color: THEME.colors.warning };
    case 'IN_PROGRESS':
      return { label: 'BERLANGSUNG', color: '#38BDF8' };
    case 'COMPLETED':
      return { label: 'SELESAI', color: THEME.colors.success };
    case 'CANCELLED':
      return { label: 'DIBATALKAN', color: '#FF6B6B' };
    case 'OPEN':
    default:
      return { label: 'TERBUKA', color: THEME.colors.primary };
  }
}

export default function LobbyHeroHeader({
  title,
  roomCode,
  status = 'OPEN',
  activityType,
  kickoffStr,
  remainingStr,
  venueTitle,
  minCreditScore,
  fullTargetCostPerPlayer,
  venueTotalCost,
  filledSlots,
  totalSlots,
  onBack,
  onShare,
  onOpenMaps
}: LobbyHeroHeaderProps) {
  const statusInfo = getStatusDisplay(status);
  const sportLabel = getActivityShortLabel(activityType);
  const formattedCost =
    venueTotalCost > 0
      ? fullTargetCostPerPlayer >= 1000 && fullTargetCostPerPlayer % 1000 === 0
        ? `Rp ${Math.round(fullTargetCostPerPlayer / 1000)}k`
        : `Rp ${fullTargetCostPerPlayer.toLocaleString('id-ID')}`
      : 'Gratis';
  const totalVenueFormatted =
    venueTotalCost >= 1000 && venueTotalCost % 1000 === 0
      ? `${Math.round(venueTotalCost / 1000)}k`
      : venueTotalCost.toLocaleString('id-ID');

  return (
    <View style={styles.wrapper}>
      {/* Minimalist Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={onBack}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Polyline
              points="15 18 9 12 15 6"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </TouchableOpacity>

        <TouchableOpacity style={styles.topCenter} activeOpacity={0.7} onPress={onShare}>
          <Text style={styles.roomCodeText}>#{roomCode}</Text>
          <View style={styles.statusDotSep} />
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.statusLabelText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7} onPress={onShare}>
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
            <Circle cx="18" cy="5" r="3" stroke="#C0C2B8" strokeWidth={1.75} />
            <Circle cx="6" cy="12" r="3" stroke="#C0C2B8" strokeWidth={1.75} />
            <Circle cx="18" cy="19" r="3" stroke="#C0C2B8" strokeWidth={1.75} />
            <Line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="#C0C2B8" strokeWidth={1.75} />
            <Line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="#C0C2B8" strokeWidth={1.75} />
          </Svg>
        </TouchableOpacity>
      </View>

      {/* Unified Editorial Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.watermarkWrap} pointerEvents="none">
          <SportWatermark activityType={activityType} />
        </View>

        {/* Eyebrow Schedule + Remaining */}
        <View style={styles.eyebrowRow}>
          <Text style={styles.eyebrowSchedule}>
            {sportLabel} · {kickoffStr.toUpperCase()}
          </Text>
          <Text
            style={[
              styles.eyebrowRemaining,
              status === 'COMPLETED' && { color: THEME.colors.success },
              status === 'CANCELLED' && { color: '#FF6B6B' }
            ]}
          >
            {status === 'COMPLETED' ? 'Match Selesai' : remainingStr}
          </Text>
        </View>

        {/* Match Title */}
        <Text style={styles.heroTitle} numberOfLines={2}>
          {title}
        </Text>

        {/* Venue & Maps Link (Seluruh baris tappable) */}
        <TouchableOpacity style={styles.venueRow} activeOpacity={0.7} onPress={onOpenMaps}>
          <View style={styles.venueLeft}>
            <View style={styles.venuePinWrap}>
              <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                  stroke="#8A94A6"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Circle cx="12" cy="10" r="3" stroke="#8A94A6" strokeWidth={1.8} />
              </Svg>
            </View>
            <Text style={styles.venueText} numberOfLines={2}>
              {venueTitle}
            </Text>
          </View>

          <View style={styles.mapsLinkBtn}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
              <Path
                d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"
                stroke={THEME.colors.primary}
                strokeWidth={1.9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Line x1="9" y1="3" x2="9" y2="18" stroke={THEME.colors.primary} strokeWidth={1.6} />
              <Line x1="15" y1="6" x2="15" y2="21" stroke={THEME.colors.primary} strokeWidth={1.6} />
            </Svg>
            <Text style={styles.mapsLinkText}>Maps</Text>
            <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
              <Line
                x1="7"
                y1="17"
                x2="17"
                y2="7"
                stroke={THEME.colors.primary}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
              <Polyline
                points="7 7 17 7 17 17"
                stroke={THEME.colors.primary}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        </TouchableOpacity>

        {/* Swiss Grid 3-Column Telemetry Strip */}
        <View style={styles.telemetryGrid}>
          <View style={styles.telemetryCell}>
            <Text style={styles.telemetryValue}>{minCreditScore}+</Text>
            <Text style={styles.telemetryLabel}>Min. Credit</Text>
          </View>

          <View style={[styles.telemetryCell, styles.telemetryCellMiddle]}>
            <Text
              style={[
                styles.telemetryValue,
                { color: venueTotalCost > 0 ? THEME.colors.primary : THEME.colors.success }
              ]}
            >
              {formattedCost}
            </Text>
            <Text style={styles.telemetryLabel}>
              {venueTotalCost > 0 ? `Per Org · ${totalVenueFormatted}` : 'Biaya Sewa'}
            </Text>
          </View>

          <View style={styles.telemetryCell}>
            <Text style={styles.telemetryValue}>
              {filledSlots}
              <Text style={styles.telemetryTotal}> / {totalSlots}</Text>
            </Text>
            <Text style={styles.telemetryLabel}>Pemain</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 18
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  topCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  roomCodeText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    letterSpacing: 1,
    includeFontPadding: false
  },
  statusDotSep: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    marginHorizontal: 2
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusLabelText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10.5,
    letterSpacing: 0.7,
    includeFontPadding: false
  },

  heroCard: {
    backgroundColor: '#141720',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    padding: 18,
    overflow: 'hidden',
    position: 'relative'
  },
  watermarkWrap: {
    position: 'absolute',
    right: -34,
    bottom: -34
  },
  watermarkSvg: {
    opacity: 1
  },
  eyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  eyebrowSchedule: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 11,
    color: THEME.colors.primary,
    letterSpacing: 0.9,
    includeFontPadding: false
  },
  eyebrowRemaining: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.warning,
    includeFontPadding: false
  },
  heroTitle: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 21,
    color: '#FFFFFF',
    letterSpacing: -0.4,
    lineHeight: 26,
    includeFontPadding: false
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 10
  },
  venueLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6
  },
  venuePinWrap: {
    marginTop: 2
  },
  venueText: {
    flex: 1,
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  mapsLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(213, 255, 64, 0.35)',
    backgroundColor: 'rgba(213, 255, 64, 0.12)'
  },
  mapsLinkText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.primary,
    includeFontPadding: false
  },

  telemetryGrid: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)'
  },
  telemetryCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  telemetryCellMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6
  },
  telemetryValue: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 16,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  telemetryTotal: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textMuted
  },
  telemetryLabel: {
    fontFamily: THEME.typography.fonts.medium,
    fontSize: 10.5,
    color: THEME.colors.textMuted,
    marginTop: 3,
    includeFontPadding: false
  }
});
