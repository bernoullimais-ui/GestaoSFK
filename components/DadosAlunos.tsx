
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Phone, 
  Mail, 
  BookOpen, 
  CheckCircle, 
  MessageCircle,
  CalendarDays,
  ShieldAlert,
  Send,
  Loader2,
  Users
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

  const parseDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return null;
    try {
      let s = String(dateVal).trim().toLowerCase();
      
      const ptMonths: Record<string, number> = {
        jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
        jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
      };
      const ptMatch = s.match(/(\d{1,2})\s+de\s+([a-z]{3})[^\s]*\s+de\s+(\d{4})/);
      if (ptMatch) {
        return new Date(parseInt(ptMatch[3]), ptMonths[ptMatch[2]] || 0, parseInt(ptMatch[1]));
      }

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

  const formatPhoneDisplay = (phone: string | undefined) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    } else if (digits.length === 10) {
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    }
    return phone;
  };

  const cleanCourseName = (name: string) => {
    if (!name) return '';
    if (name.includes('-')) {
      const parts = name.split('-');
      if (parts.length > 2) name = parts.slice(0, -1).join(' ');
      else name = parts.join(' ');
    }
    return name.split('(')[0].trim();
  };

  const filteredAlunos = useMemo(() => {
    const userUnits = normalize(user.unidade).split(',').map(u => u.trim()).filter(Boolean);

    return alunos.filter(a => {
      // 1. Filtro de Segurança por Unidade (Se não for Master)
      if (!isMaster) {
        const studentUnit = normalize(a.unidade);
        const hasPermission = userUnits.some(u => studentUnit.includes(u) || u.includes(studentUnit));
        if (!hasPermission) return false;
      }

      // 2. Filtros de Interface (Busca e Telefone)
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
          body: JSON.stringify({ 
            "data.contact.Phone[0]": `55${fone}`, 
            "message": customMessage 
          }) 
        });
      } else { 
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(customMessage)}`, '_blank'); 
      }
      setMessageModal({ ...messageModal, isOpen: false });
    } finally { setIsSending(false); }
  };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Dados de Alunos</h2>
          <p className="text-slate-500 italic font-medium">
            {isMaster ? 'Visão global de todos os estudantes da rede.' : `Exibindo alunos da unidade: ${user.unidade}`}
          </p>
        </div>
      </div>
      
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" /><input type="text" placeholder="Buscar por Nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-indigo-500 transition-all" /></div>
        <div className="relative"><Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" /><input type="text" placeholder="Buscar por Telefone..." value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-indigo-500 transition-all" /></div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {filteredAlunos.length > 0 ? filteredAlunos.map(aluno => {
          const turmasAtivas = matriculas.filter(m => m.alunoId === aluno.id).map(m => ({ 
            id: m.id, 
            nome: cleanCourseName(turmas.find(t => t.id === m.turmaId || normalize(t.nome) === normalize(m.turmaId.split('-')[0]))?.nome || m.turmaId), 
            dataMatricula: m.dataMatricula 
          }));

          const allEnrollmentDates = [
            ...(aluno.dataMatricula ? [aluno.dataMatricula] : []),
            ...turmasAtivas.map(m => m.dataMatricula).filter(Boolean),
            ...(aluno.cursosCanceladosDetalhes || []).map(c => c.dataMatricula).filter(Boolean)
          ].map(d => parseDate(d)).filter(d => d !== null) as Date[];
          
          const firstEnrollment = allEnrollmentDates.length > 0 
            ? new Date(Math.min(...allEnrollmentDates.map(d => d.getTime()))) 
            : null;

          const allCancellationDates = (aluno.cursosCanceladosDetalhes || [])
            .map(c => parseDate(c.dataCancelamento))
            .filter(d => d !== null) as Date[];
          
          const lastCancellation = allCancellationDates.length > 0 
            ? new Date(Math.max(...allCancellationDates.map(d => d.getTime())))
            : null;

          return (
            <div key={aluno.id} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full hover:shadow-xl transition-all duration-300 group">
              <div className="p-10 border-b border-slate-50 flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center font-black text-3xl text-white shadow-xl group-hover:scale-105 transition-transform">{aluno.nome.charAt(0)}</div>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-2xl font-black text-slate-900 uppercase leading-none mb-4 tracking-tighter">{aluno.nome}</h3>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <div className="flex flex-col items-center md:items-start">
                      <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border ${aluno.statusMatricula === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>{aluno.statusMatricula === 'Ativo' ? 'ATIVO' : 'CANCELADO'}</span>
                      {aluno.statusMatricula === 'Ativo' && firstEnrollment && (
                        <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">DESDE {formatStrictDate(firstEnrollment)}</p>
                      )}
                      {aluno.statusMatricula !== 'Ativo' && lastCancellation && (
                        <p className="text-[9px] font-bold text-red-400 mt-1 uppercase">SAÍDA EM {formatStrictDate(lastCancellation)}</p>
                      )}
                    </div>
                    <span className="text-[9px] font-black text-slate-400 bg-white border border-slate-200 px-3 py-1.5 h-fit rounded-xl uppercase self-start">{aluno.unidade}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-10 grid grid-cols-1 sm:grid-cols-2 gap-12 flex-1">
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><BookOpen className="w-3.5 h-3.5 text-indigo-500"/> ESCOLARIDADE</p>
                    <p className="text-xl font-black text-indigo-600 uppercase leading-none">{formatEscolaridade(aluno)}</p>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><CalendarDays className="w-3.5 h-3.5 text-blue-400"/> NASCIMENTO</p>
                      <p className="text-sm font-bold text-slate-700">{formatStrictDate(aluno.dataNascimento)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Mail className="w-3.5 h-3.5 text-blue-400"/> E-MAIL CADASTRADO</p>
                      <p className="text-[11px] font-bold text-slate-500 break-all leading-tight">{aluno.email || '--'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4"><Users className="w-3.5 h-3.5 text-emerald-500"/> CONTATOS</p>
                   <div className="flex flex-col gap-4">
                     <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-2">{aluno.responsavel1 || 'Responsável 1'}</p>
                       {aluno.whatsapp1 ? (
                         <button onClick={() => openMessageModal(aluno, aluno.whatsapp1!, aluno.responsavel1 || aluno.nome)} className="text-emerald-600 font-black text-xs flex items-center gap-3 hover:underline">
                           <MessageCircle className="w-5 h-5" /> {formatPhoneDisplay(aluno.whatsapp1)}
                         </button>
                       ) : <p className="text-[10px] text-slate-300 italic">Sem contato</p>}
                     </div>
                     <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                       <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-2">{aluno.responsavel2 || 'Responsável 2'}</p>
                       {aluno.whatsapp2 ? (
                         <button onClick={() => openMessageModal(aluno, aluno.whatsapp2!, aluno.responsavel2 || aluno.nome)} className="text-indigo-600 font-black text-xs flex items-center gap-3 hover:underline">
                           <MessageCircle className="w-5 h-5" /> {formatPhoneDisplay(aluno.whatsapp2)}
                         </button>
                       ) : <p className="text-[10px] text-slate-300 italic">Sem contato</p>}
                     </div>
                   </div>
                </div>
              </div>
              
              <div className="px-10 pb-10 grid grid-cols-1 sm:grid-cols-2 gap-8 mt-auto">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2"><CheckCircle className="w-4 h-4"/> CURSOS ATIVOS</h4>
                  <div className="space-y-3">
                    {turmasAtivas.map(m => (
                      <div key={m.id} className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col gap-1">
                        <span className="text-sm font-black text-slate-800 uppercase leading-tight">{m.nome}</span>
                        <span className="text-[10px] font-bold text-blue-500 uppercase">Mat: {formatStrictDate(m.dataMatricula)}</span>
                      </div>
                    ))}
                    {turmasAtivas.length === 0 && <p className="text-[10px] text-slate-400 italic font-medium">Nenhum curso ativo.</p>}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-red-400 uppercase flex items-center gap-2"><ShieldAlert className="w-4 h-4"/> HISTÓRICO DE SAÍDAS</h4>
                  <div className="space-y-3">
                    {(aluno.cursosCanceladosDetalhes || []).map((c, i) => (
                      <div key={i} className="bg-red-50/30 p-4 rounded-2xl border border-red-100/50 flex flex-col gap-1">
                        <span className="text-sm font-black text-red-900 uppercase leading-tight">{cleanCourseName(c.nome)}</span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Mat: {formatStrictDate(c.dataMatricula)}</span>
                          <span className="text-[9px] font-black text-red-500 uppercase">Can: {formatStrictDate(c.dataCancelamento)}</span>
                        </div>
                      </div>
                    ))}
                    {(aluno.cursosCanceladosDetalhes || []).length === 0 && <p className="text-[10px] text-slate-400 italic font-medium">Sem registros de saída.</p>}
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
             <p className="text-slate-400 font-black uppercase">Nenhum aluno localizado.</p>
          </div>
        )}
      </div>

      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden p-10 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-6 mb-8"><div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg"><MessageCircle className="w-8 h-8 text-white" /></div><div><h3 className="text-xl font-black uppercase tracking-tight">Enviar Mensagem</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Para: {messageModal.responsavel}</p></div></div>
            <textarea value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-indigo-500 font-medium text-slate-700 min-h-[150px] resize-none text-sm shadow-inner" />
            <div className="mt-8 flex gap-4"><button onClick={() => setMessageModal({ ...messageModal, isOpen: false })} className="flex-1 py-4 font-black text-xs text-slate-400 uppercase hover:text-slate-600 transition-colors">Cancelar</button><button onClick={handleSendMessage} disabled={isSending} className="flex-[2] bg-indigo-950 text-white py-5 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-indigo-900 shadow-xl transition-all">{isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} ENVIAR WHATSAPP</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DadosAlunos;
