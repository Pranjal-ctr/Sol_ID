import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout() {
  return (
    <div className="min-h-screen bg-surface">
      {/* Ambient gradient background effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-brand-600/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[500px] h-[500px] bg-blue-600/[0.03] rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-600/[0.02] rounded-full blur-[180px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(147,51,234,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(147,51,234,0.4) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
      </div>

      <Sidebar />

      {/* Main content area */}
      <main className="ml-[260px] min-h-screen relative z-10">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
