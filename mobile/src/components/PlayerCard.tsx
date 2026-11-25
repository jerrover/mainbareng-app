import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  Platform
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { THEME } from '../theme';
import { getPointGrade } from './RadarChart';

export interface PlayerCardProps {
  slot: number;
  name: string;
  role: string;
  ovr: number;
  creditScore: number;
  team: 'A' | 'B' | null;
  isHost?: boolean;
  isCurrentUser?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function PlayerCard({
  slot,
  name,
  role,
  ovr,
  creditScore,
  team,
  isHost,
  isCurrentUser,
  onPress,
  style
}: PlayerCardProps) {
  const isTeamA = team === 'A';
  const isTeamB = team === 'B';
  const teamColor = isTeamA ? '#38BDF8' : isTeamB ? '#F43F5E' : '#8A94A6';
  const avatarRing = isTeamA
    ? 'rgba(56, 189, 248, 0.5)'
    : isTeamB
    ? 'rgba(244, 63, 94, 0.5)'
    : 'rgba(138, 148, 166, 0.35)';
  const teamLabel = team ? `Tim ${team}` : 'Belum dibagi';

  const initials = name
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const slotStr = String(slot).padStart(2, '0');
  const ovrTier = getPointGrade(ovr);
  const creditColor = creditScore >= 90 ? '#C0C2B8' : THEME.colors.warning;

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        isCurrentUser && styles.currentUserBorder,
        style
      ]}
      activeOpacity={onPress ? 0.78 : 1}
      onPress={onPress}
    >
      {/* Short Team Top Accent Notch (28px) */}
      <View style={[styles.topNotch, { backgroundColor: teamColor }]} />

      {/* Ghost Jersey Slot Number */}
      <Text style={styles.ghostSlotText} pointerEvents="none">
        {slotStr}
      </Text>

      {/* Top Row: Avatar (Left) vs Sculptural OVR (Right) */}
      <View style={styles.topRow}>
        <View style={[styles.avatar, { borderColor: avatarRing }]}>
          <Text style={[styles.avatarText, { color: teamColor }]}>{initials}</Text>
        </View>

        <View style={styles.ovrBlock}>
          <Text style={styles.ovrValue}>{ovr}</Text>
          <Text style={styles.ovrLabel}>OVR · {ovrTier.grade}</Text>
        </View>
      </View>

      {/* Middle: Name + Inline Host/Self Tag + Role */}
      <View style={styles.identityBlock}>
        <View style={styles.nameRow}>
          <Text style={styles.playerName} numberOfLines={1}>
            {name}
          </Text>
          {isHost ? (
            <Text style={styles.hostInlineTag}>· Host</Text>
          ) : isCurrentUser ? (
            <Text style={styles.selfInlineTag}>· Kamu</Text>
          ) : null}
        </View>
        <Text style={styles.playerRole} numberOfLines={1}>
          {role || 'Flex Player'}
        </Text>
      </View>

      {/* Bottom Hairline Rail: Team Label + SVG Shield Credit Score */}
      <View style={styles.bottomRail}>
        <View style={styles.teamLabelRow}>
          <View style={[styles.teamDot, { backgroundColor: teamColor }]} />
          <Text style={[styles.teamLabelText, { color: teamColor }]}>
            {teamLabel}
          </Text>
        </View>

        <View style={styles.creditChip}>
          <Svg width={11} height={11} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
              stroke="#8A94A6"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={[styles.creditValue, { color: creditColor }]}>
            {creditScore}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    minWidth: 150,
    minHeight: 132,
    backgroundColor: '#141720',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    padding: 13,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative'
  },
  currentUserBorder: {
    borderColor: 'rgba(213, 255, 64, 0.45)',
    backgroundColor: 'rgba(213, 255, 64, 0.03)'
  },
  topNotch: {
    position: 'absolute',
    top: 0,
    left: 14,
    width: 28,
    height: 2.5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2
  },
  ghostSlotText: {
    position: 'absolute',
    bottom: -6,
    right: 6,
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 48,
    color: 'rgba(255, 255, 255, 0.035)',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1B1F2B',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 12,
    includeFontPadding: false
  },
  ovrBlock: {
    alignItems: 'flex-end'
  },
  ovrValue: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 21,
    color: '#FFFFFF',
    lineHeight: 23,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  ovrLabel: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 9.5,
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginTop: 1,
    includeFontPadding: false
  },

  identityBlock: {
    marginTop: 10
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  playerName: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    flexShrink: 1,
    includeFontPadding: false
  },
  hostInlineTag: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 10.5,
    color: THEME.colors.primary,
    flexShrink: 0,
    includeFontPadding: false
  },
  selfInlineTag: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10.5,
    color: THEME.colors.success,
    flexShrink: 0,
    includeFontPadding: false
  },
  playerRole: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    includeFontPadding: false
  },

  bottomRail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)'
  },
  teamLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  teamDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  teamLabelText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    includeFontPadding: false
  },
  creditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  creditValue: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  }
});
