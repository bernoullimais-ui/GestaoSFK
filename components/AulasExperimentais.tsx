
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
  Loader2
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
}

const AulasExperimentais: React.FC<AulasExperimentaisProps> = ({ 
  experimentais, 
  currentUser, 
  onUpdate,
  turmas,
  whatsappConfig,
  msgTemplate = "Olá *{{responsavel}}*, aqui é da SFK. Como foi a aula experimental de *{{estudante}}* hoje?"
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [localChanges, setLocalChanges] = useState<Record<string, { status?: string, feedback?: string }>>({});
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; exp: AulaExperimental | null; message: string; }>({ isOpen: false, exp: null, message: '' });

  const isGestor = currentUser.nivel === 'Gestor' || currentUser.nivel === 'Gestor Master';
  const isProfessor = currentUser.nivel === 'Professor';
  const isRegente = currentUser.nivel === 'Regente';
  const userName = (currentUser.nome || currentUser.login);

  const canEdit = isProfessor || isGestor;

  const deepNormalize = (text: string) => {
    return String(text || '')
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ENSINO FUNDAMENTAL/g, 'EF')
      .replace(/ENSINO MEDIO/g, 'EM')
      .replace(/EDUCA[CA]O INFANTIL/g, 'EI')
      .replace(/INFANTIL/g, 'EI')
      .replace(/FUNDAMENTAL/g, 'EF')
      .replace(/MEDIO/g, 'EM')
      .replace(/GRUPO/g, 'G')
      .replace(/ANO/g, '')
      .replace(/SERIE/g, '')
      .replace(/ESTAGIO/g, '')
      .replace(/TURMA/g, '')
      .replace(/[^A-Z0-9]/g, '')
      .trim();
  };

  const normalizeText = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const filteredExperimentais = useMemo(() => {
    const unidadestr = currentUser.unidade || '';
    const userUnits = normalizeText(unidadestr).split(',').map(u => u.trim());
    const regenteSiglaTarget = isRegente ? deepNormalize(userName) : '';

    return experimentais.filter(exp => {
      if (unidadestr !== 'TODAS') {
        const expUnit = normalizeText(exp.unidade);
        if (!userUnits.some(u => expUnit.includes(u) || u.includes(expUnit))) return false;
      }

      if (isRegente) {
        const studentSiglaNorm = deepNormalize(exp.sigla || '');
        const isMatch = studentSiglaNorm === regenteSiglaTarget || 
                        studentSiglaNorm.includes(regenteSiglaTarget) || 
                        regenteSiglaTarget.includes(studentSiglaNorm);
        
        if (!isMatch) return false;
      }

      if (isProfessor) {
        const expCourseNorm = normalizeText(exp.curso);
        const professorNameNorm = normalizeText(userName).replace('prof.', '').trim();
        
        const teachesThisCategory = turmas.some(t => {
          const tProfNorm = normalizeText(t.professor).replace('prof.', '').trim();
          const tNameNorm = normalizeText(t.nome);
          const isMyTurma = tProfNorm.includes(professorNameNorm) || professorNameNorm.includes(tProfNorm);
          return isMyTurma && (tNameNorm.includes(expCourseNorm) || expCourseNorm.includes(tNameNorm));
        });
        
        if (!teachesThisCategory) return false;
      }

      if (!selectedDate) return true;
      const expDate = String(exp.aula || '').split(' ')[0];
      return expDate === selectedDate;
    }).sort((a, b) => a.estudante.localeCompare(b.estudante));
  }, [experimentais, selectedDate, currentUser, isRegente, isProfessor, turmas, userName]);

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

  const openComposeModal = (exp: AulaExperimental) => {
    const responsavelFull = exp.responsavel1 || exp.estudante || '';
    const primeiroNomeResponsavel = (responsavelFull || '').trim().split(' ')[0] || '';
    const estudantePrimeiroNome = (exp.estudante || '').trim().split(' ')[0] || '';
    const unidade = exp.unidade || '';
    const curso = exp.curso || '';
    
    let msg = (msgTemplate || '')
      .replace(/{{responsavel}}/g, primeiroNomeResponsavel)
      .replace(/{{estudante}}/g, estudantePrimeiroNome)
      .replace(/{{unidade}}/g, unidade)
      .replace(/{{curso}}/g, curso);
    
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
          headers: { 
            'Content-Type': 'application/json',
            'apikey': whatsappConfig.token || '' 
          },
          body: JSON.stringify({ "data.contact.Phone[0]": `55${fone}`, "message": messageModal.message })
        });
        alert("Mensagem enviada com sucesso!");
      } else if (fone) {
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(messageModal.message)}`, '_blank');
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
          <h2 className="text-2xl font-bold text-slate-800">Funil Experimental</h2>
          <p className="text-slate-500 italic">Mapeamento nominal para aulas experimentais agendadas.</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-purple-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">Leads em Tempo Real</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
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
           <div className={`px-5 py-3 rounded-2xl border flex-1 transition-all ${filteredExperimentais.length > 0 ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100'}`}>
             <p className={`text-[9px] font-black uppercase ${filteredExperimentais.length > 0 ? 'text-purple-600' : 'text-slate-400'}`}>Filtro Ativo</p>
             <p className="text-sm font-bold text-slate-700">{filteredExperimentais.length} Agendamentos Localizados</p>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <FlaskConical className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{filteredExperimentais.length > 0 ? `Lista para ${formatHeaderDate(selectedDate)}` : 'Aguardando Agendamentos'}</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-none mt-1">
                 {isRegente ? `MODO VISUALIZAÇÃO (REGENTE: ${userName})` : 'PROCESSAMENTO DETALHADO (COLUNAS A-M)'}
              </p>
            </div>
          </div>
          {isRegente && (
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-lg border border-white/10">
              <Lock className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] font-black text-white/70 uppercase">Somente Leitura</span>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-50">
          {filteredExperimentais.length > 0 ? filteredExperimentais.map((exp) => {
            const hasLocalChanges = !!localChanges[exp.id];
            const currentStatus = localChanges[exp.id]?.status || exp.status;
            const currentFeedback = localChanges[exp.id]?.feedback !== undefined ? localChanges[exp.id]?.feedback : (exp.observacaoProfessor || '');

            return (
              <div key={exp.id} className={`group transition-all ${expandedId === exp.id ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
                <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-5 flex-1">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${currentStatus === 'Presente' ? 'bg-green-600 text-white' : currentStatus === 'Ausente' ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'}`}>
                      {exp.estudante.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-slate-900 leading-tight truncate pr-4" title={exp.estudante}>{exp.estudante}</h4>
                        {exp.convertido && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">MATRICULADO</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-700 uppercase bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                          <MapPin className="w-3 h-3" /> {exp.unidade}
                        </span>
                        <span className="text-[10px] font-black text-blue-700 uppercase bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                          {exp.sigla || 'SIGLA N/I'}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                          <GraduationCap className="w-4 h-4 text-slate-300" />
                          <span className="truncate max-w-[150px]">{exp.curso}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => openComposeModal(exp)}
                      className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-colors"
                      title="Enviar WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PRESENÇA</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleLocalStatusUpdate(exp.id, 'Presente')} 
                          disabled={!canEdit}
                          className={`p-2 rounded-xl border-2 transition-all ${!canEdit ? 'cursor-not-allowed opacity-60' : ''} ${currentStatus === 'Presente' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-100 text-slate-300'}`}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleLocalStatusUpdate(exp.id, 'Ausente')} 
                          disabled={!canEdit}
                          className={`p-2 rounded-xl border-2 transition-all ${!canEdit ? 'cursor-not-allowed opacity-60' : ''} ${currentStatus === 'Ausente' ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-100 text-slate-300'}`}
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-200"
                    >
                      {expandedId === exp.id ? 'FECHAR' : 'DETALHES'} {expandedId === exp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedId === exp.id && (
                  <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-4 flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                         <div className="flex items-center justify-between mb-3">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Observação da Aula Experimental</p>
                           {isRegente && <span className="text-[8px] font-black text-amber-500 uppercase flex items-center gap-1"><Info className="w-3 h-3" /> Somente Professor</span>}
                         </div>
                         <textarea 
                            value={currentFeedback}
                            onChange={(e) => handleLocalFeedbackUpdate(exp.id, e.target.value)}
                            readOnly={!canEdit}
                            placeholder={canEdit ? "Descreva o desempenho do lead..." : "Feedback não disponível para edição."}
                            className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none focus:border-purple-500 min-h-[100px] resize-none ${!canEdit ? 'cursor-default' : ''}`}
                         />
                         {hasLocalChanges && canEdit && (
                           <button 
                            onClick={() => handleSaveChanges(exp)}
                            disabled={isSavingId === exp.id}
                            className="w-full mt-3 bg-slate-900 text-white py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-slate-800"
                           >
                            {isSavingId === exp.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            SALVAR ALTERAÇÕES
                           </button>
                         )}
                      </div>
                    </div>
                    <div className="w-full md:w-72 space-y-5">
                       <div className="bg-slate-100 p-5 rounded-3xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Contato do Responsável</p>
                          <div className="space-y-4">
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm"><User className="w-4 h-4 text-slate-400" /></div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase">Nome</p>
                                   <p className="text-xs font-bold text-slate-700">{exp.responsavel1 || '--'}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-xl shadow-sm"><Phone className="w-4 h-4 text-slate-400" /></div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase">WhatsApp</p>
                                   <p className="text-xs font-bold text-slate-700">{exp.whatsapp1 || '--'}</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="p-24 text-center">
               <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8" />
               </div>
               <h4 className="text-lg font-bold text-slate-400">Nenhum agendamento encontrado</h4>
               <p className="text-slate-300 text-xs mt-1 max-w-xs mx-auto">
                 {isRegente 
                   ? `Verificando leads vinculados à sigla "${userName}" na unidade "${currentUser.unidade}".`
                   : `Nenhum lead experimental para esta data na planilha.`}
               </p>
            </div>
          )}
        </div>
      </div>

      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-950 text-white rounded-2xl">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black">Contato Lead</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{messageModal.exp?.estudante}</p>
              </div>
            </div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Mensagem de Contato</label>
            <textarea 
              value={messageModal.message} 
              onChange={(e) => setMessageModal({...messageModal, message: e.target.value})} 
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] h-40 mb-6 font-medium text-sm outline-none focus:border-indigo-500 transition-all resize-none shadow-inner" 
            />
            <button 
              onClick={handleSendMessage} 
              disabled={isSending} 
              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all"
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

export default AulasExperimentais;
