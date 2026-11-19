
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";

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

    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

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
      parsedQuantity > selectedProduct.stock
    ) {
      setError(
        `Stok tidak mencukupi. Stok tersedia: ${selectedProduct.stock} unit.`
      );
      return;
    }

    setSaving(true);

    const { data, error: rpcError } = await supabase.rpc(
      "adjust_product_stock",
      {
        p_product_id: Number(productId),
        p_movement_type: movementType,
        p_quantity: parsedQuantity,
        p_notes: notes.trim(),
      }
    );

    if (rpcError) {
      setError(rpcError.message);
    } else {
      const result = data?.[0];

      setMessage(
        `Penyesuaian stok berhasil. Stok ${result?.product_name || "produk"} sekarang ${result?.new_stock ?? "-"} unit.`
      );

      setQuantity("");
      setNotes("");

      await loadProducts();
    }

    setSaving(false);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 text-white">
        <div>
          <h1 className="text-2xl font-bold">
            Penyesuaian Stok Manual
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Tambah atau kurangi stok produk dan catat alasannya.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm text-slate-400">
              Total Produk
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {products.length}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <p className="text-sm text-slate-400">
              Total Stok Saat Ini
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              {products.reduce(
                (total, product) => total + Number(product.stock || 0),
                0
              )}{" "}
              unit
            </h2>
          </div>
        </div>

        <div className="max-w-2xl rounded-xl border border-slate-800 bg-slate-950 p-6">
          <h2 className="text-lg font-semibold">
            Form Penyesuaian Stok
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Setiap perubahan akan otomatis masuk ke Riwayat Stok.
          </p>

          {message && (
            <div className="mt-5 rounded-lg border border-emerald-800 bg-emerald-950 p-4 text-sm text-emerald-300">
              {message}
            </div>
          )}

          {error && (
            <div className="mt-5 rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Pilih Produk
              </label>

              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                disabled={loading || saving}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
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
                <p className="mt-2 text-sm text-slate-400">
                  Stok tersedia:{" "}
                  <span className="font-semibold text-white">
                    {selectedProduct.stock} unit
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Jenis Penyesuaian
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMovementType("masuk")}
                  disabled={saving}
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                    movementType === "masuk"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  + Stok Masuk
                </button>

                <button
                  type="button"
                  onClick={() => setMovementType("keluar")}
                  disabled={saving}
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                    movementType === "keluar"
                      ? "border-red-500 bg-red-500/10 text-red-400"
                      : "border-slate-700 bg-slate-900 text-slate-300"
                  }`}
                >
                  - Stok Keluar
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Alasan / Keterangan
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={saving}
                rows="3"
                maxLength="500"
                placeholder="Contoh: Barang baru datang dari pemasok atau produk rusak."
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                required
              />

              <p className="mt-1 text-xs text-slate-500">
                Wajib diisi agar perubahan stok memiliki catatan.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving || loading || products.length === 0}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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
