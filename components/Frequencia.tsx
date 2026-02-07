
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
  UserCheck
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

  const isProfessor = currentUser.nivel === 'Professor';
  const professorName = currentUser.nome || currentUser.login;

  const normalize = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

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

  const displayTurmas = useMemo(() => {
    if (!selectedUnidade) return [];
    const unidadeBusca = normalize(selectedUnidade);
    let filtered = turmas.filter(t => normalize(t.unidade) === unidadeBusca);
    const uniqueMap = new Map<string, Turma>();
    filtered.forEach(t => {
      if (!uniqueMap.has(t.id)) {
        uniqueMap.set(t.id, t);
      }
    });
    return Array.from(uniqueMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [turmas, selectedUnidade]);

  useEffect(() => {
    if (selectedTurmaId && !displayTurmas.find(t => t.id === selectedTurmaId)) {
      setSelectedTurmaId('');
    }
  }, [displayTurmas, selectedTurmaId]);

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
        
        // Match exato por ID
        if (mTurmaId === tId) return true;
        
        // Match flexível: Se o ID da matrícula na aba Base (Curso|Unidade|Horário) 
        // começar com o nome do curso e a unidade bater, aceitamos o aluno na turma.
        // Isso resolve o problema de alunos sem horário na base aparecerem em turmas com horário.
        return mUnidade === tUnidade && mTurmaId.startsWith(tNome);
      })
      .map(m => m.alunoId);

    const uniqueIds = Array.from(new Set(idsAlunosMatriculados));

    return alunos.filter(a => 
      uniqueIds.includes(a.id) && 
      (normalize(a.statusMatricula) === 'ativo' || !a.statusMatricula)
    ).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [selectedTurmaId, matriculas, alunos, turmas]);

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
  }, [selectedTurmaId, data, presencas, alunosMatriculados]);

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
    setSelectedTurmaId('');
    setObservacaoAula('');
    setStudentNotes({});
    setVisibleNotes({});
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          <div className="md:col-span-4">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" /> 1. ESCOLHA A UNIDADE
            </label>
            <div className="relative group">
              <select 
                value={selectedUnidade}
                onChange={(e) => { 
                  setSelectedUnidade(e.target.value); 
                  setSelectedTurmaId(''); 
                }}
                className="w-full pl-6 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option value="">Selecione...</option>
                {unidadesDisponiveis.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-5">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-500" /> 2. SELECIONE A TURMA
            </label>
            <div className="relative group">
              <select 
                value={selectedTurmaId}
                disabled={!selectedUnidade}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="w-full pl-6 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer disabled:opacity-40"
              >
                <option value="">{selectedUnidade ? 'Clique para escolher...' : 'Aguardando unidade...'}</option>
                {displayTurmas.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} ({t.horario})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="md:col-span-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" /> 3. DATA
            </label>
            <input 
              type="date" 
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-slate-700"
            />
          </div>
        </div>

        {selectedTurmaId && (
          <div className="animate-in fade-in zoom-in-95">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <ClipboardList className="w-3.5 h-3.5 text-indigo-500" /> Observação da Aula (Conteúdo Pedagógico)
            </label>
            <textarea 
              value={observacaoAula}
              onChange={(e) => setObservacaoAula(e.target.value)}
              placeholder="Descreva o que foi trabalhado hoje..."
              className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:border-indigo-500 outline-none transition-all font-medium min-h-[100px] resize-none shadow-inner"
            />
          </div>
        )}
      </div>

      {selectedTurmaId && alunosMatriculados.length > 0 ? (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-8 bg-indigo-950 text-white flex items-center justify-between">
            <div>
              <h3 className="font-black text-xl">{isEditMode ? 'Editar Frequência' : 'Realizar Chamada'}</h3>
              <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mt-1">Status: {isEditMode ? 'REGISTRO EXISTENTE' : 'TODOS PRESENTES POR PADRÃO'}</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl border border-white/10">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase">{alunosMatriculados.length} Alunos Ativos</span>
            </div>
          </div>
          
          <div className="divide-y divide-slate-50">
            {alunosMatriculados.map((aluno) => (
              <div key={aluno.id} className="flex flex-col">
                <div className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl transition-all duration-300 ${
                      markedPresencas[aluno.id] === 'Presente' ? 'bg-indigo-600 text-white shadow-lg' : 
                      markedPresencas[aluno.id] === 'Ausente' ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {aluno.nome.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-800 text-xl leading-tight">{aluno.nome}</span>
                        <button 
                          onClick={() => setVisibleNotes(v => ({ ...v, [aluno.id]: !v[aluno.id] }))}
                          className={`p-2 rounded-xl border-2 transition-all ${
                            studentNotes[aluno.id] 
                            ? 'bg-amber-100 border-amber-200 text-amber-600' 
                            : 'bg-white border-slate-100 text-slate-300 hover:text-indigo-600 hover:border-indigo-100'
                          }`}
                          title="Observação do Aluno"
                        >
                          <MessageSquarePlus className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase mt-1">MATRÍCULA ATIVA</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleTogglePresenca(aluno.id, 'Presente')}
                      className={`px-6 py-4 rounded-2xl border-2 font-black text-xs flex items-center gap-2 transition-all ${
                        markedPresencas[aluno.id] === 'Presente' 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" /> PRESENTE
                    </button>
                    <button 
                      onClick={() => handleTogglePresenca(aluno.id, 'Ausente')}
                      className={`px-6 py-4 rounded-2xl border-2 font-black text-xs flex items-center gap-2 transition-all ${
                        markedPresencas[aluno.id] === 'Ausente' 
                        ? 'bg-red-500 border-red-500 text-white shadow-md' 
                        : 'bg-white border-slate-100 text-slate-300'
                      }`}
                    >
                      <XCircle className="w-5 h-5" /> AUSENTE
                    </button>
                  </div>
                </div>

                {(visibleNotes[aluno.id] || studentNotes[aluno.id]) && (
                  <div className="px-6 pb-6 animate-in slide-in-from-top-2">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                      <textarea
                        value={studentNotes[aluno.id] || ''}
                        onChange={(e) => setStudentNotes(n => ({ ...n, [aluno.id]: e.target.value }))}
                        placeholder={`Observação para ${aluno.nome.split(' ')[0]}...`}
                        className="w-full bg-transparent outline-none text-sm font-medium text-amber-900 placeholder-amber-300 min-h-[60px] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="p-10 bg-slate-50 border-t flex justify-center">
            <button 
              onClick={handleSave}
              className="w-full max-w-md py-6 rounded-3xl bg-indigo-950 text-white font-black text-xl hover:bg-indigo-900 shadow-2xl shadow-indigo-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-4"
            >
              <Save className="w-7 h-7" /> {isEditMode ? 'ATUALIZAR CHAMADA' : 'SALVAR FREQUÊNCIA'}
            </button>
          </div>
        </div>
      ) : selectedTurmaId ? (
        <div className="bg-white p-20 rounded-[40px] shadow-sm border border-slate-100 text-center animate-in zoom-in-95">
           <AlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-6" />
           <h3 className="text-2xl font-black text-slate-800">Sem alunos ativos</h3>
           <p className="text-slate-500 font-medium mt-2">Não encontramos matrículas ativas para esta turma na base de dados.</p>
           <p className="text-slate-400 text-[10px] font-bold uppercase mt-4">Verifique se o aluno está com status 'Ativo' na aba Base.</p>
        </div>
      ) : (
        <div className="bg-indigo-50/50 border-2 border-dashed border-indigo-200 p-24 rounded-[40px] text-center">
           <GraduationCap className="w-16 h-16 text-indigo-200 mx-auto mb-6" />
           <p className="text-indigo-600 font-black text-xl">Selecione uma Unidade e Turma para iniciar a chamada.</p>
        </div>
      )}

      {isSuccess && (
        <div className="fixed bottom-10 right-10 bg-emerald-500 text-white px-10 py-6 rounded-3xl shadow-2xl flex items-center gap-5 animate-in slide-in-from-right-10 z-[100]">
          <CheckCircle2 className="w-8 h-8" />
          <p className="font-black text-lg">Dados sincronizados com a planilha!</p>
        </div>
      )}
    </div>
  );
};

export default Frequencia;
