
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const menu = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/products", label: "Produk" },
  { to: "/customers", label: "Pelanggan" },
  { to: "/orders", label: "Pesanan" },
  { to: "/stock-history", label: "Riwayat Stok" },
  { to: "/reports", label: "Laporan" },
  { to: "/expenses", label: "Pengeluaran" },
  { to: "/profile", label: "Profil Bisnis" },
  { to: "/stock-adjustment", label: "Penyesuaian Stok" },
];

function Sidebar() {
  const [profile, setProfile] = useState({
    business_name: "MasMuns",
    logo_url: "",
  });

  useEffect(() => {
    async function loadBusinessProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("business_profiles")
        .select("business_name, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfile({
          business_name: data.business_name || "MasMuns",
          logo_url: data.logo_url || "",
        });
      }
    }

    loadBusinessProfile();
  }, []);

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-[#C9A96E]/20 bg-[#171717] md:sticky md:top-0 md:h-screen md:w-64 md:border-b-0 md:border-r">
      {/* BUSINESS IDENTITY */}
      <div className="flex min-w-0 items-center gap-3 border-b border-[#C9A96E]/15 px-5 py-5 md:px-6 md:py-7">
        {profile.logo_url ? (
          <img
            src={profile.logo_url}
            alt="Logo bisnis"
            className="h-12 w-12 shrink-0 rounded-xl border border-[#C9A96E]/30 bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#C9A96E]/40 bg-[#25221C] text-xl font-bold text-[#C9A96E]">
            {profile.business_name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold tracking-wide text-[#F5F1E8]">
            {profile.business_name}
          </p>

          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#C9A96E]">
            Business Dashboard
          </p>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex gap-2 overflow-x-auto px-3 py-4 md:flex-1 md:flex-col md:gap-1.5 md:overflow-x-hidden md:overflow-y-auto md:px-4 md:py-6">
        <p className="hidden px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8C8170] md:block">
          Main Menu
        </p>

        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200 md:w-full ${
                isActive
                  ? "border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#D9BB83] shadow-sm"
                  : "border-transparent text-[#A7A29A] hover:border-[#C9A96E]/15 hover:bg-[#252525] hover:text-[#F5F1E8]"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* SIDEBAR FOOTER */}
      <div className="hidden px-6 pb-6 md:block">
        <div className="border-t border-[#C9A96E]/15 pt-5">
          <p className="text-xs text-[#8C8170]">
            Powered by
          </p>

          <p className="mt-1 text-sm font-semibold tracking-wider text-[#C9A96E]">
            MASMUNS
          </p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
