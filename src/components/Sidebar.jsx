
import { NavLink } from "react-router-dom";

const menu = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/products", label: "Produk" },
  { to: "/customers", label: "Pelanggan" },
];

function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-slate-950 md:block">
      <div className="px-6 py-5 text-xl font-bold text-white">
        Business Dashboard
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {menu.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded px-3 py-2 text-sm font-medium ${
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
