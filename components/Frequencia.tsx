
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
  RefreshCw
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

  const displayTurmas = useMemo(() => {
    if (!isProfessor) return turmas;
    return turmas.filter(t => t.professor === professorName);
  }, [turmas, isProfessor, professorName]);

  const alunosMatriculados = useMemo(() => {
    if (!selectedTurmaId) return [];
    const idsMatriculados = matriculas
      .filter(m => m.turmaId === selectedTurmaId)
      .map(m => m.alunoId);
    return alunos.filter(a => idsMatriculados.includes(a.id));
  }, [selectedTurmaId, matriculas, alunos]);

  useEffect(() => {
    if (selectedTurmaId && data) {
      const chamadasExistentes = presencas.filter(p => p.turmaId === selectedTurmaId && p.data === data);
      
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
            
            if (!matchAula && !matchAluno && p.observacao) {
               newNotes[p.alunoId] = p.observacao;
            }
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

  const toggleNoteVisibility = (alunoId: string) => {
    setVisibleNotes(prev => ({ ...prev, [alunoId]: !prev[alunoId] }));
  };

  const handleStudentNoteChange = (alunoId: string, note: string) => {
    setStudentNotes(prev => ({ ...prev, [alunoId]: note }));
  };

  const handleSave = () => {
    const records: Presenca[] = Object.entries(markedPresencas).map(([alunoId, status]) => {
      const individualNote = studentNotes[alunoId]?.trim();
      const classNote = observacaoAula.trim();
      
      let finalNote = "";
      if (classNote && individualNote) {
        finalNote = `[Aula: ${classNote}] | [Aluno: ${individualNote}]`;
      } else if (classNote) {
        finalNote = `[Aula: ${classNote}]`;
      } else if (individualNote) {
        finalNote = `[Aluno: ${individualNote}]`;
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        alunoId,
        turmaId: selectedTurmaId,
        data,
        status: status as 'Presente' | 'Ausente',
        observacao: finalNote || undefined
      };
    });
    
    if (records.length === 0) return;

    onSave(records);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 3000);
    
    setMarkedPresencas({});
    setSelectedTurmaId('');
    setObservacaoAula('');
    setStudentNotes({});
    setVisibleNotes({});
    setIsEditMode(false);
  };

  const allMarked = selectedTurmaId && alunosMatriculados.length > 0 && 
                    alunosMatriculados.every(a => markedPresencas[a.id]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider ml-1">Turma Selecionada</label>
            <select 
              value={selectedTurmaId}
              onChange={(e) => setSelectedTurmaId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
            >
              <option value="">Escolha uma turma...</option>
              {displayTurmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome} - {t.horario} ({t.professor})</option>
              ))}
            </select>
          </div>
          <div className="md:w-1/3">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider ml-1">Data da Chamada</label>
            <div className="relative">
              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="date" 
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
              />
            </div>
          </div>
        </div>

        {selectedTurmaId && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-wider ml-1">Observações Gerais da Aula (Conteúdo)</label>
            <div className="relative">
              <MessageSquareQuote className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
              <textarea 
                value={observacaoAula}
                onChange={(e) => setObservacaoAula(e.target.value)}
                placeholder="Ex: Treino de quedas, revision de fundamentos..."
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-medium min-h-[80px] resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {isEditMode && selectedTurmaId && (
        <div className="bg-blue-600 p-4 rounded-2xl text-white flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 shadow-lg shadow-blue-500/20">
          <History className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-black text-sm uppercase tracking-wider">Modo de Edição Ativo</p>
            <p className="text-xs text-blue-100 font-medium">Já existe uma frequência salva para este dia. Suas alterações atualizarão o registro atual.</p>
          </div>
        </div>
      )}

      {selectedTurmaId && alunosMatriculados.length > 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{isEditMode ? 'Editar Chamada' : 'Nova Chamada'}</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{alunosMatriculados.length} Alunos na Lista</p>
            </div>
            {!isEditMode && (
              <div className="text-[10px] font-black uppercase text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                Presença Padrão Ativa
              </div>
            )}
          </div>
          
          <div className="divide-y divide-slate-50">
            {alunosMatriculados.map((aluno) => (
              <div key={aluno.id} className="flex flex-col">
                <div className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all duration-300 ${
                      markedPresencas[aluno.id] === 'Presente' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 
                      markedPresencas[aluno.id] === 'Ausente' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {aluno.nome.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-lg leading-tight">{aluno.nome}</span>
                        <button 
                          onClick={() => toggleNoteVisibility(aluno.id)}
                          title="Adicionar Observação Individual"
                          className={`p-1.5 rounded-lg transition-all ${
                            studentNotes[aluno.id] 
                            ? 'bg-amber-100 text-amber-600 border border-amber-200' 
                            : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50'
                          }`}
                        >
                          {studentNotes[aluno.id] ? <MessageSquareText className="w-4 h-4" /> : <MessageSquarePlus className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        markedPresencas[aluno.id] === 'Presente' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {markedPresencas[aluno.id] || 'Pendente'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleTogglePresenca(aluno.id, 'Presente')}
                      className={`p-3 rounded-2xl border-2 transition-all ${
                        markedPresencas[aluno.id] === 'Presente' 
                        ? 'bg-green-500 border-green-500 text-white shadow-md' 
                        : 'border-slate-100 text-slate-300 hover:border-green-200'
                      }`}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </button>
                    <button 
                      onClick={() => handleTogglePresenca(aluno.id, 'Ausente')}
                      className={`p-3 rounded-2xl border-2 transition-all ${
                        markedPresencas[aluno.id] === 'Ausente' 
                        ? 'bg-red-500 border-red-500 text-white shadow-md' 
                        : 'border-slate-100 text-slate-300 hover:border-red-200'
                      }`}
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {(visibleNotes[aluno.id] || studentNotes[aluno.id]) && (
                  <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-2xl flex items-start gap-3">
                      <div className="p-1.5 bg-white rounded-lg shadow-sm">
                        <MessageSquarePlus className="w-4 h-4 text-amber-500" />
                      </div>
                      <textarea
                        value={studentNotes[aluno.id] || ''}
                        onChange={(e) => handleStudentNoteChange(aluno.id, e.target.value)}
                        placeholder={`Observação específica para ${aluno.nome.split(' ')[0]}...`}
                        className="flex-1 bg-transparent outline-none text-sm font-medium text-amber-900 placeholder-amber-300 min-h-[60px] resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="p-8 bg-slate-50 border-t border-slate-100">
            <button 
              disabled={!allMarked}
              onClick={handleSave}
              className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-lg transition-all ${
                allMarked 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-500/20' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isEditMode ? <RefreshCw className="w-6 h-6" /> : <Save className="w-6 h-6" />}
              {isEditMode ? 'Atualizar Frequência B+' : 'Enviar Frequência B+'}
            </button>
          </div>
        </div>
      ) : selectedTurmaId ? (
        <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center space-y-4">
          <div className="inline-block p-4 bg-slate-50 rounded-2xl">
            <AlertCircle className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-800">Sem alunos nesta turma</h3>
          <p className="text-slate-500 max-w-sm mx-auto font-medium">Cadastre matrículas na aba de Alunos para iniciar a frequência.</p>
        </div>
      ) : (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 p-12 rounded-3xl text-center">
          <p className="text-blue-600 font-bold text-lg">Selecione uma turma e data para carregar a lista de presença.</p>
        </div>
      )}

      {isSuccess && (
        <div className="fixed bottom-8 right-8 bg-green-500 text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 z-50">
          <CheckCircle2 className="w-7 h-7" />
          <p className="font-black text-lg">{isEditMode ? 'Registro atualizado com sucesso!' : 'Chamada salva com sucesso!'}</p>
        </div>
      )}
    </div>
  );
};

export default Frequencia;
