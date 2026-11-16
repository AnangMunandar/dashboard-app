import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

function Dashboard() {
  const { user } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-900">
      <h1 className="text-3xl font-bold text-white">Halaman Dashboard</h1>
      <p className="text-slate-300">Login sebagai {user?.email}</p>
      <button
        onClick={handleLogout}
        className="rounded bg-red-500 px-4 py-2 font-semibold text-white hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}

export default Dashboard;