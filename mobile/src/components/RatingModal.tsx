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
import StatusBadge from './StatusBadge';
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
  attendance: ReviewAttendance;
  sportsmanship: ReviewSportsmanship;
  level_fit: ReviewLevelFit;
  notes: string;
  notesOpen: boolean;
}

const ATTENDANCE_OPTIONS: Array<{ value: ReviewAttendance; label: string }> = [
  { value: 'on_time', label: 'Tepat Waktu' },
  { value: 'late', label: 'Telat' },
  { value: 'no_show', label: 'Mangkir' }
];

const SPORTSMANSHIP_OPTIONS: Array<{ value: ReviewSportsmanship; label: string }> = [
  { value: 'poor', label: 'Jelek' },
  { value: 'okay', label: 'Biasa' },
  { value: 'good', label: 'Bagus' }
];

const LEVEL_OPTIONS: Array<{ value: ReviewLevelFit; label: string }> = [
  { value: 'lower', label: 'Di bawah' },
  { value: 'accurate', label: 'Pas' },
  { value: 'higher', label: 'Di atas' }
];

function makeDefaultDraft(): DraftEntry {
  return {
    attendance: 'on_time',
    sportsmanship: 'okay',
    level_fit: 'accurate',
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

  const ratedCount = useMemo(() => Object.keys(draft).length, [draft]);

  const update = (id: string, patch: Partial<DraftEntry>) => {
    setDraft((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || makeDefaultDraft()), ...patch }
    }));
  };

  const handleSubmit = () => {
    const reviews: SubmitReviewItem[] = targets.map((t) => {
      const entry = draft[t.participant_id] || makeDefaultDraft();
      const notes = entry.notes.trim();
      return {
        target_participant_id: t.participant_id,
        attendance: entry.attendance,
        sportsmanship: entry.sportsmanship,
        level_fit: entry.level_fit,
        notes: notes.length > 0 ? notes : null,
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
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>PASCA-SESI · CREDIT SCORE</Text>
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

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              Nilai teman main lu dengan jujur — penilaian ini yang menaikkan atau menurunkan
              Credit Score mereka.
            </Text>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Memuat peserta…</Text>
              <Text style={styles.emptyBody}>Sebentar ya, lagi ngambil daftar teman main lu.</Text>
            </View>
          ) : targets.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🛡️</Text>
              <Text style={styles.emptyTitle}>Belum ada yang bisa dinilai</Text>
              <Text style={styles.emptyBody}>
                Semua peserta sesi ini sudah lu nilai, atau belum ada peserta lain yang join.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {targets.map((target) => {
                const entry = draft[target.participant_id] || makeDefaultDraft();
                return (
                  <View key={target.participant_id} style={styles.playerCard}>
                    <View style={styles.playerHeader}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initialsOf(target.display_name)}</Text>
                      </View>
                      <View style={styles.playerIdentity}>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {target.display_name}
                        </Text>
                        <Text style={styles.playerMeta}>
                          {target.is_guest
                            ? 'Tamu'
                            : target.assigned_team
                            ? 'Peserta sesi'
                            : 'Tim belum dibagi'}
                        </Text>
                      </View>
                      {target.assigned_team ? (
                        <StatusBadge
                          label={target.assigned_team === 'Team A' ? 'TIM A' : 'TIM B'}
                          variant={target.assigned_team === 'Team A' ? 'brand' : 'accent'}
                          size="sm"
                        />
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
                              active && styles.chipActive,
                              active && option.value === 'late' && styles.chipLate,
                              active && option.value === 'no_show' && styles.chipNoShow
                            ]}
                            onPress={() => update(target.participant_id, { attendance: option.value })}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                active && styles.chipTextActive,
                                active && option.value === 'late' && styles.chipTextLate,
                                active && option.value === 'no_show' && styles.chipTextNoShow
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={styles.fieldLabel}>SPORTIVITAS</Text>
                    <View style={styles.ratingRow}>
                      <View style={styles.stars}>
                        {SPORTSMANSHIP_OPTIONS.map((option, index) => {
                          const selectedIndex = SPORTSMANSHIP_OPTIONS.findIndex(
                            (o) => o.value === entry.sportsmanship
                          );
                          const active = index <= selectedIndex;
                          return (
                            <TouchableOpacity
                              key={option.value}
                              style={styles.starBtn}
                              onPress={() =>
                                update(target.participant_id, { sportsmanship: option.value })
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`${index + 1} bintang, ${option.label}`}
                              accessibilityState={{ selected: active }}
                            >
                              <Text style={[styles.star, active && styles.starActive]}>★</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={styles.ratingLabel}>
                        {SPORTSMANSHIP_OPTIONS.find((o) => o.value === entry.sportsmanship)?.label}
                        <Text style={styles.ratingScale}>  / 3</Text>
                      </Text>
                    </View>

                    <Text style={styles.fieldLabel}>LEVEL MAIN (OPSIONAL)</Text>
                    <View style={styles.chipRow}>
                      {LEVEL_OPTIONS.map((option) => {
                        const active = entry.level_fit === option.value;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[styles.chip, active && styles.chipActive]}
                            onPress={() => update(target.participant_id, { level_fit: option.value })}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
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
                        maxLength={500}
                        multiline
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => update(target.participant_id, { notesOpen: true })}
                        accessibilityRole="button"
                      >
                        <Text style={styles.notesToggle}>＋ Tambah catatan (opsional)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
            <CustomButton
              label={
                loading ? 'Memuat…' : targets.length > 0 ? `Kirim Penilaian (${ratedCount})` : 'Tutup'
              }
              onPress={targets.length > 0 ? handleSubmit : onClose}
              loading={submitting}
              disabled={submitting}
              fullWidth
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
    backgroundColor: THEME.colors.overlay
  },
  sheet: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.radius.xl,
    borderTopRightRadius: THEME.radius.xl,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingTop: 8
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.borderStrong,
    marginBottom: 8
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
  eyebrow: {
    ...THEME.typography.micro,
    color: THEME.colors.textMuted
  },
  title: {
    ...THEME.typography.h2,
    color: THEME.colors.text,
    marginTop: 4
  },
  subtitle: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textSecondary,
    marginTop: 2
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeIcon: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 15,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  notice: {
    marginHorizontal: THEME.spatial.screenPaddingHorizontal,
    marginTop: 12,
    padding: 12,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.primarySoft,
    borderWidth: 1,
    borderColor: THEME.colors.primaryBorder
  },
  noticeText: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.text
  },
  list: {
    marginTop: 12,
    flexGrow: 0,
    flexShrink: 1
  },
  listContent: {
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingBottom: 24,
    gap: 12
  },
  playerCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 14,
    gap: 10
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  playerIdentity: {
    flex: 1
  },
  playerName: {
    ...THEME.typography.h3,
    color: THEME.colors.text
  },
  playerMeta: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted,
    marginTop: 2
  },
  fieldLabel: {
    ...THEME.typography.micro,
    color: THEME.colors.textMuted,
    marginTop: 2
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  chip: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chipActive: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: THEME.colors.primaryBorder
  },
  chipLate: {
    backgroundColor: THEME.colors.warningSoft,
    borderColor: THEME.colors.warningBorder
  },
  chipNoShow: {
    backgroundColor: THEME.colors.dangerSoft,
    borderColor: THEME.colors.dangerBorder
  },
  chipText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  chipTextActive: {
    color: THEME.colors.primary
  },
  chipTextLate: {
    color: THEME.colors.warning
  },
  chipTextNoShow: {
    color: THEME.colors.danger
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginLeft: -8
  },
  starBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  star: {
    fontSize: 26,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  starActive: {
    color: THEME.colors.primary
  },
  ratingLabel: {
    ...THEME.typography.subtitle,
    color: THEME.colors.text
  },
  ratingScale: {
    ...THEME.typography.caption,
    color: THEME.colors.textMuted
  },
  notesInput: {
    minHeight: 64,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: THEME.colors.text,
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    textAlignVertical: 'top'
  },
  notesToggle: {
    ...THEME.typography.caption,
    color: THEME.colors.primary
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 6
  },
  emptyIcon: {
    fontSize: 30
  },
  emptyTitle: {
    ...THEME.typography.h3,
    color: THEME.colors.text
  },
  emptyBody: {
    ...THEME.typography.bodySmall,
    color: THEME.colors.textMuted,
    textAlign: 'center'
  },
  footer: {
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.cardBorder,
    backgroundColor: THEME.colors.background
  }
});
