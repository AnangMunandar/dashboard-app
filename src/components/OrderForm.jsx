
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

    // Pastikan produk tidak dipilih lebih dari satu kali
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
    "w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-800 bg-slate-950 p-5"
    >
      <h3 className="mb-4 text-lg font-semibold text-white">
        Tambah Pesanan
      </h3>

      {error && (
        <p className="mb-4 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">
          Memuat pelanggan dan produk...
        </p>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-slate-300">
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
                <p className="mt-1 text-xs text-yellow-400">
                  Belum ada pelanggan. Tambahkan pelanggan terlebih dahulu.
                </p>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
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

              <p className="mt-1 text-xs text-slate-500">
                Stok akan berkurang jika pesanan langsung dibuat selesai.
              </p>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between gap-2">
            <h4 className="font-semibold text-white">
              Daftar Produk
            </h4>

            <button
              type="button"
              onClick={addItem}
              disabled={products.length === 0}
              className="rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              + Tambah Produk
            </button>
          </div>

          {products.length === 0 && (
            <p className="mb-4 rounded bg-yellow-500/10 p-3 text-sm text-yellow-400">
              Belum ada produk. Tambahkan produk terlebih dahulu.
            </p>
          )}

          <div className="space-y-3">
            {items.map((item, index) => {
              const product = getProduct(item.productId);

              return (
                <div
                  key={index}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-300">
                      Produk {index + 1}
                    </span>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Hapus
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-slate-400">
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

                    <div>
                      <label className="mb-1 block text-xs text-slate-400">
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
                    <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs">
                      <span className="text-slate-400">
                        Harga: {formatRupiah(product.price)}
                      </span>

                      <span className="text-slate-400">
                        Stok tersedia: {product.stock}
                      </span>

                      <span className="font-semibold text-blue-400">
                        Subtotal: {formatRupiah(getSubtotal(item))}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-300">
                Total Pesanan
              </span>

              <span className="text-xl font-bold text-white">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              saving ||
              loading ||
              customers.length === 0 ||
              products.length === 0
            }
            className="mt-5 w-full rounded bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Menyimpan Pesanan..." : "Simpan Pesanan"}
          </button>
        </>
      )}
    </form>
  );
}

export default OrderForm;
