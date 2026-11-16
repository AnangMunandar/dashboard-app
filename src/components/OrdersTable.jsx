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

function OrdersTable({ orders }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-800 text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Pelanggan</th>
            <th className="px-4 py-3 font-medium">Jumlah</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Tanggal</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan="4" className="px-4 py-6 text-center text-slate-500">
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
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default OrdersTable;