
import React, { useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  MessageCircle, 
  History, 
  Calendar, 
  TrendingDown, 
  ArrowRight, 
  CheckCircle2, 
  XCircle,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  RefreshCw,
  Zap
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
  templateRetencao?: string;
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
  templateRetencao
}) => {
  const [sendingId, setSendingId] = useState<string | null>(null);

  const riskAnalysis = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toLocaleDateString('en-CA');
    const alertas = [];

    for (const aluno of alunos) {
      const turmasDoAluno = matriculas.filter(m => m.alunoId === aluno.id).map(m => m.turmaId);
      
      for (const turmaId of turmasDoAluno) {
        const presencasTurma = presencas
          .filter(p => p.alunoId === aluno.id && p.turmaId === turmaId)
          .sort((a, b) => b.data.localeCompare(a.data));

        if (presencasTurma.length === 0) continue;

        // Critério 1: 3 faltas consecutivas (sempre prioritário)
        const ultimas3 = presencasTurma.slice(0, 3);
        const tresFaltasConsecutivas = ultimas3.length === 3 && ultimas3.every(p => p.status === 'Ausente');

        // Critério 2: Taxa de ausência nos últimos 30 dias (novo requisito: mín 5 registros)
        const presencas30Dias = presencasTurma.filter(p => p.data >= thirtyDaysAgoStr);
        let taxaCalculada = 0;
        if (presencas30Dias.length >= 5) {
          const faltas = presencas30Dias.filter(p => p.status === 'Ausente').length;
          taxaCalculada = (faltas / presencas30Dias.length) * 100;
        }
        
        const altaTaxaAusencia = taxaCalculada > 50;

        if (tresFaltasConsecutivas || altaTaxaAusencia) {
          const dataUltimaPresenca = presencasTurma[0].data;
          const alertaId = `${aluno.id}-${turmaId}-${dataUltimaPresenca}`;
          const acaoJaRealizada = acoesRealizadas.find(a => a.alertaId === alertaId);

          alertas.push({
            id: alertaId,
            aluno,
            turma: turmas.find(t => t.id === turmaId) || { id: turmaId, nome: turmaId, horario: '--', professor: '--' },
            riskDetails: {
              tresFaltas: tresFaltasConsecutivas,
              taxaMensal: Math.round(taxaCalculada),
              ultimas: ultimas3.map(p => p.status),
              registros30Dias: presencas30Dias.length
            },
            acaoTratada: acaoJaRealizada
          });
        }
      }
    }

    return alertas.sort((a, b) => {
      if (!a.acaoTratada && b.acaoTratada) return -1;
      if (a.acaoTratada && !b.acaoTratada) return 1;
      if (a.riskDetails.tresFaltas && !b.riskDetails.tresFaltas) return -1;
      if (!a.riskDetails.tresFaltas && b.riskDetails.tresFaltas) return 1;
      return b.riskDetails.taxaMensal - a.riskDetails.taxaMensal;
    });
  }, [alunos, matriculas, presencas, turmas, acoesRealizadas]);

  const handleWhatsApp = async (alerta: any) => {
    const { aluno, turma, id } = alerta;
    const saudacao = aluno.responsavel1?.split(' ')[0] || 'Família';
    const alunoNome = aluno.nome.split(' ')[0];
    const fone = (aluno.whatsapp1 || aluno.contato || '').replace(/\D/g, '');

    if (!fone) {
      alert('Número de WhatsApp não cadastrado para este aluno.');
      return;
    }

    let msg = templateRetencao || "Olá {{RESPONSAVEL}}, notamos que {{ALUNO}} faltou às aulas de {{CURSO}}. Está tudo bem?";
    
    msg = msg
      .replace(/{{RESPONSAVEL}}/g, saudacao)
      .replace(/{{ALUNO}}/g, alunoNome)
      .replace(/{{CURSO}}/g, turma.nome)
      .replace(/{{DATA}}/g, new Date().toLocaleDateString('pt-BR'));

    if (whatsappConfig?.url) {
      setSendingId(id);
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
            "message": msg
          })
        });

        if (!response.ok) throw new Error('Falha no envio via Webhook.');
        
        onRegistrarAcao({
          alertaId: id,
          dataAcao: new Date().toLocaleString('pt-BR'),
          usuarioLogin: currentUser.login
        });
      } catch (error) {
        console.error(error);
        alert('Erro no envio automático. Tentando abrir WhatsApp manual...');
        window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, '_blank');
      } finally {
        setSendingId(null);
      }
    } else {
      window.open(`https://wa.me/55${fone}?text=${encodeURIComponent(msg)}`, '_blank');
      onRegistrarAcao({
        alertaId: id,
        dataAcao: new Date().toLocaleString('pt-BR'),
        usuarioLogin: currentUser.login
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <AlertTriangle className="text-amber-500 w-8 h-8" />
            Gestão de Evasão (Churn Control)
          </h2>
          <p className="text-slate-500 italic">Análise de evasão baseada em faltas consecutivas ou taxa de ausência (mínimo 5 registros nos últimos 30 dias).</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex flex-col text-right border-r border-slate-100 pr-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alertas Pendentes</span>
            <span className="text-lg font-black text-amber-600">{riskAnalysis.filter(a => !a.acaoTratada).length} Casos Novos</span>
          </div>
          <div className="flex flex-col text-right">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canal de Envio</span>
             <span className={`text-xs font-black uppercase flex items-center gap-1.5 ${whatsappConfig?.url ? 'text-green-600' : 'text-slate-500'}`}>
               {whatsappConfig?.url ? <Zap className="w-3.5 h-3.5 fill-current" /> : <MessageCircle className="w-3.5 h-3.5" />}
               {whatsappConfig?.url ? 'Webhook Ativo' : 'WhatsApp Web'}
             </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {riskAnalysis.length > 0 ? riskAnalysis.map((alerta) => (
          <div key={alerta.id} className={`bg-white rounded-[32px] shadow-sm border overflow-hidden flex flex-col md:flex-row group transition-all border-l-8 ${alerta.acaoTratada ? 'opacity-70 border-slate-200' : 'hover:shadow-xl border-l-amber-400 border-slate-100'}`}>
            <div className="p-8 flex-1">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm transition-transform group-hover:scale-105 ${alerta.riskDetails.tresFaltas ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                    {alerta.aluno.nome.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">{alerta.aluno.nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                        {alerta.aluno.etapa}{alerta.aluno.anoEscolar ? `-${alerta.aluno.anoEscolar}` : ''}
                      </span>
                      {alerta.riskDetails.tresFaltas && (
                        <span className={`text-[10px] font-black uppercase px-2 py-1.5 rounded border border-red-200 ${alerta.acaoTratada ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-600 animate-pulse'}`}>
                          Crítico: 3 Faltas Seguidas
                        </span>
                      )}
                      {!alerta.riskDetails.tresFaltas && alerta.riskDetails.taxaMensal > 0 && (
                        <span className="text-[10px] font-black uppercase px-2 py-1.5 rounded border border-amber-200 bg-amber-50 text-amber-600">
                          {alerta.riskDetails.registros30Dias} Chamadas no Mês
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {alerta.acaoTratada && (
                  <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase border border-emerald-100">
                    <UserCheck className="w-3 h-3" /> Contatado por {alerta.acaoTratada.usuarioLogin}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-3 h-3" /> Histórico no Curso
                  </p>
                  <div className="flex gap-2">
                    {alerta.riskDetails.ultimas.map((status: string, i: number) => (
                      <div key={i} title={status} className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        status === 'Presente' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600 shadow-inner'
                      }`}>
                        {status === 'Presente' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingDown className="w-3 h-3" /> Taxa de Ausência (30d)
                  </p>
                  <div className="flex items-end gap-2">
                    <span className={`text-3xl font-black ${alerta.riskDetails.taxaMensal > 50 ? 'text-red-500' : 'text-amber-500'}`}>
                      {alerta.riskDetails.taxaMensal}%
                    </span>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${alerta.riskDetails.taxaMensal > 50 ? 'bg-red-500' : 'bg-amber-500'}`}
                        style={{ width: `${alerta.riskDetails.taxaMensal}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                    <GraduationCap className="w-3 h-3" /> Curso com Alerta
                  </p>
                  <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl shadow-lg shadow-blue-600/20">
                     <p className="text-xs font-black uppercase tracking-tight">{alerta.turma.nome}</p>
                     <p className="text-[10px] font-bold text-blue-100 mt-1 opacity-80">{alerta.turma.horario} • {alerta.turma.professor}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-6 flex items-center justify-center border-t md:border-t-0 md:border-l border-slate-100 min-w-[240px] ${alerta.acaoTratada ? 'bg-slate-50' : 'bg-slate-50/50'}`}>
              {alerta.acaoTratada ? (
                <div className="flex flex-col items-center text-center gap-3">
                   <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                     <ShieldCheck className="w-6 h-6" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Ação Realizada</p>
                     <p className="text-[9px] font-bold text-slate-400 mt-1">{alerta.acaoTratada.dataAcao}</p>
                   </div>
                </div>
              ) : (
                <button 
                  onClick={() => handleWhatsApp(alerta)}
                  disabled={sendingId === alerta.id}
                  className={`w-full font-black px-8 py-5 rounded-2xl flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${
                    sendingId === alerta.id 
                    ? 'bg-slate-300 text-white' 
                    : 'bg-green-600 text-white hover:bg-green-700 shadow-green-600/20'
                  }`}
                >
                  {sendingId === alerta.id ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    whatsappConfig?.url ? <Zap className="w-6 h-6 fill-current" /> : <MessageCircle className="w-6 h-6" />
                  )}
                  {sendingId === alerta.id ? 'Disparando...' : (whatsappConfig?.url ? 'Acionar Webhook' : 'WhatsApp Web')}
                </button>
              )}
            </div>
          </div>
        )) : (
          <div className="bg-white p-24 rounded-[40px] text-center space-y-6 border border-slate-100 border-dashed animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
               <CheckCircle2 className="w-12 h-12" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">Tudo em Ordem!</h3>
              <p className="text-slate-400 font-medium max-w-sm mx-auto mt-2">Nenhum novo alerta de evasão foi detectado para seus cursos e alunos ativos.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChurnRiskManagement;
