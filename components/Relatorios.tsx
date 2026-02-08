
import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  FileText, 
  Download, 
  Calendar, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  User, 
  Search, 
  History, 
  XCircle, 
  Info, 
  BarChart3, 
  PieChart as PieIcon,
  Contact2,
  Mail, 
  Phone,
  UserCheck,
  UserX,
  ClipboardList,
  ChevronDown,
  Check,
  TrendingUp,
  FlaskConical,
  Target,
  Zap,
  ArrowRight,
  TrendingDown,
  Activity,
  X,
  MousePointerClick,
  BarChart,
  BarChart as BarChartIcon,
  Layers,
  MessageSquare,
  BookOpen,
  MapPin
} from 'lucide-react';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { Aluno, Turma, Presenca, Matricula, AulaExperimental, Usuario } from '../types';

interface RelatoriosProps {
  alunos: Aluno[];
  turmas: Turma[];
  presencas: Presenca[];
  matriculas?: Matricula[];
  experimentais?: AulaExperimental[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const Relatorios: React.FC<RelatoriosProps> = ({ alunos, turmas, presencas, matriculas = [], experimentais = [] }) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'bi' | 'secretaria'>('geral');
  const [biSubTab, setBiSubTab] = useState<'frequencia' | 'conversao'>('frequencia');
  const [filtroTurmaUnica, setFiltroTurmaUnica] = useState(''); 
  const [filtroTurmasMulti, setFiltroTurmasMulti] = useState<string[]>([]); 
  const [filtroUnidadesMulti, setFiltroUnidadesMulti] = useState<string[]>([]);
  const [filtroAluno, setFiltroAluno] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'cancelados' | 'leads'>('todos');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [showExportSuccess, setShowExportSuccess] = useState(false);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState(false);
  const [isUnidadeSelectOpen, setIsUnidadeSelectOpen] = useState(false);

  const normalize = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const parseToDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '') return null;
    let s = String(dateVal).trim().toLowerCase();
    if (s.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const months: Record<string, number> = {
      'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
      'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
    };
    if (s.includes(' de ')) {
      const parts = s.split(/\s+de\s+|\s+|,/);
      const day = parseInt(parts[0]);
      const monthName = parts[1].replace('.', '').substring(0, 3);
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(year) && months[monthName] !== undefined) return new Date(year, months[monthName], day);
    }
    const dateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (dateMatch) {
      const d = parseInt(dateMatch[1]);
      const m = parseInt(dateMatch[2]);
      let y = parseInt(dateMatch[3]);
      if (y < 100) y += (y < 50 ? 2000 : 1900);
      return new Date(y, m - 1, d);
    }
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDisplayDate = (dateVal: any) => {
    const d = parseToDate(dateVal);
    if (!d) return '--/--/--';
    return d.toLocaleDateString('pt-BR');
  };

  const cleanPhoneDisplay = (phone: string | undefined) => {
    if (!phone) return '--';
    return phone.replace(/^(=?\+55\s?)/g, '').replace(/^(=)/g, '').trim();
  };

  const presencasFiltradas = useMemo(() => {
    let filtered = presencas;
    if (filtroTurmaUnica) {
      const selectedTurma = turmas.find(t => t.id === filtroTurmaUnica);
      const targetName = selectedTurma ? normalize(selectedTurma.nome) : '';
      filtered = filtered.filter(p => {
        const pId = p.turmaId || '';
        const pName = (p as any).turma || '';
        return pId === filtroTurmaUnica || normalize(pName) === targetName;
      });
    }
    if (filtroAluno) {
        const alunoObj = alunos.find(a => a.id === filtroAluno);
        const alunoNomeNorm = alunoObj ? normalize(alunoObj.nome) : '';
        filtered = filtered.filter(p => {
            const pid = p.alunoId || '';
            const pNome = (p as any).estudante || (p as any).aluno || '';
            return pid === filtroAluno || normalize(pNome) === alunoNomeNorm;
        });
    }
    if (dataInicio) filtered = filtered.filter(p => p.data >= dataInicio);
    if (dataFim) filtered = filtered.filter(p => p.data <= dataFim);
    return filtered;
  }, [presencas, filtroTurmaUnica, filtroAluno, dataInicio, dataFim, alunos, turmas]);

  const statsGerais = useMemo(() => {
    if (filtroAluno) {
      return presencasFiltradas
        .sort((a, b) => b.data.localeCompare(a.data))
        .map(p => ({
          type: 'aluno-detalhe',
          id: p.id,
          data: p.data,
          status: p.status,
          observacao: p.observacao,
          turma: turmas.find(t => t.id === p.turmaId)?.nome || (p as any).turma || p.turmaId
        }));
    }
    if (filtroTurmaUnica) {
      const groupedByDate: Record<string, { presentes: number, ausentes: number, obs: string }> = {};
      presencasFiltradas.forEach(p => {
        if (!groupedByDate[p.data]) {
          groupedByDate[p.data] = { presentes: 0, ausentes: 0, obs: '' };
        }
        if (p.status === 'Presente') groupedByDate[p.data].presentes++;
        else groupedByDate[p.data].ausentes++;
        if (p.observacao && p.observacao.includes('[Aula:')) {
          const match = p.observacao.match(/\[Aula:\s*(.*?)\]/);
          if (match && match[1] && !groupedByDate[p.data].obs.includes(match[1])) {
            groupedByDate[p.data].obs = (groupedByDate[p.data].obs ? groupedByDate[p.data].obs + ' | ' : '') + match[1];
          }
        }
      });
      return Object.entries(groupedByDate)
        .map(([data, stats]) => ({
          type: 'turma-detalhe',
          id: data,
          data,
          presentes: stats.presentes,
          ausentes: stats.ausentes,
          observacao: stats.obs
        }))
        .sort((a, b) => b.data.localeCompare(a.data));
    }
    const stats: Record<string, { total: number; presencas: number; studentName: string }> = {};
    presencasFiltradas.forEach(p => {
      const pId = p.alunoId;
      const pNomeLiteral = (p as any).estudante || (p as any).aluno || '';
      const key = pId && pId !== 'undefined' ? pId : normalize(pNomeLiteral);
      if (!key) return;
      if (!stats[key]) {
        const alunoObj = alunos.find(a => a.id === key || normalize(a.nome) === key);
        stats[key] = { total: 0, presencas: 0, studentName: alunoObj ? alunoObj.nome : (pNomeLiteral || key) };
      }
      stats[key].total += 1;
      if (p.status === 'Presente') stats[key].presencas += 1;
    });
    return Object.entries(stats).map(([key, val]) => ({
        type: 'resumo-aluno',
        id: key,
        nome: val.studentName,
        total: val.total,
        presencas: val.presencas,
        percentual: Math.round((val.presencas / val.total) * 100)
    })).sort((a, b) => a.nome.localeCompare(b.nome)); 
  }, [presencasFiltradas, filtroAluno, filtroTurmaUnica, alunos, turmas]);

  const unidadesUnicas = useMemo(() => {
    const units = Array.from(new Set(turmas.map(t => t.unidade))).filter(Boolean);
    return units.sort();
  }, [turmas]);

  const turmasDisponiveisFiltradas = useMemo(() => {
    // 1. Filtra turmas pelas unidades selecionadas (ou todas se vazio)
    const baseList = filtroUnidadesMulti.length === 0 
      ? turmas 
      : turmas.filter(t => filtroUnidadesMulti.includes(t.unidade));
    
    // 2. Remove duplicatas baseadas no Nome do Curso + Unidade
    const uniqueMap = new Map<string, Turma>();
    baseList.forEach(t => {
      const key = `${normalize(t.nome)}-${normalize(t.unidade)}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, t);
      }
    });
    
    return Array.from(uniqueMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [turmas, filtroUnidadesMulti]);

  const listaSecretaria = useMemo(() => {
    return alunos.filter(aluno => {
      const matsAluno = matriculas.filter(m => m.alunoId === aluno.id);
      const isAtivo = matsAluno.length > 0;
      const isLead = experimentais.some(e => normalize(e.estudante) === normalize(aluno.nome)) && !isAtivo;
      const isCancelado = !isAtivo && !isLead && (aluno.statusMatricula === 'Cancelado' || (aluno.cursosCanceladosDetalhes && aluno.cursosCanceladosDetalhes.length > 0));

      if (filtroStatus === 'ativos' && !isAtivo) return false;
      if (filtroStatus === 'leads' && !isLead) return false;
      if (filtroStatus === 'cancelados' && !isCancelado) return false;

      if (filtroUnidadesMulti.length > 0) {
        const unidadeDoAluno = normalize(aluno.unidade);
        const alunoEmUnidadeSelecionada = filtroUnidadesMulti.some(u => normalize(u) === unidadeDoAluno);
        if (!alunoEmUnidadeSelecionada) return false;
      }

      if (filtroTurmasMulti.length > 0) {
        const selectedTurmaObjects = turmas.filter(t => filtroTurmasMulti.includes(t.id));
        const alunoPossuiCursoSelecionado = matsAluno.some(m => {
          return selectedTurmaObjects.some(st => {
             const mTurmaIdNorm = normalize(m.turmaId);
             const stNomeNorm = normalize(st.nome);
             const mUnidadeNorm = normalize(m.unidade);
             const stUnidadeNorm = normalize(st.unidade);
             return m.turmaId === st.id || (mUnidadeNorm === stUnidadeNorm && mTurmaIdNorm.startsWith(stNomeNorm));
          });
        });
        if (!alunoPossuiCursoSelecionado) return false;
      }

      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, matriculas, experimentais, filtroStatus, filtroTurmasMulti, filtroUnidadesMulti, turmas]);

  const toggleTurmaMulti = (id: string) => {
    setFiltroTurmasMulti(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const toggleUnidadeMulti = (unidade: string) => {
    setFiltroUnidadesMulti(prev => {
      const isRemoving = prev.includes(unidade);
      const next = isRemoving ? prev.filter(u => u !== unidade) : [...prev, unidade];
      if (isRemoving && next.length > 0) {
        const turmasRestantes = turmas.filter(t => next.includes(t.unidade)).map(t => t.id);
        setFiltroTurmasMulti(current => current.filter(id => turmasRestantes.includes(id)));
      }
      return next;
    });
  };

  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[] = [];
    let fileName = `relatorio_${activeTab}_${new Date().getTime()}.csv`;

    if (activeTab === 'geral') {
      if (filtroAluno) {
        headers = ["Data", "Turma", "Status", "Observacao"];
        rows = (statsGerais as any[]).map(item => [formatDisplayDate(item.data), `"${item.turma}"`, item.status, `"${item.observacao || ''}"`]);
      } else if (filtroTurmaUnica) {
        headers = ["Data da Aula", "Presenças", "Ausências", "Observação da Aula"];
        rows = (statsGerais as any[]).map(item => [formatDisplayDate(item.data), item.presentes, item.ausentes, `"${item.observacao || ''}"`]);
      } else {
        headers = ["Estudante", "Total de Registros", "Total de Presenças", "% Frequência"];
        rows = (statsGerais as any[]).map(item => [`"${item.nome}"`, item.total, item.presencas, `${item.percentual}%`]);
      }
    } else if (activeTab === 'secretaria') {
      headers = ["Estudante", "Responsavel 1", "WhatsApp 1", "Responsavel 2", "WhatsApp 2", "E-mail"];
      rows = listaSecretaria.map(a => [
        `"${a.nome}"`,
        `"${a.responsavel1 || ''}"`,
        `"${a.whatsapp1 || ''}"`,
        `"${a.responsavel2 || ''}"`,
        `"${a.whatsapp2 || ''}"`,
        `"${a.email || ''}"`
      ]);
    }

    if (rows.length === 0) return;
    const csvContent = ["\ufeff" + headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    setShowExportSuccess(true);
    setTimeout(() => setShowExportSuccess(false), 3000);
  };

  const biFreqData = useMemo(() => {
    const turmaStats: Record<string, { t: number, p: number }> = {};
    presencas.forEach(p => {
      if (!turmaStats[p.turmaId]) turmaStats[p.turmaId] = { t: 0, p: 0 };
      turmaStats[p.turmaId].t++;
      if (p.status === 'Presente') turmaStats[p.turmaId].p++;
    });
    
    return Object.entries(turmaStats)
      .map(([name, val]) => ({ 
        name: turmas.find(t => t.id === name)?.nome || name, 
        value: Math.round((val.p / val.t) * 100),
        raw: val.t
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [presencas, turmas]);

  const monthlyTrend = useMemo(() => {
    const months: Record<string, { t: number, p: number }> = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    presencas.forEach(p => {
      const date = parseToDate(p.data);
      if (date) {
        const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
        if (!months[key]) months[key] = { t: 0, p: 0 };
        months[key].t++;
        if (p.status === 'Presente') months[key].p++;
      }
    });

    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, val]) => {
        const [year, month] = key.split('-');
        return {
          month: `${monthNames[parseInt(month)]}/${year.slice(-2)}`,
          frequencia: Math.round((val.p / val.t) * 100)
        };
      }).slice(-6);
  }, [presencas]);

  const biConversaoData = useMemo(() => {
    const total = experimentais.length;
    const presentes = experimentais.filter(e => e.status === 'Presente').length;
    const followUps = experimentais.filter(e => e.followUpSent && e.status === 'Presente').length;
    const matriculados = experimentais.filter(e => e.convertido).length;

    const funnelData = [
      { name: 'Agendados', value: total, fill: '#8b5cf6' },
      { name: 'Presentes', value: presentes, fill: '#6366f1' },
      { name: 'Follow-ups', value: followUps, fill: '#3b82f6' },
      { name: 'Matrículas', value: matriculados, fill: '#10b981' }
    ];

    const cursosMap: Record<string, { t: number, c: number }> = {};
    experimentais.forEach(e => {
      if (!cursosMap[e.curso]) cursosMap[e.curso] = { t: 0, c: 0 };
      cursosMap[e.curso].t++;
      if (e.convertido) cursosMap[e.curso].c++;
    });

    const porCurso = Object.entries(cursosMap)
      .map(([name, val]) => ({
        name,
        total: val.t,
        convertidos: val.c,
        taxa: val.t > 0 ? Math.round((val.c / val.t) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    const tendMap: Record<string, { a: number, c: number }> = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    experimentais.forEach(e => {
      const date = parseToDate(e.aula);
      if (date) {
        const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
        if (!tendMap[key]) tendMap[key] = { a: 0, c: 0 };
        tendMap[key].a++;
        if (e.convertido) tendMap[key].c++;
      }
    });

    const tendencia = Object.entries(tendMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, val]) => {
        const [year, month] = key.split('-');
        return {
          month: `${monthNames[parseInt(month)]}/${year.slice(-2)}`,
          agendados: val.a,
          matriculas: val.c
        };
      }).slice(-6);

    return { funnelData, porCurso, tendencia, total, presentes, matriculados };
  }, [experimentais]);

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painéis de Inteligência</h2>
          <div className="flex flex-wrap gap-4 mt-2">
            <button onClick={() => setActiveTab('geral')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>FREQUÊNCIA GERAL</button>
            <button onClick={() => setActiveTab('bi')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'bi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>VISÃO ESTRATÉGICA (BI)</button>
            <button onClick={() => setActiveTab('secretaria')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'secretaria' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>SECRETARIA</button>
          </div>
        </div>
        <button onClick={handleExport} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black transition-all shadow-lg hover:bg-slate-800 active:scale-95">
          <Download className="w-5 h-5" /> Exportar Dados
        </button>
      </div>

      {activeTab === 'bi' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
            <button 
              onClick={() => setBiSubTab('frequencia')} 
              className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2 ${biSubTab === 'frequencia' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
            >
              <Activity className="w-4 h-4" /> BI Frequência
            </button>
            <button 
              onClick={() => setBiSubTab('conversao')} 
              className={`px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-2 ${biSubTab === 'conversao' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-400'}`}
            >
              <Target className="w-4 h-4" /> BI Conversão
            </button>
          </div>

          {biSubTab === 'frequencia' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <BarChartIcon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Top Frequência por Turma</h3>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={biFreqData} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="value" name="% Frequência" radius={[8, 8, 0, 0]}>
                          {biFreqData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Tendência Mensal Geral</h3>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrend} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorFreq" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Area type="monotone" dataKey="frequencia" name="Frequência %" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorFreq)" />
                      </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agendamentos</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">{biConversaoData.total}</p>
                  <div className="flex items-center gap-1 mt-2 text-purple-600 font-bold text-xs">
                    <FlaskConical className="w-3 h-3" /> Total Bruto
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa Comparecimento</p>
                  <p className="text-3xl font-black text-blue-600 mt-1">
                    {biConversaoData.total > 0 ? Math.round((biConversaoData.presentes / biConversaoData.total) * 100) : 0}%
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-blue-600 font-bold text-xs">
                    <Users className="w-3 h-3" /> {biConversaoData.presentes} Estudantes
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conversão Real</p>
                  <p className="text-3xl font-black text-emerald-600 mt-1">
                    {biConversaoData.presentes > 0 ? Math.round((biConversaoData.matriculados / biConversaoData.presentes) * 100) : 0}%
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-emerald-600 font-bold text-xs">
                    <UserCheck className="w-3 h-3" /> {biConversaoData.matriculados} Matrículas
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CAC Experimental</p>
                  <p className="text-3xl font-black text-slate-400 mt-1">--</p>
                  <div className="flex items-center gap-1 mt-2 text-slate-400 font-bold text-[10px] uppercase">
                    Custo por Matrícula
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Funil de Conversão</h3>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart layout="vertical" data={biConversaoData.funnelData} margin={{ left: 20, right: 40 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none' }} />
                        <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                           <LabelList dataKey="value" position="right" style={{ fontSize: 12, fontWeight: 900, fill: '#1e293b' }} />
                        </Bar>
                      </ReBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Agendamentos vs Matrículas</h3>
                  </div>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={biConversaoData.tendencia}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                        <Area type="monotone" dataKey="agendados" fill="#8b5cf6" fillOpacity={0.05} stroke="#8b5cf6" strokeWidth={2} />
                        <Bar dataKey="matriculas" barSize={20} fill="#10b981" radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                   <div className="flex items-center gap-3 mb-8">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                        <MousePointerClick className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Conversão por Modalidade (Ranking)</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {biConversaoData.porCurso.map((item, i) => (
                        <div key={i} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-purple-200 transition-all">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{item.name}</p>
                           <div className="flex items-end justify-between mt-2">
                              <p className="text-2xl font-black text-slate-900">{item.taxa}%</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">{item.convertidos}/{item.total} Matriculados</p>
                           </div>
                           <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                              <div className="h-full bg-purple-600 rounded-full group-hover:bg-purple-500 transition-all" style={{ width: `${item.taxa}%` }} />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'geral' && (
        <>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Aluno</label>
              <select value={filtroAluno} onChange={(e) => { setFiltroAluno(e.target.value); if(e.target.value) setFiltroTurmaUnica(''); }} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold">
                <option value="">Todos da Aba Frequência</option>
                {[...alunos].sort((a,b)=>a.nome.localeCompare(b.nome)).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Turma</label>
              <select value={filtroTurmaUnica} onChange={(e) => { setFiltroTurmaUnica(e.target.value); if(e.target.value) setFiltroAluno(''); }} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold">
                <option value="">Todas as Turmas</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Início</label>
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold"/>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Fim</label>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm font-bold"/>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
            <div className="p-5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {filtroAluno ? <History className="w-5 h-5 text-blue-600" /> : filtroTurmaUnica ? <BookOpen className="w-5 h-5 text-blue-600" /> : <Activity className="w-5 h-5 text-blue-600" />}
                <span className="font-black text-slate-700 uppercase text-xs tracking-wider">
                  {filtroAluno ? 'Histórico Nominal Detalhado' : filtroTurmaUnica ? 'Histórico da Turma por Aula' : 'Histórico de Frequência'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-black uppercase">
                {filtroTurmaUnica ? `${statsGerais.length} Aulas Registradas` : `${statsGerais.length} Estudantes com Registros`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  {filtroAluno ? (
                    <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100 bg-slate-50/50">
                      <th className="px-8 py-4">Data da Aula</th>
                      <th className="px-8 py-4">Turma/Curso</th>
                      <th className="px-8 py-4 text-center">Status</th>
                      <th className="px-8 py-4">Observação</th>
                    </tr>
                  ) : filtroTurmaUnica ? (
                    <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100 bg-slate-50/50">
                      <th className="px-8 py-4">Data da Aula</th>
                      <th className="px-8 py-4 text-center">Presenças</th>
                      <th className="px-8 py-4 text-center">Ausências</th>
                      <th className="px-8 py-4">Observação da Aula</th>
                    </tr>
                  ) : (
                    <tr className="text-slate-400 text-[10px] uppercase font-black border-b border-slate-100 bg-slate-50/50">
                      <th className="px-8 py-4">Estudante</th>
                      <th className="px-8 py-4 text-center">Registros</th>
                      <th className="px-8 py-4 text-center">Presenças</th>
                      <th className="px-8 py-4">Frequência (%)</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {statsGerais.length > 0 ? statsGerais.map((item: any) => {
                    if (item.type === 'aluno-detalhe') {
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-800">{formatDisplayDate(item.data)}</td>
                          <td className="px-8 py-4 text-sm font-medium text-slate-600">{item.turma}</td>
                          <td className="px-8 py-4 text-center">
                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
                              item.status === 'Presente' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                            }`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-xs text-slate-500 font-medium">{item.observacao || '--'}</td>
                        </tr>
                      );
                    } else if (item.type === 'turma-detalhe') {
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-800">{formatDisplayDate(item.data)}</td>
                          <td className="px-8 py-4 text-center">
                            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-lg font-black text-xs">{item.presentes} Presenças</span>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className="px-3 py-1 bg-red-50 text-red-700 rounded-lg font-black text-xs">{item.ausentes} Ausências</span>
                          </td>
                          <td className="px-8 py-4">
                             {item.observacao ? (
                               <div className="flex items-start gap-2 max-w-sm">
                                 <MessageSquare className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                                 <span className="text-xs text-slate-500 leading-relaxed font-medium">{item.observacao}</span>
                               </div>
                             ) : (
                               <span className="text-xs text-slate-300 italic">Sem conteúdo registrado.</span>
                             )}
                          </td>
                        </tr>
                      );
                    } else {
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-bold text-slate-800">{item.nome}</td>
                          <td className="px-8 py-4 text-center font-bold text-slate-400">{item.total}</td>
                          <td className="px-8 py-4 text-center font-black text-slate-900">{item.presencas}</td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${item.percentual >= 80 ? 'bg-green-500' : item.percentual >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{width: `${item.percentual}%`}}/>
                              </div>
                              <span className="text-xs font-black text-slate-700">{item.percentual}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  }) : (
                    <tr>
                        <td colSpan={4} className="px-8 py-20 text-center">
                            <div className="w-12 h-12 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-6 h-6" />
                            </div>
                            <h4 className="text-slate-400 font-bold">Nenhum registro localizado</h4>
                        </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'secretaria' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col gap-8">
             <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">Segmentação de Status</label>
                  <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl gap-1">
                    {[
                      {id: 'todos', label: 'Todos os Estudantes'},
                      {id: 'ativos', label: 'Matrículas Ativas'},
                      {id: 'cancelados', label: 'Todas Canceladas'},
                      {id: 'leads', label: 'Leads (Experimental)'}
                    ].map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => setFiltroStatus(s.id as any)} 
                        className={`flex-1 py-3 px-2 text-[10px] font-black uppercase rounded-xl transition-all ${filtroStatus === s.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Filtro por Unidade */}
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Unidades (Multi-seleção)
                    </label>
                    <div 
                      onClick={() => setIsUnidadeSelectOpen(!isUnidadeSelectOpen)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 flex flex-wrap gap-2 cursor-pointer min-h-[56px] hover:border-blue-200 transition-colors"
                    >
                      {filtroUnidadesMulti.length === 0 ? (
                        <span className="text-slate-300 font-bold text-xs uppercase">Todas as Unidades</span>
                      ) : (
                        filtroUnidadesMulti.map(u => (
                          <span key={u} className="bg-emerald-600 text-white text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 animate-in zoom-in-90">
                            {u}
                            <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); toggleUnidadeMulti(u); }} />
                          </span>
                        ))
                      )}
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                    {isUnidadeSelectOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsUnidadeSelectOpen(false)} />
                        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-4 space-y-1 animate-in slide-in-from-top-2">
                           {unidadesUnicas.map(u => (
                             <div 
                               key={u} 
                               onClick={() => toggleUnidadeMulti(u)}
                               className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${filtroUnidadesMulti.includes(u) ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50 text-slate-600'}`}
                             >
                                <span className="text-xs font-bold">{u}</span>
                                {filtroUnidadesMulti.includes(u) && <Check className="w-4 h-4" />}
                             </div>
                           ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Filtro por Cursos */}
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" /> Cursos (Multi-seleção)
                    </label>
                    <div 
                      onClick={() => setIsMultiSelectOpen(!isMultiSelectOpen)}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 flex flex-wrap gap-2 cursor-pointer min-h-[56px] hover:border-blue-200 transition-colors"
                    >
                      {filtroTurmasMulti.length === 0 ? (
                        <span className="text-slate-300 font-bold text-xs uppercase">Selecione cursos...</span>
                      ) : (
                        filtroTurmasMulti.map(id => (
                          <span key={id} className="bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 animate-in zoom-in-90">
                            {turmas.find(t => t.id === id)?.nome || id}
                            <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); toggleTurmaMulti(id); }} />
                          </span>
                        ))
                      )}
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    </div>
                    {isMultiSelectOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsMultiSelectOpen(false)} />
                        <div className="absolute z-50 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-4 space-y-1 animate-in slide-in-from-top-2">
                           {turmasDisponiveisFiltradas.length > 0 ? turmasDisponiveisFiltradas.map(t => (
                             <div 
                               key={t.id} 
                               onClick={() => toggleTurmaMulti(t.id)}
                               className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${filtroTurmasMulti.includes(t.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}
                             >
                                <span className="text-xs font-bold">{t.nome} ({t.unidade})</span>
                                {filtroTurmasMulti.includes(t.id) && <Check className="w-4 h-4" />}
                             </div>
                           )) : <p className="text-center text-xs text-slate-400 py-4">Nenhuma turma para as unidades selecionadas.</p>}
                        </div>
                      </>
                    )}
                  </div>
                </div>
             </div>
             
             <div className="flex justify-end">
               <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 min-w-[200px] text-center shadow-sm">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Resultados</p>
                  <p className="text-4xl font-black text-blue-600 leading-none">{listaSecretaria.length}</p>
                  <p className="text-[9px] font-black text-blue-400 uppercase mt-2">Estudantes Listados</p>
               </div>
             </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-8 py-5">Estudante</th>
                      <th className="px-8 py-5">Responsável 1 + WhatsApp</th>
                      <th className="px-8 py-5">Responsável 2 + WhatsApp</th>
                      <th className="px-8 py-5">E-mail de Contato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {listaSecretaria.length > 0 ? listaSecretaria.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50/50 transition-all group">
                         <td className="px-8 py-5">
                            <p className="font-black text-slate-800 text-sm leading-tight group-hover:text-blue-600 transition-colors">{a.nome}</p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {matriculas.filter(m => m.alunoId === a.id).map(m => (
                                <span key={m.turmaId} className="text-[8px] font-black bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-tighter">
                                  {turmas.find(t=>t.id===m.turmaId)?.nome || m.turmaId}
                                </span>
                              ))}
                              {experimentais.some(e => normalize(e.estudante) === normalize(a.nome)) && (
                                <span className="text-[8px] font-black bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded border border-purple-200 uppercase tracking-tighter">LEAD</span>
                              )}
                              <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 uppercase tracking-tighter">{a.unidade}</span>
                            </div>
                         </td>
                         <td className="px-8 py-5">
                            <p className="text-xs font-bold text-slate-700">{a.responsavel1 || '--'}</p>
                            {a.whatsapp1 && (
                              <div className="flex items-center gap-1.5 text-[11px] font-black text-green-600 mt-1.5 bg-green-50 w-fit px-2 py-0.5 rounded-lg border border-green-100">
                                <Phone className="w-3 h-3" /> {cleanPhoneDisplay(a.whatsapp1)}
                              </div>
                            )}
                         </td>
                         <td className="px-8 py-5">
                            <p className="text-xs font-bold text-slate-700">{a.responsavel2 || '--'}</p>
                            {a.whatsapp2 && (
                              <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-400 mt-1.5 bg-slate-100 w-fit px-2 py-0.5 rounded-lg border border-slate-200">
                                <Phone className="w-3 h-3" /> {cleanPhoneDisplay(a.whatsapp2)}
                              </div>
                            )}
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                               <Mail className="w-3.5 h-3.5 text-blue-400" />
                               <span className="truncate max-w-[200px]">{a.email || '--'}</span>
                            </div>
                         </td>
                      </tr>
                    )) : (
                      <tr>
                         <td colSpan={4} className="px-8 py-20 text-center">
                            <Search className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold">Nenhum registro corresponde aos filtros aplicados.</p>
                         </td>
                      </tr>
                    )}
                  </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {showExportSuccess && (
        <div className="fixed bottom-8 right-8 bg-slate-900 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 duration-300 z-[70]">
          <CheckCircle2 className="w-6 h-6 text-green-400" />
          <p className="font-black">Exportação concluída com sucesso!</p>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
