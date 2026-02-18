
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
  Phone
} from 'lucide-react';
import { Aluno, Turma, Matricula, Usuario, IdentidadeConfig, UnidadeMapping } from '../types';

const getUnidadeStyle = (unidade: string) => {
  const u = String(unidade || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (u.includes('AKA')) return 'bg-blue-600/10 text-blue-600 border-blue-200/50';
  if (u.includes('BUNNY')) return 'bg-purple-600/10 text-purple-600 border-purple-200/50';
  if (u.includes('LICEU')) return 'bg-emerald-600/10 text-emerald-700 border-emerald-200/50';
  if (u.includes('PEDRINHO')) return 'bg-amber-600/10 text-amber-700 border-amber-200/50';
  if (u.includes('OFICINA')) return 'bg-rose-600/10 text-rose-600 border-red-200/50';
  return 'bg-slate-600/10 text-slate-500 border-slate-200/50';
};

interface DadosAlunosProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  user: Usuario;
  identidades: IdentidadeConfig[];
  unidadesMapping: UnidadeMapping[];
}

const DadosAlunos: React.FC<DadosAlunosProps> = ({ alunos, turmas, matriculas, user, identidades = [], unidadesMapping = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; aluno: Aluno | null; phone: string; responsavel: string; message: string; identity?: IdentidadeConfig }>({ isOpen: false, aluno: null, phone: '', responsavel: '', message: '' });

  const normalize = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();
  const isMaster = user.nivel === 'Gestor Master' || user.nivel === 'Start' || normalize(user.unidade) === 'todas';

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

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr || dateStr === "") return '--/--/--';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
    return dateStr;
  };

  const formatEscolaridade = (aluno: Aluno) => {
    let etapa = (aluno.etapa || '').trim();
    let turma = (aluno.turmaEscolar || '').toString().replace(/turma\s*/gi, '').trim();

    if (!etapa) return "--";

    etapa = etapa.toUpperCase()
      .replace('EDUCACAO INFANTIL', 'EI')
      .replace('ENSINO FUNDAMENTAL', 'EF')
      .replace('ENSINO MEDIO', 'EM');

    let result = etapa;
    
    const invalidClasses = ['NAO SEI', 'NÃO SEI', '', 'TURMA'];
    if (turma && !invalidClasses.includes(turma.toUpperCase())) {
      const lastChar = etapa.split(' ').pop();
      if (lastChar !== turma.toUpperCase()) {
        result = `${etapa} ${turma.toUpperCase()}`;
      }
    }
    
    return result;
  };

  return (
    <div className="space-y-12 animate-in fade-in pb-20 p-12">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10">
        <div>
          <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Estudantes</h2>
          <p className="text-slate-500 font-medium">Unidade de inteligência e base cadastral.</p>
        </div>
        
        <div className="flex-1 flex flex-col md:flex-row gap-6 max-w-4xl w-full">
          <div className="flex-1 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por Nome..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full pl-16 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[32px] outline-none font-bold focus:border-blue-500 transition-all text-slate-700 shadow-sm" 
            />
          </div>
          <div className="flex-1 relative group">
            <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por Telefone..." 
              value={searchPhone} 
              onChange={e => setSearchPhone(e.target.value)} 
              className="w-full pl-16 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[32px] outline-none font-bold focus:border-blue-500 transition-all text-slate-700 shadow-sm" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {filteredAlunos.map(aluno => {
          const isActive = aluno.statusMatricula === 'Ativo';
          const unitStyle = getUnidadeStyle(aluno.unidade);
          const activeCourses = matriculas.filter(m => m.alunoId === aluno.id);
          const historyExits = aluno.cursosCanceladosDetalhes || [];
          
          const lastCancellationDate = !isActive 
            ? (historyExits.length > 0 
                ? [...historyExits].sort((a, b) => (b.dataCancelamento || "").localeCompare(a.dataCancelamento || ""))[0].dataCancelamento 
                : aluno.dataCancelamento)
            : null;

          return (
            <div key={aluno.id} className="bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm flex flex-col gap-10 hover:shadow-xl transition-all duration-300">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-8">
                  <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center font-black text-4xl text-white shadow-lg ${isActive ? 'bg-blue-600' : 'bg-slate-400'}`}>
                    {aluno.nome.charAt(0)}
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-slate-800 leading-tight uppercase">{aluno.nome}</h3>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border flex items-center gap-1.5 shadow-sm ${unitStyle}`}>
                        <MapPin className="w-3 h-3" /> {aluno.unidade}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm ${isActive ? 'bg-blue-600/10 text-blue-600 border-blue-200/50' : 'bg-red-600/10 text-red-600 border-red-200/50'}`}>
                          {isActive ? 'ATIVO' : 'CANCELADO'}
                        </span>
                        {(isActive && aluno.dataMatricula) && (
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                            DESDE {formatDate(aluno.dataMatricula)}
                          </span>
                        )}
                        {(!isActive && lastCancellationDate) && (
                          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                            EM {formatDate(lastCancellationDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <button className="p-4 bg-slate-50 text-slate-300 rounded-[20px] hover:bg-slate-100 hover:text-blue-500 transition-all border border-slate-100 shadow-sm">
                  <Edit2 className="w-5 h-5" />
                </button>
              </div>

              {/* Main Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {/* Column 1: Info */}
                <div className="space-y-8">
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ESCOLARIDADE</p>
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                      <BookOpen className="w-4 h-4 text-blue-500" /> {formatEscolaridade(aluno)}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">NASCIMENTO</p>
                    <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                      <Calendar className="w-4 h-4 text-blue-500" /> {formatDate(aluno.dataNascimento)}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">E-MAIL</p>
                    <div className="flex items-center gap-3 text-blue-600 font-semibold text-sm truncate">
                      <Mail className="w-4 h-4" /> {aluno.email || '--'}
                    </div>
                  </div>
                </div>

                {/* Column 2: Contacts */}
                <div className="space-y-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">GESTÃO DE CONTATOS</p>
                  
                  {/* Resp 1 */}
                  <div className="bg-slate-50/50 p-6 rounded-[28px] border border-slate-100 space-y-2 group hover:border-emerald-200 transition-all shadow-inner">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">{aluno.responsavel1 || 'RESPONSÁVEL 1'}</p>
                    <button 
                      onClick={() => aluno.whatsapp1 && openMessageModal(aluno, aluno.whatsapp1, aluno.responsavel1 || aluno.nome)}
                      className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 fill-emerald-600/10" /> {aluno.whatsapp1 || '--'}
                    </button>
                  </div>

                  {/* Resp 2 */}
                  <div className="bg-slate-50/50 p-6 rounded-[28px] border border-slate-100 space-y-2 group hover:border-emerald-200 transition-all shadow-inner">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter truncate">{aluno.responsavel2 || 'RESPONSÁVEL 2'}</p>
                    <button 
                      onClick={() => aluno.whatsapp2 && openMessageModal(aluno, aluno.whatsapp2, aluno.responsavel2 || aluno.nome)}
                      className="flex items-center gap-2 text-emerald-600 font-bold text-sm hover:text-emerald-700 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4 fill-emerald-600/10" /> {aluno.whatsapp2 || '--'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Course Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-10 border-t border-slate-50">
                {/* Active Courses */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">
                    <CheckCircle className="w-4 h-4" /> CURSOS ATIVOS
                  </div>
                  {activeCourses.length > 0 ? (
                    <div className="space-y-3">
                      {activeCourses.map((m, idx) => {
                        const turma = turmas.find(t => t.id === m.turmaId);
                        return (
                          <div key={idx} className="bg-blue-600/5 p-6 rounded-[24px] border border-blue-100/50 group hover:bg-blue-600/10 transition-all">
                            <p className="font-bold text-slate-800 uppercase text-xs mb-1">{turma?.nome || m.turmaId.split('-')[0]}</p>
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-tighter flex items-center gap-1.5">
                              <History className="w-2.5 h-2.5" /> INÍCIO: {formatDate(m.dataMatricula)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">NENHUM CURSO ATIVO.</p>
                  )}
                </div>

                {/* Exits History */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">
                    <AlertCircle className="w-4 h-4" /> HISTÓRICO DE SAÍDAS
                  </div>
                  {historyExits.length > 0 ? (
                    <div className="space-y-3">
                      {historyExits.map((c, idx) => (
                        <div key={idx} className="bg-red-600/5 p-6 rounded-[24px] border border-red-100/50 group hover:bg-red-600/10 transition-all">
                          <p className="font-bold text-slate-800 uppercase text-xs mb-2">{c.nome}</p>
                          <div className="flex items-center gap-4">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">MAT: {formatDate(c.dataMatricula)}</p>
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-tighter">CAN: {formatDate(c.dataCancelamento)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest">NENHUMA SAÍDA REGISTRADA.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Modal */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[44px] shadow-2xl p-12 border border-slate-100">
            <h3 className="text-2xl font-black tracking-tight mb-8 uppercase text-slate-800">Mensagem CRM</h3>
            <div className="mb-6 space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">IDENTIDADE DE CANAL</p>
              <p className="text-xs font-black text-blue-600 uppercase">{messageModal.identity?.nome || 'PADRÃO'}</p>
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

export default DadosAlunos;
