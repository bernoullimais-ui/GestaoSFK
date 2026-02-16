import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Calendar, 
  Users, 
  GraduationCap, 
  CheckCircle2, 
  User, 
  Search, 
  Activity, 
  X, 
  Check, 
  BarChart, 
  LayoutGrid, 
  List, 
  MessageCircle, 
  Briefcase, 
  Target, 
  Zap, 
  TrendingUp, 
  Filter,
  FileText,
  Info,
  History,
  XCircle,
  FlaskConical,
  ArrowRight,
  TrendingDown,
  MessageSquare,
  BookOpen,
  DollarSign,
  Wallet,
  FileSpreadsheet,
  Coins,
  PieChart as PieIcon,
  TrendingUp as TrendingUpIcon,
  UserCheck,
  Mail,
  ArrowUpRight,
  BarChart3,
  Percent,
  ClipboardPaste,
  Clock,
  ArrowUpCircle,
  MinusCircle,
  MoveUpRight,
  MoveDownRight,
  RefreshCw as RefreshIcon,
  Trophy,
  ChevronDown,
  Calculator,
  UserPlus,
  Phone,
  ShieldCheck,
  UserX,
  FileSearch,
  Layout,
  Layers,
  Presentation
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
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { Aluno, Turma, Presenca, Matricula, AulaExperimental, Usuario, CursoCancelado } from '../types';

interface RelatoriosProps {
  alunos: Aluno[];
  turmas: Turma[];
  presencas: Presenca[];
  matriculas?: Matricula[];
  experimentais?: AulaExperimental[];
  currentUser: Usuario;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
const INICIO_AULAS_2026 = new Date(2026, 1, 2, 12, 0, 0); 

const Relatorios: React.FC<RelatoriosProps> = ({ alunos, turmas, presencas, matriculas = [], experimentais = [], currentUser }) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'bi' | 'secretaria' | 'financeiro' | 'integral'>('geral');
  const [biSubTab, setBiSubTab] = useState<'frequencia' | 'conversao' | 'fluxo'>('conversao');
  
  const [viewFinanceiro, setViewFinanceiro] = useState<'detalhado' | 'resumido'>('resumido');
  const [biConvPeriodo, setBiConvPeriodo] = useState<'mensal' | 'anual' | 'total'>('total');
  
  const [filtroMesIntegral, setFiltroMesIntegral] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [biSelectedMonth, setBiSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [biFluxoInicio, setBiFluxoInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [biFluxoFim, setBiFluxoFim] = useState(() => new Date().toISOString().split('T')[0]);

  const [filtroTurmaUnica, setFiltroTurmaUnica] = useState(''); 
  const [filtroAluno, setFiltroAluno] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [secretariaStatusFilter, setSecretariaStatusFilter] = useState<'todos' | 'ativos' | 'cancelados'>('todos');
  const [filtroCursosMulti, setFiltroCursosMulti] = useState<string[]>([]);
  const [isCourseFilterOpen, setIsCourseFilterOpen] = useState(false);
  const [searchContato, setSearchContato] = useState('');

  const [filtroMesFin, setFiltroMesFin] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [filtroProfsMulti, setFiltroProfsMulti] = useState<string[]>([]);
  const [isProfFilterOpen, setIsProfFilterOpen] = useState(false);

  const isMaster = currentUser.nivel === 'Gestor Master';

  const sortedAlunos = useMemo(() => [...alunos].sort((a, b) => a.nome.localeCompare(b.nome)), [alunos]);
  const sortedTurmas = useMemo(() => [...turmas].sort((a, b) => a.nome.localeCompare(b.nome)), [turmas]);

  const listProfessores = useMemo(() => {
    const profs = turmas.map(t => t.professor).filter(Boolean);
    return Array.from(new Set(profs)).sort();
  }, [turmas]);

  const parseToDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return null;
    try {
      let s = String(dateVal).toString().trim().toLowerCase();
      if (s.includes(',')) s = s.split(',')[0].trim();
      const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]), 12, 0, 0);
      const monthsMap: Record<string, number> = {
        'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
      };
      if (s.includes(' de ')) {
        const cleanS = s.replace(/\./g, '');
        const parts = cleanS.split(/\s+/);
        const day = parseInt(parts[0]);
        const monthPart = parts.find(p => monthsMap[p.substring(0, 3)] !== undefined);
        const yearPart = parts.find(p => /^\d{4}$/.test(p));
        if (!isNaN(day) && monthPart && yearPart) return new Date(parseInt(yearPart), monthsMap[monthPart.substring(0, 3)], day, 12, 0, 0);
      }
      const dateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (dateMatch) {
        let y = parseInt(dateMatch[3]);
        if (y < 100) y += (y < 50 ? 2000 : 1900);
        return new Date(y, parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]), 12, 0, 0);
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) { d.setHours(12, 0, 0, 0); return d; }
    } catch(e) { return null; }
    return null;
  };

  const formatEscolaridade = (aluno: Aluno) => {
    let etapa = (aluno.etapa || '').toUpperCase().trim();
    let ano = (aluno.anoEscolar || '').trim();
    let turmaLetra = (aluno.turmaEscolar || '').trim();
    if (etapa.includes('INFANTIL')) etapa = 'EI';
    else if (etapa.includes('FUNDAMENTAL')) etapa = 'EF';
    else if (etapa.includes('MEDIO')) etapa = 'EM';
    ano = ano.replace(/\s*ano\s*$/i, '').replace(/\s*série\s*$/i, '').replace(/\s*serie\s*$/i, '').trim();
    if (!etapa || !ano) return '--';
    return `${etapa}-${ano}${turmaLetra ? ' ' + turmaLetra : ''}`.trim();
  };

  const extractObservation = (obs: string | undefined, type: 'aula' | 'aluno') => {
    if (!obs) return '--';
    if (type === 'aula') {
      const match = obs.match(/\[Aula: (.*?)\]/);
      return match ? match[1] : (obs.includes('[Aluno:') ? '--' : obs);
    } else {
      const match = obs.match(/\[Aluno: (.*?)\]/);
      return match ? match[1] : (obs.includes('[Aula:') ? '--' : obs);
    }
  };

  const integralReportData = useMemo(() => {
    if (!filtroMesIntegral || !isMaster) return [];
    const [year, month] = filtroMesIntegral.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);
    return sortedAlunos
      .filter(aluno => {
        const isIntegral = aluno.plano?.toLowerCase().includes('integral');
        if (!isIntegral) return false;
        const ativas = matriculas.filter(m => m.alunoId === aluno.id);
        const canceladas = aluno.cursosCanceladosDetalhes || [];
        const hasActivePeriod = [...ativas, ...canceladas].some(course => {
          const dMat = parseToDate(course.dataMatricula);
          if (!dMat) return false;
          const dCanc = (course as any).dataCancelamento ? parseToDate((course as any).dataCancelamento) : null;
          const startsBeforeEnd = dMat <= monthEnd;
          const endsAfterStart = !dCanc || dCanc >= monthStart;
          return startsBeforeEnd && endsAfterStart;
        });
        return hasActivePeriod;
      })
      .map(aluno => {
        const ativas = matriculas.filter(m => m.alunoId === aluno.id);
        const canceladas = aluno.cursosCanceladosDetalhes || [];
        let totalValue = 0;
        const studentCourses: Array<{nome: string, valor: number}> = [];
        [...ativas, ...canceladas].forEach(course => {
          const dMat = parseToDate(course.dataMatricula);
          const dCanc = (course as any).dataCancelamento ? parseToDate((course as any).dataCancelamento) : null;
          if (dMat && dMat <= monthEnd && (!dCanc || dCanc >= monthStart)) {
            const turmaNome = (course as any).turmaId || (course as any).nome;
            const turma = turmas.find(t => t.id === turmaNome || t.nome === turmaNome);
            if (turma) {
              let valor = Number(turma.valorMensal) || 0;
              const nomeNormalizado = turma.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              if (nomeNormalizado.includes("funcional kids terca") || nomeNormalizado.includes("funcional kids quarta")) {
                valor = valor * 0.5;
              }
              if (!studentCourses.some(sc => sc.nome === turma.nome)) {
                totalValue += valor;
                studentCourses.push({ nome: turma.nome, valor });
              }
            }
          }
        });
        return {
          id: aluno.id,
          nome: aluno.nome,
          escolaridade: formatEscolaridade(aluno),
          cursos: studentCourses,
          total: totalValue
        };
      })
      .filter(item => item.cursos.length > 0)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [sortedAlunos, matriculas, turmas, filtroMesIntegral, isMaster]);

  const biFluxoData = useMemo(() => {
    const start = parseToDate(biFluxoInicio);
    const end = parseToDate(biFluxoFim);
    if (!start || !end) return { resumo: {}, turmas: [] };
    const startTime = start.getTime();
    const endTime = end.getTime() + (24 * 60 * 60 * 1000) - 1;
    const turmasStats: Record<string, any> = {};
    sortedTurmas.forEach(t => { turmasStats[t.id] = { nome: t.nome, professor: t.professor, inicio: 0, novas: 0, canceladas: 0, fim: 0 }; });
    alunos.forEach(aluno => {
      const ativas = matriculas.filter(m => m.alunoId === aluno.id);
      ativas.forEach(m => {
        if (!turmasStats[m.turmaId]) return;
        const dMat = parseToDate(m.dataMatricula);
        if (!dMat) return;
        const dMatTime = dMat.getTime();
        if (dMatTime < startTime) turmasStats[m.turmaId].inicio++;
        if (dMatTime >= startTime && dMatTime <= endTime) turmasStats[m.turmaId].novas++;
        if (dMatTime <= endTime) turmasStats[m.turmaId].fim++;
      });
      const canceladas = aluno.cursosCanceladosDetalhes || [];
      canceladas.forEach(c => {
        const tId = sortedTurmas.find(t => t.nome === c.nome || t.id === c.nome)?.id || c.nome;
        if (!turmasStats[tId]) return;
        const dMat = parseToDate(c.dataMatricula);
        const dCanc = parseToDate(c.dataCancelamento);
        if (!dMat || !dCanc) return;
        const dMatTime = dMat.getTime();
        const dCancTime = dCanc.getTime();
        if (dMatTime < startTime && dCancTime >= startTime) turmasStats[tId].inicio++;
        if (dMatTime >= startTime && dMatTime <= endTime) turmasStats[tId].novas++;
        if (dCancTime >= startTime && dCancTime <= endTime) turmasStats[tId].canceladas++;
        if (dMatTime <= endTime && dCancTime > endTime) turmasStats[tId].fim++;
      });
    });
    const listaTurmas = Object.values(turmasStats).sort((a, b) => a.nome.localeCompare(b.nome));
    const resumo = listaTurmas.reduce((acc, curr) => {
      acc.inicio += curr.inicio; acc.novas += curr.novas; acc.canceladas += curr.canceladas; acc.fim += curr.fim; return acc;
    }, { inicio: 0, novas: 0, canceladas: 0, fim: 0 });
    return { resumo, turmas: listaTurmas };
  }, [alunos, sortedTurmas, matriculas, biFluxoInicio, biFluxoFim]);

  const filteredContatos = useMemo(() => {
    return sortedAlunos.filter(aluno => {
      const matchesSearch = !searchContato || aluno.nome.toLowerCase().includes(searchContato.toLowerCase()) || (aluno.email && aluno.email.toLowerCase().includes(searchContato.toLowerCase()));
      const turmasDoAluno = matriculas.filter(m => m.alunoId === aluno.id).map(m => m.turmaId);
      const isAtivo = turmasDoAluno.length > 0;
      let matchesStatus = true;
      if (secretariaStatusFilter === 'ativos') matchesStatus = isAtivo;
      else if (secretariaStatusFilter === 'cancelados') matchesStatus = !isAtivo;
      let matchesCursos = true;
      if (filtroCursosMulti.length > 0) matchesCursos = turmasDoAluno.some(tId => filtroCursosMulti.includes(tId));
      return matchesSearch && matchesStatus && matchesCursos;
    });
  }, [sortedAlunos, searchContato, secretariaStatusFilter, filtroCursosMulti, matriculas]);

  const frequenciaData = useMemo(() => {
    if (filtroAluno) {
      return presencas
        .filter(p => p.alunoId === filtroAluno)
        .filter(p => (!dataInicio || p.data >= dataInicio) && (!dataFim || p.data <= dataFim))
        .map(p => {
          const t = turmas.find(turma => turma.id === p.turmaId);
          return { data: p.data, turma: t ? t.nome : p.turmaId, status: p.status, observacao: extractObservation(p.observacao, 'aluno') };
        })
        .sort((a, b) => b.data.localeCompare(a.data));
    }
    const groups: Record<string, any> = {};
    presencas.forEach(p => {
      if (filtroTurmaUnica && p.turmaId !== filtroTurmaUnica) return;
      if (dataInicio && p.data < dataInicio) return;
      if (dataFim && p.data > dataFim) return;
      const key = `${p.data}-${p.turmaId}`;
      if (!groups[key]) {
        const t = turmas.find(turma => turma.id === p.turmaId);
        groups[key] = { data: p.data, turma: t ? t.nome : p.turmaId, presencas: 0, ausencias: 0, observacao: extractObservation(p.observacao, 'aula') };
      }
      if (p.status === 'Presente') groups[key].presencas++;
      else groups[key].ausencias++;
    });
    return Object.values(groups).sort((a, b) => b.data.localeCompare(a.data));
  }, [presencas, turmas, filtroTurmaUnica, filtroAluno, dataInicio, dataFim]);

  const financialData = useMemo(() => {
    if (!filtroMesFin || !isMaster) return [];
    const [year, month] = filtroMesFin.split('-').map(Number);
    const alunoMatriculasNoMes: Record<string, number> = {};
    const professorReport: Record<string, any[]> = {};
    const cobrancasNoMes: any[] = [];
    alunos.forEach(aluno => {
      const ativas = matriculas.filter(m => m.alunoId === aluno.id);
      const canceladas = aluno.cursosCanceladosDetalhes || [];
      const todasMatriculas = [
        ...ativas.map(m => ({ ...m, dataCanc: null })),
        ...canceladas.map(c => ({ alunoId: aluno.id, turmaId: c.nome, dataMatricula: c.dataMatricula, dataCanc: c.dataCancelamento }))
      ];
      todasMatriculas.forEach(m => {
        const turma = turmas.find(t => t.id === m.turmaId || t.nome === m.turmaId);
        if (!turma) return;
        const dMatOriginal = parseToDate(m.dataMatricula);
        if (!dMatOriginal) return;
        const dMatEfetiva = dMatOriginal < INICIO_AULAS_2026 ? new Date(INICIO_AULAS_2026) : new Date(dMatOriginal);
        const dCanc = parseToDate((m as any).dataCanc);
        const billingDay = dMatEfetiva.getDate();
        const lastDayOfThisMonth = new Date(year, month, 0).getDate();
        const targetDay = Math.min(billingDay, lastDayOfThisMonth);
        const targetBillingDate = new Date(year, month - 1, targetDay, 12, 0, 0);
        if (dMatOriginal <= targetBillingDate && (!dCanc || dCanc >= targetBillingDate)) {
          alunoMatriculasNoMes[aluno.id] = (alunoMatriculasNoMes[aluno.id] || 0) + 1;
          cobrancasNoMes.push({ alunoObj: aluno, turmaObj: turma, valorBase: Number(turma.valorMensal) || 0 });
        }
      });
    });
    cobrancasNoMes.forEach(item => {
      const { alunoObj, turmaObj, valorBase } = item;
      const profName = turmaObj.professor || 'Sem Professor';
      if (filtroProfsMulti.length > 0 && !filtroProfsMulti.includes(profName)) return;
      let desconto = 0;
      let motivoDesconto = '--';
      if (alunoObj.plano?.toLowerCase().includes('integral')) {
        desconto = valorBase * 0.10; motivoDesconto = 'PLANO INTEGRAL';
      } else if (alunoMatriculasNoMes[alunoObj.id] > 1) {
        desconto = valorBase * 0.10; motivoDesconto = 'MULTI-MATRÍCULA';
      }
      if (!professorReport[profName]) professorReport[profName] = [];
      professorReport[profName].push({
        aluno: alunoObj.nome, curso: turmaObj.nome, valorBase: Number(valorBase) || 0,
        desconto: Number(desconto) || 0, motivoDesconto: motivoDesconto, valorPago: Number(valorBase) - (Number(desconto) || 0)
      });
    });
    return Object.entries(professorReport).map(([prof, items]) => {
      const sortedItems = [...items].sort((a, b) => { if (a.curso !== b.curso) return a.curso.localeCompare(b.curso); return a.aluno.localeCompare(b.aluno); });
      return { 
        professor: prof, 
        items: sortedItems, 
        totalLiquido: sortedItems.reduce((acc, curr) => acc + (Number(curr.valorPago) || 0), 0), 
        totalBruto: sortedItems.reduce((acc, curr) => acc + (Number(curr.valorBase) || 0), 0), 
        totalDesconto: sortedItems.reduce((acc, curr) => acc + (Number(curr.desconto) || 0), 0), 
        matriculasAtivas: sortedItems.length 
      };
    }).sort((a, b) => a.professor.localeCompare(b.professor));
  }, [alunos, turmas, matriculas, filtroMesFin, filtroProfsMulti, isMaster]);

  const globalFinanceiro = useMemo(() => {
    let bruto = 0; let descontos = 0; let liquido = 0; let matriculasCount = 0; let descontosCount = 0;
    financialData.forEach(prof => {
      bruto += Number(prof.totalBruto) || 0;
      descontos += Number(prof.totalDesconto) || 0;
      liquido += Number(prof.totalLiquido) || 0;
      matriculasCount += prof.matriculasAtivas;
      prof.items.forEach((item: any) => { if (Number(item.desconto) > 0) descontosCount++; });
    });
    return { bruto, descontos, liquido, matriculas: matriculasCount, descontosCount };
  }, [financialData]);

  const biConversaoData = useMemo(() => {
    const today = new Date(); const curYear = today.getFullYear();
    const filteredExperimentais = experimentais.filter(exp => {
      const expDate = parseToDate(exp.aula); if (!expDate) return false;
      if (biConvPeriodo === 'mensal') {
        const [selYear, selMonth] = biSelectedMonth.split('-').map(Number);
        return expDate.getFullYear() === selYear && expDate.getMonth() === (selMonth - 1);
      } else if (biConvPeriodo === 'anual') return expDate.getFullYear() === curYear;
      return true;
    });
    const agendados = filteredExperimentais.length;
    const presentes = filteredExperimentais.filter(e => e.status === 'Presente').length;
    const followups = filteredExperimentais.filter(e => e.followUpSent).length;
    const matriculasCount = filteredExperimentais.filter(e => e.convertido).length;
    const taxaComparecimento = agendados > 0 ? Math.round((presentes / agendados) * 100) : 0;
    const taxaConversaoReal = presentes > 0 ? Math.round((matriculasCount / presentes) * 100) : 0;
    
    const chartMap: Record<string, { name: string, agendamentos: number, matriculas: number }> = {};
    filteredExperimentais.forEach(e => {
      const date = parseToDate(e.aula); if (!date) return;
      const monthStr = date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
      if (!chartMap[monthStr]) chartMap[monthStr] = { name: monthStr, agendamentos: 0, matriculas: 0 };
      chartMap[monthStr].agendamentos++; if (e.convertido) chartMap[monthStr].matriculas++;
    });

    const turmaRankingMap: Record<string, { name: string, agendados: number, presentes: number, matriculas: number, conversao: number }> = {};
    filteredExperimentais.forEach(e => {
      const curso = e.curso || 'Não Informado';
      if (!turmaRankingMap[curso]) turmaRankingMap[curso] = { name: curso, agendados: 0, presentes: 0, matriculas: 0, conversao: 0 };
      turmaRankingMap[curso].agendados++;
      if (e.status === 'Presente') turmaRankingMap[curso].presentes++;
      if (e.convertido) turmaRankingMap[curso].matriculas++;
    });

    const turmaRanking = Object.values(turmaRankingMap).map(t => ({
      ...t,
      conversao: t.presentes > 0 ? Math.round((t.matriculas / t.presentes) * 100) : 0
    })).sort((a, b) => b.matriculas - a.matriculas || b.conversao - a.conversao);

    return { 
      agendados, 
      presentes, 
      followups, 
      matriculas: matriculasCount, 
      taxaComparecimento, 
      taxaConversaoReal, 
      chartData: Object.values(chartMap).slice(-6),
      ranking: turmaRanking
    };
  }, [experimentais, biConvPeriodo, biSelectedMonth]);

  const biFrequenciaMensal = useMemo(() => {
    const months: Record<string, { presentes: number, ausentes: number }> = {};
    presencas.forEach(p => {
      const month = p.data.substring(0, 7);
      if (!months[month]) months[month] = { presentes: 0, ausentes: 0 };
      if (p.status === 'Presente') months[month].presentes++; else months[month].ausentes++;
    });
    return Object.entries(months).map(([name, data]) => ({ name, perc: Math.round((data.presentes / (data.presentes + data.ausentes)) * 100) })).sort((a, b) => a.name.localeCompare(b.name)).slice(-6);
  }, [presencas]);

  const formatCurrency = (val: number) => Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExport = () => {
    let headers: string[] = []; let rows: any[] = [];
    if (activeTab === 'geral') {
      if (filtroAluno) {
        headers = ["Data", "Turma", "Status", "Obs"];
        frequenciaData.forEach(d => rows.push([d.data, `"${d.turma}"`, d.status, `"${d.observacao}"`]));
      } else {
        headers = ["Data", "Turma", "Presenças", "Ausências", "Freq %", "Obs Aula"];
        frequenciaData.forEach(d => {
          const total = (d.presencas || 0) + (d.ausencias || 0); const perc = total > 0 ? Math.round((d.presencas / total) * 100) : 0;
          rows.push([d.data, `"${d.turma}"`, d.presencas, d.ausencias, `${perc}%`, `"${d.observacao}"`]);
        });
      }
    } else if (activeTab === 'financeiro' && isMaster) {
      headers = ["Professor", "Estudante", "Curso", "Bruto", "Desconto", "Motivo", "Líquido"];
      financialData.forEach(p => p.items.forEach(i => rows.push([`"${p.professor}"`, `"${i.aluno}"`, `"${i.curso}"`, i.valorBase.toFixed(2), i.desconto.toFixed(2), `"${i.motivoDesconto}"`, i.valorPago.toFixed(2)])));
    } else if (activeTab === 'bi') {
      if (biSubTab === 'frequencia') { headers = ["Mês", "Frequência %"]; biFrequenciaMensal.forEach(d => rows.push([d.name, `${d.perc}%`])); } 
      else if (biSubTab === 'conversao') { 
        headers = ["Etapa", "Quantidade"]; 
        rows.push(["Agendados", biConversaoData.agendados]); 
        rows.push(["Presentes", biConversaoData.presentes]); 
        rows.push(["Follow-ups", biConversaoData.followups]); 
        rows.push(["Matrículas", biConversaoData.matriculas]); 
        rows.push([]);
        headers.push("", "Turma Ranking", "Conversão %");
        biConversaoData.ranking.forEach(r => rows.push(["", "", "", "", "", `"${r.name}"`, `${r.conversao}%`]));
      } 
      else { headers = ["Turma", "Início", "Novas", "Canceladas", "Fim"]; biFluxoData.turmas.forEach(t => rows.push([`"${t.nome}"`, t.inicio, t.novas, t.canceladas, t.fim])); }
    } else if (activeTab === 'secretaria') {
      headers = ["Estudante", "Status", "Cursos Ativos", "Responsável 1", "WhatsApp 1", "Responsável 2", "WhatsApp 2", "E-mail"];
      filteredContatos.forEach(aluno => { 
        const studentMatriculas = matriculas.filter(m => m.alunoId === aluno.id);
        const isAtivo = studentMatriculas.length > 0;
        const cursosNomes = studentMatriculas.map(m => {
          const t = turmas.find(t => t.id === m.turmaId || t.nome === m.turmaId);
          return t ? t.nome : m.turmaId;
        }).join(', ');
        rows.push([`"${aluno.nome}"`, isAtivo ? "Ativo" : "Cancelado", `"${cursosNomes}"`, `"${aluno.responsavel1 || ''}"`, `"${aluno.whatsapp1 || ''}"`, `"${aluno.responsavel2 || ''}"`, `"${aluno.whatsapp2 || ''}"`, `"${aluno.email || ''}"`]); 
      });
    } else if (activeTab === 'integral' && isMaster) {
      headers = ["Estudante", "Escolaridade", "Cursos Ativos", "Valor Total Estimado"];
      integralReportData.forEach(d => rows.push([`"${d.nome}"`, `"${d.escolaridade}"`, `"${d.cursos.map(c => c.nome).join(', ')}"`, d.total.toFixed(2)]));
    }
    const csvContent = ["\ufeff" + headers.join(";"), ...rows.map(row => row.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `relatorio_${activeTab}_${new Date().getTime()}.csv`; link.click();
  };

  const toggleCursoMulti = (id: string) => { setFiltroCursosMulti(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  
  const toggleProfMulti = (name: string) => {
    setFiltroProfsMulti(prev => 
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Painéis de Inteligência B+</h2>
          <div className="flex flex-wrap gap-4 mt-2">
            <button onClick={() => setActiveTab('geral')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>FREQUÊNCIA</button>
            {isMaster && <button onClick={() => setActiveTab('financeiro')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'financeiro' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>FINANCEIRO</button>}
            {isMaster && <button onClick={() => setActiveTab('integral')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'integral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>INTEGRAL</button>}
            <button onClick={() => setActiveTab('bi')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'bi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>VISÃO ESTRATÉGICA (BI)</button>
            <button onClick={() => setActiveTab('secretaria')} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === 'secretaria' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>CONTATOS</button>
          </div>
        </div>
        <button onClick={handleExport} className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black transition-all shadow-lg hover:bg-slate-800 active:scale-95"><Download className="w-5 h-5" /> Exportar Planilha</button>
      </div>

      {activeTab === 'secretaria' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
              <div className="flex flex-col md:flex-row gap-6">
                 <div className="flex-1">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Pesquisar Contato</label>
                    <div className="relative">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                       <input 
                         type="text" 
                         value={searchContato}
                         onChange={(e) => setSearchContato(e.target.value)}
                         placeholder="Nome ou e-mail do estudante..."
                         className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none font-bold text-slate-700 focus:border-blue-500" 
                       />
                    </div>
                 </div>
                 <div className="w-full md:w-64">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Status Matrícula</label>
                    <select 
                      value={secretariaStatusFilter}
                      onChange={(e) => setSecretariaStatusFilter(e.target.value as any)}
                      className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none font-bold text-slate-700 focus:border-blue-500"
                    >
                       <option value="todos">Todos os Alunos</option>
                       <option value="ativos">Apenas Ativos</option>
                       <option value="cancelados">Apenas Cancelados</option>
                    </select>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="relative">
                   <button 
                     onClick={() => setIsCourseFilterOpen(!isCourseFilterOpen)}
                     className="flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-all"
                   >
                     <Filter className="w-4 h-4" /> Filtrar por Modalidades {filtroCursosMulti.length > 0 && `(${filtroCursosMulti.length})`}
                   </button>
                   
                   {isCourseFilterOpen && (
                     <div className="absolute top-14 left-0 w-full md:w-96 bg-white border border-slate-100 shadow-2xl rounded-3xl p-6 z-[100] animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                           <h4 className="font-black text-xs uppercase tracking-tight">Selecionar Cursos</h4>
                           <button onClick={() => setFiltroCursosMulti([])} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Limpar Tudo</button>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2">
                           {sortedTurmas.map(t => (
                             <label key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-blue-50 group">
                                <input 
                                  type="checkbox" 
                                  checked={filtroCursosMulti.includes(t.id)}
                                  onChange={() => toggleCursoMulti(t.id)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-[10px] font-bold text-slate-700 uppercase group-hover:text-blue-700">{t.nome}</span>
                             </label>
                           ))}
                        </div>
                        <button onClick={() => setIsCourseFilterOpen(false)} className="w-full mt-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase">Aplicar Filtros</button>
                     </div>
                   )}
                </div>

                {/* Resultado da Filtragem integrado após os filtros */}
                <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 rounded-2xl border border-blue-100 shadow-inner">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">Total:</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-blue-600 tracking-tighter leading-none">{filteredContatos.length}</span>
                    <span className="text-[10px] font-black text-blue-600 uppercase">Estudantes</span>
                  </div>
                </div>
              </div>
           </div>

           <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-8 py-6"># Estudante</th>
                          <th className="px-8 py-6 text-center">Status</th>
                          <th className="px-8 py-6">Cursos Ativos</th>
                          <th className="px-8 py-6">Responsáveis & Contatos</th>
                          <th className="px-8 py-6">E-mail</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {filteredContatos.map((aluno, i) => {
                          const turmasDoAluno = matriculas.filter(m => m.alunoId === aluno.id);
                          const isAtivo = turmasDoAluno.length > 0;
                          return (
                             <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-6">
                                   <div className="flex items-center gap-4">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${isAtivo ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                         {aluno.nome.charAt(0)}
                                      </div>
                                      <div>
                                         <p className="font-bold text-slate-800 uppercase text-xs">{aluno.nome}</p>
                                         <p className="text-[10px] font-bold text-slate-400 mt-0.5">{formatEscolaridade(aluno)}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                   <span className={`text-[9px] font-black px-2 py-1 rounded-lg border ${isAtivo ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                                      {isAtivo ? 'ATIVO' : 'CANCELADO'}
                                   </span>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                      {turmasDoAluno.length > 0 ? turmasDoAluno.map((m, idx) => {
                                         const t = turmas.find(t => t.id === m.turmaId || t.nome === m.turmaId);
                                         return (
                                            <span key={idx} className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tighter">
                                               {t ? t.nome : m.turmaId}
                                            </span>
                                         );
                                      }) : (
                                         <span className="text-[9px] text-slate-300 italic">Sem cursos ativos</span>
                                      )}
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="space-y-3">
                                      {aluno.responsavel1 && (
                                         <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                               <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Responsável 1</span>
                                               <span className="text-xs font-bold text-slate-700 uppercase">{aluno.responsavel1}</span>
                                            </div>
                                            {aluno.whatsapp1 && (
                                               <a href={`https://wa.me/55${aluno.whatsapp1.replace(/\D/g, '')}`} target="_blank" className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm">
                                                  <MessageCircle className="w-4 h-4" />
                                               </a>
                                            )}
                                         </div>
                                      )}
                                      {aluno.responsavel2 && (
                                         <div className="flex items-center gap-4 pt-2 border-t border-slate-50">
                                            <div className="flex flex-col">
                                               <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Responsável 2</span>
                                               <span className="text-xs font-bold text-slate-700 uppercase">{aluno.responsavel2}</span>
                                            </div>
                                            {aluno.whatsapp2 && (
                                               <a href={`https://wa.me/55${aluno.whatsapp2.replace(/\D/g, '')}`} target="_blank" className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm">
                                                  <MessageCircle className="w-4 h-4" />
                                               </a>
                                            )}
                                         </div>
                                      )}
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="flex items-center gap-2">
                                      <Mail className="w-4 h-4 text-slate-300" />
                                      <span className="text-xs font-bold text-slate-500 break-all">{aluno.email || '--'}</span>
                                   </div>
                                </td>
                             </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'financeiro' && isMaster && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {/* Cabeçalho e Filtros da aba Financeiro */}
           <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-col md:flex-row gap-6 items-center flex-1">
                <div className="w-full md:w-56">
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Competência</label>
                   <input 
                     type="month" 
                     value={filtroMesFin}
                     onChange={(e) => setFiltroMesFin(e.target.value)}
                     className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500" 
                   />
                </div>
                <div className="w-full md:w-64 relative">
                   <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest ml-1">Professor Responsável</label>
                   <button 
                     onClick={() => setIsProfFilterOpen(!isProfFilterOpen)}
                     className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-700 flex items-center justify-between"
                   >
                     <span className="truncate">{filtroProfsMulti.length > 0 ? `${filtroProfsMulti.length} Selecionado(s)` : 'Todos os Professores'}</span>
                     <ChevronDown className="w-4 h-4" />
                   </button>
                   
                   {isProfFilterOpen && (
                     <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-100 shadow-2xl rounded-3xl p-4 z-[110] animate-in zoom-in-95">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                           <h4 className="font-black text-[10px] uppercase tracking-tight">Filtrar Professores</h4>
                           <button onClick={() => setFiltroProfsMulti([])} className="text-[9px] font-black text-blue-600 uppercase hover:underline">Limpar</button>
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1">
                           {listProfessores.map(prof => (
                             <label key={prof} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer">
                               <input 
                                 type="checkbox" 
                                 checked={filtroProfsMulti.includes(prof)}
                                 onChange={() => toggleProfMulti(prof)}
                                 className="w-4 h-4 rounded text-blue-600"
                               />
                               <span className="text-[11px] font-bold text-slate-700 uppercase">{prof}</span>
                             </label>
                           ))}
                        </div>
                        <button onClick={() => setIsProfFilterOpen(false)} className="w-full mt-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase">Fechar</button>
                     </div>
                   )}
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit self-end">
                   <button 
                     onClick={() => setViewFinanceiro('resumido')} 
                     className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewFinanceiro === 'resumido' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                   >
                     <LayoutGrid className="w-4 h-4" /> Resumo
                   </button>
                   <button 
                     onClick={() => setViewFinanceiro('detalhado')} 
                     className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${viewFinanceiro === 'detalhado' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                   >
                     <List className="w-4 h-4" /> Detalhado
                   </button>
                </div>
              </div>
           </div>

           {/* Cards de Métricas Globais do Financeiro */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <DollarSign className="w-24 h-24 text-slate-900" />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL BRUTO</p>
                 <p className="text-3xl font-black text-slate-800 leading-tight">{formatCurrency(globalFinanceiro.bruto)}</p>
                 <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded-lg w-fit">
                    <ClipboardPaste className="w-3.5 h-3.5" /> {globalFinanceiro.matriculas} Mensalidades
                 </div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingDown className="w-24 h-24 text-red-600" />
                 </div>
                 <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">TOTAL DESCONTOS</p>
                 <p className="text-3xl font-black text-red-600 leading-tight">-{formatCurrency(globalFinanceiro.descontos)}</p>
                 <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-red-500 uppercase tracking-wider bg-red-50 px-2 py-1 rounded-lg w-fit">
                    <Percent className="w-3.5 h-3.5" /> {globalFinanceiro.descontosCount} Aplicados
                 </div>
              </div>
              <div className="bg-emerald-600 p-6 rounded-3xl shadow-xl shadow-emerald-600/20 text-white relative overflow-hidden group">
                 <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet className="w-24 h-24 text-white" />
                 </div>
                 <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">RECEITA LÍQUIDA</p>
                 <p className="text-3xl font-black text-white leading-tight">{formatCurrency(globalFinanceiro.liquido)}</p>
                 <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-100 uppercase tracking-wider bg-white/10 px-2 py-1 rounded-lg w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Projeção de Competência
                 </div>
              </div>
           </div>

           {/* Listagem de Professores */}
           <div className={viewFinanceiro === 'resumido' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
              {financialData.map((prof, i) => (
                 <div key={i} className={`bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm transition-all hover:shadow-md ${viewFinanceiro === 'resumido' ? 'flex flex-col' : ''}`}>
                    {viewFinanceiro === 'resumido' ? (
                      /* Layout de Card de Resumo */
                      <div className="flex flex-col h-full">
                        <div className="p-6 bg-slate-900 text-white flex items-center gap-4">
                           <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20"><UserCheck className="w-6 h-6" /></div>
                           <div>
                              <h3 className="text-lg font-black uppercase tracking-tight truncate max-w-[150px]">{prof.professor}</h3>
                              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest leading-none">Visão Consolidada</p>
                           </div>
                        </div>
                        <div className="p-8 space-y-6 flex-1 flex flex-col justify-between">
                           <div className="space-y-4">
                              <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VALOR BRUTO</span>
                                 <span className="text-sm font-bold text-slate-800">{formatCurrency(prof.totalBruto)}</span>
                              </div>
                              <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">QNT. MENSALIDADES</span>
                                 <span className="text-sm font-bold text-slate-800">{prof.matriculasAtivas} registros</span>
                              </div>
                           </div>
                           <div className="bg-emerald-50 p-6 rounded-[28px] border border-emerald-100 flex flex-col items-center text-center">
                              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">VALOR LÍQUIDO PROFESSOR</span>
                              <span className="text-2xl font-black text-emerald-700 tracking-tighter">{formatCurrency(prof.totalLiquido)}</span>
                           </div>
                        </div>
                      </div>
                    ) : (
                      /* Layout de Tabela Detalhada */
                      <>
                        <div className="p-6 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20"><UserCheck className="w-6 h-6" /></div>
                              <div>
                                 <h3 className="text-lg font-black uppercase tracking-tight">{prof.professor}</h3>
                                 <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{prof.matriculasAtivas} Matrículas Ativas no Período</p>
                              </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="text-right border-r border-slate-800 pr-4">
                                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Bruto Prof.</p>
                                 <p className="text-sm font-black text-white">{formatCurrency(prof.totalBruto)}</p>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Líquido Prof.</p>
                                 <p className="text-lg font-black text-emerald-400">{formatCurrency(prof.totalLiquido)}</p>
                              </div>
                           </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                           <table className="w-full text-left">
                              <thead>
                                 <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-8 py-4">Estudante</th>
                                    <th className="px-8 py-4">Modalidade</th>
                                    <th className="px-8 py-4 text-right">Valor Base</th>
                                    <th className="px-8 py-4 text-center">Desconto (%)</th>
                                    <th className="px-8 py-4 text-right">Valor Pago</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                 {prof.items.map((item: any, j: number) => (
                                    <tr key={j} className="hover:bg-slate-50/50 transition-colors">
                                       <td className="px-8 py-4 text-xs font-bold text-slate-800 uppercase">{item.aluno}</td>
                                       <td className="px-8 py-4 text-[10px] font-black text-blue-600 uppercase tracking-tight">{item.curso}</td>
                                       <td className="px-8 py-4 text-right text-xs font-medium text-slate-400">{formatCurrency(item.valorBase)}</td>
                                       <td className="px-8 py-4 text-center">
                                          <div className="flex flex-col items-center">
                                             <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${item.desconto > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'text-slate-300 border-slate-100'}`}>
                                                {item.desconto > 0 ? `-${formatCurrency(item.desconto)}` : '--'}
                                             </span>
                                             {item.desconto > 0 && <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">{item.motivoDesconto}</span>}
                                          </div>
                                       </td>
                                       <td className="px-8 py-4 text-right font-black text-slate-900 text-xs">{formatCurrency(item.valorPago)}</td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                      </>
                    )}
                 </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'integral' && isMaster && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center gap-6">
              <div className="w-full md:w-auto min-w-[240px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> Competência de Análise
                </label>
                <input 
                  type="month" 
                  value={filtroMesIntegral} 
                  onChange={(e) => setFiltroMesIntegral(e.target.value)} 
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" 
                />
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-slate-400 font-medium italic">
                  * Exibindo alunos que possuíam matrículas no plano Integral ativas em qualquer dia do mês de {parseToDate(filtroMesIntegral + '-01')?.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}.
                </p>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden">
                 <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">TOTAL ESTUDANTES INTEGRAL</p>
                 <p className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">{integralReportData.length}</p>
                 <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5" /> Ativos na Competência
                 </div>
              </div>
              <div className="bg-blue-600 p-8 rounded-[40px] shadow-2xl shadow-blue-500/30 relative overflow-hidden text-white md:col-span-2">
                 <p className="text-[11px] font-black text-blue-200 uppercase tracking-widest mb-1">VALOR TOTAL NOMINAL ESTIMADO (MENSAL)</p>
                 <p className="text-4xl font-black text-white tracking-tighter leading-tight">
                    {formatCurrency(integralReportData.reduce((acc, curr) => acc + curr.total, 0))}
                 </p>
                 <p className="text-[10px] font-bold text-blue-200 mt-2 flex items-center gap-1.5 uppercase tracking-wider">
                    <Calculator className="w-3.5 h-3.5" /> Inclui regra de 50% para Funcional Kids e histórico de datas
                 </p>
              </div>
           </div>

           <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-xl text-white"><UserPlus className="w-5 h-5" /></div>
                    <h3 className="font-black text-lg uppercase tracking-tight">Lista Nominal - Plano Integral</h3>
                 </div>
                 <span className="text-[10px] font-black uppercase text-slate-400">Total de {integralReportData.length} registros</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="px-8 py-5"># Estudante</th>
                          <th className="px-8 py-5">Escolaridade</th>
                          <th className="px-8 py-5">Cursos Ativos no Mês</th>
                          <th className="px-8 py-5 text-right">Valor Nominal</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {integralReportData.map((d, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                             <td className="px-8 py-5">
                                <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px]">
                                      {d.nome.charAt(0)}
                                   </div>
                                   <span className="font-bold text-slate-800 text-xs uppercase">{d.nome}</span>
                                </div>
                             </td>
                             <td className="px-8 py-5">
                                <span className="text-[10px] font-black px-2 py-1 rounded-lg border border-slate-100 text-slate-500 uppercase">{d.escolaridade}</span>
                             </td>
                             <td className="px-8 py-5">
                                <div className="flex wrap gap-1.5">
                                   {d.cursos.map((c, j) => (
                                      <div key={j} className="group/item relative">
                                         <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                                            c.nome.toLowerCase().includes('funcional kids') 
                                            ? 'bg-purple-50 text-purple-600 border-purple-100' 
                                            : 'bg-blue-50 text-blue-600 border-blue-100'
                                         }`}>
                                            {c.nome}
                                         </span>
                                      </div>
                                   ))}
                                </div>
                             </td>
                             <td className="px-8 py-5 text-right font-black text-blue-600 bg-blue-50/10">
                                {formatCurrency(d.total)}
                             </td>
                          </tr>
                       ))}
                       {integralReportData.length === 0 && (
                          <tr><td colSpan={4} className="px-8 py-20 text-center text-slate-400 font-bold italic">Nenhum aluno no plano integral encontrado para esta competência.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'bi' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                <button onClick={() => setBiSubTab('frequencia')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${biSubTab === 'frequencia' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Activity className="w-4 h-4" /> Frequência</button>
                <button onClick={() => setBiSubTab('conversao')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${biSubTab === 'conversao' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><Target className="w-4 h-4" /> Conversão</button>
                <button onClick={() => setBiSubTab('fluxo')} className={`flex items-center gap-2 px-6 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${biSubTab === 'fluxo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}><RefreshIcon className="w-4 h-4" /> Fluxo Matrículas</button>
              </div>
              {biSubTab === 'conversao' && (
                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit items-center gap-1">
                  <div className={`relative flex items-center transition-all rounded-xl border border-transparent overflow-hidden group min-w-[150px] h-10 ${biConvPeriodo === 'mensal' ? 'bg-blue-600' : 'hover:bg-slate-200'}`}>
                    <div className={`flex items-center justify-center gap-2 px-4 py-2 text-[9px] font-black uppercase transition-all w-full h-full ${biConvPeriodo === 'mensal' ? 'text-white' : 'text-slate-400'}`}>
                      {biConvPeriodo === 'mensal' ? (biSelectedMonth.split('-').reverse().join('/')) : 'Mensal'}
                      <ChevronDown className={`w-3 h-3 ml-1 ${biConvPeriodo === 'mensal' ? 'text-white/70' : 'text-slate-300'}`} />
                    </div>
                    <input 
                      type="month" 
                      value={biSelectedMonth} 
                      onChange={(e) => {
                        setBiSelectedMonth(e.target.value);
                        setBiConvPeriodo('mensal');
                      }} 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full block" 
                      title="Clique para selecionar o mês"
                    />
                  </div>
                  <button onClick={() => setBiConvPeriodo('anual')} className={`flex items-center gap-2 px-4 h-10 text-[9px] font-black uppercase rounded-xl transition-all ${biConvPeriodo === 'anual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'}`}>Anual</button>
                  <button onClick={() => setBiConvPeriodo('total')} className={`flex items-center gap-2 px-4 h-10 text-[9px] font-black uppercase rounded-xl transition-all ${biConvPeriodo === 'total' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'}`}>Total</button>
                </div>
              )}
              {biSubTab === 'fluxo' && (
                <div className="bg-white p-4 rounded-[28px] border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Início</label>
                    <input type="date" value={biFluxoInicio} onChange={(e) => setBiFluxoInicio(e.target.value)} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fim</label>
                    <input type="date" value={biFluxoFim} onChange={(e) => setBiFluxoFim(e.target.value)} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold outline-none focus:border-blue-500" />
                  </div>
                </div>
              )}
           </div>

           {biSubTab === 'frequencia' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-2"><TrendingUpIcon className="w-4 h-4 text-blue-500" /> Tendência de Frequência (%)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={biFrequenciaMensal}>
                        <defs><linearGradient id="colorPerc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="perc" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorPerc)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                  <div className="p-6 bg-blue-50 rounded-full mb-4"><PieIcon className="w-10 h-10 text-blue-600" /></div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter">Frequência Geral</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase mt-1">Média dos últimos 6 meses</p>
                  <p className="text-6xl font-black text-blue-600 mt-6">{biFrequenciaMensal.length > 0 ? biFrequenciaMensal[biFrequenciaMensal.length-1].perc : 0}%</p>
               </div>
             </div>
           )}

           {biSubTab === 'conversao' && (
             <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-50 relative overflow-hidden group">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AGENDAMENTOS</p>
                   <p className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">{biConversaoData.agendados}</p>
                   <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-purple-600 uppercase tracking-wider"><FlaskConical className="w-3.5 h-3.5" /> Total {biConvPeriodo === 'mensal' ? biSelectedMonth.split('-').reverse().join('/') : biConvPeriodo}</div>
                 </div>
                 <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-50 relative overflow-hidden group">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TAXA COMPARECIMENTO</p>
                   <p className="text-5xl font-black text-blue-600 tracking-tighter leading-tight">{biConversaoData.taxaComparecimento}%</p>
                   <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-wider"><Users className="w-3.5 h-3.5" /> {biConversaoData.presentes} Estudantes</div>
                 </div>
                 <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-50 relative overflow-hidden group">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CONVERSÃO REAL</p>
                   <p className="text-5xl font-black text-emerald-500 tracking-tighter leading-tight">{biConversaoData.taxaConversaoReal}%</p>
                   <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider"><UserCheck className="w-3.5 h-3.5" /> {biConversaoData.matriculas} Matrículas</div>
                 </div>
                 <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-50 relative overflow-hidden group">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CAC EXPERIMENTAL</p>
                   <p className="text-5xl font-black text-slate-300 tracking-tighter leading-tight">--</p>
                   <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custo por Matrícula</div>
                 </div>
               </div>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                   <div className="flex items-center gap-3 mb-10"><div className="p-2.5 bg-purple-50 rounded-xl text-purple-600"><BarChart3 className="w-5 h-5" /></div><h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">FUNIL DE CONVERSÃO</h3></div>
                   <div className="space-y-6">{[{ label: 'Agendados', value: biConversaoData.agendados, total: biConversaoData.agendados, color: 'bg-[#9333ea]' }, { label: 'Presentes', value: biConversaoData.presentes, total: biConversaoData.agendados, color: 'bg-[#6366f1]' }, { label: 'Follow-ups', value: biConversaoData.followups, total: biConversaoData.agendados, color: 'bg-[#3b82f6]' }, { label: 'Matrículas', value: biConversaoData.matriculas, total: biConversaoData.agendados, color: 'bg-[#10b981]' }].map((item, i) => (
                        <div key={i} className="flex items-center gap-6 group">
                          <span className="w-24 text-[11px] font-black text-slate-400 uppercase text-right leading-none">{item.label}</span>
                          <div className="flex-1 h-12 bg-slate-50 rounded-xl overflow-hidden relative"><div className={`h-full ${item.color} transition-all duration-1000 ease-out flex items-center justify-end pr-4 text-white font-black text-xs`} style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}>{item.value}</div></div>
                        </div>
                      ))}</div>
                 </div>
                 <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-10"><div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600"><TrendingUpIcon className="w-5 h-5" /></div><h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">AGENDAMENTOS VS MATRÍCULAS</h3></div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={biConversaoData.chartData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                           <YAxis hide />
                           <Tooltip />
                           <Bar dataKey="matriculas" barSize={30} fill="#10b981" radius={[8, 8, 0, 0]} />
                           <Line type="monotone" dataKey="agendamentos" stroke="#9333ea" strokeWidth={4} dot={{r: 5, fill: '#fff', strokeWidth: 3, stroke: '#9333ea'}} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                 </div>
               </div>

               <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                 <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-amber-500 rounded-xl text-white shadow-lg shadow-amber-500/20">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <h3 className="font-black text-lg uppercase tracking-tight">Ranking de Performance por Turma</h3>
                    </div>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Conversão Real (P -&gt; M)</span>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                          <th className="px-8 py-5"># Turma / Modalidade</th>
                          <th className="px-8 py-5 text-center">Agendados</th>
                          <th className="px-8 py-5 text-center">Presentes</th>
                          <th className="px-8 py-5 text-center text-emerald-600">Matrículas</th>
                          <th className="px-8 py-5 text-right">Conversão Real (%)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {biConversaoData.ranking.length > 0 ? biConversaoData.ranking.map((t, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-5 flex items-center gap-4">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-500' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-50 text-slate-400'}`}>
                                {idx + 1}º
                              </span>
                              <span className="font-bold text-slate-800 uppercase text-xs truncate max-w-[200px]">{t.name}</span>
                            </td>
                            <td className="px-8 py-5 text-center font-bold text-slate-600">{t.agendados}</td>
                            <td className="px-8 py-5 text-center font-bold text-slate-600">{t.presentes}</td>
                            <td className="px-8 py-5 text-center font-black text-emerald-600 bg-emerald-50/20">{t.matriculas}</td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex flex-col items-end">
                                <span className={`text-[11px] font-black px-2 py-1 rounded-lg border ${t.conversao >= 50 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : t.conversao >= 25 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                  {t.conversao}%
                                </span>
                                <div className="w-20 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                  <div className={`h-full ${t.conversao >= 50 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${t.conversao}%` }} />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-400 font-bold italic">Sem dados de conversão para o período selecionado.</td></tr>
                        )}
                      </tbody>
                    </table>
                 </div>
               </div>
             </div>
           )}

           {biSubTab === 'fluxo' && (
             <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ATIVAS NO INÍCIO</p>
                    <p className="text-5xl font-black text-slate-800 tracking-tighter leading-tight">{biFluxoData.resumo.inicio}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider"><History className="w-3.5 h-3.5" /> Posicionamento em {new Date(biFluxoInicio + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">NOVAS MATRÍCULAS</p>
                    <p className="text-5xl font-black text-emerald-600 tracking-tighter leading-tight">+{biFluxoData.resumo.novas}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-wider"><MoveUpRight className="w-3.5 h-3.5" /> Entradas no Período</div>
                  </div>
                  <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">CANCELAMENTOS</p>
                    <p className="text-5xl font-black text-red-500 tracking-tighter leading-tight">-{biFluxoData.resumo.canceladas}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-wider"><MoveDownRight className="w-3.5 h-3.5" /> Saídas no Período</div>
                  </div>
                  <div className="bg-blue-600 p-8 rounded-[32px] shadow-xl shadow-blue-600/20 relative overflow-hidden text-white">
                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">ATIVAS NO FIM</p>
                    <p className="text-5xl font-black text-white tracking-tighter leading-tight">{biFluxoData.resumo.fim}</p>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-100 uppercase tracking-wider"><CheckCircle2 className="w-3.5 h-3.5" /> Posicionamento em {new Date(biFluxoFim + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                  </div>
               </div>
               <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
                 <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="p-2 bg-blue-600 rounded-xl"><GraduationCap className="w-5 h-5" /></div><h3 className="font-black text-lg uppercase tracking-tight">Evolução por Turma (A-Z)</h3></div>
                    <span className="text-[10px] font-black uppercase text-slate-400">Total de {biFluxoData.turmas.length} Cursos</span>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"><th className="px-8 py-5">Turma / Modalidade</th><th className="px-8 py-5 text-center">Ativas Início</th><th className="px-8 py-5 text-center text-emerald-600">Novas (+)</th><th className="px-8 py-5 text-center text-red-500">Canc. (-)</th><th className="px-8 py-5 text-center bg-blue-50/50">Ativas Fim</th><th className="px-8 py-5 text-right">Evolução %</th></tr></thead>
                      <tbody className="divide-y divide-slate-50">{biFluxoData.turmas.map((t, idx) => {
                          const evolucao = t.inicio > 0 ? Math.round(((t.fim - t.inicio) / t.inicio) * 100) : (t.novas > 0 ? 100 : 0);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-8 py-5"><p className="font-bold text-slate-800 uppercase text-xs">{t.nome}</p><p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{t.professor}</p></td>
                              <td className="px-8 py-5 text-center font-bold text-slate-600">{t.inicio}</td>
                              <td className="px-8 py-5 text-center font-black text-emerald-500">+{t.novas}</td>
                              <td className="px-8 py-5 text-center font-black text-red-400">-{t.canceladas}</td>
                              <td className="px-8 py-5 text-center font-black text-blue-600 bg-blue-50/20">{t.fim}</td>
                              <td className="px-8 py-5 text-right"><span className={`text-[10px] font-black px-2 py-1 rounded-lg border ${evolucao > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : evolucao < 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>{evolucao > 0 ? `+${evolucao}%` : `${evolucao}%`}</span></td>
                            </tr>
                          );
                        })}</tbody>
                    </table>
                 </div>
               </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'geral' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><User className="w-3 h-3" /> Estudante</label><select value={filtroAluno} onChange={(e) => { setFiltroAluno(e.target.value); if(e.target.value) setFiltroTurmaUnica(''); }} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500"><option value="">Todos os Estudantes (A-Z)</option>{sortedAlunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></div><div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><GraduationCap className="w-3 h-3" /> Turma</label><select value={filtroTurmaUnica} onChange={(e) => { setFiltroTurmaUnica(e.target.value); if(e.target.value) setFiltroAluno(''); }} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500"><option value="">Todas as Turmas (A-Z)</option>{sortedTurmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div><div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3 h-3" /> Início</label><input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500" /></div><div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3 h-3" /> Fim</label><input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold text-slate-700 focus:border-blue-500" /></div></div></div>
          <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-800">
                    <th className="px-8 py-6">Data da Aula</th>
                    <th className="px-8 py-6">Turma</th>
                    {filtroAluno ? (
                      <>
                        <th className="px-8 py-6">Status</th>
                        <th className="px-8 py-6">Obs</th>
                      </>
                    ) : (
                      <>
                        <th className="px-8 py-6 text-center">P</th>
                        <th className="px-8 py-6 text-center">F</th>
                        <th className="px-8 py-6 text-center">%</th>
                        <th className="px-8 py-6">Obs Aula</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {frequenciaData.map((item, idx) => {
                    if (filtroAluno) { 
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-8 py-5 text-xs font-bold text-slate-700">{parseToDate(item.data)?.toLocaleDateString('pt-BR')}</td>
                          <td className="px-8 py-5 text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors uppercase">{item.turma}</td>
                          <td className="px-8 py-5"><span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${item.status === 'Presente' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{item.status}</span></td>
                          <td className="px-8 py-5 text-[10px] text-slate-500 font-medium italic">{item.observacao}</td>
                        </tr>
                      ); 
                    }
                    const total = (item.presencas || 0) + (item.ausencias || 0); 
                    const perc = total > 0 ? Math.round((item.presencas / total) * 100) : 0; 
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-8 py-5 text-xs font-bold text-slate-700">{parseToDate(item.data)?.toLocaleDateString('pt-BR')}</td>
                        <td className="px-8 py-5 text-xs font-bold text-slate-400 group-hover:text-blue-600 transition-colors uppercase">{item.turma}</td>
                        <td className="px-8 py-5 text-center font-black text-slate-700">{item.presencas}</td>
                        <td className="px-8 py-5 text-center font-black text-red-400">{item.ausencias}</td>
                        <td className="px-8 py-5"><div className="flex items-center justify-center gap-3"><span className="text-[10px] font-black text-slate-800">{perc}%</span></div></td>
                        <td className="px-8 py-5 text-[10px] text-slate-500 font-medium italic">{item.observacao}</td>
                      </tr>
                    );
                  })}
                  {frequenciaData.length === 0 && (
                    <tr><td colSpan={filtroAluno ? 4 : 6} className="px-8 py-20 text-center text-slate-400 font-bold italic">Nenhum dado de frequência encontrado para o período.</td></tr>
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