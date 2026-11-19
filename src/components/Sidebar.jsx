
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
    <aside className="w-full shrink-0 border-b border-slate-800 bg-slate-950 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="flex items-center gap-3 px-5 py-4 md:px-6 md:py-5">
        {profile.logo_url ? (
          <img
            src={profile.logo_url}
            alt="Logo bisnis"
            className="h-11 w-11 shrink-0 rounded-lg bg-white object-contain p-1"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
            {profile.business_name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-white">
            {profile.business_name}
          </p>
          <p className="text-xs text-slate-400">
            Business Dashboard
          </p>
        </div>
      </div>

      <nav className="flex gap-2 overflow-x-auto px-3 pb-3 md:flex-col md:gap-1 md:pb-0">
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
