
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#111111] text-[#F5F1E8] md:flex-row">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col bg-[#111111]">
        <Navbar />

        <main className="min-w-0 flex-1 p-4 sm:p-5 md:p-7 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
