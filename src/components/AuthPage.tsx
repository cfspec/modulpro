import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  KeyRound, 
  Mail, 
  User, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
  Send
} from 'lucide-react';
import { UserProfile } from '../types';
import { getUserProfileFromCloud } from '../lib/userStore';
import { LegalModal } from './LegalModal';

// Menggunakan client Supabase dari src/supabaseClient.js
// @ts-ignore
import { supabase } from '../supabaseClient';

export type AuthMode = 'login' | 'register' | 'forgot_password' | 'reset_password';

interface AuthPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  initialMode?: AuthMode;
  onPasswordResetComplete?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ 
  onLoginSuccess, 
  initialMode = 'login',
  onPasswordResetComplete 
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [schoolName, setSchoolName] = useState('');

  // States untuk Reset Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmailSentTo, setResetEmailSentTo] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Legal modal states
  const [isLegalOpen, setIsLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'disclaimer' | 'privacy' | 'refund'>('disclaimer');

  // Periksa URL jika pengguna datang dari pendaftaran atau dari link recovery di email
  useEffect(() => {
    try {
      // 1. Cek jika tautan pemulihan kata sandi (type=recovery) ada di URL hash atau query
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const isRecovery = hash.includes('type=recovery') || search.includes('type=recovery');

      if (isRecovery) {
        setMode('reset_password');
        setErrorMessage(null);
        setSuccessMessage("Sesi pemulihan aktif. Silakan masukkan kata sandi baru Anda di bawah ini.");
        return;
      }

      // 2. Cek jika datang dari signup sukses
      const params = new URLSearchParams(search);
      if (params.get('signup') === 'success') {
        const passedEmail = params.get('email');
        if (passedEmail) {
          setEmail(passedEmail);
        }
        setSuccessMessage("Pendaftaran akun berhasil! Silakan langsung masuk dengan kata sandi Anda.");
        setMode('login');
      }
    } catch (e) {
      // Abaikan jika tidak di browser
    }
  }, []);

  // Update mode jika props initialMode berubah
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    }
  }, [initialMode]);

  // Handler Kirim Tautan Lupa Kata Sandi
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetEmail = email.trim();
    if (!targetEmail) {
      setErrorMessage("Harap masukkan alamat email akun Anda.");
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/#type=recovery`;
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        if (error.message?.toLowerCase().includes('rate limit')) {
          setErrorMessage("Batas pengiriman email Supabase tercapai (3-4 email/jam). Harap tunggu beberapa saat atau hubungi administrator.");
        } else {
          setErrorMessage(error.message || "Gagal mengirim tautan reset kata sandi.");
        }
        setLoading(false);
        return;
      }

      setResetEmailSentTo(targetEmail);
      setSuccessMessage(`Tautan reset kata sandi berhasil dikirim ke ${targetEmail}. Silakan periksa kotak masuk atau folder spam di email Anda.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses permintaan.');
    } finally {
      setLoading(false);
    }
  };

  // Handler Simpan Kata Sandi Baru
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage("Kata sandi baru minimal harus 6 karakter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Konfirmasi kata sandi tidak cocok. Harap periksa kembali.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setErrorMessage(error.message || "Gagal memperbarui kata sandi.");
        setLoading(false);
        return;
      }

      // Bersihkan hash dari URL
      window.history.replaceState({}, '', '/login');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage("Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.");
      setMode('login');

      if (onPasswordResetComplete) {
        onPasswordResetComplete();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Terjadi kesalahan saat memperbarui kata sandi.");
    } finally {
      setLoading(false);
    }
  };

  // Handler Sign In & Sign Up
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Harap lengkapi email dan kata sandi.");
      return;
    }

    setLoading(true);

    try {
      if (mode === 'register') {
        // Sign Up dengan Supabase
        const targetEmail = email.trim();
        const { data, error } = await supabase.auth.signUp({
          email: targetEmail,
          password,
          options: {
            data: {
              full_name: name,
              school_name: schoolName,
              status_plan: 'Free Trial',
              quota: {
                modulAjar: 2,
                maxModulAjar: 2,
                lkpd: 2,
                maxLkpd: 2,
                soalHots: 0,
                maxSoalHots: 0,
              },
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        if (data?.session && data?.user) {
          const profile = await getUserProfileFromCloud(data.user);
          window.history.pushState({}, '', '/');
          onLoginSuccess(profile);
          return;
        }

        setMode('login');
        setEmail(targetEmail);
        setErrorMessage(null);
        setSuccessMessage("Pendaftaran akun berhasil! Silakan langsung klik Masuk untuk mulai menggunakan aplikasi.");

        window.history.replaceState(
          {},
          '',
          `/login?signup=success&email=${encodeURIComponent(targetEmail)}`
        );
        return;
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }

        if (!data?.session || !data?.user) {
          setErrorMessage("Sesi login tidak valid. Silakan periksa kembali email dan kata sandi Anda.");
          setLoading(false);
          return;
        }

        // Ambil profil & kuota terpusat dari cloud (multi-device sinkron)
        const profile = await getUserProfileFromCloud(data.user);

        // Redirect ke Home page ("/") ketika login berhasil
        window.history.pushState({}, '', '/');
        onLoginSuccess(profile);
        return;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat otentikasi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#101524] border border-gray-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-600/30 mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-serif-display">
            Generator Modul Ajar <span className="text-blue-500">PRO</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {mode === 'forgot_password' && 'Pemulihan kata sandi akun pendidik'}
            {mode === 'reset_password' && 'Buat kata sandi baru untuk akun Anda'}
            {(mode === 'login' || mode === 'register') && 'Buat Modul ajar, LKPD dan Buat Soal Asesmen disini'}
          </p>
        </div>

        {/* MODE: LUPA KATA SANDI */}
        {mode === 'forgot_password' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl text-xs text-blue-200 flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Masukkan email akun Anda. Kami akan mengirimkan tautan aman ke kotak masuk Anda untuk mengatur ulang kata sandi.
              </p>
            </div>

            {resetEmailSentTo ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs text-emerald-200 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <p className="font-bold text-emerald-300 mb-1">Tautan Terkirim!</p>
                    <p>
                      Kami telah mengirimkan tautan reset kata sandi ke <strong>{resetEmailSentTo}</strong>.
                    </p>
                    <p className="text-[11px] text-emerald-400/90 mt-2">
                      Silakan periksa kotak masuk atau folder <em>Spam</em> di email Anda, lalu klik tautan tersebut untuk membuat kata sandi baru.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setResetEmailSentTo(null);
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="w-full bg-[#182033] hover:bg-gray-800 text-gray-200 font-bold py-3 rounded-xl border border-gray-700 flex items-center justify-center gap-2 text-xs transition cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Halaman Masuk</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Alamat Email Terdaftar
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@gmail.com / nama@sekolah.sch.id"
                      className="w-full bg-[#182033] border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl flex items-start gap-2 text-xs text-red-300 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer text-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengirim Tautan...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Tautan Reset Kata Sandi</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage(null);
                    }}
                    className="text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Masuk Akun</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* MODE: ATUR KATA SANDI BARU (Saat membuka link recovery dari email) */}
        {mode === 'reset_password' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-blue-950/40 border border-blue-500/30 rounded-2xl text-xs text-blue-200 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Silakan ketikkan kata sandi baru untuk akun Anda (minimal 6 karakter).
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-[#182033] border border-gray-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-gray-500 hover:text-gray-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full bg-[#182033] border border-gray-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl flex items-start gap-2 text-xs text-red-300 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer text-xs"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Sandi Baru...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Simpan Kata Sandi Baru</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Batal & Kembali ke Masuk</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODE: LOGIN ATAU REGISTER */}
        {(mode === 'login' || mode === 'register') && (
          <>
            {/* Tab Switcher: Login / Register */}
            <div className="flex bg-[#182033] p-1 rounded-xl mb-6 border border-gray-700/60">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Daftar Akun Baru
              </button>
            </div>

            {/* Pesan Sukses DI ATAS Formulir */}
            {successMessage && (
              <div className="mb-5 p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300 animate-fadeIn shadow-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  {successMessage}
                </div>
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Nama Lengkap & Gelar
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Contoh: Dra. Nurhayati, M.Pd"
                        className="w-full bg-[#182033] border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Asal Sekolah / Instansi
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="Contoh: SMP Negeri 1 Jakarta"
                        className="w-full bg-[#182033] border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Alamat Email Guru
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@gmail.com / nama@sekolah.sch.id"
                    className="w-full bg-[#182033] border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Kata Sandi
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#182033] border border-gray-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_password');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition"
                  >
                    Lupa kata sandi?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'register' ? 'Daftar & Klaim Bonus (2x Modul & 2x LKPD)' : 'Masuk'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Penanganan Error */}
              {errorMessage && (
                <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-xl flex items-start gap-2 text-xs text-red-300 mt-3 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </form>

            {/* Included Quota Features Info */}
            <div className="mt-6 pt-4 border-t border-gray-800/80 text-xs text-gray-400 space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Bonus Kuota Akun Baru:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-gray-400 space-y-1 pl-1">
                <li><strong>2x</strong> Generate Modul Ajar</li>
                <li><strong>2x</strong> Generate LKPD Interaktif</li>
              </ul>
            </div>
          </>
        )}

      </div>

      {/* Legal Links Footer */}
      <div className="mt-6 text-center text-[11px] text-gray-500 space-x-2.5 relative z-10">
        <button 
          type="button"
          onClick={() => { setLegalTab('disclaimer'); setIsLegalOpen(true); }}
          className="hover:text-gray-300 underline transition cursor-pointer"
        >
          Disclaimer
        </button>
        <span>•</span>
        <button 
          type="button"
          onClick={() => { setLegalTab('privacy'); setIsLegalOpen(true); }}
          className="hover:text-gray-300 underline transition cursor-pointer"
        >
          Kebijakan Privasi
        </button>
        <span>•</span>
        <button 
          type="button"
          onClick={() => { setLegalTab('refund'); setIsLegalOpen(true); }}
          className="hover:text-gray-300 underline transition cursor-pointer"
        >
          Kebijakan Refund & Pembelian
        </button>
      </div>

      <LegalModal 
        isOpen={isLegalOpen} 
        onClose={() => setIsLegalOpen(false)} 
        defaultTab={legalTab} 
      />
    </div>
  );
};
