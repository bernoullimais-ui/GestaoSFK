import React, { useMemo, useState } from 'react';
import { 
    Users, 
    GraduationCap, 
    ClipboardCheck, 
    UserPlus, 
    AlertTriangle, 
    ArrowRight, 
    Activity,
    MessageCircle,
    Zap,
    Loader2,
    CheckCircle2,
    Calendar,
    MapPin,
    MessageSquareText,
    BookOpen,
    RefreshCw,
    FileSpreadsheet,
    ShieldAlert,
    UserCheck,
    Contact2,
    UserX,
    ChevronRight,
    AlertCircle,
    XCircle,
    RotateCcw
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
  whatsappConfig?: {
    url: string;
    token: string;
  };
  msgTemplate?: string;
  msgReagendarTemplate?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
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
  msgTemplate = "Olá *{{responsavel}}*, como foi a aula experimental de *{{estudante}}* hoje na SFK?",
  msgReagendarTemplate = "Olá *{{responsavel}}*, notamos que *{{estudante}}* não pôde comparecer à aula de *{{curso}}*. Vamos reagendar?"
}) => {
  const [isSending, setIsSending] = useState(false);
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; exp: AulaExperimental | null; message: string }>({ isOpen: false, exp: null, message: '' });

  const isMaster = user.nivel === 'Gestor Master' || user.nivel === 'Start';
  const isProfessor = user.nivel === 'Professor' || user.nivel === 'Estagiário';
  
  const normalize = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();
  const professorName = normalize(user.nome || user.login);
  const slugify = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const churnAlerts = useMemo(() => {
    if (!isMaster) return [];
    
    const groups: Record<string, { presencas: Presenca[], alunoName: string, unidade: string, curso: string }> = {};
    
    presencas.forEach(p => {
      const alunoName = (p as any)._estudantePlanilha || p.alunoId;
      const cursoName = (p as any)._turmaPlanilha || p.turmaId;
      const key = `${slugify(alunoName)}|${slugify(p.unidade)}|${slugify(cursoName)}`;
      
      if (!groups[key]) {
        groups[key] = { presencas: [], alunoName: alunoName, unidade: p.unidade, curso: cursoName };
      }
      groups[key].presencas.push(p);
    });

    const alertas = [];
    for (const key in groups) {
      const group = groups[key];
      const sortedPresencas = [...group.presencas].sort((a, b) => b.data.localeCompare(a.data));
      
      const ultimas3 = sortedPresencas.slice(0, 3);
      const tresFaltas = ultimas3.length >= 3 && ultimas3.every(p => slugify(p.status) === 'ausente');
      
      const ultimas9 = sortedPresencas.slice(0, 9);
      let taxaCalculada = 0;
      if (ultimas9.length >= 9) {
        taxaCalculada = Math.round((ultimas9.filter(p => slugify(p.status) === 'ausente').length / 9) * 100);
      }

      if (tresFaltas || (ultimas9.length >= 9 && taxaCalculada >= 50)) {
        const lastPresence = sortedPresencas[0];
        const alertaId = `risk|${key}|${lastPresence.data}`;
        
        // Verifica se já foi tratado localmente nesta sessão ou se já consta como "Enviado" na planilha (Coluna G)
        const jaTratadoLocal = acoesRetencao.some(a => a.alertaId === alertaId);
        const jaEnviadoNaPlanilha = slugify(lastPresence.alarme) === 'enviado';
        
        if (!jaTratadoLocal && !jaEnviadoNaPlanilha) {
          alertas.push({
            id: alertaId,
            alunoName: group.alunoName,
            unidade: group.unidade,
            curso: group.curso,
            isCritico: tresFaltas,
            taxa: taxaCalculada
          });
        }
      }
    }
    return alertas.sort((a, b) => (a.isCritico === b.isCritico ? 0 : a.isCritico ? -1 : 1));
  }, [presencas, acoesRetencao, isMaster]);

  const statsData = useMemo(() => {
    let scopeTurmas: Turma[] = [];
    let scopeMatriculas: Matricula[] = [];
    let scopeAlunosIds = new Set<string>();
    let scopeAlunosAtivosIds = new Set<string>();

    if (isMaster) {
      scopeTurmas = [...turmas];
    } else if (isProfessor) {
      scopeTurmas = turmas.filter(t => {
        const prof = normalize(t.professor).replace(/^prof\.?\s*/i, '');
        return prof.includes(professorName) || professorName.includes(prof);
      });
    } else {
      const userUnits = normalize(user.unidade).split(',').map(u => u.trim());
      scopeTurmas = turmas.filter(t => userUnits.some(u => normalize(t.unidade).includes(u) || u.includes(normalize(t.unidade))));
    }

    scopeTurmas.forEach(t => {
      const tId = normalize(t.id);
      const tNome = normalize(t.nome);
      const tUnidade = normalize(t.unidade);

      const matsDaTurma = matriculas.filter(m => {
        const mTurmaId = normalize(m.turmaId);
        const mUnidade = normalize(m.unidade);
        return mUnidade === tUnidade && (mTurmaId === tId || mTurmaId.includes(tNome) || tNome.includes(mTurmaId));
      });

      matsDaTurma.forEach(m => {
        scopeMatriculas.push(m);
        scopeAlunosAtivosIds.add(m.alunoId);
        scopeAlunosIds.add(m.alunoId);
      });

      if (isProfessor || !isMaster) {
        alunos.forEach(a => {
          if (scopeAlunosAtivosIds.has(a.id)) return;
          const pertenceHistorico = (a.cursosCanceladosDetalhes || []).some(c => 
            normalize(c.unidade) === tUnidade && 
            (normalize(c.nome) === tNome || normalize(c.nome).includes(tNome) || tNome.includes(normalize(c.nome)))
          );
          if (pertenceHistorico) {
            scopeAlunosIds.add(a.id);
          }
        });
      }
    });

    if (isMaster) {
      scopeAlunosIds = new Set(alunos.map(a => a.id));
      scopeAlunosAtivosIds = new Set(alunos.filter(a => a.statusMatricula === 'Ativo').map(a => a.id));
      scopeMatriculas = [...matriculas];
    }

    const totalCadastrados = scopeAlunosIds.size;
    const totalAlunosAtivos = scopeAlunosAtivosIds.size;
    const totalMatriculasAtivas = scopeMatriculas.length;
    
    const activeScopeTurmas = scopeTurmas.filter(t => {
        const tId = normalize(t.id);
        const tNome = normalize(t.nome);
        const tUnidade = normalize(t.unidade);
        return matriculas.some(m => 
            normalize(m.unidade) === tUnidade && 
            (normalize(m.turmaId) === tId || normalize(m.turmaId).includes(tNome) || tNome.includes(normalize(m.turmaId)))
        );
    });

    const turmasAtivasCount = activeScopeTurmas.length;

    let totalCapacidadeAtiva = 0;
    activeScopeTurmas.forEach(t => {
      totalCapacidadeAtiva += (Number(t.capacidade) || 20);
    });
    
    const ocupacaoMedia = totalCapacidadeAtiva > 0 ? Math.round((totalMatriculasAtivas / totalCapacidadeAtiva) * 100) : 0;

    return { 
      totalCadastrados, 
      alunosAtivos: totalAlunosAtivos, 
      matriculasAtivas: totalMatriculasAtivas, 
      totalTurmasAtivas: turmasAtivasCount, 
      ocupacaoMedia 
    };
  }, [isMaster, isProfessor, turmas, matriculas, alunos, professorName, user.unidade]);

  const stats = [
    { label: 'Alunos Cadastrados', value: statsData.totalCadastrados, icon: Contact2, color: 'bg-slate-700' },
    { label: 'Alunos Ativos', value: statsData.alunosAtivos, icon: Users, color: 'bg-blue-600' },
    { label: 'Matrículas Ativas', value: statsData.matriculasAtivas, icon: ClipboardCheck, color: 'bg-emerald-600' },
    { label: 'Turmas Ativas', value: statsData.totalTurmasAtivas, icon: GraduationCap, color: 'bg-purple-600' },
    { label: 'Ocupação Média', value: `${statsData.ocupacaoMedia}%`, icon: Activity, color: 'bg-indigo-600' },
  ];

  const divergenciasConversao = useMemo(() => {
    if (!isMaster) return [];
    return experimentais.filter(exp => exp.convertido && !(exp as any).convertidoNaPlanilha);
  }, [experimentais, isMaster]);

  const leadsParaConversao = useMemo(() => {
    if (!isMaster) return [];
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    return experimentais.filter(exp => {
      if (!exp.aula) return false;
      const dataAula = new Date(exp.aula);
      dataAula.setHours(12, 0, 0, 0); 
      
      const isPresentePendente = exp.status === 'Presente' && !exp.convertido && dataAula <= hoje && !exp.followUpSent;
      const isAusenteReagendar = exp.status === 'Ausente' && !exp.convertido && dataAula <= hoje && !exp.reagendarEnviado;
      
      return isPresentePendente || isAusenteReagendar;
    }).sort((a, b) => new Date(a.aula).getTime() - new Date(b.aula).getTime());
  }, [experimentais, isMaster]);

  const openComposeModal = (exp: AulaExperimental) => {
    const responsavelFull = exp.responsavel1 || exp.estudante || '';
    const pNomeResp = responsavelFull.trim().split(' ')[0] || '';
    const pNomeEst = (exp.estudante || '').trim().split(' ')[0] || '';
    const unidade = exp.unidade || '';
    const curso = exp.curso || '';
    
    let dataAulaFormatada = "";
    if (exp.aula) {
      const parts = String(exp.aula).split(' ')[0].split('-');
      if (parts.length === 3) {
        dataAulaFormatada = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } else {
        dataAulaFormatada = exp.aula;
      }
    }
    
    const template = exp.status === 'Ausente' ? msgReagendarTemplate : msgTemplate;
    let msg = template || '';

    const replacements = [
      { tags: [/{{responsavel}}/gi, /{{RESPONSAVEL}}/gi], value: pNomeResp },
      { tags: [/{{estudante}}/gi, /{{ALUNO}}/gi, /{{aluno}}/gi], value: pNomeEst },
      { tags: [/{{unidade}}/gi, /{{UNIDADE}}/gi], value: unidade },
      { tags: [/{{curso}}/gi, /{{CURSO}}/gi], value: curso },
      { tags: [/{{data}}/gi, /{{DATA}}/gi], value: dataAulaFormatada }
    ];

    replacements.forEach(rep => {
      rep.tags.forEach(tag => {
        msg = msg.replace(tag, rep.value);
      });
    });

    setMessageModal({ isOpen: true, exp, message: msg });
  };

  const handleSendMessage = async () => {
    if (!messageModal.exp) return;
    setIsSending(true);
    const fone = (messageModal.exp.whatsapp1 || '').replace(/\D/g, '');
    try {
      if (whatsappConfig?.url && fone) {
        await fetch(whatsappConfig.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ "data.contact.Phone[0]": `55${fone}`, "message": messageModal.message })
        });
      } else if (fone) {
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(messageModal.message)}`, '_blank');
      }
      
      if (onUpdateExperimental) {
          if (messageModal.exp.status === 'Ausente') {
              // MARCA COMO REAGENDADA CONFORME SOLICITAÇÃO
              await onUpdateExperimental({ ...messageModal.exp, reagendarEnviado: true, status: 'Reagendada' });
          } else {
              await onUpdateExperimental({ ...messageModal.exp, followUpSent: true });
          }
      }
      setMessageModal({ ...messageModal, isOpen: false });
    } finally { setIsSending(false); }
  };

  const formatDatePT = (iso: string) => {
    if (!iso) return "";
    const parts = iso.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Painel de Gestão</h2>
          <p className="text-slate-500 font-medium">Análise em tempo real para <span className="text-indigo-600 font-black uppercase">{isMaster ? 'GESTÃO GLOBAL SFK' : user.unidade}</span></p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-xl transition-all">
            <div className="flex items-center gap-5">
              <div className={`${stat.color} p-4 rounded-2xl text-white shadow-lg shadow-current/20`}><stat.icon className="w-6 h-6" /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isMaster && (
        <>
          {divergenciasConversao.length > 0 && (
            <div className="bg-amber-50 p-10 rounded-[40px] shadow-sm border-2 border-amber-200 animate-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><FileSpreadsheet className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight">Sincronização de Conversões</h3>
                        <p className="text-amber-700 text-[10px] font-black uppercase tracking-widest leading-none mt-1">Alunos ativos na base com status Pendente no funil</p>
                    </div>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {divergenciasConversao.map(div => (
                    <div key={div.id} className="bg-white/60 p-4 rounded-2xl border border-amber-200 flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center font-black text-amber-600 text-sm shadow-sm shrink-0">{div.estudante.charAt(0)}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-amber-900 uppercase truncate leading-none mb-1">{div.estudante}</p>
                        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{div.unidade}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {leadsParaConversao.length > 0 && (
            <div className="bg-white p-10 rounded-[40px] shadow-sm border-2 border-indigo-100 animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Zap className="w-6 h-6 fill-current" /></div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Alerta de Conversão de Leads</h3>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mt-1">Aulas Realizadas aguardando contato</p>
                    </div>
                  </div>
                  <span className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black border border-indigo-100 uppercase">{leadsParaConversao.length} Ações</span>
              </div>
              <div className="flex flex-col gap-4">
                  {leadsParaConversao.map(lead => (
                    <div key={lead.id} className={`bg-slate-50 p-6 rounded-[32px] border ${lead.status === 'Ausente' ? 'border-amber-100' : 'border-slate-100'} group hover:border-indigo-200 transition-all flex flex-col md:flex-row md:items-center gap-6`}>
                      <div className="flex items-center gap-4 flex-1">
                          <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black ${lead.status === 'Ausente' ? 'text-amber-600' : 'text-indigo-600'} text-xl shadow-sm shrink-0`}>{lead.estudante.charAt(0)}</div>
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-800 uppercase truncate leading-none mb-2">{lead.estudante}</h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" /><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{lead.unidade}</span></div>
                                <div className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-indigo-500" /><span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{lead.curso}</span></div>
                                <div className="flex items-center gap-2 text-indigo-500"><Calendar className="w-3.5 h-3.5" /><span className="text-[10px] font-black uppercase tracking-widest">{formatDatePT(lead.aula)}</span></div>
                                
                                {lead.status === 'Presente' ? (
                                    <div className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 className="w-3.5 h-3.5" /><span className="text-[10px] font-black uppercase">Presente</span></div>
                                ) : (
                                    <div className="flex items-center gap-1.5 text-amber-600"><XCircle className="w-3.5 h-3.5" /><span className="text-[10px] font-black uppercase">Ausente (Propor Reagendamento)</span></div>
                                )}

                                {lead.observacaoProfessor && (
                                  <div className="flex items-center gap-1.5 text-slate-600 italic">
                                    <MessageSquareText className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-[9px] font-bold uppercase truncate max-w-[200px]" title={lead.observacaoProfessor}>{lead.observacaoProfessor}</span>
                                  </div>
                                )}
                            </div>
                          </div>
                      </div>
                      <button onClick={() => openComposeModal(lead)} className={`bg-white ${lead.status === 'Ausente' ? 'text-amber-600 border-amber-100 hover:bg-amber-600 hover:border-amber-600' : 'text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:border-indigo-600'} border-2 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:text-white transition-all active:scale-95 shadow-sm`}>
                          {lead.status === 'Ausente' ? <RotateCcw className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />} 
                          {lead.status === 'Ausente' ? 'REAGENDAR WHATSAPP' : 'ENVIAR WHATSAPP'}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-[#1e1b4b] p-10 rounded-[40px] text-white shadow-2xl overflow-hidden relative group h-full flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Activity className="w-40 h-40" /></div>
              <div>
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">BI & Relatórios</h3>
                <p className="text-indigo-200 text-sm mb-8 leading-relaxed">Acompanhe faturamento, taxas de conversão e fluxo de matriculas em tempo real.</p>
              </div>
              <button onClick={() => onNavigate && onNavigate('relatorios')} className="bg-white text-indigo-950 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-50 transition-all w-fit">ABRIR RELATÓRIOS <ArrowRight className="w-4 h-4" /></button>
            </div>
            
            <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center shadow-sm"><AlertTriangle className="w-8 h-8" /></div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Alertas de Churn</h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none mt-1">Gatilhos de Evasão Pendentes</p>
                  </div>
                </div>

                <div className="space-y-3 mb-10 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                  {churnAlerts.length > 0 ? (
                    churnAlerts.slice(0, 5).map((alerta) => (
                      <div key={alerta.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-red-200 transition-all">
                         <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${alerta.isCritico ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                               {alerta.alunoName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                               <p className="text-[11px] font-black text-slate-800 uppercase truncate leading-none mb-1">{alerta.alunoName}</p>
                               <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{alerta.unidade} • {alerta.curso}</p>
                            </div>
                         </div>
                         <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${alerta.isCritico ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                            {alerta.isCritico ? 'Crítico' : 'Freq. Baixa'}
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed flex flex-col items-center gap-3">
                       <ShieldAlert className="w-8 h-8 text-slate-200" />
                       <p className="text-[10px] font-black text-slate-400 uppercase">Nenhum alerta pendente</p>
                    </div>
                  )}
                  {churnAlerts.length > 5 && (
                    <p className="text-center text-[9px] font-black text-slate-400 uppercase pt-2">E mais {churnAlerts.length - 5} alertas...</p>
                  )}
                </div>
              </div>
              
              <button onClick={() => onNavigate && onNavigate('churn-risk')} className="w-full bg-[#0f172a] text-white py-5 rounded-3xl font-black text-xs flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]">
                GESTÃO DE RETENÇÃO <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black tracking-tight mb-8">
                {messageModal.exp?.status === 'Ausente' ? 'Propor Reagendamento' : 'Mensagem Lead'}
            </h3>
            <textarea value={messageModal.message} onChange={(e) => setMessageModal({...messageModal, message: e.target.value})} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] h-48 mb-8 font-medium text-sm outline-none focus:border-indigo-500 transition-all resize-none shadow-inner" />
            <button onClick={handleSendMessage} disabled={isSending} className={`w-full ${messageModal.exp?.status === 'Ausente' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white py-6 rounded-3xl font-black text-sm flex items-center justify-center gap-4 transition-all active:scale-[0.98]`}>
              {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current" />} 
              {isSending ? 'ENVIANDO...' : 'ENVIAR AGORA'}
            </button>
            <button onClick={() => setMessageModal({...messageModal, isOpen: false})} className="w-full mt-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;