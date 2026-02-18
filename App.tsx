
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Menu, 
  LayoutDashboard,
  GraduationCap, 
  CheckCircle2, 
  CloudSync,
  RefreshCw,
  AlertCircle,
  Settings,
  ShieldCheck,
  ClipboardList,
  FlaskConical,
  Contact2,
  UserX,
  CheckCircle,
  Activity,
  Layers,
  DollarSign,
  BarChart3,
  MapPin,
  Save,
  Webhook,
  Link2,
  FileText,
  MessageSquare,
  MessageCircle,
  Globe,
  Loader2,
  Cpu,
  Shield,
  CreditCard
} from 'lucide-react';
import { Aluno, Turma, Matricula, Presenca, Usuario, ViewType, AulaExperimental, AcaoRetencao, IdentidadeConfig, UnidadeMapping } from './types';
import { INITIAL_USUARIOS } from './constants';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Frequencia from './components/Frequencia';
import Relatorios from './components/Relatorios';
import TurmasList from './components/TurmasList';
import UsuariosList from './components/UsuariosList';
import PreparacaoTurmas from './components/PreparacaoTurmas';
import AulasExperimentais from './components/AulasExperimentais';
import DadosAlunos from './components/DadosAlunos';
import ChurnRiskManagement from './components/ChurnRiskManagement';
import Financeiro from './components/Financeiro';

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycby3gVqOg4dHFFZSJV1co4pjyJp_ZXnje521z86tVSUhI7AA8njGUwNAA7nRdbXp3RxXHw/exec";

const App: React.FC = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [bootMessage, setBootMessage] = useState("Otimizando Planilha Unificada...");
  const [user, setUser] = useState<Usuario | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('sfk_script_url') || DEFAULT_API_URL);
  const [identidades, setIdentidades] = useState<IdentidadeConfig[]>(() => JSON.parse(localStorage.getItem('sfk_identidades') || '[]'));
  const [unidadesMapping, setUnidadesMapping] = useState<UnidadeMapping[]>(() => JSON.parse(localStorage.getItem('sfk_unidades_mapping') || '[]'));

  const [alunos, setAlunos] = useState<Aluno[]>(() => JSON.parse(localStorage.getItem('sfk_alunos') || '[]'));
  const [turmas, setTurmas] = useState<Turma[]>(() => JSON.parse(localStorage.getItem('sfk_turmas') || '[]'));
  const [matriculas, setMatriculas] = useState<Matricula[]>(() => JSON.parse(localStorage.getItem('sfk_matriculas') || '[]'));
  const [presencas, setPresencas] = useState<Presenca[]>(() => JSON.parse(localStorage.getItem('sfk_presencas') || '[]'));
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => JSON.parse(localStorage.getItem('sfk_usuarios') || JSON.stringify(INITIAL_USUARIOS)));
  const [experimentais, setExperimentais] = useState<AulaExperimental[]>(() => JSON.parse(localStorage.getItem('sfk_experimentais') || '[]'));
  const [acoesRetencao, setAcoesRetencao] = useState<AcaoRetencao[]>(() => JSON.parse(localStorage.getItem('sfk_acoes_retencao') || '[]'));

  useEffect(() => {
    localStorage.setItem('sfk_identidades', JSON.stringify(identidades));
    localStorage.setItem('sfk_unidades_mapping', JSON.stringify(unidadesMapping));
    localStorage.setItem('sfk_alunos', JSON.stringify(alunos));
    localStorage.setItem('sfk_turmas', JSON.stringify(turmas));
    localStorage.setItem('sfk_matriculas', JSON.stringify(matriculas));
    localStorage.setItem('sfk_presencas', JSON.stringify(presencas));
    localStorage.setItem('sfk_usuarios', JSON.stringify(usuarios));
    localStorage.setItem('sfk_experimentais', JSON.stringify(experimentais));
    localStorage.setItem('sfk_acoes_retencao', JSON.stringify(acoesRetencao));
  }, [identidades, unidadesMapping, alunos, turmas, matriculas, presencas, usuarios, experimentais, acoesRetencao]);

  useEffect(() => {
    if (!isBooting) return;
    const messages = [
      "Conectando ao Google Cloud...",
      "Validando Credenciais SFK...",
      "Processando Base de Estudantes...",
      "Sincronizando Matrículas Ativas...",
      "Configurando Unidades e Turmas...",
      "Iniciando Dashboard Inteligente..."
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % messages.length;
      setBootMessage(messages[i]);
    }, 1500);
    return () => clearInterval(interval);
  }, [isBooting]);

  const normalizeStr = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const handleLogin = (loggedUser: Usuario) => {
    setUser(loggedUser);
    setCurrentView(loggedUser.nivel === 'Regente' ? 'preparacao' : 'dashboard');
  };

  const parseSheetDate = (dateVal: any): string => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return "";
    try {
      let s = String(dateVal).trim().toLowerCase();
      s = s.replace(/ano\s+passado/g, '').replace(/há\s+\d+\s+anos/g, '').trim();
      const ptMonths: Record<string, string> = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
      const ptMatch = s.match(/(\d{1,2})\s+de\s+([a-z]{3})[^\s]*\s+de\s+(\d{4})/);
      if (ptMatch) return `${ptMatch[3]}-${ptMonths[ptMatch[2]] || '01'}-${ptMatch[1].padStart(2, '0')}`;
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return isoMatch[0];
      const slashMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (slashMatch) {
        const dia = slashMatch[1].padStart(2, '0');
        const mes = slashMatch[2].padStart(2, '0');
        let ano = slashMatch[3];
        if (ano.length === 2) ano = parseInt(ano) > 70 ? "19" + ano : "20" + ano;
        return `${ano}-${mes}-${dia}`;
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return "";
  };

  const syncFromSheets = useCallback(async (isSilent: boolean = false) => {
    if (!apiUrl) return false;
    if (!isSilent) setIsLoading(true);
    setSyncError(null);
    try {
      const response = await fetch(`${apiUrl}?t=${Date.now()}`);
      const data = await response.json();
      
      const configsFromSheet = (data.configuracoes || data.config || []).map((c: any) => ({
        nome: c.identidade || c.nome || "Padrão",
        webhookUrl: c.webhook || c.webhookurl || "",
        tplLembrete: c.templatelembrete || "",
        tplFeedback: c.templatefeedback || c.templatefeddback || "",
        tplRetencao: c.templateretencao || "",
        tplMensagem: c.templatemensagem || "",
        tplReagendar: c.templatereagendar || ""
      }));
      setIdentidades(configsFromSheet);

      const mappingFromSheet = (data.unidadesMapping || data.unidades || []).map((u: any) => ({
        nome: u.unidade || u.nome || "",
        identidade: u.identidade || ""
      })).filter((m: any) => m.nome !== "");
      setUnidadesMapping(mappingFromSheet);

      if (data.configuracoes?.[0]?.scripturl) setApiUrl(data.configuracoes[0].scripturl);

      const cleanPhone = (p: any): string => {
        if (!p) return "";
        let s = String(p).trim();
        let digits = s.replace(/\D/g, '');
        if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.substring(2);
        return digits;
      };

      const studentsMap = new Map<string, Aluno>();
      const generatedMatriculas: Matricula[] = [];
      const studentActiveCoursesMap = new Map<string, string[]>();

      (data.base || []).forEach((item: any, idx: number) => {
        const nomeRaw = item.estudante || item.nome || item.aluno || "";
        const unidadeRaw = item.unidade || item.escola || "";
        if (!nomeRaw) return;
        
        const studentKey = `${normalizeStr(nomeRaw)}-${normalizeStr(unidadeRaw)}`;
        const dMat = parseSheetDate(item.dtmatricula || item.datamatricula);
        const dCanc = parseSheetDate(item.dtcancelamento || item.cancelamento);
        const statusRaw = normalizeStr(item.status || "");
        let rawPlano = item.turma || item.curso || "";
        if (rawPlano && typeof rawPlano === 'string') rawPlano = rawPlano.replace(/\s*\(.*/, '').trim();

        if (!studentsMap.has(studentKey)) {
          studentsMap.set(studentKey, {
            id: `aluno-${studentKey}`,
            nome: nomeRaw,
            unidade: unidadeRaw,
            dataNascimento: parseSheetDate(item.nascimento || item.datanascimento),
            contato: cleanPhone(item.whatsapp1 || item.whatsapp2),
            etapa: item.estagioanoescolar || item.etapa || item.etapaanoescolar || "",
            anoEscolar: item.anoescolar || item.ano || item.serie || item.anoserie || "",
            turmaEscolar: (item.turmaescolar || item.turma || "").toString().replace(/turma\s*/gi, '').trim(),
            dataMatricula: dMat,
            responsavel1: item.responsavel1 || "",
            whatsapp1: cleanPhone(item.whatsapp1),
            responsavel2: item.responsavel2 || "",
            whatsapp2: cleanPhone(item.whatsapp2),
            email: item.email || "",
            statusMatricula: 'Cancelado',
            cursosCanceladosDetalhes: [],
            isLead: statusRaw.includes('lead'),
            plano: item.plano || "" // Captura da Coluna D
          });
        }

        const student = studentsMap.get(studentKey)!;
        
        const isMoreRecent = !student.dataMatricula || (dMat && dMat >= student.dataMatricula);
        if (isMoreRecent) {
          student.responsavel1 = item.responsavel1 || student.responsavel1;
          student.whatsapp1 = cleanPhone(item.whatsapp1) || student.whatsapp1;
          student.responsavel2 = item.responsavel2 || student.responsavel2;
          student.whatsapp2 = cleanPhone(item.whatsapp2) || student.whatsapp2;
          student.email = item.email || student.email;
          student.etapa = item.estagioanoescolar || item.etapa || item.etapaanoescolar || student.etapa;
          student.anoEscolar = item.anoescolar || item.ano || item.serie || item.anoserie || student.anoEscolar;
          student.turmaEscolar = (item.turmaescolar || item.turma || "").toString().replace(/turma\s*/gi, '').trim() || student.turmaEscolar;
          student.dataMatricula = dMat || student.dataMatricula;
          student.plano = item.plano || student.plano; // Atualização persistente
        }

        const isRowActive = (statusRaw === 'ativo' || statusRaw === 'atv') && !dCanc;
        
        if (isRowActive) {
          student.statusMatricula = 'Ativo';
          if (rawPlano) {
            generatedMatriculas.push({ 
              id: `mat-${idx}`, 
              alunoId: student.id, 
              turmaId: `${normalizeStr(rawPlano)}-${normalizeStr(unidadeRaw)}`, 
              unidade: unidadeRaw, 
              dataMatricula: dMat 
            });
            const existingCourses = studentActiveCoursesMap.get(studentKey) || [];
            studentActiveCoursesMap.set(studentKey, [...existingCourses, rawPlano]);
          }
        } else if (dCanc || statusRaw === 'cancelado') {
          student.cursosCanceladosDetalhes!.push({ nome: rawPlano, unidade: unidadeRaw, dataMatricula: dMat, dataCancelamento: dCanc });
        }
      });

      setAlunos(Array.from(studentsMap.values()));
      setTurmas((data.turmas || []).map((t: any) => ({
        ...t,
        id: t.id || `${normalizeStr(t.nome || t.turma || "")}-${normalizeStr(t.unidade || "")}`,
        nome: t.nome || t.turma || "",
        unidade: t.unidade || "",
        horario: t.horario || "",
        professor: t.professor || "",
        capacidade: Number(t.capacidadedaturma || t.capacidade || 20),
        valorMensal: t.valormensal || t.custo || 0,
        identidade: t.identidade || ""
      })));
      setMatriculas(generatedMatriculas);
      setExperimentais((data.experimental || []).map((e: any, idx: number) => {
        const studentKey = `${normalizeStr(e.estudante || e.nome || "")}-${normalizeStr(e.unidade || e.escola || "")}`;
        const jaMatriculado = (studentActiveCoursesMap.get(studentKey) || []).some(ac => normalizeStr(ac).includes(normalizeStr(e.modalidade || e.curso || "")));
        return {
          ...e,
          id: `exp-${idx}`,
          estudante: e.estudante || e.nome || "",
          responsavel1: e.paimae || e.responsavel1 || "",
          unidade: e.unidade || e.escola || "",
          curso: e.modalidade || e.curso || "",
          aula: parseSheetDate(e.aula || e.data),
          whatsapp1: cleanPhone(e.whatsapp1 || e.whatsapp),
          status: e.status || "Pendente",
          observacaoProfessor: e.feedback || "",
          lembreteEnviado: String(e.lembrete || '').toLowerCase() === 'true',
          followUpSent: String(e.enviado || '').toLowerCase() === 'true',
          convertido: jaMatriculado || String(e.conversao || '').toLowerCase() === 'true',
          convertidoNaPlanilha: String(e.conversao || '').toLowerCase() === 'true',
          reagendarEnviado: String(e.reagendar || "").toLowerCase() === 'true',
          // Mapeamento dinâmico reforçado com 'estagioanoescolar'
          etapa: e.etapa || e.escolaridade || e.etapaoaescolar || e.etapaanoescolar || e.estagioanoescolar || "",
          anoEscolar: e.anoescolar || e.anoserie || e.ano || e.serie || "",
          turmaEscolar: e.turmaescolar || e.turma || ""
        };
      }));
      setUsuarios([...INITIAL_USUARIOS.filter(u => u.nivel === 'Gestor Master' || u.nivel === 'Start'), ...(data.usuarios || []).map((u: any) => ({ nome: u.nome || u.login || "", login: u.login || "", senha: String(u.senha || ""), nivel: u.nivel || "Professor", unidade: u.unidades || u.unidade || "" }))]);
      setPresencas((data.frequencia || []).map((p: any, idx: number) => ({ id: `pres-${idx}`, alunoId: p.estudante || "", unidade: p.unidade || "", turmaId: p.turma || "", data: parseSheetDate(p.data), status: p.status || "Ausente", observacao: p.observacao || "", alarme: p.alarme || "", timestampInclusao: p.datainclusao || "" })));

      return true;
    } catch (e) {
      if (!isSilent) setSyncError("Erro na sincronização.");
      return false;
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    const boot = async () => { await syncFromSheets(true); setIsBooting(false); };
    boot();
  }, [syncFromSheets]);

  const handleUpdateExperimental = async (updated: AulaExperimental) => {
    setIsLoading(true);
    try {
      await fetch(apiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'save_experimental', data: { estudante: updated.estudante, curso: updated.curso, status: updated.status, feedback: updated.observacaoProfessor, enviado: updated.followUpSent, convertido: updated.convertido, lembrete: updated.lembreteEnviado, reagendar: updated.reagendarEnviado } }) });
      setExperimentais(prev => prev.map(e => e.id === updated.id ? { ...updated, convertidoNaPlanilha: updated.convertido } : e));
      setSyncSuccess("Planilha Atualizada!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) { setSyncError("Erro ao gravar."); } finally { setIsLoading(false); }
  };

  const handleUpdateAlarmeRetencao = async (lastPresence: Presenca) => {
    setIsLoading(true);
    try {
      await fetch(apiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'save_frequencia', data: [{ aluno: lastPresence.alunoId, unidade: lastPresence.unidade, turma: lastPresence.turmaId, data: lastPresence.data, status: lastPresence.status, observacao: lastPresence.observacao || "", alarme: 'Enviado' }] }) });
      setPresencas(prev => prev.map(p => (p.alunoId === lastPresence.alunoId && p.turmaId === lastPresence.turmaId && p.data === lastPresence.data) ? { ...p, alarme: 'Enviado' } : p));
      setSyncSuccess("Alarme Registrado!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) { setSyncError("Erro ao gravar alarme."); } finally { setIsLoading(false); }
  };

  if (isBooting) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#020617] to-[#020617]" />
      <div className="relative z-10 flex flex-col items-center w-full max-w-lg">
        <div className="mb-14 relative">
          <div className="absolute inset-0 bg-indigo-600 rounded-[50px] blur-[80px] opacity-40 animate-pulse" />
          <div className="w-32 h-32 bg-white/5 backdrop-blur-3xl rounded-[40px] flex items-center justify-center border border-white/10 relative z-10">
            <Activity className="w-16 h-16 text-indigo-400 animate-pulse" />
          </div>
        </div>
        <div className="text-center mb-16 space-y-2">
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter">GESTÃO SFK 3.0</h1>
          <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest opacity-80">SPORT FOR INTELLIGENCE</p>
        </div>
        <div className="w-full bg-white/5 backdrop-blur-2xl rounded-[40px] border border-white/10 p-10 shadow-2xl overflow-hidden group">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-14 h-14 bg-indigo-600/20 rounded-3xl flex items-center justify-center border border-indigo-500/30">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">SINCRONISMO</p>
              <p className="text-lg font-bold text-white uppercase truncate">{bootMessage}</p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
            <div className="absolute top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} usuarios={usuarios} />;

  const isMaster = user.nivel === 'Gestor Master' || user.nivel === 'Start';
  const isGestorAdmin = user.nivel === 'Gestor Administrativo';
  const isCoord = user.nivel === 'Coordenador';

  return (
    <div className="flex h-screen bg-[#0f172a]">
      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#1e1b4b] text-white transform transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-50`}>
        <div className="p-8 flex flex-col h-full">
          <div className="mb-12 flex items-center gap-3"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center"><Activity className="w-6 h-6 text-white" /></div><h2 className="text-xl font-black tracking-tighter uppercase">Gestão SFK 3.0</h2></div>
          <nav className="flex-1 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: user.nivel !== 'Regente' },
              { id: 'dados-alunos', label: 'Alunos', icon: Contact2, visible: isMaster || isCoord || isGestorAdmin },
              { id: 'turmas', label: 'Turmas', icon: GraduationCap, visible: user.nivel !== 'Regente' },
              { id: 'preparacao', label: 'Preparação', icon: ClipboardList, visible: true }, 
              { id: 'frequencia', label: 'Freqüência', icon: CheckCircle2, visible: user.nivel !== 'Regente' && user.nivel !== 'Gestor' && user.nivel !== 'Gestor Administrativo' },
              { id: 'experimental', label: 'Experimentais', icon: FlaskConical, visible: true }, 
              { id: 'relatorios', label: 'BI & Business', icon: BarChart3, visible: isMaster || user.nivel === 'Gestor' || isCoord || isGestorAdmin },
              { id: 'financeiro', label: 'Financeiro', icon: DollarSign, visible: isMaster },
              { id: 'churn-risk', label: 'Retenção', icon: UserX, visible: isMaster || isGestorAdmin }, 
              { id: 'usuarios', label: 'Equipe', icon: ShieldCheck, visible: isMaster },
              { id: 'settings', label: 'Configurações', icon: Settings, visible: isMaster },
            ].filter(i => i.visible).map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id as ViewType); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">OPERADOR</p>
              <p className="text-sm font-black truncate uppercase text-white">{user.nome || user.login}</p>
            </div>
            <button onClick={() => syncFromSheets()} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-900/40 text-white font-black text-[10px] tracking-widest uppercase hover:bg-indigo-900 transition-all">{isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudSync className="w-4 h-4" />} Sincronizar</button>
            <button onClick={() => setUser(null)} className="w-full text-slate-400 hover:text-red-400 font-bold text-[10px] uppercase py-2">Sair</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="h-20 bg-white border-b px-10 flex items-center justify-between shrink-0 z-20 shadow-sm">
          <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
          <div className="hidden lg:flex items-center gap-3 text-slate-400"><Layers className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">SFK & B+ / {currentView.toUpperCase()}</span></div>
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Unidade Ativa</p>
            <p className="text-xs font-black text-indigo-950 uppercase">{isMaster ? 'GESTÃO GLOBAL' : user.unidade}</p>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          {currentView === 'dashboard' && <Dashboard user={user} alunosCount={alunos.length} turmasCount={turmas.length} turmas={turmas} presencas={presencas} alunos={alunos} matriculas={matriculas} experimentais={experimentais} acoesRetencao={acoesRetencao} onNavigate={setCurrentView} onUpdateExperimental={handleUpdateExperimental} isLoading={isLoading} identidades={identidades} unidadesMapping={unidadesMapping} />}
          {currentView === 'dados-alunos' && <DadosAlunos alunos={alunos} turmas={turmas} matriculas={matriculas} user={user} identidades={identidades} unidadesMapping={unidadesMapping} />}
          {currentView === 'turmas' && <TurmasList turmas={turmas} matriculas={matriculas} alunos={alunos} currentUser={user} />}
          {currentView === 'frequencia' && <Frequencia turmas={turmas} alunos={alunos} matriculas={matriculas} presencas={presencas} onSave={async (recs) => { setIsLoading(true); try { await fetch(apiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'save_frequencia', data: recs }) }); setPresencas(prev => [...prev, ...recs]); setSyncSuccess("Freqüência Salva!"); setTimeout(() => setSyncSuccess(null), 3000); } catch (e) { setSyncError("Erro ao salvar."); } finally { setIsLoading(false); } }} currentUser={user} />}
          {currentView === 'preparacao' && <PreparacaoTurmas alunos={alunos} turmas={turmas} matriculas={matriculas} currentUser={user} />}
          {currentView === 'experimental' && <AulasExperimentais experimentais={experimentais} alunosAtivos={alunos.filter(a => a.statusMatricula === 'Ativo')} currentUser={user} onUpdate={handleUpdateExperimental} turmas={turmas} identidades={identidades} unidadesMapping={unidadesMapping} />}
          {currentView === 'relatorios' && <Relatorios alunos={alunos} turmas={turmas} presencas={presencas} matriculas={matriculas} experimentais={experimentais} user={user} />}
          {currentView === 'financeiro' && <Financeiro alunos={alunos} turmas={turmas} matriculas={matriculas} />}
          {currentView === 'churn-risk' && <ChurnRiskManagement alunos={alunos} matriculas={matriculas} presencas={presencas} turmas={turmas} acoesRealizadas={acoesRetencao} onRegistrarAcao={(a) => setAcoesRetencao(prev => [...prev, a])} onSheetAlarmeUpdate={handleUpdateAlarmeRetencao} currentUser={user} identidades={identidades} unidadesMapping={unidadesMapping} />}
          {currentView === 'usuarios' && <UsuariosList usuarios={usuarios} />}
          {currentView === 'settings' && (
            <div className="space-y-12 animate-in fade-in max-w-5xl mx-auto">
              <div><h2 className="text-4xl font-black text-slate-800 uppercase tracking-tight">Configurações</h2><p className="text-slate-500 font-medium">Gestão de API e múltiplas identidades de comunicação.</p></div>
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Globe className="w-6 h-6"/></div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">API Principal</h3></div>
                <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">URL do Google Script</label><input type="text" value={apiUrl} onChange={e => { setApiUrl(e.target.value); localStorage.setItem('sfk_script_url', e.target.value); }} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold text-xs" /></div>
              </div>
              <div className="space-y-8">
                <div className="flex items-center gap-4"><div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><MessageSquare className="w-6 h-6"/></div><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Identidades de Comunicação</h3></div>
                {identidades.map((ident, idx) => (
                  <div key={idx} className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                      <h4 className="text-lg font-black text-indigo-600 uppercase tracking-widest">{ident.nome}</h4>
                      <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-400">ID: {idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Webhook URL</label><input type="text" readOnly value={ident.webhookUrl} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Feedback</label><textarea readOnly value={ident.tplFeedback} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Lembrete</label><textarea readOnly value={ident.tplLembrete} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                      </div>
                      <div className="space-y-4">
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Retenção</label><textarea readOnly value={ident.tplRetencao} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Mensagem</label><textarea readOnly value={ident.tplMensagem} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                        <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest">Template Reagendamento</label><textarea readOnly value={ident.tplReagendar} className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] h-20 resize-none" /></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      {syncSuccess && <div className="fixed bottom-10 right-10 bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase flex items-center gap-3 z-50 border border-blue-400"><CheckCircle className="w-5 h-5" /> {syncSuccess}</div>}
      {syncError && <div className="fixed bottom-10 right-10 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase flex items-center gap-3 z-50"><AlertCircle className="w-5 h-5" /> {syncError}</div>}
    </div>
  );
};

export default App;
