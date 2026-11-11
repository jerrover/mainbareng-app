import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { THEME } from '../theme';
import { MainTabParamList } from '../navigation/types';
import CustomAlertModal, { AlertType } from '../components/CustomAlertModal';
import { BentoCard, CustomButton, InputForm, QuotaPips, StatusBadge } from '../components';

type Props = BottomTabScreenProps<MainTabParamList, 'Create'>;

type SportType = 'Futsal' | 'Badminton' | 'Basket' | 'MLBB';
type MatchFormat = 'balanced' | 'casual';
type VisibilityType = 'public' | 'private';

export default function CreateSessionScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);

  // Step 1 State
  const [title, setTitle] = useState('Futsal Malam Santai 5v5');
  const [sport, setSport] = useState<SportType>('Futsal');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('balanced');
  const [quota, setQuota] = useState(10);
  const [visibility, setVisibility] = useState<VisibilityType>('public');

  // Step 2 State
  const [venue, setVenue] = useState('Tifosi Sport Center · Vinyl');
  const [kickoffTime, setKickoffTime] = useState('19:00 - 21:00');
  const [dayLabel, setDayLabel] = useState('Hari Ini');
  const [totalCost, setTotalCost] = useState('300000');

  // Step 3 State
  const [minCreditScore, setMinCreditScore] = useState(70);

  // Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    type: AlertType;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showAlert = (
    type: AlertType,
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      onConfirm
    });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  // Quota stepper controls
  const handleDecrementQuota = () => {
    if (quota > 2) setQuota(quota - 2);
  };
  const handleIncrementQuota = () => {
    if (quota < 20) setQuota(quota + 2);
  };

  // Cost calculations
  const parsedCost = parseInt(totalCost, 10) || 0;
  const splitPerPerson = quota > 0 ? Math.round(parsedCost / quota) : 0;

  const handleNextStep = () => {
    if (step === 1) {
      if (!title.trim()) {
        showAlert('warning', 'Judul Wajib Diisi', 'Silakan masukkan nama atau judul sesi mabar.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!venue.trim()) {
        showAlert('warning', 'Venue Wajib Diisi', 'Silakan tentukan lokasi lapangan atau arena mabar.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Publish Session
      showAlert(
        'success',
        'Sesi Berhasil Dipublikasikan! 🚀',
        `Sesi "${title}" telah live di radar Explore dengan kuota ${quota} pemain dan split Rp ${splitPerPerson.toLocaleString('id-ID')}/org.`,
        () => {
          closeAlert();
          navigation.navigate('Explore');
        }
      );
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      navigation.navigate('Explore');
    }
  };

  const stepSubtitles = [
    'Info & format sesi',
    'Lokasi & estimasi patungan',
    'Konfirmasi & publikasi'
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Wizard Top Bar (Figma SCR-07 194:5) */}
      <View style={styles.wizardTopBar}>
        <TouchableOpacity
          style={styles.closeBtn}
          activeOpacity={0.8}
          onPress={handlePrevStep}
        >
          <Text style={styles.closeBtnIcon}>{step === 1 ? '✕' : '←'}</Text>
        </TouchableOpacity>

        <View style={styles.wizardTitleBox}>
          <Text style={styles.wizardTitle}>Buat Sesi Mabar</Text>
          <Text style={styles.wizardSubtitle}>{stepSubtitles[step - 1]}</Text>
        </View>

        <StatusBadge label={`STEP ${step}/3`} variant="brand" tone="solid" size="sm" />
      </View>

      {/* Stepper Progress Bar (Figma 194:13) */}
      <View style={styles.stepperBar}>
        <View style={[styles.stepSegment, step >= 1 && styles.stepSegmentActive]} />
        <View style={[styles.stepSegment, step >= 2 && styles.stepSegmentActive]} />
        <View style={[styles.stepSegment, step >= 3 && styles.stepSegmentActive]} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* STEP 1: Info & Format */}
        {step === 1 && (
          <View style={styles.stepBody}>
            {/* Field: Judul Sesi */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>NAMA / JUDUL SESI MABAR</Text>
                <Text style={styles.charCounter}>{title.length} / 50</Text>
              </View>
              <InputForm
                value={title}
                onChangeText={setTitle}
                placeholder="Contoh: Futsal Malam Santai 5v5"
                maxLength={50}
              />
            </View>

            {/* Field: Pilih Cabor (Figma 194:25) */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>PILIH CABANG OLAHRAGA / GAME</Text>
                <StatusBadge label="MULTI-SPORT" variant="neutral" size="sm" />
              </View>
              <View style={styles.caborGrid}>
                {/* Futsal */}
                <TouchableOpacity
                  style={[
                    styles.caborCard,
                    sport === 'Futsal' && styles.caborCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSport('Futsal');
                    setQuota(10);
                  }}
                >
                  <View style={styles.caborCardHeader}>
                    <Text
                      style={[
                        styles.caborTitle,
                        sport === 'Futsal' && styles.caborTitleActive
                      ]}
                    >
                      ⚽ Futsal
                    </Text>
                    {sport === 'Futsal' && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.caborSubtitle}>5v5 · Vinyl & Rumput</Text>
                </TouchableOpacity>

                {/* Badminton */}
                <TouchableOpacity
                  style={[
                    styles.caborCard,
                    sport === 'Badminton' && styles.caborCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSport('Badminton');
                    setQuota(4);
                  }}
                >
                  <View style={styles.caborCardHeader}>
                    <Text
                      style={[
                        styles.caborTitle,
                        sport === 'Badminton' && styles.caborTitleActive
                      ]}
                    >
                      🏸 Badminton
                    </Text>
                    {sport === 'Badminton' && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.caborSubtitle}>Ganda / Tunggal</Text>
                </TouchableOpacity>

                {/* Basket */}
                <TouchableOpacity
                  style={[
                    styles.caborCard,
                    sport === 'Basket' && styles.caborCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSport('Basket');
                    setQuota(10);
                  }}
                >
                  <View style={styles.caborCardHeader}>
                    <Text
                      style={[
                        styles.caborTitle,
                        sport === 'Basket' && styles.caborTitleActive
                      ]}
                    >
                      🏀 Basket
                    </Text>
                    {sport === 'Basket' && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.caborSubtitle}>3v3 / 5v5 Half/Full</Text>
                </TouchableOpacity>

                {/* MLBB */}
                <TouchableOpacity
                  style={[
                    styles.caborCard,
                    sport === 'MLBB' && styles.caborCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSport('MLBB');
                    setQuota(5);
                  }}
                >
                  <View style={styles.caborCardHeader}>
                    <Text
                      style={[
                        styles.caborTitle,
                        sport === 'MLBB' && styles.caborTitleActive
                      ]}
                    >
                      🎮 MLBB
                    </Text>
                    {sport === 'MLBB' && (
                      <View style={styles.checkBadge}>
                        <Text style={styles.checkBadgeText}>✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.caborSubtitle}>Esports 5-Man Party</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Field: Format Match (Figma 194:50) */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>FORMAT PERTANDINGAN</Text>
                <StatusBadge label="AI BALANCED" variant="brand" tone="solid" size="sm" />
              </View>
              <View style={styles.formatRow}>
                <TouchableOpacity
                  style={[
                    styles.formatCard,
                    matchFormat === 'balanced' && styles.formatCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setMatchFormat('balanced')}
                >
                  <Text
                    style={[
                      styles.formatTitle,
                      matchFormat === 'balanced' && styles.formatTitleActive
                    ]}
                  >
                    2 Tim ({quota / 2}v{quota / 2} Seimbang)
                  </Text>
                  <Text style={styles.formatDesc}>
                    Algoritma AI membagi tim otomatis saat slot lobi penuh.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.formatCard,
                    matchFormat === 'casual' && styles.formatCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setMatchFormat('casual')}
                >
                  <Text
                    style={[
                      styles.formatTitle,
                      matchFormat === 'casual' && styles.formatTitleActive
                    ]}
                  >
                    Casual / Santai
                  </Text>
                  <Text style={styles.formatDesc}>
                    Bebas tukar pemain mandiri tanpa intervensi skill rating.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Field: Target Kuota Pemain (Figma 194:62) */}
            <BentoCard eyebrow="TARGET KUOTA">
              <View style={styles.quotaRow}>
                <View>
                  <Text style={styles.quotaValue}>{quota}</Text>
                  <Text style={styles.quotaHint}>{quota / 2} vs {quota / 2} pemain</Text>
                </View>
                <View style={styles.stepperControls}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    activeOpacity={0.7}
                    onPress={handleDecrementQuota}
                  >
                    <Text style={styles.stepperMinusIcon}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.stepperBtn, styles.stepperBtnPlus]}
                    activeOpacity={0.7}
                    onPress={handleIncrementQuota}
                  >
                    <Text style={styles.stepperPlusIcon}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <QuotaPips
                filled={quota}
                total={quota}
                variant={sport === 'Badminton' ? 'badminton' : 'futsal'}
                label={`${quota} SLOT · 2 TIM`}
                showCount={false}
                groups={2}
              />
            </BentoCard>

            {/* Field: Visibilitas Lobi (Figma 194:72) */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>
                  VISIBILITAS & AKSES LOBI (PRD FR-03)
                </Text>
                <Text style={styles.visibilityStatusText}>
                  {visibility === 'public' ? 'Terbuka Umum' : 'Khusus Undangan'}
                </Text>
              </View>
              <View style={styles.visibilityRow}>
                <TouchableOpacity
                  style={[
                    styles.visibilityCard,
                    visibility === 'public' && styles.visibilityCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setVisibility('public')}
                >
                  <Text style={styles.visibilityIcon}>🌐</Text>
                  <View>
                    <Text
                      style={[
                        styles.visibilityTitle,
                        visibility === 'public' && styles.visibilityTitleActive
                      ]}
                    >
                      Publik (Explore)
                    </Text>
                    <Text style={styles.visibilityDesc}>Tampil di Home Feed</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.visibilityCard,
                    visibility === 'private' && styles.visibilityCardActive
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setVisibility('private')}
                >
                  <Text style={styles.visibilityIcon}>🔒</Text>
                  <View>
                    <Text
                      style={[
                        styles.visibilityTitle,
                        visibility === 'private' && styles.visibilityTitleActive
                      ]}
                    >
                      Privat (Kode Room)
                    </Text>
                    <Text style={styles.visibilityDesc}>Khusus Undangan</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: Lokasi, Waktu & Biaya */}
        {step === 2 && (
          <View style={styles.stepBody}>
            {/* Field: Nama Venue */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>LOKASI & VENUE LAPANGAN</Text>
              <InputForm
                value={venue}
                onChangeText={setVenue}
                placeholder="Nama tempat lapangan"
              />
              {/* Venue Quick Chips */}
              <View style={styles.quickChipsRow}>
                {['Tifosi Sport Center', 'Champion Gading Serpong', 'The Hawk BSD'].map(
                  (v) => (
                    <TouchableOpacity
                      key={v}
                      style={styles.quickChip}
                      onPress={() => setVenue(v)}
                    >
                      <Text style={styles.quickChipText}>{v}</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            {/* Field: Jadwal Kickoff */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>JADWAL & WAKTU KICKOFF</Text>
              <InputForm
                value={kickoffTime}
                onChangeText={setKickoffTime}
                placeholder="Contoh: 19:00 - 21:00"
              />
              {/* Day Chips */}
              <View style={styles.quickChipsRow}>
                {['Hari Ini', 'Besok', 'Sabtu Besok', 'Minggu'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.quickChip,
                      dayLabel === d && styles.quickChipActive
                    ]}
                    onPress={() => setDayLabel(d)}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        dayLabel === d && styles.quickChipTextActive
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Field: Total Biaya Sewa & Split Calculator */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldEyebrow}>TOTAL BIAYA SEWA LAPANGAN</Text>
              <InputForm
                value={totalCost}
                onChangeText={setTotalCost}
                keyboardType="numeric"
                placeholder="300000"
                leftIcon="Rp"
              />
            </View>

            {/* Auto Patungan Summary Card */}
            <View style={styles.patunganCalcCard}>
              <View style={styles.patunganCalcHeader}>
                <Text style={styles.patunganCalcLabel}>
                  ESTIMASI PATUNGAN OTOMATIS
                </Text>
                <Text style={styles.patunganCalcQuota}>{quota} Pemain</Text>
              </View>
              <View style={styles.patunganCalcPriceRow}>
                <Text style={styles.patunganCalcPrice}>
                  Rp {splitPerPerson.toLocaleString('id-ID')}
                </Text>
                <Text style={styles.patunganCalcPerOrg}> / pemain</Text>
              </View>
              <Text style={styles.patunganCalcNote}>
                Sistem deposit mengunci dana pemain secara transparan. Jika ada pemain mangkir, deposit dialokasikan ke talangan venue.
              </Text>
            </View>
          </View>
        )}

        {/* STEP 3: Aturan Sportifitas & Ringkasan */}
        {step === 3 && (
          <View style={styles.stepBody}>
            {/* Field: Min Credit Requirement */}
            <View style={styles.fieldSection}>
              <View style={styles.fieldHeader}>
                <Text style={styles.fieldEyebrow}>MINIMAL CREDIT SCORE</Text>
                <Text style={styles.creditSelectedLabel}>
                  Credit {minCreditScore} · {minCreditScore >= 80 ? 'Disiplin' : 'Sportif'}
                </Text>
              </View>
              <View style={styles.creditQuickRow}>
                {[60, 70, 80, 90].map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[
                      styles.creditBtn,
                      minCreditScore === k && styles.creditBtnActive
                    ]}
                    onPress={() => setMinCreditScore(k)}
                  >
                    <Text
                      style={[
                        styles.creditBtnText,
                        minCreditScore === k && styles.creditBtnTextActive
                      ]}
                    >
                      {k}+
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.creditHelper}>
                Pemain dengan reputasi sering cancel mendadak tidak akan bisa masuk lobi ini.
              </Text>
            </View>

            {/* Ticket Preview Card */}
            <View style={styles.previewSection}>
              <Text style={styles.fieldEyebrow}>PREVIEW SESSION PASS</Text>
              <BentoCard
                eyebrow={`${sport.toUpperCase()} · ${quota / 2}v${quota / 2}`}
                title={title}
                subtitle={`${venue} · ${dayLabel} ${kickoffTime}`}
                accentColor={sport === 'MLBB' ? THEME.colors.accent : THEME.colors.primary}
                rightAccessory={
                  <StatusBadge
                    label={visibility === 'public' ? 'PUBLIK' : 'PRIVAT'}
                    variant={visibility === 'public' ? 'brand' : 'neutral'}
                    tone={visibility === 'public' ? 'solid' : 'soft'}
                    size="sm"
                  />
                }
                priceLabel="EST. PATUNGAN"
                priceValue={`Rp ${splitPerPerson.toLocaleString('id-ID')} / org`}
              >
                <QuotaPips
                  filled={0}
                  total={quota}
                  variant={sport === 'Badminton' ? 'badminton' : 'futsal'}
                  label="KUOTA TERISI SAAT INI"
                  groups={2}
                />
              </BentoCard>
            </View>
          </View>
        )}

      </ScrollView>

      {/* Sticky Bottom CTA (Figma 194:87) */}
      <View style={styles.footerBar}>
        <CustomButton
          label={
            step === 1
              ? 'Lanjut · Lokasi & Biaya'
              : step === 2
              ? 'Lanjut · Konfirmasi'
              : 'Publikasikan Sesi'
          }
          onPress={handleNextStep}
        />
      </View>

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onPrimaryPress={() => {
          if (alertConfig.onConfirm) alertConfig.onConfirm();
          else closeAlert();
        }}
        onClose={closeAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background
  },
  contentContainer: {
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingTop: 8,
    paddingBottom: 28
  },
  footerBar: {
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: THEME.colors.background,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border
  },
  wizardTopBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal
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
  closeBtnIcon: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 14,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  wizardTitleBox: {
    alignItems: 'center'
  },
  wizardTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  wizardSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    includeFontPadding: false
  },
  stepperBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: THEME.spatial.screenPaddingHorizontal,
    marginVertical: 12
  },
  stepSegment: {
    flex: 1,
    height: 4,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated
  },
  stepSegmentActive: {
    backgroundColor: THEME.colors.primary
  },
  stepBody: {
    gap: 14
  },
  fieldSection: {
    gap: 6
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  fieldEyebrow: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  charCounter: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  caborGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  caborCard: {
    width: '48.5%',
    minHeight: 72,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'space-between'
  },
  caborCardActive: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: THEME.colors.primary,
    borderWidth: 1
  },
  caborCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  caborTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  caborTitleActive: {
    color: THEME.colors.primary
  },
  checkBadge: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  checkBadgeText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 9,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },
  caborSubtitle: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  formatRow: {
    flexDirection: 'row',
    gap: 10
  },
  formatCard: {
    flex: 1,
    minHeight: 84,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 12,
    justifyContent: 'space-between'
  },
  formatCardActive: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: THEME.colors.primary,
    borderWidth: 1
  },
  formatTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  formatTitleActive: {
    color: THEME.colors.primary
  },
  formatDesc: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    includeFontPadding: false
  },
  quotaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  quotaValue: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 24,
    lineHeight: 30,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  quotaHint: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    includeFontPadding: false
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: THEME.radius.full,
    backgroundColor: THEME.colors.cardElevated,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepperBtnPlus: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary
  },
  stepperMinusIcon: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.textMuted,
    includeFontPadding: false
  },
  stepperPlusIcon: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 16,
    color: THEME.colors.textOnPrimary,
    includeFontPadding: false
  },
  visibilityStatusText: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 10,
    color: THEME.colors.success,
    includeFontPadding: false
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 10
  },
  visibilityCard: {
    flex: 1,
    minHeight: 64,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10
  },
  visibilityCardActive: {
    backgroundColor: THEME.colors.primarySoft,
    borderColor: THEME.colors.primaryBorder,
    borderWidth: 1
  },
  visibilityIcon: {
    fontSize: 16
  },
  visibilityTitle: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 11,
    color: THEME.colors.text,
    includeFontPadding: false
  },
  visibilityTitleActive: {
    color: THEME.colors.primary
  },
  visibilityDesc: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    lineHeight: 16,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder
  },
  quickChipActive: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primary
  },
  quickChipText: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  quickChipTextActive: {
    fontFamily: THEME.typography.fonts.bold,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  patunganCalcCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    borderRadius: THEME.radius.lg,
    padding: 18
  },
  patunganCalcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  patunganCalcLabel: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.textSecondary,
    letterSpacing: 0.8,
    includeFontPadding: false
  },
  patunganCalcQuota: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 10,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  patunganCalcPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8
  },
  patunganCalcPrice: {
    fontFamily: THEME.typography.fonts.extraBold,
    fontSize: 22,
    color: THEME.colors.primary,
    includeFontPadding: false
  },
  patunganCalcPerOrg: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  patunganCalcNote: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    color: THEME.colors.textMuted,
    lineHeight: 15,
    includeFontPadding: false
  },
  creditSelectedLabel: {
    fontFamily: THEME.typography.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.warning,
    includeFontPadding: false
  },
  creditQuickRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  creditBtn: {
    flex: 1,
    height: 44,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  creditBtnActive: {
    backgroundColor: THEME.colors.primaryMuted,
    borderColor: THEME.colors.primary
  },
  creditBtnText: {
    fontFamily: THEME.typography.fonts.bold,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    includeFontPadding: false
  },
  creditBtnTextActive: {
    color: THEME.colors.primary
  },
  creditHelper: {
    fontFamily: THEME.typography.fonts.regular,
    fontSize: 11,
    lineHeight: 15,
    color: THEME.colors.textMuted,
    marginTop: 4,
    includeFontPadding: false
  },
  previewSection: {
    marginTop: 8,
    gap: 8
  },
});
