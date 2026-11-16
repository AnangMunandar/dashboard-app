function OrderFilters({ search, onSearch, status, onStatus }) {
  const inputClass =
    "rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none";

  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row">
      <input
        type="text"
        placeholder="Cari nama pelanggan..."
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className={`${inputClass} sm:w-72`}
      />
      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className={inputClass}
      >
        <option value="semua">Semua status</option>
        <option value="pending">pending</option>
        <option value="selesai">selesai</option>
      </select>
    </div>
  );
}

export default OrderFilters;