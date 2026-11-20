
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

// Export laporan pesanan ke PDF
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

  // Pendapatan PDF hanya menghitung pesanan selesai
  const totalPendapatan = orders
    .filter((order) => order.status === "selesai")
    .reduce(
      (total, order) => total + Number(order.amount || 0),
      0
    );

  // Header Luxury Black & Gold
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, lebarHalaman, 48, "F");

  doc.setFillColor(201, 169, 110);
  doc.rect(0, 46, lebarHalaman, 2, "F");

  doc.setTextColor(201, 169, 110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MasMuns", 14, 20);

  doc.setTextColor(245, 241, 232);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("LAPORAN TRANSAKSI PESANAN", 14, 29);

  doc.setFontSize(9);
  doc.text(
    `Periode: ${namaPeriode[periode] || "Semua Data"}`,
    14,
    38
  );

  // Tanggal cetak
  doc.setTextColor(90, 90, 90);
  doc.setFontSize(9);

  doc.text(
    `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`,
    lebarHalaman - 14,
    58,
    { align: "right" }
  );

  // Kotak ringkasan
  const lebarKotak = (lebarHalaman - 38) / 2;

  doc.setFillColor(245, 241, 232);

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

  doc.setTextColor(120, 105, 80);
  doc.setFontSize(9);

  doc.text("TOTAL PESANAN", 19, 74);
  doc.text(
    "TOTAL PENDAPATAN",
    29 + lebarKotak,
    74
  );

  doc.setTextColor(17, 17, 17);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);

  doc.text(String(totalPesanan), 19, 82);

  doc.text(
    formatRupiah(totalPendapatan),
    29 + lebarKotak,
    82
  );

  // Judul tabel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(17, 17, 17);

  doc.text("Rincian Transaksi", 14, 101);

  // Tabel transaksi
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
      textColor: [55, 55, 55],
      lineColor: [220, 210, 190],
      lineWidth: 0.2,
    },

    headStyles: {
      fillColor: [201, 169, 110],
      textColor: [17, 17, 17],
      fontStyle: "bold",
      halign: "center",
    },

    alternateRowStyles: {
      fillColor: [248, 245, 238],
    },

    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 48 },
      2: { cellWidth: 42, halign: "right" },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 35, halign: "center" },
    },
  });

  // Nomor halaman
  const jumlahHalaman = doc.internal.getNumberOfPages();

  for (let halaman = 1; halaman <= jumlahHalaman; halaman++) {
    doc.setPage(halaman);

    const tinggiHalaman = doc.internal.pageSize.getHeight();

    doc.setDrawColor(201, 169, 110);

    doc.line(
      14,
      tinggiHalaman - 14,
      lebarHalaman - 14,
      tinggiHalaman - 14
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 105, 80);

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

  doc.save("Laporan-Pesanan.pdf");
}

function Dashboard() {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [periode, setPeriode] = useState("semua");

  // Mengambil data pesanan
  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError("Gagal memuat data: " + error.message);
    } else {
      setError("");
      setOrders(data || []);
    }

    setLoading(false);
  }, [user?.id]);

  // Mengambil data produk
  const loadProducts = useCallback(async () => {
    if (!user?.id) {
      setProducts([]);
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      setError("Gagal memuat produk: " + error.message);
    } else {
      setProducts(data || []);
    }

    setLoadingProducts(false);
  }, [user?.id]);

  // Mengambil data pengeluaran
  const loadExpenses = useCallback(async () => {
    if (!user?.id) {
      setExpenses([]);
      setLoadingExpenses(false);
      return;
    }

    setLoadingExpenses(true);

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      setError("Gagal memuat pengeluaran: " + error.message);
    } else {
      setExpenses(data || []);
    }

    setLoadingExpenses(false);
  }, [user?.id]);

  // Memuat pesanan, produk, dan pengeluaran otomatis
  useEffect(() => {
    loadOrders();
    loadProducts();
    loadExpenses();
  }, [loadOrders, loadProducts, loadExpenses]);

  // Mengubah status pesanan sekaligus mengatur stok
  async function handleToggleStatus(order) {
    if (!user?.id) {
      setError("Silakan login kembali.");
      return;
    }

    const statusBaru =
      order.status === "selesai" ? "pending" : "selesai";

    const { error } = await supabase.rpc("set_order_status", {
      p_order_id: order.id,
      p_new_status: statusBaru,
    });

    if (error) {
      setError("Gagal mengubah status: " + error.message);
      return;
    }

    setError("");

    await Promise.all([
      loadOrders(),
      loadProducts(),
    ]);
  }

  // Menghapus pesanan sekaligus mengatur stok
  async function handleDelete(order) {
    if (!user?.id) {
      setError("Silakan login kembali.");
      return;
    }

    const yakin = window.confirm(
      `Hapus pesanan atas nama ${order.customer_name}?`
    );

    if (!yakin) return;

    const { error } = await supabase.rpc(
      "delete_order_with_stock",
      {
        p_order_id: order.id,
      }
    );

    if (error) {
      setError("Gagal menghapus pesanan: " + error.message);
      return;
    }

    setError("");

    await Promise.all([
      loadOrders(),
      loadProducts(),
    ]);
  }

  // Statistik pesanan
  const total = orders.length;

  const selesai = orders.filter(
    (order) => order.status === "selesai"
  ).length;

  // Total pendapatan semua pesanan
  const pendapatan = orders.reduce(
    (jumlah, order) =>
      jumlah + Number(order.amount || 0),
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

  // Ringkasan keuangan
  const pendapatanSelesai = orders
    .filter((order) => order.status === "selesai")
    .reduce(
      (total, order) =>
        total + Number(order.amount || 0),
      0
    );

  const totalPengeluaran = expenses.reduce(
    (total, expense) =>
      total + Number(expense.amount || 0),
    0
  );

  const labaBersih =
    pendapatanSelesai - totalPengeluaran;

  // Filter daftar pesanan
  const filteredOrders = orders.filter((order) => {
    const cocokNama = (order.customer_name || "")
      .toLowerCase()
      .includes(search.trim().toLowerCase());

    const cocokStatus =
      statusFilter === "semua" ||
      order.status === statusFilter;

    return cocokNama && cocokStatus;
  });

  return (
    <DashboardLayout>
      {/* Header Dashboard */}
      <div className="mb-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-px w-8 bg-[#C9A96E]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A96E]">
            Business Overview
          </p>
        </div>

        <h2 className="mt-3 text-2xl font-bold tracking-wide text-[#F5F1E8] sm:text-3xl">
          Selamat Datang
        </h2>

        <p className="mt-2 text-sm text-[#A79B86]">
          Login sebagai{" "}
          <span className="font-medium text-[#C9A96E]">
            {user?.email}
          </span>
        </p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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

      {/* Ringkasan Keuangan */}
      <div className="mb-3 mt-9 flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-[#C9A96E]" />
        <h3 className="text-lg font-semibold text-[#F5F1E8]">
          Ringkasan Keuangan
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
        <StatCard
          title="Pendapatan Selesai"
          value={
            loading
              ? "..."
              : formatRupiah(pendapatanSelesai)
          }
          note="Pesanan berstatus selesai"
        />

        <StatCard
          title="Total Pengeluaran"
          value={
            loadingExpenses
              ? "..."
              : formatRupiah(totalPengeluaran)
          }
          note="Seluruh pengeluaran tercatat"
        />

        <StatCard
          title="Laba Bersih"
          value={
            loading || loadingExpenses
              ? "..."
              : formatRupiah(labaBersih)
          }
          note="Pendapatan selesai dikurangi pengeluaran"
        />
      </div>

      {/* Statistik Produk */}
      <div className="mb-3 mt-9 flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-[#C9A96E]" />
        <h3 className="text-lg font-semibold text-[#F5F1E8]">
          Ringkasan Produk
        </h3>
      </div>

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
      <div className="mt-9 rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-[#C9A96E]" />
              <h3 className="text-lg font-semibold text-[#F5F1E8]">
                Analisis Penjualan
              </h3>
            </div>

            <p className="mt-2 text-sm text-[#8C8170]">
              Pilih periode untuk melihat perkembangan bisnis.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-4 py-2.5 text-sm text-[#F5F1E8] outline-none focus:border-[#C9A96E]"
            >
              <option value="hariini">Hari Ini</option>
              <option value="7hari">7 Hari Terakhir</option>
              <option value="30hari">30 Hari Terakhir</option>
              <option value="semua">Semua Data</option>
            </select>

            <button
              onClick={() => exportToExcel(filteredChartOrders)}
              disabled={
                loading || filteredChartOrders.length === 0
              }
              className="rounded-lg border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-4 py-2.5 text-sm font-semibold text-[#D9BB83] transition hover:bg-[#C9A96E] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export Excel
            </button>

            <button
              onClick={() =>
                exportToPDF(filteredChartOrders, periode)
              }
              disabled={
                loading || filteredChartOrders.length === 0
              }
              className="rounded-lg bg-[#C9A96E] px-4 py-2.5 text-sm font-semibold text-[#111111] transition hover:bg-[#D9BB83] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export PDF
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs text-[#8C8170]">
          Menampilkan {filteredChartOrders.length} dari {total} pesanan
          sesuai periode yang dipilih.
        </p>
      </div>

      {/* Grafik Pendapatan */}
      <div className="mt-6 min-w-0 overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-5">
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-[#C9A96E]" />
            <h3 className="text-lg font-semibold text-[#F5F1E8]">
              Grafik Pendapatan
            </h3>
          </div>

          <p className="mt-2 text-sm text-[#8C8170]">
            Pendapatan berdasarkan tanggal pesanan.
          </p>
        </div>

        {loading ? (
          <p className="py-12 text-center text-[#A79B86]">
            Memuat grafik...
          </p>
        ) : salesChartData.length === 0 ? (
          <p className="py-12 text-center text-[#A79B86]">
            Belum ada data penjualan pada periode ini.
          </p>
        ) : (
          <div className="h-72 w-full min-w-0">
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
                  stroke="#3A352D"
                  vertical={false}
                />

                <XAxis
                  dataKey="tanggal"
                  stroke="#8C8170"
                  tick={{ fontSize: 10, fill: "#A79B86" }}
                  axisLine={{ stroke: "#514735" }}
                  tickLine={false}
                  minTickGap={18}
                  interval="preserveStartEnd"
                />

                <YAxis
                  stroke="#8C8170"
                  tick={{ fontSize: 11, fill: "#A79B86" }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) {
                      return `Rp${(value / 1000000).toFixed(1)}jt`;
                    }

                    if (value >= 1000) {
                      return `Rp${(value / 1000).toFixed(0)}rb`;
                    }

                    return `Rp${value}`;
                  }}
                  axisLine={false}
                  tickLine={false}
                  width={75}
                />

                <Tooltip
                  formatter={(value) => [
                    formatRupiah(value),
                    "Pendapatan",
                  ]}
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #C9A96E",
                    borderRadius: "10px",
                    color: "#F5F1E8",
                    fontSize: "12px",
                  }}
                  labelStyle={{
                    color: "#C9A96E",
                    marginBottom: "5px",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="pendapatan"
                  name="Pendapatan"
                  stroke="#C9A96E"
                  strokeWidth={3}
                  dot={{
                    r: 5,
                    fill: "#C9A96E",
                    stroke: "#171717",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 7,
                    fill: "#F5F1E8",
                    stroke: "#C9A96E",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Grafik Jumlah Pesanan */}
      <div className="mt-7 min-w-0 overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-5">
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-[#C9A96E]" />
            <h3 className="text-lg font-semibold text-[#F5F1E8]">
              Grafik Jumlah Pesanan
            </h3>
          </div>

          <p className="mt-2 text-sm text-[#8C8170]">
            Jumlah transaksi berdasarkan tanggal.
          </p>
        </div>

        {loading ? (
          <p className="py-12 text-center text-[#A79B86]">
            Memuat grafik...
          </p>
        ) : ordersChartData.length === 0 ? (
          <p className="py-12 text-center text-[#A79B86]">
            Belum ada data pesanan pada periode ini.
          </p>
        ) : (
          <div className="h-72 w-full min-w-0">
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
                  stroke="#3A352D"
                  vertical={false}
                />

                <XAxis
                  dataKey="tanggal"
                  stroke="#8C8170"
                  tick={{ fontSize: 10, fill: "#A79B86" }}
                  axisLine={{ stroke: "#514735" }}
                  tickLine={false}
                  minTickGap={18}
                  interval="preserveStartEnd"
                />

                <YAxis
                  stroke="#8C8170"
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#A79B86" }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(value) => [
                    `${value} pesanan`,
                    "Jumlah Pesanan",
                  ]}
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #C9A96E",
                    borderRadius: "10px",
                    color: "#F5F1E8",
                  }}
                  labelStyle={{
                    color: "#C9A96E",
                  }}
                />

                <Bar
                  dataKey="jumlah"
                  name="Jumlah Pesanan"
                  fill="#C9A96E"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={55}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Form Pesanan */}
      <div className="mt-8">
        <OrderForm
          onAdded={async () => {
            await Promise.all([
              loadOrders(),
              loadProducts(),
            ]);
          }}
        />
      </div>

      {/* Daftar Pesanan */}
      <div className="mb-4 mt-9 flex items-center gap-3">
        <span className="h-6 w-1 rounded-full bg-[#C9A96E]" />
        <h3 className="text-lg font-semibold text-[#F5F1E8]">
          Daftar Pesanan
        </h3>
      </div>

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

      <p className="mt-3 text-xs text-[#8C8170]">
        Menampilkan {filteredOrders.length} dari {total} pesanan.
      </p>
    </DashboardLayout>
  );
}

export default Dashboard;
