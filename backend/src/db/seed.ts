import dotenv from 'dotenv';
import { supabase } from './supabase';

dotenv.config();

const VENUES_SEED = [
  {
    name: 'GOR Candra Wijaya International Badminton Centre',
    address: 'Jl. Jelupang Utama No.15, Serpong Utara',
    city: 'Tangerang Selatan',
    category: 'sports',
    supported_activities: ['badminton'],
    rate_hourly_min: 75000,
    rate_hourly_max: 120000,
    contact_whatsapp: '6281298765431',
    maps_url: 'https://maps.google.com/?q=GOR+Candra+Wijaya'
  },
  {
    name: 'Lapangan Cakra Futsal Gading Serpong',
    address: 'Jl. Boulevard Raya Gading Serpong Kav. M5',
    city: 'Tangerang',
    category: 'sports',
    supported_activities: ['futsal'],
    rate_hourly_min: 150000,
    rate_hourly_max: 220000,
    contact_whatsapp: '6281234567890',
    maps_url: 'https://maps.google.com/?q=Cakra+Futsal'
  },
  {
    name: 'King Kong Arena Mini Soccer',
    address: 'Kawasan Danau Biru, Cisauk, Tangerang',
    city: 'Tangerang',
    category: 'sports',
    supported_activities: ['futsal', 'mini_soccer'],
    rate_hourly_min: 350000,
    rate_hourly_max: 500000,
    contact_whatsapp: '6281311223344',
    maps_url: 'https://maps.google.com/?q=King+Kong+Arena'
  },
  {
    name: 'The Hawk Basketball Stadium',
    address: 'Jl. Alam Sutera Boulevard Kav. 21',
    city: 'Tangerang Selatan',
    category: 'sports',
    supported_activities: ['basket'],
    rate_hourly_min: 200000,
    rate_hourly_max: 300000,
    contact_whatsapp: '628118899001',
    maps_url: 'https://maps.google.com/?q=The+Hawk+Stadium'
  },
  {
    name: 'Kick Off Futsal & Badminton Center',
    address: 'Jl. Raya Serpong KM 8',
    city: 'Tangerang',
    category: 'sports',
    supported_activities: ['futsal', 'badminton'],
    rate_hourly_min: 80000,
    rate_hourly_max: 180000,
    contact_whatsapp: '6281900112233',
    maps_url: 'https://maps.google.com/?q=Kick+Off+Futsal'
  }
];

async function seed() {
  console.log('[Seed] Starting database seed...');

  try {
    // 1. Insert Venues (Upsert by name)
    console.log('[Seed] Seeding venues...');
    const { data: venuesData, error: venuesErr } = await supabase
      .from('venues')
      .upsert(VENUES_SEED, { onConflict: 'name', ignoreDuplicates: false })
      .select();

    if (venuesErr) {
      // If no unique constraint on name, fall back to simple insert if empty
      console.warn('[Seed] Upsert notice:', venuesErr.message);
      const { data: existing } = await supabase.from('venues').select('id');
      if (!existing || existing.length === 0) {
        const { data: inserted, error: insertErr } = await supabase.from('venues').insert(VENUES_SEED).select();
        if (insertErr) throw insertErr;
        console.log(`[Seed] Successfully inserted ${inserted.length} venues.`);
      } else {
        console.log(`[Seed] Venues already seeded (${existing.length} venues exist).`);
      }
    } else {
      console.log(`[Seed] Successfully seeded ${venuesData.length} venues.`);
    }

    console.log('[Seed] Database seeding completed successfully! ✨');
  } catch (err: any) {
    console.error('[Seed Error]:', err.message);
    process.exit(1);
  }
}

seed();
