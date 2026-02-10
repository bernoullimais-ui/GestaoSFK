
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Phone, 
  Calendar, 
  Mail, 
  User, 
  BookOpen, 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  ExternalLink,
  MessageCircle,
  Building2,
  Trash2,
  Edit2,
  X,
  Save,
  UserCheck,
  RefreshCw,
  CalendarDays,
  Contact2,
  ShieldAlert,
  Zap,
  Send,
  Loader2,
  AlertTriangle,
  MapPin,
  Users
} from 'lucide-react';
import { Aluno, Turma, Matricula, CursoCancelado, Usuario } from '../types';

interface DadosAlunosProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  onUpdateAluno?: (aluno: Aluno) => void;
  onCancelCurso?: (nomeAluno: string, nomeCurso: string, dataCancelamento: string) => Promise<void>;
  user: Usuario;
  whatsappConfig?: {
    url: string;
    token: string;
  };
  msgTemplate?: string;
}

const DadosAlunos: React.FC<DadosAlunosProps> = ({ 
  alunos, 
  turmas, 
  matriculas, 
  onUpdateAluno, 
  onCancelCurso, 
  user,
  whatsappConfig,
  msgTemplate = "Olá {{responsavel}}, aqui é da SFK. Gostaríamos de falar sobre o(a) aluno(a) {{estudante}}."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messageModal, setMessageModal] = useState<{
    isOpen: boolean;
    aluno: Aluno | null;
    phone: string;
    responsavel: string;
  }>({
    isOpen: false,
    aluno: null,
    phone: '',
    responsavel: ''
  });
  const [customMessage, setCustomMessage] = useState('');
  
  const isGestor = user.nivel === 'Gestor' || user.nivel === 'Gestor Master';

  const parseDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return null;
    
    try {
      let s = String(dateVal).trim().toLowerCase();
      
      // Se for um serial do Excel
      if (/^\d+$/.test(s)) {
        const serial = parseInt(s);
        if (serial > 30000 && serial < 60000) {
          const d = new Date((serial - 25569) * 86400 * 1000);
          if (!isNaN(d.getTime())) return d;
        }
      }

      // Limpeza de sufixos
      s = s.split(',')[0].trim();
      s = s.split(' às ')[0].trim();

      // Mapeamento de meses
      const monthsMap: Record<string, number> = {
        'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11,
        'janeiro': 0, 'fevereiro': 1, 'marco': 2, 'março': 2, 'abril': 3, 'maio': 4, 'junho': 5,
        'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
      };

      // 1. Verboso
      const verboseMatch = s.match(/^(\d{1,2})\s+de\s+([a-zç]+)\.?\s+de\s+(\d{4})/);
      if (verboseMatch) {
        const day = parseInt(verboseMatch[1]);
        const monthName = verboseMatch[2].substring(0, 3);
        const monthIndex = monthsMap[monthName];
        const year = parseInt(verboseMatch[3]);
        if (monthIndex !== undefined) return new Date(year, monthIndex, day);
      }

      // 2. ISO
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
      }

      // 3. DMY
      const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1]);
        const month = parseInt(dmyMatch[2]);
        let year = parseInt(dmyMatch[3]);
        if (year < 100) year += (year < 50 ? 2000 : 1900);
        return new Date(year, month - 1, day);
      }

      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d;
    } catch (e) {}
    return null;
  };

  const formatStrictDate = (dateVal: any) => {
    const date = parseDate(dateVal);
    if (!date) return '--/--/--';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).substring(2);
    
    return `${day}/${month}/${year}`;
  };

  const filteredAlunos = useMemo(() => {
    return alunos
      .filter(aluno => {
        const matchesName = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const phone1 = (aluno.whatsapp1 || '').replace(/\D/g, '');
        const phone2 = (aluno.whatsapp2 || '').replace(/\D/g, '');
        const filterPhone = phoneFilter.replace(/\D/g, '');
        const matchesPhone = filterPhone === '' || phone1.includes(phoneFilter) || phone2.includes(phoneFilter);
        return matchesName && matchesPhone;
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, searchTerm, phoneFilter]);

  const formatEscolaridade = (aluno: Aluno) => {
    let etapa = (aluno.etapa || '').toUpperCase().trim();
    let ano = (aluno.anoEscolar || '').toUpperCase().trim();
    let turma = (aluno.turmaEscolar || '').toUpperCase().trim();

    if (etapa.match(/^(EI|EF|EM)-/)) return `${etapa}${turma ? ' ' + turma : ''}`.trim();

    if (etapa.includes('INFANTIL')) etapa = 'EI';
    else if (etapa.includes('FUNDAMENTAL')) etapa = 'EF';
    else if (etapa.includes('MEDIO')) etapa = 'EM';

    if (ano.includes('GRUPO')) {
      ano = ano.replace('GRUPO', 'G').replace(/\s+/g, '');
    } else if (ano.includes('ANO')) {
      ano = ano.replace('ANO', '').trim();
    }

    if (!etapa && !ano) return '--';
    
    const sigla = etapa && ano ? `${etapa}-${ano}` : (etapa || ano);
    return `${sigla}${turma ? ' ' + turma : ''}`.trim();
  };

  const cleanPhoneDisplay = (phone: string | undefined) => {
    if (!phone) return '--';
    return phone.replace(/^(=?\+55\s?)/g, '').replace(/^(=)/g, '').trim();
  };

  const isValidContact = (contact: string | undefined) => {
    if (!contact || contact === 'FORMULA_ERROR') return false;
    const cleaned = contact.replace(/\D/g, '');
    return cleaned.length >= 8;
  };

  const openMessageModal = (aluno: Aluno, phone: string, responsavel: string) => {
    const primeiroNomeEstudante = aluno.nome.split(' ')[0];
    const primeiroNomeResponsavel = (responsavel || aluno.nome).split(' ')[0];
    
    let msg = msgTemplate
      .replace(/{{responsavel}}/g, primeiroNomeResponsavel)
      .replace(/{{estudante}}/g, primeiroNomeEstudante);

    setMessageModal({
      isOpen: true,
      aluno,
      phone,
      responsavel
    });
    setCustomMessage(msg);
  };

  const handleSendMessage = async () => {
    if (!messageModal.aluno || !customMessage.trim()) return;
    
    const fone = messageModal.phone.replace(/\D/g, '');
    
    if (whatsappConfig?.url) {
      setIsSending(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (whatsappConfig.token) {
          headers['Authorization'] = `Bearer ${whatsappConfig.token}`;
          headers['apikey'] = whatsappConfig.token;
        }

        const response = await fetch(whatsappConfig.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            "data.contact.Phone[0]": `55${fone}`,
            "message": customMessage
          })
        });

        if (!response.ok) throw new Error('Erro no envio via Webhook');
        
        alert('Mensagem enviada com sucesso!');
        setMessageModal({ ...messageModal, isOpen: false });
      } catch (e) {
        console.error(e);
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(customMessage)}`, '_blank');
      } finally {
        setIsSending(false);
      }
    } else {
      window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(customMessage)}`, '_blank');
      setMessageModal({ ...messageModal, isOpen: false });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dados de Alunos</h2>
          <p className="text-slate-500 italic">Gestão administrativa e histórico escolar.</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl border border-blue-100">
          <Building2 className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-wider">Acesso: {user.nivel}</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input type="text" placeholder="Buscar por Nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold" />
        </div>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input type="text" placeholder="Buscar por Telefone..." value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        {filteredAlunos.length > 0 ? filteredAlunos.map(aluno => {
          const turmasAtivas = matriculas
            .filter(m => m.alunoId === aluno.id)
            .map(m => {
              // Limpa o nome da turma removendo a unidade se o find falhar ou retornar com unidade
              let nomeTurma = turmas.find(t => t.id === m.turmaId)?.nome || m.turmaId;
              // Regex para remover sufixos de unidade como "- AKA", "- BUNNY", etc se vierem no nome
              nomeTurma = nomeTurma.split(' - ')[0].split(' (')[0].split('-')[0].trim();

              return { 
                  id: m.id, 
                  nome: nomeTurma, 
                  dataMatricula: m.dataMatricula 
              };
            });
            
          const turmasCanceladas = [...(aluno.cursosCanceladosDetalhes || [])].sort((a, b) => {
            const dateA = parseDate(a.dataCancelamento)?.getTime() || 0;
            const dateB = parseDate(b.dataCancelamento)?.getTime() || 0;
            return dateB - dateA;
          });
          
          const isAtivo = turmasAtivas.length > 0;
          const isLead = !isAtivo && (!!aluno.isLead || aluno.statusMatricula === 'Lead Qualificado');

          return (
            <div key={aluno.id} className={`bg-white rounded-[32px] shadow-sm border overflow-hidden flex flex-col hover:shadow-lg transition-all ${isLead && !isAtivo ? 'border-purple-200' : !isAtivo ? 'border-red-100 opacity-95' : 'border-slate-100'}`}>
              <div className="p-6 bg-slate-50 flex items-start justify-between border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm ${isAtivo ? 'bg-blue-600 text-white' : isLead ? 'bg-purple-600 text-white' : 'bg-slate-300 text-slate-500'}`}>{aluno.nome.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-800 leading-tight truncate pr-4" title={aluno.nome}>{aluno.nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border ${
                        isAtivo ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                        isLead ? 'bg-purple-100 text-purple-700 border-purple-200' : 
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {isAtivo ? 'ATIVO' : isLead ? 'LEAD QUALIFICADO' : 'CANCELADO'}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-lg uppercase tracking-widest">{aluno.unidade}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 flex flex-col gap-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Escolaridade</p>
                      <div className="font-bold text-indigo-700 text-sm">
                        {formatEscolaridade(aluno)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Nascimento</p>
                      <div className="font-bold text-slate-700 text-sm">
                        {formatStrictDate(aluno.dataNascimento)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail</p>
                      <div className="font-bold text-slate-600 text-xs truncate" title={aluno.email}>
                        {aluno.email || '--'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-l border-slate-50 md:pl-6">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Responsáveis</p>
                      
                      <div className="space-y-2">
                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Principal</p>
                          <p className="text-xs font-bold text-slate-800">{aluno.responsavel1 || 'Não informado'}</p>
                          {isValidContact(aluno.whatsapp1) && (
                            <button 
                              onClick={() => openMessageModal(aluno, aluno.whatsapp1!, aluno.responsavel1 || aluno.nome)}
                              className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] mt-1 hover:text-green-700 transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" /> {cleanPhoneDisplay(aluno.whatsapp1)}
                            </button>
                          )}
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Secundário</p>
                          <p className="text-xs font-bold text-slate-800">{aluno.responsavel2 || 'Não informado'}</p>
                          {isValidContact(aluno.whatsapp2) && (
                            <button 
                              onClick={() => openMessageModal(aluno, aluno.whatsapp2!, aluno.responsavel2 || 'Responsável')}
                              className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] mt-1 hover:text-indigo-600 transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" /> {cleanPhoneDisplay(aluno.whatsapp2)}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" /> Matrículas Ativas</p>
                    <div className="space-y-2">
                      {turmasAtivas.length > 0 ? turmasAtivas.map(t => (
                        <div key={t.id} className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                           <p className="text-[11px] font-black text-blue-900 uppercase leading-none mb-1.5 truncate">{t.nome}</p>
                           <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400">
                             <CalendarDays className="w-3 h-3" /> 
                             Mat: {formatStrictDate(t.dataMatricula)}
                           </div>
                        </div>
                      )) : <p className="text-[10px] text-slate-300 italic">Nenhum curso ativo</p>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Histórico de Saídas</p>
                    <div className="space-y-2">
                      {turmasCanceladas.length > 0 ? turmasCanceladas.map((c, i) => (
                        <div key={i} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 opacity-80">
                           <p className="text-[11px] font-black text-slate-500 uppercase leading-none mb-1.5 line-through truncate">{c.nome.split(' - ')[0]}</p>
                           <div className="space-y-1">
                              <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5">
                                <CalendarDays className="w-3 h-3" />
                                Mat: {formatStrictDate(c.dataMatricula)}
                              </div>
                              <div className="text-[9px] font-black text-red-400 flex items-center gap-1.5">
                                <XCircle className="w-3 h-3" />
                                Canc: {formatStrictDate(c.dataCancelamento)}
                              </div>
                           </div>
                        </div>
                      )) : <p className="text-[10px] text-slate-300 italic">Sem histórico de cancelamento</p>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-20 text-center"><AlertCircle className="w-10 h-10 text-slate-300 mx-auto" /><p className="text-slate-400 font-bold">Nenhum estudante encontrado.</p></div>
        )}
      </div>

      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-8 bg-indigo-950 text-white relative">
              <button 
                onClick={() => setMessageModal({ ...messageModal, isOpen: false })} 
                className="absolute top-8 right-8 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                  <MessageCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Enviar Mensagem</h3>
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">
                    Para: {messageModal.responsavel}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Mensagem Personalizada</label>
                <textarea 
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none focus:border-indigo-500 font-medium text-slate-700 min-h-[150px] resize-none"
                  placeholder="Digite sua mensagem..."
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <Zap className="w-5 h-5 text-blue-500" />
                <p className="text-[10px] font-bold text-blue-700 leading-tight">
                  A mensagem será disparada via Webhook (PlugLead) para o número {cleanPhoneDisplay(messageModal.phone)}.
                </p>
              </div>

              <button 
                onClick={handleSendMessage}
                disabled={isSending || !customMessage.trim()}
                className={`w-full py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${
                  isSending 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-indigo-950 text-white hover:bg-indigo-900 shadow-indigo-950/20'
                }`}
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {isSending ? 'DISPARANDO...' : 'ENVIAR AGORA'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DadosAlunos;
