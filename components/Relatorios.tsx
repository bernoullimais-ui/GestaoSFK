
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  LineChart as LineChartIcon,
  Mail,
  UserX,
  Contact,
  TrendingUp as GrowthIcon,
  XCircle
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
  const [dataInicio, setDataInicio] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Filtros Secretaria (Contatos)
  const [filtroStatusSec, setFiltroStatusSec] = useState<'todos' | 'ativos' | 'saidas'>('todos');
  const [filtroUnidadeSec, setFiltroUnidadeSec] = useState('');
  const [filtroTurmaSec, setFiltroTurmaSec] = useState<string[]>([]);
  const [buscaSec, setBuscaSec] = useState('');
  const [isTurmaDropdownOpen, setIsTurmaDropdownOpen] = useState(false);
  const turmaDropdownRef = useRef<HTMLDivElement>(null);

  // Filtros Frequência Geral
  const [freqEstudante, setFreqEstudante] = useState('');
  const [freqUnidade, setFreqUnidade] = useState('');
  const [freqTurma, setFreqTurma] = useState('');

  // Fechar dropdown de turmas ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (turmaDropdownRef.current && !turmaDropdownRef.current.contains(event.target as Node)) {
        setIsTurmaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userPermittedUnits = useMemo(() => 
    normalizeText(user.unidade).split(',').map(u => u.trim()).filter(Boolean), 
    [user.unidade]
  );

  const unidadesUnicas = useMemo(() => {
    const rawUnits = Array.from(new Set(turmas.map(t => t.unidade).filter(Boolean)));
    if (isMaster) return rawUnits.sort();
    return rawUnits.filter(u => userPermittedUnits.some(p => normalizeText(u).includes(p) || p.includes(normalizeText(u)))).sort();
  }, [turmas, isMaster, userPermittedUnits]);

  const turmasDisponiveisSec = useMemo(() => {
    let filtered = turmas;
    if (filtroUnidadeSec) {
      filtered = turmas.filter(t => normalizeText(t.unidade) === normalizeText(filtroUnidadeSec));
    } else if (!isMaster) {
      filtered = turmas.filter(t => unidadesUnicas.some(u => normalizeText(t.unidade) === normalizeText(u)));
    }
    return Array.from(new Set(filtered.map(t => t.nome).filter(Boolean))).sort();
  }, [turmas, filtroUnidadeSec, isMaster, unidadesUnicas]);

  useEffect(() => {
    if (!isMaster && !filtroUnidadeBI && unidadesUnicas.length > 0) setFiltroUnidadeBI(unidadesUnicas[0]);
    if (!isMaster && !freqUnidade && unidadesUnicas.length > 0) setFreqUnidade(unidadesUnicas[0]);
    if (!isMaster && !filtroUnidadeSec && unidadesUnicas.length > 0) setFiltroUnidadeSec(unidadesUnicas[0]);
  }, [unidadesUnicas, isMaster, filtroUnidadeBI, freqUnidade, filtroUnidadeSec]);

  // Reseta turmas ao mudar unidade na secretaria
  useEffect(() => {
    setFiltroTurmaSec([]);
  }, [filtroUnidadeSec]);

  const cleanPhone = (val: string | undefined) => {
    if (!val || val === 'FORMULA_ERROR') return '';
    return val.replace(/^(=?\+55\s?)/g, '').replace(/^(=)/g, '').replace(/\D/g, '').trim();
  };

  const formatPhoneDisplay = (phone: string | undefined) => {
    const digits = cleanPhone(phone);
    if (digits.length === 11) return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    if (digits.length === 10) return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
    return digits;
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

  const turmasFiltradasFreq = useMemo(() => {
    if (!freqUnidade) return [];
    return turmas.filter(t => normalizeText(t.unidade) === normalizeText(freqUnidade)).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [turmas, freqUnidade]);

  // --- LOGICA SECRETARIA (CONTATOS) ---
  const statsSecretaria = useMemo(() => {
    return alunos.filter(aluno => {
      if (buscaSec && !normalizeText(aluno.nome).includes(normalizeText(buscaSec))) return false;
      
      // Filtro Unidade
      if (filtroUnidadeSec) {
        if (normalizeText(aluno.unidade) !== normalizeText(filtroUnidadeSec)) return false;
      } else if (!isMaster) {
        if (!unidadesUnicas.some(u => normalizeText(aluno.unidade) === normalizeText(u))) return false;
      }

      const matriculasAluno = matriculas.filter(m => m.alunoId === aluno.id);
      
      // Filtro Turma Multi-seleção
      const matriculasAtivasContexto = matriculasAluno.filter(m => {
        const unitMatch = !filtroUnidadeSec || normalizeText(m.unidade) === normalizeText(filtroUnidadeSec);
        
        // Se houver turmas selecionadas, o aluno deve estar em pelo menos uma delas
        const turmaMatch = filtroTurmaSec.length === 0 || filtroTurmaSec.some(ft => normalizeText(m.turmaId).includes(normalizeText(ft)));
        
        return unitMatch && turmaMatch;
      });

      const isAtivoNoContexto = matriculasAtivasContexto.length > 0;

      // Aplicar filtros de status
      if (filtroStatusSec === 'ativos' && !isAtivoNoContexto) return false;
      if (filtroStatusSec === 'saidas' && isAtivoNoContexto) return false;
      
      // Se filtrou por turma, só exibe quem tem matrícula naquelas turmas
      if (filtroTurmaSec.length > 0 && !isAtivoNoContexto) return false;

      return true;
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alunos, matriculas, filtroStatusSec, filtroUnidadeSec, filtroTurmaSec, buscaSec, isMaster, unidadesUnicas]);

  const getCursosDoAluno = (alunoId: string) => matriculas.filter(m => m.alunoId === alunoId).map(m => {
    const t = turmas.find(t => t.id === m.turmaId || normalizeText(t.nome) === normalizeText(m.turmaId.split('-')[0]));
    return t ? t.nome : m.turmaId.split('-')[0].trim();
  }).filter(Boolean);

  // --- BI FREQUENCIA TREND ---
  const statsBIFrequencia = useMemo(() => {
    const start = parseToDate(dataInicio);
    const end = parseToDate(dataFim);
    let filtered = presencas.filter(p => {
      const d = parseToDate(p.data);
      if (start && d && d < start) return false;
      if (end && d && d > end) return false;
      if (filtroUnidadeBI && normalizeText(p.unidade) !== normalizeText(filtroUnidadeBI)) return false;
      if (!isMaster && !unidadesUnicas.some(u => normalizeText(p.unidade) === normalizeText(u))) return false;
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
      const key = `${tName}|${p.unidade}`;
      if (!turmaMap[key]) turmaMap[key] = { name: tName, unidade: p.unidade, p: 0, f: 0 };
      if (p.status === 'Presente') turmaMap[key].p++; else turmaMap[key].f++;
    });
    const rankingData = Object.values(turmaMap).map(v => ({ name: v.name, unidade: v.unidade, pct: Math.round((v.p / (v.p + v.f)) * 100) })).sort((a, b) => b.pct - a.pct).slice(0, 8);
    return { mediaGeral, presentes, totalRegistros, trendData, rankingData };
  }, [presencas, filtroUnidadeBI, dataInicio, dataFim, isMaster, unidadesUnicas]);

  // --- BI CONVERSAO ---
  const statsConversao = useMemo(() => {
    let filtered = experimentais;
    if (!isMaster) filtered = filtered.filter(e => unidadesUnicas.some(u => normalizeText(e.unidade) === normalizeText(u)));
    if (filtroUnidadeBI) filtered = filtered.filter(e => normalizeText(e.unidade) === normalizeText(filtroUnidadeBI));
    const start = parseToDate(dataInicio);
    const end = parseToDate(dataFim);
    if (start || end) {
      filtered = filtered.filter(e => {
        const d = parseToDate(e.aula);
        return d && (!start || d >= start) && (!end || d <= end);
      });
    }
    const agendamentos = filtered.length;
    const presentes = filtered.filter(e => normalizeText(e.status) === 'presente').length;
    const matriculados = filtered.filter(e => e.convertido).length;
    const followUps = filtered.filter(e => e.followUpSent).length;

    const taxaComparecimento = agendamentos > 0 ? Math.round((presentes / agendamentos) * 100) : 0;
    const conversaoReal = presentes > 0 ? Math.round((matriculados / presentes) * 100) : 0;

    const funnelData = [
      { name: 'AGENDADOS', value: agendamentos, fill: '#9f7aea' },
      { name: 'PRESENTES', value: presentes, fill: '#3b82f6' },
      { name: 'FOLLOW-UPS', value: followUps, fill: '#60a5fa' },
      { name: 'MATRÍCULAS', value: matriculados, fill: '#10b981' }
    ];

    const trendMap: Record<string, { label: string, agendamentos: number, matriculas: number }> = {};
    filtered.forEach(e => {
      const d = parseToDate(e.aula);
      if (!d) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!trendMap[key]) trendMap[key] = { label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), agendamentos: 0, matriculas: 0 };
      trendMap[key].agendamentos++;
      if (e.convertido) trendMap[key].matriculas++;
    });
    const trendData = Object.values(trendMap).slice(-6);

    return { agendamentos, presentes, matriculados, taxaComparecimento, conversaoReal, funnelData, trendData };
  }, [experimentais, filtroUnidadeBI, dataInicio, dataFim, isMaster, unidadesUnicas]);

  // --- BI FLUXO MATRÍCULAS ---
  const statsFluxo = useMemo(() => {
    const start = parseToDate(dataInicio);
    const end = parseToDate(dataFim);
    if (!start || !end) return { data: [], totals: { inicio: 0, novas: 0, cancelados: 0, fim: 0 } };

    let filteredTurmas = turmas;
    if (filtroUnidadeBI) filteredTurmas = turmas.filter(t => normalizeText(t.unidade) === normalizeText(filtroUnidadeBI));
    else if (!isMaster) filteredTurmas = turmas.filter(t => unidadesUnicas.some(u => normalizeText(t.unidade) === normalizeText(u)));

    const statsMap: Record<string, any> = {};
    filteredTurmas.forEach(t => { 
      statsMap[t.id] = { id: t.id, turma: t.nome, professor: t.professor, unidade: t.unidade, inicio: 0, novas: 0, cancelados: 0, fim: 0 }; 
    });

    matriculas.forEach(m => {
      const tObj = filteredTurmas.find(t => normalizeText(t.unidade) === normalizeText(m.unidade) && (normalizeText(m.turmaId).includes(normalizeText(t.nome)) || normalizeText(t.id) === normalizeText(m.turmaId)));
      if (!tObj || !statsMap[tObj.id]) return;
      const dMat = parseToDate(m.dataMatricula);
      if (dMat && dMat < start) statsMap[tObj.id].inicio++; 
      else if (dMat && dMat >= start && dMat <= end) statsMap[tObj.id].novas++;
    });

    alunos.forEach(a => {
      (a.cursosCanceladosDetalhes || []).forEach(c => {
        const tObj = filteredTurmas.find(t => normalizeText(t.nome) === normalizeText(c.nome) && normalizeText(t.unidade) === normalizeText(c.unidade));
        if (!tObj || !statsMap[tObj.id]) return;
        const dCanc = parseToDate(c.dataCancelamento);
        const dMat = parseToDate(c.dataMatricula);
        
        if (dCanc && dCanc >= start && dCanc <= end) {
          statsMap[tObj.id].cancelados++;
          if (dMat && dMat < start) statsMap[tObj.id].inicio++;
        } else if (dCanc && dCanc < start) {
        } else if (dMat && dMat < start) {
          statsMap[tObj.id].inicio++;
        }
      });
    });

    const dataList = Object.values(statsMap).map((s:any) => {
      const fim = s.inicio + s.novas - s.cancelados;
      let evolucao = 0;
      if (s.inicio > 0) evolucao = Math.round(((fim - s.inicio) / s.inicio) * 100);
      else if (fim > 0) evolucao = 100;
      return { ...s, fim, evolucao };
    }).sort((a, b) => a.turma.localeCompare(b.turma));

    const totals = dataList.reduce((acc, curr) => ({ 
      inicio: acc.inicio + curr.inicio, 
      novas: acc.novas + curr.novas, 
      cancelados: acc.cancelados + curr.cancelados, 
      fim: acc.fim + curr.fim 
    }), { inicio: 0, novas: 0, cancelados: 0, fim: 0 });

    return { data: dataList, totals };
  }, [matriculas, alunos, turmas, dataInicio, dataFim, filtroUnidadeBI, isMaster, unidadesUnicas]);

  // --- HISTORICO DE FREQUÊNCIA ---
  const statsFrequenciaGeral = useMemo(() => {
    const start = parseToDate(dataInicio);
    const end = parseToDate(dataFim);
    
    if (freqEstudante) {
      const alunoObj = alunos.find(a => a.id === freqEstudante);
      const alunoNome = alunoObj?.nome || freqEstudante;
      
      return presencas.filter(p => {
        const d = parseToDate(p.data);
        const pAlunoNome = (p as any)._estudantePlanilha || p.alunoId;
        const matchEstudante = normalizeText(pAlunoNome) === normalizeText(alunoNome);
        
        if (!matchEstudante) return false;
        if (start && d && d < start) return false;
        if (end && d && d > end) return false;
        if (freqUnidade && normalizeText(p.unidade) !== normalizeText(freqUnidade)) return false;
        if (freqTurma) {
          const tObj = turmas.find(t => t.id === freqTurma);
          if (tObj && normalizeText((p as any)._turmaPlanilha || p.turmaId) !== normalizeText(tObj.nome)) return false;
        }
        return true;
      }).map(p => {
        const obs = p.observacao || "";
        const matchAula = obs.match(/\[Aula: (.*?)\]/);
        const matchAluno = obs.match(/\[Aluno: (.*?)\]/);
        const tema = matchAula ? matchAula[1] : (matchAluno ? "" : obs);
        const individualObs = matchAluno ? matchAluno[1] : "";

        return {
          data: p.data,
          estudante: alunoNome,
          unidade: p.unidade,
          turma: (p as any)._turmaPlanilha || p.turmaId,
          status: p.status,
          tema: tema,
          obsIndividual: individualObs
        };
      }).sort((a, b) => b.data.localeCompare(a.data));
    }

    const groups: Record<string, { data: string, unidade: string, turma: string, p: number, f: number, tema: string }> = {};
    presencas.forEach(p => {
      const d = parseToDate(p.data);
      if (start && d && d < start) return;
      if (end && d && d > end) return;
      if (freqUnidade && normalizeText(p.unidade) !== normalizeText(freqUnidade)) return;
      if (freqTurma) {
        const tObj = turmas.find(t => t.id === freqTurma);
        if (tObj && normalizeText((p as any)._turmaPlanilha || p.turmaId) !== normalizeText(tObj.nome)) return;
      }
      if (!isMaster && !unidadesUnicas.some(u => normalizeText(p.unidade) === normalizeText(u))) return;

      const tName = (p as any)._turmaPlanilha || p.turmaId;
      const key = `${p.data}|${normalizeText(p.unidade)}|${normalizeText(tName)}`;
      if (!groups[key]) {
        groups[key] = { data: p.data, unidade: p.unidade, turma: tName, p: 0, f: 0, tema: '' };
      }
      if (p.status === 'Presente') groups[key].p++; else groups[key].f++;
      if (p.observacao && !groups[key].tema) {
        const match = p.observacao.match(/\[Aula: (.*?)\]/);
        if (match) groups[key].tema = match[1];
        else if (!p.observacao.includes('[Aluno:')) groups[key].tema = p.observacao;
      }
    });
    return Object.values(groups).sort((a, b) => b.data.localeCompare(a.data));
  }, [presencas, dataInicio, dataFim, freqEstudante, freqUnidade, freqTurma, isMaster, unidadesUnicas, alunos, turmas]);

  // --- EXPORTAÇÃO CONTEXTUAL ---
  const handleExport = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let fileName = `relatorio_${activeTab}`;

    if (activeTab === 'secretaria') {
      fileName = 'base_contatos_crm';
      headers = ["Estudante", "Unidade", "Matriculas_Ativas", "Responsavel1", "WhatsApp1", "Responsavel2", "WhatsApp2", "Email"];
      rows = statsSecretaria.map(aluno => [
        aluno.nome,
        aluno.unidade,
        getCursosDoAluno(aluno.id).join(' | '),
        aluno.responsavel1 || '',
        formatPhoneDisplay(aluno.whatsapp1),
        aluno.responsavel2 || '',
        formatPhoneDisplay(aluno.whatsapp2),
        aluno.email || ''
      ]);
    } else if (activeTab === 'frequencia_geral') {
      fileName = 'historico_frequencia';
      if (freqEstudante) {
        headers = ["Data", "Estudante", "Unidade", "Turma", "Status", "Tema", "Observacao"];
        rows = (statsFrequenciaGeral as any[]).map(r => [r.data, r.estudante, r.unidade, r.turma, r.status, r.tema, r.obsIndividual]);
      } else {
        headers = ["Data", "Unidade", "Turma", "Presentes", "Faltas", "Freq_Pct", "Tema"];
        rows = (statsFrequenciaGeral as any[]).map(r => [
          r.data,
          r.unidade,
          r.turma,
          r.p,
          r.f,
          `${Math.round((r.p / (r.p + r.f)) * 100)}%`,
          r.tema
        ]);
      }
    } else if (activeTab === 'bi') {
      if (biSubTab === 'frequencia') {
        fileName = 'bi_frequencia_tendencia';
        headers = ["Data", "Presentes", "Faltas", "Freq_Pct"];
        rows = statsBIFrequencia.trendData.map(d => [d.label, d.p, d.f, `${d.pct}%`]);
      } else if (biSubTab === 'conversao') {
        fileName = 'bi_conversao_agendamentos';
        headers = ["Periodo", "Agendados", "Matriculas"];
        rows = statsConversao.trendData.map(d => [d.label, d.agendamentos, d.matriculas]);
      } else if (biSubTab === 'fluxo') {
        fileName = 'bi_fluxo_matriculas';
        headers = ["Turma", "Unidade", "Ativos_Inicio", "Novas", "Cancelamentos", "Ativos_Fim", "Evolucao_Pct"];
        rows = statsFluxo.data.map((r:any) => [r.turma, r.unidade, r.inicio, r.novas, r.cancelados, r.fim, `${r.evolucao}%`]);
      }
    }

    const csvContent = "\ufeff" + [
      headers.join(';'),
      ...rows.map(r => r.map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleToggleTurmaSec = (turma: string) => {
    setFiltroTurmaSec(prev => 
      prev.includes(turma) ? prev.filter(t => t !== turma) : [...prev, turma]
    );
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Business Intelligence</h2>
          {isGestorTier && (
            <div className="flex items-center gap-6 mt-3">
              <button onClick={() => setActiveTab('bi')} className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-4 transition-all ${activeTab === 'bi' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>VISÃO ESTRATÉGICA (BI)</button>
              <button onClick={() => setActiveTab('frequencia_geral')} className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-4 transition-all ${activeTab === 'frequencia_geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>HISTÓRICO DE FREQUÊNCIA</button>
              <button onClick={() => setActiveTab('secretaria')} className={`text-[11px] font-black uppercase tracking-widest pb-2 border-b-4 transition-all ${activeTab === 'secretaria' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>CONTATOS (CRM)</button>
            </div>
          )}
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-[#0f172a] text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-95">
          <Download className="w-5 h-5" /> EXPORTAR DADOS
        </button>
      </div>

      {activeTab === 'bi' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex bg-slate-100 p-1.5 rounded-[24px] w-fit shadow-inner shrink-0">
              <button onClick={() => setBiSubTab('frequencia')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all ${biSubTab === 'frequencia' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><TrendingUpIcon className="w-4 h-4"/> FREQUÊNCIA</button>
              <button onClick={() => setBiSubTab('conversao')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all ${biSubTab === 'conversao' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><Target className="w-4 h-4"/> CONVERSÃO</button>
              <button onClick={() => setBiSubTab('fluxo')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all ${biSubTab === 'fluxo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}><RefreshCw className="w-4 h-4"/> FLUXO MATRÍCULAS</button>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm"><MapPin className="w-3.5 h-3.5 text-blue-500" /><select value={filtroUnidadeBI} onChange={e => setFiltroUnidadeBI(e.target.value)} disabled={!isMaster && unidadesUnicas.length <= 1} className="bg-transparent border-none rounded-lg text-[10px] font-black uppercase outline-none cursor-pointer">{isMaster && <option value="">Todas as Unidades</option>}{unidadesUnicas.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm"><Calendar className="w-3.5 h-3.5 text-blue-500" /><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-slate-50 border-none rounded-lg text-[10px] font-bold outline-none px-2 py-1" /><span className="text-slate-300">até</span><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="bg-slate-50 border-none rounded-lg text-[10px] font-bold outline-none px-2 py-1" /></div>
            </div>
          </div>

          {biSubTab === 'frequencia' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">MÉDIA GERAL FREQUÊNCIA</p><h4 className="text-7xl font-black text-blue-600 leading-none mb-4">{statsBIFrequencia.mediaGeral}%</h4><p className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> ENGAJAMENTO ATIVO</p></div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">VOLUME DE CHAMADAS</p><h4 className="text-7xl font-black text-slate-900 leading-none mb-4">{statsBIFrequencia.totalRegistros}</h4><p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2"><Users className="w-4 h-4"/> TOTAL NO PERÍODO</p></div>
                <div className="bg-[#1e1b4b] p-10 rounded-[40px] shadow-sm border border-white/5 text-white"><p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">TOTAL DE PRESENÇAS</p><h4 className="text-7xl font-black text-indigo-400 leading-none mb-4">{statsBIFrequencia.presentes}</h4><p className="text-[10px] font-black text-indigo-200 uppercase flex items-center gap-2"><Activity className="w-4 h-4"/> ALUNOS EM AULA</p></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-8 bg-white p-12 rounded-[50px] shadow-sm border border-slate-100 flex flex-col">
                   <div className="flex items-center gap-4 mb-12"><div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><LineChartIcon className="w-6 h-6"/></div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Tendência de Engajamento (%)</h3></div>
                   <div className="flex-1 w-full min-h-[350px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={statsBIFrequencia.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id="colorPct" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={15} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }} domain={[0, 100]} /><Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '12px', padding: '16px' }} /><Area type="monotone" dataKey="pct" name="Presença (%)" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorPct)" dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer></div>
                </div>
                <div className="lg:col-span-4 bg-white p-12 rounded-[50px] shadow-sm border border-slate-100">
                   <div className="flex items-center gap-4 mb-12"><div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><BarChartIcon className="w-6 h-6"/></div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Ranking Presença (Top 8)</h3></div>
                   <div className="space-y-6">{statsBIFrequencia.rankingData.map((item, idx) => (<div key={idx} className="space-y-2"><div className="flex justify-between items-center"><div className="min-w-0"><span className="text-[10px] font-black text-slate-500 uppercase truncate block leading-none mb-1">{item.name}</span><span className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter block">{item.unidade}</span></div><span className="text-[11px] font-black text-slate-900">{item.pct}%</span></div><div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${item.pct}%` }} /></div></div>))}</div>
                </div>
              </div>
            </div>
          )}

          {biSubTab === 'conversao' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AGENDAMENTOS</p>
                   <h4 className="text-7xl font-black text-slate-900 leading-none mb-4">{statsConversao.agendamentos}</h4>
                   <p className="text-[10px] font-black text-indigo-400 uppercase flex items-center gap-2"><FlaskConical className="w-4 h-4"/> NO PERÍODO</p>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TAXA COMPARECIMENTO</p>
                   <h4 className="text-7xl font-black text-blue-600 leading-none mb-4">{statsConversao.taxaComparecimento}%</h4>
                   <p className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2"><Users className="w-4 h-4"/> {statsConversao.presentes} ESTUDANTES</p>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CONVERSÃO REAL</p>
                   <h4 className="text-7xl font-black text-emerald-500 leading-none mb-4">{statsConversao.conversaoReal}%</h4>
                   <p className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-2"><UserCheck className="w-4 h-4"/> {statsConversao.matriculados} MATRÍCULAS</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-white p-12 rounded-[50px] shadow-sm border border-slate-100">
                   <div className="flex items-center gap-4 mb-12">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl"><BarChartIcon className="w-6 h-6"/></div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Funil de Conversão</h3>
                   </div>
                   <div className="w-full h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart layout="vertical" data={statsConversao.funnelData} margin={{ left: 40, right: 40 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 900 }} width={80} />
                            <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                            <Bar dataKey="value" radius={[0, 12, 12, 0]} barSize={40} label={{ position: 'right', fill: '#64748b', fontSize: 14, fontWeight: 900 }}>
                               {statsConversao.funnelData.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.fill} />
                               ))}
                            </Bar>
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>

                <div className="lg:col-span-7 bg-white p-12 rounded-[50px] shadow-sm border border-slate-100">
                   <div className="flex items-center gap-4 mb-12">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><TrendingUpIcon className="w-6 h-6"/></div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Agendamentos vs Matrículas</h3>
                   </div>
                   <div className="w-full h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={statsConversao.trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }} />
                            <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
                            <Bar dataKey="agendamentos" name="Agendados" fill="#9f7aea" radius={[10, 10, 0, 0]} barSize={25} />
                            <Bar dataKey="matriculas" name="Matrículas" fill="#10b981" radius={[10, 10, 0, 0]} barSize={25} />
                         </BarChart>
                      </ResponsiveContainer>
                   </div>
                </div>
              </div>
            </div>
          )}

          {biSubTab === 'fluxo' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                  <ArrowRightLeft className="absolute -right-4 -top-4 w-24 h-24 text-slate-50 group-hover:text-slate-100 transition-colors" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative">SALDO INICIAL (A)</p>
                  <h4 className="text-7xl font-black text-slate-900 leading-none mb-4 relative">{statsFluxo.totals.inicio}</h4>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                  <UserPlus className="absolute -right-4 -top-4 w-24 h-24 text-emerald-50 group-hover:text-emerald-100 transition-colors" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative">NOVAS MATRÍCULAS (B)</p>
                  <h4 className="text-7xl font-black text-emerald-500 leading-none mb-4 relative">+{statsFluxo.totals.novas}</h4>
                </div>
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 relative overflow-hidden group">
                  <UserMinus className="absolute -right-4 -top-4 w-24 h-24 text-red-50 group-hover:text-red-100 transition-colors" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 relative">CANCELAMENTOS (C)</p>
                  <h4 className="text-7xl font-black text-red-500 leading-none mb-4 relative">-{statsFluxo.totals.cancelados}</h4>
                </div>
                <div className="bg-blue-600 p-10 rounded-[40px] shadow-xl text-white relative overflow-hidden group">
                  <CheckCircle2 className="absolute -right-4 -top-4 w-24 h-24 text-white/10 group-hover:text-white/20 transition-colors" />
                  <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1 relative">SALDO ATUAL (A+B-C)</p>
                  <h4 className="text-7xl font-black leading-none mb-4 relative">{statsFluxo.totals.fim}</h4>
                </div>
              </div>

              <div className="bg-white rounded-[44px] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 bg-[#1e1b4b] text-white flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20"><GraduationCap className="w-5 h-5"/></div>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">EVOLUÇÃO POR TURMA (A-Z)</h3>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                        COMPARATIVO DE MOVIMENTAÇÃO NO PERÍODO SELECIONADO
                      </p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <th className="px-10 py-6">TURMA / MODALIDADE</th>
                        <th className="px-10 py-6 text-center">ATIVAS INÍCIO</th>
                        <th className="px-10 py-6 text-center text-emerald-600">NOVAS (+)</th>
                        <th className="px-10 py-6 text-center text-red-500">CANC. (-)</th>
                        <th className="px-10 py-6 text-center text-blue-600">ATIVAS FIM</th>
                        <th className="px-10 py-6 text-right">EVOLUÇÃO %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {statsFluxo.data.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-10 py-6">
                            <p className="font-black text-slate-800 uppercase text-xs leading-none mb-1">{row.turma}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{row.unidade}</p>
                          </td>
                          <td className="px-10 py-6 text-center font-black text-slate-500 text-lg">{row.inicio}</td>
                          <td className="px-10 py-6 text-center font-black text-emerald-500 text-lg">+{row.novas}</td>
                          <td className="px-10 py-6 text-center font-black text-red-400 text-lg">-{row.cancelados}</td>
                          <td className="px-10 py-6 text-center font-black text-blue-600 text-xl">{row.fim}</td>
                          <td className="px-10 py-6 text-right">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-[10px] uppercase shadow-sm ${
                              row.evolucao > 0 
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                : row.evolucao < 0 
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : 'bg-slate-50 text-slate-400 border-slate-100'
                            }`}>
                              {row.evolucao > 0 && <ArrowUpRight className="w-3.5 h-3.5" />}
                              {row.evolucao < 0 && <ArrowDownRight className="w-3.5 h-3.5" />}
                              {row.evolucao > 0 ? `+${row.evolucao}%` : `${row.evolucao}%`}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'frequencia_geral' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5" /> ESTUDANTE</label><select value={freqEstudante} onChange={e => setFreqEstudante(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700"><option value="">Todos os Estudantes</option>{alunos.sort((a,b)=>a.nome.localeCompare(b.nome)).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}</select></div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> UNIDADE</label><select value={freqUnidade} onChange={e => { setFreqUnidade(e.target.value); setFreqTurma(''); }} disabled={!isMaster && unidadesUnicas.length <= 1} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700">{isMaster && <option value="">Todas as Unidades</option>}{unidadesUnicas.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5" /> TURMA</label><select value={freqTurma} onChange={e => setFreqTurma(e.target.value)} className={`w-full px-6 py-4 border-2 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700 transition-all bg-slate-50 border-slate-100`}><option value="">Todas as Turmas</option>{turmasFiltradasFreq.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> INÍCIO</label><input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" /></div>
                 <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> FIM</label><input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" /></div>
              </div>
           </div>
           <div className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-slate-100">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest">
                      <th className="px-8 py-6">DATA DA AULA</th>
                      {freqEstudante && <th className="px-8 py-6">ESTUDANTE</th>}
                      <th className="px-8 py-6">UNIDADE</th>
                      <th className="px-8 py-6">TURMA</th>
                      {freqEstudante ? (
                        <>
                          <th className="px-8 py-6 text-center">STATUS</th>
                          <th className="px-8 py-6">TEMA DA AULA</th>
                          <th className="px-8 py-6">OBS. DO ESTUDANTE</th>
                        </>
                      ) : (
                        <>
                          <th className="px-8 py-6 text-center">P</th>
                          <th className="px-8 py-6 text-center">F</th>
                          <th className="px-8 py-6 text-right">% FREQ</th>
                          <th className="px-8 py-6">TEMA DA AULA</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {statsFrequenciaGeral.length > 0 ? (statsFrequenciaGeral as any[]).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6 font-black text-slate-700 text-sm whitespace-nowrap">{parseToDate(row.data)?.toLocaleDateString('pt-BR')}</td>
                        
                        {freqEstudante && (
                          <td className="px-8 py-6 font-black text-slate-900 text-xs uppercase">{row.estudante}</td>
                        )}

                        <td className="px-8 py-6 font-black text-blue-600 text-[10px] uppercase">{row.unidade}</td>
                        <td className="px-8 py-6 font-black text-slate-400 text-[11px] uppercase">{row.turma}</td>
                        
                        {freqEstudante ? (
                          <>
                            <td className="px-8 py-6 text-center">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase shadow-sm border ${
                                normalizeText(row.status) === 'presente' 
                                  ? 'bg-blue-50 text-blue-600 border-blue-100' 
                                  : 'bg-red-50 text-red-500 border-red-100'
                              }`}>
                                {normalizeText(row.status) === 'presente' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {row.status}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-[11px] font-black text-slate-700 uppercase leading-snug">{row.tema || '--'}</td>
                            <td className="px-8 py-6">
                              {row.obsIndividual ? (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 uppercase tracking-tighter">
                                  {row.obsIndividual}
                                </span>
                              ) : '--'}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-8 py-6 text-center font-black text-slate-900 text-lg">{row.p}</td>
                            <td className="px-8 py-6 text-center font-black text-red-500 text-lg">{row.f}</td>
                            <td className="px-8 py-6 text-right font-black text-slate-900">{Math.round((row.p / (row.p + row.f)) * 100)}%</td>
                            <td className="px-8 py-6 text-xs text-slate-500 uppercase font-bold">{row.tema || '--'}</td>
                          </>
                        )}
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={freqEstudante ? 7 : 7} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center gap-4 text-slate-300">
                             <Search className="w-12 h-12 opacity-20" />
                             <p className="font-black uppercase tracking-widest">Nenhum registro localizado</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'secretaria' && (
        <div className="space-y-10 animate-in fade-in">
          <div className="bg-white p-10 rounded-[44px] shadow-sm border border-slate-100">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-6">
              <div className="flex-1 space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1"><User className="w-3.5 h-3.5 text-indigo-500" /> BUSCA RÁPIDA</label>
                <div className="relative group"><Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" /><input type="text" placeholder="Nome do Aluno..." value={buscaSec} onChange={e => setBuscaSec(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none font-bold text-sm focus:border-blue-500 transition-all shadow-inner" /></div>
              </div>
              <div className="w-full lg:w-64 space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> UNIDADE</label>
                <div className="relative group"><select value={filtroUnidadeSec} onChange={e => setFiltroUnidadeSec(e.target.value)} disabled={!isMaster && unidadesUnicas.length <= 1} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-sm outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all shadow-inner">{isMaster && <option value="">Todas as Unidades</option>}{unidadesUnicas.map(u => <option key={u} value={u}>{u}</option>)}</select><ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none group-hover:text-blue-500 transition-colors" /></div>
              </div>
              
              {/* FILTRO TURMA MULTI-SELEÇÃO */}
              <div className="w-full lg:w-80 space-y-3" ref={turmaDropdownRef}>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1"><GraduationCap className="w-3.5 h-3.5 text-indigo-500" /> TURMAS (FILTRO MÚLTIPLO)</label>
                <div className="relative">
                  <button 
                    onClick={() => setIsTurmaDropdownOpen(!isTurmaDropdownOpen)}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl flex items-center justify-between font-black text-sm text-slate-700 shadow-inner focus:border-blue-500 transition-all"
                  >
                    <span className="truncate">
                      {filtroTurmaSec.length === 0 
                        ? (filtroUnidadeSec ? 'Todas as Turmas' : 'Selecione Unidade') 
                        : `${filtroTurmaSec.length} selecionada(s)`}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTurmaDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isTurmaDropdownOpen && filtroUnidadeSec && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-2xl rounded-3xl z-[60] p-4 max-h-[300px] overflow-y-auto animate-in zoom-in-95">
                      {turmasDisponiveisSec.map(t => (
                        <label key={t} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors group">
                          <div className={`w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all ${filtroTurmaSec.includes(t) ? 'bg-blue-600 border-blue-600' : 'border-slate-200 group-hover:border-blue-300'}`}>
                            {filtroTurmaSec.includes(t) && <Check className="w-3.5 h-3.5 text-white stroke-[4]" />}
                          </div>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={filtroTurmaSec.includes(t)}
                            onChange={() => handleToggleTurmaSec(t)}
                          />
                          <span className={`text-[11px] font-black uppercase tracking-tight ${filtroTurmaSec.includes(t) ? 'text-blue-600' : 'text-slate-600'}`}>{t}</span>
                        </label>
                      ))}
                      {turmasDisponiveisSec.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4 uppercase font-bold">Nenhuma turma para esta unidade</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-80 space-y-3">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1"><Activity className="w-3.5 h-3.5 text-indigo-500" /> STATUS DA MATRÍCULA</label>
                <div className="flex bg-slate-100 p-1 rounded-3xl shadow-inner h-14">
                  {[{ id: 'todos', label: 'TODOS', icon: Users }, { id: 'ativos', label: 'ATIVOS', icon: CheckCircle2 }, { id: 'saidas', label: 'SAÍDAS', icon: UserX }].map((btn) => (
                    <button key={btn.id} onClick={() => setFiltroStatusSec(btn.id as any)} className={`flex-1 flex items-center justify-center gap-2 rounded-2xl text-[10px] font-black transition-all ${filtroStatusSec === btn.id ? 'bg-white text-blue-600 shadow-md transform scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}><btn.icon className="w-3.5 h-3.5" /> {btn.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[44px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-8 bg-[#0f172a] text-white flex items-center justify-between">
              <div className="flex items-center gap-4"><div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20"><Users className="w-5 h-5"/></div><div><h3 className="text-xl font-black uppercase tracking-tight">Base de Contatos</h3><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{statsSecretaria.length} ESTUDANTES LOCALIZADOS</p></div></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="px-10 py-6">ESTUDANTE / UNIDADE</th>
                    <th className="px-10 py-6">MATRÍCULAS ATIVAS</th>
                    <th className="px-10 py-6">CONTATO 1 (WA)</th>
                    <th className="px-10 py-6">CONTATO 2 (WA)</th>
                    <th className="px-10 py-6 text-right">E-MAIL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {statsSecretaria.length > 0 ? statsSecretaria.map(aluno => {
                    const fone1 = cleanPhone(aluno.whatsapp1);
                    const fone2 = cleanPhone(aluno.whatsapp2);
                    const cursos = getCursosDoAluno(aluno.id);
                    return (
                      <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-6"><p className="font-black text-slate-800 uppercase text-sm leading-none mb-2 group-hover:text-blue-600 transition-colors">{aluno.nome}</p><div className="flex items-center gap-2"><span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[8px] font-black uppercase rounded-lg border border-blue-100 inline-flex items-center gap-1 shadow-sm"><MapPin className="w-2.5 h-2.5" /> {aluno.unidade}</span></div></td>
                        <td className="px-10 py-6"><div className="flex flex-wrap gap-1.5 max-w-xs">{cursos.length > 0 ? cursos.map((c, i) => (<span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase rounded-lg border border-indigo-100 shadow-sm flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> {c}</span>)) : (<span className="text-[10px] font-bold text-red-400 italic uppercase bg-red-50 px-2 py-1 rounded-md border border-red-100">Sem matrícula ativa</span>)}</div></td>
                        <td className="px-10 py-6"><p className="text-[9px] font-black text-slate-400 uppercase mb-1 leading-none truncate max-w-[120px]">{aluno.responsavel1 || 'RESPONSÁVEL 1'}</p>{fone1 ? (<a href={`https://wa.me/55${fone1}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald-600 font-black text-xs hover:text-emerald-700 transition-colors"><MessageCircle className="w-3.5 h-3.5 fill-emerald-600/10" /> {formatPhoneDisplay(aluno.whatsapp1)}</a>) : <span className="text-slate-300 italic text-[10px]">--</span>}</td>
                        <td className="px-10 py-6"><p className="text-[9px] font-black text-slate-400 uppercase mb-1 leading-none truncate max-w-[120px]">{aluno.responsavel2 || 'RESPONSÁVEL 2'}</p>{fone2 ? (<a href={`https://wa.me/55${fone2}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald-600 font-black text-xs hover:text-emerald-700 transition-colors"><MessageCircle className="w-3.5 h-3.5 fill-emerald-600/10" /> {formatPhoneDisplay(aluno.whatsapp2)}</a>) : <span className="text-slate-300 italic text-[10px]">--</span>}</td>
                        <td className="px-10 py-6 text-right"><div className="flex items-center justify-end gap-2 text-slate-500 text-xs font-bold bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl shadow-inner inline-flex"><Mail className="w-3.5 h-3.5 text-blue-500" /> {aluno.email || '--'}</div></td>
                      </tr>
                    );
                  }) : (<tr><td colSpan={5} className="px-10 py-32 text-center"><div className="flex flex-col items-center gap-4 text-slate-300"><Search className="w-12 h-12 opacity-20" /><p className="font-black uppercase tracking-widest">Nenhum resultado para os filtros selecionados</p></div></td></tr>)}
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
