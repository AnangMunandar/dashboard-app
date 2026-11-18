
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

// Format tanggal lokal
function tanggalLokal(value) {
  const date = new Date(value);

  const tahun = date.getFullYear();
  const bulan = String(date.getMonth() + 1).padStart(2, "0");
  const hari = String(date.getDate()).padStart(2, "0");

  return `${tahun}-${bulan}-${hari}`;
}

// Memuat logo dan mengubahnya menjadi PNG untuk PDF
async function loadImageAsDataURL(url) {
  if (!url) return null;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Gagal mengambil logo.");
    }

    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    const canvas = document.createElement("canvas");
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    const context = canvas.getContext("2d");

    if (!context) {
      imageBitmap.close();
      throw new Error("Gagal membuat canvas.");
    }

    context.drawImage(imageBitmap, 0, 0);
    imageBitmap.close();

    return canvas.toDataURL("image/png");
  } catch (error) {
    console.error("Gagal memuat logo PDF:", error);
    return null;
  }
}

function Reports() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Identitas bisnis Admin yang sedang login
  const [businessProfile, setBusinessProfile] = useState({
    business_name: "Bisnis Saya",
    logo_url: "",
  });

  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalAkhir, setTanggalAkhir] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");

  // Memuat data transaksi
  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          throw new Error("Pengguna belum login.");
        }

        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setOrders(data || []);
      } catch (error) {
        setError("Gagal memuat laporan: " + error.message);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  // Memuat identitas bisnis Admin
  useEffect(() => {
    async function loadBusinessProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) return;

      const { data, error } = await supabase
        .from("business_profiles")
        .select("business_name, logo_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setBusinessProfile({
          business_name: data.business_name || "Bisnis Saya",
          logo_url: data.logo_url || "",
        });
      }
    }

    loadBusinessProfile();
  }, []);

  // Filter transaksi
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

  // Ringkasan transaksi
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

  // Data grafik
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

  // Reset filter
  function resetFilter() {
    setTanggalMulai("");
    setTanggalAkhir("");
    setStatusFilter("semua");
  }

  // Export Excel dengan format profesional
  function exportExcel() {
    const namaBisnis =
      businessProfile.business_name || "Bisnis Saya";

    const data = [
      [namaBisnis],
      ["LAPORAN PENJUALAN"],
      [],
      [
        "Periode",
        "",
        `${tanggalMulai || "Semua"} sampai ${tanggalAkhir || "Semua"}`,
      ],
      ["Status Transaksi", "", statusFilter],
      ["Total Transaksi", "", totalTransaksi],
      ["Total Pendapatan", "", totalPendapatan],
      [],
      ["No", "Pelanggan", "Jumlah", "Status", "Tanggal"],
      ...filteredOrders.map((order, index) => [
        index + 1,
        order.customer_name || "-",
        Number(order.amount || 0),
        order.status || "-",
        new Date(order.created_at).toLocaleDateString("id-ID"),
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Menggabungkan judul bisnis dan judul laporan
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },

      // Menggabungkan label dan nilai ringkasan
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
      { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } },

      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
      { s: { r: 4, c: 2 }, e: { r: 4, c: 4 } },

      { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
      { s: { r: 5, c: 2 }, e: { r: 5, c: 4 } },

      { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
      { s: { r: 6, c: 2 }, e: { r: 6, c: 4 } },
    ];

    // Lebar setiap kolom
    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
    ];

    // Tinggi baris judul
    worksheet["!rows"] = [
      { hpt: 28 },
      { hpt: 22 },
    ];

    // Filter otomatis pada tabel
    const barisTerakhir = 9 + filteredOrders.length;

    worksheet["!autofilter"] = {
      ref: `A9:E${barisTerakhir}`,
    };

    // Format total pendapatan menjadi Rupiah
    if (worksheet["C7"]) {
      worksheet["C7"].z = '"Rp" #,##0';
    }

    // Format jumlah setiap transaksi menjadi Rupiah
    for (let i = 0; i < filteredOrders.length; i++) {
      const cell = worksheet[`C${10 + i}`];

      if (cell) {
        cell.z = '"Rp" #,##0';
      }
    }

    // Membuat workbook
    const workbook = XLSX.utils.book_new();

    workbook.Props = {
      Title: "Laporan Penjualan",
      Subject: `Laporan Penjualan ${namaBisnis}`,
      Author: namaBisnis,
      Company: namaBisnis,
    };

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Laporan Penjualan"
    );

    // Nama file mengikuti bisnis
    const namaFile = namaBisnis.replace(
      /[^a-zA-Z0-9-_]/g,
      "-"
    );

    XLSX.writeFile(
      workbook,
      `Laporan-Penjualan-${namaFile}.xlsx`
    );
  }

  // Export PDF dengan logo dan identitas bisnis
  async function exportPDF() {
    const doc = new jsPDF();

    // Memuat logo bisnis
    const logoData = await loadImageAsDataURL(
      businessProfile.logo_url
    );

    // Posisi nama bisnis menyesuaikan keberadaan logo
    let headerX = 14;

    if (logoData) {
      try {
        doc.addImage(
          logoData,
          "PNG",
          14,
          10,
          18,
          18
        );

        headerX = 38;
      } catch (error) {
        console.error("Gagal menambahkan logo ke PDF:", error);
      }
    }

    // Nama bisnis
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(
      businessProfile.business_name || "Bisnis Saya",
      headerX,
      20
    );

    // Judul laporan
    doc.setFontSize(12);
    doc.text(
      "LAPORAN PENJUALAN",
      headerX,
      29
    );

    // Informasi laporan
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    doc.text(
      `Periode: ${tanggalMulai || "Semua"} sampai ${tanggalAkhir || "Semua"}`,
      14,
      42
    );

    doc.text(
      `Status: ${statusFilter}`,
      14,
      48
    );

    // Ringkasan
    doc.setFont("helvetica", "bold");

    doc.text(
      `Total Transaksi: ${totalTransaksi}`,
      14,
      58
    );

    doc.text(
      `Total Pendapatan: ${formatRupiah(totalPendapatan)}`,
      14,
      64
    );

    doc.setFont("helvetica", "normal");

    // Tabel laporan
    autoTable(doc, {
      startY: 72,
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

    // Nama file sesuai bisnis
    const namaFile = (
      businessProfile.business_name || "Bisnis Saya"
    ).replace(/[^a-zA-Z0-9-_]/g, "-");

    doc.save(
      `Laporan-Penjualan-${namaFile}.pdf`
    );
  }

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500";

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-white">
        Laporan Penjualan
      </h2>

      <p className="mt-1 text-slate-400">
        Pantau transaksi dan pendapatan bisnis {businessProfile.business_name}.
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
