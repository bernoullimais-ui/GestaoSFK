
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
  User,
  Phone,
  MapPin,
  Search,
  AlertCircle,
  Loader2,
  CalendarCheck,
  BookOpen,
  LayoutGrid
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
  msgTemplate?: string;
  msgLembreteTemplate?: string;
}

const AulasExperimentais: React.FC<AulasExperimentaisProps> = ({ 
  experimentais, 
  currentUser, 
  onUpdate,
  turmas,
  whatsappConfig,
  msgTemplate = "Olá *{{responsavel}}*, aqui é da SFK. Como foi a aula experimental de *{{estudante}}* hoje?",
  msgLembreteTemplate = "Olá *{{responsavel}}*, lembrete da aula de *{{estudante}}* hoje na SFK!"
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [localChanges, setLocalChanges] = useState<Record<string, { status?: string, feedback?: string }>>({});
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; exp: AulaExperimental | null; message: string; isLembrete: boolean }>({ isOpen: false, exp: null, message: '', isLembrete: false });

  const isGestorOrCoordenador = currentUser.nivel === 'Gestor' || currentUser.nivel === 'Gestor Master' || currentUser.nivel === 'Coordenador';
  const isRegente = currentUser.nivel === 'Regente';
  const isProfessor = currentUser.nivel === 'Professor' || currentUser.nivel === 'Estagiário';
  
  const normalizeText = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();
  
  const professorName = normalizeText(currentUser.nome || currentUser.login);

  // Mapeia quais cursos e unidades este professor atende
  const professorAssignments = useMemo(() => {
    if (!isProfessor) return [];
    return turmas.filter(t => {
      const prof = normalizeText(t.professor).replace(/^prof\.?\s*/i, '');
      return prof.includes(professorName) || professorName.includes(prof);
    }).map(t => ({
      curso: normalizeText(t.nome),
      unidade: normalizeText(t.unidade)
    }));
  }, [turmas, isProfessor, professorName]);

  const canEdit = isProfessor || isGestorOrCoordenador;

  const formatEscolaridade = (exp: any) => {
    // Tenta pegar de campos diretos ou de campos da planilha normalizados
    const estagio = (exp.sigla || exp.estagioanoescolar || exp.etapaescolar || exp.estagio || exp.etapa || '').toUpperCase().trim();
    const turmaEscolar = (exp.turmaescolar || exp.turmaEscolar || '').toUpperCase().trim();
    if (!estagio) return '';
    return `${estagio}${turmaEscolar ? ' ' + turmaEscolar : ''}`.trim();
  };

  const filteredExperimentais = useMemo(() => {
    const unidadestr = currentUser.unidade || '';
    const userUnits = normalizeText(unidadestr).split(',').map(u => u.trim()).filter(u => u !== "");
    const regenteNameNorm = normalizeText(currentUser.nome || '');

    return experimentais.filter(exp => {
      const expUnit = normalizeText(exp.unidade);
      const expCurso = normalizeText(exp.curso);
      const expEscolaridadeNorm = normalizeText(formatEscolaridade(exp));

      // Regra para Regente: Só vê estudantes da sua escolaridade (Nome do usuário == Sigla)
      if (isRegente) {
        if (expEscolaridadeNorm !== regenteNameNorm && !expEscolaridadeNorm.includes(regenteNameNorm) && !regenteNameNorm.includes(expEscolaridadeNorm)) {
          return false;
        }
        // Se houver unidades habilitadas no perfil, filtra também por unidade
        if (userUnits.length > 0 && !userUnits.some(u => expUnit.includes(u) || u.includes(expUnit))) {
          return false;
        }
      } 
      // Lógica de Acesso para Professor: 
      else if (isProfessor) {
        const isMyClass = professorAssignments.some(assign => 
          (expCurso.includes(assign.curso) || assign.curso.includes(expCurso)) && 
          (expUnit === assign.unidade || expUnit.includes(assign.unidade) || assign.unidade.includes(expUnit))
        );
        if (!isMyClass) return false;
      } 
      // Filtro para Gestores/Coordenadores por Unidade
      else if (unidadestr !== 'TODAS' && userUnits.length > 0) {
        if (!userUnits.some(u => expUnit.includes(u) || u.includes(expUnit))) return false;
      }

      if (!selectedDate) return true;
      const expDate = String(exp.aula || '').split(' ')[0];
      return expDate === selectedDate;
    }).sort((a, b) => a.estudante.localeCompare(b.estudante));
  }, [experimentais, selectedDate, currentUser, isProfessor, isRegente, isGestorOrCoordenador, professorAssignments]);

  const handleLocalStatusUpdate = (id: string, newStatus: string) => {
    if (!canEdit) return;
    setLocalChanges(prev => ({ ...prev, [id]: { ...prev[id], status: newStatus } }));
  };

  const handleLocalFeedbackUpdate = (id: string, feedback: string) => {
    if (!canEdit) return;
    setLocalChanges(prev => ({ ...prev, [id]: { ...prev[id], feedback: feedback } }));
  };

  const handleSaveChanges = async (exp: AulaExperimental) => {
    if (!canEdit) return;
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

  const openComposeModal = (exp: AulaExperimental, isLembrete: boolean = false) => {
    const responsavelFull = exp.responsavel1 || exp.estudante || '';
    const primeiroNomeResponsavel = (responsavelFull || '').trim().split(' ')[0] || '';
    const estudantePrimeiroNome = (exp.estudante || '').trim().split(' ')[0] || '';
    const unidade = exp.unidade || '';
    const curso = exp.curso || (exp as any).modalidade || '';
    const template = isLembrete ? msgLembreteTemplate : msgTemplate;
    let msg = (template || '')
      .replace(/{{responsavel}}/g, primeiroNomeResponsavel)
      .replace(/{{estudante}}/g, estudantePrimeiroNome)
      .replace(/{{unidade}}/g, unidade)
      .replace(/{{curso}}/g, curso);
    setMessageModal({ isOpen: true, exp, message: msg, isLembrete });
  };

  const handleSendMessage = async () => {
    if (!messageModal.exp) return;
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
      if (messageModal.isLembrete) {
        const updatedExp: AulaExperimental = { ...messageModal.exp, lembreteEnviado: true };
        await onUpdate(updatedExp);
      } else {
        const updatedExp: AulaExperimental = { ...messageModal.exp, followUpSent: true };
        await onUpdate(updatedExp);
      }
      setMessageModal({ ...messageModal, isOpen: false });
    } catch (e) { alert("Erro ao enviar."); } finally { setIsSending(false); }
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
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Funil Experimental</h2>
          <p className="text-slate-500 italic font-medium">Mapeamento nominal para aulas experimentais agendadas.</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div className="max-w-xs w-full">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider ml-1">Data da Aula Experimental</label>
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
           <div className={`px-5 py-3 rounded-2xl border flex-1 transition-all ${filteredExperimentais.length > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
             <p className={`text-[9px] font-black uppercase ${filteredExperimentais.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>Filtro Ativo</p>
             <p className="text-sm font-black text-indigo-950 uppercase">{filteredExperimentais.length} Agendamentos Localizados</p>
           </div>
        </div>
      </div>
      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        <div className="p-6 bg-[#0f172a] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FlaskConical className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-black text-lg">{filteredExperimentais.length > 0 ? `Lista para ${formatHeaderDate(selectedDate)}` : 'Aguardando Agendamentos'}</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mt-1">
                 AGENDAMENTOS DE LEADS
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {filteredExperimentais.length > 0 ? filteredExperimentais.map((exp) => {
            const hasLocalChanges = !!localChanges[exp.id];
            const currentStatus = localChanges[exp.id]?.status || exp.status;
            const currentFeedback = localChanges[exp.id]?.feedback !== undefined ? localChanges[exp.id]?.feedback : (exp.observacaoProfessor || '');
            const lembreteOk = exp.lembreteEnviado;
            const escolaridade = formatEscolaridade(exp);
            const modalidade = exp.curso || (exp as any).modalidade || '';
            return (
              <div key={exp.id} className={`group transition-all ${expandedId === exp.id ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-5 flex-1">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${currentStatus === 'Presente' ? 'bg-emerald-600 text-white' : currentStatus === 'Ausente' ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'}`}>
                      {exp.estudante.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-slate-900 leading-tight truncate pr-4 uppercase" title={exp.estudante}>{exp.estudante}</h4>
                        {exp.convertido && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-200 shrink-0 uppercase">MATRICULADO</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                           <MapPin className="w-3.5 h-3.5 text-blue-500" />
                           <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest leading-none">{exp.unidade}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                           <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                           <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest leading-none">{escolaridade || '--'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shadow-sm">
                           <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                           <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">{modalidade || '--'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => openComposeModal(exp, true)}
                      disabled={lembreteOk}
                      className={`px-6 py-3 rounded-2xl transition-all shadow-sm flex items-center gap-2 border ${lembreteOk ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200'}`}
                      title={lembreteOk ? "Lembrete já enviado" : "Enviar Lembrete de Aula"}
                    >
                      <Bell className={`w-4 h-4 ${lembreteOk ? '' : 'animate-pulse'}`} />
                      <span className="text-[10px] font-black uppercase">{lembreteOk ? 'ENVIADO' : 'LEMBRETE'}</span>
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PRESENÇA</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleLocalStatusUpdate(exp.id, 'Presente')} 
                          disabled={!canEdit}
                          className={`p-2.5 rounded-xl border-2 transition-all shadow-sm ${!canEdit ? 'cursor-not-allowed opacity-60' : ''} ${currentStatus === 'Presente' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-100 text-slate-300'}`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleLocalStatusUpdate(exp.id, 'Ausente')} 
                          disabled={!canEdit}
                          className={`p-2.5 rounded-xl border-2 transition-all shadow-sm ${!canEdit ? 'cursor-not-allowed opacity-60' : ''} ${currentStatus === 'Ausente' ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-100 text-slate-300'}`}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                      className="px-6 py-3 bg-[#0f172a] text-white rounded-2xl font-black text-[10px] flex items-center gap-2 hover:bg-slate-800 transition-all uppercase tracking-widest shadow-lg"
                    >
                      {expandedId === exp.id ? 'Fechar' : 'Detalhes'} {expandedId === exp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {expandedId === exp.id && (
                  <div className="px-6 pb-8 pt-2 animate-in slide-in-from-top-4 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                         <div className="flex items-center justify-between mb-4">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                             <ClipboardCheck className="w-3.5 h-3.5 text-indigo-500"/> Observação da Aula Experimental
                           </p>
                         </div>
                         <textarea 
                            value={currentFeedback}
                            onChange={(e) => handleLocalFeedbackUpdate(exp.id, e.target.value)}
                            readOnly={!canEdit}
                            placeholder={canEdit ? "Descreva o desempenho do lead..." : "Feedback não disponível para edição."}
                            className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-6 text-sm font-medium outline-none focus:border-indigo-500 min-h-[120px] resize-none shadow-inner ${!canEdit ? 'cursor-default' : ''}`}
                         />
                         {hasLocalChanges && canEdit && (
                           <button 
                            onClick={() => handleSaveChanges(exp)}
                            disabled={isSavingId === exp.id}
                            className="w-full mt-4 bg-indigo-950 text-white py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-indigo-900 shadow-xl transition-all"
                           >
                            {isSavingId === exp.id ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            SALVAR FEEDBACK E STATUS
                           </button>
                         )}
                      </div>
                    </div>
                    <div className="w-full md:w-80 space-y-5">
                       <div className="bg-slate-100 p-6 rounded-[32px] border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Informações de Contato</p>
                          <div className="space-y-6">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center"><User className="w-5 h-5 text-slate-400" /></div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase">Responsável</p>
                                   <p className="text-sm font-black text-slate-800 uppercase leading-none mt-1">{exp.responsavel1 || '--'}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center"><Phone className="w-5 h-5 text-slate-400" /></div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase">WhatsApp</p>
                                   <p className="text-sm font-black text-slate-800 leading-none mt-1">{exp.whatsapp1 || '--'}</p>
                                </div>
                             </div>
                             {lembreteOk && (
                               <div className="flex items-center gap-3 text-[10px] font-black text-emerald-600 bg-emerald-50 p-3 rounded-2xl border border-emerald-100 shadow-sm">
                                 <Check className="w-4 h-4" /> LEMBRETE DE AULA ENVIADO
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="p-24 text-center">
               <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10" />
               </div>
               <h4 className="text-xl font-black text-slate-400 uppercase tracking-tight">Nenhum agendamento encontrado</h4>
               <p className="text-slate-300 text-sm mt-1">
                 {isProfessor ? 'Não localizamos leads agendados para as turmas onde você é professor nesta data.' : 'Nenhum lead agendado para os critérios selecionados.'}
               </p>
            </div>
          )}
        </div>
      </div>
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="flex items-center gap-5 mb-8">
              <div className={`w-14 h-14 flex items-center justify-center ${messageModal.isLembrete ? 'bg-amber-500' : 'bg-[#0f172a]'} text-white rounded-[20px]`}>
                {messageModal.isLembrete ? <Bell className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight leading-none mb-1">{messageModal.isLembrete ? 'Lembrete de Aula' : 'Contato Lead'}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{messageModal.exp?.estudante}</p>
              </div>
            </div>
            <textarea 
              value={messageModal.message} 
              onChange={(e) => setMessageModal({...messageModal, message: e.target.value})} 
              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] h-48 mb-8 font-medium text-sm outline-none focus:border-indigo-500 transition-all resize-none shadow-inner" 
            />
            <button onClick={handleSendMessage} disabled={isSending} className={`w-full ${messageModal.isLembrete ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white py-6 rounded-3xl font-black text-sm flex items-center justify-center gap-4 transition-all active:scale-[0.98]`}>
              {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current" />} 
              {isSending ? 'ENVIANDO...' : 'ENVIAR WHATSAPP'}
            </button>
            <button onClick={() => setMessageModal({...messageModal, isOpen: false})} className="w-full mt-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AulasExperimentais;
