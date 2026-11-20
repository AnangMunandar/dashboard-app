
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

function Navbar() {
  const { user } = useAuth();

  const [businessName, setBusinessName] = useState("MasMuns");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBusinessName() {
      if (!user) return;

      const { data, error } = await supabase
        .from("business_profiles")
        .select("business_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (active && !error && data?.business_name) {
        setBusinessName(data.business_name);
      }
    }

    loadBusinessName();

    return () => {
      active = false;
    };
  }, [user]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        setLogoutError("Logout gagal. Silakan coba kembali.");
      }
    } catch {
      setLogoutError("Terjadi kesalahan saat logout.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="relative flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-[#C9A96E]/20 bg-[#171717] px-4 py-4 sm:px-6 lg:px-8">
      {/* BUSINESS IDENTITY */}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-wide text-[#F5F1E8] sm:text-xl">
          {businessName}
        </h1>

        <div className="mt-1 flex items-center gap-2">
          <span className="h-px w-5 shrink-0 bg-[#C9A96E]" />

          <p className="truncate text-[9px] font-medium uppercase tracking-[0.15em] text-[#A79B86] sm:text-[10px] sm:tracking-[0.18em]">
            Business Management System
          </p>
        </div>
      </div>

      {/* USER ACCOUNT */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-5">
        <div className="min-w-0 text-right">
          <p className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#8C8170] sm:text-[10px] sm:tracking-[0.15em]">
            Signed in as
          </p>

          <p className="mt-1 max-w-32 truncate text-xs font-medium text-[#F5F1E8] sm:max-w-none sm:text-sm">
            {user?.email || "Pengguna"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="shrink-0 rounded-lg border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-3 py-2.5 text-xs font-semibold tracking-wide text-[#D9BB83] transition duration-200 hover:bg-[#C9A96E] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
        >
          {loggingOut ? "Keluar..." : "Logout"}
        </button>
      </div>

      {logoutError && (
        <p
          role="alert"
          className="w-full text-right text-xs text-red-400"
        >
          {logoutError}
        </p>
      )}
    </header>
  );
}

export default Navbar;
