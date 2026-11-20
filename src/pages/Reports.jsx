
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

  // Pendapatan hanya berasal dari transaksi selesai
  const totalPendapatan = filteredOrders
    .filter((order) => order.status === "selesai")
    .reduce(
      (total, order) => total + Number(order.amount || 0),
      0
    );

  const transaksiSelesai = filteredOrders.filter(
    (order) => order.status === "selesai"
  ).length;

  const transaksiPending = filteredOrders.filter(
    (order) => order.status === "pending"
  ).length;

  // Data grafik: hanya menghitung transaksi selesai
  const chartData = useMemo(() => {
    const grouped = {};

    filteredOrders
      .filter((order) => order.status === "selesai")
      .forEach((order) => {
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

  // Export Excel
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

    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
      { s: { r: 3, c: 2 }, e: { r: 3, c: 4 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
      { s: { r: 4, c: 2 }, e: { r: 4, c: 4 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
      { s: { r: 5, c: 2 }, e: { r: 5, c: 4 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
      { s: { r: 6, c: 2 }, e: { r: 6, c: 4 } },
    ];

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 20 },
      { wch: 18 },
      { wch: 20 },
    ];

    worksheet["!rows"] = [
      { hpt: 28 },
      { hpt: 22 },
    ];

    const barisTerakhir = 9 + filteredOrders.length;

    worksheet["!autofilter"] = {
      ref: `A9:E${barisTerakhir}`,
    };

    if (worksheet["C7"]) {
      worksheet["C7"].z = '"Rp" #,##0';
    }

    for (let i = 0; i < filteredOrders.length; i++) {
      const cell = worksheet[`C${10 + i}`];

      if (cell) {
        cell.z = '"Rp" #,##0';
      }
    }

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

    const logoData = await loadImageAsDataURL(
      businessProfile.logo_url
    );

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

    // Identitas bisnis
    doc.setTextColor(201, 169, 110);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(
      businessProfile.business_name || "Bisnis Saya",
      headerX,
      20
    );

    // Judul laporan
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.text("LAPORAN PENJUALAN", headerX, 29);

    // Informasi laporan
    doc.setTextColor(90, 90, 90);
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
    doc.setTextColor(30, 30, 30);
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
        font: "helvetica",
        fontSize: 8,
        cellPadding: 3,
        textColor: [55, 55, 55],
        lineColor: [220, 210, 190],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [201, 169, 110],
        textColor: [17, 17, 17],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [248, 245, 238],
      },
      theme: "grid",
    });

    const namaFile = (
      businessProfile.business_name || "Bisnis Saya"
    ).replace(/[^a-zA-Z0-9-_]/g, "-");

    doc.save(
      `Laporan-Penjualan-${namaFile}.pdf`
    );
  }

  const inputClass =
    "w-full rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-3 py-2.5 text-sm text-[#F5F1E8] outline-none transition placeholder:text-[#756D60] focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30";

  const summaryItems = [
    {
      title: "Total Transaksi",
      value: totalTransaksi,
      description: "Seluruh transaksi sesuai filter",
    },
    {
      title: "Total Pendapatan",
      value: formatRupiah(totalPendapatan),
      description: "Hanya transaksi selesai",
    },
    {
      title: "Transaksi Selesai",
      value: transaksiSelesai,
      description: "Transaksi berhasil",
    },
    {
      title: "Transaksi Pending",
      value: transaksiPending,
      description: "Menunggu penyelesaian",
    },
  ];

  return (
    <DashboardLayout>
      {/* Header halaman */}
      <div className="mb-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-px w-8 bg-[#C9A96E]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A96E]">
            Business Analytics
          </p>
        </div>

        <h2 className="mt-3 text-2xl font-bold tracking-wide text-[#F5F1E8] sm:text-3xl">
          Laporan Penjualan
        </h2>

        <p className="mt-2 text-sm text-[#A79B86]">
          Pantau transaksi dan pendapatan bisnis{" "}
          <span className="font-semibold text-[#C9A96E]">
            {businessProfile.business_name}
          </span>
          .
        </p>
      </div>

      {error && (
        <p className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Filter laporan */}
      <div className="rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#C9A96E]">
            <span className="text-lg">⌕</span>
          </div>

          <div>
            <h3 className="font-semibold text-[#F5F1E8]">
              Filter Laporan
            </h3>
            <p className="mt-0.5 text-xs text-[#8C8170]">
              Atur periode dan status transaksi
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-2 block text-xs font-medium tracking-wide text-[#B5AA98]">
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
            <label className="mb-2 block text-xs font-medium tracking-wide text-[#B5AA98]">
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
            <label className="mb-2 block text-xs font-medium tracking-wide text-[#B5AA98]">
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
              className="w-full rounded-lg border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-2.5 text-sm font-semibold text-[#D9BB83] transition duration-200 hover:bg-[#C9A96E] hover:text-[#111111]"
            >
              Reset Filter
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs text-[#8C8170]">
          Kosongkan tanggal untuk menampilkan semua data.
        </p>
      </div>

      {/* Ringkasan */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item, index) => (
          <div
            key={item.title}
            className="group relative overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-5 shadow-lg transition duration-300 hover:border-[#C9A96E]/50"
          >
            <div className="absolute left-0 top-0 h-full w-1 bg-[#C9A96E]/70" />

            <div className="pl-2">
              <p className="text-xs font-medium tracking-wide text-[#B5AA98]">
                {item.title}
              </p>

              <p className="mt-3 break-words text-xl font-bold tracking-tight text-[#F5F1E8] sm:text-2xl">
                {loading ? "..." : item.value}
              </p>

              <p className="mt-2 text-[11px] text-[#8C8170]">
                {item.description}
              </p>
            </div>

            <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full border border-[#C9A96E]/10" />
          </div>
        ))}
      </div>

      {/* Grafik */}
      <div className="mt-7 rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-5">
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-[#C9A96E]" />
            <h3 className="font-semibold tracking-wide text-[#F5F1E8]">
              Grafik Pendapatan
            </h3>
          </div>

          <p className="mt-2 text-xs text-[#8C8170]">
            Pendapatan berdasarkan tanggal transaksi selesai.
          </p>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-[#A79B86]">
            Memuat grafik...
          </p>
        ) : chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#A79B86]">
            Tidak ada data transaksi selesai pada filter yang dipilih.
          </p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 5,
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
                  tick={{ fontSize: 11, fill: "#A79B86" }}
                  axisLine={{ stroke: "#514735" }}
                  tickLine={false}
                />

                <YAxis
                  stroke="#8C8170"
                  tick={{ fontSize: 10, fill: "#A79B86" }}
                  tickFormatter={(value) =>
                    value >= 1000000
                      ? `Rp${(value / 1000000).toFixed(1)}jt`
                      : value >= 1000
                        ? `Rp${(value / 1000).toFixed(0)}rb`
                        : `Rp${value}`
                  }
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
                  cursor={{ fill: "rgba(201, 169, 110, 0.08)" }}
                />

                <Bar
                  dataKey="pendapatan"
                  fill="#C9A96E"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={55}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="mt-7 rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-[#F5F1E8]">
              Export Laporan
            </h3>
            <p className="mt-1 text-xs text-[#8C8170]">
              Unduh laporan transaksi dalam format Excel atau PDF.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportExcel}
              disabled={loading || filteredOrders.length === 0}
              className="rounded-lg border border-[#C9A96E]/50 bg-[#C9A96E]/10 px-5 py-2.5 text-sm font-semibold text-[#D9BB83] transition duration-200 hover:bg-[#C9A96E] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export Excel
            </button>

            <button
              onClick={exportPDF}
              disabled={loading || filteredOrders.length === 0}
              className="rounded-lg bg-[#C9A96E] px-5 py-2.5 text-sm font-semibold text-[#111111] transition duration-200 hover:bg-[#D9BB83] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tabel transaksi */}
      <div className="mt-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold tracking-wide text-[#F5F1E8]">
              Detail Transaksi
            </h3>
            <p className="mt-1 text-xs text-[#8C8170]">
              Daftar transaksi sesuai filter laporan.
            </p>
          </div>

          <span className="rounded-lg border border-[#C9A96E]/25 bg-[#C9A96E]/10 px-3 py-1.5 text-xs font-medium text-[#D9BB83]">
            {filteredOrders.length} Transaksi
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#C9A96E]/20 bg-[#202020] shadow-lg">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-b border-[#C9A96E]/20 bg-[#252525] text-[#C9A96E]">
              <tr>
                <th className="px-4 py-4 font-semibold">Pelanggan</th>
                <th className="px-4 py-4 font-semibold">Jumlah</th>
                <th className="px-4 py-4 font-semibold">Status</th>
                <th className="px-4 py-4 font-semibold">Tanggal</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-10 text-center text-[#A79B86]"
                  >
                    Memuat transaksi...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-4 py-10 text-center text-[#A79B86]"
                  >
                    Tidak ada transaksi ditemukan.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[#C9A96E]/10 transition last:border-0 hover:bg-[#292929]"
                  >
                    <td className="px-4 py-4 font-medium text-[#F5F1E8]">
                      {order.customer_name || "-"}
                    </td>

                    <td className="px-4 py-4 font-medium text-[#D9BB83]">
                      {formatRupiah(Number(order.amount || 0))}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-medium ${
                          order.status === "selesai"
                            ? "border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#D9BB83]"
                            : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                        }`}
                      >
                        {order.status || "-"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-[#B5AA98]">
                      {new Date(order.created_at).toLocaleDateString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-[#8C8170]">
          Menampilkan {filteredOrders.length} dari {orders.length} transaksi.
        </p>
      </div>
    </DashboardLayout>
  );
}

export default Reports;
