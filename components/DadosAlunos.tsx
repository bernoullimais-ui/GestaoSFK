
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  History, 
  Edit2, 
  BookOpen, 
  Calendar, 
  Mail, 
  MessageCircle, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Loader2,
  X,
  XCircle,
  Phone,
  Users,
  UserCheck,
  UserMinus,
  ArrowRight,
  ExternalLink,
  Info,
  Clock,
  Save,
  Tag,
  GraduationCap,
  UserX
} from 'lucide-react';
import { Aluno, Turma, Matricula, Usuario, IdentidadeConfig, UnidadeMapping } from '../types';

const getUnidadeStyle = (unidade: string) => {
  const u = String(unidade || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (u.includes('AKA')) return 'bg-blue-50 text-blue-600 border-blue-100';
  if (u.includes('BUNNY')) return 'bg-purple-50 text-purple-600 border-purple-100';
  if (u.includes('LICEU')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  if (u.includes('PEDRINHO')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (u.includes('OFICINA')) return 'bg-rose-50 text-rose-600 border-rose-100';
  return 'bg-slate-50 text-slate-500 border-slate-100';
};

interface DadosAlunosProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  user: Usuario;
  identidades: IdentidadeConfig[];
  unidadesMapping: UnidadeMapping[];
  onUpdateAluno?: (updated: Aluno, originalNome: string, originalUnidade: string, targetCurso?: string) => Promise<void>;
}

const DadosAlunos: React.FC<DadosAlunosProps> = ({ alunos, turmas, matriculas, user, identidades = [], unidadesMapping = [], onUpdateAluno }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; aluno: Aluno | null; phone: string; responsavel: string; message: string; identity?: IdentidadeConfig }>({ isOpen: false, aluno: null, phone: '', responsavel: '', message: '' });
  const [editModal, setEditModal] = useState<{ isOpen: boolean; aluno: Aluno | null; originalNome: string; originalUnidade: string }>({ isOpen: false, aluno: null, originalNome: '', originalUnidade: '' });
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; aluno: Aluno | null; dataCancelamento: string; selectedMatriculaId: string }>({ isOpen: false, aluno: null, dataCancelamento: new Date().toISOString().split('T')[0], selectedMatriculaId: '' });

  const normalize = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();
  const isMaster = user.nivel === 'Gestor Master' || user.nivel === 'Start' || normalize(user.unidade) === 'todas';
  const canEdit = user.nivel === 'Gestor Master' || user.nivel === 'Start' || user.nivel === 'Gestor Administrativo';

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr || dateStr === "" || dateStr === "null") return '--/--/--';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
    return dateStr;
  };

  const getIdentidadeForAluno = (aluno: Aluno): IdentidadeConfig => {
    const unitNorm = normalize(aluno.unidade);
    const mapping = unidadesMapping.find(m => {
      const mNameNorm = normalize(m.nome);
      return unitNorm.includes(mNameNorm) || mNameNorm.includes(unitNorm);
    });
    if (mapping) {
      const ident = identidades.find(i => normalize(i.nome) === normalize(mapping.identidade));
      if (ident) return ident;
    }
    const firstMat = matriculas.find(m => m.alunoId === aluno.id);
    const matchingTurma = firstMat ? turmas.find(t => t.id === firstMat.turmaId) : turmas.find(t => normalize(t.unidade) === unitNorm);
    const identName = matchingTurma?.identidade || "";
    return identidades.find(i => normalize(i.nome) === normalize(identName)) || identidades[0] || { nome: "Padrão", webhookUrl: "", tplLembrete: "", tplFeedback: "", tplRetencao: "", tplMensagem: "", tplReagendar: "" };
  };

  const openMessageModal = (aluno: Aluno, phone: string, responsavel: string) => {
    const identity = getIdentidadeForAluno(aluno);
    let msg = identity.tplMensagem || "Olá {{responsavel}}, gostaríamos de falar sobre {{estudante}}.";
    msg = msg.replace(/{{responsavel}}/gi, responsavel.split(' ')[0])
             .replace(/{{estudante}}/gi, aluno.nome.split(' ')[0])
             .replace(/{{unidade}}/gi, aluno.unidade);
    setMessageModal({ isOpen: true, aluno, phone, responsavel, message: msg, identity });
  };

  const handleSendMessage = async () => {
    if (!messageModal.identity) return;
    setIsSending(true);
    const fone = messageModal.phone.replace(/\D/g, '');
    try {
      if (messageModal.identity.webhookUrl && fone) {
        await fetch(messageModal.identity.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ "data.contact.Phone[0]": `55${fone}`, "message": messageModal.message }) });
      } else if (fone) {
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(messageModal.message)}`, '_blank');
      }
      setMessageModal({ ...messageModal, isOpen: false });
    } finally { setIsSending(false); }
  };

  const openEditModal = (aluno: Aluno) => {
    setEditModal({ isOpen: true, aluno: { ...aluno }, originalNome: aluno.nome, originalUnidade: aluno.unidade });
  };

  const openCancelModal = (aluno: Aluno) => {
    const activeMats = matriculas.filter(m => m.alunoId === aluno.id);
    setCancelModal({ 
      isOpen: true, 
      aluno, 
      dataCancelamento: new Date().toISOString().split('T')[0],
      selectedMatriculaId: activeMats.length > 0 ? activeMats[0].turmaId : ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal.aluno || !onUpdateAluno) return;
    setIsSaving(true);
    try {
      await onUpdateAluno(editModal.aluno, editModal.originalNome, editModal.originalUnidade);
      setEditModal({ ...editModal, isOpen: false });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal.aluno || !onUpdateAluno || !cancelModal.selectedMatriculaId) return;
    setIsSaving(true);
    try {
      // O targetCurso é o nome original do curso na linha (extraído do id da turma/matricula)
      const targetCurso = cancelModal.selectedMatriculaId.split('-')[0].trim();
      
      const updatedAluno = { 
        ...cancelModal.aluno, 
        statusMatricula: 'Cancelado', 
        dataCancelamento: cancelModal.dataCancelamento 
      };
      
      await onUpdateAluno(updatedAluno, cancelModal.aluno.nome, cancelModal.aluno.unidade, targetCurso);
      setCancelModal({ ...cancelModal, isOpen: false });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAlunos = useMemo(() => {
    const userUnits = normalize(user.unidade).split(',').map(u => u.trim()).filter(Boolean);
    const phoneFilter = searchPhone.replace(/\D/g, '');

    return alunos.filter(a => {
      if (!isMaster && !userUnits.some(u => normalize(a.unidade).includes(u))) return false;
      const matchesName = a.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const studentPhone1 = (a.whatsapp1 || '').replace(/\D/g, '');
      const studentPhone2 = (a.whatsapp2 || '').replace(/\D/g, '');
      const matchesPhone = !phoneFilter || studentPhone1.includes(phoneFilter) || studentPhone2.includes(phoneFilter);
      return matchesName && matchesPhone;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, searchTerm, searchPhone, isMaster, user.unidade]);

  const stats = useMemo(() => {
    return {
      total: filteredAlunos.length,
      ativos: filteredAlunos.filter(a => a.statusMatricula === 'Ativo').length,
      cancelados: filteredAlunos.filter(a => a.statusMatricula !== 'Ativo').length
    };
  }, [filteredAlunos]);

  const formatEscolaridade = (aluno: Aluno) => {
    let etapa = (aluno.etapa || '').trim();
    let turma = (aluno.turmaEscolar || '').toString().replace(/turma\s*/gi, '').trim();
    if (!etapa) return "--";
    etapa = etapa.toUpperCase().replace('EDUCACAO INFANTIL', 'EI').replace('ENSINO FUNDAMENTAL', 'EF').replace('ENSINO MEDIO', 'EM');
    let result = etapa;
    const invalidClasses = ['NAO SEI', 'NÃO SEI', '', 'TURMA'];
    if (turma && !invalidClasses.includes(turma.toUpperCase())) {
      const lastChar = etapa.split(' ').pop();
      if (lastChar !== turma.toUpperCase()) result = `${etapa} ${turma.toUpperCase()}`;
    }
    return result;
  };

  return (
    <div className="space-y-10 animate-in fade-in pb-24">
      {/* Top Banner & Stats */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Base de Estudantes</h2>
          <p className="text-slate-500 font-medium">Gestão centralizada de cadastros e históricos.</p>
        </div>
        
        <div className="grid grid-cols-3 gap-4 w-full xl:w-auto">
          <div className="bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span className="text-xl font-black text-slate-800">{stats.total}</span>
            </div>
          </div>
          <div className="bg-emerald-50 px-6 py-4 rounded-3xl border border-emerald-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ativos</p>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-xl font-black text-emerald-700">{stats.ativos}</span>
            </div>
          </div>
          <div className="bg-rose-50 px-6 py-4 rounded-3xl border border-rose-100 shadow-sm">
            <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-widest mb-1">Saídas</p>
            <div className="flex items-center gap-2">
              <UserMinus className="w-4 h-4 text-rose-600" />
              <span className="text-xl font-black text-rose-700">{stats.cancelados}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar Unificada */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar pelo nome do estudante..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-500 transition-all text-slate-700" 
            />
          </div>
          <div className="md:w-64 relative group">
            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Filtrar fone..." 
              value={searchPhone} 
              onChange={e => setSearchPhone(e.target.value)} 
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-500 transition-all text-slate-700" 
            />
          </div>
        </div>
      </div>

      {/* Grid de Alunos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredAlunos.length > 0 ? filteredAlunos.map(aluno => {
          const isActive = aluno.statusMatricula === 'Ativo';
          const unitStyle = getUnidadeStyle(aluno.unidade);
          const activeCourses = matriculas.filter(m => m.alunoId === aluno.id);
          const historyExits = aluno.cursosCanceladosDetalhes || [];
          
          return (
            <div key={aluno.id} className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 group">
              {/* Header do Card */}
              <div className="p-8 pb-0 flex items-start justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center font-black text-3xl text-white shadow-lg shrink-0 transition-transform group-hover:scale-105 ${isActive ? 'bg-indigo-600' : 'bg-slate-400'}`}>
                    {aluno.nome.charAt(0)}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <h3 className="text-xl font-black text-slate-800 uppercase truncate leading-tight tracking-tight">{aluno.nome}</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${unitStyle}`}>
                        {aluno.unidade}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border shadow-sm ${isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                          {isActive ? 'ATIVO' : 'CANCELADO'}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                           <Clock className="w-2.5 h-2.5" />
                           {isActive ? (aluno.dataMatricula ? `Desde ${formatDate(aluno.dataMatricula)}` : '--/--/--') : (aluno.dataCancelamento ? `Em ${formatDate(aluno.dataCancelamento)}` : '--/--/--')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    {activeCourses.length > 0 && (
                      <button 
                        onClick={() => openCancelModal(aluno)}
                        className="p-3 bg-rose-50 text-rose-300 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                        title="Cancelar Matrícula Específica"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => openEditModal(aluno)}
                      className="p-3 bg-slate-50 text-slate-300 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      title="Editar Cadastro"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Grid de Info */}
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Dados Cadastrais */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500"><BookOpen className="w-4 h-4"/></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Escolaridade</p>
                      <p className="text-xs font-bold text-slate-700">{formatEscolaridade(aluno)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500"><Calendar className="w-4 h-4"/></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nascimento</p>
                      <p className="text-xs font-bold text-slate-700">{formatDate(aluno.dataNascimento)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500"><Mail className="w-4 h-4"/></div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{aluno.email || '--'}</p>
                    </div>
                  </div>
                </div>

                {/* Contatos Rápidos */}
                <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Contatos CRM</p>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={() => aluno.whatsapp1 && openMessageModal(aluno, aluno.whatsapp1, aluno.responsavel1 || aluno.nome)}
                      className="w-full flex items-center justify-between group/btn"
                    >
                      <div className="text-left min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase truncate">{aluno.responsavel1 || 'Resp. 1'}</p>
                        <p className="text-xs font-black text-emerald-600">{aluno.whatsapp1 || '--'}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100 text-emerald-500 shadow-sm group-hover/btn:bg-emerald-500 group-hover/btn:text-white transition-all">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                    </button>

                    <button 
                      onClick={() => aluno.whatsapp2 && openMessageModal(aluno, aluno.whatsapp2, aluno.responsavel2 || aluno.nome)}
                      className="w-full flex items-center justify-between group/btn"
                    >
                      <div className="text-left min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase truncate">{aluno.responsavel2 || 'Resp. 2'}</p>
                        <p className="text-xs font-black text-emerald-600">{aluno.whatsapp2 || '--'}</p>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100 text-emerald-500 shadow-sm group-hover/btn:bg-emerald-500 group-hover/btn:text-white transition-all">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Rodapé de Histórico */}
              <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-blue-500" /> Matrículas Ativas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {activeCourses.length > 0 ? activeCourses.map((m, i) => (
                      <span key={i} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase shadow-sm flex items-center gap-2">
                        {turmas.find(t => t.id === m.turmaId)?.nome || m.turmaId.split('-')[0]}
                        <span className="text-[8px] text-slate-300 font-bold">({formatDate(m.dataMatricula)})</span>
                      </span>
                    )) : (
                      <span className="text-[9px] font-bold text-slate-300 uppercase italic">Nenhuma matrícula ativa</span>
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-rose-500" /> Histórico de Saídas
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {historyExits.length > 0 ? historyExits.slice(0, 3).map((c, i) => (
                      <span key={i} className="px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg text-[9px] font-black text-rose-600 uppercase shadow-sm flex items-center gap-2">
                        {c.nome}
                        <span className="text-[8px] text-rose-300 font-bold">({formatDate(c.dataCancelamento)})</span>
                      </span>
                    )) : (
                      <span className="text-[9px] font-bold text-slate-300 uppercase italic">Sem saídas recentes</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-40 bg-slate-50 border-4 border-dashed border-slate-200 rounded-[60px] flex flex-col items-center justify-center gap-6">
            <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100">
              <Search className="w-10 h-10 text-slate-200" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xl font-black text-slate-400 uppercase tracking-tighter">Nenhum estudante localizado</p>
              <p className="text-slate-300 text-sm font-bold uppercase tracking-widest">Ajuste os filtros de busca para tentar novamente.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Cancelamento Estudante */}
      {cancelModal.isOpen && cancelModal.aluno && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                <UserMinus className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black tracking-tight uppercase text-slate-800 leading-none">Cancelar Matrícula</h3>
            </div>
            
            <div className="mb-8 space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ESTUDANTE</p>
              <p className="text-lg font-black text-slate-800 uppercase leading-tight">{cancelModal.aluno.nome}</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Selecionar Curso para Cancelar</label>
                <select 
                  value={cancelModal.selectedMatriculaId}
                  onChange={e => setCancelModal({ ...cancelModal, selectedMatriculaId: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-rose-500 outline-none transition-all"
                >
                  {matriculas.filter(m => m.alunoId === cancelModal.aluno!.id).map(m => {
                    const t = turmas.find(t => t.id === m.turmaId);
                    const nomeExibicao = t ? `${t.nome} (${t.horario})` : m.turmaId.split('-')[0].trim();
                    return <option key={m.turmaId} value={m.turmaId}>{nomeExibicao}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Data do Cancelamento</label>
                <input 
                  type="date" 
                  value={cancelModal.dataCancelamento} 
                  onChange={e => setCancelModal({ ...cancelModal, dataCancelamento: e.target.value })} 
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-rose-500 outline-none transition-all" 
                />
              </div>

              <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100">
                <p className="text-[10px] text-rose-700 font-bold leading-relaxed uppercase">
                  Atenção: Apenas o curso selecionado será marcado como "Cancelado" na planilha.
                </p>
              </div>
            </div>

            <button 
              onClick={handleConfirmCancel} 
              disabled={isSaving || !cancelModal.selectedMatriculaId} 
              className="w-full bg-rose-600 hover:bg-rose-700 text-white py-6 rounded-3xl font-black text-sm flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 shadow-rose-600/20 mt-10"
            >
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <XCircle className="w-6 h-6" />} CONFIRMAR CANCELAMENTO
            </button>
            <button 
              onClick={() => setCancelModal({...cancelModal, isOpen: false})} 
              className="w-full mt-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              VOLTAR
            </button>
          </div>
        </div>
      )}

      {/* Modal Edição Estudante (Existente) */}
      {editModal.isOpen && editModal.aluno && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl p-10 border border-slate-100 my-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Edit2 className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black tracking-tight uppercase text-slate-800 leading-none">Editar Estudante</h3>
              </div>
              <button onClick={() => setEditModal({...editModal, isOpen: false})} className="p-2 text-slate-300 hover:text-slate-500"><X /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Nome Completo</label>
                  <input type="text" value={editModal.aluno.nome} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, nome: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Unidade</label>
                  <select value={editModal.aluno.unidade} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, unidade: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-blue-500 outline-none">
                    {unidadesMapping.map(u => <option key={u.nome} value={u.nome}>{u.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Data Nascimento</label>
                  <input type="date" value={editModal.aluno.dataNascimento} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, dataNascimento: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">E-mail</label>
                  <input type="email" value={editModal.aluno.email || ''} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, email: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm focus:border-blue-500 outline-none" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Responsável 1</label>
                    <input type="text" value={editModal.aluno.responsavel1 || ''} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, responsavel1: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">WhatsApp 1</label>
                    <input type="text" value={editModal.aluno.whatsapp1 || ''} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, whatsapp1: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Responsável 2</label>
                    <input type="text" value={editModal.aluno.responsavel2 || ''} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, responsavel2: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">WhatsApp 2</label>
                    <input type="text" value={editModal.aluno.whatsapp2 || ''} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, whatsapp2: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Etapa Escolar</label>
                    <input type="text" value={editModal.aluno.etapa || ''} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, etapa: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Turma Escolar</label>
                    <input type="text" value={editModal.aluno.turmaEscolar || ''} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, turmaEscolar: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Status Matrícula</label>
                  <select value={editModal.aluno.statusMatricula} onChange={e => setEditModal({ ...editModal, aluno: { ...editModal.aluno!, statusMatricula: e.target.value }})} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm">
                    <option value="Ativo">Ativo</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveEdit} 
              disabled={isSaving} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-3xl font-black text-sm flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 shadow-blue-600/20 mt-10"
            >
              {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />} SALVAR ALTERAÇÕES
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp Modal - Padronizado */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl p-10 border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black tracking-tight uppercase text-slate-800 leading-none">Mensagem CRM</h3>
            </div>
            <div className="mb-6 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IDENTIDADE DE CANAL</p>
              <p className="text-xs font-black text-blue-600 uppercase">{messageModal.identity?.nome || 'PADRÃO'}</p>
            </div>
            <textarea 
              value={messageModal.message} 
              onChange={e => setMessageModal({...messageModal, message: e.target.value})} 
              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[24px] h-40 mb-8 font-medium text-sm outline-none resize-none shadow-inner focus:border-blue-500 transition-all" 
            />
            <button 
              onClick={handleSendMessage} 
              disabled={isSending} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-4 transition-all shadow-xl active:scale-95 shadow-emerald-600/20"
            >
              {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current" />} DISPARAR AGORA
            </button>
            <button 
              onClick={() => setMessageModal({...messageModal, isOpen: false})} 
              className="w-full mt-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DadosAlunos;
