import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-slate-900">
      <h1 className="text-3xl font-bold text-white">Halaman Dashboard</h1>
      <p className="text-slate-300">
        {loading
          ? "Memeriksa sesi..."
          : user
          ? `Login sebagai ${user.email}`
          : "Belum login"}
      </p>
    </div>
  );
}

export default Dashboard;