import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

function formatRupiah(angka) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(angka);
}

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, selesai: 0, pendapatan: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      const { data, error } = await supabase
        .from("orders")
        .select("amount, status");

      if (error) {
        setError("Gagal memuat data: " + error.message);
        setLoading(false);
        return;
      }

      const total = data.length;
      const selesai = data.filter((o) => o.status === "selesai").length;
      const pendapatan = data.reduce((jumlah, o) => jumlah + Number(o.amount), 0);

      setStats({ total, selesai, pendapatan });
      setLoading(false);
    }

    loadStats();
  }, []);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-white">Selamat datang</h2>
      <p className="mt-1 text-slate-300">Login sebagai {user?.email}</p>

      {error && (
        <p className="mt-4 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Pesanan"
          value={loading ? "..." : stats.total}
          note="Semua pesanan"
        />
        <StatCard
          title="Pesanan Selesai"
          value={loading ? "..." : stats.selesai}
          note="Status selesai"
        />
        <StatCard
          title="Total Pendapatan"
          value={loading ? "..." : formatRupiah(stats.pendapatan)}
          note="Jumlah semua pesanan"
        />
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;