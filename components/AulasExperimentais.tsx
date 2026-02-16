import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, 
  Calendar, 
  GraduationCap, 
  Clock, 
  Info, 
  ShieldCheck, 
  Lock, 
  MessageCircle, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Send,
  Timer,
  RefreshCw,
  Bell,
  Save,
  Check,
  UserCheck,
  ClipboardCheck,
  ArrowUpRight,
  Loader2,
  // Fix: Added missing User icon import
  User
} from 'lucide-react';
import { AulaExperimental, Usuario, Turma } from '../types';

interface AulasExperimentaisProps {
  experimentais: AulaExperimental[];
  currentUser: Usuario;
  onUpdate: (updated: AulaExperimental) => void;
  turmas: Turma[];
  whatsappConfig?: {
    url: string;
    token: string;
  };
  templateLembrete?: string;
}

const AulasExperimentais: React.FC<AulasExperimentaisProps> = ({ 
  experimentais, 
  currentUser, 
  onUpdate,
  turmas,
  whatsappConfig,
  templateLembrete
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [isSendingId, setIsSendingId] = useState<string | null>(null);
  
  const [localChanges, setLocalChanges] = useState<Record<string, { status?: string, feedback?: string }>>({});

  const isGestor = currentUser.nivel === 'Gestor' || currentUser.nivel === 'Gestor Master';
  const isProfessor = currentUser.nivel === 'Professor';
  const isRegente = currentUser.nivel === 'Regente';
  const professorName = (currentUser.nome || currentUser.login).toLowerCase().trim();

  const formatSigla = (sigla: string) => {
    if (!sigla) return 'PENDENTE';
    let s = sigla.toUpperCase().trim();
    s = s.replace(/ENSINO M[EÉ]DIO/gi, 'EM')
         .replace(/ENSINO FUNDAMENTAL/gi, 'EF')
         .replace(/EDUCA[CÇ]A[OÕ] INFANTIL/gi, 'EI');
    s = s.replace(/\s*-\s*/g, '-').replace(/-+/g, '-');
    s = s.replace(/^(EM|EF|EI)-(EM|EF|EI)-/i, '$1-');
    s = s.replace(/\b(ANO|SÉRIE|SERIE|ESTÁGIO|ESTAGIO|TURMA)\b/gi, '').trim();
    s = s.replace(/(\d+[ºª]?)-?\s*([A-E])$/i, '$1 $2');
    s = s.replace(/^(EM|EF|EI)-\1-/i, '$1-').replace(/-+/g, '-').replace(/^-/, '').replace(/-$/, '').replace(/\s+/g, ' ').trim();
    return s || 'PENDENTE';
  };

  const normalizeCourseName = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") 
      .replace(/\d+/g, '')             
      .replace(/\s+/g, ' ')            
      .trim();
  };

  const filteredExperimentais = useMemo(() => {
    const profCoursesNormalized = isProfessor 
      ? turmas
          .filter(t => {
            const tProf = t.professor.toLowerCase().replace('prof.', '').trim();
            return tProf.includes(professorName) || professorName.includes(tProf);
          })
          .map(t => normalizeCourseName(t.nome))
      : [];

    const filtered = experimentais.filter(exp => {
      if (isRegente) {
        const userSiglaFormatted = formatSigla(currentUser.nome || '').toUpperCase();
        const studentSiglaFormatted = formatSigla(exp.sigla || '').toUpperCase();
        if (studentSiglaFormatted !== userSiglaFormatted) return false;
      }

      if (isProfessor) {
        const expCourseNorm = normalizeCourseName(exp.curso || '');
        const teachesThisCategory = profCoursesNormalized.some(pCourse => 
          pCourse.includes(expCourseNorm) || expCourseNorm.includes(pCourse)
        );
        if (!teachesThisCategory) return false;
      }

      if (!selectedDate) return true;
      return exp.aula === selectedDate;
    });

    return [...filtered].sort((a, b) => {
      const getPriority = (sigla: string) => {
        const s = formatSigla(sigla).toUpperCase();
        if (s.startsWith('EI')) return 1;
        if (s.startsWith('EF')) return 2;
        if (s.startsWith('EM')) return 3;
        return 4;
      };
      const priorityA = getPriority(a.sigla);
      const priorityB = getPriority(b.sigla);
      if (priorityA !== priorityB) return priorityA - priorityB;
      const siglaA = formatSigla(a.sigla);
      const siglaB = formatSigla(b.sigla);
      if (siglaA !== siglaB) return siglaA.localeCompare(siglaB);
      return a.estudante.localeCompare(b.estudante);
    });
  }, [experimentais, selectedDate, currentUser, isRegente, isProfessor, turmas, professorName]);

  const handleLocalStatusUpdate = (id: string, newStatus: string) => {
    setLocalChanges(prev => ({
      ...prev,
      [id]: { ...prev[id], status: newStatus }
    }));
  };

  const handleLocalFeedbackUpdate = (id: string, feedback: string) => {
    setLocalChanges(prev => ({
      ...prev,
      [id]: { ...prev[id], feedback: feedback }
    }));
  };

  const handleSaveChanges = async (exp: AulaExperimental) => {
    const changes = localChanges[exp.id];
    if (!changes) return;
    setIsSavingId(exp.id);
    const updatedExp: AulaExperimental = {
      ...exp,
      status: (changes.status as any) || exp.status,
      observacaoProfessor: changes.feedback !== undefined ? changes.feedback : exp.observacaoProfessor,
      dataStatusAtualizado: new Date().toISOString()
    };
    try {
      await onUpdate(updatedExp);
      setLocalChanges(prev => {
        const next = { ...prev };
        delete next[exp.id];
        return next;
      });
    } catch (error) {
      console.error("Erro ao salvar experimental:", error);
    } finally {
      setIsSavingId(null);
    }
  };

  const handleSendReminder = async (exp: AulaExperimental) => {
    if (!whatsappConfig?.url) return;
    const fone = (exp.whatsapp1 || '').replace(/\D/g, '');
    if (!fone) {
      alert("Telefone do responsável não disponível.");
      return;
    }

    setIsSendingId(exp.id);
    try {
      let msg = templateLembrete || "Olá *{{RESPONSAVEL}}*, aqui é da coordenação do *B+!*. Passando para confirmar a aula experimental de *{{CURSO}}* para o dia *{{DATA}}*. Estaremos esperando para acolher *{{ALUNO}}* com muito carinho!";
      
      msg = msg
        .replace(/{{RESPONSAVEL}}/g, exp.responsavel1?.split(' ')[0] || 'Família')
        .replace(/{{ALUNO}}/g, exp.estudante)
        .replace(/{{CURSO}}/g, exp.curso)
        .replace(/{{DATA}}/g, exp.aula ? new Date(exp.aula + 'T12:00:00').toLocaleDateString('pt-BR') : '--');

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (whatsappConfig.token) {
        headers['Authorization'] = `Bearer ${whatsappConfig.token}`;
        headers['apikey'] = whatsappConfig.token;
      }

      await fetch(whatsappConfig.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          "phone": `55${fone}`,
          "message": msg,
          "data.contact.Phone[0]": `55${fone}`
        })
      });
      
      await onUpdate({ ...exp, confirmationSent: true });
      
    } catch (e) {
      console.error(e);
      alert("Erro ao processar lembrete.");
    } finally {
      setIsSendingId(null);
    }
  };

  const formatHeaderDate = (isoStr: string) => {
    if (!isoStr) return "";
    const [y, m, d] = isoStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Funil Experimental</h2>
          <p className="text-slate-500 italic">Mapeamento nominal para aulas experimentais.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg shadow-slate-900/10">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Controle de Leads</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div className="max-w-xs w-full">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider ml-1">Filtro por Data (AULA)</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
            />
          </div>
        </div>
        <div className="flex gap-4">
           <div className="bg-purple-50 px-4 py-3 rounded-2xl border border-purple-100 flex-1">
             <p className="text-[9px] font-black text-purple-600 uppercase">Total do Dia</p>
             <p className="text-sm font-bold text-slate-700">{filteredExperimentais.length} Agendamentos</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-purple-400 animate-pulse" />
            <div>
              <h3 className="font-bold text-lg">Leads para {formatHeaderDate(selectedDate)}</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mt-1">
                 MAPEAMENTO NOMINAL POR PROFESSOR
              </p>
            </div>
          </div>
          <div className="bg-purple-600 px-3 py-1.5 rounded-xl text-xs font-black shadow-lg shadow-purple-600/20">
            {filteredExperimentais.length} Leads
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {filteredExperimentais.length > 0 ? filteredExperimentais.map((exp) => {
            const hasLocalChanges = !!localChanges[exp.id];
            const currentStatus = localChanges[exp.id]?.status || exp.status;
            const currentFeedback = localChanges[exp.id]?.feedback !== undefined ? localChanges[exp.id]?.feedback : (exp.observacaoProfessor || '');
            const isConverted = exp.convertido;
            const isSent = exp.confirmationSent;

            return (
              <div key={exp.id} className={`group transition-all ${expandedId === exp.id ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm transition-transform group-hover:scale-105 ${currentStatus === 'Presente' ? 'bg-green-600 text-white' : currentStatus === 'Ausente' ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'}`}>
                      {exp.estudante.charAt(0)}
                      {isConverted && (
                        <div className="absolute -top-1 -right-1 bg-white text-blue-600 rounded-full p-1 shadow-md border border-blue-100">
                          <UserCheck className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-slate-900 leading-tight">{exp.estudante}</h4>
                        {isConverted && (
                          <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 border border-emerald-200 uppercase tracking-tighter">
                            <ClipboardCheck className="w-2.5 h-2.5" /> Matriculado
                          </span>
                        )}
                        {hasLocalChanges && <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Alterações não salvas" />}
                      </div>
                      
                      {/* Adicionado exibição do responsável na lista principal */}
                      <div className="flex items-center gap-1 text-slate-500 text-[11px] font-bold mt-1">
                        <User className="w-3.5 h-3.5" />
                        <span>Responsável: {exp.responsavel1 || 'Não informado'}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-[11px] font-black text-blue-700 uppercase bg-blue-100/60 px-3 py-1.5 rounded-xl border border-blue-200/50 shadow-sm leading-none flex items-center justify-center">
                          {formatSigla(exp.sigla)}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                          < GraduationCap className="w-4 h-4 text-slate-300" />
                          <span className="truncate max-w-[150px] font-bold">{exp.curso}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase border-l border-slate-200 pl-3">
                          <Clock className="w-3.5 h-3.5" /> Agendado: {formatHeaderDate(exp.aula)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:flex lg:items-center gap-4">
                    {isGestor && exp.status === 'Pendente' && (
                       <button 
                        onClick={() => handleSendReminder(exp)}
                        disabled={isSendingId === exp.id || isSent}
                        className={`p-2.5 rounded-xl border transition-all shadow-sm flex items-center justify-center ${
                          isSent 
                          ? 'bg-emerald-600 text-white border-emerald-600 cursor-not-allowed shadow-md' 
                          : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-600 hover:text-white'
                        }`}
                        title={isSent ? "Lembrete já enviado (SIM na planilha)" : "Enviar Lembrete WhatsApp"}
                       >
                         {isSendingId === exp.id ? (
                           <Loader2 className="w-5 h-5 animate-spin" />
                         ) : isSent ? (
                           <div className="flex items-center gap-1">
                             <Check className="w-5 h-5" />
                             <span className="text-[9px] font-black">OK</span>
                           </div>
                         ) : (
                           <MessageCircle className="w-5 h-5" />
                         )}
                       </button>
                    )}

                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">STATUS</span>
                      <div className="flex gap-2 mt-1">
                        {(isGestor || isProfessor) ? (
                          <>
                            <button 
                              onClick={() => handleLocalStatusUpdate(exp.id, 'Presente')} 
                              className={`p-2 rounded-xl border-2 transition-all ${currentStatus === 'Presente' ? 'bg-green-600 border-green-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-300 hover:border-green-200 hover:text-green-600'}`}
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleLocalStatusUpdate(exp.id, 'Ausente')} 
                              className={`p-2 rounded-xl border-2 transition-all ${currentStatus === 'Ausente' ? 'bg-red-500 border-red-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-300 hover:border-red-200 hover:text-red-500'}`}
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded border ${currentStatus === 'Presente' ? 'bg-green-100 text-green-600' : currentStatus === 'Ausente' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-400'}`}>
                            {currentStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-2 lg:col-span-1 flex items-center gap-2">
                      <button 
                        onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                        className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase transition-all shadow-sm ${expandedId === exp.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {expandedId === exp.id ? 'Fechar' : 'Detalhes'} {expandedId === exp.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {expandedId === exp.id && (
                  <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-4 duration-300 flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                         <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Feedback Técnico (Professor)</p>
                            {hasLocalChanges && <span className="text-[10px] font-bold text-amber-500 uppercase flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Alterações pendentes</span>}
                         </div>
                         <textarea 
                            value={currentFeedback}
                            onChange={(e) => handleLocalFeedbackUpdate(exp.id, e.target.value)}
                            disabled={!isProfessor && !isGestor}
                            placeholder="Descreva o desempenho motor e interesse do aluno para facilitar a matrícula..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-purple-500 min-h-[120px] resize-none"
                         />
                         
                         {(isProfessor || isGestor) && (
                            <button 
                              onClick={() => handleSaveChanges(exp)}
                              disabled={!hasLocalChanges || isSavingId === exp.id}
                              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all ${
                                !hasLocalChanges 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/10 active:scale-[0.98]'
                              }`}
                            >
                              {isSavingId === exp.id ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                              ) : (
                                <Save className="w-5 h-5" />
                              )}
                              {isSavingId === exp.id ? 'Sincronizando...' : 'Salvar Alterações'}
                            </button>
                         )}
                      </div>
                    </div>
                    <div className="w-full md:w-64 space-y-6">
                       <div className="space-y-4">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</p>
                            <p className="font-bold text-slate-700 leading-tight">{exp.responsavel1 || '--'}</p>
                            {exp.whatsapp1 && (
                              <div className="flex items-center gap-2 text-green-600 font-bold text-xs mt-1">
                                <MessageCircle className="w-3.5 h-3.5" /> {exp.whatsapp1}
                              </div>
                            )}
                         </div>
                         
                         {isConverted && (
                           <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                <ArrowUpRight className="w-3 h-3" /> Conversão Detectada
                              </p>
                              <p className="text-[11px] text-emerald-800 font-bold mt-1">
                                Aluno matriculado no curso de {exp.curso} após a aula experimental.
                              </p>
                           </div>
                         )}
                       </div>
                       
                       <div className="bg-slate-100 p-5 rounded-3xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-2 tracking-widest">Orientações B+</p>
                          <p className="text-[11px] text-slate-500 leading-relaxed italic font-medium">
                            O registro de presença e o feedback técnico são cruciais para a conversão comercial da secretaria.
                          </p>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="p-24 text-center space-y-6">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-slate-100">
                <FlaskConical className="w-10 h-10 text-slate-200" />
              </div>
              <h4 className="text-xl font-bold text-slate-800">Sem agendamentos para esta data</h4>
              <p className="text-slate-400 max-w-xs mx-auto text-sm font-medium">
                Selecione outra data no calendário ou realize uma nova sincronia com a planilha.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AulasExperimentais;