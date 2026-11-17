
import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";
import OrdersTable from "../components/OrdersTable";
import OrderForm from "../components/OrderForm";
import OrderFilters from "../components/OrderFilters";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { formatRupiah } from "../lib/format";

// Export laporan pesanan ke Excel
function exportToExcel(orders) {
  const dataExcel = orders.map((order, index) => ({
    No: index + 1,
    NamaPelanggan: order.customer_name,
    Jumlah: Number(order.amount || 0),
    Status: order.status,
    Tanggal: new Date(order.created_at).toLocaleDateString("id-ID"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(dataExcel);

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
    "Laporan Pesanan"
  );

  XLSX.writeFile(workbook, "Laporan-Pesanan.xlsx");
}

// Export laporan pesanan ke PDF dengan desain profesional
function exportToPDF(orders, periode) {
  const doc = new jsPDF();
  const lebarHalaman = doc.internal.pageSize.getWidth();

  const namaPeriode = {
    hariini: "Hari Ini",
    "7hari": "7 Hari Terakhir",
    "30hari": "30 Hari Terakhir",
    semua: "Semua Data",
  };

  const totalPesanan = orders.length;

  const totalPendapatan = orders.reduce(
    (total, order) => total + Number(order.amount || 0),
    0
  );

  // HEADER LAPORAN
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, lebarHalaman, 48, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MasMuns", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("LAPORAN TRANSAKSI PESANAN", 14, 29);

  doc.text(
    `Periode: ${namaPeriode[periode] || "Semua Data"}`,
    14,
    38
  );

  // TANGGAL CETAK
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(9);

  doc.text(
    `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`,
    lebarHalaman - 14,
    58,
    { align: "right" }
  );

  // KOTAK RINGKASAN
  const lebarKotak = (lebarHalaman - 38) / 2;

  doc.setFillColor(241, 245, 249);

  doc.roundedRect(
    14,
    66,
    lebarKotak,
    22,
    3,
    3,
    "F"
  );

  doc.roundedRect(
    24 + lebarKotak,
    66,
    lebarKotak,
    22,
    3,
    3,
    "F"
  );

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);

  doc.text("TOTAL PESANAN", 19, 74);
  doc.text(
    "TOTAL PENDAPATAN",
    29 + lebarKotak,
    74
  );

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);

  doc.text(String(totalPesanan), 19, 82);

  doc.text(
    formatRupiah(totalPendapatan),
    29 + lebarKotak,
    82
  );

  // JUDUL TABEL
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);

  doc.text("Rincian Transaksi", 14, 101);

  // TABEL TRANSAKSI
  autoTable(doc, {
    startY: 106,

    margin: {
      left: 14,
      right: 14,
      bottom: 18,
    },

    head: [
      ["No", "Nama Pelanggan", "Jumlah", "Status", "Tanggal"],
    ],

    body: orders.map((order, index) => [
      index + 1,
      order.customer_name || "-",
      formatRupiah(Number(order.amount || 0)),
      order.status || "-",
      new Date(order.created_at).toLocaleDateString("id-ID"),
    ]),

    theme: "grid",

    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      textColor: [51, 65, 85],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },

    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },

    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },

    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 48 },
      2: { cellWidth: 42, halign: "right" },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 35, halign: "center" },
    },
  });

  // NOMOR HALAMAN
  const jumlahHalaman = doc.internal.getNumberOfPages();

  for (let halaman = 1; halaman <= jumlahHalaman; halaman++) {
    doc.setPage(halaman);

    const tinggiHalaman = doc.internal.pageSize.getHeight();

    doc.setDrawColor(203, 213, 225);

    doc.line(
      14,
      tinggiHalaman - 14,
      lebarHalaman - 14,
      tinggiHalaman - 14
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    doc.text(
      "MasMuns - Laporan Pesanan",
      14,
      tinggiHalaman - 8
    );

    doc.text(
      `Halaman ${halaman} dari ${jumlahHalaman}`,
      lebarHalaman - 14,
      tinggiHalaman - 8,
      { align: "right" }
    );
  }

  // SIMPAN PDF
  doc.save("Laporan-Pesanan.pdf");
}

function Dashboard() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [periode, setPeriode] = useState("semua");

  // Mengambil data pesanan
  const loadOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError("Gagal memuat data: " + error.message);
    } else {
      setError("");
      setOrders(data || []);
    }

    setLoading(false);
  }, []);

  // Mengambil data produk
  const loadProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*");

    if (error) {
      setError("Gagal memuat produk: " + error.message);
    } else {
      setProducts(data || []);
    }

    setLoadingProducts(false);
  }, []);

  // Memuat pesanan dan produk otomatis
  useEffect(() => {
    loadOrders();
    loadProducts();
  }, [loadOrders, loadProducts]);

  // Mengubah status pesanan
  async function handleToggleStatus(order) {
    const statusBaru =
      order.status === "selesai" ? "pending" : "selesai";

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

  // Menghapus pesanan
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

  // Statistik pesanan
  const total = orders.length;

  const selesai = orders.filter(
    (o) => o.status === "selesai"
  ).length;

  const pendapatan = orders.reduce(
    (jumlah, o) => jumlah + Number(o.amount || 0),
    0
  );

  // Memfilter pesanan berdasarkan periode grafik
  const filteredChartOrders = orders.filter((order) => {
    if (periode === "semua") return true;

    const tanggalOrder = new Date(order.created_at);

    const awalHariIni = new Date();
    awalHariIni.setHours(0, 0, 0, 0);

    const batasTanggal = new Date(awalHariIni);

    if (periode === "7hari") {
      batasTanggal.setDate(
        awalHariIni.getDate() - 6
      );
    } else if (periode === "30hari") {
      batasTanggal.setDate(
        awalHariIni.getDate() - 29
      );
    }

    return tanggalOrder >= batasTanggal;
  });

  // Mengelompokkan pendapatan berdasarkan tanggal
  const salesChartData = Object.values(
    filteredChartOrders.reduce((result, order) => {
      const tanggalOrder = new Date(order.created_at);

      const tanggalKey = [
        tanggalOrder.getFullYear(),
        String(tanggalOrder.getMonth() + 1).padStart(2, "0"),
        String(tanggalOrder.getDate()).padStart(2, "0"),
      ].join("-");

      const tanggalLabel = tanggalOrder.toLocaleDateString(
        "id-ID",
        {
          day: "2-digit",
          month: "short",
        }
      );

      if (!result[tanggalKey]) {
        result[tanggalKey] = {
          tanggal: tanggalLabel,
          pendapatan: 0,
          sortDate: tanggalKey,
        };
      }

      result[tanggalKey].pendapatan += Number(
        order.amount || 0
      );

      return result;
    }, {})
  ).sort((a, b) =>
    a.sortDate.localeCompare(b.sortDate)
  );

  // Mengelompokkan jumlah pesanan berdasarkan tanggal
  const ordersChartData = Object.values(
    filteredChartOrders.reduce((result, order) => {
      const tanggalOrder = new Date(order.created_at);

      const tanggalKey = [
        tanggalOrder.getFullYear(),
        String(tanggalOrder.getMonth() + 1).padStart(2, "0"),
        String(tanggalOrder.getDate()).padStart(2, "0"),
      ].join("-");

      const tanggalLabel = tanggalOrder.toLocaleDateString(
        "id-ID",
        {
          day: "2-digit",
          month: "short",
        }
      );

      if (!result[tanggalKey]) {
        result[tanggalKey] = {
          tanggal: tanggalLabel,
          jumlah: 0,
          sortDate: tanggalKey,
        };
      }

      result[tanggalKey].jumlah += 1;

      return result;
    }, {})
  ).sort((a, b) =>
    a.sortDate.localeCompare(b.sortDate)
  );

  // Statistik produk
  const totalProduk = products.length;

  const totalStok = products.reduce(
    (jumlah, product) =>
      jumlah + Number(product.stock || 0),
    0
  );

  const nilaiInventaris = products.reduce(
    (jumlah, product) =>
      jumlah +
      Number(product.price || 0) *
        Number(product.stock || 0),
    0
  );

  // Filter daftar pesanan
  const filteredOrders = orders.filter((o) => {
    const cocokNama = (o.customer_name || "")
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const cocokStatus =
      statusFilter === "semua" ||
      o.status === statusFilter;

    return cocokNama && cocokStatus;
  });

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-white">
        Selamat datang
      </h2>

      <p className="mt-1 text-slate-300">
        Login sebagai {user?.email}
      </p>

      {error && (
        <p className="mt-4 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Statistik Pesanan */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
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
          value={
            loading ? "..." : formatRupiah(pendapatan)
          }
          note="Jumlah semua pesanan"
        />
      </div>

      {/* Statistik Produk */}
      <h3 className="mb-3 mt-8 text-lg font-semibold text-white">
        Ringkasan Produk
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        <StatCard
          title="Total Produk"
          value={loadingProducts ? "..." : totalProduk}
          note="Produk terdaftar"
        />

        <StatCard
          title="Total Stok"
          value={loadingProducts ? "..." : totalStok}
          note="Jumlah seluruh stok"
        />

        <StatCard
          title="Nilai Inventaris"
          value={
            loadingProducts
              ? "..."
              : formatRupiah(nilaiInventaris)
          }
          note="Total nilai persediaan"
        />
      </div>

      {/* Filter Periode Grafik dan Export */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Analisis Penjualan
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Pilih periode untuk melihat perkembangan bisnis
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none focus:border-sky-500"
            >
              <option value="hariini">Hari Ini</option>
              <option value="7hari">7 Hari Terakhir</option>
              <option value="30hari">30 Hari Terakhir</option>
              <option value="semua">Semua Data</option>
            </select>

            <button
              onClick={() => exportToExcel(filteredChartOrders)}
              disabled={loading || filteredChartOrders.length === 0}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export Excel
            </button>

            <button
              onClick={() => exportToPDF(filteredChartOrders, periode)}
              disabled={loading || filteredChartOrders.length === 0}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export PDF
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Menampilkan {filteredChartOrders.length} dari {total} pesanan
          sesuai periode yang dipilih.
        </p>
      </div>

      {/* Grafik Pendapatan */}
      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-white">
            Grafik Pendapatan
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Pendapatan berdasarkan tanggal pesanan
          </p>
        </div>

        {loading ? (
          <p className="py-12 text-center text-slate-400">
            Memuat grafik...
          </p>
        ) : salesChartData.length === 0 ? (
          <p className="py-12 text-center text-slate-400">
            Belum ada data penjualan pada periode ini.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={salesChartData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                />

                <XAxis
                  dataKey="tanggal"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) {
                      return `Rp${(value / 1000000).toFixed(1)}jt`;
                    }

                    if (value >= 1000) {
                      return `Rp${(value / 1000).toFixed(0)}rb`;
                    }

                    return `Rp${value}`;
                  }}
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
                  labelStyle={{ color: "#cbd5e1" }}
                />

                <Line
                  type="monotone"
                  dataKey="pendapatan"
                  name="Pendapatan"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{
                    r: 5,
                    fill: "#38bdf8",
                  }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Grafik Jumlah Pesanan */}
      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950 p-5">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-white">
            Grafik Jumlah Pesanan
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Jumlah transaksi berdasarkan tanggal
          </p>
        </div>

        {loading ? (
          <p className="py-12 text-center text-slate-400">
            Memuat grafik...
          </p>
        ) : ordersChartData.length === 0 ? (
          <p className="py-12 text-center text-slate-400">
            Belum ada data pesanan pada periode ini.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ordersChartData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                />

                <XAxis
                  dataKey="tanggal"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                />

                <YAxis
                  stroke="#94a3b8"
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                />

                <Tooltip
                  formatter={(value) => [
                    `${value} pesanan`,
                    "Jumlah Pesanan",
                  ]}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#cbd5e1" }}
                />

                <Bar
                  dataKey="jumlah"
                  name="Jumlah Pesanan"
                  fill="#38bdf8"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Form Pesanan */}
      <div className="mt-8">
        <OrderForm onAdded={loadOrders} />
      </div>

      {/* Daftar Pesanan */}
      <h3 className="mb-3 mt-8 text-lg font-semibold text-white">
        Daftar Pesanan
      </h3>

      <OrderFilters
        search={search}
        onSearch={setSearch}
        status={statusFilter}
        onStatus={setStatusFilter}
      />

      <OrdersTable
        orders={filteredOrders}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />

      <p className="mt-2 text-xs text-slate-500">
        Menampilkan {filteredOrders.length} dari {total} pesanan
      </p>
    </DashboardLayout>
  );
}

export default Dashboard;
