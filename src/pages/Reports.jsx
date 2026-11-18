
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { formatRupiah } from "../lib/format";

function tanggalLokal(value) {
  const date = new Date(value);

  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, "0");
  const hari = String(date.getDate()).padStart(2, "0");

  return `${tahun}-${bulan}-${hari}`;
}

function Reports() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setError("Gagal memuat laporan: " + error.message);
      } else {
        setOrders(data || []);
        setError("");
      }

      setLoading(false);
    }

    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const tanggal = tanggalLokal(order.created_at);

      const cocokMulai =
        !tanggalMulai || tanggal >= tanggalMulai;

      const cocokAkhir =
        !tanggalAkhir || tanggal <= tanggalAkhir;

      const cocokStatus =
        statusFilter === "semua" ||
        order.status === statusFilter;

      return cocokMulai && cocokAkhir && cocokStatus;
    });
  }, [orders, tanggalMulai, tanggalAkhir, statusFilter]);

  const totalTransaksi = filteredOrders.length;

  const totalPendapatan = filteredOrders.reduce(
    (total, order) => total + Number(order.amount || 0),
    0
  );

  const transaksiSelesai = filteredOrders.filter(
    (order) => order.status === "selesai"
  ).length;

  const transaksiPending = filteredOrders.filter(
    (order) => order.status === "pending"
  ).length;

  const chartData = useMemo(() => {
    const grouped = {};

    filteredOrders.forEach((order) => {
      const tanggal = tanggalLokal(order.created_at);

      if (!grouped[tanggal]) {
        grouped[tanggal] = {
          tanggal: new Date(
            `${tanggal}T00:00:00`
          ).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
          }),
          pendapatan: 0,
        };
      }

      grouped[tanggal].pendapatan += Number(
        order.amount || 0
      );
    });

    return Object.values(grouped).reverse();
  }, [filteredOrders]);

  function resetFilter() {
    setTanggalMulai("");
    setTanggalAkhir("");
    setStatusFilter("semua");
  }

  function exportExcel() {
    const data = filteredOrders.map((order, index) => ({
      No: index + 1,
      Pelanggan: order.customer_name || "-",
      Jumlah: Number(order.amount || 0),
      Status: order.status || "-",
      Tanggal: new Date(order.created_at).toLocaleDateString("id-ID"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    worksheet["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 18 },
      { wch: 15 },
      { wch: 18 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Laporan Penjualan"
    );

    XLSX.writeFile(workbook, "Laporan-Penjualan-MasMuns.xlsx");
  }

  function exportPDF() {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("MasMuns", 14, 20);

    doc.setFontSize(12);
    doc.text("LAPORAN PENJUALAN", 14, 29);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.text(
      `Periode: ${tanggalMulai || "Semua"} sampai ${tanggalAkhir || "Semua"}`,
      14,
      38
    );

    doc.text(
      `Status: ${statusFilter}`,
      14,
      44
    );

    doc.text(
      `Total Transaksi: ${totalTransaksi}`,
      14,
      54
    );

    doc.text(
      `Total Pendapatan: ${formatRupiah(totalPendapatan)}`,
      14,
      60
    );

    autoTable(doc, {
      startY: 68,
      head: [[
        "No",
        "Pelanggan",
        "Jumlah",
        "Status",
        "Tanggal",
      ]],
      body: filteredOrders.map((order, index) => [
        index + 1,
        order.customer_name || "-",
        formatRupiah(Number(order.amount || 0)),
        order.status || "-",
        new Date(order.created_at).toLocaleDateString("id-ID"),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [30, 41, 59],
      },
      theme: "grid",
    });

    doc.save("Laporan-Penjualan-MasMuns.pdf");
  }

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500";

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-white">
        Laporan Penjualan
      </h2>

      <p className="mt-1 text-slate-400">
        Pantau transaksi dan pendapatan bisnis MasMuns.
      </p>

      {error && (
        <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Filter laporan */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4">
        <h3 className="mb-4 font-semibold text-white">
          Filter Laporan
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Tanggal Mulai
            </label>
            <input
              type="date"
              value={tanggalMulai}
              onChange={(e) => setTanggalMulai(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Tanggal Akhir
            </label>
            <input
              type="date"
              min={tanggalMulai || undefined}
              value={tanggalAkhir}
              onChange={(e) => setTanggalAkhir(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Status Transaksi
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="semua">Semua Status</option>
              <option value="selesai">Selesai</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilter}
              className="w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Reset Filter
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Kosongkan tanggal untuk menampilkan semua data.
        </p>
      </div>

      {/* Ringkasan */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Total Transaksi",
            value: totalTransaksi,
          },
          {
            title: "Total Pendapatan",
            value: formatRupiah(totalPendapatan),
          },
          {
            title: "Transaksi Selesai",
            value: transaksiSelesai,
          },
          {
            title: "Transaksi Pending",
            value: transaksiPending,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-slate-800 bg-slate-950 p-4"
          >
            <p className="text-sm text-slate-400">
              {item.title}
            </p>
            <p className="mt-2 break-words text-xl font-bold text-white">
              {loading ? "..." : item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Grafik */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-5">
        <h3 className="font-semibold text-white">
          Grafik Pendapatan
        </h3>

        <p className="mb-5 mt-1 text-sm text-slate-400">
          Pendapatan berdasarkan tanggal transaksi.
        </p>

        {loading ? (
          <p className="py-12 text-center text-slate-400">
            Memuat grafik...
          </p>
        ) : chartData.length === 0 ? (
          <p className="py-12 text-center text-slate-400">
            Tidak ada data pada filter yang dipilih.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                />
                <XAxis
                  dataKey="tanggal"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) =>
                    value >= 1000000
                      ? `Rp${(value / 1000000).toFixed(1)}jt`
                      : value >= 1000
                        ? `Rp${(value / 1000).toFixed(0)}rb`
                        : `Rp${value}`
                  }
                  width={75}
                />
                <Tooltip
                  formatter={(value) => [
                    formatRupiah(value),
                    "Pendapatan",
                  ]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar
                  dataKey="pendapatan"
                  fill="#38bdf8"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={exportExcel}
          disabled={loading || filteredOrders.length === 0}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Export Excel
        </button>

        <button
          onClick={exportPDF}
          disabled={loading || filteredOrders.length === 0}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Export PDF
        </button>
      </div>

      {/* Tabel transaksi */}
      <div className="mt-8">
        <h3 className="mb-3 text-lg font-semibold text-white">
          Detail Transaksi
        </h3>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="px-4 py-3">Pelanggan</th>
                <th className="px-4 py-3">Jumlah</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tanggal</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-slate-400">
                    Memuat transaksi...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-slate-400">
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-slate-800 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {order.customer_name || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {formatRupiah(Number(order.amount || 0))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          order.status === "selesai"
                            ? "bg-green-500/10 text-green-400"
                            : "bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {order.status || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {new Date(order.created_at).toLocaleDateString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Menampilkan {filteredOrders.length} dari {orders.length} transaksi.
        </p>
      </div>
    </DashboardLayout>
  );
}

export default Reports;
