import DashboardLayout from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-white">Selamat datang</h2>
      <p className="mt-1 text-slate-300">Login sebagai {user?.email}</p>
    </DashboardLayout>
  );
}

export default Dashboard;