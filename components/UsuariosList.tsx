
import React from 'react';
import { ShieldCheck, User, Key, ShieldAlert, BookOpen, Crown } from 'lucide-react';
import { Usuario } from '../types';

interface UsuariosListProps {
  usuarios: Usuario[];
}

const UsuariosList: React.FC<UsuariosListProps> = ({ usuarios }) => {
  const getNivelStyle = (nivel: string) => {
    switch (nivel) {
      case 'Gestor Master':
        return {
          bg: 'bg-amber-50 text-amber-600',
          label: 'bg-amber-100 text-amber-700',
          border: 'bg-amber-50/50',
          icon: Crown
        };
      case 'Gestor':
        return {
          bg: 'bg-red-50 text-red-600',
          label: 'bg-red-100 text-red-700',
          border: 'bg-red-50/50',
          icon: ShieldCheck
        };
      case 'Regente':
        return {
          bg: 'bg-purple-50 text-purple-600',
          label: 'bg-purple-100 text-purple-700',
          border: 'bg-purple-50/50',
          icon: BookOpen
        };
      default: // Professor
        return {
          bg: 'bg-blue-50 text-blue-600',
          label: 'bg-blue-100 text-blue-700',
          border: 'bg-blue-50/50',
          icon: User
        };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Operadores</h2>
          <p className="text-slate-500">Controle quem pode acessar e lançar frequências no sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usuarios.map((u, idx) => {
          const style = getNivelStyle(u.nivel);
          const Icon = style.icon;
          
          return (
            <div key={idx} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className={`p-4 rounded-2xl ${style.bg}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${style.label}`}>
                    {u.nivel}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-1">{u.nome || u.login}</h3>
                <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-wider">Login ID: {u.login}</p>

                <div className="space-y-3 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-3 text-slate-500">
                    <Key className="w-4 h-4" />
                    <span className="text-xs font-mono">Autenticação via Planilha</span>
                  </div>
                </div>
              </div>
              
              <div className={`p-4 border-t border-slate-50 text-center ${style.border}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Status: Ativo</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-600 p-8 rounded-3xl text-white flex flex-col md:flex-row items-center gap-6 shadow-2xl shadow-blue-500/20">
        <div className="bg-white/20 p-4 rounded-2xl">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div>
          <h4 className="text-xl font-bold mb-1">Como gerenciar esses usuários?</h4>
          <p className="text-blue-100 text-sm leading-relaxed">
            A lista acima é o reflexo da sua aba <strong>"Usuários"</strong> no Google Sheets. 
            Para adicionar, remover ou mudar a senha de alguém, faça a alteração na planilha e depois clique em 
            <strong> "Atualizar Dados"</strong> na barra lateral do app.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UsuariosList;
