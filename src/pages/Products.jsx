
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { formatRupiah } from "../lib/format";

const inputClass =
  "w-full min-w-0 rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-3 py-3 text-sm text-[#F5F1E8] outline-none transition placeholder:text-[#817765] focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30";

function Products() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [sortOrder, setSortOrder] = useState("terbaru");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    stock: "",
    description: "",
  });

  // Memuat produk milik Admin yang sedang login
  async function loadProducts() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Gagal mendapatkan akun Admin. Silakan login kembali.");
      setProducts([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError("Gagal memuat produk: " + error.message);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const categories = [
    "Semua",
    ...new Set(
      products.map((product) => product.category).filter(Boolean)
    ),
  ];

  const filteredProducts = products
    .filter((product) => {
      const cocokNama = product.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const cocokKategori =
        categoryFilter === "Semua" ||
        product.category === categoryFilter;

      return cocokNama && cocokKategori;
    })
    .sort((a, b) => {
      if (sortOrder === "termurah") {
        return Number(a.price) - Number(b.price);
      }

      if (sortOrder === "termahal") {
        return Number(b.price) - Number(a.price);
      }

      if (sortOrder === "terbaru") {
        return new Date(b.created_at) - new Date(a.created_at);
      }

      return 0;
    });

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) => total + Number(product.stock || 0),
    0
  );

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      Number(product.price || 0) * Number(product.stock || 0),
    0
  );

  const totalCategories = new Set(
    products.map((product) => product.category).filter(Boolean)
  ).size;

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
      name: "",
      category: "",
      price: "",
      stock: "",
      description: "",
    });
  }

  function handleEdit(product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      category: product.category || "",
      price: String(product.price),
      stock: String(product.stock),
      description: product.description || "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // Menambah atau memperbarui produk milik Admin
  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Nama produk wajib diisi.");
      return;
    }

    if (
      form.price === "" ||
      !Number.isFinite(Number(form.price)) ||
      Number(form.price) < 0
    ) {
      setError("Harga harus diisi dan tidak boleh negatif.");
      return;
    }

    if (
      form.stock === "" ||
      !Number.isInteger(Number(form.stock)) ||
      Number(form.stock) < 0
    ) {
      setError("Stok harus berupa bilangan bulat dan tidak boleh negatif.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Akun Admin tidak ditemukan. Silakan login kembali.");
      setSaving(false);
      return;
    }

    const productData = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      price: Number(form.price),
      stock: Number(form.stock),
      description: form.description.trim() || null,
    };

    let result;

    if (editingId !== null) {
      result = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingId)
        .eq("user_id", user.id);
    } else {
      result = await supabase
        .from("products")
        .insert([
          {
            ...productData,
            user_id: user.id,
          },
        ]);
    }

    if (result.error) {
      setError("Gagal menyimpan produk: " + result.error.message);
    } else {
      setSuccess(
        editingId !== null
          ? "Produk berhasil diperbarui."
          : "Produk berhasil ditambahkan."
      );

      resetForm();
      await loadProducts();
    }

    setSaving(false);
  }

  // Menghapus hanya produk milik Admin yang login
  async function handleDelete(product) {
    const yakin = window.confirm(
      `Apakah kamu yakin ingin menghapus produk ${product.name}?`
    );

    if (!yakin) return;

    setError("");
    setSuccess("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Akun Admin tidak ditemukan. Silakan login kembali.");
      return;
    }

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("user_id", user.id);

    if (error) {
      setError("Gagal menghapus produk: " + error.message);
    } else {
      setSuccess("Produk berhasil dihapus.");

      if (editingId === product.id) {
        resetForm();
      }

      await loadProducts();
    }
  }

  const statCards = [
    { title: "Total Produk", value: totalProducts },
    { title: "Total Stok", value: totalStock },
    { title: "Nilai Inventaris", value: formatRupiah(inventoryValue) },
    { title: "Jumlah Kategori", value: totalCategories },
  ];

  return (
    <DashboardLayout>
      <div className="min-w-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A96E]">
              Business Management
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-[#F5F1E8] sm:text-2xl">
              Manajemen Produk
            </h2>
            <p className="mt-2 text-sm text-[#A79B86] sm:text-base">
              Kelola seluruh produk bisnis kamu di sini.
            </p>
          </div>
        </div>

        {/* KARTU STATISTIK */}
        <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {statCards.map((item) => (
            <div
              key={item.title}
              className="group relative min-w-0 overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-3 shadow-lg transition hover:border-[#C9A96E]/50 sm:p-5"
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-[#C9A96E]/70" />
              <div className="pl-2">
                <p className="text-xs font-medium tracking-wide text-[#A79B86] sm:text-sm">
                  {item.title}
                </p>
                <h3 className="mt-2 break-words text-xl font-bold text-[#F5F1E8] sm:text-2xl">
                  {item.value}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* PENCARIAN DAN FILTER */}
        <div className="mt-6 rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold tracking-wide text-[#F5F1E8]">
            Pencarian dan Filter Produk
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama produk..."
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

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className={inputClass}
            >
              <option value="terbaru">Terbaru</option>
              <option value="termurah">Harga Termurah</option>
              <option value="termahal">Harga Termahal</option>
            </select>
          </div>

          <p className="mt-3 text-xs text-[#8C8170] sm:text-sm">
            Menampilkan {filteredProducts.length} dari {products.length} produk.
          </p>
        </div>

        {/* PESAN */}
        {error && (
          <p className="mt-4 break-words rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 break-words rounded-lg border border-[#C9A96E]/25 bg-[#C9A96E]/10 px-3 py-3 text-sm text-[#DCC18E]">
            {success}
          </p>
        )}

        {/* FORM TAMBAH DAN EDIT */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                Product Management
              </p>
              <h3 className="mt-1 text-base font-semibold text-[#F5F1E8] sm:text-lg">
                {editingId !== null ? "Edit Produk" : "Tambah Produk Baru"}
              </h3>
            </div>

            <span className="rounded-full border border-[#C9A96E]/30 px-3 py-1 text-xs text-[#C9A96E]">
              {editingId !== null ? "Mode Edit" : "Produk Baru"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#C8BDAA]">
                Nama Produk
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Contoh: Laptop Asus"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C8BDAA]">
                Kategori
              </label>
              <input
                type="text"
                name="category"
                value={form.category}
                onChange={handleChange}
                placeholder="Contoh: Elektronik"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C8BDAA]">
                Harga (Rp)
              </label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="Contoh: 5000000"
                min="0"
                step="0.01"
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#C8BDAA]">
                Stok
              </label>
              <input
                type="number"
                name="stock"
                value={form.stock}
                onChange={handleChange}
                placeholder="Contoh: 10"
                min="0"
                step="1"
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm text-[#C8BDAA]">
              Deskripsi
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Deskripsi produk..."
              rows="3"
              className={inputClass}
            />
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-[#C9A96E] px-5 py-3 text-sm font-semibold text-[#17130D] transition hover:bg-[#D8B982] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving
                ? "Menyimpan..."
                : editingId !== null
                  ? "Simpan Perubahan"
                  : "Simpan Produk"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-lg border border-[#C9A96E]/30 bg-[#292929] px-5 py-3 text-sm font-medium text-[#D8C9AD] transition hover:bg-[#35302A] sm:w-auto"
              >
                Batal
              </button>
            )}
          </div>
        </form>

        {/* TABEL PRODUK */}
        <div className="mt-6 overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] shadow-lg">
          <div className="border-b border-[#C9A96E]/15 px-4 py-4 sm:px-5">
            <h3 className="text-base font-semibold text-[#F5F1E8]">
              Daftar Produk
            </h3>
            <p className="mt-1 text-xs text-[#8C8170]">
              Data produk bisnis yang tersimpan.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm text-[#C8BDAA]">
              <thead className="bg-[#181818] text-xs uppercase tracking-wider text-[#C9A96E]">
                <tr>
                  <th className="px-4 py-4">Nama Produk</th>
                  <th className="px-4 py-4">Kategori</th>
                  <th className="px-4 py-4">Harga</th>
                  <th className="px-4 py-4">Stok</th>
                  <th className="px-4 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-[#A79B86]">
                      Memuat data produk...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-[#A79B86]">
                      Produk tidak ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-t border-[#C9A96E]/10 transition hover:bg-[#292929]"
                    >
                      <td className="px-4 py-4 font-medium text-[#F5F1E8]">
                        {product.name}
                      </td>

                      <td className="px-4 py-4">
                        {product.category || "-"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-[#D8C9AD]">
                        {formatRupiah(product.price)}
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full border border-[#C9A96E]/20 bg-[#C9A96E]/10 px-3 py-1 text-xs font-medium text-[#D8C18F]">
                          {product.stock}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(product)}
                            className="rounded-lg border border-[#C9A96E]/40 px-3 py-2 text-xs font-medium text-[#D8C18F] transition hover:bg-[#C9A96E] hover:text-[#17130D]"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(product)}
                            className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
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

        <p className="mt-2 text-xs text-[#8C8170] sm:hidden">
          Geser tabel ke kiri atau kanan untuk melihat seluruh kolom.
        </p>
      </div>
    </DashboardLayout>
  );
}

export default Products;
