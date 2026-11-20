
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { formatRupiah } from "../lib/format";

const expenseCategories = [
  "Operasional",
  "Transportasi",
  "Stok Barang",
  "Gaji",
  "Listrik dan Internet",
  "Makan dan Minum",
  "Marketing",
  "Lainnya",
];

function tanggalHariIni() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    category: "Operasional",
    amount: "",
    expense_date: tanggalHariIni(),
    description: "",
  });

  async function loadExpenses() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Tidak dapat mengambil data pengguna. Silakan login kembali.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      setError("Gagal memuat pengeluaran: " + error.message);
    } else {
      setExpenses(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  const filteredExpenses = expenses.filter((expense) => {
    const cocokNama = expense.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const cocokKategori =
      categoryFilter === "Semua" ||
      expense.category === categoryFilter;

    const cocokTanggalMulai =
      !startDate || expense.expense_date >= startDate;

    const cocokTanggalAkhir =
      !endDate || expense.expense_date <= endDate;

    return (
      cocokNama &&
      cocokKategori &&
      cocokTanggalMulai &&
      cocokTanggalAkhir
    );
  });

  const totalExpenses = expenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );

  const filteredTotal = filteredExpenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );

  const totalCategories = new Set(
    expenses.map((expense) => expense.category).filter(Boolean)
  ).size;

  const categories = [
    "Semua",
    ...new Set(expenses.map((expense) => expense.category).filter(Boolean)),
  ];

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function resetForm() {
    setEditingId(null);

    setForm({
      title: "",
      category: "Operasional",
      amount: "",
      expense_date: tanggalHariIni(),
      description: "",
    });
  }

  function handleEdit(expense) {
    setEditingId(expense.id);

    setForm({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      expense_date: expense.expense_date,
      description: expense.description || "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Nama pengeluaran wajib diisi.");
      return;
    }

    if (
      form.amount === "" ||
      !Number.isFinite(Number(form.amount)) ||
      Number(form.amount) <= 0
    ) {
      setError("Jumlah pengeluaran harus lebih dari nol.");
      return;
    }

    if (!form.expense_date) {
      setError("Tanggal pengeluaran wajib diisi.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Sesi login tidak ditemukan. Silakan login kembali.");
      setSaving(false);
      return;
    }

    const expenseData = {
      title: form.title.trim(),
      category: form.category,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      description: form.description.trim() || null,
      user_id: user.id,
    };

    let result;

    if (editingId !== null) {
      result = await supabase
        .from("expenses")
        .update(expenseData)
        .eq("id", editingId)
        .eq("user_id", user.id);
    } else {
      result = await supabase
        .from("expenses")
        .insert([expenseData]);
    }

    if (result.error) {
      setError("Gagal menyimpan pengeluaran: " + result.error.message);
    } else {
      setSuccess(
        editingId !== null
          ? "Pengeluaran berhasil diperbarui."
          : "Pengeluaran berhasil ditambahkan."
      );

      resetForm();
      await loadExpenses();
    }

    setSaving(false);
  }

  async function handleDelete(expense) {
    const yakin = window.confirm(
      `Apakah kamu yakin ingin menghapus pengeluaran "${expense.title}"?`
    );

    if (!yakin) return;

    setError("");
    setSuccess("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Sesi login tidak ditemukan. Silakan login kembali.");
      return;
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expense.id)
      .eq("user_id", user.id);

    if (error) {
      setError("Gagal menghapus pengeluaran: " + error.message);
    } else {
      setSuccess("Pengeluaran berhasil dihapus.");

      if (editingId === expense.id) {
        resetForm();
      }

      await loadExpenses();
    }
  }

  function resetFilter() {
    setSearch("");
    setCategoryFilter("Semua");
    setStartDate("");
    setEndDate("");
  }

  const inputClass =
    "w-full min-w-0 rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-3 py-3 text-sm text-[#F5F1E8] outline-none transition placeholder:text-[#817766] focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/25";

  const cardClass =
    "rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-5";

  return (
    <DashboardLayout>
      <div className="min-w-0">
        {/* HEADER */}
        <div>
          <div className="flex items-center gap-3">
            <span className="h-7 w-1 rounded-full bg-[#C9A96E]" />
            <h2 className="text-xl font-bold tracking-wide text-[#F5F1E8] sm:text-2xl">
              Manajemen Pengeluaran
            </h2>
          </div>

          <p className="mt-3 text-sm text-[#A79B86] sm:text-base">
            Catat dan pantau seluruh pengeluaran bisnis MasMuns.
          </p>
        </div>

        {/* PESAN */}
        {error && (
          <p className="mt-4 break-words rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 break-words rounded-lg border border-[#C9A96E]/20 bg-[#C9A96E]/10 px-4 py-3 text-sm text-[#D9BB83]">
            {success}
          </p>
        )}

        {/* KARTU STATISTIK */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className={cardClass}>
            <p className="text-sm font-medium text-[#A79B86]">
              Total Pengeluaran
            </p>
            <h3 className="mt-3 break-words text-xl font-bold text-[#E4C98F] sm:text-2xl">
              {loading ? "..." : formatRupiah(totalExpenses)}
            </h3>
            <p className="mt-2 text-xs text-[#817766]">
              Akumulasi seluruh pengeluaran
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-sm font-medium text-[#A79B86]">
              Jumlah Transaksi
            </p>
            <h3 className="mt-3 text-2xl font-bold text-[#F5F1E8]">
              {loading ? "..." : expenses.length}
            </h3>
            <p className="mt-2 text-xs text-[#817766]">
              Total catatan pengeluaran
            </p>
          </div>

          <div className={cardClass}>
            <p className="text-sm font-medium text-[#A79B86]">
              Jumlah Kategori
            </p>
            <h3 className="mt-3 text-2xl font-bold text-[#F5F1E8]">
              {loading ? "..." : totalCategories}
            </h3>
            <p className="mt-2 text-xs text-[#817766]">
              Kategori yang digunakan
            </p>
          </div>
        </div>

        {/* FORM TAMBAH DAN EDIT */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-6"
        >
          <div className="mb-6 flex items-center gap-3 border-b border-[#C9A96E]/15 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 text-xl text-[#C9A96E]">
              {editingId !== null ? "✎" : "+"}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#F5F1E8]">
                {editingId !== null
                  ? "Edit Pengeluaran"
                  : "Tambah Pengeluaran Baru"}
              </h3>
              <p className="mt-1 text-xs text-[#8C8170]">
                Catat transaksi pengeluaran bisnis Anda
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
                Nama Pengeluaran
              </label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Contoh: Pembelian perlengkapan"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
                Kategori
              </label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className={inputClass}
                required
              >
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
                Jumlah Pengeluaran (Rp)
              </label>
              <input
                type="number"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                placeholder="Contoh: 150000"
                min="1"
                step="0.01"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
                Tanggal Pengeluaran
              </label>
              <input
                type="date"
                name="expense_date"
                value={form.expense_date}
                onChange={handleChange}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
              Keterangan
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Keterangan tambahan (opsional)..."
              rows="3"
              className={inputClass}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg border border-[#D9BB83] bg-[#C9A96E] px-5 py-3 text-sm font-bold tracking-wide text-[#171717] transition hover:bg-[#E0C38C] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving
                ? "Menyimpan..."
                : editingId !== null
                  ? "Simpan Perubahan"
                  : "Simpan Pengeluaran"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-lg border border-[#C9A96E]/30 px-5 py-3 text-sm font-medium text-[#D9BB83] transition hover:bg-[#C9A96E]/10 sm:w-auto"
              >
                Batal
              </button>
            )}
          </div>
        </form>

        {/* FILTER PENGELUARAN */}
        <div className="mt-6 rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-5">
          <div className="mb-5 border-b border-[#C9A96E]/15 pb-4">
            <h3 className="text-lg font-semibold text-[#F5F1E8]">
              Filter Pengeluaran
            </h3>
            <p className="mt-1 text-xs text-[#8C8170]">
              Cari dan saring transaksi berdasarkan kategori dan tanggal
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari pengeluaran..."
              className={inputClass}
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={inputClass}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
              aria-label="Tanggal mulai"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={inputClass}
              aria-label="Tanggal akhir"
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-[#C9A96E]/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#A79B86]">
              Total hasil filter:
              <span className="ml-2 font-bold text-[#E4C98F]">
                {formatRupiah(filteredTotal)}
              </span>
            </p>

            <button
              type="button"
              onClick={resetFilter}
              className="rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 px-4 py-2.5 text-sm font-semibold text-[#D9BB83] transition hover:bg-[#C9A96E] hover:text-[#111111]"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* JUMLAH DATA */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#A79B86] sm:text-sm">
            Menampilkan{" "}
            <span className="font-semibold text-[#D9BB83]">
              {filteredExpenses.length}
            </span>{" "}
            dari {expenses.length} transaksi.
          </p>
        </div>

        {/* TABEL PENGELUARAN */}
        <div className="mt-4 overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] shadow-lg">
          <div className="border-b border-[#C9A96E]/15 px-4 py-4 sm:px-5">
            <h3 className="font-semibold text-[#F5F1E8]">
              Riwayat Pengeluaran
            </h3>
            <p className="mt-1 text-xs text-[#8C8170]">
              Daftar transaksi pengeluaran bisnis
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-[#C9A96E]/15 bg-[#181818] text-[#A79B86]">
                <tr>
                  <th className="px-4 py-4 font-medium">Nama Pengeluaran</th>
                  <th className="px-4 py-4 font-medium">Kategori</th>
                  <th className="px-4 py-4 font-medium">Jumlah</th>
                  <th className="px-4 py-4 font-medium">Tanggal</th>
                  <th className="px-4 py-4 font-medium">Keterangan</th>
                  <th className="px-4 py-4 font-medium">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#C9A96E]/10 text-[#D8CEBD]">
                {loading ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-10 text-center text-[#A79B86]"
                    >
                      Memuat data pengeluaran...
                    </td>
                  </tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-10 text-center text-[#8C8170]"
                    >
                      Belum ada data pengeluaran.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="transition hover:bg-[#29251E]/60"
                    >
                      <td className="px-4 py-4 font-medium text-[#F5F1E8]">
                        {expense.title}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-[#C9A96E]/20 bg-[#C9A96E]/10 px-3 py-1 text-xs text-[#D9BB83]">
                          {expense.category}
                        </span>
                      </td>

                      <td className="px-4 py-4 font-semibold text-[#D9BB83]">
                        {formatRupiah(expense.amount)}
                      </td>

                      <td className="px-4 py-4 whitespace-nowrap text-[#B5AA98]">
                        {new Date(
                          `${expense.expense_date}T00:00:00`
                        ).toLocaleDateString("id-ID")}
                      </td>

                      <td className="max-w-xs truncate px-4 py-4 text-[#A79B86]">
                        {expense.description || "-"}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(expense)}
                            className="rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 px-3 py-2 text-xs font-semibold text-[#D9BB83] transition hover:bg-[#C9A96E] hover:text-[#111111]"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(expense)}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="border-t border-[#C9A96E]/10 px-4 py-3 text-xs text-[#817766] sm:hidden">
            Geser tabel ke kiri atau kanan untuk melihat seluruh kolom.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default Expenses;
