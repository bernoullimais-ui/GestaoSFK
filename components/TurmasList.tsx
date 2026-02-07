
import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Clock, 
  User, 
  ArrowRight, 
  X, 
  Users, 
  Database, 
  Search, 
  AlertCircle, 
  Calendar,
  MapPin,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  MessageCircle,
  Phone
} from 'lucide-react';
import { Turma, Matricula, Aluno, Usuario } from '../types';

interface TurmasListProps {
  turmas: Turma[];
  matriculas: Matricula[];
  alunos: Aluno[];
  currentUser: Usuario;
}

const TurmasList: React.FC<TurmasListProps> = ({ turmas, matriculas, alunos, currentUser }) => {
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [selectedUnidade, setSelectedUnidade] = useState('');
  const [searchCurso, setSearchCurso] = useState('');

  const isProfessor = currentUser.nivel === 'Professor';
  
  const normalize = (text: string) => 
    String(text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const professorNameNormalized = normalize(currentUser.nome || currentUser.login);

  const unidadesDisponiveis = useMemo(() => {
    const sets = new Set(turmas.map(t => t.unidade?.trim()).filter(Boolean));
    return Array.from(sets).sort();
  }, [turmas]);

  const displayTurmas = useMemo(() => {
    let filtered = turmas.filter(t => t && t.nome);
    
    if (isProfessor) {
      filtered = filtered.filter(t => {
        const tProfNormalized = normalize(t.professor).replace(/^prof\.?\s*/i, '');
        return tProfNormalized.includes(professorNameNormalized) || professorNameNormalized.includes(tProfNormalized);
      });
    }

    if (selectedUnidade) {
      const unidadeBusca = normalize(selectedUnidade);
      filtered = filtered.filter(t => normalize(t.unidade) === unidadeBusca);
    }

    if (searchCurso.trim()) {
      const cursoBusca = normalize(searchCurso);
      filtered = filtered.filter(t => normalize(t.nome).includes(cursoBusca));
    }

    return filtered;
  }, [turmas, selectedUnidade, searchCurso, isProfessor, professorNameNormalized]);

  // Função robusta para encontrar alunos matriculados
  const getAlunosDaTurma = (turma: Turma) => {
    const tNome = normalize(turma.nome);
    const tUnidade = normalize(turma.unidade);

    // Filtra as matrículas que dão match com o NOME DO CURSO e UNIDADE
    // Isso é mais seguro que o ID exato, caso haja lixo no campo horário
    const idsAlunosMatriculados = matriculas
      .filter(m => {
        const mTurmaId = normalize(m.turmaId);
        const mUnidade = normalize(m.unidade);
        
        // Verifica se a unidade bate e se o nome da turma está contido no ID da matrícula
        return mUnidade === tUnidade && mTurmaId.includes(tNome);
      })
      .map(m => m.alunoId);

    // Retorna os alunos que possuem essas matrículas
    return alunos.filter(a => idsAlunosMatriculados.includes(a.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Catálogo de Turmas</h2>
          <p className="text-slate-500 text-sm">Gerencie horários e ocupação por unidade e curso.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="w-full md:w-1/3">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Filtrar por Unidade
            </label>
            <div className="relative group">
              <select 
                value={selectedUnidade}
                onChange={(e) => setSelectedUnidade(e.target.value)}
                className="w-full pl-6 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option value="">Todas as Unidades</option>
                {unidadesDisponiveis.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>

          <div className="w-full md:flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-indigo-500" /> Buscar por Curso
            </label>
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Ex: Ballet, Judô, Natação..."
                value={searchCurso}
                onChange={(e) => setSearchCurso(e.target.value)}
                className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayTurmas.length > 0 ? displayTurmas.map((turma, index) => {
          const alunosTurma = getAlunosDaTurma(turma);
          const matriculadosCount = alunosTurma.length;
          const capacidade = Number(turma.capacidade || 20);
          const taxaOcupacao = Math.round((matriculadosCount / capacidade) * 100);
          
          return (
            <div key={`${turma.id}-${index}`} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all group flex flex-col">
              <div className="p-6 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-fit mb-4">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{turma.unidade}</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors truncate">{turma.nome}</h3>
              </div>

              <div className="p-6 space-y-5 flex-1 flex flex-col">
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold truncate">{turma.professor}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold">{turma.horario}</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-700">{matriculadosCount} / {capacidade} ALUNOS</span>
                    <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700">{taxaOcupacao}% OCUPADO</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, taxaOcupacao)}%` }} />
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedTurma(turma)}
                  className="w-full mt-4 flex items-center justify-center gap-3 py-4 rounded-2xl bg-indigo-950 text-white font-black text-xs hover:bg-indigo-900 transition-all uppercase tracking-widest"
                >
                  Ver Lista de Alunos <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-full py-24 text-center">
            <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-slate-800">Nenhuma turma encontrada</h4>
          </div>
        )}
      </div>

      {selectedTurma && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-indigo-950 text-white relative">
              <button onClick={() => setSelectedTurma(null)} className="absolute top-8 right-8 p-2 bg-white/10 rounded-full">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-2xl font-black">{selectedTurma.nome}</h3>
              <p className="text-indigo-200 text-xs font-bold uppercase mt-1">{selectedTurma.unidade} • {selectedTurma.horario}</p>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
              {getAlunosDaTurma(selectedTurma).length > 0 ? (
                getAlunosDaTurma(selectedTurma).map(aluno => (
                  <div key={aluno.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black">{aluno.nome.charAt(0)}</div>
                      <div>
                        <p className="font-bold text-slate-800">{aluno.nome}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{aluno.statusMatricula || 'Ativo'}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-slate-400 italic font-bold">Nenhum aluno matriculado nesta turma.</div>
              )}
            </div>
            <div className="p-8 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setSelectedTurma(null)} className="bg-white border-2 px-8 py-3 rounded-2xl text-xs font-black text-slate-600 uppercase tracking-widest shadow-sm">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurmasList;
