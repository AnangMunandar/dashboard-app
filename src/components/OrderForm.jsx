
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function OrderForm({ onAdded }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoadingCustomers(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Silakan login kembali.");
      }

      const { data, error: customerError } = await supabase
        .from("customers")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (customerError) throw customerError;

      setCustomers(data || []);
    } catch (err) {
      setError("Gagal mengambil pelanggan: " + err.message);
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const nilai = Number(amount);
    const selectedCustomer = customers.find(
      (customer) => String(customer.id) === customerId
    );

    if (!selectedCustomer) {
      setError("Silakan pilih pelanggan.");
      return;
    }

    if (!nilai || nilai <= 0) {
      setError("Jumlah harus berupa angka lebih dari 0.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Akun Admin tidak ditemukan. Silakan login kembali.");
      }

      const { error: insertError } = await supabase
        .from("orders")
        .insert({
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          amount: nilai,
          status,
          user_id: user.id,
        });

      if (insertError) throw insertError;

      setCustomerId("");
      setAmount("");
      setStatus("pending");

      await onAdded?.();
    } catch (err) {
      setError("Gagal menyimpan: " + err.message);
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

      <div className="grid gap-4 sm:grid-cols-3">
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={inputClass}
          disabled={loadingCustomers || customers.length === 0}
        >
          <option value="">
            {loadingCustomers
              ? "Memuat pelanggan..."
              : customers.length === 0
                ? "Belum ada pelanggan"
                : "Pilih pelanggan"}
          </option>

          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          placeholder="Jumlah (Rp)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputClass}
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={inputClass}
        >
          <option value="pending">pending</option>
          <option value="selesai">selesai</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={saving || loadingCustomers || customers.length === 0}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan Pesanan"}
      </button>
    </form>
  );
}

export default OrderForm;
