
import React, { useState, useMemo, useEffect } from 'react';
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

  const normalize = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  // 1. FILTRO DE UNIDADES (Sincronizado com turmas disponíveis)
  const unidadesDisponiveis = useMemo(() => {
    const seen = new Set<string>();
    const units: string[] = [];
    
    turmas.forEach(t => {
      const n = t.unidade?.trim();
      if (!n) return;
      const norm = normalize(n);
      if (!seen.has(norm)) {
        seen.add(norm);
        units.push(n);
      }
    });
    
    return units.sort((a, b) => a.localeCompare(b));
  }, [turmas]);

  // 2. FILTRO DE TURMAS (Carrega apenas as turmas da unidade selecionada)
  const displayTurmas = useMemo(() => {
    if (!selectedUnidade) return [];
    const unidadeBusca = normalize(selectedUnidade);
    let filtered = turmas.filter(t => normalize(t.unidade) === unidadeBusca);
    
    // Garantir que não haja duplicatas de ID
    const uniqueMap = new Map<string, Turma>();
    filtered.forEach(t => {
      if (!uniqueMap.has(t.id)) {
        uniqueMap.set(t.id, t);
      }
    });
    
    return Array.from(uniqueMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [turmas, selectedUnidade]);

  // Reset do filtro de turmas se a unidade mudar
  useEffect(() => {
    if (selectedTurmaId) {
      const turmaExisteNaUnidade = displayTurmas.some(t => t.id === selectedTurmaId);
      if (!turmaExisteNaUnidade) {
        setSelectedTurmaId('');
      }
    }
  }, [displayTurmas]);

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
        if (mUnidade === tUnidade && (mTurmaId === tId || mTurmaId.includes(tNome))) return true;
        return false;
      })
      .map(m => m.alunoId);

    const uniqueIds = Array.from(new Set(idsAlunosMatriculados));

    return alunos.filter(a => 
      uniqueIds.includes(a.id) && 
      (normalize(a.statusMatricula || 'ativo') === 'ativo') &&
      (!buscaAluno || normalize(a.nome).includes(normalize(buscaAluno)))
    ).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [selectedTurmaId, matriculas, alunos, turmas, buscaAluno]);

  useEffect(() => {
    if (selectedTurmaId && data) {
      const chamadasExistentes = presencas.filter(p => normalize(p.turmaId) === normalize(selectedTurmaId) && p.data === data);
      
      if (chamadasExistentes.length > 0) {
        setIsEditMode(true);
        const newMarked: Record<string, 'Presente' | 'Ausente'> = {};
        const newNotes: Record<string, string> = {};
        let aulaNote = '';

        chamadasExistentes.forEach(p => {
          newMarked[p.alunoId] = p.status;
          if (p.observacao) {
            const matchAula = p.observacao.match(/\[Aula: (.*?)\]/);
            const matchAluno = p.observacao.match(/\[Aluno: (.*?)\]/);
            if (matchAula) aulaNote = matchAula[1];
            if (matchAluno) newNotes[p.alunoId] = matchAluno[1];
            else if (!matchAula && !matchAluno) aulaNote = p.observacao;
          }
        });

        setMarkedPresencas(newMarked);
        setStudentNotes(newNotes);
        setObservacaoAula(aulaNote);
      } else {
        setIsEditMode(false);
        const initial: Record<string, 'Presente' | 'Ausente'> = {};
        alunosMatriculados.forEach(aluno => {
          initial[aluno.id] = 'Presente';
        });
        setMarkedPresencas(initial);
        setStudentNotes({});
        setObservacaoAula('');
      }
    }
  }, [selectedTurmaId, data, presencas, alunosMatriculados.length]);

  const handleTogglePresenca = (alunoId: string, status: 'Presente' | 'Ausente') => {
    setMarkedPresencas(prev => ({ ...prev, [alunoId]: status }));
  };

  const handleSave = () => {
    if (!selectedTurmaId) return;
    const selectedTurma = turmas.find(t => t.id === selectedTurmaId);
    
    const records: Presenca[] = Object.entries(markedPresencas).map(([alunoId, status]) => {
      const individualNote = studentNotes[alunoId]?.trim();
      const classNote = observacaoAula.trim();
      let finalNote = "";
      if (classNote && individualNote) finalNote = `[Aula: ${classNote}] | [Aluno: ${individualNote}]`;
      else if (classNote) finalNote = `[Aula: ${classNote}]`;
      else if (individualNote) finalNote = `[Aluno: ${individualNote}]`;

      return {
        id: Math.random().toString(36).substr(2, 9),
        alunoId,
        turmaId: selectedTurmaId,
        unidade: selectedTurma?.unidade || currentUser.unidade,
        data,
        status: status as 'Presente' | 'Ausente',
        observacao: finalNote || undefined
      };
    });
    
    onSave(records);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
    setBuscaAluno('');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 animate-in fade-in duration-500">
      {/* SEÇÃO DE FILTROS CASCATA */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          {/* FILTRO 1: UNIDADE */}
          <div className="md:col-span-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-500" /> 1. ESCOLHA A UNIDADE
            </label>
            <div className="relative group">
              <select 
                value={selectedUnidade}
                onChange={(e) => { 
                  setSelectedUnidade(e.target.value); 
                  setSelectedTurmaId(''); 
                }}
                className="w-full pl-6 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                {unidadesDisponiveis.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
            </div>
          </div>

          {/* FILTRO 2: TURMA (SÓ HABILITA APÓS UNIDADE) */}
          <div className="md:col-span-5">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-blue-500" /> 2. SELECIONE A TURMA
            </label>
            <div className="relative group">
              <select 
                value={selectedTurmaId}
                disabled={!selectedUnidade}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className={`w-full pl-6 pr-10 py-4 border-2 rounded-2xl outline-none transition-all font-bold appearance-none cursor-pointer ${
                  !selectedUnidade 
                  ? 'bg-slate-50 border-slate-50 text-slate-300' 
                  : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-blue-500'
                }`}
              >
                <option value="">{selectedUnidade ? 'Clique para escolher...' : 'Aguardando unidade...'}</option>
                {displayTurmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} ({t.horario})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
            </div>
          </div>

          {/* FILTRO 3: DATA */}
          <div className="md:col-span-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-blue-500" /> 3. DATA DA AULA
            </label>
            <input 
              type="date" 
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700"
            />
          </div>
        </div>

        {/* OBSERVAÇÃO PEDAGÓGICA (SÓ APARECE COM TURMA SELECIONADA) */}
        {selectedTurmaId && (
          <div className="animate-in fade-in zoom-in-95 duration-500 pt-4 border-t border-slate-50">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5 text-blue-500" /> RESUMO DO CONTEÚDO DA AULA
            </label>
            <textarea 
              value={observacaoAula}
              onChange={(e) => setObservacaoAula(e.target.value)}
              placeholder="Descreva o que foi trabalhado hoje com a turma..."
              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] focus:border-blue-500 outline-none transition-all font-medium min-h-[100px] resize-none shadow-inner"
            />
          </div>
        )}
      </div>

      {/* LISTAGEM DE ALUNOS PARA CHAMADA */}
      {selectedTurmaId && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-8 bg-[#0f172a] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-xl flex items-center gap-2">
                {isEditMode ? <RefreshCw className="w-5 h-5 text-blue-400" /> : <ClipboardList className="w-5 h-5 text-blue-400" />}
                {isEditMode ? 'EDITAR FREQUÊNCIA' : 'REALIZAR CHAMADA'}
              </h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                {isEditMode ? 'REGISTRO JÁ EXISTE NA PLANILHA' : 'LANÇAMENTO DE NOVO REGISTRO'}
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4">
               {/* BUSCA INTERNA DE ALUNO */}
               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    value={buscaAluno}
                    onChange={(e) => setBuscaAluno(e.target.value)}
                    placeholder="Filtrar aluno..."
                    className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-xs font-bold outline-none focus:bg-white/20 transition-all placeholder-slate-500"
                  />
               </div>
               <div className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-xl border border-blue-500 shadow-lg">
                 <UserCheck className="w-4 h-4 text-white" />
                 <span className="text-xs font-black uppercase">{alunosMatriculados.length} Alunos na Lista</span>
               </div>
            </div>
          </div>
          
          <div className="divide-y divide-slate-50">
            {alunosMatriculados.length > 0 ? alunosMatriculados.map((aluno) => (
              <div key={aluno.id} className="flex flex-col">
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl transition-all duration-300 shadow-sm ${
                      markedPresencas[aluno.id] === 'Presente' ? 'bg-blue-600 text-white' : 
                      markedPresencas[aluno.id] === 'Ausente' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {aluno.nome.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-800 text-xl leading-tight uppercase">{aluno.nome}</span>
                        <button 
                          onClick={() => setVisibleNotes(v => ({ ...v, [aluno.id]: !v[aluno.id] }))}
                          className={`p-2.5 rounded-xl border-2 transition-all active:scale-95 ${
                            studentNotes[aluno.id] 
                            ? 'bg-amber-100 border-amber-200 text-amber-600' 
                            : 'bg-white border-slate-100 text-slate-300 hover:text-blue-600 hover:border-blue-100'
                          }`}
                          title="Observação do Aluno"
                        >
                          <MessageSquarePlus className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">ESTUDANTE ATIVO</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleTogglePresenca(aluno.id, 'Presente')}
                      className={`flex-1 sm:flex-none px-8 py-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm ${
                        markedPresencas[aluno.id] === 'Presente' 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-blue-600/20' 
                        : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" /> PRESENTE
                    </button>
                    <button 
                      onClick={() => handleTogglePresenca(aluno.id, 'Ausente')}
                      className={`flex-1 sm:flex-none px-8 py-4 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm ${
                        markedPresencas[aluno.id] === 'Ausente' 
                        ? 'bg-red-500 border-red-500 text-white shadow-red-500/20' 
                        : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      <XCircle className="w-5 h-5" /> AUSENTE
                    </button>
                  </div>
                </div>

                {/* NOTA INDIVIDUAL DO ALUNO */}
                {(visibleNotes[aluno.id] || studentNotes[aluno.id]) && (
                  <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                    <div className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl">
                      <textarea
                        value={studentNotes[aluno.id] || ''}
                        onChange={(e) => setStudentNotes(n => ({ ...n, [aluno.id]: e.target.value }))}
                        placeholder={`Observação específica para ${aluno.nome.split(' ')[0]} hoje...`}
                        className="w-full bg-transparent outline-none text-sm font-medium text-amber-900 placeholder-amber-300 min-h-[60px] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <div className="py-24 text-center">
                 <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                 <h4 className="text-xl font-black text-slate-400 uppercase">Nenhum aluno encontrado</h4>
                 <p className="text-slate-300 text-xs font-bold uppercase mt-1">Ajuste o filtro de busca ou verifique a matrícula.</p>
              </div>
            )}
          </div>
          
          <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-center">
            <button 
              onClick={handleSave}
              className="w-full max-w-md py-6 rounded-3xl bg-[#0f172a] text-white font-black text-xl hover:bg-slate-800 shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
            >
              <Save className="w-7 h-7 text-blue-400 group-hover:scale-110 transition-transform" /> 
              {isEditMode ? 'ATUALIZAR CHAMADA' : 'SALVAR FREQUÊNCIA'}
            </button>
          </div>
        </div>
      )}

      {/* FEEDBACK DE SUCESSO */}
      {isSuccess && (
        <div className="fixed bottom-10 right-10 bg-blue-600 text-white px-10 py-6 rounded-3xl shadow-2xl flex items-center gap-5 animate-in slide-in-from-right-10 z-[100] border-2 border-blue-400">
          <CheckCircle2 className="w-8 h-8" />
          <div>
            <p className="font-black text-lg leading-tight uppercase">Sincronizado!</p>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">Dados salvos com sucesso na planilha.</p>
          </div>
        </div>
      )}

      {/* PLACEHOLDERS DE SELEÇÃO */}
      {!selectedTurmaId && (
        <div className="bg-slate-50 border-4 border-dashed border-slate-200 p-24 rounded-[60px] text-center space-y-4">
           <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="w-10 h-10 text-blue-200" />
           </div>
           <p className="text-slate-400 font-black text-xl uppercase tracking-tight">Aguardando Seleção</p>
           <p className="text-slate-300 font-bold text-sm uppercase tracking-widest">
             Defina a unidade e a turma nos filtros acima para iniciar.
           </p>
        </div>
      )}
    </div>
  );
};

export default Frequencia;
