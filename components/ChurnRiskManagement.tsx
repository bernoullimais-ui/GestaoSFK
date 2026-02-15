
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
  onSheetAlarmeUpdate?: (lastPresence: Presenca) => Promise<void>;
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
  onSheetAlarmeUpdate,
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
      const key = `${slugify(alunoName)}|${slugify(p.unidade)}|${slugify(cursoName)}`;
      
      if (!groups[key]) {
        groups[key] = { presencas: [], alunoName: alunoName, unidade: p.unidade, curso: cursoName };
      }
      groups[key].presencas.push(p);
    });

    const alertas = [];
    for (const key in groups) {
      const group = groups[key];
      const sortedPresencas = [...group.presencas].sort((a, b) => b.data.localeCompare(a.data));
      
      const ultimas3 = sortedPresencas.slice(0, 3);
      const tresFaltas = ultimas3.length >= 3 && ultimas3.every(p => slugify(p.status) === 'ausente');
      
      const ultimas9 = sortedPresencas.slice(0, 9);
      let taxaCalculada = 0;
      if (ultimas9.length >= 9) {
        taxaCalculada = Math.round((ultimas9.filter(p => slugify(p.status) === 'ausente').length / 9) * 100);
      }

      if (tresFaltas || (ultimas9.length >= 9 && taxaCalculada >= 50)) {
        const alunoSlug = slugify(group.alunoName);
        const unidadeSlug = slugify(group.unidade);
        
        const alunoObj = alunos.find(a => slugify(a.nome) === alunoSlug && slugify(a.unidade) === unidadeSlug) || 
                         alunos.find(a => slugify(a.nome) === alunoSlug);
        
        const lastPresence = sortedPresencas[0];
        const alertaId = `risk|${key}|${lastPresence.data}`;
        
        const acaoTratadaLocal = acoesRealizadas.find(a => a.alertaId === alertaId);
        const jaEnviadoNaPlanilha = slugify(lastPresence.alarme) === 'enviado';

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
          lastPresence: lastPresence,
          acaoTratada: acaoTratadaLocal || jaEnviadoNaPlanilha
        });
      }
    }
    return alertas.sort((a, b) => (a.acaoTratada ? 1 : -1));
  }, [alunos, presencas, acoesRealizadas]);

  const openComposeModal = (alerta: any) => {
    const responsavelFull = alerta.aluno.responsavel1 || alerta.aluno.nome;
    const primeiroNomeResponsavel = responsavelFull.trim().split(' ')[0];
    const estudantePrimeiroNome = alerta.aluno.nome.trim().split(' ')[0];
    const unidade = alerta.unidade || alerta.aluno.unidade || '';
    const turma = alerta.cursoNome;
    
    // Mapeamento de tags suportadas (suporta maiúsculas/minúsculas e variações de termos)
    const replacements = [
      { tags: [/{{responsavel}}/gi], value: primeiroNomeResponsavel },
      { tags: [/{{estudante}}/gi, /{{aluno}}/gi], value: estudantePrimeiroNome },
      { tags: [/{{unidade}}/gi], value: unidade },
      { tags: [/{{curso}}/gi, /{{turma}}/gi], value: turma }
    ];

    let msg = msgTemplate || "";
    replacements.forEach(rep => {
      rep.tags.forEach(tag => {
        msg = msg.replace(tag, rep.value);
      });
    });
      
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
          headers: { 
            'Content-Type': 'application/json', 
            'apikey': whatsappConfig.token || '' 
          }, 
          body: JSON.stringify({ 
            "data.contact.Phone[0]": `55${fone}`, 
            "message": messageModal.message 
          }) 
        });
      } else if (fone) {
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(messageModal.message)}`, '_blank');
      }

      onRegistrarAcao({ 
        alertaId: messageModal.alerta.id, 
        dataAcao: new Date().toLocaleString(), 
        usuarioLogin: currentUser.login, 
        unidade: currentUser.unidade 
      });

      if (onSheetAlarmeUpdate && messageModal.alerta.lastPresence) {
        await onSheetAlarmeUpdate(messageModal.alerta.lastPresence);
      }

      setMessageModal({ ...messageModal, isOpen: false });
    } catch (e) { 
      alert("Erro ao enviar."); 
    } finally { 
      setIsSending(false); 
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="text-amber-500" /> Gestão de Retenção
          </h2>
          <p className="text-slate-500 text-sm">3 faltas consecutivas OU 50% de faltas (mínimo de 9 registros).</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        {riskAnalysis.length > 0 ? riskAnalysis.map((alerta) => (
          <div key={alerta.id} className={`bg-white rounded-3xl border p-6 flex flex-col md:flex-row gap-6 items-center shadow-sm transition-all ${alerta.acaoTratada ? 'opacity-50' : 'border-l-8 border-l-red-500 shadow-md'}`}>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-xl text-slate-600">
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
            </div>
            <button 
              onClick={() => !alerta.acaoTratada && openComposeModal(alerta)} 
              disabled={!!alerta.acaoTratada} 
              className={`px-8 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all ${alerta.acaoTratada ? 'bg-green-100 text-green-600' : 'bg-indigo-950 text-white hover:bg-indigo-900 shadow-lg'}`}
            >
              {alerta.acaoTratada ? <ShieldCheck className="w-4 h-4"/> : <MessageSquareText className="w-4 h-4"/>}
              {alerta.acaoTratada ? 'ATENDIDO' : 'ACIONAR RETENÇÃO'}
            </button>
          </div>
        )) : (
          <div className="bg-white p-20 rounded-[40px] border border-dashed text-center">
            Nenhum alerta de evasão detectado.
          </div>
        )}
      </div>
      {messageModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-md rounded-[40px] shadow-2xl p-8">
            <h3 className="text-xl font-black mb-6">Plano de Retenção - {messageModal.alerta?.aluno.nome}</h3>
            <textarea 
              value={messageModal.message} 
              onChange={(e) => setMessageModal({...messageModal, message: e.target.value})} 
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[28px] h-40 mb-6 font-medium text-sm outline-none resize-none" 
            />
            <button 
              onClick={handleSendMessage} 
              disabled={isSending} 
              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3"
            >
              {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} 
              {isSending ? 'DISPARANDO...' : 'CONFIRMAR E ENVIAR'}
            </button>
            <button 
              onClick={() => setMessageModal({...messageModal, isOpen: false})} 
              className="w-full mt-4 text-xs font-bold text-slate-400 uppercase"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChurnRiskManagement;
