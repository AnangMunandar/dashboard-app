
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function OrderForm({ onAdded }) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("pending");

  const [items, setItems] = useState([
    { productId: "", quantity: "1" },
  ]);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Silakan login kembali.");
      }

      const [customerResult, productResult] = await Promise.all([
        supabase
          .from("customers")
          .select("id, name")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),

        supabase
          .from("products")
          .select("id, name, price, stock")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),
      ]);

      if (customerResult.error) throw customerResult.error;
      if (productResult.error) throw productResult.error;

      setCustomers(customerResult.data || []);
      setProducts(productResult.data || []);
    } catch (err) {
      setError("Gagal memuat data: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { productId: "", quantity: "1" },
    ]);
  }

  function removeItem(index) {
    setItems((current) =>
      current.filter((_, i) => i !== index)
    );
  }

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? { ...item, [field]: value }
          : item
      )
    );
  }

  function getProduct(productId) {
    return products.find(
      (product) => String(product.id) === String(productId)
    );
  }

  function getSubtotal(item) {
    const product = getProduct(item.productId);

    if (!product) return 0;

    return Number(product.price) * Number(item.quantity || 0);
  }

  const totalAmount = items.reduce(
    (total, item) => total + getSubtotal(item),
    0
  );

  function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const selectedCustomer = customers.find(
      (customer) => String(customer.id) === customerId
    );

    if (!selectedCustomer) {
      setError("Silakan pilih pelanggan.");
      return;
    }

    if (items.length === 0) {
      setError("Tambahkan minimal satu produk.");
      return;
    }

    for (const item of items) {
      const product = getProduct(item.productId);
      const quantity = Number(item.quantity);

      if (!product) {
        setError("Silakan pilih semua produk.");
        return;
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        setError("Jumlah produk harus berupa bilangan bulat lebih dari 0.");
        return;
      }

      if (
        status === "selesai" &&
        quantity > Number(product.stock)
      ) {
        setError(
          `Stok ${product.name} tidak cukup. Tersedia ${product.stock}.`
        );
        return;
      }
    }

    const productIds = items.map((item) => item.productId);

    if (new Set(productIds).size !== productIds.length) {
      setError(
        "Produk yang sama tidak boleh dimasukkan dua kali. Ubah jumlahnya pada baris produk tersebut."
      );
      return;
    }

    setSaving(true);

    try {
      const orderItems = items.map((item) => ({
        product_id: item.productId,
        quantity: Number(item.quantity),
      }));

      const { error: rpcError } = await supabase.rpc(
        "create_order_with_items",
        {
          p_customer_id: selectedCustomer.id,
          p_customer_name: selectedCustomer.name,
          p_status: status,
          p_items: orderItems,
        }
      );

      if (rpcError) throw rpcError;

      setCustomerId("");
      setStatus("pending");
      setItems([{ productId: "", quantity: "1" }]);

      await loadData();
      await onAdded?.();
    } catch (err) {
      setError("Gagal menyimpan pesanan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full min-w-0 rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-3 py-3 text-sm text-[#F5F1E8] placeholder-[#8C8170] outline-none transition focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30 disabled:opacity-50";

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full min-w-0 overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-6"
    >
      {/* Header */}
      <div className="mb-6 border-b border-[#C9A96E]/15 pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 text-lg text-[#C9A96E]">
            +
          </div>

          <div className="min-w-0">
            <h3 className="text-lg font-semibold tracking-wide text-[#F5F1E8]">
              Tambah Pesanan
            </h3>
            <p className="mt-1 text-xs text-[#8C8170]">
              Buat transaksi dan kelola produk pesanan
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-5 break-words rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-[#A79B86]">
          Memuat pelanggan dan produk...
        </p>
      ) : (
        <>
          {/* Customer and Status */}
          <div className="mb-7 grid min-w-0 gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
                Pelanggan
              </label>

              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className={inputClass}
                disabled={customers.length === 0}
                required
              >
                <option value="">Pilih pelanggan</option>

                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>

              {customers.length === 0 && (
                <p className="mt-2 text-xs text-[#C9A96E]">
                  Belum ada pelanggan. Tambahkan pelanggan terlebih dahulu.
                </p>
              )}
            </div>

            <div className="min-w-0">
              <label className="mb-2 block text-sm font-medium text-[#D8CEBD]">
                Status Pesanan
              </label>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
              >
                <option value="pending">Pending</option>
                <option value="selesai">Selesai</option>
              </select>

              <p className="mt-2 text-xs text-[#8C8170]">
                Stok akan berkurang jika pesanan langsung dibuat selesai.
              </p>
            </div>
          </div>

          {/* Product Header */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-semibold text-[#F5F1E8]">
                Daftar Produk
              </h4>
              <p className="mt-1 text-xs text-[#8C8170]">
                Pilih produk dan tentukan jumlah pembelian
              </p>
            </div>

            <button
              type="button"
              onClick={addItem}
              disabled={products.length === 0}
              className="shrink-0 rounded-lg border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-2.5 text-xs font-semibold text-[#D9BB83] transition hover:bg-[#C9A96E] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Tambah Produk
            </button>
          </div>

          {products.length === 0 && (
            <p className="mb-4 break-words rounded-lg border border-[#C9A96E]/20 bg-[#C9A96E]/5 p-3 text-sm text-[#C9A96E]">
              Belum ada produk. Tambahkan produk terlebih dahulu.
            </p>
          )}

          {/* Product Items */}
          <div className="min-w-0 space-y-4">
            {items.map((item, index) => {
              const product = getProduct(item.productId);

              return (
                <div
                  key={index}
                  className="min-w-0 rounded-xl border border-[#C9A96E]/15 bg-[#181818] p-4"
                >
                  <div className="mb-4 flex items-center justify-between border-b border-[#C9A96E]/10 pb-3">
                    <span className="text-sm font-semibold tracking-wide text-[#D9BB83]">
                      Produk {index + 1}
                    </span>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-xs font-medium text-red-400 transition hover:text-red-300"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    <div className="min-w-0">
                      <label className="mb-2 block text-xs font-medium text-[#B5AA98]">
                        Pilih Produk
                      </label>

                      <select
                        value={item.productId}
                        onChange={(e) =>
                          updateItem(index, "productId", e.target.value)
                        }
                        className={inputClass}
                        required
                      >
                        <option value="">Pilih produk</option>

                        {products.map((p) => {
                          const alreadySelected = items.some(
                            (other, otherIndex) =>
                              otherIndex !== index &&
                              String(other.productId) === String(p.id)
                          );

                          return (
                            <option
                              key={p.id}
                              value={p.id}
                              disabled={alreadySelected}
                            >
                              {p.name} — {formatRupiah(p.price)}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="min-w-0">
                      <label className="mb-2 block text-xs font-medium text-[#B5AA98]">
                        Jumlah
                      </label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", e.target.value)
                        }
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>

                  {product && (
                    <div className="mt-4 grid min-w-0 gap-2 border-t border-[#C9A96E]/10 pt-3 text-xs sm:grid-cols-3">
                      <span className="break-words text-[#A79B86]">
                        Harga: {formatRupiah(product.price)}
                      </span>

                      <span className="break-words text-[#A79B86]">
                        Stok tersedia: {product.stock}
                      </span>

                      <span className="break-words font-semibold text-[#D9BB83] sm:text-right">
                        Subtotal: {formatRupiah(getSubtotal(item))}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-6 rounded-xl border border-[#C9A96E]/30 bg-[#C9A96E]/10 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#B5AA98]">
                  Total Pesanan
                </p>
                <p className="mt-1 text-xs text-[#8C8170]">
                  Jumlah keseluruhan produk
                </p>
              </div>

              <span className="break-words text-xl font-bold text-[#E4C98F] sm:text-2xl">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={
              saving ||
              loading ||
              customers.length === 0 ||
              products.length === 0
            }
            className="mt-6 w-full rounded-lg border border-[#D9BB83] bg-[#C9A96E] px-5 py-3.5 text-sm font-bold tracking-wide text-[#171717] shadow-md transition duration-200 hover:bg-[#E0C38C] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Menyimpan Pesanan..." : "Simpan Pesanan"}
          </button>
        </>
      )}
    </form>
  );
}

export default OrderForm;
