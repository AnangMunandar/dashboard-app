import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

function Navbar() {
  const { user } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
      <h1 className="text-lg font-semibold text-white">Dashboard</h1>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-300">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="rounded bg-red-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;