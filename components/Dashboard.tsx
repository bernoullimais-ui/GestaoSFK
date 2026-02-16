
import React, { useMemo, useState } from 'react';
import { 
    Users, 
    CalendarDays, 
    CheckSquare, 
    TrendingUp, 
    GraduationCap, 
    ClipboardCheck, 
    UserPlus, 
    AlertTriangle, 
    ArrowRight, 
    FlaskConical,
    MessageCircle,
    Zap,
    RefreshCw,
    Timer,
    CheckCircle2,
    X,
    Send,
    Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { Presenca, Usuario, Aluno, Matricula, Turma, ViewType, AulaExperimental } from '../types';

interface DashboardProps {
  user: Usuario;
  alunosCount: number;
  turmasCount: number;
  turmas?: Turma[];
  presencas: Presenca[];
  alunosHojeCount?: number;
  alunos?: Aluno[];
  matriculas?: Matricula[];
  experimentais?: AulaExperimental[];
  onNavigate?: (view: ViewType) => void;
  onUpdateExperimental?: (exp: AulaExperimental) => void;
  whatsappConfig?: {
    url: string;
    token: string;
  };
  templateConversao?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  alunosCount, 
  turmasCount, 
  turmas = [],
  presencas, 
  alunosHojeCount = 0,
  alunos = [],
  matriculas = [],
  experimentais = [],
  onNavigate,
  onUpdateExperimental,
  whatsappConfig,
  templateConversao
}) => {
  const isRegente = user.nivel === 'Regente';
  const isProfessor = user.nivel === 'Professor';
  const isGestor = user.nivel === 'Gestor' || user.nivel === 'Gestor Master';
  const isGestorOrEstagiario = user.nivel === 'Gestor' || user.nivel === 'Gestor Master' || user.nivel === 'Estagiário';
  
  const [isSending, setIsSending] = useState(false);
  const [followUpModal, setFollowUpModal] = useState<{
    isOpen: boolean;
    exp: AulaExperimental | null;
    message: string;
  }>({
    isOpen: false,
    exp: null,
    message: ''
  });

  const professorName = (user.nome || user.login).toLowerCase().trim();

  const myTurmas = useMemo(() => {
    if (!isProfessor) return turmas;
    return turmas.filter(t => {
      const tProf = t.professor.toLowerCase().replace('prof.', '').trim();
      return tProf.includes(professorName) || professorName.includes(tProf);
    });
  }, [turmas, isProfessor, professorName]);

  const myTurmasIds = useMemo(() => new Set(myTurmas.map(t => t.id)), [myTurmas]);

  const myMatriculas = useMemo(() => {
    if (!isProfessor) return matriculas;
    return matriculas.filter(m => myTurmasIds.has(m.turmaId));
  }, [matriculas, myTurmasIds, isProfessor]);

  const myAlunosIds = useMemo(() => new Set(myMatriculas.map(m => m.alunoId)), [myMatriculas]);

  const myPresencas = useMemo(() => {
    if (!isProfessor) return presencas;
    return presencas.filter(p => myTurmasIds.has(p.turmaId));
  }, [presencas, myTurmasIds, isProfessor]);

  const statsCalculated = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const currentMonthStr = todayStr.substring(0, 7);

    const presencasHoje = myPresencas.filter(p => p.data === todayStr);
    const totalHoje = presencasHoje.length;
    const presentesHoje = presencasHoje.filter(p => p.status === 'Presente').length;
    const percHoje = totalHoje > 0 ? Math.round((presentesHoje / totalHoje) * 100) : 0;

    const presencasMes = myPresencas.filter(p => p.data.startsWith(currentMonthStr));
    const totalMes = presencasMes.length;
    const presentesMes = presencasMes.filter(p => p.status === 'Presente').length;
    const percMes = totalMes > 0 ? Math.round((presentesMes / totalMes) * 100) : 0;

    return { percHoje, percMes, totalHoje, presentesHoje };
  }, [myPresencas]);

  const experimentaisFollowUp = useMemo(() => {
    if (!isGestor) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return experimentais
      .filter(exp => {
        if (exp.status !== 'Presente' || exp.followUpSent || exp.convertido) return false;
        if (!exp.aula) return false;

        const classDate = new Date(exp.aula + 'T12:00:00');
        classDate.setHours(0, 0, 0, 0);
        return today.getTime() > classDate.getTime();
      })
      .sort((a, b) => {
        if (a.aula !== b.aula) return a.aula.localeCompare(b.aula);
        return a.estudante.localeCompare(b.estudante);
      });
  }, [isGestor, experimentais]);

  const alunosEmRisco = useMemo(() => {
    if (!isGestor) return [];
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toLocaleDateString('en-CA');

    const ativosIds = new Set(matriculas.map(m => m.alunoId));
    
    return alunos.filter(aluno => {
      if (!ativosIds.has(aluno.id)) return false;
      
      const turmasDoAluno = matriculas.filter(m => m.alunoId === aluno.id).map(m => m.turmaId);
      
      // Verifica risco individualmente por curso conforme solicitado
      return turmasDoAluno.some(turmaId => {
        const presencasTurma = presencas
          .filter(p => p.alunoId === aluno.id && p.turmaId === turmaId)
          .sort((a, b) => b.data.localeCompare(a.data));

        if (presencasTurma.length === 0) return false;

        // Critério 1: 3 faltas consecutivas (gatilho imediato)
        const ultimas3 = presencasTurma.slice(0, 3);
        const tresFaltasConsecutivas = ultimas3.length === 3 && ultimas3.every(p => p.status === 'Ausente');

        // Critério 2: Taxa de ausência > 50% nos últimos 30 dias (mínimo 5 registros)
        const presencas30Dias = presencasTurma.filter(p => p.data >= thirtyDaysAgoStr);
        let altaTaxaAusencia = false;
        if (presencas30Dias.length >= 5) {
          const faltas = presencas30Dias.filter(p => p.status === 'Ausente').length;
          const taxaAusencia = (faltas / presencas30Dias.length) * 100;
          altaTaxaAusencia = taxaAusencia > 50;
        }

        return tresFaltasConsecutivas || altaTaxaAusencia;
      });
    }).slice(0, 5);
  }, [isGestor, alunos, matriculas, presencas]);

  const openFollowUpModal = (exp: AulaExperimental) => {
    const saudacao = exp.responsavel1?.split(' ')[0] || 'Família';
    const alunoNome = exp.estudante.split(' ')[0];
    const curso = exp.curso;
    
    let msg = templateConversao || "Olá {{RESPONSAVEL}}, aqui é da coordenação do B+! Passando para saber o que {{ALUNO}} achou da aula experimental de {{CURSO}}. Como foi a percepção de vocês?";
    
    msg = msg
      .replace(/{{RESPONSAVEL}}/g, saudacao)
      .replace(/{{ALUNO}}/g, alunoNome)
      .replace(/{{CURSO}}/g, curso)
      .replace(/{{DATA}}/g, exp.aula ? new Date(exp.aula + 'T12:00:00').toLocaleDateString('pt-BR') : '');

    setFollowUpModal({
      isOpen: true,
      exp,
      message: msg
    });
  };

  const confirmSendFollowUp = async () => {
    const { exp, message } = followUpModal;
    if (!exp || !whatsappConfig?.url) return;

    const fone = (exp.whatsapp1 || '').replace(/\D/g, '');
    if (!fone) {
        alert("WhatsApp do responsável não encontrado.");
        return;
    }

    setIsSending(true);
    try {
        const headers: Record<string, string> = { 
          'Content-Type': 'application/json'
        };
        
        if (whatsappConfig.token) {
            headers['Authorization'] = `Bearer ${whatsappConfig.token}`;
            headers['apikey'] = whatsappConfig.token;
        }

        await fetch(whatsappConfig.url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                "phone": `55${fone}`,
                "message": message,
                "student": exp.estudante,
                "course": exp.curso,
                "data.contact.Phone[0]": `55${fone}`
            })
        });

        if (onUpdateExperimental) {
            onUpdateExperimental({
                ...exp,
                followUpSent: true
            });
        }
        setFollowUpModal({ isOpen: false, exp: null, message: '' });
    } catch (e) {
        console.error("Erro no follow-up:", e);
        alert("Erro ao disparar webhook. Verifique se o URL é válido e permite CORS.");
    } finally {
        setIsSending(false);
    }
  };

  const gestorStats = useMemo(() => {
    if (!isGestorOrEstagiario) return [];
    const totalCadastrados = alunos.length;
    const idsComMatricula = new Set(matriculas.map(m => m.alunoId));
    const totalAlunosAtivos = Array.from(idsComMatricula).length;
    const totalMatriculasAtivas = matriculas.length;
    
    const totalCapacidade = turmas.reduce((acc, t) => acc + (t.capacidade || 0), 0) || (turmasCount * 15);
    const taxaOcupacaoMedia = Math.min(100, Math.round((totalMatriculasAtivas / totalCapacidade) * 100));

    return [
      { label: 'Alunos Cadastrados', value: totalCadastrados, icon: UserPlus, color: 'bg-slate-700' },
      { label: 'Alunos Ativos', value: totalAlunosAtivos, icon: Users, color: 'bg-blue-600' },
      { label: 'Matrículas Ativas', value: totalMatriculasAtivas, icon: ClipboardCheck, color: 'bg-emerald-600' },
      { label: 'Ocupação Média', value: `${taxaOcupacaoMedia}%`, icon: GraduationCap, color: 'bg-purple-600' },
    ];
  }, [isGestorOrEstagiario, alunos, matriculas, turmas, turmasCount]);

  const stats = useMemo(() => {
    if (isGestorOrEstagiario) return gestorStats;
    if (isRegente) {
      return [
        { label: 'Meus Alunos Ativos', value: alunosCount, icon: Users, color: 'bg-blue-600' },
        { label: 'Alunos em Curso Hoje', value: alunosHojeCount, icon: CalendarDays, color: 'bg-amber-500' },
      ];
    }
    
    const currentAlunosCount = isProfessor ? myAlunosIds.size : alunosCount;
    const currentTurmasCount = isProfessor ? myTurmas.length : turmasCount;

    return [
      { label: isProfessor ? 'Meus Alunos' : 'Alunos Ativos', value: currentAlunosCount, icon: Users, color: 'bg-blue-500' },
      { label: isProfessor ? 'Minhas Turmas' : 'Turmas Ativas', value: currentTurmasCount, icon: GraduationCap, color: 'bg-purple-500' },
      { label: 'Presença Hoje', value: statsCalculated.totalHoje > 0 ? `${statsCalculated.percHoje}%` : '--', icon: CheckSquare, color: 'bg-green-500' },
      { label: 'Taxa Mensal', value: `${statsCalculated.percMes}%`, icon: TrendingUp, color: 'bg-orange-500' },
    ];
  }, [isGestorOrEstagiario, isRegente, isProfessor, gestorStats, alunosCount, alunosHojeCount, turmasCount, statsCalculated, myAlunosIds, myTurmas]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
          <p className="text-slate-500">
            {isProfessor ? `Bem-vindo, Professor ${user.nome || user.login}. Veja o desempenho das suas turmas.` : 
             isRegente ? `Bem-vindo, Regente ${user.nome}.` : `Painel de controle ${user.nivel}.`}
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${stats.length} gap-6`}>
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-4">
              <div className={`${stat.color} p-3 rounded-2xl text-white shadow-lg shadow-opacity-10`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isGestor && experimentaisFollowUp.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-[32px] p-8 shadow-sm animate-in slide-in-from-top-4 duration-500">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="bg-purple-100 p-5 rounded-3xl text-purple-600">
                <FlaskConical className="w-10 h-10" />
            </div>
            <div className="flex-1 text-center lg:text-left">
                <h3 className="text-xl font-black text-purple-900 flex items-center justify-center lg:justify-start gap-3">
                    Conversão de Experimentais
                    <span className="bg-purple-600 text-white text-[10px] px-2 py-1 rounded-full animate-pulse">Pós-Aula</span>
                </h3>
                <p className="text-purple-700 font-medium text-sm mt-1">
                    Estudantes que realizaram aula experimental ontem ou em datas anteriores. Envie o feedback para converter em matrícula.
                </p>
            </div>
          </div>
          <div className="mt-8 space-y-3">
             {experimentaisFollowUp.map(exp => (
                 <div key={exp.id} className="bg-white p-4 rounded-2xl border border-purple-100 flex items-center justify-between gap-4 group hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-black">
                            {exp.estudante.charAt(0)}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 leading-none">{exp.estudante}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-wider">{exp.curso} • {exp.sigla}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-300 uppercase flex items-center gap-1"><Timer className="w-3 h-3" /> Realizada em:</span>
                            <span className="text-xs font-bold text-slate-500">
                                {exp.aula ? new Date(exp.aula + 'T12:00:00').toLocaleDateString('pt-BR') : '--'}
                            </span>
                        </div>
                        <button 
                            onClick={() => openFollowUpModal(exp)}
                            className="bg-purple-600 text-white px-5 py-3 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 active:scale-95"
                        >
                            <Zap className="w-4 h-4 fill-current" />
                            ENVIAR FEEDBACK
                        </button>
                    </div>
                 </div>
             ))}
          </div>
        </div>
      )}

      {isGestor && alunosEmRisco.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-8 flex flex-col lg:flex-row items-center gap-8 shadow-sm">
          <div className="bg-amber-100 p-5 rounded-3xl text-amber-600">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="flex-1 text-center lg:text-left">
            <h3 className="text-xl font-black text-amber-900">Alerta de Retenção (Churn Risk)</h3>
            <p className="text-amber-700 font-medium text-sm">
              Estudantes com 3 ausências consecutivas ou mais de 50% de faltas nos últimos 30 dias (mín. 5 chamadas no curso).
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2 mt-4">
              {alunosEmRisco.map(a => (
                <span key={a.id} className="bg-white px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 border border-amber-200 shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  {a.nome}
                </span>
              ))}
            </div>
          </div>
          <button 
            onClick={() => onNavigate && onNavigate('churn-risk')}
            className="bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-amber-700 transition-colors shadow-lg shadow-amber-600/20"
          >
            Gerenciar Alertas <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {followUpModal.isOpen && followUpModal.exp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 bg-purple-600 text-white relative">
              <button 
                onClick={() => setFollowUpModal({ isOpen: false, exp: null, message: '' })} 
                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/20 rounded-2xl">
                  <MessageCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">Pesquisa de Satisfação</h3>
                  <p className="text-purple-100 text-xs font-bold uppercase tracking-widest mt-1">Lead Experimental</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estudante</p>
                  <p className="font-bold text-slate-800 truncate">{followUpModal.exp.estudante}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsável</p>
                  <p className="font-bold text-slate-800 truncate">{followUpModal.exp.responsavel1 || 'Não informado'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Editar Mensagem do Webhook</label>
                <div className="relative group">
                  <textarea 
                    value={followUpModal.message}
                    onChange={(e) => setFollowUpModal(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 text-sm font-medium outline-none focus:border-purple-500 transition-all min-h-[180px] resize-none"
                    placeholder="Escreva a mensagem aqui..."
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Dados que serão enviados:</p>
                <div className="font-mono text-[9px] text-blue-700 bg-white/50 p-2 rounded-lg">
                  {`{ "phone": "55${followUpModal.exp.whatsapp1?.replace(/\D/g, '')}", "message": "...", "student": "..." }`}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmSendFollowUp} 
                  disabled={isSending || !followUpModal.message.trim()}
                  className={`w-full py-5 rounded-3xl font-black text-lg flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.98] ${
                    isSending 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-600/20'
                  }`}
                >
                  {isSending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Zap className="w-6 h-6 fill-current" />
                  )}
                  {isSending ? 'Processando...' : 'Confirmar e Disparar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
