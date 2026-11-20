
function OrderFilters({ search, onSearch, status, onStatus }) {
  const inputClass =
    "w-full min-w-0 rounded-lg border border-[#C9A96E]/25 bg-[#171717] px-4 py-3 text-sm text-[#F5F1E8] outline-none transition placeholder:text-[#817765] focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30 sm:w-auto";

  return (
    <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-sm sm:flex-row sm:items-center">
      {/* PENCARIAN */}
      <div className="relative min-w-0 flex-1">
        <input
          type="text"
          placeholder="Cari nama pelanggan..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className={`${inputClass} sm:w-full`}
        />
      </div>

      {/* FILTER STATUS */}
      <div className="min-w-0 sm:w-52">
        <select
          value={status}
          onChange={(e) => onStatus(e.target.value)}
          className={`${inputClass} cursor-pointer`}
        >
          <option value="semua">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="selesai">Selesai</option>
        </select>
      </div>
    </div>
  );
}

export default OrderFilters;
