
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
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
  MessageSquare,
  Bell,
  LayoutGrid
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
import AlunosList from './components/AlunosList';

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbwVhGDF_SF06OEpbP2Z3Qcu779QwvPsXW70785AkDOpbO33UX8vFbPnSVqK9SeB1MnB/exec";
const DEFAULT_WHATSAPP_URL = "https://webhook.pluglead.com/webhook/bd11b6b4731b0f0627a982ac90ad84ad";

const DEFAULT_TEMPLATE_RETENCAO = "Olá *{{responsavel}}*, aqui é da coordenação da *Sport for Kids ({{unidade}})*. Notamos que *{{estudante}}* faltou às últimas aulas de *{{curso}}*. Está tudo bem? Gostaríamos de saber se podemos ajudar em algo para que não perca o ritmo!";
const DEFAULT_TEMPLATE_EXPERIMENTAL = "Olá *{{responsavel}}*, aqui é da SFK. Estamos entrando em contato sobre a aula experimental de *{{estudante}}* para o curso de *{{curso}}* na unidade *{{unidade}}*. Como foi a experiência hoje?";
const DEFAULT_TEMPLATE_LEMBRETE = "Olá *{{responsavel}}*, aqui é da SFK. Passando para lembrar da aula experimental de *{{estudante}}* agendada para hoje no curso de *{{curso}}* na unidade *{{unidade}}*. Estamos ansiosos para recebê-los!";
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

  const [msgRetencao, setMsgRetencao] = useState(() => localStorage.getItem('sfk_msg_retencao') || DEFAULT_TEMPLATE_RETENCAO);
  const [msgExperimental, setMsgExperimental] = useState(() => localStorage.getItem('sfk_msg_experimental') || DEFAULT_TEMPLATE_EXPERIMENTAL);
  const [msgLembrete, setMsgLembrete] = useState(() => localStorage.getItem('sfk_msg_lembrete') || DEFAULT_TEMPLATE_LEMBRETE);
  const [msgAluno, setMsgAluno] = useState(() => localStorage.getItem('sfk_msg_aluno') || DEFAULT_TEMPLATE_ALUNO);

  const [alunos, setAlunos] = useState<Aluno[]>(() => JSON.parse(localStorage.getItem('sfk_alunos') || '[]'));
  const [turmas, setTurmas] = useState<Turma[]>(() => JSON.parse(localStorage.getItem('sfk_turmas') || '[]'));
  const [matriculas, setMatriculas] = useState<Matricula[]>(() => JSON.parse(localStorage.getItem('sfk_matriculas') || '[]'));
  const [presencas, setPresencas] = useState<Presenca[]>(() => JSON.parse(localStorage.getItem('sfk_presencas') || '[]'));
  const [usuarios, setUsuarios] = useState<Usuario[]>(() => JSON.parse(localStorage.getItem('sfk_usuarios') || JSON.stringify(INITIAL_USUARIOS)));
  const [experimentais, setExperimentais] = useState<AulaExperimental[]>(() => JSON.parse(localStorage.getItem('sfk_experimentais') || '[]'));
  const [acoesRetencao, setAcoesRetencao] = useState<AcaoRetencao[]>(() => JSON.parse(localStorage.getItem('sfk_acoes_retencao') || '[]'));

  const normalizeStr = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const parseSheetDate = (dateVal: any): string => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return "";
    try {
      let s = String(dateVal).trim().toLowerCase();
      s = s.split(',')[0].trim();
      s = s.split(' às ')[0].trim();
      s = s.split(' ha ')[0].trim();

      if (/^\d+$/.test(s)) {
        const serial = parseInt(s);
        if (serial > 30000 && serial < 60000) {
          const d = new Date((serial - 25569) * 86400 * 1000);
          if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
      }
      const monthsMap: Record<string, string> = { 'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04', 'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08', 'set': '09', 'out': '10', 'nov': '11', 'dez': '12' };
      const verboseMatch = s.match(/^(\d{1,2})\s+de\s+([a-zç]+)\.?\s+de\s+(\d{4})/);
      if (verboseMatch) {
        const day = String(parseInt(verboseMatch[1])).padStart(2, '0');
        const month = monthsMap[verboseMatch[2].substring(0, 3)];
        if (month) return `${verboseMatch[3]}-${month}-${day}`;
      }
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
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    } catch (e) {}
    return "";
  };

  const syncFromSheets = async () => {
    if (!apiUrl) { setSyncError("Configuração pendente."); return; }
    setIsLoading(true);
    setSyncError(null);
    try {
      const response = await fetch(`${apiUrl}?t=${Date.now()}`);
      const data = await response.json();
      const studentsMap = new Map<string, { meta: Aluno, activeCourses: Set<string> }>();
      const generatedMatriculas: Matricula[] = [];
      
      (data.base || []).forEach((item: any, idx: number) => {
        const nome = item.estudante || item.nome || item.aluno || "";
        const unidade = item.unidade || item.escola || "";
        const statusRaw = normalizeStr(item.status || item.statu || item.situacao || item.sit || item.estado || "");
        const isActive = statusRaw === 'ativo' || statusRaw === 'a' || statusRaw === '';
        
        if (!nome) return;
        const studentKey = `${normalizeStr(nome)}-${normalizeStr(unidade)}`;
        
        if (!studentsMap.has(studentKey)) {
          studentsMap.set(studentKey, { 
            meta: { 
              id: `aluno-${normalizeStr(nome)}-${normalizeStr(unidade)}`, 
              nome, 
              unidade, 
              dataNascimento: parseSheetDate(item.nascimento || item.datanascimento || item.datadenascimento), 
              contato: item.whatsapp1 || item.contato || "", 
              statusMatricula: 'Ativo', 
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
        
        if (item.responsavel2 && (!current.meta.responsavel2 || current.meta.responsavel2 === "")) {
          current.meta.responsavel2 = item.responsavel2;
        }
        if (item.whatsapp2 && (!current.meta.whatsapp2 || current.meta.whatsapp2 === "")) {
          current.meta.whatsapp2 = item.whatsapp2;
        }
        
        const dataMat = parseSheetDate(item.datadamatricula || item.datamatricula);
        const dataCanc = parseSheetDate(item.dtcancelamento || item.datacancelamento || item.datadecancelamento || item.datafim);
        
        if (dataCanc) current.meta.statusMatricula = 'Cancelado';
        else if (isActive) current.meta.statusMatricula = 'Ativo';
        
        const curso = item.curso || item.plano || "";
        if (curso) {
          if (isActive && !dataCanc) {
            current.activeCourses.add(curso);
            generatedMatriculas.push({ 
              id: `mat-${idx}`, 
              alunoId: current.meta.id, 
              turmaId: `${normalizeStr(curso)}-${normalizeStr(unidade)}`, 
              unidade, 
              dataMatricula: dataMat 
            });
          } else if (dataCanc) {
            current.meta.cursosCanceladosDetalhes?.push({ nome: curso, unidade, dataMatricula: dataMat, dataCancelamento: dataCanc });
          }
        }
      });
      
      const finalTurmas = (data.turmas || []).map((t: any) => ({ ...t, id: t.id || `${normalizeStr(t.nome)}-${normalizeStr(t.unidade)}-${normalizeStr(t.horario)}` }));
      const finalPresencas = (data.frequencia || []).map((p: any, idx: number) => ({ id: p.id || `freq-${idx}`, alunoId: p.alunoId || p.estudante || p.aluno || "", turmaId: p.turmaId || p.turma || "", unidade: p.unidade || "", data: parseSheetDate(p.data), status: (normalizeStr(p.status || p.statu) === 'presente') ? 'Presente' : 'Ausente', observacao: p.observacao || p.obs || "", _estudantePlanilha: p.estudante || p.aluno, _turmaPlanilha: p.turma }));
      
      setAlunos(Array.from(studentsMap.values()).map(s => s.meta));
      setTurmas(finalTurmas);
      setMatriculas(generatedMatriculas);
      setPresencas(finalPresencas);
      setExperimentais((data.experimental || []).map((e: any, idx: number) => ({ ...e, id: `exp-${idx}`, estudante: e.estudante || "", curso: e.curso || "", unidade: e.unidade || "", aula: parseSheetDate(e.aula), lembreteEnviado: normalizeStr(e.lembrete) === 'sim', followUpSent: normalizeStr(e.enviado) === 'sim', convertido: normalizeStr(e.conversao) === 'sim' })));
      setUsuarios([...INITIAL_USUARIOS.filter(u => u.nivel === 'Gestor Master'), ...(data.usuarios || [])]);
      
      setSyncSuccess("Sincronizado!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) { setSyncError("Falha na sincronização."); } finally { setIsLoading(false); }
  };

  const handleUpdateExperimental = async (updated: AulaExperimental) => {
    if (!apiUrl) return;
    setIsLoading(true);
    try {
      await fetch(apiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'save_experimental', data: { estudante: updated.estudante, curso: updated.curso, status: updated.status, feedback: updated.observacaoProfessor || "", lembrete: updated.lembreteEnviado ? "SIM" : "NÃO", enviado: updated.followUpSent ? "SIM" : "NÃO", conversao: updated.convertido ? "SIM" : "NÃO" } }) });
      setExperimentais(prev => {
        const next = prev.map(e => e.id === updated.id ? updated : e);
        localStorage.setItem('sfk_experimentais', JSON.stringify(next));
        return next;
      });
      setSyncSuccess("Lead atualizado!");
      setTimeout(() => setSyncSuccess(null), 2000);
    } catch (e) { setSyncError("Falha ao gravar lead."); } finally { setIsLoading(false); }
  };

  useEffect(() => { if (user) syncFromSheets(); }, [user?.login]);

  if (!user) return <Login onLogin={setUser} usuarios={usuarios} />;

  const isMaster = user.nivel === 'Gestor Master';
  const isGestor = user.nivel === 'Gestor' || isMaster;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, access: 'all' },
    { id: 'dados-alunos', label: 'Dados de Alunos', icon: Contact2, access: 'gestor' },
    { id: 'turmas', label: 'Turmas', icon: GraduationCap, access: 'all' },
    { id: 'preparacao', label: 'Preparação', icon: ClipboardList, access: 'all' },
    { id: 'frequencia', label: 'Frequência', icon: CheckCircle2, access: 'all' },
    { id: 'experimental', label: 'Experimentais', icon: FlaskConical, access: 'all' },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3, access: 'gestor' },
    { id: 'churn-risk', label: 'Retenção', icon: UserX, access: 'gestor' },
    { id: 'usuarios', label: 'Usuários', icon: ShieldCheck, access: 'master' },
    { id: 'settings', label: 'Configurações', icon: Settings, access: 'master' },
  ];

  const filteredMenu = menuItems.filter(item => {
    if (item.access === 'all') return true;
    if (item.access === 'gestor') return isGestor;
    if (item.access === 'master') return isMaster;
    return false;
  });

  return (
    <div className="flex h-screen bg-[#0f172a] font-['Inter']">
      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#1e1b4b] text-white transform transition-transform duration-300 z-50 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex flex-col h-full overflow-y-auto">
          <nav className="flex-1 space-y-1">
            {filteredMenu.map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id as ViewType); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${currentView === item.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-white' : 'text-slate-400'}`} />
                <span className="font-semibold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-6 border-t border-white/5">
            <button onClick={() => syncFromSheets()} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl bg-indigo-900/50 hover:bg-indigo-900 text-xs font-black transition-colors">
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudSync className="w-4 h-4" />} SINCRONIZAR
            </button>
            <button onClick={() => setUser(null)} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 font-bold text-sm transition-colors"><LogOut className="w-5 h-5" /> Sair</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Gestão SFK - {currentView.replace('-', ' ')}</h2>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-end border-r pr-8 border-slate-100">
               <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Usuário Conectado</span>
               <span className="text-sm font-black text-indigo-950 uppercase">{user.nome || user.login}</span>
            </div>
            <div className="flex flex-col items-end border-r pr-8 border-slate-100">
               <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Unidades Habilitadas</span>
               <span className="text-xs font-bold text-blue-600 uppercase">{user.unidade}</span>
            </div>
            <div className="flex flex-col items-end">
               <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Nível de Acesso</span>
               <span className="text-xs font-black text-emerald-500 uppercase">{user.nivel}</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          {currentView === 'dashboard' && <Dashboard user={user} alunosCount={alunos.length} turmasCount={turmas.length} turmas={turmas} presencas={presencas} alunos={alunos} matriculas={matriculas} experimentais={experimentais} onUpdateExperimental={handleUpdateExperimental} acoesRetencao={acoesRetencao} onNavigate={setCurrentView} isLoading={isLoading} whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }} msgTemplateExperimental={msgExperimental} />}
          {currentView === 'frequencia' && <Frequencia turmas={turmas} alunos={alunos} matriculas={matriculas} presencas={presencas} onSave={async (newPresencas) => { if (!apiUrl) return; setIsLoading(true); try { const payload = newPresencas.map(p => ({ aluno: (alunos.find(a => a.id === p.alunoId)?.nome) || p.alunoId, unidade: p.unidade, turma: (turmas.find(t => t.id === p.turmaId)?.nome) || p.turmaId, data: p.data, status: p.status, observacao: p.observacao || "" })); await fetch(apiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'save_frequencia', data: payload }) }); setPresencas(prev => [...prev, ...newPresencas]); setSyncSuccess("Chamada salva!"); setTimeout(() => setSyncSuccess(null), 3000); } catch (e) { setSyncError("Erro ao salvar."); } finally { setIsLoading(false); } }} currentUser={user} />}
          {currentView === 'dados-alunos' && <DadosAlunos alunos={alunos} turmas={turmas} matriculas={matriculas} user={user} whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }} msgTemplate={msgAluno} />}
          {currentView === 'turmas' && <TurmasList turmas={turmas} matriculas={matriculas} alunos={alunos} currentUser={user} />}
          {currentView === 'preparacao' && <PreparacaoTurmas alunos={alunos} turmas={turmas} matriculas={matriculas} currentUser={user} />}
          {currentView === 'experimental' && <AulasExperimentais experimentais={experimentais} currentUser={user} onUpdate={handleUpdateExperimental} turmas={turmas} whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }} msgTemplate={msgExperimental} msgLembreteTemplate={msgLembrete} />}
          {currentView === 'relatorios' && <Relatorios alunos={alunos} turmas={turmas} presencas={presencas} matriculas={matriculas} experimentais={experimentais} />}
          {currentView === 'churn-risk' && <ChurnRiskManagement alunos={alunos} matriculas={matriculas} presencas={presencas} turmas={turmas} acoesRealizadas={acoesRetencao} onRegistrarAcao={(novaAcao) => setAcoesRetencao(prev => [...prev, novaAcao])} currentUser={user} whatsappConfig={{ url: whatsappApiUrl, token: whatsappToken }} msgTemplate={msgRetencao} />}
          {currentView === 'usuarios' && isMaster && <UsuariosList usuarios={usuarios} />}
          {currentView === 'settings' && isMaster && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
               <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                 <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Settings className="w-6 h-6 text-indigo-600" /> Parâmetros do Sistema</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Script Google Sheets (URL)</label>
                       <input type="text" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-xs" />
                    </div>
                    <div className="space-y-4">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PlugLead Webhook URL</label>
                       <input type="text" value={whatsappApiUrl} onChange={(e) => setwhatsappApiUrl(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-xs" />
                    </div>
                 </div>
               </div>
               <button onClick={() => { localStorage.setItem('sfk_script_url', apiUrl); localStorage.setItem('whatsapp_api_url', whatsappApiUrl); setSyncSuccess("Configurações salvas!"); setTimeout(() => setSyncSuccess(null), 3000); syncFromSheets(); }} className="w-full py-6 bg-indigo-950 text-white rounded-3xl font-black text-xl shadow-2xl flex items-center justify-center gap-4 hover:bg-indigo-900 transition-all">
                 <Save className="w-7 h-7" /> SALVAR CONFIGURAÇÕES
               </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
