
import React, { useState, useEffect } from 'react';
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
  Globe
} from 'lucide-react';
import { Aluno, Turma, Matricula, Presenca, Usuario, ViewType, AulaExperimental, AcaoRetencao } from './types';
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

const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbwVhGDF_SF06OEpbP2Z3Qcu779QwvPsXW70785AkDOpbO33UX8vFbPnSVqK9SeB1MnB/exec";

const App: React.FC = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [user, setUser] = useState<Usuario | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('sfk_script_url') || DEFAULT_API_URL);
  const [webhookUrl, setWebhookUrl] = useState(() => localStorage.getItem('sfk_webhook_url') || "");
  const [tplLembrete, setTplLembrete] = useState(() => localStorage.getItem('sfk_tpl_lembrete') || "");
  const [tplFeedback, setTplFeedback] = useState(() => localStorage.getItem('sfk_tpl_feedback') || "");
  const [tplRetencao, setTplRetencao] = useState(() => localStorage.getItem('sfk_tpl_retencao') || "");
  const [tplMensagem, setTplMensagem] = useState(() => localStorage.getItem('sfk_tpl_mensagem') || "");

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
      const ptMonths: Record<string, string> = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
      const ptMatch = s.match(/(\d{1,2})\s+de\s+([a-z]{3})[^\s]*\s+de\s+(\d{4})/);
      if (ptMatch) return `${ptMatch[3]}-${ptMonths[ptMatch[2]] || '01'}-${ptMatch[1].padStart(2, '0')}`;
      s = s.split(' ')[0];
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return isoMatch[0];
      const slashMatch = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (slashMatch) {
        let year = slashMatch[3];
        if (year.length === 2) year = "20" + year;
        return `${year}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
      }
    } catch (e) {}
    return "";
  };

  const syncFromSheets = async (isSilent: boolean = false) => {
    if (!apiUrl) return false;
    if (!isSilent) setIsLoading(true);
    setSyncError(null);
    try {
      const response = await fetch(`${apiUrl}?t=${Date.now()}`);
      const data = await response.json();
      
      const config = (data.configuracoes || data.config || [])[0];
      if (config) {
        const apiFromSheet = config.scripturl || config.apiurl || config.script_url;
        if (apiFromSheet) setApiUrl(apiFromSheet);
        const webhook = config.webhook || config.webhookurl || "";
        const lembrete = config.templatelembrete || "";
        const feedback = config.templatefeedback || config.templatefeddback || ""; 
        const retencao = config.templateretencao || "";
        const mensagem = config.templatemensagem || "";
        setWebhookUrl(webhook);
        setTplLembrete(lembrete);
        setTplFeedback(feedback);
        setTplRetencao(retencao);
        setTplMensagem(mensagem);
        if (apiFromSheet) localStorage.setItem('sfk_script_url', apiFromSheet);
        localStorage.setItem('sfk_webhook_url', webhook);
        localStorage.setItem('sfk_tpl_lembrete', lembrete);
        localStorage.setItem('sfk_tpl_feedback', feedback);
        localStorage.setItem('sfk_tpl_retencao', retencao);
        localStorage.setItem('sfk_tpl_mensagem', mensagem);
      }

      const cleanPhone = (p: any): string => {
        if (!p) return "";
        let s = String(p).trim();
        let digits = s.replace(/\D/g, '');
        if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) digits = digits.substring(2);
        return digits;
      };

      const studentsMap = new Map<string, Aluno>();
      const generatedMatriculas: Matricula[] = [];

      (data.base || []).forEach((item: any, idx: number) => {
        const nomeRaw = item.estudante || item.nome || item.aluno || "";
        const unidadeRaw = item.unidade || item.escola || "";
        if (!nomeRaw) return;
        const studentKey = `${normalizeStr(nomeRaw)}-${normalizeStr(unidadeRaw)}`;
        const dMat = parseSheetDate(item.datadamatricula || item.datamatricula || item.matricula);
        const dCanc = parseSheetDate(item.dtcancelamento || item.datacancelamento || item.cancelamento);
        const statusRaw = normalizeStr(item.status || "");
        const rawPlano = item.turma || item.plano || item.curso || "";

        if (!studentsMap.has(studentKey)) {
          studentsMap.set(studentKey, {
            id: `aluno-${studentKey}`,
            nome: nomeRaw,
            unidade: unidadeRaw,
            dataNascimento: parseSheetDate(item.nascimento || item.datanascimento),
            contato: cleanPhone(item.whatsapp1),
            etapa: item.estagioanoescolar || item.etapa || "",
            turmaEscolar: item.turmaescolar || "",
            dataMatricula: dMat,
            responsavel1: item.responsavel1 || "",
            whatsapp1: cleanPhone(item.whatsapp1),
            responsavel2: item.responsavel2 || "",
            whatsapp2: cleanPhone(item.whatsapp2),
            email: item.email || "",
            statusMatricula: 'Cancelado',
            cursosCanceladosDetalhes: [],
            isLead: statusRaw.includes('lead')
          });
        }
        const student = studentsMap.get(studentKey)!;
        const isRowActive = (statusRaw === 'ativo' || statusRaw === 'active') && (dCanc === "" || dCanc === null);
        if (isRowActive) {
          student.statusMatricula = 'Ativo';
          if (rawPlano) generatedMatriculas.push({ id: `mat-${idx}`, alunoId: student.id, turmaId: `${normalizeStr(rawPlano)}-${normalizeStr(unidadeRaw)}`, unidade: unidadeRaw, dataMatricula: dMat });
        } else if (dCanc) {
          student.cursosCanceladosDetalhes!.push({ nome: rawPlano, unidade: unidadeRaw, dataMatricula: dMat, dataCancelamento: dCanc });
        }
      });

      const experimentaisFromSheet = (data.experimental || []).map((e: any, idx: number) => {
        const lembreteEnviado = String(e.lembrete || '').toLowerCase() === 'true' || e.lembrete === true;
        const followUpSent = String(e.enviado || '').toLowerCase() === 'true' || e.enviado === true;
        const expStudentName = e.estudante || e.nome || e.aluno || "";
        const expUnidade = e.unidade || e.escola || "";
        const studentKey = `${normalizeStr(expStudentName)}-${normalizeStr(expUnidade)}`;
        const alunoNaBase = studentsMap.get(studentKey);
        const jaMatriculadoPelaBase = alunoNaBase && alunoNaBase.statusMatricula === 'Ativo';
        const convertidoPlanilha = String(e.conversao || e.matriculado || "").toLowerCase() === 'true' || e.conversao === true;
        
        return {
          ...e,
          id: `exp-${idx}`,
          estudante: expStudentName,
          responsavel1: e.paimae || e.responsavel1 || "",
          unidade: expUnidade,
          curso: e.modalidade || e.curso || e.turma || "",
          aula: parseSheetDate(e.aula || e.data),
          whatsapp1: cleanPhone(e.whatsapp1 || e.whatsapp),
          status: e.status || e.presenca || "Pendente",
          observacaoProfessor: e.feedback || e.observacaoprofessor || "",
          lembreteEnviado: lembreteEnviado,
          followUpSent: followUpSent,
          convertido: jaMatriculadoPelaBase || convertidoPlanilha,
          convertidoNaPlanilha: convertidoPlanilha
        };
      });

      const updatedUsers: Usuario[] = (data.usuarios || []).map((u: any) => {
        const nivel = u.nivel || "Professor";
        const isMasterLevel = nivel === 'Gestor Master' || nivel === 'Start';
        const rawUnidade = (u.unidades || u.unidade || u.escola || "").toString().trim();
        const unidade = rawUnidade || (isMasterLevel ? "TODAS" : "");
        return { nome: u.nome || u.login || "", login: u.login || "", senha: String(u.senha || ""), nivel: nivel, unidade: unidade };
      });

      const allUsers = [...INITIAL_USUARIOS.filter(u => u.nivel === 'Gestor Master' || u.nivel === 'Start'), ...updatedUsers];
      
      const mappedTurmas = (data.turmas || []).map((t: any) => ({
        ...t,
        id: t.id || `${normalizeStr(t.nome || t.turma || "")}-${normalizeStr(t.unidade || "")}`,
        nome: t.nome || t.turma || "",
        unidade: t.unidade || "",
        horario: t.horario || "",
        professor: t.professor || "",
        capacidade: Number(t.capacidadedaturma || t.capacidade || 20),
        valorMensal: t.valormensal || t.custo || t.valor || 0
      }));

      // --- SINCRONIZAÇÃO DE FREQUÊNCIA (LENDO COLUNA G) ---
      const mappedPresencas = (data.frequencia || []).map((p: any, idx: number) => ({
        id: `pres-${idx}`,
        alunoId: p.estudante || "",
        unidade: p.unidade || "",
        turmaId: p.turma || "",
        data: parseSheetDate(p.data),
        status: p.status || "Ausente",
        observacao: p.observacao || "",
        alarme: p.alarme || "", // Coluna G
        _estudantePlanilha: p.estudante,
        _turmaPlanilha: p.turma
      }));

      setAlunos(Array.from(studentsMap.values()));
      setTurmas(mappedTurmas);
      setMatriculas(generatedMatriculas);
      setExperimentais(experimentaisFromSheet);
      setUsuarios(allUsers);
      setPresencas(mappedPresencas);

      localStorage.setItem('sfk_alunos', JSON.stringify(Array.from(studentsMap.values())));
      localStorage.setItem('sfk_turmas', JSON.stringify(mappedTurmas));
      localStorage.setItem('sfk_matriculas', JSON.stringify(generatedMatriculas));
      localStorage.setItem('sfk_experimentais', JSON.stringify(experimentaisFromSheet));
      localStorage.setItem('sfk_usuarios', JSON.stringify(allUsers));
      localStorage.setItem('sfk_presencas', JSON.stringify(mappedPresencas));

      if (!isSilent) { setSyncSuccess("Sincronização concluída!"); setTimeout(() => setSyncSuccess(null), 3000); }
      return true;
    } catch (e) {
      if (!isSilent) setSyncError("Erro na sincronização.");
      return false;
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  useEffect(() => {
    const boot = async () => { await syncFromSheets(true); setIsBooting(false); };
    boot();
  }, []);

  useEffect(() => {
    if (user) {
      if (user.nivel === 'Regente') setCurrentView('preparacao');
      else setCurrentView('dashboard');
    }
  }, [user]);

  const handleUpdateExperimental = async (updated: AulaExperimental) => {
    setIsLoading(true);
    try {
      await fetch(apiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'save_experimental', data: { estudante: updated.estudante, curso: updated.curso, status: updated.status, feedback: updated.observacaoProfessor, enviado: updated.followUpSent, conversao: updated.convertido, lembrete: updated.lembreteEnviado } }) });
      setExperimentais(prev => prev.map(e => e.id === updated.id ? { ...updated, convertidoNaPlanilha: updated.convertido } : e));
      setSyncSuccess("Planilha Atualizada!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) { setSyncError("Erro ao gravar."); } finally { setIsLoading(false); }
  };

  // Função para registrar o alarme de retenção na planilha (Coluna G)
  const handleRegisterRetentionAction = async (lastPresence: Presenca) => {
    setIsLoading(true);
    try {
      // Usamos a mesma ação 'save_frequencia' garantindo que o campo 'alarme' seja enviado
      await fetch(apiUrl, { 
        method: 'POST', 
        mode: 'no-cors', 
        body: JSON.stringify({ 
          action: 'save_frequencia', 
          data: [{ 
            aluno: (lastPresence as any)._estudantePlanilha || lastPresence.alunoId, 
            unidade: lastPresence.unidade, 
            turma: (lastPresence as any)._turmaPlanilha || lastPresence.turmaId, 
            data: lastPresence.data, 
            status: lastPresence.status, 
            observacao: lastPresence.observacao || "",
            alarme: "Enviado" // Marca na coluna G
          }] 
        }) 
      });
      
      // Atualiza localmente
      setPresencas(prev => prev.map(p => 
        (p.alunoId === lastPresence.alunoId && p.turmaId === lastPresence.turmaId && p.data === lastPresence.data) 
        ? { ...p, alarme: "Enviado" } 
        : p
      ));
      
      setSyncSuccess("Alarme Registrado na Planilha!");
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (e) {
      setSyncError("Erro ao registrar alarme.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isBooting) return <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-white text-center flex-col gap-4"><Activity className="w-16 h-16 text-indigo-500 animate-pulse" /><h1 className="text-2xl font-black uppercase tracking-widest">SFK GESTÃO V2.0</h1></div>;
  if (!user) return <Login onLogin={setUser} usuarios={usuarios} />;

  const isMaster = user.nivel === 'Gestor Master' || user.nivel === 'Start';
  const isGestor = user.nivel === 'Gestor' || isMaster || user.nivel === 'Coordenador';
  const isProfessor = user.nivel === 'Professor' || user.nivel === 'Estagiário';
  const isRegente = user.nivel === 'Regente';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, visible: !isRegente },
    { id: 'dados-alunos', label: 'Alunos', icon: Contact2, visible: isMaster || user.nivel === 'Coordenador' },
    { id: 'turmas', label: 'Turmas', icon: GraduationCap, visible: !isRegente },
    { id: 'preparacao', label: 'Preparação', icon: ClipboardList, visible: isGestor || isRegente }, 
    { id: 'frequencia', label: 'Freqüência', icon: CheckCircle2, visible: isProfessor || isMaster },
    { id: 'experimental', label: 'Experimentais', icon: FlaskConical, visible: true }, 
    { id: 'relatorios', label: (user.nivel === 'Gestor' || user.nivel === 'Coordenador') ? 'Fluxo de Matrículas' : 'Relatórios', icon: BarChart3, visible: isGestor },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign, visible: isMaster },
    { id: 'churn-risk', label: 'Retenção', icon: UserX, visible: isMaster },
    { id: 'usuarios', label: 'Equipe', icon: ShieldCheck, visible: isMaster },
    { id: 'settings', label: 'Configurações', icon: Settings, visible: isMaster },
  ];

  return (
    <div className="flex h-screen bg-[#0f172a]">
      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#1e1b4b] text-white transform transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} z-50`}>
        <div className="p-8 flex flex-col h-full">
          <div className="mb-12 flex items-center gap-3"><div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Activity className="w-6 h-6 text-white" /></div><h2 className="text-xl font-black tracking-tighter uppercase">SFK GESTÃO</h2></div>
          <nav className="flex-1 space-y-1">
            {menuItems.filter(i => i.visible).map((item) => (
              <button key={item.id} onClick={() => { setCurrentView(item.id as ViewType); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all ${currentView === item.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-bold text-xs uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">USUÁRIO</p>
              <p className="text-sm font-black truncate uppercase text-white">{user.nome || user.login}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase truncate leading-none mt-1">{user.nivel}</p>
            </div>
            <button onClick={() => syncFromSheets()} disabled={isLoading} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-900/40 text-white font-black text-[10px] tracking-widest uppercase hover:bg-indigo-900 transition-all">{isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudSync className="w-4 h-4" />} Sincronizar</button>
            <button onClick={() => setUser(null)} className="w-full text-slate-400 hover:text-red-400 font-bold text-[10px] uppercase py-2">Sair</button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        <header className="h-20 bg-white border-b px-10 flex items-center justify-between shrink-0 z-20 shadow-sm">
          <button className="lg:hidden p-2 text-slate-500" onClick={() => setIsSidebarOpen(true)}><Menu className="w-6 h-6" /></button>
          <div className="hidden lg:flex items-center gap-3 text-slate-400"><Layers className="w-4 h-4" /><span className="text-[10px] font-black uppercase tracking-widest">SFK / {currentView.toUpperCase().replace('-', ' ')}</span></div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Unidade Ativa</p>
              <p className="text-xs font-black text-indigo-950 uppercase">{isMaster ? 'GESTÃO GLOBAL' : user.unidade}</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          {currentView === 'dashboard' && <Dashboard user={user} alunosCount={alunos.length} turmasCount={turmas.length} turmas={turmas} presencas={presencas} alunos={alunos} matriculas={matriculas} experimentais={experimentais} acoesRetencao={acoesRetencao} onNavigate={setCurrentView} onUpdateExperimental={handleUpdateExperimental} isLoading={isLoading} whatsappConfig={{ url: webhookUrl, token: "" }} msgTemplate={tplFeedback} />}
          {currentView === 'dados-alunos' && <DadosAlunos alunos={alunos} turmas={turmas} matriculas={matriculas} user={user} whatsappConfig={{ url: webhookUrl, token: "" }} msgTemplate={tplMensagem} />}
          {currentView === 'turmas' && <TurmasList turmas={turmas} matriculas={matriculas} alunos={alunos} currentUser={user} />}
          {currentView === 'frequencia' && <Frequencia turmas={turmas} alunos={alunos} matriculas={matriculas} presencas={presencas} onSave={async (recs) => { setIsLoading(true); try { await fetch(apiUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'save_frequencia', data: recs.map(p => ({ aluno: (alunos.find(a => a.id === p.alunoId)?.nome) || p.alunoId, unidade: p.unidade, turma: (turmas.find(t => t.id === p.turmaId)?.nome) || p.turmaId, data: p.data, status: p.status, observacao: p.observacao || "" })) }) }); setPresencas(prev => [...prev, ...recs]); setSyncSuccess("Freqüência Salva!"); setTimeout(() => setSyncSuccess(null), 3000); } catch (e) { setSyncError("Erro ao salvar."); } finally { setIsLoading(false); } }} currentUser={user} />}
          {currentView === 'preparacao' && <PreparacaoTurmas alunos={alunos} turmas={turmas} matriculas={matriculas} currentUser={user} />}
          {currentView === 'experimental' && <AulasExperimentais experimentais={experimentais} alunosAtivos={alunos.filter(a => a.statusMatricula === 'Ativo')} currentUser={user} onUpdate={handleUpdateExperimental} turmas={turmas} whatsappConfig={{ url: webhookUrl, token: "" }} msgTemplate={tplFeedback} msgLembreteTemplate={tplLembrete} />}
          {currentView === 'relatorios' && <Relatorios alunos={alunos} turmas={turmas} presencas={presencas} matriculas={matriculas} experimentais={experimentais} user={user} />}
          {currentView === 'financeiro' && <Financeiro alunos={alunos} turmas={turmas} matriculas={matriculas} />}
          {currentView === 'churn-risk' && <ChurnRiskManagement alunos={alunos} matriculas={matriculas} presencas={presencas} turmas={turmas} acoesRealizadas={acoesRetencao} onRegistrarAcao={(a) => setAcoesRetencao(prev => [...prev, a])} onSheetAlarmeUpdate={handleRegisterRetentionAction} currentUser={user} whatsappConfig={{ url: webhookUrl, token: "" }} msgTemplate={tplRetencao} />}
          {currentView === 'usuarios' && <UsuariosList usuarios={usuarios} />}
          {currentView === 'settings' && (
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-24">
              <div className="flex items-center justify-between">
                <div className="space-y-1"><h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter leading-none">Configurações</h2><p className="text-slate-500 font-medium text-sm">Controle de APIs e Templates de Mensagens.</p></div>
                <button onClick={() => { localStorage.setItem('sfk_script_url', apiUrl); localStorage.setItem('sfk_webhook_url', webhookUrl); localStorage.setItem('sfk_tpl_lembrete', tplLembrete); localStorage.setItem('sfk_tpl_feedback', tplFeedback); localStorage.setItem('sfk_tpl_retencao', tplRetencao); localStorage.setItem('sfk_tpl_mensagem', tplMensagem); setSyncSuccess("Ajustes Salvos!"); setTimeout(() => setSyncSuccess(null), 3000); }} className="bg-indigo-600 text-white px-10 py-5 rounded-[24px] font-black text-[11px] uppercase tracking-widest flex items-center gap-4 shadow-xl hover:bg-indigo-700 transition-all active:scale-95"><Save className="w-5 h-5" /> Salvar Localmente</button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-5 bg-white p-12 rounded-[50px] shadow-sm border border-slate-100 space-y-10">
                  <div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Globe className="w-6 h-6"/></div><div><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Endpoints</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Integrações de Dados</p></div></div>
                  <div className="space-y-8">
                    <div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SCRIPT URL (Coluna A)</label><input type="text" value={apiUrl} onChange={e => setApiUrl(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-indigo-500 outline-none font-bold text-sm shadow-inner" placeholder="URL do Google Script" /></div>
                    <div className="space-y-2"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WEBHOOK (Coluna B)</label><input type="text" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-indigo-500 outline-none font-bold text-sm shadow-inner" placeholder="URL do Webhook WhatsApp" /></div>
                  </div>
                </div>
                <div className="lg:col-span-7 bg-white p-12 rounded-[50px] shadow-sm border border-slate-100 space-y-10">
                  <div className="flex items-center gap-4"><div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center"><FileText className="w-6 h-6"/></div><div><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Templates de Texto</h3><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Personalização de Mensagens</p></div></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Lembrete (C)</label><textarea value={tplLembrete} onChange={e => setTplLembrete(e.target.value)} className="w-full h-32 p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] focus:border-indigo-500 outline-none text-xs font-medium resize-none shadow-inner" placeholder="Mensagem de lembrete da aula..." /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Feedback (D)</label><textarea value={tplFeedback} onChange={e => setTplFeedback(e.target.value)} className="w-full h-32 p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] focus:border-indigo-500 outline-none text-xs font-medium resize-none shadow-inner" placeholder="Mensagem pós-aula experimental..." /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Retenção (E)</label><textarea value={tplRetencao} onChange={e => setTplRetencao(e.target.value)} className="w-full h-32 p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] focus:border-indigo-500 outline-none text-xs font-medium resize-none shadow-inner" placeholder="Mensagem para alunos ausentes..." /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Mensagem (F)</label><textarea value={tplMensagem} onChange={e => setTplMensagem(e.target.value)} className="w-full h-32 p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] focus:border-indigo-500 outline-none text-xs font-medium resize-none shadow-inner" placeholder="Mensagem geral do cadastro de alunos..." /></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      {syncSuccess && <div className="fixed bottom-10 right-10 bg-blue-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 z-50 border border-blue-400"><CheckCircle className="w-5 h-5" /> {syncSuccess}</div>}
      {syncError && <div className="fixed bottom-10 right-10 bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 z-50"><AlertCircle className="w-5 h-5" /> {syncError}</div>}
    </div>
  );
};

export default App;
