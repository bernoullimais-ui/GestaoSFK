
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, 
  Calendar, 
  BarChart3, 
  LogOut, 
  Menu, 
  LayoutDashboard,
  GraduationCap,
  CheckCircle2, 
  Database,
  CloudSync,
  RefreshCw,
  AlertCircle,
  Settings,
  ShieldCheck,
  ClipboardList,
  FlaskConical,
  Contact2,
  UserX,
  MessageCircle,
  Save,
  Smartphone,
  Loader2,
  ExternalLink,
  CheckCircle,
  BookOpen,
  Zap,
  Lock,
  Info,
  X,
  MessageSquare
} from 'lucide-react';
import { Aluno, Turma, Matricula, Presenca, Usuario, ViewType, AulaExperimental, AcaoRetencao, CursoCancelado } from './types';
import { INITIAL_ALUNOS, INITIAL_TURMAS, INITIAL_MATRICULAS, INITIAL_PRESENCAS, INITIAL_USUARIOS } from './constants';
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

const SFKLogo: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" stroke="#1e1b4b" strokeWidth="8" />
    <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" fontFamily="Arial Black" fontSize="35" fill="#1e1b4b">SFK</text>
    <path d="M20 50 Q50 20 80 50" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbwVhGDF_SF06OEpbP2Z3Qcu779QwvPsXW70785AkDOpbO33UX8vFbPnSVqK9SeB1MnB/exec";
const DEFAULT_WHATSAPP_URL = "https://webhook.pluglead.com/webhook/bd11b6b4731b0f0627a982ac90ad84ad";

const DEFAULT_TEMPLATE_RETENCAO = "Olá *{{responsavel}}*, aqui é da coordenação da *Sport for Kids ({{unidade}})*. Notamos que *{{estudante}}* faltou às últimas aulas de *{{curso}}*. Está tudo bem? Gostaríamos de saber se podemos ajudar em algo para que não perca o ritmo!";
const DEFAULT_TEMPLATE_EXPERIMENTAL = "Olá *{{responsavel}}*, aqui é da SFK. Estamos entrando em contato sobre a aula experimental de *{{estudante}}* para o curso de *{{curso}}* na unidade *{{unidade}}*. Como foi a experiência hoje?";
const DEFAULT_TEMPLATE_ALUNO = "Olá {{responsavel}}, aqui é da SFK. Gostaríamos de falar sobre o(a) aluno(a) {{estudante}}.";

const App: React.FC = () => {
  const [user, setUser] = useState<Usuario | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('sfk_script_url') || DEFAULT_API_URL);
  const [whatsappApiUrl, setwhatsappApiUrl] = useState(() => localStorage.getItem('whatsapp_api_url') || DEFAULT_WHATSAPP_URL);
  const [whatsappToken, setWhatsappToken] = useState(localStorage.getItem('whatsapp_token') || '');

  // Mensagens Templates
  const [msgRetencao, setMsgRetencao] = useState(() => localStorage.getItem('sfk_msg_retencao') || DEFAULT_TEMPLATE_RETENCAO);
  const [msgExperimental, setMsgExperimental] = useState(() => localStorage.getItem('sfk_msg_experimental') || DEFAULT_TEMPLATE_EXPERIMENTAL);
  const [msgAluno, setMsgAluno] = useState(() => localStorage.getItem('sfk_msg_aluno') || DEFAULT_TEMPLATE_ALUNO);

  const [alunos, setAlunos] = useState<Aluno[]>(() => JSON.parse(localStorage.getItem('sfk_alunos') || '[]'));
  const [turmas, setTurmas] = useState<Turma[]>(() => JSON.parse(localStorage.getItem('sfk_turmas') || '[]'));
  const [matriculas, setMatriculas] = useState<Matricula[]>(() => JSON.parse(localStorage.getItem('sfk_matriculas') || '[]'));
  const [presencas, setPresencas] = useState<Presenca[]>(() => JSON.parse(localStorage.getItem('sfk_presencas') || '[]'));
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => JSON.parse(localStorage.getItem('sfk_usuarios') || JSON.stringify(INITIAL_USUARIOS)));
  const [experimentais, setExperimentais] = useState<AulaExperimental[]>(() => JSON.parse(localStorage.getItem('sfk_experimentais') || '[]'));
  const [acoesRetencao, setAcoesRetencao] = useState<AcaoRetencao[]>(() => JSON.parse(localStorage.getItem('sfk_acoes_retencao') || '[]'));

  const normalize = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const handleRegistrarAcao = (novaAcao: AcaoRetencao) => {
    setAcoesRetencao(prev => {
      const next = [...prev, novaAcao];
      localStorage.setItem('sfk_acoes_retencao', JSON.stringify(next));
      return next;
    });
  };

  const handleSaveFrequencia = async (newPresencas: Presenca[]) => {
    if (!apiUrl) return;
    setIsLoading(true);
    try {
      const payload = newPresencas.map(p => ({
        aluno: (alunos.find(a => a.id === p.alunoId)?.nome) || p.alunoId,
        unidade: p.unidade,
        turma: (turmas.find(t => t.id === p.turmaId)?.nome) || p.turmaId,
        data: p.data,
        status: p.status,
        observacao: p.observacao || ""
      }));

      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ action: 'save_frequencia', data: payload })
      });
      
      setPresencas(prev => {
        const next = [...prev, ...newPresencas];
        localStorage.setItem('sfk_presencas', JSON.stringify(next));
        return next;
      });
      setSyncSuccess("Chamada salva!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) {
      setSyncError("Erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateExperimental = async (updated: AulaExperimental) => {
    if (!apiUrl) return;
    setIsLoading(true);
    try {
      await fetch(apiUrl, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ 
          action: 'save_experimental', 
          data: {
            estudante: updated.estudante,
            curso: updated.curso,
            status: updated.status,
            feedback: updated.observacaoProfessor
          } 
        })
      });
      
      setExperimentais(prev => {
        const next = prev.map(e => e.id === updated.id ? updated : e);
        localStorage.setItem('sfk_experimentais', JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const parseSheetDate = (dateVal: any): string => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return "";
    try {
      let s = String(dateVal).trim().toLowerCase();
      
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      
      const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dmyMatch) {
        const day = String(parseInt(dmyMatch[1])).padStart(2, '0');
        const month = String(parseInt(dmyMatch[2])).padStart(2, '0');
        let year = parseInt(dmyMatch[3]);
        if (year < 100) year += (year < 50 ? 2000 : 1900);
        return `${year}-${month}-${day}`;
      }

      const longFormatMatch = s.match(/^(\d{1,2})\s+de\s+(\w+)\.?\s+de\s+(\d{4})/);
      if (longFormatMatch) {
        const day = longFormatMatch[1].padStart(2, '0');
        const monthMap: Record<string, string> = {
          'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06',
          'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
        };
        const monthShort = longFormatMatch[2].substring(0, 3);
        const month = monthMap[monthShort] || '01';
        const year = longFormatMatch[3];
        return `${year}-${month}-${day}`;
      }

      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }

      return "";
    } catch (e) { return ""; }
  };

  const filteredData = useMemo(() => {
    if (!user) return { alunos: [], turmas: [], matriculas: [], presencas: [], experimentais: [] };
    const isMaster = user.nivel === 'Gestor Master';
    const unidadestr = user.unidade || '';
    const allowedUnits = new Set<string>(unidadestr === 'TODAS' ? ['todas'] : unidadestr.split(',').map(u => normalize(u)));

    const checkUnitAccess = (unitName: string) => {
      if (allowedUnits.has('todas')) return true;
      const normUnit = normalize(unitName);
      return Array.from(allowedUnits).some((u: string) => normUnit.includes(u) || u.includes(normUnit));
    };

    const filteredAlunos = alunos.filter(a => isMaster || checkUnitAccess(a.unidade));
    const filteredTurmas = turmas.filter(t => isMaster || checkUnitAccess(t.unidade));
    const filteredPresencas = presencas.filter(p => isMaster || checkUnitAccess(p.unidade));
    const filteredMatriculas = matriculas.filter(m => isMaster || checkUnitAccess(m.unidade));
    const filteredExperimentais = experimentais.filter(e => isMaster || checkUnitAccess(e.unidade));

    return {
      alunos: filteredAlunos,
      turmas: filteredTurmas,
      matriculas: filteredMatriculas,
      presencas: filteredPresencas,
      experimentais: filteredExperimentais
    };
  }, [user, alunos, turmas, matriculas, presencas, experimentais]);

  const syncFromSheets = async () => {
    if (!apiUrl) {
      setSyncError("Configuração pendente.");
      return;
    }
    setIsLoading(true);
    setSyncError(null);
    try {
      const response = await fetch(`${apiUrl}?t=${Date.now()}`);
      const data = await response.json();
      
      const finalTurmas = (data.turmas || []).map((t: any) => ({
        ...t,
        id: t.id || `${normalize(t.nome)}-${normalize(t.unidade)}-${normalize(t.horario)}`
      }));

      const finalPresencas = (data.frequencia || []).map((p: any, idx: number) => ({
        id: p.id || `freq-${idx}`,
        alunoId: p.alunoId || p.estudante || p.aluno || "",
        turmaId: p.turmaId || p.turma || "",
        unidade: p.unidade || "",
        data: parseSheetDate(p.data),
        status: (normalize(p.status || p.statu) === 'presente') ? 'Presente' : 'Ausente',
        observacao: p.observacao || p.obs || "",
        _estudantePlanilha: p.estudante || p.aluno,
        _turmaPlanilha: p.turma
      }));

      const studentsMap = new Map<string, { meta: Aluno, activeCourses: Set<string> }>();
      const generatedMatriculas: Matricula[] = [];
      
      (data.base || []).forEach((item: any, idx: number) => {
        const nome = item.estudante || item.nome || item.aluno || "";
        const unidade = item.unidade || item.escola || "";
        const statusRaw = normalize(item.status || "");
        const isActive = statusRaw === 'ativo';
        if (!nome) return;

        const studentKey = `${normalize(nome)}-${normalize(unidade)}`;
        if (!studentsMap.has(studentKey)) {
          studentsMap.set(studentKey, { 
            meta: {
                id: `aluno-${normalize(nome)}-${normalize(unidade)}`,
                nome,
                unidade,
                dataNascimento: parseSheetDate(item.nascimento || item.datanascimento || item.datadenascimento),
                contato: item.contato || item.whatsapp1 || item.celularresponsavel || "",
                statusMatricula: isActive ? 'Ativo' : 'Cancelado',
                responsavel1: item.responsavel1 || item.nomeresponsavel || "",
                whatsapp1: item.whatsapp1 || item.celularresponsavel || "",
                responsavel2: item.responsavel2 || "",
                whatsapp2: item.whatsapp2 || "",
                email: item.email || "",
                etapa: item.etapa || item.etapaescolar || item.estagio || item.estagioanoescolar || "",
                anoEscolar: item.anoescolar || item.ano || item.serie || item.escolaridade || "",
                turmaEscolar: item.turmaescolar || item.turma || "",
                cursosCanceladosDetalhes: []
            }, 
            activeCourses: new Set() 
          });
        }
        
        const current = studentsMap.get(studentKey)!;
        
        if (!current.meta.etapa) current.meta.etapa = item.etapa || item.etapaescolar || item.estagio || item.estagioanoescolar || "";
        if (!current.meta.anoEscolar) current.meta.anoEscolar = item.anoescolar || item.ano || item.serie || item.escolaridade || "";
        if (!current.meta.turmaEscolar) current.meta.turmaEscolar = item.turmaescolar || item.turma || "";
        if (!current.meta.responsavel1) current.meta.responsavel1 = item.responsavel1 || item.nomeresponsavel || "";
        if (!current.meta.whatsapp1) current.meta.whatsapp1 = item.whatsapp1 || item.celularresponsavel || "";

        if (isActive) {
            current.meta.statusMatricula = 'Ativo';
        }

        const curso = item.curso || item.plano || "";
        const dataMatricula = parseSheetDate(item.datadamatricula || item.datamatricula);
        const dataCancelamento = parseSheetDate(item.dtcancelamento || item.datacancelamento || item.datadecancelamento || item.datafim);

        if (curso) {
            if (isActive) {
                current.activeCourses.add(curso);
                generatedMatriculas.push({
                    id: `mat-${idx}`,
                    alunoId: current.meta.id,
                    turmaId: `${normalize(curso)}-${normalize(unidade)}`,
                    unidade,
                    dataMatricula
                });
            } else {
                const jaExiste = current.meta.cursosCanceladosDetalhes?.some(c => c.nome === curso && c.dataCancelamento === dataCancelamento);
                if (!jaExiste) {
                  current.meta.cursosCanceladosDetalhes?.push({
                      nome: curso,
                      unidade,
                      dataMatricula,
                      dataCancelamento
                  });
                }
            }
        }
      });

      const finalAlunos: Aluno[] = Array.from(studentsMap.values()).map(s => s.meta);

      setAlunos(finalAlunos);
      setTurmas(finalTurmas);
      setMatriculas(generatedMatriculas);
      setPresencas(finalPresencas);
      setExperimentais(data.experimental || []);
      setUsuarios([...INITIAL_USUARIOS.filter(u => u.nivel === 'Gestor Master'), ...(data.usuarios || [])]);

      localStorage.setItem('sfk_alunos', JSON.stringify(finalAlunos));
      localStorage.setItem('sfk_turmas', JSON.stringify(finalTurmas));
      localStorage.setItem('sfk_matriculas', JSON.stringify(generatedMatriculas));
      localStorage.setItem('sfk_presencas', JSON.stringify(finalPresencas));
      setSyncSuccess("Sincronizado!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) {
      setSyncError("Falha na sincronização.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (user) syncFromSheets(); }, [user?.login]);

  if (!user) return <Login onLogin={setUser} usuarios={usuarios} />;

  const isMaster = user.nivel === 'Gestor Master';
  const isGestor = user.nivel === 'Gestor' || isMaster;

  const handleSaveSettings = () => {
    localStorage.setItem('sfk_script_url', apiUrl);
    localStorage.setItem('whatsapp_api_url', whatsappApiUrl);
    localStorage.setItem('whatsapp_token', whatsappToken);
    
    localStorage.setItem('sfk_msg_retencao', msgRetencao);
    localStorage.setItem('sfk_msg_experimental', msgExperimental);
    localStorage.setItem('sfk_msg_aluno', msgAluno);
    
    setSyncSuccess("Configurações salvas!");
    setTimeout(() => setSyncSuccess(null), 3000);
    syncFromSheets();
  };

  return (
    <div className="flex h-screen bg-slate-50 font-['Inter']">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-indigo-950 text-white transform transition-transform duration-300 z-50 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-10 bg-white/5 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <SFKLogo className="w-10 h-10" />
              <div><h1 className="text-xl font-black">SFK 2026</h1><p className="text-[9px] font-bold text-emerald-400 uppercase">Gestão Esportiva</p></div>
            </div>
            <button className="lg:hidden p-1 text-white/50" onClick={() => setIsSidebarOpen(false)}><X className="w-5 h-5" /></button>
          </div>
          
          <nav className="flex-1 space-y-1">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest px-4 mb-2">Principal</p>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'frequencia', label: 'Frequência', icon: CheckCircle2 },
              { id: 'turmas', label: 'Turmas', icon: GraduationCap },
              { id: 'preparacao', label: 'Preparação', icon: ClipboardList },
              { id: 'experimental', label: 'Experimentais', icon: FlaskConical },
            ].map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id as ViewType); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-indigo-200 hover:bg-white/10'}`}>
                <item.icon className="w-5 h-5" /><span className="font-bold text-sm">{item.label}</span>
              </button>
            ))}

            {(isGestor) && (
              <>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest px-4 mt-8 mb-2">Administração</p>
                {[
                  { id: 'dados-alunos', label: 'Base de Alunos', icon: Contact2 },
                  { id: 'churn-risk', label: 'Retenção', icon: UserX },
                  { id: 'relatorios', label: 'Relatórios BI', icon: BarChart3 },
                ].map((item) => (
                  <button key={item.id} onClick={() => { setCurrentView(item.id as ViewType); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-indigo-200 hover:bg-white/10'}`}>
                    <item.icon className="w-5 h-5" /><span className="font-bold text-sm">{item.label}</span>
                  </button>
                ))}
              </>
            )}

            {isMaster && (
              <>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest px-4 mt-8 mb-2">Configurações</p>
                {[
                  { id: 'usuarios', label: 'Usuários', icon: ShieldCheck },
                  { id: 'settings', label: 'Configurações', icon: Settings }
                ].map((item) => (
                  <button key={item.id} onClick={() => { setCurrentView(item.id as ViewType); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-indigo-200 hover:bg-white/10'}`}>
                    <item.icon className="w-5 h-5" /><span className="font-bold text-sm">{item.label}</span>
                  </button>
                ))}
              </>
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10">
            <button onClick={() => syncFromSheets()} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl bg-indigo-900 text-xs font-black disabled:opacity-50 hover:bg-indigo-800 transition-colors">
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudSync className="w-4 h-4" />} SINCRONIZAR
            </button>
            <button onClick={() => setUser(null)} className="w-full flex items-center gap-3 px-4 py-3 text-indigo-300 hover:text-red-400 font-bold text-sm transition-colors"><LogOut className="w-5 h-5" /> Sair</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b px-6 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-lg" onClick={() => setIsSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
            <div className="flex items-center gap-2">
               <h2 className="text-sm font-black text-indigo-950 uppercase tracking-widest">{currentView.replace('-', ' ')}</h2>
               {isLoading && <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {syncError && <div className="bg-red-50 text-red-500 px-3 py-1 rounded-lg text-[10px] font-black border border-red-100 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {syncError}</div>}
             {syncSuccess && <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black border border-emerald-100 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {syncSuccess}</div>}
             <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black text-slate-400 uppercase leading-none">{user.nivel}</p>
               <p className="text-xs font-bold text-indigo-950">{user.nome || user.login}</p>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          {currentView === 'dashboard' && <Dashboard user={user} alunosCount={filteredData.alunos.length} turmasCount={filteredData.turmas.length} turmas={filteredData.turmas} presencas={filteredData.presencas} alunos={filteredData.alunos} matriculas={filteredData.matriculas} acoesRetencao={acoesRetencao} onNavigate={setCurrentView} isLoading={isLoading} />}
          {currentView === 'frequencia' && <Frequencia turmas={filteredData.turmas} alunos={filteredData.alunos} matriculas={filteredData.matriculas} presencas={filteredData.presencas} onSave={handleSaveFrequencia} currentUser={user} />}
          {currentView === 'turmas' && <TurmasList turmas={filteredData.turmas} matriculas={filteredData.matriculas} alunos={filteredData.alunos} currentUser={user} />}
          {currentView === 'preparacao' && <PreparacaoTurmas alunos={filteredData.alunos} turmas={filteredData.turmas} matriculas={filteredData.matriculas} currentUser={user} />}
          {currentView === 'experimental' && <AulasExperimentais experimentais={filteredData.experimentais} currentUser={user} onUpdate={handleUpdateExperimental} turmas={filteredData.turmas} whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }} msgTemplate={msgExperimental} />}
          {currentView === 'dados-alunos' && <DadosAlunos alunos={filteredData.alunos} turmas={filteredData.turmas} matriculas={filteredData.matriculas} user={user} whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }} msgTemplate={msgAluno} />}
          {currentView === 'churn-risk' && <ChurnRiskManagement alunos={filteredData.alunos} matriculas={filteredData.matriculas} presencas={filteredData.presencas} turmas={filteredData.turmas} acoesRealizadas={acoesRetencao} onRegistrarAcao={handleRegistrarAcao} currentUser={user} whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }} msgTemplate={msgRetencao} />}
          {currentView === 'relatorios' && <Relatorios alunos={filteredData.alunos} turmas={filteredData.turmas} presencas={filteredData.presencas} matriculas={filteredData.matriculas} experimentais={filteredData.experimentais} />}
          {currentView === 'usuarios' && <UsuariosList usuarios={usuarios} />}
          
          {currentView === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Conectividade Card */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-950 text-white rounded-2xl"><Settings className="w-6 h-6" /></div>
                    <div><h3 className="text-xl font-black text-slate-900">Conectividade</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Google Cloud & WhatsApp</p></div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">URL da API (Google Script)</label>
                      <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-medium" placeholder="https://script.google.com/..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">API WhatsApp (PlugLead/Webhook)</label>
                      <input type="text" value={whatsappApiUrl} onChange={(e) => setwhatsappApiUrl(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-medium" placeholder="https://webhook.pluglead.com/..." />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">API Token (Apikey)</label>
                      <input type="password" value={whatsappToken} onChange={(e) => setWhatsappToken(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-medium" placeholder="••••••••••••••••" />
                    </div>
                  </div>
                </div>

                {/* Mensagens Templates Card */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-950 text-white rounded-2xl"><MessageSquare className="w-6 h-6" /></div>
                    <div><h3 className="text-xl font-black text-slate-900">Templates de Mensagens</h3><p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Padrões do Sistema</p></div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex justify-between">
                        <span>Alerta de Retenção</span>
                        <span className="text-indigo-400 lowercase">Variáveis: {"{{responsavel}}"}, {"{{estudante}}"}, {"{{unidade}}"}, {"{{curso}}"}</span>
                      </label>
                      <textarea value={msgRetencao} onChange={(e) => setMsgRetencao(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-medium min-h-[100px] text-sm resize-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex justify-between">
                        <span>Aula Experimental</span>
                        <span className="text-indigo-400 lowercase">Variáveis: {"{{responsavel}}"}, {"{{estudante}}"}, {"{{unidade}}"}, {"{{curso}}"}</span>
                      </label>
                      <textarea value={msgExperimental} onChange={(e) => setMsgExperimental(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-medium min-h-[100px] text-sm resize-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex justify-between">
                        <span>Contato Estudante</span>
                        <span className="text-indigo-400 lowercase">Variáveis: {"{{responsavel}}"}, {"{{estudante}}"}</span>
                      </label>
                      <textarea value={msgAluno} onChange={(e) => setMsgAluno(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-indigo-500 font-medium min-h-[100px] text-sm resize-none" />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <button onClick={handleSaveSettings} className="w-full max-w-md bg-indigo-950 text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-indigo-950/20 hover:bg-indigo-900 transition-all flex items-center justify-center gap-3">
                  SALVAR TODAS AS CONFIGURAÇÕES E ATUALIZAR <Save className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-800 font-medium leading-relaxed">As variáveis entre chaves duplas (ex: {"{{estudante}}"}) serão substituídas automaticamente pelos dados reais ao abrir a tela de envio. Não altere o texto dentro delas.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
