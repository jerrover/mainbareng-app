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
import { THEME } from '../theme';
import { getPointGrade } from './RadarChart';

export interface PlayerCardProps {
  slot: number;
  name: string;
  role: string;
  ovr: number;
  creditScore: number;
  team: 'A' | 'B';
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
  const teamColor = isTeamA ? '#38BDF8' : '#F43F5E';
  const teamBg = isTeamA ? 'rgba(56, 189, 248, 0.12)' : 'rgba(244, 63, 94, 0.12)';
  const teamBorder = isTeamA ? 'rgba(56, 189, 248, 0.35)' : 'rgba(244, 63, 94, 0.35)';

  const initials = name
    .trim()
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const ovrTier = getPointGrade(ovr);

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        { borderTopColor: teamColor },
        isCurrentUser && styles.currentUserBorder,
        style
      ]}
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
    >
      {/* Top Header: Slot Tag & Team Badge */}
      <View style={styles.headerRow}>
        <View style={styles.slotPill}>
          <Text style={styles.slotText}>#{slot}</Text>
        </View>

        <View style={[styles.teamBadge, { backgroundColor: teamBg, borderColor: teamBorder }]}>
          <Text style={[styles.teamBadgeText, { color: teamColor }]}>
            {isTeamA ? '🔵 TIM A' : '🔴 TIM B'}
          </Text>
        </View>
      </View>

      {/* Center: Avatar & Player Info */}
      <View style={styles.playerInfoRow}>
        <View style={[styles.avatar, { borderColor: teamColor }]}>
          <Text style={[styles.avatarText, { color: teamColor }]}>{initials}</Text>
        </View>

        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName} numberOfLines={1}>
              {name}
            </Text>
            {isHost && (
              <View style={styles.hostBadge}>
                <Text style={styles.hostBadgeText}>HOST</Text>
              </View>
            )}
          </View>
          <Text style={styles.playerRole} numberOfLines={1}>
            {role || 'Flex Player'}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Bottom Metrics: OVR Tier + Credit Score */}
      <View style={styles.metricsRow}>
        {/* OVR Chip */}
        <View
          style={[
            styles.ovrChip,
            {
              backgroundColor: `${ovrTier.color}15`,
              borderColor: `${ovrTier.color}40`
            }
          ]}
        >
          <Text style={[styles.ovrNumber, { color: ovrTier.color }]}>
            {ovr}{' '}
            <Text style={styles.ovrTierLetter}>({ovrTier.grade})</Text>
          </Text>
        </View>

        {/* Credit Score Shield */}
        <View style={styles.creditChip}>
          <Text style={styles.creditIcon}>🛡️</Text>
          <Text
            style={[
              styles.creditValue,
              { color: creditScore >= 90 ? THEME.colors.success : THEME.colors.warning }
            ]}
          >
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
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderTopWidth: 3,
    padding: 10,
    justifyContent: 'space-between'
  },
  currentUserBorder: {
    borderColor: THEME.colors.primary,
    backgroundColor: 'rgba(213, 255, 64, 0.03)'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  slotPill: {
    backgroundColor: THEME.colors.cardElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  slotText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  teamBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.8
  },
  teamBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 8.5,
    letterSpacing: 0.3,
    includeFontPadding: false
  },
  playerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  avatarText: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
    fontWeight: '700',
    fontSize: 11,
    includeFontPadding: false
  },
  nameBlock: {
    flex: 1
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  playerName: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    flexShrink: 1,
    includeFontPadding: false
  },
  hostBadge: {
    backgroundColor: 'rgba(213, 255, 64, 0.18)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3
  },
  hostBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 7.5,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  playerRole: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 10,
    color: THEME.colors.textMuted,
    marginTop: 1,
    includeFontPadding: false
  },
  cardDivider: {
    height: 1,
    backgroundColor: THEME.colors.cardBorder,
    marginVertical: 4
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  ovrChip: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 5,
    borderWidth: 1
  },
  ovrNumber: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    includeFontPadding: false
  },
  ovrTierLetter: {
    fontSize: 9,
    fontFamily: THEME.typography.fonts.bold
  },
  creditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  creditIcon: {
    fontSize: 10
  },
  creditValue: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10.5,
    includeFontPadding: false
  }
});
