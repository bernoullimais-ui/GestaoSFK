
import React, { useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  MessageCircle, 
  History, 
  TrendingDown, 
  CheckCircle2, 
  XCircle,
  GraduationCap,
  ShieldCheck, 
  UserCheck,
  Zap,
  X,
  Send,
  Loader2,
  MessageSquareText,
  MapPin
} from 'lucide-react';
import { Aluno, Matricula, Presenca, Turma, AcaoRetencao, Usuario } from '../types';

interface ChurnRiskManagementProps {
  alunos: Aluno[];
  matriculas: Matricula[];
  presencas: Presenca[];
  turmas: Turma[];
  acoesRealizadas: AcaoRetencao[];
  onRegistrarAcao: (acao: AcaoRetencao) => void;
  currentUser: Usuario;
  whatsappConfig?: {
    url: string;
    token: string;
  };
  msgTemplate?: string;
}

const ChurnRiskManagement: React.FC<ChurnRiskManagementProps> = ({ 
  alunos, 
  matriculas, 
  presencas, 
  turmas, 
  acoesRealizadas, 
  onRegistrarAcao,
  currentUser,
  whatsappConfig,
  msgTemplate = "Olá *{{responsavel}}*, aqui é da coordenação da *Sport for Kids ({{unidade}})*. Notamos que *{{estudante}}* faltou às últimas aulas de *{{curso}}*. Está tudo bem?"
}) => {
  const [isSending, setIsSending] = useState(false);
  const [messageModal, setMessageModal] = useState<{ isOpen: boolean; alerta: any | null; message: string; }>({ isOpen: false, alerta: null, message: '' });

  const slugify = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const riskAnalysis = useMemo(() => {
    const groups: Record<string, { presencas: Presenca[], alunoName: string, unidade: string, curso: string }> = {};

    presencas.forEach(p => {
      const alunoName = (p as any)._estudantePlanilha || p.alunoId;
      const cursoName = (p as any)._turmaPlanilha || p.turmaId;
      const unidadeName = p.unidade;

      const key = `${slugify(alunoName)}|${slugify(unidadeName)}|${slugify(cursoName)}`;

      if (!groups[key]) {
        groups[key] = {
          presencas: [],
          alunoName: alunoName,
          unidade: unidadeName,
          curso: cursoName
        };
      }
      groups[key].presencas.push(p);
    });

    const alertas = [];

    for (const key in groups) {
      const group = groups[key];
      const sortedPresencas = [...group.presencas].sort((a, b) => b.data.localeCompare(a.data));

      const ultimas3 = sortedPresencas.slice(0, 3);
      const tresFaltas = ultimas3.length >= 3 && ultimas3.every(p => p.status === 'Ausente');

      const ultimas9 = sortedPresencas.slice(0, 9);
      let taxaAlta = false;
      let taxaCalculada = 0;
      if (ultimas9.length >= 9) {
        const faltas = ultimas9.filter(p => p.status === 'Ausente').length;
        taxaCalculada = Math.round((faltas / 9) * 100);
        if (taxaCalculada >= 50) {
          taxaAlta = true;
        }
      }

      if (tresFaltas || taxaAlta) {
        const alunoSlug = slugify(group.alunoName);
        const unidadeSlug = slugify(group.unidade);
        const alunoObj = alunos.find(a => slugify(a.nome) === alunoSlug && slugify(a.unidade) === unidadeSlug) 
                        || alunos.find(a => slugify(a.nome) === alunoSlug);

        const alertaId = `risk|${key}|${sortedPresencas[0].data}`;
        const acaoJaRealizada = acoesRealizadas.find(a => a.alertaId === alertaId);

        alertas.push({
          id: alertaId,
          aluno: alunoObj || { nome: group.alunoName, unidade: group.unidade },
          cursoNome: group.curso,
          unidade: group.unidade,
          riskDetails: { 
            tresFaltas, 
            taxa: taxaCalculada, 
            hasMinRecords: ultimas9.length >= 9,
            ultimas: (ultimas9.length > 3 ? ultimas9.slice(0, 3) : ultimas9).map(p => p.status) 
          },
          acaoTratada: acaoJaRealizada
        });
      }
    }

    return alertas.sort((a, b) => (a.acaoTratada ? 1 : -1));
  }, [alunos, presencas, acoesRealizadas]);

  const openComposeModal = (alerta: any) => {
    const responsavelFull = alerta.aluno.responsavel1 || alerta.aluno.nome;
    const primeiroNomeResponsavel = responsavelFull.trim().split(' ')[0];
    const estudantePrimeiroNome = alerta.aluno.nome.trim().split(' ')[0];
    const unidade = alerta.unidade;
    const turma = alerta.cursoNome;
    
    let msg = msgTemplate
      .replace(/{{responsavel}}/g, primeiroNomeResponsavel)
      .replace(/{{estudante}}/g, estudantePrimeiroNome)
      .replace(/{{unidade}}/g, unidade)
      .replace(/{{curso}}/g, turma);
    
    setMessageModal({ isOpen: true, alerta, message: msg });
  };

  const handleSendMessage = async () => {
    if (!messageModal.alerta) return;
    setIsSending(true);
    const fone = (messageModal.alerta.aluno.whatsapp1 || '').replace(/\D/g, '');
    
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
      onRegistrarAcao({ alertaId: messageModal.alerta.id, dataAcao: new Date().toLocaleString(), usuarioLogin: currentUser.login, unidade: currentUser.unidade });
      setMessageModal({ ...messageModal, isOpen: false });
    } catch (e) { alert("Erro ao enviar."); } finally { setIsSending(false); }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><AlertTriangle className="text-amber-500" /> Gestão de Retenção</h2>
          <p className="text-slate-500 text-sm">3 faltas consecutivas OU 50% de faltas (mínimo de 9 registros).</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border flex gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase">Alertas</p>
            <p className="text-xl font-black text-red-600">{riskAnalysis.filter(a => !a.acaoTratada).length} Pendentes</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {riskAnalysis.length > 0 ? riskAnalysis.map((alerta) => (
          <div key={alerta.id} className={`bg-white rounded-3xl border p-6 flex flex-col md:flex-row gap-6 items-center shadow-sm transition-all ${alerta.acaoTratada ? 'opacity-50 grayscale-[0.5]' : 'border-l-8 border-l-red-500 shadow-md hover:-translate-y-1'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-xl text-slate-600`}>
                  {alerta.aluno.nome.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{alerta.aluno.nome}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] font-black bg-slate-100 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {alerta.unidade}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${alerta.riskDetails.tresFaltas ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                      {alerta.riskDetails.tresFaltas ? 'CRÍTICO: 3 Faltas' : 'Risco: Frequência Baixa'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><History className="w-3 h-3"/> Sequência</p>
                  <div className="flex gap-1">
                    {alerta.riskDetails.ultimas.map((s:any, i:any) => s === 'Presente' ? <CheckCircle2 key={i} className="w-4 h-4 text-green-500"/> : <XCircle key={i} className="w-4 h-4 text-red-500 shadow-sm"/>)}
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl">
                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3"/> Ausência {alerta.riskDetails.hasMinRecords ? '(Últ. 9)' : '(Hist. Curto)'}</p>
                  <p className={`font-black text-lg ${alerta.riskDetails.hasMinRecords ? 'text-red-600' : 'text-slate-400'}`}>
                    {alerta.riskDetails.hasMinRecords ? `${alerta.riskDetails.taxa}%` : '--'}
                  </p>
                </div>
                <div className="bg-indigo-950 text-white p-3 rounded-2xl">
                  <p className="text-[9px] font-bold text-indigo-300 uppercase mb-1 flex items-center gap-1"><GraduationCap className="w-3 h-3"/> Curso</p>
                  <p className="text-[10px] font-bold truncate">{alerta.cursoNome}</p>
                </div>
              </div>
            </div>
            <div className="w-full md:w-auto">
              {alerta.acaoTratada ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-green-100 p-2 rounded-full text-green-600">
                    <ShieldCheck className="w-5 h-5"/>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase text-center">Atendido por<br/>{alerta.acaoTratada.usuarioLogin}</span>
                </div>
              ) : (
                <button 
                  onClick={() => openComposeModal(alerta)} 
                  className="w-full bg-indigo-950 text-white px-8 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-indigo-900 shadow-lg shadow-indigo-950/20 active:scale-95 transition-all"
                >
                  <MessageSquareText className="w-4 h-4"/> ACIONAR RETENÇÃO
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="bg-white p-20 rounded-[40px] border border-dashed text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800">Cursos Estáveis</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">Nenhum novo alerta de evasão detectado baseado nos critérios de frequência.</p>
            </div>
          </div>
        )}
      </div>

      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-md rounded-[40px] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-indigo-950 text-white rounded-2xl">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black">Plano de Retenção</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{messageModal.alerta?.aluno.nome}</p>
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

export default ChurnRiskManagement;
