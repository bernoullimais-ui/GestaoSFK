
import React, { useMemo, useState } from 'react';
import { 
    Users, 
    GraduationCap, 
    ClipboardCheck, 
    UserPlus, 
    AlertTriangle, 
    ArrowRight, 
    ShieldCheck,
    UserX,
    MessageCircle,
    Zap,
    Send,
    Loader2,
    X,
    Target
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
  onUpdateExperimental?: (updated: AulaExperimental) => Promise<void>;
  acoesRetencao?: AcaoRetencao[];
  onNavigate?: (view: ViewType) => void;
  isLoading?: boolean;
  whatsappConfig?: { url: string; token: string; };
  msgTemplateExperimental?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  alunosCount, 
  turmasCount, 
  turmas = [],
  presencas, 
  alunos = [],
  matriculas = [],
  experimentais = [],
  onUpdateExperimental,
  acoesRetencao = [],
  onNavigate,
  isLoading = false,
  whatsappConfig,
  msgTemplateExperimental = "Olá *{{responsavel}}*, como foi a aula de *{{estudante}}* hoje na SFK?"
}) => {
  const [isSending, setIsSending] = useState(false);
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; exp: AulaExperimental | null; message: string; }>({ isOpen: false, exp: null, message: '' });

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
      const ultimas3 = sorted.slice(0, 3);
      const tresFaltas = ultimas3.length >= 3 && ultimas3.every(p => p.status === 'Ausente');
      const ultimas9 = sorted.slice(0, 9);
      let taxaAlta = false;
      if (ultimas9.length >= 9) {
        const faltasCount = ultimas9.filter(p => p.status === 'Ausente').length;
        if ((faltasCount / 9) >= 0.5) taxaAlta = true;
      }
      if (tresFaltas || taxaAlta) {
        const alertaId = `risk|${key}|${sorted[0].data}`;
        if (!acoesRetencao?.some(a => a.alertaId === alertaId)) count++;
      }
    }
    return count;
  }, [isGestor, presencas, acoesRetencao]);

  const conversionAlerts = useMemo(() => {
    if (!isGestor) return [];
    // Alerta de conversão: Aluno Presente em experimental, Follow-up não enviado, e não convertido ainda.
    return experimentais.filter(exp => 
        exp.status === 'Presente' && 
        !exp.followUpSent && 
        !exp.convertido
    ).sort((a, b) => (a.aula || '').localeCompare(b.aula || ''));
  }, [isGestor, experimentais]);

  const openConversionModal = (exp: AulaExperimental) => {
    const responsavelFull = exp.responsavel1 || exp.estudante || '';
    const primeiroNomeResponsavel = responsavelFull.trim().split(' ')[0] || '';
    const estudantePrimeiroNome = (exp.estudante || '').trim().split(' ')[0] || '';
    
    let msg = msgTemplateExperimental
      .replace(/{{responsavel}}/g, primeiroNomeResponsavel)
      .replace(/{{estudante}}/g, estudantePrimeiroNome)
      .replace(/{{unidade}}/g, exp.unidade || '')
      .replace(/{{curso}}/g, exp.curso || '');
    
    setMessageModal({ isOpen: true, exp, message: msg });
  };

  const handleSendFeedback = async () => {
    if (!messageModal.exp || !onUpdateExperimental) return;
    setIsSending(true);
    const fone = (messageModal.exp.whatsapp1 || '').replace(/\D/g, '');
    
    try {
      if (whatsappConfig?.url && fone) {
        await fetch(whatsappConfig.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': whatsappConfig.token || '' },
          body: JSON.stringify({ "data.contact.Phone[0]": `55${fone}`, "message": messageModal.message })
        });
      } else if (fone) {
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(messageModal.message)}`, '_blank');
      }

      await onUpdateExperimental({
        ...messageModal.exp,
        followUpSent: true
      });

      setMessageModal({ ...messageModal, isOpen: false });
    } catch (e) { 
        console.error(e);
        alert("Erro ao disparar feedback."); 
    } finally { 
        setIsSending(false); 
    }
  };

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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isGestor && churnPending > 0 && (
            <div className="bg-red-50 border-2 border-red-100 rounded-[32px] p-8 flex flex-col items-center justify-between shadow-xl shadow-red-900/5 animate-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-6 mb-6 w-full">
                 <div className="w-16 h-16 bg-red-500 text-white rounded-2xl flex items-center justify-center shrink-0">
                   <AlertTriangle className="w-8 h-8" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-red-900">Alerta de Evasão</h3>
                   <p className="text-red-700 text-sm font-bold uppercase">{churnPending} Estudantes com risco de churn.</p>
                 </div>
               </div>
               <button 
                onClick={() => onNavigate && onNavigate('churn-risk')} 
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-lg active:scale-95"
               >
                GERENCIAR RETENÇÃO <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          )}

          {isGestor && conversionAlerts.length > 0 && (
            <div className="bg-purple-50 border-2 border-purple-100 rounded-[32px] p-8 flex flex-col items-center justify-between shadow-xl shadow-purple-900/5 animate-in slide-in-from-top-4 duration-500">
               <div className="flex items-center gap-6 mb-6 w-full">
                 <div className="w-16 h-16 bg-purple-600 text-white rounded-2xl flex items-center justify-center shrink-0">
                   <Target className="w-8 h-8" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-purple-900">Alerta de Conversão</h3>
                   <p className="text-purple-700 text-sm font-bold uppercase">{conversionAlerts.length} Leads aguardando feedback.</p>
                 </div>
               </div>
               <div className="w-full space-y-2 max-h-[120px] overflow-y-auto mb-4 px-2">
                    {conversionAlerts.slice(0, 3).map(exp => (
                        <div key={exp.id} className="bg-white/50 p-3 rounded-xl border border-purple-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 truncate">{exp.estudante}</span>
                            <button 
                                onClick={() => openConversionModal(exp)}
                                className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {conversionAlerts.length > 3 && <p className="text-center text-[10px] font-bold text-purple-400">E MAIS {conversionAlerts.length - 3} LEADS...</p>}
               </div>
            </div>
          )}
      </div>

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

      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-950 text-white rounded-2xl">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black">Feedback Experimental</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{messageModal.exp?.estudante}</p>
              </div>
            </div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Mensagem de Conversão</label>
            <textarea 
              value={messageModal.message} 
              onChange={(e) => setMessageModal({...messageModal, message: e.target.value})} 
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] h-40 mb-6 font-medium text-sm outline-none focus:border-indigo-500 transition-all resize-none shadow-inner" 
            />
            <button 
              onClick={handleSendFeedback} 
              disabled={isSending} 
              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all hover:bg-emerald-700"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />} 
              {isSending ? 'DISPARANDO...' : 'CONFIRMAR E ENVIAR'}
            </button>
            <button onClick={() => setMessageModal({...messageModal, isOpen: false})} className="w-full mt-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
);

export default Dashboard;
