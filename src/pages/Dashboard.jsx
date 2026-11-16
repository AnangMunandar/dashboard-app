import { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import OrdersTable from "../components/OrdersTable";
import OrderForm from "../components/OrderForm";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { formatRupiah } from "../lib/format";

function Dashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError("Gagal memuat data: " + error.message);
    } else {
      setError("");
      setOrders(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleToggleStatus(order) {
    const statusBaru = order.status === "selesai" ? "pending" : "selesai";

    const { error } = await supabase
      .from("orders")
      .update({ status: statusBaru })
      .eq("id", order.id);

    if (error) {
      setError("Gagal mengubah status: " + error.message);
      return;
    }
    loadOrders();
  }

  async function handleDelete(order) {
    const yakin = window.confirm(
      `Hapus pesanan atas nama ${order.customer_name}?`
    );
    if (!yakin) return;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", order.id);

    if (error) {
      setError("Gagal menghapus: " + error.message);
      return;
    }
    loadOrders();
  }

  const total = orders.length;
  const selesai = orders.filter((o) => o.status === "selesai").length;
  const pendapatan = orders.reduce((jumlah, o) => jumlah + Number(o.amount), 0);

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
          value={loading ? "..." : total}
          note="Semua pesanan"
        />
        <StatCard
          title="Pesanan Selesai"
          value={loading ? "..." : selesai}
          note="Status selesai"
        />
        <StatCard
          title="Total Pendapatan"
          value={loading ? "..." : formatRupiah(pendapatan)}
          note="Jumlah semua pesanan"
        />
      </div>

      <div className="mt-8">
        <OrderForm onAdded={loadOrders} />
      </div>

      <h3 className="mb-3 mt-8 text-lg font-semibold text-white">
        Pesanan Terbaru
      </h3>
      <OrdersTable
        orders={orders.slice(0, 5)}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />
    </DashboardLayout>
  );
}

export default Dashboard;