
import { NavLink } from "react-router-dom";

const menu = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/products", label: "Produk" },
  { to: "/customers", label: "Pelanggan" },
];

function Sidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-slate-800 bg-slate-950 md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="px-5 py-4 text-xl font-bold text-white md:px-6 md:py-5">
        MasMuns
      </div>

      <nav className="flex gap-2 overflow-x-auto px-3 pb-3 md:flex-col md:gap-1 md:pb-0">
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
