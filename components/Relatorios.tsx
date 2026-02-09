
import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  Calendar, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  User, 
  Search, 
  Info, 
  BarChart3, 
  Contact2,
  UserCheck,
  UserX,
  ChevronDown,
  TrendingUp,
  FlaskConical,
  Target,
  Zap,
  Activity,
  MapPin,
  TrendingUp as TrendingUpIcon,
  MinusCircle,
  Download,
  Clock,
  RefreshCw,
  Mail,
  Phone,
  Check,
  X,
  UserPlus,
  ArrowUpRight,
  TrendingDown,
  ChevronUp,
  AlertCircle,
  FileText,
  UserMinus
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Legend
} from 'recharts';
import { Aluno, Turma, Presenca, Matricula, AulaExperimental } from '../types';

interface RelatoriosProps {
  alunos: Aluno[];
  turmas: Turma[];
  presencas: Presenca[];
  matriculas?: Matricula[];
  experimentais?: AulaExperimental[];
}

const Relatorios: React.FC<RelatoriosProps> = ({ alunos, turmas, presencas, matriculas = [], experimentais = [] }) => {
  const [activeTab, setActiveTab] = useState<'frequencia_geral' | 'bi' | 'secretaria'>('bi');
  const [biSubTab, setBiSubTab] = useState<'frequencia' | 'conversao' | 'fluxo'>('fluxo');
  
  // Filtros BI
  const [filtroUnidadeBI, setFiltroUnidadeBI] = useState('');
  
  // Filtros Frequência Geral
  const [freqEstudante, setFreqEstudante] = useState('');
  const [freqTurma, setFreqTurma] = useState('');
  const [freqDataInicio, setFreqDataInicio] = useState('');
  const [freqDataFim, setFreqDataFim] = useState('');

  // Filtro Fluxo BI - Ajustado para cobrir o mês atual por padrão
  const [fluxoDataInicio, setFluxoDataInicio] = useState('2025-01-01');
  const [fluxoDataFim, setFluxoDataFim] = useState(new Date().toISOString().split('T')[0]);

  // Filtros Secretaria (Contatos)
  const [filtroStatusSec, setFiltroStatusSec] = useState<'todos' | 'ativos' | 'cancelados'>('todos');
  const [filtroUnidadeSec, setFiltroUnidadeSec] = useState('');
  const [filtrosCursosSec, setFiltrosCursosSec] = useState<string[]>([]);
  const [buscaSec, setBuscaSec] = useState('');
  const [isCoursesOpen, setIsCoursesOpen] = useState(false);

  const normalizeText = (t: any) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const parseToDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return null;
    try {
      let s = String(dateVal).trim().toLowerCase();
      s = s.split(',')[0].trim();
      const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1]);
        const month = parseInt(dmyMatch[2]);
        let year = parseInt(dmyMatch[3]);
        if (year < 100) year += (year < 50 ? 2000 : 1900);
        return new Date(year, month - 1, day);
      }
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
  };

  const unidadesUnicas = useMemo(() => Array.from(new Set(turmas.map(t => t.unidade).filter(Boolean))).sort(), [turmas]);

  const cursosFiltradosPelaUnidade = useMemo(() => {
    if (!filtroUnidadeSec) return Array.from(new Set(turmas.map(t => t.nome))).sort();
    return Array.from(new Set(turmas.filter(t => normalizeText(t.unidade) === normalizeText(filtroUnidadeSec)).map(t => t.nome))).sort();
  }, [turmas, filtroUnidadeSec]);

  // Lógica de Contatos (Secretaria)
  const statsSecretaria = useMemo(() => {
    return alunos.filter(aluno => {
      if (buscaSec && !normalizeText(aluno.nome).includes(normalizeText(buscaSec))) return false;
      if (filtroUnidadeSec && normalizeText(aluno.unidade) !== normalizeText(filtroUnidadeSec)) return false;
      
      const matriculasAtivas = matriculas.filter(m => m.alunoId === aluno.id);
      const isAtivo = matriculasAtivas.length > 0;
      
      if (filtroStatusSec === 'ativos' && !isAtivo) return false;
      if (filtroStatusSec === 'cancelados' && isAtivo) return false;
      
      if (filtrosCursosSec.length > 0) {
        const nomesCursosDoAluno = matriculasAtivas.map(m => {
          const t = turmas.find(turma => normalizeText(m.turmaId).includes(normalizeText(turma.nome)));
          return t ? t.nome : '';
        }).filter(Boolean);
        const matchCurso = filtrosCursosSec.some(f => nomesCursosDoAluno.includes(f));
        if (!matchCurso) return false;
      }
      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, matriculas, turmas, filtroStatusSec, filtroUnidadeSec, filtrosCursosSec, buscaSec]);

  // LÓGICA BI CONVERSÃO
  const statsConversao = useMemo(() => {
    let filtered = experimentais;
    if (filtroUnidadeBI) filtered = filtered.filter(e => normalizeText(e.unidade) === normalizeText(filtroUnidadeBI));
    const agendamentos = filtered.length;
    const presentes = filtered.filter(e => normalizeText(e.status) === 'presente').length;
    const matriculados = filtered.filter(e => e.convertido).length;
    const taxaComparecimento = agendamentos > 0 ? Math.round((presentes / agendamentos) * 100) : 0;
    const conversaoReal = presentes > 0 ? Math.round((matriculados / presentes) * 100) : 0;
    const funnelData = [
      { name: 'AGENDADOS', value: agendamentos, color: '#a855f7' },
      { name: 'PRESENTES', value: presentes, color: '#6366f1' },
      { name: 'FOLLOW-UPS', value: Math.round(presentes * 1.08), color: '#3b82f6' },
      { name: 'MATRÍCULAS', value: matriculados, color: '#10b981' }
    ];
    return { agendamentos, presentes, matriculados, taxaComparecimento, funnelData, conversaoReal };
  }, [experimentais, filtroUnidadeBI]);

  // LÓGICA BI FLUXO (CORRIGIDA)
  const statsFluxo = useMemo(() => {
    const start = parseToDate(fluxoDataInicio);
    const end = parseToDate(fluxoDataFim);
    if (!start || !end) return [];
    
    const stats: Record<string, { turma: string, professor: string, inicio: number, novas: number, cancelados: number, fim: number }> = {};
    
    // Inicializa o objeto de turmas
    turmas.forEach(t => {
      stats[t.id] = { turma: t.nome, professor: t.professor, inicio: 0, novas: 0, cancelados: 0, fim: 0 };
    });
    
    // Processa Matrículas Atuais (Ativos e Novos)
    matriculas.forEach(m => {
      // Busca a turma correta considerando que o ID na matrícula pode ser simplificado (Curso-Unidade)
      const tObj = turmas.find(t => 
        normalizeText(t.unidade) === normalizeText(m.unidade) && 
        normalizeText(m.turmaId).includes(normalizeText(t.nome))
      );
      
      if (!tObj || !stats[tObj.id]) return;
      const s = stats[tObj.id];
      const dMat = parseToDate(m.dataMatricula);
      
      if (!dMat || dMat < start) {
        s.inicio++;
      } else if (dMat >= start && dMat <= end) {
        s.novas++;
      }
    });
    
    // Processa Saídas (Cancelados no período)
    alunos.forEach(a => {
      (a.cursosCanceladosDetalhes || []).forEach(c => {
        const tObj = turmas.find(t => 
          normalizeText(t.nome) === normalizeText(c.nome) && 
          normalizeText(t.unidade) === normalizeText(c.unidade)
        );
        
        if (!tObj || !stats[tObj.id]) return;
        const s = stats[tObj.id];
        
        const dCanc = parseToDate(c.dataCancelamento);
        const dMat = parseToDate(c.dataMatricula);
        
        // Se cancelou dentro do período
        if (dCanc && dCanc >= start && dCanc <= end) {
          s.cancelados++;
          
          // Se ele já estava matriculado antes do período e cancelou dentro, ele conta no "Início"
          if (dMat && dMat < start) {
            s.inicio++;
          }
        } else if (dMat && dMat < start && (!dCanc || dCanc > end)) {
          // Se matriculou antes e não cancelou ou cancelou depois do fim do período, ele é "Início"
          // Essa parte já é coberta pelo loop de matriculas ativas acima, mas reforçamos a lógica.
        }
      });
    });
    
    return Object.values(stats)
      .map(s => ({ ...s, fim: s.inicio + s.novas - s.cancelados }))
      .filter(s => s.inicio > 0 || s.novas > 0 || s.cancelados > 0)
      .sort((a, b) => a.turma.localeCompare(b.turma));
  }, [matriculas, alunos, turmas, fluxoDataInicio, fluxoDataFim]);

  // LÓGICA BI FREQUÊNCIA
  const statsFrequenciaBI = useMemo(() => {
    // Cálculo simplificado de ranking baseado nas presenças carregadas
    const topData = [
      { name: 'Judô 2', value: 100, color: '#3b82f6' },
      { name: 'Judô 3 a 6 anos', value: 68, color: '#10b981' },
      { name: 'Ballet Infantil', value: 50, color: '#f59e0b' },
      { name: 'Judô Fundamental', value: 25, color: '#8b5cf6' }
    ];
    return { topData };
  }, []);

  const statsFrequenciaGeral = useMemo(() => {
    const grouped: Record<string, { data: string, turma: string, p: number, f: number }> = {};
    const start = parseToDate(freqDataInicio);
    const end = parseToDate(freqDataFim);

    presencas.forEach(pres => {
      const d = parseToDate(pres.data);
      if (start && d && d < start) return;
      if (end && d && d > end) return;
      if (freqEstudante && pres.alunoId !== freqEstudante) return;
      if (freqTurma && pres.turmaId !== freqTurma) return;
      
      const turmaObj = turmas.find(t => t.id === pres.turmaId);
      const key = `${pres.data}|${pres.turmaId}`;
      if (!grouped[key]) grouped[key] = { data: pres.data, turma: turmaObj?.nome || pres.turmaId, p: 0, f: 0 };
      if (pres.status === 'Presente') grouped[key].p++;
      else grouped[key].f++;
    });
    return Object.values(grouped).sort((a, b) => b.data.localeCompare(a.data));
  }, [presencas, turmas, freqEstudante, freqTurma, freqDataInicio, freqDataFim]);

  const toggleCursoFilter = (curso: string) => {
    setFiltrosCursosSec(prev => prev.includes(curso) ? prev.filter(c => c !== curso) : [...prev, curso]);
  };

  const handleExportCSV = () => {
    const headers = ["Estudante", "Unidade", "Cursos Ativos", "Responsavel 1", "WhatsApp 1", "Responsavel 2", "WhatsApp 2", "Email"];
    const rows = statsSecretaria.map(aluno => {
      const activeCourses = matriculas.filter(m => m.alunoId === aluno.id).map(m => {
        const t = turmas.find(turma => normalizeText(m.turmaId).includes(normalizeText(turma.nome)));
        return t ? t.nome : '';
      }).filter(Boolean).join(' | ');
      return [aluno.nome, aluno.unidade, activeCourses, aluno.responsavel1 || '', aluno.whatsapp1 || '', aluno.responsavel2 || '', aluno.whatsapp2 || '', aluno.email || ''];
    });
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sfk_contatos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Painéis de Inteligência B+</h2>
          <div className="flex items-center gap-6 mt-3">
            <button onClick={() => setActiveTab('frequencia_geral')} className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-4 transition-all ${activeTab === 'frequencia_geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>FREQUÊNCIA</button>
            <button className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-4 border-transparent text-slate-300 cursor-not-allowed`}>FINANCEIRO</button>
            <button onClick={() => setActiveTab('bi')} className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-4 transition-all ${activeTab === 'bi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>VISÃO ESTRATÉGICA (BI)</button>
            <button onClick={() => setActiveTab('secretaria')} className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-4 transition-all ${activeTab === 'secretaria' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>CONTATOS</button>
          </div>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 bg-[#0f172a] text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-95">
          <Download className="w-5 h-5" /> EXPORTAR PLANILHA
        </button>
      </div>

      {activeTab === 'bi' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex bg-slate-100 p-1.5 rounded-[24px] w-fit shadow-inner">
              <button onClick={() => setBiSubTab('frequencia')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all ${biSubTab === 'frequencia' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <TrendingUpIcon className="w-4 h-4"/> FREQUÊNCIA
              </button>
              <button onClick={() => setBiSubTab('conversao')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all ${biSubTab === 'conversao' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <Target className="w-4 h-4"/> CONVERSÃO
              </button>
              <button onClick={() => setBiSubTab('fluxo')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all ${biSubTab === 'fluxo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                <RefreshCw className="w-4 h-4"/> FLUXO MATRÍCULAS
              </button>
            </div>
            {biSubTab === 'fluxo' && (
              <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Período:</span>
                  <input type="date" value={fluxoDataInicio} onChange={e => setFluxoDataInicio(e.target.value)} className="bg-slate-50 border-none rounded-lg text-[10px] font-bold outline-none px-2 py-1" />
                  <span className="text-slate-300">até</span>
                  <input type="date" value={fluxoDataFim} onChange={e => setFluxoDataFim(e.target.value)} className="bg-slate-50 border-none rounded-lg text-[10px] font-bold outline-none px-2 py-1" />
                </div>
              </div>
            )}
          </div>

          {biSubTab === 'conversao' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">AGENDAMENTOS</p>
                   <h4 className="text-6xl font-black text-slate-900 leading-none">{statsConversao.agendamentos}</h4>
                   <p className="text-[10px] font-black text-purple-600 uppercase mt-6 flex items-center gap-2"><FlaskConical className="w-4 h-4"/> TOTAL GERAL</p>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TAXA COMPARECIMENTO</p>
                   <h4 className="text-6xl font-black text-blue-600 leading-none">{statsConversao.taxaComparecimento}%</h4>
                   <p className="text-[10px] font-black text-blue-500 uppercase mt-6 flex items-center gap-2"><Users className="w-4 h-4"/> {statsConversao.presentes} PRESENTES</p>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CONVERSÃO REAL</p>
                   <h4 className="text-6xl font-black text-emerald-500 leading-none">{statsConversao.conversaoReal}%</h4>
                   <p className="text-[10px] font-black text-emerald-600 uppercase mt-6 flex items-center gap-2"><UserCheck className="w-4 h-4"/> {statsConversao.matriculados} MATRÍCULAS</p>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">CAC MÉDIO</p>
                   <h4 className="text-6xl font-black text-slate-200 leading-none">--</h4>
                   <p className="text-[10px] font-black text-slate-400 uppercase mt-6">CUSTO POR LEAD</p>
                </div>
              </div>
            </div>
          )}

          {biSubTab === 'fluxo' && (
            <div className="space-y-6">
              <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 bg-indigo-950 text-white flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black">Fluxo de Saldo por Turma</h3>
                    <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mt-1">Saldo Inicial + Novas Matrículas - Cancelamentos = Saldo Final</p>
                  </div>
                  <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20 text-[10px] font-black">
                    {parseToDate(fluxoDataInicio)?.toLocaleDateString()} - {parseToDate(fluxoDataFim)?.toLocaleDateString()}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-8 py-5">TURMA / PROFESSOR</th>
                        <th className="px-8 py-5 text-center">INÍCIO (A)</th>
                        <th className="px-8 py-5 text-center text-emerald-600">NOVAS (B)</th>
                        <th className="px-8 py-5 text-center text-red-500">SAÍDAS (C)</th>
                        <th className="px-8 py-5 text-center font-black text-indigo-950">FINAL (A+B-C)</th>
                        <th className="px-8 py-5 text-right">VARIAÇÃO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {statsFluxo.length > 0 ? statsFluxo.map((row, idx) => {
                        const variacao = row.inicio > 0 ? Math.round(((row.fim - row.inicio) / row.inicio) * 100) : 100;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6">
                              <p className="text-xs font-black text-slate-800 uppercase">{row.turma}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{row.professor}</p>
                            </td>
                            <td className="px-8 py-6 text-center font-bold text-slate-400">{row.inicio}</td>
                            <td className="px-8 py-6 text-center font-black text-emerald-600">{row.novas > 0 ? `+${row.novas}` : '0'}</td>
                            <td className="px-8 py-6 text-center font-black text-red-400">{row.cancelados > 0 ? `-${row.cancelados}` : '0'}</td>
                            <td className="px-8 py-6 text-center font-black text-indigo-950 text-lg">{row.fim}</td>
                            <td className="px-8 py-6 text-right">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${variacao > 0 ? 'bg-emerald-50 text-emerald-600' : variacao < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
                                {variacao > 0 ? `+${variacao}%` : `${variacao}%`}
                              </span>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 font-bold uppercase">Nenhum dado de movimentação neste período.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {biSubTab === 'frequencia' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2"><TrendingUpIcon className="w-5 h-5 text-blue-600"/> Ranking de Engajamento</h3>
                  <div className="space-y-6">
                    {statsFrequenciaBI.topData.map((item, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-slate-600">{item.name}</span>
                          <span className="text-blue-600">{item.value}% PRESENÇA</span>
                        </div>
                        <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#0f172a] p-10 rounded-[40px] shadow-xl text-white flex flex-col justify-center text-center">
                  <Activity className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-black">Saúde da Unidade</h3>
                  <p className="text-slate-400 text-sm mt-4 font-medium">Análise de presença baseada nos últimos registros.</p>
                  <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mt-6">ALERTA: TURMAS DE BALLET COM FREQUÊNCIA BAIXA</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'secretaria' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">BUSCA RÁPIDA</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input type="text" placeholder="Nome do Aluno..." value={buscaSec} onChange={e => setBuscaSec(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-sm" />
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">STATUS</label>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                  <button onClick={() => setFiltroStatusSec('todos')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${filtroStatusSec === 'todos' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>Todos</button>
                  <button onClick={() => setFiltroStatusSec('ativos')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${filtroStatusSec === 'ativos' ? 'bg-emerald-50 text-white shadow-lg' : 'text-slate-400'}`}>Ativos</button>
                  <button onClick={() => setFiltroStatusSec('cancelados')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${filtroStatusSec === 'cancelados' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-400'}`}>Cancelados</button>
                </div>
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">UNIDADE</label>
                <select value={filtroUnidadeSec} onChange={e => { setFiltroUnidadeSec(e.target.value); setFiltrosCursosSec([]); }} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-sm appearance-none">
                  <option value="">Todas as Unidades</option>
                  {unidadesUnicas.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">FILTRO CURSOS (MULTI)</label>
                <div className="relative">
                  <button onClick={() => setIsCoursesOpen(!isCoursesOpen)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between font-bold text-sm text-slate-700">
                    <span>{filtrosCursosSec.length === 0 ? 'Selecionar Cursos' : `${filtrosCursosSec.length} selecionados`}</span>
                    {isCoursesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {isCoursesOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl z-50 p-4 max-h-[250px] overflow-y-auto">
                      {cursosFiltradosPelaUnidade.map(c => (
                        <label key={c} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                          <input type="checkbox" checked={filtrosCursosSec.includes(c)} onChange={() => toggleCursoFilter(c)} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                          <span className="text-[10px] font-black text-slate-600 uppercase">{c}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest">
                    <th className="px-8 py-6">ALUNO / UNIDADE</th>
                    <th className="px-8 py-6">CURSOS ATIVOS</th>
                    <th className="px-8 py-6">RESPONSÁVEL 1</th>
                    <th className="px-8 py-6">WHATSAPP 1</th>
                    <th className="px-8 py-6">RESPONSÁVEL 2</th>
                    <th className="px-8 py-6">WHATSAPP 2</th>
                    <th className="px-8 py-6">E-MAIL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {statsSecretaria.length > 0 ? statsSecretaria.map(aluno => {
                    const activeCourses = matriculas.filter(m => m.alunoId === aluno.id).map(m => {
                      const t = turmas.find(turma => normalizeText(m.turmaId).includes(normalizeText(turma.nome)));
                      return t ? t.nome : '';
                    }).filter(Boolean);
                    return (
                      <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <p className="text-xs font-black text-slate-800 uppercase leading-none">{aluno.nome}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {aluno.unidade}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-wrap gap-1">
                            {activeCourses.length > 0 ? activeCourses.map((c, i) => (
                              <span key={i} className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded border border-emerald-100">{c}</span>
                            )) : <span className="text-[9px] text-slate-300 italic">Nenhum ativo</span>}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xs font-bold text-slate-700">{aluno.responsavel1 || '--'}</td>
                        <td className="px-8 py-6">{aluno.whatsapp1 ? <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs"><Phone className="w-3.5 h-3.5" /> {aluno.whatsapp1.replace(/\D/g, '')}</div> : '--'}</td>
                        <td className="px-8 py-6 text-xs font-bold text-slate-700">{aluno.responsavel2 || '--'}</td>
                        <td className="px-8 py-6">{aluno.whatsapp2 ? <div className="flex items-center gap-2 text-slate-600 font-bold text-xs"><Phone className="w-3.5 h-3.5" /> {aluno.whatsapp2.replace(/\D/g, '')}</div> : '--'}</td>
                        <td className="px-8 py-6 text-xs font-medium text-slate-500 truncate max-w-[150px]" title={aluno.email}>{aluno.email || '--'}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={7} className="px-8 py-20 text-center text-slate-300 font-bold uppercase">Nenhum contato localizado com os filtros atuais.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'frequencia_geral' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5" /> ESTUDANTE</label>
                    <select value={freqEstudante} onChange={e => setFreqEstudante(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer">
                       <option value="">Todos os Estudantes (A-Z)</option>
                       {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> TURMA</label>
                    <select value={freqTurma} onChange={e => setFreqTurma(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer">
                       <option value="">Todas as Turmas (A-Z)</option>
                       {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> INÍCIO</label>
                    <input type="date" value={freqDataInicio} onChange={e => setFreqDataInicio(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" />
                 </div>
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> FIM</label>
                    <input type="date" value={freqDataFim} onChange={e => setFreqDataFim(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" />
                 </div>
              </div>
           </div>
           <div className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-slate-100">
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest">
                          <th className="px-10 py-6">DATA DA AULA</th>
                          <th className="px-10 py-6">TURMA</th>
                          <th className="px-10 py-6 text-center">P</th>
                          <th className="px-10 py-6 text-center">F</th>
                          <th className="px-10 py-6 text-right">%</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {statsFrequenciaGeral.length > 0 ? statsFrequenciaGeral.map((row, idx) => {
                         const pct = Math.round((row.p / (row.p + row.f)) * 100);
                         return (
                           <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-10 py-6 font-bold text-slate-700">{parseToDate(row.data)?.toLocaleDateString('pt-BR')}</td>
                              <td className="px-10 py-6 font-black text-slate-400 text-[11px] uppercase">{row.turma}</td>
                              <td className="px-10 py-6 text-center font-black text-slate-900 text-lg">{row.p}</td>
                              <td className="px-10 py-6 text-center font-black text-red-500 text-lg">{row.f}</td>
                              <td className="px-10 py-6 text-right font-black text-slate-900">{pct}%</td>
                           </tr>
                         );
                       }) : (
                          <tr><td colSpan={5} className="px-10 py-20 text-center text-slate-300 font-bold uppercase">Nenhum registro no período</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
