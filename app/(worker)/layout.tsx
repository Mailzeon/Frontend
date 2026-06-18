import { Sidebar } from '@/components/shared/Sidebar';
import { Navbar } from '@/components/shared/Navbar';

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B1120] flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Navbar title="Worker Panel" />
        <main className="flex-1 p-6 animate-fade-in">{children}</main>
      </div>
    </div>
  );
}
