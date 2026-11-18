
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
    "w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-blue-500";

  return (
    <DashboardLayout>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          Manajemen Pengeluaran
        </h2>

        <p className="mt-2 text-sm text-slate-300 sm:text-base">
          Catat dan pantau seluruh pengeluaran bisnis MasMuns.
        </p>

        {/* KARTU STATISTIK */}
        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 sm:p-5">
            <p className="text-xs text-slate-400 sm:text-sm">
              Total Pengeluaran
            </p>
            <h3 className="mt-2 break-words text-base font-bold text-white sm:text-2xl">
              {formatRupiah(totalExpenses)}
            </h3>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 sm:p-5">
            <p className="text-xs text-slate-400 sm:text-sm">
              Jumlah Transaksi
            </p>
            <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
              {expenses.length}
            </h3>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 sm:p-5">
            <p className="text-xs text-slate-400 sm:text-sm">
              Jumlah Kategori
            </p>
            <h3 className="mt-2 text-xl font-bold text-white sm:text-2xl">
              {totalCategories}
            </h3>
          </div>
        </div>

        {/* FORM TAMBAH DAN EDIT */}
        <form
          onSubmit={handleSubmit}
          className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-5"
        >
          <h3 className="mb-4 text-base font-semibold text-white sm:text-lg">
            {editingId !== null
              ? "Edit Pengeluaran"
              : "Tambah Pengeluaran Baru"}
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
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
              <label className="mb-2 block text-sm text-slate-300">
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
              <label className="mb-2 block text-sm text-slate-300">
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
              <label className="mb-2 block text-sm text-slate-300">
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

          <div className="mt-4">
            <label className="mb-2 block text-sm text-slate-300">
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

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 sm:w-auto"
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
                className="w-full rounded-lg bg-slate-700 px-5 py-3 text-sm font-medium text-white hover:bg-slate-600 sm:w-auto"
              >
                Batal
              </button>
            )}
          </div>
        </form>

        {/* PENCARIAN DAN FILTER */}
        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4 sm:p-5">
          <h3 className="mb-4 text-base font-semibold text-white">
            Filter Pengeluaran
          </h3>

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

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Total hasil filter:{" "}
              <span className="font-semibold text-white">
                {formatRupiah(filteredTotal)}
              </span>
            </p>

            <button
              type="button"
              onClick={resetFilter}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              Reset Filter
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400 sm:text-sm">
          Menampilkan {filteredExpenses.length} dari {expenses.length} transaksi.
        </p>

        {/* PESAN */}
        {error && (
          <p className="mt-4 break-words rounded-lg bg-red-500/10 px-3 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 break-words rounded-lg bg-green-500/10 px-3 py-3 text-sm text-green-400">
            {success}
          </p>
        )}

        {/* TABEL PENGELUARAN */}
        <div className="mt-5 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
          <table className="w-full min-w-[850px] text-left text-sm text-slate-300">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-4 py-3">Nama Pengeluaran</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Jumlah</th>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center">
                    Memuat data pengeluaran...
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-6 text-center">
                    Belum ada data pengeluaran.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-t border-slate-800"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {expense.title}
                    </td>

                    <td className="px-4 py-3">
                      {expense.category}
                    </td>

                    <td className="px-4 py-3 font-medium text-red-400">
                      {formatRupiah(expense.amount)}
                    </td>

                    <td className="px-4 py-3">
                      {new Date(
                        `${expense.expense_date}T00:00:00`
                      ).toLocaleDateString("id-ID")}
                    </td>

                    <td className="max-w-xs truncate px-4 py-3">
                      {expense.description || "-"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(expense)}
                          className="rounded bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-500"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(expense)}
                          className="rounded bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-500"
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
      </div>
    </DashboardLayout>
  );
}

export default Expenses;
