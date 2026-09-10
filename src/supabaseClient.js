import { createClient } from '@supabase/supabase-js';

// ============================================================================
// KONFIGURASI SUPABASE
// Tempelkan URL dan Public Key (Anon Key) proyek Supabase Anda di bawah ini:
// (Dapatkan dari: Supabase Dashboard -> Project Settings -> API)
// ============================================================================

// 1. TEMPELKAN URL SUPABASE DI SINI:
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://wplkhcelcqehosnyiluz.supabase.co";

// 2. TEMPELKAN KUNCI PUBLIK (ANON / PUBLISHABLE KEY) DI SINI:
const SUPABASE_PUBLIC_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_Z3ImYYLSyAaCFdZZgudrcg_a73rfVl6";

// Inisialisasi dan ekspor client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
