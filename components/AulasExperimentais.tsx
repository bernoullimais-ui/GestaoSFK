
import React, { useState, useMemo } from 'react';
import { 
  FlaskConical, 
  Calendar, 
  MapPin, 
  BookOpen, 
  MessageCircle, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Bell,
  Check,
  X,
  Loader2,
  Search,
  LayoutGrid,
  Save,
  RotateCcw,
  GraduationCap
} from 'lucide-react';
import { AulaExperimental, Usuario, Turma, Aluno, IdentidadeConfig, UnidadeMapping } from '../types';

// Nova função de cores do avatar baseada em regras de negócio para Experimentais
const getExperimentalAvatarColor = (exp: AulaExperimental, currentStatus: string | undefined) => {
  if (exp.convertido) return 'bg-emerald-500';
  if (currentStatus === 'Ausente') return 'bg-rose-500';
  if (currentStatus === 'Presente') return 'bg-purple-500';
  if (!exp.lembreteEnviado) return 'bg-amber-500';
  return 'bg-slate-400';
};

const getUnidadeBadgeStyle = (unidade: string) => {
  const u = String(unidade || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (u.includes('AKA')) return 'bg-blue-50 text-blue-600 border-blue-100';
  if (u.includes('BUNNY')) return 'bg-purple-50 text-purple-600 border-purple-100';
  if (u.includes('LICEU')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (u.includes('PEDRINHO')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (u.includes('OFICINA')) return 'bg-rose-50 text-rose-600 border-rose-100';
  return 'bg-slate-50 text-slate-500 border-slate-100';
};

interface AulasExperimentaisProps {
  experimentais: AulaExperimental[];
  alunosAtivos: Aluno[]; 
  currentUser: Usuario;
  onUpdate: (updated: AulaExperimental) => void;
  turmas: Turma[];
  identidades: IdentidadeConfig[];
  unidadesMapping: UnidadeMapping[];
}

const AulasExperimentais: React.FC<AulasExperimentaisProps> = ({ 
  experimentais, 
  alunosAtivos,
  currentUser, 
  onUpdate,
  turmas,
  identidades = [],
  unidadesMapping = []
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [localChanges, setLocalChanges] = useState<Record<string, { status?: string, feedback?: string }>>({});
  
  // Modal de mensagem agora rastreia o tipo explicitamente para marcar a coluna certa
  const [messageModal, setMessageModal] = useState<{ 
    isOpen: boolean; 
    exp: AulaExperimental | null; 
    message: string; 
    identity?: IdentidadeConfig;
    actionType: 'lembrete' | 'feedback' | 'reagendar';
  }>({ 
    isOpen: false, 
    exp: null, 
    message: '',
    actionType: 'feedback'
  });

  const normalizeStr = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();
  const isMaster = currentUser.nivel === 'Gestor Master' || currentUser.nivel === 'Start';
  const isGestorAdmin = currentUser.nivel === 'Gestor Administrativo';
  const isProfessor = currentUser.nivel === 'Professor' || currentUser.nivel === 'Estagiário';
  const isRegente = currentUser.nivel === 'Regente';
  const canSendMessage = isMaster || isGestorAdmin;

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  const formatEscolaridade = (exp: AulaExperimental) => {
    let etapa = (exp.etapa || (exp as any).estagioanoescolar || '').trim();
    let turma = (exp.turmaEscolar || (exp as any).turma || '').toString().replace(/turma\s*/gi, '').trim();
    if (!etapa) return "";
    etapa = etapa.toUpperCase().replace('EDUCACAO INFANTIL', 'EI').replace('ENSINO FUNDAMENTAL', 'EF').replace('ENSINO MEDIO', 'EM');
    let result = etapa;
    const invalidClasses = ['NAO SEI', 'NÃO SEI', '', 'TURMA'];
    if (turma && !invalidClasses.includes(turma.toUpperCase())) {
      const lastChar = etapa.split(' ').pop();
      if (lastChar !== turma.toUpperCase()) result = `${etapa} ${turma.toUpperCase()}`;
    }
    return result;
  };

  const getIdentidadeForExp = (exp: AulaExperimental): IdentidadeConfig => {
    const mapping = unidadesMapping.find(m => normalizeStr(m.nome) === normalizeStr(exp.unidade));
    if (mapping) {
      const ident = identidades.find(i => normalizeStr(i.nome) === normalizeStr(mapping.identidade));
      if (ident) return ident;
    }
    const matchingTurma = turmas.find(t => normalizeStr(t.nome) === normalizeStr(exp.curso) && normalizeStr(t.unidade) === normalizeStr(exp.unidade));
    const identName = matchingTurma?.identidade || "";
    return identidades.find(i => normalizeStr(i.nome) === normalizeStr(identName)) || identidades[0] || { nome: "Padrão", webhookUrl: "", tplLembrete: "", tplFeedback: "", tplRetencao: "", tplMensagem: "", tplReagendar: "" };
  };

  const filteredExperimentais = useMemo(() => {
    const userUnits = normalizeStr(currentUser.unidade).split(',').map(u => u.trim()).filter(Boolean);
    const profNameNorm = normalizeStr(currentUser.nome || currentUser.login);
    const regenteNameNorm = normalizeStr(currentUser.nome || '');

    const getEscolaridadeWeight = (exp: AulaExperimental) => {
      const esc = formatEscolaridade(exp).toUpperCase();
      if (esc.startsWith('EI')) return 1;
      if (esc.startsWith('EF')) return 2;
      if (esc.startsWith('EM')) return 3;
      return 4;
    };

    return experimentais.filter(exp => {
      if (isRegente) {
        const escolaridadeFormatada = formatEscolaridade(exp);
        if (normalizeStr(escolaridadeFormatada) !== regenteNameNorm) return false;
      } else if (!isMaster) {
        if (isProfessor) {
          const belongsToMe = turmas.some(t => {
            const tProf = normalizeStr(t.professor).replace(/^prof\.?\s*/i, '');
            return (tProf.includes(profNameNorm) || profNameNorm.includes(tProf)) && normalizeStr(t.nome).includes(normalizeStr(exp.curso)) && normalizeStr(t.unidade) === normalizeStr(exp.unidade);
          });
          if (!belongsToMe) return false;
        } else if (userUnits.length > 0 && !userUnits.some(u => normalizeStr(exp.unidade).includes(u))) {
          return false;
        }
      }
      return !selectedDate || String(exp.aula || '').split(' ')[0] === selectedDate;
    }).sort((a, b) => {
      const weightA = getEscolaridadeWeight(a);
      const weightB = getEscolaridadeWeight(b);
      if (weightA !== weightB) return weightA - weightB;
      const escA = formatEscolaridade(a);
      const escB = formatEscolaridade(b);
      if (escA !== escB) return escA.localeCompare(escB, undefined, { numeric: true });
      return a.estudante.localeCompare(b.estudante);
    });
  }, [experimentais, selectedDate, currentUser, isProfessor, isMaster, isRegente, turmas]);

  const openComposeModal = (exp: AulaExperimental, actionType: 'lembrete' | 'feedback' | 'reagendar') => {
    if (!canSendMessage) return;
    const identity = getIdentidadeForExp(exp);
    
    let template = "";
    if (actionType === 'lembrete') template = identity.tplLembrete;
    else if (actionType === 'reagendar') template = identity.tplReagendar;
    else template = identity.tplFeedback;

    let msg = template || (actionType === 'lembrete' ? "Oi {{responsavel}}, lembrete da aula de {{aluno}} hoje!" : actionType === 'reagendar' ? "Oi {{responsavel}}, vamos reagendar a aula de {{aluno}}?" : "Oi {{responsavel}}, como foi a aula de {{aluno}}?");
    
    const primeiroNomeEstudante = exp.estudante.split(' ')[0] || "";
    
    // Substituição robusta das tags dinâmicas
    msg = msg.replace(/{{responsavel}}/gi, exp.responsavel1?.split(' ')[0] || "")
             .replace(/{{estudante}}/gi, primeiroNomeEstudante)
             .replace(/{{aluno}}/gi, primeiroNomeEstudante)
             .replace(/{{curso}}/gi, exp.curso)
             .replace(/{{unidade}}/gi, exp.unidade)
             .replace(/{{data}}/gi, formatDateBR(exp.aula.split(' ')[0]));
             
    setMessageModal({ isOpen: true, exp, message: msg, identity, actionType });
  };

  const handleSendMessage = async () => {
    if (!messageModal.exp || !messageModal.identity) return;
    setIsSending(true);
    const fone = messageModal.exp.whatsapp1?.replace(/\D/g, '');
    try {
      if (messageModal.identity.webhookUrl && fone) {
        await fetch(messageModal.identity.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ "data.contact.Phone[0]": `55${fone}`, "message": messageModal.message }) });
      } else if (fone) {
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(messageModal.message)}`, '_blank');
      }

      // DETERMINAÇÃO CORRETA DA COLUNA BASEADA NO TIPO DE AÇÃO DO MODAL
      const updatedData: Partial<AulaExperimental> = { ...messageModal.exp };
      if (messageModal.actionType === 'lembrete') updatedData.lembreteEnviado = true;
      else if (messageModal.actionType === 'reagendar') updatedData.reagendarEnviado = true;
      else updatedData.followUpSent = true;

      await onUpdate(updatedData as AulaExperimental);
      setMessageModal({ ...messageModal, isOpen: false });
    } finally { setIsSending(false); }
  };

  const handleSaveChanges = async (exp: AulaExperimental) => {
    const changes = localChanges[exp.id];
    if (!changes) return;
    setIsSavingId(exp.id);
    try { 
      await onUpdate({ ...exp, status: (changes.status as any) || exp.status, observacaoProfessor: changes.feedback !== undefined ? changes.feedback : exp.observacaoProfessor }); 
      setLocalChanges(prev => { const n = { ...prev }; delete n[exp.id]; return n; }); 
    } finally { setIsSavingId(null); }
  };

  return (
    <div className="space-y-10 animate-in fade-in pb-20 p-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Agenda Experimental</h2>
          <p className="text-slate-500 font-medium">Gestão de leads e aulas agendadas.</p>
        </div>
        <div className="w-full max-w-xs relative group">
          <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-full pl-16 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[32px] outline-none font-bold focus:border-blue-500 transition-all text-slate-700 shadow-sm" 
          />
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="px-10 py-8 bg-[#0f172a] text-white flex items-center gap-4">
          <div className="p-3 bg-blue-600/20 rounded-2xl border border-blue-500/30">
            <FlaskConical className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-[0.2em]">Agenda Experimental</h3>
        </div>

        <div className="divide-y divide-slate-50">
          {filteredExperimentais.length > 0 ? filteredExperimentais.map(exp => {
            const currentStatus = localChanges[exp.id]?.status || exp.status;
            const avatarColor = getExperimentalAvatarColor(exp, currentStatus);
            const unitBadge = getUnidadeBadgeStyle(exp.unidade);
            const escolaridade = formatEscolaridade(exp);

            return (
              <div key={exp.id} className="group transition-all">
                <div className="p-10 flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                  <div className="flex items-center gap-8 flex-1">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg shrink-0 transition-colors duration-500 ${avatarColor}`}>
                      {exp.estudante.charAt(0)}
                    </div>
                    <div className="space-y-3 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h4 className="text-2xl font-bold text-slate-800 leading-tight uppercase truncate">{exp.estudante}</h4>
                        {exp.convertido && (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase flex items-center gap-1">
                            <Check className="w-2.5 h-2.5" /> Matriculado
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 shadow-sm ${unitBadge}`}>
                          <MapPin className="w-3 h-3" /> {exp.unidade}
                        </span>
                        {escolaridade && (
                          <span className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                            <GraduationCap className="w-3 h-3" /> {escolaridade}
                          </span>
                        )}
                        <span className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                          <BookOpen className="w-3 h-3" /> {exp.curso}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <button 
                      onClick={() => openComposeModal(exp, 'lembrete')} 
                      disabled={exp.lembreteEnviado || !canSendMessage} 
                      className="px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase border-2 border-amber-400 text-amber-500 bg-white hover:bg-amber-50 transition-all flex items-center gap-2 shadow-sm disabled:opacity-30 disabled:grayscale"
                    >
                      <Bell className="w-4 h-4" /> Lembrete
                    </button>

                    <button 
                      onClick={() => isProfessor && setLocalChanges(prev => ({ ...prev, [exp.id]: { ...prev[exp.id], status: 'Presente' }}))} 
                      className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${
                        currentStatus === 'Presente' 
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' 
                          : 'bg-white border-slate-100 text-slate-300 hover:border-emerald-200'
                      }`}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </button>

                    <button 
                      onClick={() => isProfessor && setLocalChanges(prev => ({ ...prev, [exp.id]: { ...prev[exp.id], status: 'Ausente' }}))} 
                      className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${
                        currentStatus === 'Ausente' 
                          ? 'bg-rose-500 border-rose-500 text-white shadow-lg' 
                          : 'bg-white border-slate-100 text-slate-300 hover:border-rose-200'
                      }`}
                    >
                      <XCircle className="w-6 h-6" />
                    </button>

                    <button 
                      onClick={() => setExpandedId(expandedId === exp.id ? null : exp.id)} 
                      className="bg-[#0f172a] text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                      Detalhes {expandedId === exp.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedId === exp.id && (
                  <div className="px-10 pb-12 space-y-8 animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-slate-50 p-10 rounded-[32px] border-2 border-slate-100 space-y-6">
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Feedback do Professor</p>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                      <textarea 
                        readOnly={!isProfessor} 
                        value={localChanges[exp.id]?.feedback ?? exp.observacaoProfessor} 
                        onChange={e => setLocalChanges(p => ({ ...p, [exp.id]: { ...p[exp.id], feedback: e.target.value }}))} 
                        placeholder="Nenhum feedback registrado..."
                        className="w-full bg-white border-2 border-slate-100 rounded-[24px] p-8 text-sm font-medium h-32 outline-none focus:border-blue-500 transition-all resize-none shadow-inner" 
                      />
                      {isProfessor && localChanges[exp.id] && (
                        <button 
                          onClick={() => handleSaveChanges(exp)} 
                          disabled={isSavingId === exp.id} 
                          className="w-full bg-[#0f172a] text-white py-6 rounded-[24px] font-black text-sm uppercase flex items-center justify-center gap-3 shadow-xl active:scale-95"
                        >
                          {isSavingId === exp.id ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-5 h-5" />} SALVAR ALTERAÇÕES
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <button 
                        onClick={() => openComposeModal(exp, 'feedback')} 
                        disabled={exp.followUpSent || !canSendMessage} 
                        className="bg-emerald-600 text-white py-6 rounded-[24px] font-black text-sm uppercase flex items-center justify-center gap-4 shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
                      >
                        <MessageCircle className="w-6 h-6 fill-current" /> Enviar Feedback Whatsapp
                      </button>
                      
                      {!exp.convertido && exp.status === 'Ausente' && (
                        <button 
                          onClick={() => openComposeModal(exp, 'reagendar')} 
                          disabled={exp.reagendarEnviado || !canSendMessage}
                          className="bg-amber-500 text-white py-6 rounded-[24px] font-black text-sm uppercase flex items-center justify-center gap-4 shadow-xl hover:bg-amber-600 transition-all disabled:opacity-50"
                        >
                          <RotateCcw className="w-6 h-6" /> Propor Reagendamento
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="py-32 text-center flex flex-col items-center gap-6">
              <Search className="w-16 h-16 text-slate-100" />
              <p className="text-slate-300 font-black uppercase text-sm tracking-[0.2em]">Nenhum agendamento para este dia.</p>
            </div>
          )}
        </div>
      </div>

      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[44px] shadow-2xl p-12 border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black tracking-tight uppercase text-slate-800 leading-none">Disparar CRM</h3>
            </div>
            <div className="mb-6 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">IDENTIDADE DE CANAL</p>
              <p className="text-xs font-black text-blue-600 uppercase">{messageModal.identity?.nome || 'PADRÃO'}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">TIPO: {messageModal.actionType.toUpperCase()}</p>
            </div>
            <textarea 
              value={messageModal.message} 
              onChange={e => setMessageModal({...messageModal, message: e.target.value})} 
              className="w-full p-8 bg-slate-50 border-2 border-slate-100 rounded-[32px] h-48 mb-10 font-medium text-sm outline-none resize-none shadow-inner focus:border-blue-500 transition-all" 
            />
            <button 
              onClick={handleSendMessage} 
              disabled={isSending} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-[28px] font-black text-sm flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 shadow-emerald-600/20"
            >
              {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current" />} ENVIAR WHATSAPP
            </button>
            <button 
              onClick={() => setMessageModal({...messageModal, isOpen: false})} 
              className="w-full mt-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              FECHAR JANELA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AulasExperimentais;
