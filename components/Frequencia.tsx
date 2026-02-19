
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Save, 
  Info, 
  MessageSquareQuote,
  MessageSquarePlus,
  MessageSquareText,
  ChevronDown,
  ChevronUp,
  History,
  AlertCircle,
  RefreshCw,
  MapPin,
  GraduationCap,
  ClipboardList,
  UserCheck,
  Check,
  X
} from 'lucide-react';
import { Turma, Aluno, Matricula, Presenca, Usuario } from '../types';

interface FrequenciaProps {
  turmas: Turma[];
  alunos: Aluno[];
  matriculas: Matricula[];
  presencas: Presenca[];
  onSave: (presencas: Presenca[]) => void;
  currentUser: Usuario;
}

const Frequencia: React.FC<FrequenciaProps> = ({ turmas, alunos, matriculas, presencas, onSave, currentUser }) => {
  const [selectedUnidade, setSelectedUnidade] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [data, setData] = useState(new Date().toLocaleDateString('en-CA'));
  const [observacaoAula, setObservacaoAula] = useState('');
  const [markedPresencas, setMarkedPresencas] = useState<Record<string, 'Presente' | 'Ausente'>>({});
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});
  const [visibleNotes, setVisibleNotes] = useState<Record<string, boolean>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [buscaAluno, setBuscaAluno] = useState('');

  const lastLoadedContext = useRef<string>('');

  const normalize = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const isMaster = currentUser.nivel === 'Gestor Master' || currentUser.nivel === 'Start';
  const isProfessor = currentUser.nivel === 'Professor' || currentUser.nivel === 'Estagiário';
  const hasGlobalUnitAccess = normalize(currentUser.unidade) === 'todas';
  
  const professorName = normalize(currentUser.nome || currentUser.login);

  const myPermittedTurmas = useMemo(() => {
    if (isMaster || hasGlobalUnitAccess) return turmas;
    
    let filtered = [...turmas];
    const unidadestr = currentUser.unidade || '';
    const userUnits = normalize(unidadestr).split(',').map(u => u.trim()).filter(Boolean);
    
    if (userUnits.length > 0) {
      filtered = filtered.filter(t => userUnits.some(u => normalize(t.unidade).includes(u) || u.includes(normalize(t.unidade))));
    }
    
    if (isProfessor) {
      filtered = filtered.filter(t => {
        const prof = normalize(t.professor).replace(/^prof\.?\s*/i, '');
        return prof.includes(professorName) || professorName.includes(prof);
      });
    }
    return filtered;
  }, [turmas, isProfessor, isMaster, hasGlobalUnitAccess, professorName, currentUser.unidade]);

  const unidadesDisponiveis = useMemo(() => {
    const seen = new Set<string>();
    const units: string[] = [];
    myPermittedTurmas.forEach(t => {
      const n = t.unidade?.trim();
      if (!n) return;
      const norm = normalize(n);
      if (!seen.has(norm)) {
        seen.add(norm);
        units.push(n);
      }
    });
    return units.sort((a, b) => a.localeCompare(b));
  }, [myPermittedTurmas]);

  const displayTurmas = useMemo(() => {
    if (!selectedUnidade) return [];
    const unidadeBusca = normalize(selectedUnidade);
    let filtered = myPermittedTurmas.filter(t => normalize(t.unidade) === unidadeBusca);
    
    const uniqueList: Turma[] = [];
    const seenIds = new Set<string>();
    filtered.forEach(t => {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        uniqueList.push(t);
      }
    });
    return uniqueList;
  }, [myPermittedTurmas, selectedUnidade]);

  const alunosMatriculados = useMemo(() => {
    if (!selectedTurmaId) return [];
    const targetTurma = turmas.find(t => t.id === selectedTurmaId);
    if (!targetTurma) return [];
    
    const tId = normalize(selectedTurmaId);
    const tNome = normalize(targetTurma.nome);
    const tUnidade = normalize(targetTurma.unidade);
    
    const idsAlunosMatriculados = matriculas
      .filter(m => {
        const mTurmaId = normalize(m.turmaId);
        const mUnidade = normalize(m.unidade);
        const mCursoNome = mTurmaId.split('-')[0].trim();
        const unitMatch = mUnidade === tUnidade || mUnidade === "";
        const nameMatch = mTurmaId === tId || mCursoNome === tNome || mTurmaId.startsWith(tNome + "-");
        return unitMatch && nameMatch;
      })
      .map(m => m.alunoId);
      
    const uniqueIds = Array.from(new Set(idsAlunosMatriculados));
    return alunos.filter(a => 
      uniqueIds.includes(a.id) && 
      (normalize(a.statusMatricula || 'ativo') === 'ativo') &&
      (!buscaAluno || normalize(a.nome).includes(normalize(buscaAluno)))
    ).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [selectedTurmaId, matriculas, alunos, turmas, buscaAluno]);

  // EFEITO CRÍTICO: Carrega presenças existentes da planilha
  useEffect(() => {
    if (selectedTurmaId && data) {
      const currentContext = `${selectedTurmaId}|${data}`;
      
      if (lastLoadedContext.current !== currentContext) {
        const targetTurma = turmas.find(t => t.id === selectedTurmaId);
        const tNomeNorm = targetTurma ? normalize(targetTurma.nome) : '';
        const tIdNorm = normalize(selectedTurmaId);

        // Busca chamadas que batem com a data e com a turma (ID ou Nome)
        const chamadasExistentes = presencas.filter(p => {
          const pTurmaIdNorm = normalize(p.turmaId);
          return p.data === data && (pTurmaIdNorm === tIdNorm || pTurmaIdNorm === tNomeNorm);
        });
        
        if (chamadasExistentes.length > 0) {
          setIsEditMode(true);
          const newMarked: Record<string, 'Presente' | 'Ausente'> = {};
          const newNotes: Record<string, string> = {};
          let aulaNoteFound = '';
          
          // Mapeia os registros encontrados para os IDs dos alunos atuais
          alunosMatriculados.forEach(aluno => {
            const registroParaEsteAluno = chamadasExistentes.find(p => normalize(p.alunoId) === normalize(aluno.nome));
            
            if (registroParaEsteAluno) {
              newMarked[aluno.id] = registroParaEsteAluno.status as 'Presente' | 'Ausente';
              
              if (registroParaEsteAluno.observacao) {
                const obs = registroParaEsteAluno.observacao;
                const matchAula = obs.match(/\[Aula: (.*?)\]/);
                const matchAluno = obs.match(/\[Aluno: (.*?)\]/);
                if (matchAula && !aulaNoteFound) aulaNoteFound = matchAula[1];
                if (matchAluno) newNotes[aluno.id] = matchAluno[1];
                else if (!matchAula) newNotes[aluno.id] = obs;
              }
            } else {
              // Se o aluno está na turma mas não tem registro na data, assume presente por padrão
              newMarked[aluno.id] = 'Presente';
            }
          });
          
          setMarkedPresencas(newMarked);
          setStudentNotes(newNotes);
          setObservacaoAula(aulaNoteFound);
        } else {
          // Reset para nova chamada
          setIsEditMode(false);
          const initial: Record<string, 'Presente' | 'Ausente'> = {};
          alunosMatriculados.forEach(aluno => { initial[aluno.id] = 'Presente'; });
          setMarkedPresencas(initial);
          setStudentNotes({});
          setObservacaoAula('');
          setVisibleNotes({});
        }
        lastLoadedContext.current = currentContext;
      }
    } else {
      // Limpa estados se não houver turma selecionada
      setMarkedPresencas({});
      setStudentNotes({});
      setObservacaoAula('');
      setIsEditMode(false);
      lastLoadedContext.current = '';
    }
  }, [selectedTurmaId, data, presencas, alunosMatriculados.length, turmas]);

  const handleTogglePresenca = (alunoId: string, status: 'Presente' | 'Ausente') => {
    setMarkedPresencas(prev => ({ ...prev, [alunoId]: status }));
  };

  const handleSave = () => {
    if (!selectedTurmaId) return;
    const selectedTurma = turmas.find(t => t.id === selectedTurmaId);
    const nowTimestamp = new Date().toLocaleString('pt-BR');
    
    const records: Presenca[] = alunosMatriculados.map((aluno) => {
      const status = markedPresencas[aluno.id] || 'Presente';
      const individualNote = (studentNotes[aluno.id] || '').trim();
      const classNote = (observacaoAula || '').trim();
      
      let finalNote = "";
      if (classNote && individualNote) {
        finalNote = `[Aula: ${classNote}] | [Aluno: ${individualNote}]`;
      } else if (classNote) {
        finalNote = `[Aula: ${classNote}]`;
      } else if (individualNote) {
        finalNote = individualNote;
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        alunoId: aluno.nome, // Importante: a planilha espera o nome
        turmaId: selectedTurma?.nome || selectedTurmaId, // A planilha espera o nome
        unidade: selectedTurma?.unidade || currentUser.unidade,
        data,
        status: status,
        observacao: finalNote || "",
        timestampInclusao: nowTimestamp
      };
    });

    lastLoadedContext.current = ''; // Reseta contexto para forçar recarregamento após salvar
    onSave(records);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-4">
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2">
              <MapPin className="w-3 h-3 text-blue-500" /> 1. UNIDADE
            </label>
            <div className="relative group">
              <select 
                value={selectedUnidade}
                onChange={(e) => { setSelectedUnidade(e.target.value); setSelectedTurmaId(''); }}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold text-xs text-slate-700 appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                {unidadesDisponiveis.map(u => (<option key={u} value={u}>{u}</option>))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="md:col-span-5">
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2">
              <GraduationCap className="w-3 h-3 text-blue-500" /> 2. TURMA
            </label>
            <div className="relative group">
              <select 
                value={selectedTurmaId}
                disabled={!selectedUnidade}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className={`w-full pl-4 pr-10 py-3 border-2 rounded-xl outline-none transition-all font-bold text-xs appearance-none cursor-pointer ${
                  !selectedUnidade ? 'bg-slate-50 border-slate-50 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-blue-500'
                }`}
              >
                <option value="">{selectedUnidade ? 'Escolha...' : 'Aguardando...'}</option>
                {displayTurmas.map(t => (<option key={t.id} value={t.id}>{t.nome} ({t.horario})</option>))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2">
              <CalendarIcon className="w-3 h-3 text-blue-500" /> 3. DATA
            </label>
            <input 
              type="date" 
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none font-bold text-xs text-slate-700"
            />
          </div>
        </div>
        {selectedTurmaId && (
          <div className="animate-in fade-in zoom-in-95 duration-500 pt-2 border-t border-slate-50">
            <label className="block text-[9px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-widest flex items-center gap-2">
              <ClipboardList className="w-3 h-3 text-blue-500" /> CONTEÚDO DA AULA
            </label>
            <textarea 
              value={observacaoAula}
              onChange={(e) => setObservacaoAula(e.target.value)}
              placeholder="Resumo do que foi trabalhado hoje..."
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-medium text-xs min-h-[80px] resize-none shadow-inner"
            />
          </div>
        )}
      </div>
      
      {selectedTurmaId && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-2 duration-500">
          <div className="p-4 bg-[#0f172a] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-sm flex items-center gap-2 tracking-tight uppercase">
                {isEditMode ? <RefreshCw className="w-3.5 h-3.5 text-blue-400" /> : <ClipboardList className="w-3.5 h-3.5 text-blue-400" />}
                {isEditMode ? 'EDITAR CHAMADA' : 'REALIZAR CHAMADA'}
              </h3>
            </div>
            <div className="flex items-center gap-3">
               <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input 
                    type="text" 
                    value={buscaAluno}
                    onChange={(e) => setBuscaAluno(e.target.value)}
                    placeholder="Filtrar..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-[10px] font-bold outline-none focus:bg-white/20 transition-all placeholder-slate-500 uppercase"
                  />
               </div>
               <div className="flex items-center gap-2 bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-500">
                 <span className="text-[10px] font-black uppercase tracking-tighter">{alunosMatriculados.length} Alunos</span>
               </div>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {alunosMatriculados.length > 0 ? alunosMatriculados.map((aluno) => (
              <div key={aluno.id} className="flex flex-col">
                <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg transition-all duration-300 shadow-sm shrink-0 ${
                      markedPresencas[aluno.id] === 'Presente' ? 'bg-emerald-600 text-white' : 
                      markedPresencas[aluno.id] === 'Ausente' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {aluno.nome.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-sm leading-tight uppercase truncate">{aluno.nome}</span>
                        <button 
                          onClick={() => setVisibleNotes(v => ({ ...v, [aluno.id]: !v[aluno.id] }))}
                          className={`p-1.5 rounded-lg border transition-all ${
                            studentNotes[aluno.id] ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-white border-slate-100 text-slate-300'
                          }`}
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleTogglePresenca(aluno.id, 'Presente')}
                      className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border-2 font-black text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95 uppercase ${
                        markedPresencas[aluno.id] === 'Presente' ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm' : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> PRESENTE
                    </button>
                    <button 
                      onClick={() => handleTogglePresenca(aluno.id, 'Ausente')}
                      className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl border-2 font-black text-[10px] flex items-center justify-center gap-1.5 transition-all active:scale-95 uppercase ${
                        markedPresencas[aluno.id] === 'Ausente' ? 'bg-red-500 border-red-500 text-white shadow-sm' : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" /> AUSENTE
                    </button>
                  </div>
                </div>
                {(visibleNotes[aluno.id] || studentNotes[aluno.id]) && (
                  <div className="px-3 pb-3">
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                      <textarea
                        value={studentNotes[aluno.id] || ''}
                        onChange={(e) => setStudentNotes(n => ({ ...n, [aluno.id]: e.target.value }))}
                        placeholder="Nota individual..."
                        className="w-full bg-transparent outline-none text-xs font-medium text-amber-900 placeholder-amber-300 min-h-[40px] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <div className="py-12 text-center">
                 <Search className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                 <h4 className="text-xs font-black text-slate-400 uppercase">Nenhum aluno</h4>
              </div>
            )}
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
            <button 
              onClick={handleSave}
              className="w-full max-w-xs py-4 rounded-2xl bg-[#0f172a] text-white font-black text-sm hover:bg-slate-800 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-tighter"
            >
              <Save className="w-4 h-4 text-blue-400" /> 
              {isEditMode ? 'ATUALIZAR' : 'SALVAR CHAMADA'}
            </button>
          </div>
        </div>
      )}
      
      {isSuccess && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 z-[100] border border-blue-400">
          <CheckCircle2 className="w-5 h-5" />
          <div>
            <p className="font-black text-xs uppercase">Sincronizado!</p>
          </div>
        </div>
      )}
      
      {!selectedTurmaId && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-16 rounded-[40px] text-center space-y-3">
           <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-2">
              <GraduationCap className="w-6 h-6 text-blue-200" />
           </div>
           <p className="text-slate-400 font-black text-sm uppercase">AGUARDANDO SELEÇÃO</p>
           <p className="text-slate-300 font-bold text-[9px] uppercase tracking-widest">
             DEFINA OS FILTROS ACIMA PARA INICIAR.
           </p>
        </div>
      )}
    </div>
  );
};

export default Frequencia;
