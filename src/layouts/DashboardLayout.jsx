
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[#111111] text-[#F5F1E8] md:flex-row">
      <Sidebar />

      <div className="flex min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden bg-[#111111]">
        <Navbar />

        <main className="min-w-0 w-full max-w-full flex-1 overflow-x-hidden p-4 sm:p-5 md:p-7 lg:p-8">
          <div className="mx-auto w-full min-w-0 max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
