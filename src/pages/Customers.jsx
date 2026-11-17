
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
  "w-full min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-sky-500";

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

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [customerResult, orderResult] = await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (customerResult.error) throw customerResult.error;
      if (orderResult.error) throw orderResult.error;

      setCustomers(customerResult.data || []);
      setOrders(orderResult.data || []);
    } catch (err) {
      setError(err.message || "Gagal memuat data.");
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

  async function handleSubmit(e) {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    const customerData = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    };

    try {
      if (editingCustomer) {
        const { data, error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", editingCustomer.id)
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
          .insert([customerData])
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
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customer.id);

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

  return (
    <DashboardLayout>
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-white sm:text-2xl">
          Manajemen Pelanggan
        </h2>

        <p className="mt-2 text-sm text-slate-300 sm:text-base">
          Kelola dan pantau aktivitas pelanggan MasMuns.
        </p>

        {/* PESAN ERROR DAN SUKSES */}
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
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
            <p className="text-sm text-slate-400">Total Pelanggan</p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              {loading ? "..." : totalCustomers}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Pelanggan terdaftar
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
            <p className="text-sm text-slate-400">Total Transaksi</p>
            <h3 className="mt-2 text-2xl font-bold text-white">
              {loading ? "..." : totalTransactions}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Semua pesanan
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:col-span-2 sm:p-5 xl:col-span-1">
            <p className="text-sm text-slate-400">Total Belanja</p>
            <h3 className="mt-2 break-words text-xl font-bold text-sky-400">
              {loading ? "..." : formatRupiah(totalSpending)}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Akumulasi seluruh pesanan
            </p>
          </div>
        </div>

        {/* DAFTAR PELANGGAN */}
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Daftar Pelanggan
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Klik nama untuk melihat riwayat transaksi.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddForm}
              className="w-full rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-500 sm:w-auto"
            >
              + Tambah Pelanggan
            </button>
          </div>

          {/* FORM TAMBAH DAN EDIT */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="mt-5 rounded-lg border border-slate-800 bg-slate-900 p-4 sm:p-5"
            >
              <h4 className="mb-4 font-semibold text-white">
                {editingCustomer
                  ? "Edit Pelanggan"
                  : "Form Tambah Pelanggan"}
              </h4>

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
                    <label className="mb-2 block text-sm text-slate-300">
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
                  className="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 sm:w-auto"
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
                  className="w-full rounded-lg border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:bg-slate-800 sm:w-auto"
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
            <p className="py-10 text-center text-slate-400">
              Memuat data pelanggan...
            </p>
          ) : filteredCustomers.length === 0 ? (
            <p className="py-10 text-center text-slate-400">
              Tidak ada pelanggan ditemukan.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="border-b border-slate-800 bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Nama Pelanggan</th>
                    <th className="px-4 py-3">Telepon</th>
                    <th className="px-4 py-3">Total Transaksi</th>
                    <th className="px-4 py-3">Total Belanja</th>
                    <th className="px-4 py-3">Pesanan Terakhir</th>
                    <th className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800 text-slate-300">
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
                        className="hover:bg-slate-900"
                      >
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedCustomer(customer)}
                            className="font-semibold text-sky-400 hover:underline"
                          >
                            {customer.name}
                          </button>

                          {customer.email && (
                            <p className="mt-1 text-xs text-slate-500">
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

                        <td className="px-4 py-4 font-medium text-sky-400">
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
                              className="rounded-lg bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteCustomer(customer)}
                              className="rounded-lg bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20"
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
            Menampilkan {filteredCustomers.length} dari {totalCustomers} pelanggan.
          </p>

          <p className="mt-2 text-xs text-slate-500 sm:hidden">
            Geser tabel ke kiri atau kanan untuk melihat seluruh kolom.
          </p>
        </div>

        {/* DETAIL DAN RIWAYAT PELANGGAN */}
        {selectedCustomer && (
          <div className="mt-6 rounded-xl border border-sky-800 bg-slate-950 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm text-slate-400">
                  Detail Riwayat Pelanggan
                </p>

                <h3 className="mt-1 break-words text-xl font-bold text-white">
                  {selectedCustomer.name}
                </h3>

                <p className="mt-1 break-words text-sm text-slate-400">
                  {selectedCustomer.phone || "Tidak ada nomor telepon"}
                </p>

                <p className="break-words text-sm text-slate-400">
                  {selectedCustomer.email || "Tidak ada email"}
                </p>

                <p className="break-words text-sm text-slate-400">
                  {selectedCustomer.address || "Tidak ada alamat"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-full rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 sm:w-auto"
              >
                Tutup Detail
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-900 p-4">
                <p className="text-sm text-slate-400">
                  Total Transaksi
                </p>
                <p className="mt-2 text-2xl font-bold text-white">
                  {selectedOrders.length}
                </p>
              </div>

              <div className="rounded-lg bg-slate-900 p-4">
                <p className="text-sm text-slate-400">
                  Total Belanja
                </p>
                <p className="mt-2 break-words text-xl font-bold text-sky-400">
                  {formatRupiah(selectedTotal)}
                </p>
              </div>
            </div>

            <h4 className="mb-3 mt-6 font-semibold text-white">
              Riwayat Transaksi
            </h4>

            {selectedOrders.length === 0 ? (
              <p className="py-5 text-center text-sm text-slate-400">
                Belum ada transaksi untuk pelanggan ini.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full min-w-[550px] text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Nominal</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {selectedOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-4">
                          {new Date(order.created_at).toLocaleDateString("id-ID")}
                        </td>

                        <td className="px-4 py-4 font-medium text-white">
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
                            {order.status || "Belum ada status"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="mt-2 text-xs text-slate-500 sm:hidden">
              Geser tabel riwayat ke kiri atau kanan jika diperlukan.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Customers;
