
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";

const sourceLabels = {
  produk_baru: "Produk Baru",
  pesanan: "Penyelesaian Pesanan",
  pembatalan_pesanan: "Pembatalan Pesanan",
  penyesuaian_manual: "Penyesuaian Manual",
};

function formatDate(date) {
  return new Date(date).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StockHistory() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("semua");

  useEffect(() => {
    loadMovements();
  }, []);

  async function loadMovements() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setError("Sesi pengguna tidak ditemukan. Silakan login kembali.");
      setLoading(false);
      return;
    }

    const { data, error: queryError } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      setMovements(data || []);
    }

    setLoading(false);
  }

  const filteredMovements = movements.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      String(item.reference_id || "").includes(search);

    const matchesFilter =
      filter === "semua" ||
      (filter === "masuk" && item.movement_type === "masuk") ||
      (filter === "keluar" && item.movement_type === "keluar");

    return matchesSearch && matchesFilter;
  });

  const totalMasuk = movements
    .filter((item) => item.movement_type === "masuk")
    .reduce((total, item) => total + item.quantity, 0);

  const totalKeluar = movements
    .filter((item) => item.movement_type === "keluar")
    .reduce((total, item) => total + item.quantity, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 text-white">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Stok</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pantau seluruh perubahan stok produk bisnis Anda.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm text-slate-400">Total Pergerakan</p>
            <h2 className="mt-2 text-2xl font-bold">
              {movements.length}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm text-slate-400">Total Stok Masuk</p>
            <h2 className="mt-2 text-2xl font-bold text-emerald-400">
              +{totalMasuk} unit
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm text-slate-400">Total Stok Keluar</p>
            <h2 className="mt-2 text-2xl font-bold text-red-400">
              -{totalKeluar} unit
            </h2>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold">Daftar Riwayat Stok</h2>
              <p className="mt-1 text-sm text-slate-400">
                Catatan perubahan stok seluruh produk.
              </p>
            </div>

            <button
              onClick={loadMovements}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Memuat..." : "Muat Ulang"}
            </button>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama produk atau nomor pesanan..."
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none"
            >
              <option value="semua">Semua Pergerakan</option>
              <option value="masuk">Stok Masuk</option>
              <option value="keluar">Stok Keluar</option>
            </select>
          </div>

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <p className="py-10 text-center text-slate-400">
              Memuat riwayat stok...
            </p>
          ) : !error && filteredMovements.length === 0 ? (
            <p className="py-10 text-center text-slate-400">
              Belum ada riwayat stok yang ditemukan.
            </p>
          ) : !error ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3">Pergerakan</th>
                    <th className="px-4 py-3">Jumlah</th>
                    <th className="px-4 py-3">Stok Sebelum</th>
                    <th className="px-4 py-3">Stok Sesudah</th>
                    <th className="px-4 py-3">Sumber</th>
                    <th className="px-4 py-3">Keterangan</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMovements.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-800/70 hover:bg-slate-900/70"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-slate-300">
                        {formatDate(item.created_at)}
                      </td>

                      <td className="px-4 py-4 font-medium text-white">
                        {item.product_name}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.movement_type === "masuk"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {item.movement_type === "masuk"
                            ? "Masuk"
                            : "Keluar"}
                        </span>
                      </td>

                      <td
                        className={`px-4 py-4 font-semibold ${
                          item.movement_type === "masuk"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {item.movement_type === "masuk" ? "+" : "-"}
                        {item.quantity} unit
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {item.stock_before}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {item.stock_after}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {sourceLabels[item.source] || item.source}
                        {item.reference_id && (
                          <p className="mt-1 text-xs text-slate-500">
                            Pesanan #{item.reference_id}
                          </p>
                        )}
                      </td>

                      <td className="max-w-xs px-4 py-4 text-slate-400">
                        {item.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-slate-500">
            Menampilkan {filteredMovements.length} dari {movements.length} riwayat.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default StockHistory;
