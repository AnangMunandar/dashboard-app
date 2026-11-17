
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { formatRupiah } from "../lib/format";

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

  // Mengambil data produk dari Supabase
  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
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

  // Membuat daftar kategori otomatis
  const categories = [
    "Semua",
    ...new Set(
      products
        .map((product) => product.category)
        .filter(Boolean)
    ),
  ];

  // Pencarian, filter, dan pengurutan produk
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

  // Statistik produk
  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) =>
      total + Number(product.stock || 0),
    0
  );

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      Number(product.price || 0) *
      Number(product.stock || 0),
    0
  );

  const totalCategories = new Set(
    products
      .map((product) => product.category)
      .filter(Boolean)
  ).size;

  // Mengelola perubahan formulir
  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // Mengosongkan formulir
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

  // Mengisi formulir untuk edit produk
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

  // Menambahkan dan memperbarui produk
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
        .eq("id", editingId);
    } else {
      result = await supabase
        .from("products")
        .insert([productData]);
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

  // Menghapus produk
  async function handleDelete(product) {
    const yakin = window.confirm(
      `Apakah kamu yakin ingin menghapus produk ${product.name}?`
    );

    if (!yakin) return;

    setError("");
    setSuccess("");

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

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

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-white">
        Manajemen Produk
      </h2>

      <p className="mt-2 text-slate-300">
        Kelola seluruh produk bisnis kamu di sini.
      </p>

      {/* KARTU STATISTIK */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
          <p className="text-sm text-slate-400">
            Total Produk
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            {totalProducts}
          </h3>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
          <p className="text-sm text-slate-400">
            Total Stok
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            {totalStock}
          </h3>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
          <p className="text-sm text-slate-400">
            Nilai Inventaris
          </p>
          <h3 className="mt-2 text-xl font-bold text-white">
            {formatRupiah(inventoryValue)}
          </h3>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5">
          <p className="text-sm text-slate-400">
            Jumlah Kategori
          </p>
          <h3 className="mt-2 text-2xl font-bold text-white">
            {totalCategories}
          </h3>
        </div>

      </div>

      {/* PENCARIAN DAN FILTER */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama produk..."
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        />

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
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
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        >
          <option value="terbaru">Terbaru</option>
          <option value="termurah">Harga Termurah</option>
          <option value="termahal">Harga Termahal</option>
        </select>

      </div>

      <p className="mt-3 text-sm text-slate-400">
        Menampilkan {filteredProducts.length} dari {products.length} produk.
      </p>

      {/* PESAN ERROR DAN SUKSES */}
      {error && (
        <p className="mt-4 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {success && (
        <p className="mt-4 rounded bg-green-500/10 px-3 py-2 text-sm text-green-400">
          {success}
        </p>
      )}

      {/* FORM TAMBAH DAN EDIT PRODUK */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-5"
      >
        <h3 className="mb-4 text-lg font-semibold text-white">
          {editingId !== null
            ? "Edit Produk"
            : "Tambah Produk Baru"}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Nama Produk
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Contoh: Laptop Asus"
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Kategori
            </label>
            <input
              type="text"
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="Contoh: Elektronik"
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
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
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
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
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
              required
            />
          </div>

        </div>

        <div className="mt-4">
          <label className="mb-2 block text-sm text-slate-300">
            Deskripsi
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Deskripsi produk..."
            rows="3"
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">

          <button
            type="submit"
            disabled={saving}
            className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
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
              className="rounded bg-slate-700 px-5 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              Batal
            </button>
          )}

        </div>
      </form>

      {/* TABEL PRODUK */}
      <div className="mt-8 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">

        <table className="w-full text-left text-sm text-slate-300">

          <thead className="bg-slate-900 text-slate-400">
            <tr>
              <th className="px-4 py-3">Nama Produk</th>
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Harga</th>
              <th className="px-4 py-3">Stok</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center">
                  Memuat data produk...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center">
                  Produk tidak ditemukan.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="border-t border-slate-800"
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {product.name}
                  </td>

                  <td className="px-4 py-3">
                    {product.category || "-"}
                  </td>

                  <td className="px-4 py-3">
                    {formatRupiah(product.price)}
                  </td>

                  <td className="px-4 py-3">
                    {product.stock}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex gap-2">

                      <button
                        type="button"
                        onClick={() => handleEdit(product)}
                        className="rounded bg-amber-600 px-3 py-1 text-xs text-white hover:bg-amber-500"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(product)}
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-500"
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

    </DashboardLayout>
  );
}

export default Products;
