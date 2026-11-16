import { formatRupiah, formatTanggal } from "../lib/format";

function StatusBadge({ status }) {
  const warna =
    status === "selesai"
      ? "bg-green-500/10 text-green-400"
      : "bg-yellow-500/10 text-yellow-400";

  return (
    <span className={`rounded px-2 py-1 text-xs font-medium ${warna}`}>
      {status}
    </span>
  );
}

function OrdersTable({ orders, onToggleStatus, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-800 text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Pelanggan</th>
            <th className="px-4 py-3 font-medium">Jumlah</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Tanggal</th>
            <th className="px-4 py-3 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan="5" className="px-4 py-6 text-center text-slate-500">
                Belum ada pesanan
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-800 last:border-0">
                <td className="px-4 py-3 text-white">{order.customer_name}</td>
                <td className="px-4 py-3 text-slate-300">
                  {formatRupiah(order.amount)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatTanggal(order.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onToggleStatus(order)}
                      className="rounded bg-slate-800 px-2 py-1 text-xs text-white hover:bg-slate-700"
                    >
                      {order.status === "selesai" ? "Jadikan pending" : "Jadikan selesai"}
                    </button>
                    <button
                      onClick={() => onDelete(order)}
                      className="rounded bg-red-500/10 px-2 py-1 text-xs text-red-400 hover:bg-red-500/20"
                    >
                      Hapus
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default OrdersTable;