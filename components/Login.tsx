
import React, { useState } from 'react';
import { ShieldCheck, User, Lock, ArrowRight, ShieldAlert } from 'lucide-react';
import { Usuario } from '../types';

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
    const matched = usuarios.find(u => u.login.toLowerCase() === login.toLowerCase() && u.senha === senha);
    if (matched) onLogin(matched);
    else setError('Credenciais inválidas para o sistema SFK.');
  };

  return (
    <div className="min-h-screen bg-[#1e1b4b] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="p-10">
          <h2 className="text-3xl font-black text-indigo-950 text-center mb-1 tracking-tight mt-10">Gestão SFK</h2>
          <p className="text-slate-400 text-center mb-10 font-bold uppercase text-[10px] tracking-widest">Controle Profissional de Unidades</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input type="text" value={login} onChange={(e) => setLogin(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all outline-none font-bold" placeholder="Seu usuário" required />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 transition-all outline-none font-bold" placeholder="Sua senha" required />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-4 rounded-2xl animate-bounce">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <p className="text-xs font-black uppercase">{error}</p>
              </div>
            )}

            <button type="submit" className="w-full bg-indigo-950 text-white font-black py-5 rounded-2xl hover:bg-indigo-900 shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
              ENTRAR NO PAINEL <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
