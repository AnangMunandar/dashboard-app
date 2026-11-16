import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

function OrderForm({ onAdded }) {
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("pending");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const nilai = Number(amount);

    if (!customerName.trim()) {
      setError("Nama pelanggan wajib diisi.");
      return;
    }
    if (!nilai || nilai <= 0) {
      setError("Jumlah harus berupa angka lebih dari 0.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("orders").insert({
      customer_name: customerName.trim(),
      amount: nilai,
      status,
    });
    setSaving(false);

    if (error) {
      setError("Gagal menyimpan: " + error.message);
      return;
    }

    setCustomerName("");
    setAmount("");
    setStatus("pending");
    onAdded();
  }

  const inputClass =
    "w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-800 bg-slate-950 p-5"
    >
      <h3 className="mb-4 text-lg font-semibold text-white">Tambah Pesanan</h3>

      {error && (
        <p className="mb-4 rounded bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <input
          type="text"
          placeholder="Nama pelanggan"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className={inputClass}
        />
        <input
          type="number"
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
        disabled={saving}
        className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? "Menyimpan..." : "Simpan Pesanan"}
      </button>
    </form>
  );
}

export default OrderForm;