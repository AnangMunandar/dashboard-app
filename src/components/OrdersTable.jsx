
import { formatRupiah, formatTanggal } from "../lib/format";

function StatusBadge({ status }) {
  const selesai = status === "selesai";

  const warna = selesai
    ? "border border-[#C9A96E]/30 bg-[#C9A96E]/10 text-[#D9BB83]"
    : "border border-yellow-500/20 bg-yellow-500/10 text-yellow-400";

  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${warna}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          selesai ? "bg-[#C9A96E]" : "bg-yellow-400"
        }`}
      />
      {selesai ? "Selesai" : "Pending"}
    </span>
  );
}

function OrdersTable({ orders, onToggleStatus, onDelete }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] shadow-lg">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[#C9A96E]/20 bg-[#252525]">
            <tr>
              <th className="whitespace-nowrap px-5 py-4 font-semibold text-[#C9A96E]">
                Pelanggan
              </th>

              <th className="whitespace-nowrap px-5 py-4 font-semibold text-[#C9A96E]">
                Jumlah
              </th>

              <th className="whitespace-nowrap px-5 py-4 font-semibold text-[#C9A96E]">
                Status
              </th>

              <th className="whitespace-nowrap px-5 py-4 font-semibold text-[#C9A96E]">
                Tanggal
              </th>

              <th className="whitespace-nowrap px-5 py-4 font-semibold text-[#C9A96E]">
                Aksi
              </th>
            </tr>
          </thead>

          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-5 py-14 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl text-[#C9A96E]/40">
                      —
                    </span>

                    <p className="font-medium text-[#D8CEBD]">
                      Belum ada pesanan
                    </p>

                    <p className="text-xs text-[#8C8170]">
                      Data pesanan akan muncul di sini.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-[#C9A96E]/10 transition duration-200 hover:bg-[#292929] last:border-0"
                >
                  <td className="max-w-[220px] break-words px-5 py-4 font-medium text-[#F5F1E8]">
                    {order.customer_name}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#D9BB83]">
                    {formatRupiah(order.amount)}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge status={order.status} />
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-[#B5AA98]">
                    {formatTanggal(order.created_at)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(order)}
                        className="whitespace-nowrap rounded-lg border border-[#C9A96E]/30 bg-[#C9A96E]/10 px-3 py-2 text-xs font-semibold text-[#D9BB83] transition hover:bg-[#C9A96E] hover:text-[#111111]"
                      >
                        {order.status === "selesai"
                          ? "Jadikan pending"
                          : "Jadikan selesai"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(order)}
                        className="whitespace-nowrap rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:border-red-500/40 hover:bg-red-500/20"
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

      {orders.length > 0 && (
        <div className="border-t border-[#C9A96E]/15 bg-[#1B1B1B] px-5 py-3">
          <p className="text-xs text-[#8C8170]">
            Menampilkan {orders.length} pesanan
          </p>
        </div>
      )}
    </div>
  );
}

export default OrdersTable;
