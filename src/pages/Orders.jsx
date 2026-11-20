
import { useEffect, useRef, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { formatRupiah } from "../lib/format";

const inputClass =
  "w-full min-w-0 rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-3 py-3 text-sm text-[#F5F1E8] outline-none placeholder-[#8C8170] transition focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30";

const panelClass =
  "rounded-xl border border-[#C9A96E]/20 bg-[#202020]";

const tableHeadClass =
  "border-b border-[#C9A96E]/20 bg-[#252525] text-[#B5AA98]";

const tableBodyClass =
  "divide-y divide-[#C9A96E]/10 text-[#D8CEBD]";

const goldButtonClass =
  "rounded-lg border border-[#D9BB83] bg-[#C9A96E] px-4 py-3 text-sm font-semibold text-[#171717] transition hover:bg-[#E0C38C] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 px-4 py-3 text-sm font-semibold text-[#D9BB83] transition hover:bg-[#C9A96E] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-50";

const dangerButtonClass =
  "rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50";

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

  // State form pesanan baru
  const [customerId, setCustomerId] = useState("");
  const [initialStatus, setInitialStatus] = useState("pending");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [cart, setCart] = useState([]);

  // State Edit Pesanan
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editCart, setEditCart] = useState([]);
  const [editProductId, setEditProductId] = useState("");
  const [editQuantity, setEditQuantity] = useState("1");

  // Referensi untuk gulir otomatis
  const editFormRef = useRef(null);
  const detailRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // Gulir otomatis ke form edit
  useEffect(() => {
    if (showEditForm && editFormRef.current) {
      editFormRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [showEditForm]);

  // Gulir otomatis ke detail pesanan
  useEffect(() => {
    if (selectedOrder && !showEditForm && detailRef.current) {
      detailRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedOrder, showEditForm]);

  // Memuat data milik Admin yang sedang login
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

      const [orderResult, productResult, customerResult] =
        await Promise.all([
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

  // Menambahkan produk ke pesanan baru
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
      amount + (existingItem ? Number(existingItem.quantity) : 0);

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

  // Membuat pesanan baru
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

  // Membuka form Edit Pesanan
  function handleOpenEdit(order) {
    setError("");
    setSuccess("");

    const items = getOrderItems(order.id);

    if (items.some((item) => item.product_id === null)) {
      setError(
        "Pesanan ini memiliki produk yang sudah dihapus. Edit otomatis tidak tersedia."
      );
      return;
    }

    setEditingOrder(order);
    setSelectedOrder(order);

    setEditCustomerId(
      order.customer_id ? String(order.customer_id) : ""
    );

    setEditCustomerName(order.customer_name || "");

    setEditCart(
      items.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: Number(item.unit_price || 0),
        quantity: Number(item.quantity || 0),
      }))
    );

    setEditProductId("");
    setEditQuantity("1");
    setShowEditForm(true);
    setShowForm(false);
  }

  // Menambahkan produk pada form edit
  function addToEditCart() {
    setError("");
    setSuccess("");

    if (!editProductId) {
      setError("Silakan pilih produk terlebih dahulu.");
      return;
    }

    const product = products.find(
      (item) => String(item.id) === String(editProductId)
    );

    if (!product) {
      setError("Produk tidak ditemukan.");
      return;
    }

    const amount = Number(editQuantity);

    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Jumlah produk harus berupa bilangan bulat lebih dari 0.");
      return;
    }

    const existingItem = editCart.find(
      (item) => String(item.product_id) === String(product.id)
    );

    if (existingItem) {
      setEditCart((prev) =>
        prev.map((item) =>
          String(item.product_id) === String(product.id)
            ? {
                ...item,
                quantity: Number(item.quantity || 0) + amount,
              }
            : item
        )
      );
    } else {
      setEditCart((prev) => [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          unit_price: Number(product.price || 0),
          quantity: amount,
        },
      ]);
    }

    setEditProductId("");
    setEditQuantity("1");
  }

  function removeFromEditCart(productId) {
    setEditCart((prev) =>
      prev.filter(
        (item) => String(item.product_id) !== String(productId)
      )
    );
  }

  function updateEditCartQuantity(productId, value) {
    setEditCart((prev) =>
      prev.map((item) =>
        String(item.product_id) === String(productId)
          ? {
              ...item,
              quantity: value === "" ? "" : Number(value),
            }
          : item
      )
    );

    setError("");
  }

  function getEditCartTotal() {
    return editCart.reduce(
      (total, item) =>
        total +
        Number(item.unit_price || 0) *
          Number(item.quantity || 0),
      0
    );
  }

  // Membatalkan proses edit
  function cancelEdit() {
    setShowEditForm(false);
    setEditingOrder(null);
    setEditCustomerId("");
    setEditCustomerName("");
    setEditCart([]);
    setEditProductId("");
    setEditQuantity("1");
  }

  // Menyimpan perubahan pesanan melalui RPC
  async function handleUpdateOrder(e) {
    e.preventDefault();

    if (!editingOrder) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editCart.length === 0) {
        throw new Error("Pesanan harus memiliki minimal satu produk.");
      }

      const invalidItem = editCart.some(
        (item) =>
          !Number.isInteger(Number(item.quantity)) ||
          Number(item.quantity) <= 0
      );

      if (invalidItem) {
        throw new Error(
          "Jumlah setiap produk harus berupa bilangan bulat lebih dari 0."
        );
      }

      if (!editCustomerId && !editCustomerName.trim()) {
        throw new Error("Nama pelanggan harus diisi.");
      }

      const selectedCustomer = customers.find(
        (customer) =>
          String(customer.id) === String(editCustomerId)
      );

      const items = editCart.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
      }));

      const { error: rpcError } = await supabase.rpc(
        "update_order_with_items",
        {
          p_order_id: Number(editingOrder.id),
          p_customer_id: selectedCustomer
            ? Number(selectedCustomer.id)
            : null,
          p_customer_name: selectedCustomer
            ? selectedCustomer.name
            : editCustomerName.trim(),
          p_items: items,
        }
      );

      if (rpcError) throw rpcError;

      const updatedId = editingOrder.id;

      cancelEdit();
      setSuccess(`Pesanan #${updatedId} berhasil diperbarui.`);

      await loadData();
    } catch (err) {
      setError(err.message || "Gagal memperbarui pesanan.");
    } finally {
      setSaving(false);
    }
  }

  // Mengubah status pesanan
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

  // Menghapus pesanan
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

      if (editingOrder?.id === order.id) {
        cancelEdit();
      }

      setSuccess(`Pesanan #${order.id} berhasil dihapus.`);
      await loadData();
    } catch (err) {
      setError(err.message || "Gagal menghapus pesanan.");
    } finally {
      setProcessingId(null);
    }
  }

  // Statistik pesanan
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

  // Pencarian dan filter
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
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A96E]">
            Transaction Management
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-wide text-[#F5F1E8] sm:text-3xl">
            Manajemen Pesanan
          </h2>
          <p className="mt-2 text-sm text-[#A79B86] sm:text-base">
            Kelola transaksi, rincian produk, dan status pesanan MasMuns.
          </p>
        </div>

        {error && (
          <p className="mt-4 break-words rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-4 break-words rounded-lg border border-[#C9A96E]/25 bg-[#C9A96E]/10 px-4 py-3 text-sm text-[#D9BB83]">
            {success}
          </p>
        )}

        {/* STATISTIK */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className={`${panelClass} p-5`}>
            <p className="text-sm font-medium text-[#B5AA98]">Total Pesanan</p>
            <h3 className="mt-3 text-3xl font-bold text-[#F5F1E8]">
              {loading ? "..." : totalOrders}
            </h3>
            <p className="mt-2 text-xs text-[#8C8170]">Seluruh transaksi</p>
          </div>

          <div className={`${panelClass} p-5`}>
            <p className="text-sm font-medium text-[#B5AA98]">Menunggu</p>
            <h3 className="mt-3 text-3xl font-bold text-yellow-400">
              {loading ? "..." : pendingOrders}
            </h3>
            <p className="mt-2 text-xs text-[#8C8170]">Pesanan pending</p>
          </div>

          <div className={`${panelClass} p-5`}>
            <p className="text-sm font-medium text-[#B5AA98]">Selesai</p>
            <h3 className="mt-3 text-3xl font-bold text-[#D9BB83]">
              {loading ? "..." : completedOrders}
            </h3>
            <p className="mt-2 text-xs text-[#8C8170]">Transaksi selesai</p>
          </div>

          <div className={`${panelClass} p-5`}>
            <p className="text-sm font-medium text-[#B5AA98]">
              Pendapatan Selesai
            </p>
            <h3 className="mt-3 break-words text-xl font-bold text-[#D9BB83] sm:text-2xl">
              {loading ? "..." : formatRupiah(totalRevenue)}
            </h3>
            <p className="mt-2 text-xs text-[#8C8170]">
              Hanya pesanan selesai
            </p>
          </div>
        </div>

        {/* DAFTAR PESANAN */}
        <div className={`${panelClass} mt-6 p-4 shadow-lg sm:p-6`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#F5F1E8]">
                Daftar Pesanan
              </h3>
              <p className="mt-1 text-sm text-[#8C8170]">
                Lihat dan kelola seluruh transaksi Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForm(!showForm);
                cancelEdit();
                setError("");
                setSuccess("");
              }}
              className={goldButtonClass}
            >
              + Buat Pesanan
            </button>
          </div>

          {/* FORM PESANAN BARU */}
          {showForm && (
            <form
              onSubmit={handleCreateOrder}
              className="mt-5 rounded-xl border border-[#C9A96E]/20 bg-[#181818] p-4 sm:p-5"
            >
              <h4 className="font-semibold text-[#F5F1E8]">
                Form Pesanan Baru
              </h4>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-[#D8CEBD]">
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
                  <label className="mb-2 block text-sm text-[#D8CEBD]">
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
                  <p className="mt-2 text-xs text-[#8C8170]">
                    Status selesai langsung mengurangi stok.
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-[#C9A96E]/15 bg-[#202020] p-4">
                <h5 className="font-semibold text-[#F5F1E8]">
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
                    className={secondaryButtonClass}
                  >
                    Tambah
                  </button>
                </div>

                {products.length === 0 && (
                  <p className="mt-3 text-sm text-[#D9BB83]">
                    Belum ada produk. Tambahkan produk terlebih dahulu.
                  </p>
                )}

                <div className="mt-5">
                  <h5 className="font-semibold text-[#F5F1E8]">
                    Rincian Pesanan
                  </h5>

                  {cart.length === 0 ? (
                    <p className="py-5 text-center text-sm text-[#8C8170]">
                      Belum ada produk ditambahkan.
                    </p>
                  ) : (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-[#C9A96E]/15">
                      <table className="w-full min-w-[550px] text-left text-sm">
                        <thead className={tableHeadClass}>
                          <tr>
                            <th className="px-3 py-3">Produk</th>
                            <th className="px-3 py-3">Harga</th>
                            <th className="px-3 py-3">Jumlah</th>
                            <th className="px-3 py-3">Subtotal</th>
                            <th className="px-3 py-3">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className={tableBodyClass}>
                          {cart.map((item) => {
                            const product = products.find(
                              (product) =>
                                String(product.id) === String(item.product_id)
                            );

                            if (!product) return null;

                            return (
                              <tr key={item.product_id}>
                                <td className="px-3 py-3">{product.name}</td>
                                <td className="px-3 py-3">
                                  {formatRupiah(Number(product.price || 0))}
                                </td>
                                <td className="px-3 py-3">{item.quantity}</td>
                                <td className="px-3 py-3 font-medium text-[#D9BB83]">
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
                                    className={dangerButtonClass}
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

                  <div className="mt-4 flex flex-col gap-2 border-t border-[#C9A96E]/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-sm text-[#B5AA98]">
                      Total Pesanan
                    </span>
                    <span className="text-xl font-bold text-[#D9BB83]">
                      {formatRupiah(getCartTotal())}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving || cart.length === 0}
                  className={goldButtonClass}
                >
                  {saving ? "Menyimpan..." : "Simpan Pesanan"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className={secondaryButtonClass}
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
            <p className="py-10 text-center text-[#A79B86]">
              Memuat data pesanan...
            </p>
          ) : filteredOrders.length === 0 ? (
            <p className="py-10 text-center text-[#8C8170]">
              Tidak ada pesanan ditemukan.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-xl border border-[#C9A96E]/15">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className={tableHeadClass}>
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

                <tbody className={tableBodyClass}>
                  {filteredOrders.map((order) => {
                    const items = getOrderItems(order.id);
                    const itemCount = items.reduce(
                      (total, item) => total + Number(item.quantity || 0),
                      0
                    );

                    return (
                      <tr
                        key={order.id}
                        className="transition hover:bg-[#252525]"
                      >
                        <td className="px-4 py-4 font-semibold text-[#F5F1E8]">
                          #{order.id}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-[#B5AA98]">
                          {new Date(order.created_at).toLocaleDateString("id-ID")}
                        </td>
                        <td className="px-4 py-4 text-[#F5F1E8]">
                          {order.customer_name}
                        </td>
                        <td className="px-4 py-4 text-[#B5AA98]">
                          {itemCount} unit
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 font-semibold text-[#D9BB83]">
                          {formatRupiah(Number(order.amount || 0))}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`whitespace-nowrap rounded-md border px-3 py-1 text-xs font-semibold ${
                              order.status === "selesai"
                                ? "border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#D9BB83]"
                                : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                            }`}
                          >
                            {order.status === "selesai" ? "Selesai" : "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                cancelEdit();
                                setSelectedOrder(order);
                              }}
                              className="rounded-lg border border-[#C9A96E]/25 bg-[#C9A96E]/10 px-3 py-2 text-xs font-semibold text-[#D9BB83] transition hover:bg-[#C9A96E] hover:text-[#111111]"
                            >
                              Detail
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(order)}
                              disabled={saving || processingId === order.id}
                              className="rounded-lg border border-[#C9A96E]/25 bg-[#252525] px-3 py-2 text-xs font-semibold text-[#F5F1E8] transition hover:border-[#C9A96E] disabled:opacity-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={processingId === order.id || saving}
                              onClick={() => handleChangeStatus(order)}
                              className="rounded-lg border border-[#C9A96E]/25 bg-[#C9A96E]/10 px-3 py-2 text-xs font-semibold text-[#D9BB83] transition hover:bg-[#C9A96E]/20 disabled:opacity-50"
                            >
                              {processingId === order.id
                                ? "Memproses..."
                                : order.status === "pending"
                                  ? "Selesaikan"
                                  : "Batalkan"}
                            </button>

                            <button
                              type="button"
                              disabled={processingId === order.id || saving}
                              onClick={() => handleDeleteOrder(order)}
                              className={dangerButtonClass}
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

          <p className="mt-4 text-xs text-[#8C8170]">
            Menampilkan {filteredOrders.length} dari {totalOrders} pesanan.
          </p>

          <p className="mt-2 text-xs text-[#8C8170] sm:hidden">
            Geser tabel ke kiri atau kanan untuk melihat seluruh kolom.
          </p>
        </div>

        {/* DETAIL PESANAN */}
        {selectedOrder && (
          <div
            ref={detailRef}
            className={`${panelClass} mt-6 scroll-mt-6 p-4 shadow-lg sm:p-6`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#C9A96E]">
                  Order Details
                </p>
                <h3 className="mt-2 text-xl font-bold text-[#F5F1E8]">
                  Pesanan #{selectedOrder.id}
                </h3>
                <p className="mt-1 text-sm text-[#B5AA98]">
                  {selectedOrder.customer_name}
                </p>
                <p className="mt-1 text-sm text-[#8C8170]">
                  {new Date(selectedOrder.created_at).toLocaleString("id-ID")}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedOrder)}
                  disabled={saving}
                  className={secondaryButtonClass}
                >
                  Edit Pesanan
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder(null);
                    cancelEdit();
                  }}
                  className="rounded-lg border border-[#C9A96E]/20 px-4 py-3 text-sm text-[#B5AA98] transition hover:bg-[#252525]"
                >
                  Tutup Detail
                </button>
              </div>
            </div>

            <h4 className="mb-3 mt-6 font-semibold text-[#F5F1E8]">
              Rincian Produk
            </h4>

            {selectedItems.length === 0 ? (
              <p className="py-5 text-center text-sm text-[#8C8170]">
                Tidak ada rincian produk pada pesanan ini.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#C9A96E]/15">
                <table className="w-full min-w-[550px] text-left text-sm">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3">Harga Satuan</th>
                      <th className="px-4 py-3">Jumlah</th>
                      <th className="px-4 py-3">Subtotal</th>
                    </tr>
                  </thead>

                  <tbody className={tableBodyClass}>
                    {selectedItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-4">{item.product_name}</td>
                        <td className="px-4 py-4">
                          {formatRupiah(Number(item.unit_price || 0))}
                        </td>
                        <td className="px-4 py-4">{item.quantity}</td>
                        <td className="px-4 py-4 font-semibold text-[#D9BB83]">
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

            <div className="mt-4 flex flex-col gap-2 border-t border-[#C9A96E]/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm text-[#B5AA98]">
                Total Pesanan
              </span>
              <span className="text-xl font-bold text-[#D9BB83]">
                {formatRupiah(Number(selectedOrder.amount || 0))}
              </span>
            </div>
          </div>
        )}

        {/* FORM EDIT PESANAN */}
        {showEditForm && editingOrder && (
          <form
            ref={editFormRef}
            onSubmit={handleUpdateOrder}
            className={`${panelClass} mt-6 scroll-mt-6 p-4 shadow-lg sm:p-6`}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#C9A96E]">
                Edit Transaction
              </p>
              <h3 className="mt-2 text-xl font-bold text-[#F5F1E8]">
                Pesanan #{editingOrder.id}
              </h3>
              <p className="mt-1 text-xs text-[#8C8170]">
                Status saat ini: {editingOrder.status}
              </p>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm text-[#D8CEBD]">
                Pelanggan
              </label>

              <select
                value={editCustomerId}
                onChange={(e) => setEditCustomerId(e.target.value)}
                className={inputClass}
              >
                <option value="">Pelanggan umum / nama manual</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>

              {!editCustomerId && (
                <input
                  type="text"
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  placeholder="Masukkan nama pelanggan"
                  className={`${inputClass} mt-3`}
                  required
                />
              )}
            </div>

            <div className="mt-5 rounded-xl border border-[#C9A96E]/15 bg-[#181818] p-4">
              <h4 className="font-semibold text-[#F5F1E8]">
                Tambahkan Produk
              </h4>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_120px_auto]">
                <select
                  value={editProductId}
                  onChange={(e) => setEditProductId(e.target.value)}
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
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  placeholder="Jumlah"
                  className={inputClass}
                />

                <button
                  type="button"
                  onClick={addToEditCart}
                  className={secondaryButtonClass}
                >
                  Tambah
                </button>
              </div>

              <h4 className="mb-3 mt-6 font-semibold text-[#F5F1E8]">
                Rincian Produk Pesanan
              </h4>

              {editCart.length === 0 ? (
                <p className="py-5 text-center text-sm text-[#8C8170]">
                  Belum ada produk. Tambahkan produk terlebih dahulu.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-[#C9A96E]/15">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className={tableHeadClass}>
                      <tr>
                        <th className="px-3 py-3">Produk</th>
                        <th className="px-3 py-3">Harga</th>
                        <th className="px-3 py-3">Jumlah</th>
                        <th className="px-3 py-3">Subtotal</th>
                        <th className="px-3 py-3">Aksi</th>
                      </tr>
                    </thead>

                    <tbody className={tableBodyClass}>
                      {editCart.map((item) => (
                        <tr key={item.product_id}>
                          <td className="px-3 py-3">{item.product_name}</td>
                          <td className="px-3 py-3">
                            {formatRupiah(item.unit_price)}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateEditCartQuantity(
                                  item.product_id,
                                  e.target.value
                                )
                              }
                              className="w-24 rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-3 py-2 text-center text-[#F5F1E8] outline-none focus:border-[#C9A96E]"
                              aria-label={`Jumlah ${item.product_name}`}
                            />
                          </td>
                          <td className="px-3 py-3 font-medium text-[#D9BB83]">
                            {formatRupiah(
                              Number(item.unit_price || 0) *
                                Number(item.quantity || 0)
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              onClick={() =>
                                removeFromEditCart(item.product_id)
                              }
                              className={dangerButtonClass}
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2 border-t border-[#C9A96E]/15 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-[#B5AA98]">
                  Total Pesanan
                </span>
                <span className="text-xl font-bold text-[#D9BB83]">
                  {formatRupiah(getEditCartTotal())}
                </span>
              </div>

              <p className="mt-3 text-xs text-[#8C8170]">
                Harga produk lama mengikuti harga transaksi sebelumnya.
                Produk baru menggunakan harga saat ini.
              </p>
            </div>

            {editingOrder.status === "selesai" && (
              <p className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
                Pesanan ini sudah selesai. Perubahan jumlah produk akan
                menyesuaikan stok secara otomatis saat disimpan.
              </p>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving || editCart.length === 0}
                className={goldButtonClass}
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className={secondaryButtonClass}
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Orders;
