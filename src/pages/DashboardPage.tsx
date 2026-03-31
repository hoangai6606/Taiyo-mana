import ChatWidget from '../components/ChatWidget';

export default function DashboardPage() {
  return (
    <div className="p-6 lg:p-8 h-[calc(100vh-120px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
        <p className="text-slate-500 text-sm mt-1">
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="h-[calc(100%-60px)]">
        <ChatWidget
          mode="workspace"
          targetName="Super Admin"
        />
      </div>
    </div>
  );
}
