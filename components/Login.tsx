
import React, { useState } from 'react';
import { Database, Lock, User, ArrowRight, ShieldAlert } from 'lucide-react';
import { Usuario } from '../types';

// Componente de Logo B+ estilizado
const BPlusLogo: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="5" y="80" fontFamily="Arial Black, sans-serif" fontSize="85" fill="#1d3ba3" fontWeight="900">B</text>
    <path d="M60 45 L95 45 M77.5 25 L77.5 65" stroke="#00a396" strokeWidth="12" strokeLinecap="round" />
  </svg>
);

interface LoginProps {
  onLogin: (user: Usuario) => void;
  usuarios: Usuario[];
}

const Login: React.FC<LoginProps> = ({ onLogin, usuarios }) => {
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Procura o usuário na lista sincronizada
    const matchedUser = usuarios.find(u => 
      u.login.toLowerCase() === login.toLowerCase() && 
      u.senha === senha
    );

    if (matchedUser) {
      onLogin({ 
        login: matchedUser.login, 
        nome: matchedUser.nome,
        nivel: matchedUser.nivel 
      });
    } else {
      setError('Credenciais incorretas. Verifique seu login e senha.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-10">
          <div className="flex justify-center mb-10">
            <div className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-100">
              <BPlusLogo className="w-16 h-16" />
            </div>
          </div>
          
          <h2 className="text-3xl font-black text-slate-900 text-center mb-2 tracking-tight">Gestão de Turmas B+</h2>
          <p className="text-slate-400 text-center mb-10 font-bold uppercase text-[10px] tracking-widest">Painel de Autenticação</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider ml-1">Usuário / ID</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  type="text"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 transition-all outline-none font-medium"
                  placeholder="Ex: joao_gestor"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider ml-1">Senha de Acesso</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl animate-in shake duration-300">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <p className="text-xs font-bold leading-tight">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-black py-5 rounded-2xl hover:bg-slate-800 shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              Acessar Sistema
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Cloud Security Integration v2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
