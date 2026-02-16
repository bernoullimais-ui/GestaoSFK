import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  User, 
  Search, 
  BarChart3, 
  UserCheck,
  ChevronDown,
  TrendingUp,
  FlaskConical,
  Target,
  Zap,
  Activity,
  MapPin,
  TrendingUp as TrendingUpIcon,
  Download, RefreshCw,
  Phone,
  UserPlus,
  TrendingDown,
  ChevronUp,
  BookOpen,
  ArrowRightLeft,
  UserMinus,
  MessageCircle,
  Clock,
  DollarSign,
  PieChart,
  Filter,
  Check,
  ChevronRight,
  TrendingUp as TrendUpIcon,
  LayoutGrid,
  ArrowUpRight,
  ArrowDownRight,
  X,
  AlertCircle,
  BarChart as BarChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  ComposedChart,
  AreaChart,
  Area
} from 'recharts';
import { Aluno, Turma, Presenca, Matricula, AulaExperimental, Usuario } from '../types';

interface RelatoriosProps {
  alunos: Aluno[];
  turmas: Turma[];
  presencas: Presenca[];
  matriculas?: Matricula[];
  experimentais?: AulaExperimental[];
  user: Usuario;
}

const Relatorios: React.FC<RelatoriosProps> = ({ alunos, turmas, presencas, matriculas = [], experimentais = [], user }) => {
  const normalizeText = (t: any) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const isMaster = user.nivel === 'Gestor Master' || user.nivel === 'Start' || normalizeText(user.unidade) === 'todas';
  const isGestorTier = user.nivel === 'Gestor' || user.nivel === 'Coordenador' || isMaster;
  
  const [activeTab, setActiveTab] = useState<'frequencia_geral' | 'bi' | 'secretaria'>(isGestorTier ? 'bi' : 'bi');
  const [biSubTab, setBiSubTab] = useState<'frequencia' | 'conversao' | 'fluxo'>(isGestorTier ? 'conversao' : 'fluxo');
  
  const [filtroUnidadeBI, setFiltroUnidadeBI] = useState('');
  
  // Unificação das datas para todos os filtros de período do BI
  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [freqEstudante, setFreqEstudante] = useState('');
  const [freqUnidade, setFreqUnidade] = useState('');
  const [freqTurma, setFreqTurma] = useState('');

  const [filtroStatusSec, setFiltroStatusSec] = useState<'todos' | 'ativos' | 'cancelados'>('todos');
  const [filtroUnidadeSec, setFiltroUnidadeSec] = useState('');
  const [filtrosCursosSec, setFiltrosCursosSec] = useState<string[]>([]);
  const [buscaSec, setBuscaSec] = useState('');
  const [isCoursesOpen, setIsCoursesOpen] = useState(false);

  const userPermittedUnits = useMemo(() => 
    normalizeText(user.unidade).split(',').map(u => u.trim()).filter(Boolean), 
    [user.unidade]
  );

  const unidadesUnicas = useMemo(() => {
    const rawUnits = Array.from(new Set(turmas.map(t => t.unidade).filter(Boolean)));
    if (isMaster) return rawUnits.sort();
    return rawUnits.filter(u => userPermittedUnits.some(p => normalizeText(u).includes(p) || p.includes(normalizeText(u)))).sort();
  }, [turmas, isMaster, userPermittedUnits]);

  useEffect(() => {
    if (!isMaster && !filtroUnidadeBI && unidadesUnicas.length > 0) {
      setFiltroUnidadeBI(unidadesUnicas[0]);
    }
  }, [unidadesUnicas, isMaster, filtroUnidadeBI]);

  const cleanPhone = (val: string | undefined) => {
    if (!val || val === 'FORMULA_ERROR') return '';
    return val.replace(/^(=?\+55\s?)/g, '').replace(/^(=)/g, '').trim();
  };

  const parseToDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return null;
    try {
      let s = String(dateVal).trim().toLowerCase();
      const ptMonths: Record<string, number> = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
      const ptMatch = s.match(/(\d{1,2})\s+de\s+([a-z]{3})[^\s]*\s+de\s+(\d{4})/);
      if (ptMatch) return new Date(parseInt(ptMatch[3]), ptMonths[ptMatch[2]] || 0, parseInt(ptMatch[1]));
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

  const turmasDisponiveisSec = useMemo(() => {
    let filtered = turmas;
    if (filtroUnidadeSec) {
      filtered = turmas.filter(t => normalizeText(t.unidade) === normalizeText(filtroUnidadeSec));
    }
    return Array.from(new Set(filtered.map(t => t.nome).filter(Boolean))).sort();
  }, [turmas, filtroUnidadeSec]);

  const turmasFiltradasFreq = useMemo(() => {
    if (!freqUnidade) return [];
    return turmas
      .filter(t => normalizeText(t.unidade) === normalizeText(freqUnidade))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [turmas, freqUnidade]);

  // --- LÓGICA BI FREQUÊNCIA ---
  const statsBIFrequencia = useMemo(() => {
    const start = parseToDate(dataInicio);
    const end = parseToDate(dataFim);
    
    let filtered = presencas.filter(p => {
      const unitFromRecord = p.unidade;
      const d = parseToDate(p.data);
      if (start && d && d < start) return false;
      if (end && d && d > end) return false;
      if (filtroUnidadeBI && normalizeText(unitFromRecord) !== normalizeText(filtroUnidadeBI)) return false;
      if (!isMaster && !unidadesUnicas.some(u => normalizeText(unitFromRecord) === normalizeText(u))) return false;
      return true;
    });

    const totalRegistros = filtered.length;
    const presentes = filtered.filter(p => p.status === 'Presente').length;
    const mediaGeral = totalRegistros > 0 ? Math.round((presentes / totalRegistros) * 100) : 0;

    const timeMap: Record<string, { label: string, p: number, f: number }> = {};
    filtered.forEach(p => {
      const d = parseToDate(p.data);
      if (!d) return;
      const key = p.data; 
      if (!timeMap[key]) timeMap[key] = { label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), p: 0, f: 0 };
      if (p.status === 'Presente') timeMap[key].p++; else timeMap[key].f++;
    });
    const trendData = Object.values(timeMap).map(v => ({ ...v, pct: Math.round((v.p / (v.p + v.f)) * 100) })).slice(-15);

    const turmaMap: Record<string, { name: string, unidade: string, p: number, f: number }> = {};
    filtered.forEach(p => {
      const tName = (p as any)._turmaPlanilha || p.turmaId;
      const unit = p.unidade;
      const key = `${tName}|${unit}`;
      if (!turmaMap[key]) turmaMap[key] = { name: tName, unidade: unit, p: 0, f: 0 };
      if (p.status === 'Presente') turmaMap[key].p++; else turmaMap[key].f++;
    });
    const rankingData = Object.values(turmaMap)
      .map(v => ({ name: v.name, unidade: v.unidade, pct: Math.round((v.p / (v.p + v.f)) * 100) }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);

    return { mediaGeral, presentes, totalRegistros, trendData, rankingData };
  }, [presencas, filtroUnidadeBI, dataInicio, dataFim, isMaster, unidadesUnicas]);

  // --- LÓGICA BI CONVERSÃO ---
  const statsConversao = useMemo(() => {
    let filtered = experimentais;
    if (filtroUnidadeBI) filtered = filtered.filter(e => normalizeText(e.unidade) === normalizeText(filtroUnidadeBI));
    const start = parseToDate(dataInicio);
    const end = parseToDate(dataFim);
    if (start || end) {
      filtered = filtered.filter(e => {
        const d = parseToDate(e.aula);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }
    const agendamentos = filtered.length;
    const presentes = filtered.filter(e => normalizeText(e.status) === 'presente').length;
    const followUps = filtered.filter(e => e.followUpSent).length;
    const matriculados = filtered.filter(e => e.convertido).length;
    const taxaComparecimento = agendamentos > 0 ? Math.round((presentes / agendamentos) * 100) : 0;
    const conversaoReal = presentes > 0 ? Math.round((matriculados / presentes) * 100) : 0;
    
    const chartDataMap: Record<string, { label: string, agendamentos: number, matriculas: number }> = {};
    experimentais.forEach(e => {
      const d = parseToDate(e.aula);
      if (!d) return;
      const monthLabel = d.toLocaleString('pt-BR', { month: 'short' }) + '. de ' + d.getFullYear().toString().substring(2);
      const key = `${d.getFullYear()}-${d.getMonth().toString().padStart(2, '0')}`;
      const isAllowedUnit = isMaster || unidadesUnicas.some(u => normalizeText(e.unidade) === normalizeText(u));
      if (!isAllowedUnit) return;
      if (!chartDataMap[key]) chartDataMap[key] = { label: monthLabel, agendamentos: 0, matriculas: 0 };
      if (!filtroUnidadeBI || normalizeText(e.unidade) === normalizeText(filtroUnidadeBI)) {
        chartDataMap[key].agendamentos++;
        if (e.convertido) chartDataMap[key].matriculas++;
      }
    });
    const chartData = Object.entries(chartDataMap).sort((a, b) => a[0].localeCompare(b[0])).map(([_, val]) => val).slice(-6);
    return { agendamentos, presentes, followUps, matriculados, taxaComparecimento, conversaoReal, chartData, filteredRaw: filtered };
  }, [experimentais, filtroUnidadeBI, dataInicio, dataFim, isMaster, unidadesUnicas]);

  // --- LÓGICA BI FLUXO ---
  const statsFluxo = useMemo(() => {
    const start = parseToDate(dataInicio);
    const end = parseToDate(dataFim);
    if (!start || !end) return { data: [], totals: { inicio: 0, novas: 0, cancelados: 0, fim: 0 } };
    let filteredTurmas = turmas;
    if (filtroUnidadeBI) filteredTurmas = turmas.filter(t => normalizeText(t.unidade) === normalizeText(filtroUnidadeBI));
    const stats: Record<string, { id: string, turma: string, professor: string, unidade: string, inicio: number, novas: number, cancelados: number, fim: number }> = {};
    filteredTurmas.forEach(t => { stats[t.id] = { id: t.id, turma: t.nome, professor: t.professor, unidade: t.unidade, inicio: 0, novas: 0, cancelados: 0, fim: 0 }; });
    matriculas.forEach(m => {
      const tObj = filteredTurmas.find(t => normalizeText(t.unidade) === normalizeText(m.unidade) && (normalizeText(m.turmaId).includes(normalizeText(t.nome)) || normalizeText(t.id) === normalizeText(m.turmaId)));
      if (!tObj || !stats[tObj.id]) return;
      const s = stats[tObj.id];
      const dMat = parseToDate(m.dataMatricula);
      if (dMat && dMat < start) s.inicio++; else if (dMat && dMat >= start && dMat <= end) s.novas++;
    });
    alunos.forEach(a => {
      (a.cursosCanceladosDetalhes || []).forEach(c => {
        const tObj = filteredTurmas.find(t => normalizeText(t.nome) === normalizeText(c.nome) && normalizeText(t.unidade) === normalizeText(c.unidade));
        if (!tObj || !stats[tObj.id]) return;
        const s = stats[tObj.id];
        const dCanc = parseToDate(c.dataCancelamento);
        const dMat = parseToDate(c.dataMatricula);
        if (dCanc && dCanc >= start && dCanc <= end) {
          s.cancelados++;
          if (dMat && dMat < start) s.inicio++;
        }
      });
    });
    const dataList = Object.values(stats).map(s => ({ ...s, fim: s.inicio + s.novas - s.cancelados })).sort((a, b) => a.turma.localeCompare(b.turma));
    const totals = dataList.reduce((acc, curr) => ({ inicio: acc.inicio + curr.inicio, novas: acc.novas + curr.novas, cancelados: acc.cancelados + curr.cancelados, fim: acc.fim + curr.fim, }), { inicio: 0, novas: 0, cancelados: 0, fim: 0 });
    return { data: dataList, totals };
  }, [matriculas, alunos, turmas, dataInicio, dataFim, filtroUnidadeBI, isMaster, unidadesUnicas]);

  const getCursosDoAluno = (alunoId: string) => matriculas.filter(m => m.alunoId === alunoId).map(m => {
    const t = turmas.find(t => t.id === m.turmaId || normalizeText(t.nome) === normalizeText(m.turmaId.split('-')[0]));
    return t ? t.nome : m.turmaId.split('-')[0].trim();
  }).filter(Boolean);

  const statsSecretaria = useMemo(() => alunos.filter(aluno => {
    if (buscaSec && !normalizeText(aluno.nome).includes(normalizeText(buscaSec))) return false;
    if (filtroUnidadeSec) { if (normalizeText(aluno.unidade) !== normalizeText(filtroUnidadeSec)) return false; }
    const cursosAluno = getCursosDoAluno(aluno.id);
    const isAtivo = cursosAluno.length > 0;
    if (filtroStatusSec === 'ativos' && !isAtivo) return false;
    if (filtroStatusSec === 'cancelados' && isAtivo) return false;
    if (filtrosCursosSec.length > 0) {
      if (!cursosAluno.some(ca => filtrosCursosSec.some(fs => normalizeText(ca).includes(normalizeText(fs)) || normalizeText(fs).includes(normalizeText(ca))))) return false;
    }
    return true;
  }).sort((a, b) => a.nome.localeCompare(b.nome)), [alunos, matriculas, turmas, filtroStatusSec, filtroUnidadeSec, filtrosCursosSec, buscaSec, isMaster, unidadesUnicas]);

  const statsFrequenciaGeral = useMemo(() => {
    const grouped: Record<string, { data: string, unidade: string, turma: string, p: number, f: number, tema: string }> = {};
    const start = parseToDate(dataInicio);
    const end = parseToDate(dataFim);
    presencas.forEach(pres => {
      const studentName = (pres as any)._estudantePlanilha || pres.alunoId;
      const className = (pres as any)._turmaPlanilha || pres.turmaId;
      const unit = pres.unidade;
      const d = parseToDate(pres.data);
      if (start && d && d < start) return;
      if (end && d && d > end) return;
      if (freqEstudante) { const sel = alunos.find(a => a.id === freqEstudante); if (sel && normalizeText(sel.nome) !== normalizeText(studentName)) return; }
      if (freqUnidade) { if (normalizeText(unit) !== normalizeText(freqUnidade)) return; }
      if (freqTurma) { const sel = turmas.find(t => t.id === freqTurma); if (sel && normalizeText(sel.nome) !== normalizeText(className)) return; }
      const key = `${pres.data}|${normalizeText(unit)}|${normalizeText(className)}`;
      if (!grouped[key]) {
        let tema = "";
        if (pres.observacao) {
          const m = pres.observacao.match(/\[Aula: (.*?)\]/);
          if (m) tema = m[1]; else if (!pres.observacao.includes("[Aluno:")) tema = pres.observacao;
        }
        grouped[key] = { data: pres.data, unidade: unit, turma: className, p: 0, f: 0, tema: tema };
      }
      if (pres.status === 'Presente') grouped[key].p++; else grouped[key].f++;
    });
    return Object.values(grouped).sort((a, b) => b.data.localeCompare(a.data));
  }, [presencas, turmas, alunos, freqEstudante, freqTurma, freqUnidade, dataInicio, dataFim, isMaster, unidadesUnicas]);

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let fileName = "sfk_relatorio";
    if (activeTab === 'frequencia_geral') {
      fileName = `sfk_frequencia_${new Date().toISOString().split('T')[0]}`;
      headers = ["Data da Aula", "Unidade", "Turma", "Presentes", "Faltas", "% Freq", "Tema da Aula"];
      rows = statsFrequenciaGeral.map(row => [parseToDate(row.data)?.toLocaleDateString('pt-BR') || '', row.unidade, row.turma, row.p.toString(), row.f.toString(), `${Math.round((row.p / (row.p + row.f)) * 100)}%`, row.tema || '']);
    } else if (activeTab === 'bi') {
      if (biSubTab === 'fluxo') {
        fileName = `sfk_bi_fluxo_${new Date().toISOString().split('T')[0]}`;
        headers = ["Turma", "Unidade", "Ativas Início", "Novas Matrículas", "Cancelamentos", "Ativas Fim", "Variação %"];
        rows = statsFluxo.data.map(row => [row.turma, row.unidade, row.inicio.toString(), row.novas.toString(), row.cancelados.toString(), row.fim.toString(), `${row.inicio > 0 ? Math.round(((row.fim - row.inicio) / row.inicio) * 100) : 100}%`]);
      } else if (biSubTab === 'conversao') {
        fileName = `sfk_bi_conversao_${new Date().toISOString().split('T')[0]}`;
        headers = ["Estudante", "Unidade", "Curso", "Data Experimental", "Responsável", "WhatsApp", "Status", "Convertido"];
        rows = statsConversao.filteredRaw.map(e => [e.estudante, e.unidade, e.curso, parseToDate(e.aula)?.toLocaleDateString('pt-BR') || '', e.responsavel1 || '', cleanPhone(e.whatsapp1), e.status || 'Pendente', e.convertido ? "SIM" : "NÃO"]);
      }
    } else if (activeTab === 'secretaria') {
      fileName = `sfk_contatos_${new Date().toISOString().split('T')[0]}`;
      headers = ["Estudante", "Cursos Ativos", "Responsavel 1", "WhatsApp 1", "Responsavel 2", "WhatsApp 2", "E-mail"];
      rows = statsSecretaria.map(aluno => [aluno.nome, getCursosDoAluno(aluno.id).join(' | '), aluno.responsavel1 || '', cleanPhone(aluno.whatsapp1), aluno.responsavel2 || '', cleanPhone(aluno.whatsapp2), aluno.email || '']);
    }
    const csvContent = [headers, ...rows].map(r => r.map(field => `"${(field || '').toString().replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `${fileName}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Business Intelligence</h2>
          {isGestorTier && (
            <div className="flex items-center gap-6 mt-3">
              <button onClick={() => setActiveTab('frequencia_geral')} className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-4 transition-all ${activeTab === 'frequencia_geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>FREQUÊNCIA</button>
              <button onClick={() => setActiveTab('bi')} className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-4 transition-all ${activeTab === 'bi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>VISÃO ESTRATÉGICA (BI)</button>
              <button onClick={() => setActiveTab('secretaria')} className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-4 transition-all ${activeTab === 'secretaria' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>CONTATOS</button>
            </div>
          )}
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 bg-[#0f172a] text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-95">
          <Download className="w-5 h-5" /> EXPORTAR PLANILHA
        </button>
      </div>

      {activeTab === 'bi' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex bg-slate-100 p-1.5 rounded-[24px] w-fit shadow-inner shrink-0">
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
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <select value={filtroUnidadeBI} onChange={e => setFiltroUnidadeBI(e.target.value)} disabled={!isMaster && unidadesUnicas.length <= 1} className="bg-transparent border-none rounded-lg text-[10px] font-black uppercase outline-none cursor-pointer">
                  {isMaster && <option value="">Todas as Unidades</option>}
                  {unidadesUnicas.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-50 border-none rounded-lg text-[10px] font-bold outline-none px-2 py-1" />
                <span className="text-slate-300">até</span>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-50 border-none rounded-lg text-[10px] font-bold outline-none px-2 py-1" />
              </div>
            </div>
          </div>

          {biSubTab === 'frequencia' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MÉDIA GERAL FREQUÊNCIA</p>
                   <h4 className="text-7xl font-black text-blue-600 leading-none mb-4">{statsBIFrequencia.mediaGeral}%</h4>
                   <p className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> ENGANJAMENTO ATIVO</p>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">VOLUME DE CHAMADAS</p>
                   <h4 className="text-7xl font-black text-slate-900 leading-none mb-4">{statsBIFrequencia.totalRegistros}</h4>
                   <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Users className="w-4 h-4"/> TOTAL NO PERÍODO</p>
                </div>
                <div className="bg-[#1e1b4b] p-10 rounded-[40px] shadow-sm border border-white/5 text-white">
                   <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">TOTAL DE PRESENÇAS</p>
                   <h4 className="text-7xl font-black text-indigo-400 leading-none mb-4">{statsBIFrequencia.presentes}</h4>
                   <p className="text-[10px] font-black text-indigo-200 uppercase flex items-center gap-2"><Activity className="w-4 h-4"/> ALUNOS EM AULA</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white p-12 rounded-[50px] shadow-sm border border-slate-100 flex flex-col">
                   <div className="flex items-center gap-4 mb-12">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><LineChartIcon className="w-6 h-6"/></div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Tendência de Engajamento (%)</h3>
                   </div>
                   <div className="flex-1 w-full min-h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={statsBIFrequencia.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                               <linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                               </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={15} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }} domain={[0, 100]} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px', padding: '16px' }} />
                            <Area type="monotone" dataKey="pct" name="Presença (%)" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorPct)" dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                         </AreaChart>
                      </ResponsiveContainer>
                   </div>
                </div>
                <div className="lg:col-span-4 bg-white p-12 rounded-[50px] shadow-sm border border-slate-100">
                   <div className="flex items-center gap-4 mb-12">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BarChartIcon className="w-6 h-6"/></div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Ranking Presença (Top 8)</h3>
                   </div>
                   <div className="space-y-6">
                      {statsBIFrequencia.rankingData.map((item, idx) => (
                        <div key={idx} className="space-y-2">
                           <div className="flex justify-between items-center">
                              <div className="min-w-0">
                                 <span className="text-[10px] font-black text-slate-500 uppercase truncate block leading-none mb-1">{item.name}</span>
                                 <span className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter block">{item.unidade}</span>
                              </div>
                              <span className="text-[11px] font-black text-slate-900">{item.pct}%</span>
                           </div>
                           <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                style={{ width: `${item.pct}%` }}
                              />
                           </div>
                        </div>
                      ))}
                      {statsBIFrequencia.rankingData.length === 0 && (
                        <div className="py-20 text-center text-slate-300 font-black uppercase text-xs italic">Nenhuma chamada filtrada</div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          )}

          {biSubTab === 'conversao' && isGestorTier && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 relative group overflow-hidden">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">AGENDAMENTOS</p>
                   <h4 className="text-7xl font-black text-slate-900 leading-none mb-4">{statsConversao.agendamentos}</h4>
                   <p className="text-[10px] font-black text-purple-600 uppercase flex items-center gap-2"><FlaskConical className="w-4 h-4"/> NO PERÍODO</p>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 relative group overflow-hidden">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">TAXA COMPARECIMENTO</p>
                   <h4 className="text-7xl font-black text-blue-600 leading-none mb-4">{statsConversao.taxaComparecimento}%</h4>
                   <p className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2"><Users className="w-4 h-4"/> {statsConversao.presentes} ESTUDANTES</p>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 relative group overflow-hidden">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">CONVERSÃO REAL</p>
                   <h4 className="text-7xl font-black text-emerald-500 leading-none mb-4">{statsConversao.conversaoReal}%</h4>
                   <p className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2"><UserCheck className="w-4 h-4"/> {statsConversao.matriculados} MATRÍCULAS</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-white p-12 rounded-[50px] shadow-sm border border-slate-100">
                   <div className="flex items-center gap-4 mb-12">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><BarChart3 className="w-6 h-6"/></div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Funil de Conversão</h3>
                   </div>
                   <div className="space-y-8">
                      {[
                        { label: 'AGENDADOS', value: statsConversao.agendamentos, color: 'bg-purple-600', total: statsConversao.agendamentos },
                        { label: 'PRESENTES', value: statsConversao.presentes, color: 'bg-blue-600', total: statsConversao.agendamentos },
                        { label: 'FOLLOW-UPS', value: statsConversao.followUps, color: 'bg-blue-500', total: statsConversao.agendamentos },
                        { label: 'MATRÍCULAS', value: statsConversao.matriculados, color: 'bg-emerald-500', total: statsConversao.agendamentos },
                      ].map((item, idx) => {
                        const pct = item.total > 0 ? Math.round((item.value / item.total) * 100) : 0;
                        return (
                          <div key={idx} className="flex items-center gap-8">
                            <div className="w-28 shrink-0 text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{item.label}</p></div>
                            <div className="flex-1 h-14 bg-slate-50 rounded-2xl overflow-hidden relative group"><div className={`h-full ${item.color} transition-all duration-1000 ease-out flex items-center justify-end pr-8`} style={{ width: `${Math.max(10, pct)}%` }}><span className="text-white font-black text-xl">{item.value}</span></div></div>
                          </div>
                        )
                      })}
                   </div>
                </div>
                <div className="lg:col-span-7 bg-white p-12 rounded-[50px] shadow-sm border border-slate-100 flex flex-col">
                   <div className="flex items-center gap-4 mb-12">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendUpIcon className="w-6 h-6"/></div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Agendamentos vs Matrículas</h3>
                   </div>
                   <div className="flex-1 w-full min-h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <ComposedChart data={statsConversao.chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={15} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px', padding: '16px' }} />
                            <Bar dataKey="agendamentos" name="Agendados" fill="#8b5cf6" radius={[12, 12, 0, 0]} barSize={36} />
                            <Line type="monotone" dataKey="matriculas" name="Matrículas" stroke="#10b981" strokeWidth={4} dot={{ r: 6, fill: '#10b981', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                         </ComposedChart>
                      </ResponsiveContainer>
                   </div>
                </div>
              </div>
            </div>
          )}

          {biSubTab === 'fluxo' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-700">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><ArrowRightLeft className="w-20 h-20" /></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">SALDO INICIAL (A)</p>
                   <h4 className="text-7xl font-black text-slate-900 leading-none">{statsFluxo.totals.inicio}</h4>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><UserPlus className="w-20 h-20" /></div>
                   <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 leading-none">NOVAS MATRÍCULAS (B)</p>
                   <h4 className="text-7xl font-black text-emerald-600 leading-none">+{statsFluxo.totals.novas}</h4>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-6 opacity-10 transition-opacity"><UserMinus className="w-20 h-20" /></div>
                   <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 leading-none">CANCELAMENTOS (C)</p>
                   <h4 className="text-7xl font-black text-red-500 leading-none">-{statsFluxo.totals.cancelados}</h4>
                </div>
                <div className="bg-blue-600 p-10 rounded-[40px] shadow-xl relative overflow-hidden group text-white">
                   <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><CheckCircle2 className="w-20 h-20 text-white" /></div>
                   <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-2 leading-none">SALDO ATUAL (A+B-C)</p>
                   <h4 className="text-7xl font-black text-white leading-none">{statsFluxo.totals.fim}</h4>
                </div>
              </div>
              <div className="bg-[#1e1b4b] rounded-[40px] shadow-2xl overflow-hidden border border-white/10">
                 <div className="px-10 py-8 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30"><GraduationCap className="w-6 h-6 text-white" /></div>
                       <h3 className="text-2xl font-black text-white uppercase tracking-tight">Evolução por Turma (A-Z)</h3>
                    </div>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-slate-50/5 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/5">
                             <th className="px-10 py-6">TURMA / MODALIDADE</th>
                             <th className="px-10 py-6 text-center">ATIVAS INÍCIO</th>
                             <th className="px-10 py-6 text-center text-emerald-400">NOVAS (+)</th>
                             <th className="px-10 py-6 text-center text-red-400">CANC. (-)</th>
                             <th className="px-10 py-6 text-center">ATIVAS FIM</th>
                             <th className="px-10 py-6 text-right">EVOLUÇÃO %</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5 bg-white">
                          {statsFluxo.data.map((row) => {
                             const variation = row.inicio > 0 ? Math.round(((row.fim - row.inicio) / row.inicio) * 100) : (row.novas > 0 ? 100 : 0);
                             const isPositive = variation > 0; const isNegative = variation < 0;
                             return (
                                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                   <td className="px-10 py-6"><p className="text-sm font-black text-slate-800 uppercase leading-none">{row.turma}</p></td>
                                   <td className="px-10 py-6 text-center"><span className="text-lg font-black text-slate-500">{row.inicio}</span></td>
                                   <td className="px-10 py-6 text-center"><span className="text-lg font-black text-emerald-500">+{row.novas}</span></td>
                                   <td className="px-10 py-6 text-center"><span className="text-lg font-black text-red-400">-{row.cancelados}</span></td>
                                   <td className="px-10 py-6 text-center"><span className="text-xl font-black text-blue-600">{row.fim}</span></td>
                                   <td className="px-10 py-6 text-right"><div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-sm border ${isPositive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : isNegative ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{isPositive ? <ArrowUpRight className="w-4 h-4" /> : isNegative ? <ArrowDownRight className="w-4 h-4" /> : null}{isPositive ? '+' : ''}{variation}%</div></td>
                                </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'secretaria' && isMaster && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><User className="w-3 h-3 text-indigo-500"/> BUSCA RÁPIDA</label>
                <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" /><input type="text" placeholder="Nome do Aluno..." value={buscaSec} onChange={e => setBuscaSec(e.target.value)} className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-sm" /></div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><MapPin className="w-3 h-3 text-blue-500"/> UNIDADE</label>
                <select value={filtroUnidadeSec} onChange={e => { setFiltroUnidadeSec(e.target.value); setFiltrosCursosSec([]); }} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-sm appearance-none cursor-pointer">
                  <option value="">Todas</option>
                  {unidadesUnicas.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="md:col-span-3 relative">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><GraduationCap className="w-3 h-3 text-emerald-500"/> TURMAS (MULTI-ESCOLHA)</label>
                <button onClick={() => setIsCoursesOpen(!isCoursesOpen)} className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between font-bold text-sm text-slate-600 hover:border-slate-200 transition-all"><span className="truncate">{filtrosCursosSec.length === 0 ? 'Todas as Turmas' : `${filtrosCursosSec.length} selecionadas`}</span><ChevronDown className={`w-4 h-4 transition-transform ${isCoursesOpen ? 'rotate-180' : ''}`} /></button>
                {isCoursesOpen && (<>
                  <div className="fixed inset-0 z-10" onClick={() => setIsCoursesOpen(false)}></div>
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-2xl rounded-3xl z-20 p-5 max-h-[300px] overflow-y-auto animate-in zoom-in-95 duration-200">
                    <div className="flex flex-col gap-2">
                      {turmasDisponiveisSec.map(t => (<label key={t} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors group"><input type="checkbox" checked={filtrosCursosSec.includes(t)} onChange={() => setFiltrosCursosSec(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500" /><span className="text-[11px] font-black text-slate-600 uppercase group-hover:text-blue-600">{t}</span></label>))}
                    </div>
                  </div>
                </>)}
              </div>
              <div className="md:col-span-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><Activity className="w-3 h-3 text-blue-500"/> STATUS DE MATRÍCULA</label>
                <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner">
                  <button onClick={() => setFiltroStatusSec('todos')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${filtroStatusSec === 'todos' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Todos</button>
                  <button onClick={() => setFiltroStatusSec('ativos')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${filtroStatusSec === 'ativos' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Ativos</button>
                  <button onClick={() => setFiltroStatusSec('cancelados')} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${filtroStatusSec === 'cancelados' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Saídas</button>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest"><th className="px-8 py-6">ALUNO / UNIDADE</th><th className="px-8 py-6">CURSOS ATIVOS</th><th className="px-8 py-6">RESPONSÁVEL 1</th><th className="px-8 py-6">WHATSAPP 1</th><th className="px-8 py-6">RESPONSÁVEL 2</th><th className="px-8 py-6">WHATSAPP 2</th><th className="px-8 py-6">E-MAIL</th></tr></thead>
                <tbody className="divide-y divide-slate-50">{statsSecretaria.map(aluno => (
                    <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6"><p className="text-xs font-black text-slate-800 uppercase">{aluno.nome}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{aluno.unidade}</p></td>
                      <td className="px-8 py-6"><div className="flex flex-wrap gap-1">{getCursosDoAluno(aluno.id).map((c, i) => (<span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded">{c}</span>))}</div></td>
                      <td className="px-8 py-6 text-xs font-bold">{aluno.responsavel1 || '--'}</td><td className="px-8 py-6 text-xs">{cleanPhone(aluno.whatsapp1)}</td><td className="px-8 py-6 text-xs font-bold">{aluno.responsavel2 || '--'}</td><td className="px-8 py-6 text-xs">{cleanPhone(aluno.whatsapp2)}</td><td className="px-8 py-6 text-xs truncate max-w-[150px]">{aluno.email || '--'}</td>
                    </tr>
                  ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'frequencia_geral' && isGestorTier && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5" /> ESTUDANTE</label><select value={freqEstudante} onChange={e => setFreqEstudante(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700"><option value="">Todos os Estudantes</option>{alunos.sort((a,b)=>a.nome.localeCompare(b.nome)).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> UNIDADE</label><select value={freqUnidade} onChange={e => { setFreqUnidade(e.target.value); setFreqTurma(''); }} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700"><option value="">Todas as Unidades</option>{unidadesUnicas.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> TURMA</label><select value={freqTurma} onChange={e => setFreqTurma(e.target.value)} disabled={!freqUnidade} className={`w-full px-6 py-4 border-2 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700 transition-all ${!freqUnidade ? 'bg-slate-50 border-slate-50 text-slate-300' : 'bg-slate-50 border-slate-100'}`}><option value="">{freqUnidade ? 'Todas as Turmas' : 'Selecione Unidade'}</option>{turmasFiltradasFreq.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> INÍCIO</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" /></div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> FIM</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" /></div>
              </div>
           </div>
           <div className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-slate-100">
              <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest"><th className="px-8 py-6">DATA DA AULA</th><th className="px-8 py-6">UNIDADE</th><th className="px-8 py-6">TURMA</th><th className="px-8 py-6 text-center">P</th><th className="px-8 py-6 text-center">F</th><th className="px-8 py-6 text-right">% FREQ</th><th className="px-8 py-6">TEMA DA AULA</th></tr></thead><tbody className="divide-y divide-slate-50">{statsFrequenciaGeral.map((row, idx) => (<tr key={idx} className="hover:bg-slate-50/50 transition-colors"><td className="px-8 py-6 font-bold text-slate-700">{parseToDate(row.data)?.toLocaleDateString('pt-BR')}</td><td className="px-8 py-6 font-black text-blue-500 text-[10px] uppercase">{row.unidade}</td><td className="px-8 py-6 font-black text-slate-400 text-[11px] uppercase">{row.turma}</td><td className="px-8 py-6 text-center font-black text-slate-900 text-lg">{row.p}</td><td className="px-8 py-6 text-center font-black text-red-500 text-lg">{row.f}</td><td className="px-8 py-6 text-right font-black text-slate-900">{Math.round((row.p / (row.p + row.f)) * 100)}%</td><td className="px-8 py-6 text-xs text-slate-500">{row.tema || '--'}</td></tr>))}</tbody></table></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Relatorios;