
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";

const sourceLabels = {
  produk_baru: "Produk Baru",
  pesanan: "Penyelesaian Pesanan",
  pembatalan_pesanan: "Pembatalan Pesanan",
  penyesuaian_manual: "Penyesuaian Manual",
};

const inputClass =
  "w-full min-w-0 rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-4 py-3 text-sm text-[#F5F1E8] outline-none transition placeholder:text-[#817765] focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30";

const SCROLL_STORAGE_KEY = "masmuns-stock-history-table-scroll";

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

  const tableScrollRef = useRef(null);

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

  useEffect(() => {
    loadMovements();
  }, []);

  const filteredMovements = movements.filter((item) => {
    const matchesSearch =
      (item.product_name || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(item.reference_id || "").includes(search);

    const matchesFilter =
      filter === "semua" ||
      (filter === "masuk" && item.movement_type === "masuk") ||
      (filter === "keluar" && item.movement_type === "keluar");

    return matchesSearch && matchesFilter;
  });

  // Pulihkan posisi tabel setelah tabel selesai dirender.
  useLayoutEffect(() => {
    if (loading || error || filteredMovements.length === 0) return;

    const tableContainer = tableScrollRef.current;
    const savedPosition = sessionStorage.getItem(SCROLL_STORAGE_KEY);

    if (tableContainer && savedPosition !== null) {
      tableContainer.scrollLeft = Number(savedPosition);
    }
  }, [loading, error, filteredMovements.length]);

  // Simpan posisi setiap kali tabel digeser.
  function handleTableScroll(event) {
    sessionStorage.setItem(
      SCROLL_STORAGE_KEY,
      String(event.currentTarget.scrollLeft)
    );
  }

  const totalMasuk = movements
    .filter((item) => item.movement_type === "masuk")
    .reduce((total, item) => total + Number(item.quantity || 0), 0);

  const totalKeluar = movements
    .filter((item) => item.movement_type === "keluar")
    .reduce((total, item) => total + Number(item.quantity || 0), 0);

  const statCards = [
    {
      title: "Total Pergerakan",
      value: movements.length,
      note: "Seluruh catatan perubahan stok",
    },
    {
      title: "Total Stok Masuk",
      value: `+${totalMasuk} unit`,
      note: "Akumulasi stok masuk",
    },
    {
      title: "Total Stok Keluar",
      value: `-${totalKeluar} unit`,
      note: "Akumulasi stok keluar",
    },
  ];

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6">
        {/* HEADER */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A96E]">
            Inventory Management
          </p>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-[#F5F1E8] sm:text-2xl">
            Riwayat Stok
          </h1>

          <p className="mt-2 text-sm text-[#A79B86]">
            Pantau seluruh perubahan stok produk bisnis Anda.
          </p>
        </div>

        {/* STATISTIK */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {statCards.map((item) => (
            <div
              key={item.title}
              className="relative overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-5 shadow-lg transition hover:border-[#C9A96E]/50"
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-[#C9A96E]/70" />

              <div className="pl-2">
                <p className="text-sm text-[#A79B86]">{item.title}</p>

                <h2 className="mt-2 break-words text-2xl font-bold text-[#F5F1E8]">
                  {item.value}
                </h2>

                <p className="mt-1 text-xs text-[#8C8170]">{item.note}</p>
              </div>
            </div>
          ))}
        </div>

        {/* DAFTAR RIWAYAT */}
        <div className="min-w-0 rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-5">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                Stock Activity
              </p>

              <h2 className="mt-1 text-lg font-semibold text-[#F5F1E8]">
                Daftar Riwayat Stok
              </h2>

              <p className="mt-1 text-sm text-[#A79B86]">
                Catatan perubahan stok seluruh produk.
              </p>
            </div>

            <button
              type="button"
              onClick={loadMovements}
              disabled={loading}
              className="w-full rounded-lg bg-[#C9A96E] px-4 py-3 text-sm font-semibold text-[#17130D] transition hover:bg-[#D8B982] disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
            >
              {loading ? "Memuat..." : "Muat Ulang"}
            </button>
          </div>

          {/* PENCARIAN DAN FILTER */}
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama produk atau nomor pesanan..."
              className={inputClass}
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className={inputClass}
            >
              <option value="semua">Semua Pergerakan</option>
              <option value="masuk">Stok Masuk</option>
              <option value="keluar">Stok Keluar</option>
            </select>
          </div>

          {/* ERROR */}
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* TABEL */}
          {loading ? (
            <p className="py-10 text-center text-[#A79B86]">
              Memuat riwayat stok...
            </p>
          ) : !error && filteredMovements.length === 0 ? (
            <p className="py-10 text-center text-[#A79B86]">
              Belum ada riwayat stok yang ditemukan.
            </p>
          ) : !error ? (
            <div
              ref={tableScrollRef}
              onScroll={handleTableScroll}
              className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-[#C9A96E]/15"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#181818] text-xs uppercase tracking-wider text-[#C9A96E]">
                  <tr className="border-b border-[#C9A96E]/15">
                    <th className="px-4 py-4">Tanggal</th>
                    <th className="px-4 py-4">Produk</th>
                    <th className="px-4 py-4">Pergerakan</th>
                    <th className="px-4 py-4">Jumlah</th>
                    <th className="px-4 py-4">Stok Sebelum</th>
                    <th className="px-4 py-4">Stok Sesudah</th>
                    <th className="px-4 py-4">Sumber</th>
                    <th className="px-4 py-4">Keterangan</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMovements.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-[#C9A96E]/10 text-[#C8BDAA] transition hover:bg-[#292929]"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-[#A79B86]">
                        {formatDate(item.created_at)}
                      </td>

                      <td className="px-4 py-4 font-medium text-[#F5F1E8]">
                        {item.product_name}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                            item.movement_type === "masuk"
                              ? "border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#D8B982]"
                              : "border-red-500/20 bg-red-500/10 text-red-400"
                          }`}
                        >
                          {item.movement_type === "masuk" ? "Masuk" : "Keluar"}
                        </span>
                      </td>

                      <td
                        className={`whitespace-nowrap px-4 py-4 font-semibold ${
                          item.movement_type === "masuk"
                            ? "text-[#D8B982]"
                            : "text-red-400"
                        }`}
                      >
                        {item.movement_type === "masuk" ? "+" : "-"}
                        {item.quantity} unit
                      </td>

                      <td className="px-4 py-4 text-[#C8BDAA]">
                        {item.stock_before}
                      </td>

                      <td className="px-4 py-4 text-[#C8BDAA]">
                        {item.stock_after}
                      </td>

                      <td className="px-4 py-4 text-[#C8BDAA]">
                        {sourceLabels[item.source] || item.source}

                        {item.reference_id && (
                          <p className="mt-1 text-xs text-[#8C8170]">
                            Pesanan #{item.reference_id}
                          </p>
                        )}
                      </td>

                      <td className="max-w-xs px-4 py-4 text-[#A79B86]">
                        {item.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-[#8C8170]">
            Menampilkan {filteredMovements.length} dari {movements.length} riwayat.
          </p>

          <p className="mt-2 text-xs text-[#8C8170] sm:hidden">
            Geser tabel ke kiri atau kanan untuk melihat seluruh kolom.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default StockHistory;
