
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";

const inputClass =
  "w-full min-w-0 rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-4 py-3 text-sm text-[#F5F1E8] outline-none transition placeholder:text-[#817765] focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30 disabled:cursor-not-allowed disabled:opacity-50";

function StockAdjustment() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [movementType, setMovementType] = useState("masuk");
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
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
      .from("products")
      .select("id, name, stock")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (queryError) {
      setError(queryError.message);
    } else {
      setProducts(data || []);
    }

    setLoading(false);
  }

  const selectedProduct = products.find(
    (product) => String(product.id) === productId
  );

  const totalStock = products.reduce(
    (total, product) => total + Number(product.stock || 0),
    0
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setError("");

    const parsedQuantity = Number(quantity);

    if (!productId) {
      setError("Silakan pilih produk terlebih dahulu.");
      return;
    }

    if (
      !Number.isSafeInteger(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      setError("Jumlah stok harus berupa bilangan bulat lebih dari nol.");
      return;
    }

    if (!notes.trim()) {
      setError("Alasan penyesuaian stok wajib diisi.");
      return;
    }

    if (
      movementType === "keluar" &&
      selectedProduct &&
      parsedQuantity > Number(selectedProduct.stock)
    ) {
      setError(
        `Stok tidak mencukupi. Stok tersedia: ${selectedProduct.stock} unit.`
      );
      return;
    }

    setSaving(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "adjust_product_stock",
        {
          p_product_id: Number(productId),
          p_movement_type: movementType,
          p_quantity: parsedQuantity,
          p_notes: notes.trim(),
        }
      );

      if (rpcError) throw rpcError;

      const result = data?.[0];

      setMessage(
        `Penyesuaian stok berhasil. Stok ${
          result?.product_name || "produk"
        } sekarang ${result?.new_stock ?? "-"} unit.`
      );

      setQuantity("");
      setNotes("");

      await loadProducts();
    } catch (err) {
      setError(err.message || "Gagal melakukan penyesuaian stok.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="min-w-0 space-y-6">
        {/* HEADER */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A96E]">
            Inventory Management
          </p>

          <h1 className="mt-2 text-xl font-bold tracking-tight text-[#F5F1E8] sm:text-2xl">
            Penyesuaian Stok Manual
          </h1>

          <p className="mt-2 text-sm text-[#A79B86]">
            Tambah atau kurangi stok produk dan catat alasannya.
          </p>
        </div>

        {/* STATISTIK */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-5 shadow-lg">
            <div className="absolute left-0 top-0 h-full w-1 bg-[#C9A96E]/70" />

            <div className="pl-2">
              <p className="text-sm text-[#A79B86]">
                Total Produk
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[#F5F1E8]">
                {loading ? "..." : products.length}
              </h2>

              <p className="mt-1 text-xs text-[#8C8170]">
                Produk terdaftar
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-5 shadow-lg">
            <div className="absolute left-0 top-0 h-full w-1 bg-[#C9A96E]/70" />

            <div className="pl-2">
              <p className="text-sm text-[#A79B86]">
                Total Stok Saat Ini
              </p>

              <h2 className="mt-2 text-2xl font-bold text-[#F5F1E8]">
                {loading ? "..." : totalStock}
              </h2>

              <p className="mt-1 text-xs text-[#8C8170]">
                Unit seluruh produk
              </p>
            </div>
          </div>
        </div>

        {/* FORM PENYESUAIAN */}
        <div className="max-w-2xl rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-6">
          <div className="border-b border-[#C9A96E]/15 pb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
              Stock Control
            </p>

            <h2 className="mt-1 text-lg font-semibold text-[#F5F1E8]">
              Form Penyesuaian Stok
            </h2>

            <p className="mt-1 text-sm text-[#A79B86]">
              Setiap perubahan akan otomatis masuk ke Riwayat Stok.
            </p>
          </div>

          {/* PESAN */}
          {message && (
            <div className="mt-5 rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 p-4 text-sm text-[#D8B982]">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 break-words rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* PILIH PRODUK */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
                Pilih Produk
              </label>

              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                disabled={loading || saving}
                className={inputClass}
                required
              >
                <option value="">
                  {loading ? "Memuat produk..." : "Pilih produk"}
                </option>

                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — Stok: {product.stock}
                  </option>
                ))}
              </select>

              {selectedProduct && (
                <div className="mt-3 rounded-lg border border-[#C9A96E]/15 bg-[#181818] p-3">
                  <p className="text-xs text-[#A79B86]">
                    Stok tersedia
                  </p>

                  <p className="mt-1 text-lg font-semibold text-[#D8B982]">
                    {selectedProduct.stock} unit
                  </p>
                </div>
              )}
            </div>

            {/* JENIS PENYESUAIAN */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
                Jenis Penyesuaian
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMovementType("masuk")}
                  disabled={saving}
                  className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                    movementType === "masuk"
                      ? "border-[#C9A96E] bg-[#C9A96E]/10 text-[#D8B982]"
                      : "border-[#C9A96E]/15 bg-[#171717] text-[#A79B86] hover:border-[#C9A96E]/40"
                  }`}
                >
                  + Stok Masuk
                </button>

                <button
                  type="button"
                  onClick={() => setMovementType("keluar")}
                  disabled={saving}
                  className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                    movementType === "keluar"
                      ? "border-red-500/60 bg-red-500/10 text-red-400"
                      : "border-[#C9A96E]/15 bg-[#171717] text-[#A79B86] hover:border-[#C9A96E]/40"
                  }`}
                >
                  - Stok Keluar
                </button>
              </div>
            </div>

            {/* JUMLAH STOK */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
                Jumlah Stok
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={saving}
                placeholder="Masukkan jumlah stok"
                className={inputClass}
                required
              />
            </div>

            {/* KETERANGAN */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
                Alasan / Keterangan
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={saving}
                rows="3"
                maxLength="500"
                placeholder="Contoh: Barang baru datang dari pemasok atau produk rusak."
                className={inputClass}
                required
              />

              <p className="mt-2 text-xs text-[#8C8170]">
                Wajib diisi agar perubahan stok memiliki catatan.
              </p>
            </div>

            {/* TOMBOL SIMPAN */}
            <button
              type="submit"
              disabled={saving || loading || products.length === 0}
              className="w-full rounded-lg bg-[#C9A96E] px-4 py-3 text-sm font-semibold text-[#17130D] transition hover:bg-[#D8B982] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Penyesuaian Stok"}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default StockAdjustment;
