
function StatCard({ title, value, note }) {
  return (
    <div className="group relative min-w-0 overflow-hidden rounded-xl border border-[#C9A96E]/20 bg-[#202020] p-4 shadow-lg transition duration-300 hover:border-[#C9A96E]/50 hover:bg-[#252525] sm:p-5">
      {/* Gold Accent */}
      <div className="absolute left-0 top-0 h-full w-1 bg-[#C9A96E]/70 transition duration-300 group-hover:bg-[#C9A96E]" />

      <div className="min-w-0 pl-2">
        <p className="break-words text-sm font-medium tracking-wide text-[#B5AA98]">
          {title}
        </p>

        <p className="mt-3 break-words text-2xl font-bold tracking-tight text-[#F5F1E8] sm:text-3xl">
          {value}
        </p>

        <p className="mt-2 break-words text-xs text-[#8C8170]">
          {note}
        </p>
      </div>

      {/* Decorative Accent */}
      <div className="pointer-events-none absolute -bottom-8 -right-8 h-24 w-24 rounded-full border border-[#C9A96E]/10" />
    </div>
  );
}

export default StatCard;
