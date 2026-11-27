import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../theme';
import CustomButton from './CustomButton';
import type {
  ApiReviewTarget,
  ReviewAttendance,
  ReviewLevelFit,
  ReviewSportsmanship,
  SubmitReviewItem
} from '../services/api';

export interface RatingModalProps {
  visible: boolean;
  sessionTitle?: string;
  targets: ApiReviewTarget[];
  loading?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (reviews: SubmitReviewItem[]) => void;
}

interface DraftEntry {
  attendance: ReviewAttendance | null;
  sportsmanship: ReviewSportsmanship | null;
  level_fit: ReviewLevelFit | null;
  reasons: string[];
  notes: string;
  notesOpen: boolean;
}

// Warna tim mengikuti PlayerCard & LobbyHeroHeader. Lokal karena theme.ts dibekukan.
const TEAM_COLOR = { A: '#38BDF8', B: '#F43F5E', NONE: '#8A94A6' } as const;

const ATTENDANCE_OPTIONS: Array<{ value: ReviewAttendance; label: string; color: string }> = [
  { value: 'on_time', label: 'Tepat Waktu', color: THEME.colors.success },
  { value: 'late', label: 'Telat', color: THEME.colors.warning },
  { value: 'no_show', label: 'Mangkir', color: THEME.colors.danger }
];

const SPORTSMANSHIP_OPTIONS: Array<{
  value: ReviewSportsmanship;
  label: string;
  color: string;
}> = [
  { value: 'poor', label: 'Kurang', color: THEME.colors.danger },
  { value: 'okay', label: 'Standar', color: THEME.colors.textSecondary },
  { value: 'good', label: 'Asik', color: THEME.colors.success }
];

const LEVEL_OPTIONS: Array<{ value: ReviewLevelFit; label: string }> = [
  { value: 'lower', label: 'Di bawah' },
  { value: 'accurate', label: 'Pas' },
  { value: 'higher', label: 'Di atas' }
];

const REASON_TAGS = ['Nggak sportif', 'Toxic', 'Sering telat', 'Nggak fokus main'];

function makeDefaultDraft(): DraftEntry {
  return {
    attendance: null,
    sportsmanship: null,
    level_fit: null,
    reasons: [],
    notes: '',
    notesOpen: false
  };
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function RatingModal({
  visible,
  sessionTitle,
  targets,
  loading = false,
  submitting = false,
  onClose,
  onSubmit
}: RatingModalProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Record<string, DraftEntry>>({});

  useEffect(() => {
    if (!visible) return;
    const next: Record<string, DraftEntry> = {};
    targets.forEach((t) => {
      next[t.participant_id] = makeDefaultDraft();
    });
    setDraft(next);
  }, [visible, targets]);

  const ratedCount = useMemo(
    () =>
      Object.values(draft).filter(
        (d) => d.attendance !== null && d.sportsmanship !== null && d.level_fit !== null
      ).length,
    [draft]
  );

  const allRated = targets.length > 0 && ratedCount === targets.length;

  const update = (id: string, patch: Partial<DraftEntry>) => {
    setDraft((prev) => ({ ...prev, [id]: { ...(prev[id] || makeDefaultDraft()), ...patch } }));
  };

  const toggleReason = (id: string, tag: string) => {
    setDraft((prev) => {
      const entry = prev[id] || makeDefaultDraft();
      const has = entry.reasons.includes(tag);
      return {
        ...prev,
        [id]: {
          ...entry,
          reasons: has ? entry.reasons.filter((r) => r !== tag) : [...entry.reasons, tag]
        }
      };
    });
  };

  const handleSubmit = () => {
    if (!allRated) return;
    const reviews: SubmitReviewItem[] = targets.map((t) => {
      const entry = draft[t.participant_id] || makeDefaultDraft();
      const reasonPrefix = entry.reasons.length > 0 ? `[Kurang: ${entry.reasons.join(', ')}] ` : '';
      const composed = `${reasonPrefix}${entry.notes.trim()}`.trim();
      return {
        target_participant_id: t.participant_id,
        attendance: entry.attendance as ReviewAttendance,
        sportsmanship: entry.sportsmanship as ReviewSportsmanship,
        level_fit: entry.level_fit as ReviewLevelFit,
        notes: composed.length > 0 ? composed.slice(0, 500) : null,
        is_guest: t.is_guest
      };
    });
    onSubmit(reviews);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        testID="rating-overlay"
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View testID="rating-sheet" style={styles.sheet}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <View style={styles.eyebrowRow}>
                <View style={styles.voltDot} />
                <Text style={styles.eyebrow}>PASCA-SESI · CREDIT SCORE</Text>
              </View>
              <Text style={styles.title}>Beri Rating &amp; Sportivitas</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {sessionTitle || 'Sesi Mabar'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Tutup penilaian"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryCol}>
              <Text style={styles.telemetryLabel}>PESERTA</Text>
              <Text style={styles.telemetryValue}>{targets.length}</Text>
            </View>
            <View style={[styles.telemetryCol, styles.telemetryColMid]}>
              <Text style={styles.telemetryLabel}>SUDAH DINILAI</Text>
              <Text style={[styles.telemetryValue, ratedCount > 0 && styles.telemetryValueActive]}>
                {ratedCount}
              </Text>
            </View>
            <View style={[styles.telemetryCol, styles.telemetryColRight]}>
              <Text style={styles.telemetryLabel}>SISA</Text>
              <Text style={styles.telemetryValue}>{Math.max(targets.length - ratedCount, 0)}</Text>
            </View>
          </View>

          <View style={styles.body}>
          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Memuat peserta…</Text>
              <Text style={styles.emptyBody}>Sebentar ya, lagi memuat daftar teman main kamu.</Text>
            </View>
          ) : targets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Belum ada yang bisa dinilai</Text>
              <Text style={styles.emptyBody}>
                Semua peserta sesi ini sudah kamu nilai, atau belum ada peserta lain yang bergabung.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {targets.map((target, index) => {
                const entry = draft[target.participant_id] || makeDefaultDraft();
                const teamColor = target.assigned_team
                  ? TEAM_COLOR[target.assigned_team === 'Team A' ? 'A' : 'B']
                  : TEAM_COLOR.NONE;
                const slotNumber = String(index + 1).padStart(2, '0');

                return (
                  <View key={target.participant_id} style={styles.playerCard}>
                    <View style={[styles.topNotch, { backgroundColor: teamColor }]} />
                    <Text style={styles.ghostSlot} pointerEvents="none">
                      {slotNumber}
                    </Text>

                    <View style={styles.playerHeader}>
                      <View style={[styles.avatar, { borderColor: teamColor }]}>
                        <Text style={styles.avatarText}>{initialsOf(target.display_name)}</Text>
                      </View>
                      <View style={styles.playerIdentity}>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {target.display_name}
                        </Text>
                        <Text style={styles.playerMeta}>
                          {target.is_guest ? 'Tamu' : 'Peserta sesi'}
                        </Text>
                      </View>
                      {target.assigned_team ? (
                        <View
                          style={[
                            styles.teamPill,
                            {
                              backgroundColor: teamColor + '1F',
                              borderColor: teamColor + '99'
                            }
                          ]}
                        >
                          <Text style={[styles.teamPillText, { color: teamColor }]}>
                            {target.assigned_team === 'Team A' ? 'TIM A' : 'TIM B'}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.fieldLabel}>KEHADIRAN</Text>
                    <View style={styles.chipRow}>
                      {ATTENDANCE_OPTIONS.map((option) => {
                        const active = entry.attendance === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              active && {
                                backgroundColor: option.color + '24',
                                borderColor: option.color
                              }
                            ]}
                            onPress={() => update(target.participant_id, { attendance: option.value })}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                active && {
                                  color: option.color,
                                  fontFamily: THEME.typography.fonts.bold
                                }
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.fieldLabel}>SPORTIVITAS</Text>
                    <View style={styles.chipRow}>
                      {SPORTSMANSHIP_OPTIONS.map((option) => {
                        const active = entry.sportsmanship === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.chip,
                              active && {
                                backgroundColor: option.color + '24',
                                borderColor: option.color
                              }
                            ]}
                            onPress={() =>
                              update(target.participant_id, { sportsmanship: option.value })
                            }
                            accessibilityRole="button"
                            accessibilityLabel={option.label}
                            accessibilityState={{ selected: active }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                active && {
                                  color: option.color,
                                  fontFamily: THEME.typography.fonts.bold
                                }
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {entry.sportsmanship === 'poor' ? (
                      <View style={styles.reasonWrap}>
                        <Text style={styles.reasonLabel}>KENAPA? (OPSIONAL)</Text>
                        <View style={styles.reasonRow}>
                          {REASON_TAGS.map((tag) => {
                            const active = entry.reasons.includes(tag);
                            return (
                              <TouchableOpacity
                                key={tag}
                                style={[styles.reasonChip, active && styles.reasonChipActive]}
                                onPress={() => toggleReason(target.participant_id, tag)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: active }}
                              >
                                <Text
                                  style={[styles.reasonChipText, active && styles.reasonChipTextActive]}
                                >
                                  {tag}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}

                    <Text style={styles.fieldLabel}>LEVEL MAIN</Text>
                    <View style={styles.chipRow}>
                      {LEVEL_OPTIONS.map((option) => {
                        const active = entry.level_fit === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[styles.chip, active && styles.chipLevelActive]}
                            onPress={() => update(target.participant_id, { level_fit: option.value })}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text style={[styles.chipText, active && styles.chipLevelTextActive]}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {entry.notesOpen ? (
                      <TextInput
                        style={styles.notesInput}
                        value={entry.notes}
                        onChangeText={(value) => update(target.participant_id, { notes: value })}
                        placeholder="Catatan buat dia (opsional)"
                        placeholderTextColor={THEME.colors.textMuted}
                        maxLength={420}
                        multiline
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => update(target.participant_id, { notesOpen: true })}
                        accessibilityRole="button"
                      >
                        <Text style={styles.notesToggle}>+ Tambah catatan</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
          </View>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
            {!allRated && targets.length > 0 ? (
              <Text style={styles.footerHint}>
                Lengkapi kehadiran, sportivitas &amp; level main semua peserta dulu
              </Text>
            ) : null}
            <CustomButton
              label={
                loading
                  ? 'Memuat…'
                  : targets.length > 0
                  ? `Kirim Penilaian (${ratedCount}/${targets.length})`
                  : 'Tutup'
              }
              onPress={targets.length > 0 ? handleSubmit : onClose}
              disabled={submitting || loading || (targets.length > 0 && !allRated)}
              loading={submitting}
              fullWidth
              style={
                !loading && targets.length > 0 && !allRated ? styles.submitMuted : undefined
              }
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5, 7, 10, 0.85)'
  },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    flexDirection: 'column',
    backgroundColor: '#161922',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(192, 194, 184, 0.18)',
    borderBottomWidth: 0,
    paddingTop: 10
  },
  dragHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    marginBottom: 14
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    gap: 12
  },
  headerText: {
    flex: 1
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7
  },
  voltDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: THEME.colors.primary
  },
  eyebrow: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  title: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 21,
    letterSpacing: -0.4,
    lineHeight: 26,
    color: '#FFFFFF',
    marginTop: 5,
    includeFontPadding: false
  },
  subtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12.5,
    color: THEME.colors.textSecondary,
    marginTop: 3,
    includeFontPadding: false
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1B1F2B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeIcon: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  telemetryGrid: {
    flexDirection: 'row',
    marginHorizontal: THEME.spatial.screenPaddingHorizontal,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)'
  },
  telemetryCol: {
    flex: 1
  },
  telemetryColMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12
  },
  telemetryColRight: {
    paddingLeft: 12
  },
  telemetryLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  telemetryValue: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 20,
    color: '#FFFFFF',
    marginTop: 3,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  telemetryValueActive: {
    color: THEME.colors.primary
  },
  body: {
    flexGrow: 1,
    flexShrink: 1
  },
  list: {
    marginTop: 14,
    flexGrow: 1,
    flexShrink: 1
  },
  listContent: {
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingBottom: 28,
    gap: 12
  },
  playerCard: {
    backgroundColor: '#141720',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderTopColor: 'rgba(255, 255, 255, 0.14)',
    padding: 14,
    gap: 9,
    overflow: 'hidden',
    position: 'relative'
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
  ghostSlot: {
    position: 'absolute',
    top: -12,
    right: 4,
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 44,
    letterSpacing: -2,
    color: 'rgba(255, 255, 255, 0.03)',
    fontVariant: ['tabular-nums'],
    includeFontPadding: false
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
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
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  playerIdentity: {
    flex: 1
  },
  teamPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1
  },
  teamPillText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.6,
    includeFontPadding: false
  },
  playerName: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  playerMeta: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    includeFontPadding: false
  },
  fieldLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: THEME.colors.textMuted,
    marginTop: 3,
    includeFontPadding: false
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8
  },
  chip: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#1B1F2B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  chipText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  chipLevelActive: {
    backgroundColor: THEME.colors.text,
    borderColor: THEME.colors.text
  },
  chipLevelTextActive: {
    color: THEME.colors.textOnPrimary,
    fontFamily: THEME.typography.fonts.bold
  },
  reasonWrap: {
    gap: 6,
    paddingTop: 2
  },
  reasonLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9.5,
    letterSpacing: 0.7,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  reasonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  reasonChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1B1F2B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  reasonChipActive: {
    backgroundColor: 'rgba(255, 59, 48, 0.18)',
    borderColor: THEME.colors.danger
  },
  reasonChipText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  reasonChipTextActive: {
    color: THEME.colors.danger
  },
  notesInput: {
    minHeight: 58,
    borderRadius: 10,
    backgroundColor: '#1B1F2B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: THEME.colors.text,
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12.5,
    lineHeight: 18,
    textAlignVertical: 'top'
  },
  notesToggle: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11.5,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 44,
    gap: 6
  },
  emptyTitle: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 16,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  emptyBody: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 12.5,
    lineHeight: 19,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    includeFontPadding: false
  },
  submitMuted: {
    backgroundColor: '#1B1F2B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.09)',
    opacity: 1
  },
  footerHint: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    textAlign: 'center',
    marginBottom: 8,
    includeFontPadding: false
  },
  footer: {
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: '#161922'
  }
});
