
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Phone, 
  Mail, 
  BookOpen, 
  CheckCircle, 
  MessageCircle,
  Calendar,
  Send,
  Loader2,
  Users,
  MapPin,
  Edit2,
  Trash2,
  AlertTriangle,
  User,
  CheckCircle2,
  History,
  AlertCircle
} from 'lucide-react';
import { Aluno, Turma, Matricula, Usuario } from '../types';

interface DadosAlunosProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  user: Usuario;
  whatsappConfig?: { url: string; token: string; };
  msgTemplate?: string;
}

const DadosAlunos: React.FC<DadosAlunosProps> = ({ alunos, turmas, matriculas, user, whatsappConfig, msgTemplate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; aluno: Aluno | null; phone: string; responsavel: string; }>({ isOpen: false, aluno: null, phone: '', responsavel: '' });
  const [customMessage, setCustomMessage] = useState('');

  const normalize = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const isMaster = user.nivel === 'Gestor Master' || user.nivel === 'Start' || normalize(user.unidade) === 'todas';

  const cleanName = (name: string) => {
    if (!name) return "";
    // Remove o espaço anterior e o conteúdo entre parênteses
    return name.replace(/\s*\(.*/, '').trim();
  };

  const parseDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return null;
    try {
      let s = String(dateVal).trim().toLowerCase();
      const ptMonths: Record<string, number> = {
        jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
        jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
      };
      const ptMatch = s.match(/(\d{1,2})\s+de\s+([a-z]{3})[^\s]*\s+de\s+(\d{4})/);
      if (ptMatch) return new Date(parseInt(ptMatch[3]), ptMonths[ptMatch[2]] || 0, parseInt(ptMatch[1]));
      const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dmy) return new Date(parseInt(dmy[3]) < 100 ? 2000 + parseInt(dmy[3]) : parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
      const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
  };

  const formatStrictDate = (dateVal: any) => {
    const date = parseDate(dateVal);
    if (!date) return '--/--/--';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).substring(2)}`;
  };

  const getStatusDisplayDate = (aluno: Aluno, status: string) => {
    if (status === 'Ativo') {
      const dates = [parseDate(aluno.dataMatricula)];
      (aluno.cursosCanceladosDetalhes || []).forEach(c => dates.push(parseDate(c.dataMatricula)));
      const validDates = dates.filter(d => d !== null) as Date[];
      if (validDates.length === 0) return '--/--/--';
      const firstMat = new Date(Math.min(...validDates.map(d => d.getTime())));
      return formatStrictDate(firstMat);
    } else {
      const dates = [parseDate(aluno.dataCancelamento)];
      (aluno.cursosCanceladosDetalhes || []).forEach(c => dates.push(parseDate(c.dataCancelamento)));
      const validDates = dates.filter(d => d !== null) as Date[];
      if (validDates.length === 0) return '--/--/--';
      const lastCanc = new Date(Math.max(...validDates.map(d => d.getTime())));
      return formatStrictDate(lastCanc);
    }
  };

  const formatPhoneDisplay = (phone: string | undefined) => {
    if (!phone || phone.includes('ERROR')) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    if (digits.length === 10) return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    return phone;
  };

  const filteredAlunos = useMemo(() => {
    const userUnits = normalize(user.unidade).split(',').map(u => u.trim()).filter(Boolean);
    return alunos.filter(a => {
      if (!isMaster) {
        const studentUnit = normalize(a.unidade);
        const hasPermission = userUnits.some(u => studentUnit.includes(u) || u.includes(studentUnit));
        if (!hasPermission) return false;
      }
      const matchesName = a.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPhone = !phoneFilter || (a.whatsapp1 || '').replace(/\D/g, '').includes(phoneFilter.replace(/\D/g, '')) || (a.whatsapp2 || '').replace(/\D/g, '').includes(phoneFilter.replace(/\D/g, ''));
      return matchesName && matchesPhone;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, searchTerm, phoneFilter, isMaster, user.unidade]);

  const formatEscolaridade = (aluno: Aluno) => {
    const e = (aluno.etapa || '').toUpperCase();
    const a = (aluno.anoEscolar || '').toUpperCase();
    const t = (aluno.turmaEscolar || '').toUpperCase();
    let res = e.includes('INFANTIL') ? 'EI' : e.includes('FUNDAMENTAL') ? 'EF' : e.includes('MEDIO') ? 'EM' : e;
    if (a) res += `-${a}`;
    if (t && t !== 'NÃO SEI') res += ` ${t}`;
    return res || '--';
  };

  const openMessageModal = (aluno: Aluno, phone: string, responsavel: string) => {
    const pNomeEst = aluno.nome.split(' ')[0];
    const pNomeResp = responsavel.split(' ')[0];
    const msg = (msgTemplate || "Olá {{responsavel}}, aqui é da SFK. Gostaríamos de falar sobre o(a) aluno(a) {{estudante}}.")
      .replace(/{{responsavel}}/g, pNomeResp)
      .replace(/{{estudante}}/g, pNomeEst)
      .replace(/{{unidade}}/g, aluno.unidade);
    setMessageModal({ isOpen: true, aluno, phone, responsavel });
    setCustomMessage(msg);
  };

  const handleSendMessage = async () => {
    if (!messageModal.aluno || !customMessage.trim()) return;
    const fone = messageModal.phone.replace(/\D/g, '');
    setIsSending(true);
    try {
      if (whatsappConfig?.url) {
        await fetch(whatsappConfig.url, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ "data.contact.Phone[0]": `55${fone}`, "message": customMessage }) 
        });
      } else { 
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(customMessage)}`, '_blank'); 
      }
      setMessageModal({ ...messageModal, isOpen: false });
    } finally { setIsSending(false); }
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-20">
      {/* HEADER DA PÁGINA */}
      <div>
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">Gestão de Estudantes</h2>
        <p className="text-slate-500 font-medium text-sm mt-2">Controle de contatos, escolaridade e históricos de matrícula.</p>
      </div>
      
      {/* FILTROS */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text" 
            placeholder="Buscar por Nome..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-indigo-500 transition-all text-slate-700" 
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text" 
            placeholder="Buscar por Telefone..." 
            value={phoneFilter} 
            onChange={(e) => setPhoneFilter(e.target.value)} 
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-indigo-500 transition-all text-slate-700" 
          />
        </div>
      </div>
      
      {/* GRID DE ALUNOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {filteredAlunos.length > 0 ? filteredAlunos.map(aluno => {
          const status = aluno.statusMatricula === 'Ativo' ? 'Ativo' : 'Cancelado';
          const avatarBg = aluno.isLead ? 'bg-purple-600' : (status === 'Ativo' ? 'bg-blue-600' : 'bg-slate-400');
          const borderStyle = aluno.isLead ? 'border-purple-200' : 'border-slate-100';
          const displayDate = getStatusDisplayDate(aluno, status);

          const turmasAtivas = matriculas.filter(m => m.alunoId === aluno.id).map(m => ({
            nome: turmas.find(t => t.id === m.turmaId || normalize(t.nome) === normalize(m.turmaId.split('-')[0]))?.nome || m.turmaId.split('-')[0],
            data: m.dataMatricula
          }));

          return (
            <div key={aluno.id} className={`bg-white rounded-[32px] border ${borderStyle} p-6 shadow-sm transition-all hover:shadow-lg flex flex-col gap-8 group h-full`}>
              
              {/* QUADRANTE A: CABEÇALHO */}
              <div className="flex items-start justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 ${avatarBg} rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-lg transition-transform group-hover:scale-105 shrink-0`}>
                    {aluno.nome.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 leading-none mb-1.5">{aluno.nome}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">
                      {aluno.unidade}
                    </p>
                    <div className="flex gap-2 items-center">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${status === 'Ativo' ? 'bg-blue-100 text-blue-700' : 'bg-red-50 text-red-600'}`}>
                        {aluno.isLead ? 'LEAD' : status}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg uppercase tracking-tight flex items-center gap-1.5">
                        <History className="w-2.5 h-2.5" /> {displayDate}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="p-3 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shrink-0">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* BODY: QUADRANTES B E C */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">ESCOLARIDADE</label>
                    <div className="flex items-center gap-2 text-slate-700">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span className="font-bold">{formatEscolaridade(aluno)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">NASCIMENTO</label>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="font-bold">{formatStrictDate(aluno.dataNascimento)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">E-MAIL</label>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <a href={`mailto:${aluno.email}`} className="font-bold text-blue-600 hover:underline break-all text-xs">{aluno.email || '--'}</a>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">GESTÃO DE CONTATOS</label>
                  <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{aluno.responsavel1 || 'RESPONSÁVEL 1'}</p>
                    {aluno.whatsapp1 && !aluno.whatsapp1.includes('ERROR') ? (
                      <button onClick={() => openMessageModal(aluno, aluno.whatsapp1!, aluno.responsavel1 || aluno.nome)} className="flex items-center gap-2 text-green-600 font-bold text-xs hover:text-green-700 transition-colors">
                        <MessageCircle className="w-4 h-4" /> {formatPhoneDisplay(aluno.whatsapp1)}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-300 italic text-[10px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Número Inválido
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">{aluno.responsavel2 || 'RESPONSÁVEL 2'}</p>
                    {aluno.whatsapp2 && !aluno.whatsapp2.includes('ERROR') ? (
                      <button onClick={() => openMessageModal(aluno, aluno.whatsapp2!, aluno.responsavel2 || aluno.nome)} className="flex items-center gap-2 text-green-600 font-bold text-xs hover:text-green-700 transition-colors">
                        <MessageCircle className="w-4 h-4" /> {formatPhoneDisplay(aluno.whatsapp2)}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-300 italic text-[10px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Número Inválido
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* QUADRANTE D: RODAPÉ DE HISTÓRICO */}
              <div className="pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-8 mt-auto">
                
                {/* Coluna 1: Cursos Ativos */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" /> CURSOS ATIVOS
                  </label>
                  <div className="flex flex-col gap-3">
                    {turmasAtivas.length > 0 ? turmasAtivas.map((m, idx) => (
                      <div key={idx} className="relative bg-blue-50/40 border border-blue-100 p-5 rounded-[24px] flex flex-col justify-center">
                        <span className="text-[12px] font-black uppercase leading-tight text-slate-800">{cleanName(m.nome)}</span>
                        <span className="text-[10px] font-bold text-blue-600 mt-1 uppercase">Mat: {formatStrictDate(m.data)}</span>
                        {isMaster && (
                          <button className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white text-slate-300 rounded-xl hover:text-red-500 shadow-sm transition-all opacity-0 group-hover:opacity-100 group-hover:visible">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )) : (
                      <span className="text-[10px] text-slate-300 italic font-bold uppercase tracking-widest">Nenhum curso ativo.</span>
                    )}
                  </div>
                </div>

                {/* Coluna 2: Histórico de Saídas */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5" /> HISTÓRICO DE SAÍDAS
                  </label>
                  <div className="flex flex-col gap-3">
                    {(aluno.cursosCanceladosDetalhes || []).length > 0 ? (aluno.cursosCanceladosDetalhes || []).map((c, i) => (
                      <div key={i} className="bg-red-50/30 border border-red-100 p-5 rounded-[24px] flex flex-col justify-center">
                        <span className="text-[12px] font-black text-red-900 uppercase leading-tight">{cleanName(c.nome)}</span>
                        <div className="flex flex-col mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Mat: {formatStrictDate(c.dataMatricula)}</span>
                          <span className="text-[10px] font-black text-red-600 uppercase">Can: {formatStrictDate(c.dataCancelamento)}</span>
                        </div>
                      </div>
                    )) : (
                      <span className="text-[10px] text-slate-300 italic font-bold uppercase tracking-widest">Sem registros de saída.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-slate-200">
             <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-black uppercase tracking-widest">Nenhum aluno localizado.</p>
          </div>
        )}
      </div>

      {/* MODAL DE MENSAGEM */}
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden p-10 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-6 mb-8">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Falar com Responsável</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Contato: {messageModal.responsavel}</p>
              </div>
            </div>
            <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-indigo-500 font-medium text-slate-700 min-h-[150px] resize-none text-sm shadow-inner" />
            <div className="mt-8 flex gap-4">
              <button onClick={() => setMessageModal({ ...messageModal, isOpen: false })} className="flex-1 py-4 font-black text-xs text-slate-400 uppercase hover:text-slate-600">Cancelar</button>
              <button onClick={handleSendMessage} disabled={isSending} className="flex-[2] bg-indigo-950 text-white py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-indigo-900 shadow-xl transition-all">
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 
                {isSending ? 'ENVIANDO...' : 'ENVIAR WHATSAPP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DadosAlunos;
