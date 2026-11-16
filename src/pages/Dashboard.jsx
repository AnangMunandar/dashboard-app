import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-white">Selamat datang</h2>
      <p className="mt-1 text-slate-300">Login sebagai {user?.email}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Pengguna" value="128" note="Data contoh" />
        <StatCard title="Pesanan Bulan Ini" value="42" note="Data contoh" />
        <StatCard title="Pendapatan" value="Rp 12.500.000" note="Data contoh" />
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;