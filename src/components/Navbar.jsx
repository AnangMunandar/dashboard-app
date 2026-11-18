
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

function Navbar() {
  const { user } = useAuth();
  const [businessName, setBusinessName] = useState("MasMuns");

  useEffect(() => {
    async function loadBusinessName() {
      if (!user) return;

      const { data, error } = await supabase
        .from("business_profiles")
        .select("business_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data?.business_name) {
        setBusinessName(data.business_name);
      }
    }

    loadBusinessName();
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-bold text-white">
          {businessName}
        </h1>
        <p className="text-xs text-slate-400">
          Business Management System
        </p>
      </div>

      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <span className="max-w-40 truncate text-xs text-slate-300 sm:max-w-none sm:text-sm">
          {user?.email}
        </span>

        <button
          onClick={handleLogout}
          className="shrink-0 rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;
