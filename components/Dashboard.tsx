
import React, { useMemo } from 'react';
import { 
    Users, 
    GraduationCap, 
    ClipboardCheck, 
    UserPlus, 
    AlertTriangle, 
    ArrowRight, 
    ShieldCheck,
    UserX
} from 'lucide-react';
import { Presenca, Usuario, Aluno, Matricula, Turma, ViewType, AulaExperimental, AcaoRetencao } from '../types';

interface DashboardProps {
  user: Usuario;
  alunosCount: number;
  turmasCount: number;
  turmas?: Turma[];
  presencas: Presenca[];
  alunos?: Aluno[];
  matriculas?: Matricula[];
  experimentais?: AulaExperimental[];
  acoesRetencao?: AcaoRetencao[];
  onNavigate?: (view: ViewType) => void;
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  alunosCount, 
  turmasCount, 
  turmas = [],
  presencas, 
  alunos = [],
  matriculas = [],
  acoesRetencao = [],
  onNavigate,
  isLoading = false
}) => {
  const isGestor = user.nivel === 'Gestor' || user.nivel === 'Gestor Master';
  const slugify = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const churnPending = useMemo(() => {
    if (!isGestor || presencas.length === 0) return 0;
    
    const groups: Record<string, Presenca[]> = {};

    presencas.forEach(p => {
      const alunoName = (p as any)._estudantePlanilha || p.alunoId;
      const cursoName = (p as any)._turmaPlanilha || p.turmaId;
      const unidadeName = p.unidade;
      const key = `${slugify(alunoName)}|${slugify(unidadeName)}|${slugify(cursoName)}`;

      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    let count = 0;

    for (const key in groups) {
      const sorted = [...groups[key]].sort((a, b) => b.data.localeCompare(a.data));
      
      // Gatilho 1: 3 Faltas Consecutivas
      const ultimas3 = sorted.slice(0, 3);
      const tresFaltas = ultimas3.length >= 3 && ultimas3.every(p => p.status === 'Ausente');
      
      // Gatilho 2: Taxa >= 50% nos últimos 9 registros (Requer pelo menos 9 registros)
      const ultimas9 = sorted.slice(0, 9);
      let taxaAlta = false;
      if (ultimas9.length >= 9) {
        const faltasCount = ultimas9.filter(p => p.status === 'Ausente').length;
        if ((faltasCount / 9) >= 0.5) {
          taxaAlta = true;
        }
      }

      if (tresFaltas || taxaAlta) {
        const alertaId = `risk|${key}|${sorted[0].data}`;
        if (!acoesRetencao?.some(a => a.alertaId === alertaId)) {
          count++;
        }
      }
    }
    return count;
  }, [isGestor, presencas, acoesRetencao]);

  const stats = [
    { label: 'Alunos Cadastrados', value: alunos.length, icon: UserPlus, color: 'bg-slate-700' },
    { label: 'Alunos Ativos', value: alunos.filter(a => a.statusMatricula === 'Ativo').length, icon: Users, color: 'bg-blue-600' },
    { label: 'Matrículas Ativas', value: matriculas.length, icon: ClipboardCheck, color: 'bg-emerald-600' },
    { label: 'Turmas Ativas', value: turmasCount, icon: GraduationCap, color: 'bg-purple-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painel de Controle</h2>
          <p className="text-slate-500 font-medium">Unidade de Acesso: <span className="text-indigo-600">{user.unidade}</span></p>
        </div>
        {isLoading && <div className="flex items-center gap-2 text-indigo-500 text-xs font-black uppercase animate-pulse"><RefreshCw className="w-4 h-4 animate-spin" /> Atualizando...</div>}
      </div>

      {isGestor && churnPending > 0 && (
        <div className="bg-red-50 border-2 border-red-100 rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between shadow-xl shadow-red-900/5 animate-in slide-in-from-top-4 duration-500">
           <div className="flex items-center gap-6 mb-6 md:mb-0">
             <div className="w-20 h-20 bg-red-500 text-white rounded-3xl flex items-center justify-center shadow-lg shadow-red-500/20">
               <AlertTriangle className="w-10 h-10" />
             </div>
             <div>
               <h3 className="text-2xl font-black text-red-900">Alerta de Evasão</h3>
               <p className="text-red-700 font-bold uppercase tracking-tight">{churnPending} {churnPending === 1 ? 'estudante exige' : 'estudantes exigem'} atenção imediata na retenção.</p>
             </div>
           </div>
           <button 
            onClick={() => onNavigate && onNavigate('churn-risk')} 
            className="w-full md:w-auto bg-red-600 text-white px-10 py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95"
           >
            GERENCIAR RETENÇÃO <ArrowRight className="w-5 h-5" />
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-5">
              <div className={`${stat.color} p-4 rounded-2xl text-white shadow-lg shadow-current/10`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-10">
         <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[32px] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-12 h-12" />
         </div>
         <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl font-black text-slate-800">Sistema Sincronizado</h3>
            <p className="text-slate-500 font-medium text-lg leading-relaxed mt-2">
              Sua gestão está integrada à planilha Google. Frequências e dados de matrículas são atualizados em tempo real conforme as alterações na nuvem.
            </p>
         </div>
         <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Integridade de Dados</span>
            <div className="bg-emerald-500 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-tighter">100% Sincronizado</div>
         </div>
      </div>
    </div>
  );
};

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);

export default Dashboard;

