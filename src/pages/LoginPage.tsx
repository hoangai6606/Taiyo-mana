import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Factory, Eye, EyeOff, AlertCircle } from 'lucide-react';

type Tab = 'login' | 'register';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<Tab>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email: '',
    password: '',
    name_vn: '',
    name_jp: '',
    role: 'staff',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (tab === 'login') {
      const { error } = await signIn(form.email, form.password);
      if (error) setError(error.message);
    } else {
      if (!form.name_vn.trim()) {
        setError('Vui lòng nhập tên tiếng Việt');
        setLoading(false);
        return;
      }
      const { error } = await signUp(form.email, form.password, {
        name_vn: form.name_vn,
        name_jp: form.name_jp,
        role: form.role,
      });
      if (error) setError(error.message);
      else setError('Đăng ký thành công! Hãy đăng nhập.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Factory className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">TAIYO NISSHIN VIETNAM</h1>
          <p className="text-slate-400 text-sm mt-1">Hệ thống quản lý sản xuất & kiểm hàng</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex">
            <button
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${tab === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              Đăng nhập
            </button>
            <button
              onClick={() => { setTab('register'); setError(''); }}
              className={`flex-1 py-4 text-sm font-semibold transition-colors ${tab === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${error.includes('thành công') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tên tiếng Việt <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name_vn"
                    value={form.name_vn}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tên tiếng Nhật
                  </label>
                  <input
                    type="text"
                    name="name_jp"
                    value={form.name_jp}
                    onChange={handleChange}
                    placeholder="山田 太郎"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Vai trò
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="staff">Nhân viên (Staff)</option>
                    <option value="leader">Tổ trưởng (Leader)</option>
                    <option value="manager">Quản lý (Manager)</option>
                    <option value="accounting_admin">Kế toán (Accounting Admin)</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {loading ? 'Đang xử lý...' : tab === 'login' ? 'Đăng nhập' : 'Đăng ký'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
