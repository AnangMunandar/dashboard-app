
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { formatRupiah } from "../lib/format";

const inputClass =
  "w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-sky-500";

function Orders() {
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");

  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [customerId, setCustomerId] = useState("");
  const [initialStatus, setInitialStatus] = useState("pending");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [cart, setCart] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  // Memuat seluruh data milik Admin yang sedang login
  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error(
          "Akun Admin tidak ditemukan. Silakan login kembali."
        );
      }

      const [
        orderResult,
        productResult,
        customerResult,
      ] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("products")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),

        supabase
          .from("customers")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),
      ]);

      if (orderResult.error) throw orderResult.error;
      if (productResult.error) throw productResult.error;
      if (customerResult.error) throw customerResult.error;

      const orderData = orderResult.data || [];
      const orderIds = orderData.map((order) => order.id);

      let itemData = [];

      if (orderIds.length > 0) {
        const { data, error: itemError } = await supabase
          .from("order_items")
          .select("*")
          .eq("user_id", user.id)
          .in("order_id", orderIds)
          .order("id", { ascending: true });

        if (itemError) throw itemError;

        itemData = data || [];
      }

      setOrders(orderData);
      setOrderItems(itemData);
      setProducts(productResult.data || []);
      setCustomers(customerResult.data || []);

      if (selectedOrder) {
        const updatedOrder = orderData.find(
          (order) => order.id === selectedOrder.id
        );

        setSelectedOrder(updatedOrder || null);
      }
    } catch (err) {
      setError(err.message || "Gagal memuat data pesanan.");
      setOrders([]);
      setOrderItems([]);
      setProducts([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  function getOrderItems(orderId) {
    return orderItems.filter(
      (item) => String(item.order_id) === String(orderId)
    );
  }

  function resetForm() {
    setCustomerId("");
    setInitialStatus("pending");
    setSelectedProductId("");
    setQuantity("1");
    setCart([]);
    setShowForm(false);
  }

  function addToCart() {
    setError("");
    setSuccess("");

    if (!selectedProductId) {
      setError("Silakan pilih produk terlebih dahulu.");
      return;
    }

    const selectedProduct = products.find(
      (product) => String(product.id) === String(selectedProductId)
    );

    if (!selectedProduct) {
      setError("Produk tidak ditemukan.");
      return;
    }

    const amount = Number(quantity);

    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Jumlah produk harus berupa bilangan bulat lebih dari 0.");
      return;
    }

    const existingItem = cart.find(
      (item) => String(item.product_id) === String(selectedProduct.id)
    );

    const newQuantity =
      amount + (existingItem ? existingItem.quantity : 0);

    if (
      initialStatus === "selesai" &&
      newQuantity > Number(selectedProduct.stock)
    ) {
      setError(
        `Stok ${selectedProduct.name} hanya tersedia ${selectedProduct.stock}.`
      );
      return;
    }

    if (existingItem) {
      setCart((prev) =>
        prev.map((item) =>
          String(item.product_id) === String(selectedProduct.id)
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          product_id: selectedProduct.id,
          quantity: amount,
        },
      ]);
    }

    setSelectedProductId("");
    setQuantity("1");
  }

  function removeFromCart(productId) {
    setCart((prev) =>
      prev.filter(
        (item) => String(item.product_id) !== String(productId)
      )
    );
  }

  function getCartTotal() {
    return cart.reduce((total, item) => {
      const product = products.find(
        (product) => String(product.id) === String(item.product_id)
      );

      return total + Number(product?.price || 0) * item.quantity;
    }, 0);
  }

  // Membuat pesanan menggunakan RPC database
  async function handleCreateOrder(e) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (cart.length === 0) {
        throw new Error("Tambahkan minimal satu produk ke pesanan.");
      }

      const selectedCustomer = customers.find(
        (customer) => String(customer.id) === String(customerId)
      );

      const items = cart.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      }));

      const { data, error: rpcError } = await supabase.rpc(
        "create_order_with_items",
        {
          p_customer_id: selectedCustomer
            ? Number(selectedCustomer.id)
            : null,
          p_customer_name: selectedCustomer
            ? selectedCustomer.name
            : "Pelanggan umum",
          p_status: initialStatus,
          p_items: items,
        }
      );

      if (rpcError) throw rpcError;

      resetForm();
      setSuccess(`Pesanan #${data} berhasil dibuat.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Gagal membuat pesanan.");
    } finally {
      setSaving(false);
    }
  }

  // Mengubah status melalui RPC agar stok diperbarui secara aman
  async function handleChangeStatus(order) {
    const newStatus =
      order.status === "pending" ? "selesai" : "pending";

    const message =
      newStatus === "selesai"
        ? `Selesaikan pesanan #${order.id}? Stok produk akan berkurang.`
        : `Batalkan penyelesaian pesanan #${order.id}? Stok produk akan dikembalikan.`;

    if (!window.confirm(message)) return;

    setProcessingId(order.id);
    setError("");
    setSuccess("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "set_order_status",
        {
          p_order_id: order.id,
          p_new_status: newStatus,
        }
      );

      if (rpcError) throw rpcError;

      setSuccess(
        `Status pesanan #${order.id} berhasil diubah menjadi ${newStatus}.`
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Gagal mengubah status pesanan.");
    } finally {
      setProcessingId(null);
    }
  }

  // Menghapus pesanan melalui RPC dengan pengembalian stok otomatis
  async function handleDeleteOrder(order) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus pesanan #${order.id} milik ${order.customer_name}?`
    );

    if (!confirmed) return;

    setProcessingId(order.id);
    setError("");
    setSuccess("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "delete_order_with_stock",
        {
          p_order_id: order.id,
        }
      );

      if (rpcError) throw rpcError;

      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
      }

      setSuccess(`Pesanan #${order.id} berhasil dihapus.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Gagal menghapus pesanan.");
    } finally {
      setProcessingId(null);
    }
  }

  const totalOrders = orders.length;

  const pendingOrders = orders.filter(
    (order) => order.status === "pending"
  ).length;

  const completedOrders = orders.filter(
    (order) => order.status === "selesai"
  ).length;

  const totalRevenue = orders
    .filter((order) => order.status === "selesai")
    .reduce(
      (total, order) => total + Number(order.amount || 0),
      0
    );

  const filteredOrders = orders.filter((order) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
      String(order.id).includes(keyword) ||
      (order.customer_name || "").toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === "semua" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const selectedItems = selectedOrder
    ? getOrderItems(selectedOrder.id)
    : [];

  return (
    <DashboardLayout>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          Manajemen Pesanan
        </h2>

        <p className="mt-2 text-sm text-slate-300 sm:text-base">
          Kelola transaksi, rincian produk, dan status pesanan MasMuns.
        </p>

        {error && (
          <p className="mt-4 break-words rounded-lg bg-red-500/10 px-3 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 break-words rounded-lg bg-emerald-500/10 px-3 py-3 text-sm text-emerald-400">
            {success}
          </p>
        )}

        {/* STATISTIK */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Total Pesanan</p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              {loading ? "..." : totalOrders}
            </h3>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Menunggu</p>
            <h3 className="mt-2 text-2xl font-bold text-amber-400">
              {loading ? "..." : pendingOrders}
            </h3>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Selesai</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-400">
              {loading ? "..." : completedOrders}
            </h3>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
            <p className="text-sm text-slate-400">Pendapatan Selesai</p>
            <h3 className="mt-2 break-words text-xl font-bold text-sky-400">
              {loading ? "..." : formatRupiah(totalRevenue)}
            </h3>
          </div>
        </div>

        {/* DAFTAR PESANAN */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Daftar Pesanan
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Lihat dan kelola seluruh transaksi Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForm(!showForm);
                setError("");
                setSuccess("");
              }}
              className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-500 sm:w-auto"
            >
              + Buat Pesanan
            </button>
          </div>

          {/* FORM PESANAN */}
          {showForm && (
            <form
              onSubmit={handleCreateOrder}
              className="mt-5 rounded-lg border border-slate-800 bg-slate-900 p-4 sm:p-5"
            >
              <h4 className="font-semibold text-white">
                Form Pesanan Baru
              </h4>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Pelanggan
                  </label>

                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Pelanggan umum</option>

                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Status Awal
                  </label>

                  <select
                    value={initialStatus}
                    onChange={(e) => {
                      setInitialStatus(e.target.value);
                      setError("");
                    }}
                    className={inputClass}
                  >
                    <option value="pending">Pending</option>
                    <option value="selesai">Selesai</option>
                  </select>

                  <p className="mt-1 text-xs text-slate-500">
                    Status selesai langsung mengurangi stok.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950 p-4">
                <h5 className="font-semibold text-white">
                  Tambahkan Produk
                </h5>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_auto]">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Pilih produk</option>

                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatRupiah(Number(product.price || 0))} (Stok: {product.stock})
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Jumlah"
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={addToCart}
                    className="rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-500"
                  >
                    Tambah
                  </button>
                </div>

                {products.length === 0 && (
                  <p className="mt-3 text-sm text-amber-400">
                    Belum ada produk. Tambahkan produk terlebih dahulu.
                  </p>
                )}

                {/* KERANJANG PESANAN */}
                <div className="mt-5">
                  <h5 className="font-semibold text-white">
                    Rincian Pesanan
                  </h5>

                  {cart.length === 0 ? (
                    <p className="py-5 text-center text-sm text-slate-400">
                      Belum ada produk ditambahkan.
                    </p>
                  ) : (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full min-w-[550px] text-left text-sm">
                        <thead className="bg-slate-900 text-slate-400">
                          <tr>
                            <th className="px-3 py-3">Produk</th>
                            <th className="px-3 py-3">Harga</th>
                            <th className="px-3 py-3">Jumlah</th>
                            <th className="px-3 py-3">Subtotal</th>
                            <th className="px-3 py-3">Aksi</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {cart.map((item) => {
                            const product = products.find(
                              (product) =>
                                String(product.id) === String(item.product_id)
                            );

                            if (!product) return null;

                            return (
                              <tr key={item.product_id}>
                                <td className="px-3 py-3">
                                  {product.name}
                                </td>

                                <td className="px-3 py-3">
                                  {formatRupiah(Number(product.price || 0))}
                                </td>

                                <td className="px-3 py-3">
                                  {item.quantity}
                                </td>

                                <td className="px-3 py-3 font-medium text-white">
                                  {formatRupiah(
                                    Number(product.price || 0) * item.quantity
                                  )}
                                </td>

                                <td className="px-3 py-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeFromCart(item.product_id)
                                    }
                                    className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
                                  >
                                    Hapus
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-slate-400">
                      Total Pesanan
                    </span>

                    <span className="text-xl font-bold text-sky-400">
                      {formatRupiah(getCartTotal())}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving || cart.length === 0}
                  className="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 sm:w-auto"
                >
                  {saving ? "Menyimpan..." : "Simpan Pesanan"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800 sm:w-auto"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* PENCARIAN DAN FILTER */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Cari nomor pesanan atau pelanggan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={inputClass}
            >
              <option value="semua">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="selesai">Selesai</option>
            </select>
          </div>

          {/* TABEL PESANAN */}
          {loading ? (
            <p className="py-10 text-center text-slate-400">
              Memuat data pesanan...
            </p>
          ) : filteredOrders.length === 0 ? (
            <p className="py-10 text-center text-slate-400">
              Tidak ada pesanan ditemukan.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">No. Pesanan</th>
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-4 py-3">Pelanggan</th>
                    <th className="px-4 py-3">Jumlah Produk</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredOrders.map((order) => {
                    const items = getOrderItems(order.id);
                    const itemCount = items.reduce(
                      (total, item) => total + Number(item.quantity || 0),
                      0
                    );

                    return (
                      <tr key={order.id} className="hover:bg-slate-900">
                        <td className="px-4 py-4 font-semibold text-white">
                          #{order.id}
                        </td>

                        <td className="px-4 py-4">
                          {new Date(order.created_at).toLocaleDateString("id-ID")}
                        </td>

                        <td className="px-4 py-4">
                          {order.customer_name}
                        </td>

                        <td className="px-4 py-4">
                          {itemCount} unit
                        </td>

                        <td className="px-4 py-4 font-medium text-sky-400">
                          {formatRupiah(Number(order.amount || 0))}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                              order.status === "selesai"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="rounded-lg bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-400 hover:bg-sky-500/20"
                            >
                              Detail
                            </button>

                            <button
                              type="button"
                              disabled={processingId === order.id}
                              onClick={() => handleChangeStatus(order)}
                              className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                            >
                              {processingId === order.id
                                ? "Memproses..."
                                : order.status === "pending"
                                  ? "Selesaikan"
                                  : "Batalkan"}
                            </button>

                            <button
                              type="button"
                              disabled={processingId === order.id}
                              onClick={() => handleDeleteOrder(order)}
                              className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Menampilkan {filteredOrders.length} dari {totalOrders} pesanan.
          </p>

          <p className="mt-2 text-xs text-slate-500 sm:hidden">
            Geser tabel ke kiri atau kanan untuk melihat seluruh kolom.
          </p>
        </div>

        {/* DETAIL PESANAN */}
        {selectedOrder && (
          <div className="mt-6 rounded-xl border border-sky-800 bg-slate-950 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  Detail Pesanan
                </p>

                <h3 className="mt-1 text-xl font-bold text-white">
                  Pesanan #{selectedOrder.id}
                </h3>

                <p className="mt-1 text-sm text-slate-400">
                  {selectedOrder.customer_name}
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  {new Date(selectedOrder.created_at).toLocaleString("id-ID")}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 sm:w-auto"
              >
                Tutup Detail
              </button>
            </div>

            <h4 className="mb-3 mt-6 font-semibold text-white">
              Rincian Produk
            </h4>

            {selectedItems.length === 0 ? (
              <p className="py-5 text-center text-sm text-slate-400">
                Tidak ada rincian produk pada pesanan ini.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full min-w-[550px] text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3">Harga Satuan</th>
                      <th className="px-4 py-3">Jumlah</th>
                      <th className="px-4 py-3">Subtotal</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {selectedItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4">
                          {item.product_name}
                        </td>

                        <td className="px-4 py-4">
                          {formatRupiah(Number(item.unit_price || 0))}
                        </td>

                        <td className="px-4 py-4">
                          {item.quantity}
                        </td>

                        <td className="px-4 py-4 font-medium text-white">
                          {formatRupiah(
                            Number(item.unit_price || 0) *
                              Number(item.quantity || 0)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-slate-400">
                Total Pesanan
              </span>

              <span className="text-xl font-bold text-sky-400">
                {formatRupiah(Number(selectedOrder.amount || 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Orders;
