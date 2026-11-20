
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError("Email atau password salah.");
        return;
      }

      navigate("/dashboard");
    } catch {
      setError("Terjadi kesalahan. Silakan coba kembali.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#111111] px-4 py-10">
      {/* DEKORASI BACKGROUND */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full border border-[#C9A96E]/10" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full border border-[#C9A96E]/10" />

      <div className="relative w-full max-w-md">
        {/* BRAND */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#C9A96E]/40 bg-[#202020] shadow-lg shadow-black/30">
            <span className="text-2xl font-bold tracking-wider text-[#C9A96E]">
              M
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-[0.15em] text-[#F5F1E8]">
            MAS<span className="text-[#C9A96E]">MUNS</span>
          </h1>

          <p className="mt-2 text-xs font-medium uppercase tracking-[0.25em] text-[#8C8170]">
            Business Management System
          </p>
        </div>

        {/* FORM LOGIN */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-[#C9A96E]/20 bg-[#202020] p-6 shadow-2xl shadow-black/40 sm:p-8"
        >
          <div className="border-b border-[#C9A96E]/15 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A96E]">
              Welcome Back
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#F5F1E8]">
              Selamat Datang
            </h2>

            <p className="mt-2 text-sm text-[#A79B86]">
              Masuk untuk mengelola bisnis Anda.
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* EMAIL */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
              Email
            </label>

            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Masukkan email Anda"
              className="w-full rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-4 py-3 text-sm text-[#F5F1E8] outline-none transition placeholder:text-[#817765] focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30"
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-4 py-3 pr-14 text-sm text-[#F5F1E8] outline-none transition placeholder:text-[#817765] focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-[#8C8170] transition hover:text-[#C9A96E]"
                aria-label={
                  showPassword ? "Sembunyikan password" : "Lihat password"
                }
                title={
                  showPassword ? "Sembunyikan password" : "Lihat password"
                }
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c5 0 9 5 9 7a11.8 11.8 0 0 1-3.1 3.9" />
                    <path d="M6.61 6.61C3.98 8.05 2 10.5 2 12c0 2 4 7 10 7a10.7 10.7 0 0 0 4.1-.8" />
                    <path d="m2 2 20 20" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* TOMBOL LOGIN */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-[#C9A96E] px-5 py-3.5 text-sm font-bold tracking-wide text-[#17130D] shadow-lg shadow-[#C9A96E]/10 transition hover:bg-[#D8B982] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Memproses..." : "Masuk ke Dashboard"}
          </button>

          {/* REGISTER */}
          <div className="border-t border-[#C9A96E]/15 pt-5 text-center">
            <p className="text-sm text-[#A79B86]">
              Belum punya akun?{" "}
              <Link
                to="/register"
                className="font-semibold text-[#C9A96E] transition hover:text-[#E0C58F] hover:underline"
              >
                Daftar Sekarang
              </Link>
            </p>
          </div>
        </form>

        <p className="mt-6 text-center text-xs tracking-wide text-[#706757]">
          © {new Date().getFullYear()} MasMuns. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default Login;
