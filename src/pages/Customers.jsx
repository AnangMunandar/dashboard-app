
import { useEffect, useState } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import { supabase } from "../lib/supabaseClient";
import { formatRupiah } from "../lib/format";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
};

const inputClass =
  "w-full min-w-0 rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-3 py-3 text-sm text-[#F5F1E8] outline-none transition placeholder:text-[#817765] focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30";

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  // Memuat pelanggan dan transaksi milik Admin yang login
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

      const [customerResult, orderResult] = await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (customerResult.error) throw customerResult.error;
      if (orderResult.error) throw orderResult.error;

      setCustomers(customerResult.data || []);
      setOrders(orderResult.data || []);

      if (selectedCustomer) {
        const updatedCustomer = (customerResult.data || []).find(
          (customer) => customer.id === selectedCustomer.id
        );

        setSelectedCustomer(updatedCustomer || null);
      }
    } catch (err) {
      setError(err.message || "Gagal memuat data.");
      setCustomers([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  function getCustomerOrders(customer) {
    return orders.filter((order) => {
      if (order.customer_id != null) {
        return String(order.customer_id) === String(customer.id);
      }

      return (
        (order.customer_name || "").trim().toLowerCase() ===
        customer.name.trim().toLowerCase()
      );
    });
  }

  function openAddForm() {
    setEditingCustomer(null);
    setForm(emptyForm);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEditForm(customer) {
    setEditingCustomer(customer);
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  // Menambah atau memperbarui pelanggan milik Admin
  async function handleSubmit(e) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

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

      const customerData = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      };

      if (editingCustomer) {
        const { data, error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", editingCustomer.id)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;

        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === editingCustomer.id ? data : customer
          )
        );

        if (selectedCustomer?.id === editingCustomer.id) {
          setSelectedCustomer(data);
        }

        setSuccess("Data pelanggan berhasil diperbarui.");
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert([
            {
              ...customerData,
              user_id: user.id,
            },
          ])
          .select()
          .single();

        if (error) throw error;

        setCustomers((prev) => [data, ...prev]);
        setSuccess("Pelanggan berhasil ditambahkan.");
      }

      setForm(emptyForm);
      setEditingCustomer(null);
      setShowForm(false);
    } catch (err) {
      setError(err.message || "Gagal menyimpan data pelanggan.");
    } finally {
      setSaving(false);
    }
  }

  // Menghapus pelanggan milik Admin yang login
  async function handleDeleteCustomer(customer) {
    const customerOrders = getCustomerOrders(customer);

    if (customerOrders.length > 0) {
      setError(
        `Pelanggan ${customer.name} memiliki ${customerOrders.length} transaksi dan tidak dapat dihapus.`
      );
      setSuccess("");
      return;
    }

    const confirmed = window.confirm(
      `Yakin ingin menghapus pelanggan ${customer.name}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

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

      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customer.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setCustomers((prev) =>
        prev.filter((item) => item.id !== customer.id)
      );

      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(null);
      }

      setSuccess("Pelanggan berhasil dihapus.");
    } catch (err) {
      setError(err.message || "Gagal menghapus pelanggan.");
    }
  }

  const totalCustomers = customers.length;
  const totalTransactions = orders.length;

  const totalSpending = orders.reduce(
    (total, order) => total + Number(order.amount || 0),
    0
  );

  const filteredCustomers = customers.filter((customer) => {
    const keyword = search.trim().toLowerCase();

    return (
      customer.name.toLowerCase().includes(keyword) ||
      (customer.phone || "").toLowerCase().includes(keyword) ||
      (customer.email || "").toLowerCase().includes(keyword)
    );
  });

  const selectedOrders = selectedCustomer
    ? getCustomerOrders(selectedCustomer)
    : [];

  const selectedTotal = selectedOrders.reduce(
    (total, order) => total + Number(order.amount || 0),
    0
  );

  const statCards = [
    {
      title: "Total Pelanggan",
      value: loading ? "..." : totalCustomers,
      note: "Pelanggan terdaftar",
    },
    {
      title: "Total Transaksi",
      value: loading ? "..." : totalTransactions,
      note: "Semua pesanan",
    },
    {
      title: "Total Belanja",
      value: loading ? "..." : formatRupiah(totalSpending),
      note: "Akumulasi seluruh pesanan",
    },
  ];

  return (
    <DashboardLayout>
      <div className="min-w-0">
        {/* HEADER */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A96E]">
            Business Management
          </p>

          <h2 className="mt-2 text-xl font-bold tracking-tight text-[#F5F1E8] sm:text-2xl">
            Manajemen Pelanggan
          </h2>

          <p className="mt-2 text-sm text-[#A79B86] sm:text-base">
            Kelola dan pantau aktivitas pelanggan MasMuns.
          </p>
        </div>

        {/* PESAN ERROR DAN SUKSES */}
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

        {/* STATISTIK */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {statCards.map((item) => (
            <div
              key={item.title}
              className="group relative min-w-0 overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg transition hover:border-[#C9A96E]/50 sm:p-5"
            >
              <div className="absolute left-0 top-0 h-full w-1 bg-[#C9A96E]/70" />

              <div className="pl-2">
                <p className="text-sm text-[#A79B86]">
                  {item.title}
                </p>

                <h3 className="mt-2 break-words text-xl font-bold text-[#F5F1E8] sm:text-2xl">
                  {item.value}
                </h3>

                <p className="mt-1 text-xs text-[#8C8170]">
                  {item.note}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* DAFTAR PELANGGAN */}
        <div className="mt-6 rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                Customer Directory
              </p>

              <h3 className="mt-1 text-lg font-semibold text-[#F5F1E8]">
                Daftar Pelanggan
              </h3>

              <p className="mt-1 text-sm text-[#A79B86]">
                Klik nama untuk melihat riwayat transaksi.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddForm}
              className="w-full rounded-lg bg-[#C9A96E] px-4 py-3 text-sm font-semibold text-[#17130D] transition hover:bg-[#D8B982] sm:w-auto"
            >
              + Tambah Pelanggan
            </button>
          </div>

          {/* FORM TAMBAH DAN EDIT */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="mt-5 rounded-xl border border-[#C9A96E]/20 bg-[#181818] p-4 sm:p-5"
            >
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                  Customer Information
                </p>

                <h4 className="mt-1 font-semibold text-[#F5F1E8]">
                  {editingCustomer
                    ? "Edit Pelanggan"
                    : "Form Tambah Pelanggan"}
                </h4>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    label: "Nama Pelanggan",
                    key: "name",
                    placeholder: "Nama pelanggan",
                    required: true,
                  },
                  {
                    label: "Nomor Telepon",
                    key: "phone",
                    placeholder: "08xxxxxxxxxx",
                  },
                  {
                    label: "Email",
                    key: "email",
                    placeholder: "email@example.com",
                    type: "email",
                  },
                  {
                    label: "Alamat",
                    key: "address",
                    placeholder: "Alamat pelanggan",
                  },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="mb-2 block text-sm text-[#C8BDAA]">
                      {field.label}
                      {field.required ? " *" : ""}
                    </label>

                    <input
                      type={field.type || "text"}
                      required={field.required || false}
                      value={form[field.key]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [field.key]: e.target.value,
                        })
                      }
                      placeholder={field.placeholder}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-[#C9A96E] px-5 py-3 text-sm font-semibold text-[#17130D] transition hover:bg-[#D8B982] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingCustomer
                      ? "Simpan Perubahan"
                      : "Simpan Pelanggan"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCustomer(null);
                    setForm(emptyForm);
                  }}
                  className="w-full rounded-lg border border-[#C9A96E]/30 px-5 py-3 text-sm text-[#D8C9AD] transition hover:bg-[#292929] sm:w-auto"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* PENCARIAN */}
          <div className="mt-5">
            <input
              type="text"
              placeholder="Cari nama, telepon, atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* TABEL PELANGGAN */}
          {loading ? (
            <p className="py-10 text-center text-[#A79B86]">
              Memuat data pelanggan...
            </p>
          ) : filteredCustomers.length === 0 ? (
            <p className="py-10 text-center text-[#A79B86]">
              Tidak ada pelanggan ditemukan.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-xl border border-[#C9A96E]/15">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-[#C9A96E]/15 bg-[#181818] text-xs uppercase tracking-wider text-[#C9A96E]">
                  <tr>
                    <th className="px-4 py-4">Nama Pelanggan</th>
                    <th className="px-4 py-4">Telepon</th>
                    <th className="px-4 py-4">Total Transaksi</th>
                    <th className="px-4 py-4">Total Belanja</th>
                    <th className="px-4 py-4">Pesanan Terakhir</th>
                    <th className="px-4 py-4">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#C9A96E]/10 text-[#C8BDAA]">
                  {filteredCustomers.map((customer) => {
                    const customerOrders = getCustomerOrders(customer);

                    const spending = customerOrders.reduce(
                      (total, order) =>
                        total + Number(order.amount || 0),
                      0
                    );

                    const latestOrder = customerOrders[0]?.created_at;

                    return (
                      <tr
                        key={customer.id}
                        className="transition hover:bg-[#292929]"
                      >
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            className="font-semibold text-[#D8B982] transition hover:text-[#F5F1E8] hover:underline"
                          >
                            {customer.name}
                          </button>

                          {customer.email && (
                            <p className="mt-1 text-xs text-[#8C8170]">
                              {customer.email}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          {customer.phone || "-"}
                        </td>

                        <td className="px-4 py-4">
                          {customerOrders.length} pesanan
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 font-medium text-[#D8B982]">
                          {formatRupiah(spending)}
                        </td>

                        <td className="px-4 py-4">
                          {latestOrder
                            ? new Date(latestOrder).toLocaleDateString("id-ID")
                            : "-"}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(customer)}
                              className="rounded-lg border border-[#C9A96E]/40 px-3 py-2 text-xs font-medium text-[#D8B982] transition hover:bg-[#C9A96E] hover:text-[#17130D]"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(customer)}
                              className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
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
            Menampilkan {filteredCustomers.length} dari {totalCustomers} pelanggan.
          </p>

          <p className="mt-2 text-xs text-[#8C8170] sm:hidden">
            Geser tabel ke kiri atau kanan untuk melihat seluruh kolom.
          </p>
        </div>

        {/* DETAIL DAN RIWAYAT PELANGGAN */}
        {selectedCustomer && (
          <div className="mt-6 rounded-xl border border-[#C9A96E]/30 bg-[#202020] p-4 shadow-lg sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-widest text-[#C9A96E]">
                  Customer Details
                </p>

                <h3 className="mt-2 break-words text-xl font-bold text-[#F5F1E8]">
                  {selectedCustomer.name}
                </h3>

                <p className="mt-2 break-words text-sm text-[#A79B86]">
                  {selectedCustomer.phone || "Tidak ada nomor telepon"}
                </p>

                <p className="break-words text-sm text-[#A79B86]">
                  {selectedCustomer.email || "Tidak ada email"}
                </p>

                <p className="break-words text-sm text-[#A79B86]">
                  {selectedCustomer.address || "Tidak ada alamat"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-full rounded-lg border border-[#C9A96E]/30 px-4 py-3 text-sm text-[#D8C9AD] transition hover:bg-[#292929] sm:w-auto"
              >
                Tutup Detail
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#C9A96E]/15 bg-[#181818] p-4">
                <p className="text-sm text-[#A79B86]">
                  Total Transaksi
                </p>

                <p className="mt-2 text-2xl font-bold text-[#F5F1E8]">
                  {selectedOrders.length}
                </p>
              </div>

              <div className="rounded-xl border border-[#C9A96E]/15 bg-[#181818] p-4">
                <p className="text-sm text-[#A79B86]">
                  Total Belanja
                </p>

                <p className="mt-2 break-words text-xl font-bold text-[#D8B982]">
                  {formatRupiah(selectedTotal)}
                </p>
              </div>
            </div>

            <h4 className="mb-3 mt-6 font-semibold text-[#F5F1E8]">
              Riwayat Transaksi
            </h4>

            {selectedOrders.length === 0 ? (
              <p className="py-5 text-center text-sm text-[#A79B86]">
                Belum ada transaksi untuk pelanggan ini.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#C9A96E]/15">
                <table className="w-full min-w-[550px] text-left text-sm">
                  <thead className="border-b border-[#C9A96E]/15 bg-[#181818] text-xs uppercase tracking-wider text-[#C9A96E]">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Nominal</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#C9A96E]/10 text-[#C8BDAA]">
                    {selectedOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-4">
                          {new Date(order.created_at).toLocaleDateString("id-ID")}
                        </td>

                        <td className="px-4 py-4 font-medium text-[#F5F1E8]">
                          {formatRupiah(Number(order.amount || 0))}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${
                              order.status === "selesai"
                                ? "border border-[#C9A96E]/25 bg-[#C9A96E]/10 text-[#D8B982]"
                                : "border border-amber-500/20 bg-amber-500/10 text-amber-400"
                            }`}
                          >
                            {order.status || "Belum ada status"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-2 text-xs text-[#8C8170] sm:hidden">
              Geser tabel riwayat ke kiri atau kanan jika diperlukan.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Customers;
