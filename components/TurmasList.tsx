
import React, { useState, useMemo } from 'react';
import { 
  GraduationCap, 
  Clock, 
  User, 
  ArrowRight, 
  X, 
  Search, 
  AlertCircle, 
  MapPin,
  ChevronDown,
  Calendar,
  BookOpen
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

  const isProfessor = currentUser.nivel === 'Professor' || currentUser.nivel === 'Estagiário';
  
  const normalize = (text: string) => 
    String(text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const professorNameNormalized = normalize(currentUser.nome || currentUser.login);
  const userUnitsPermitted = normalize(currentUser.unidade).split(',').map(u => u.trim());

  // Formatação de data robusta para nascimento
  const formatBirthDate = (dateVal: string | Date | undefined) => {
    if (!dateVal) return '--/--/--';
    try {
      const parts = String(dateVal).split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '--/--/--';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear());
      return `${day}/${month}/${year}`;
    } catch (e) { return '--/--/--'; }
  };

  const formatEscolaridade = (aluno: Aluno) => {
    const etapa = (aluno.etapa || '').toUpperCase().trim();
    const ano = (aluno.anoEscolar || '').trim();
    const turmaLetra = (aluno.turmaEscolar || '').trim();
    if (!etapa && !ano) return 'Não informado';
    
    let etapaSigla = etapa;
    if (etapa.includes('INFANTIL')) etapaSigla = 'EI';
    else if (etapa.includes('FUNDAMENTAL')) etapaSigla = 'EF';
    else if (etapa.includes('MEDIO')) etapaSigla = 'EM';

    return `${etapaSigla} ${ano} ${turmaLetra}`.trim().replace(/\s+/g, ' ');
  };

  const filteredTurmasByPermissions = useMemo(() => {
    let filtered = turmas.filter(t => t && t.nome);
    
    // 1. Filtro por Unidade do Usuário
    if (currentUser.unidade !== 'TODAS') {
      filtered = filtered.filter(t => userUnitsPermitted.some(u => normalize(t.unidade).includes(u) || u.includes(normalize(t.unidade))));
    }

    // 2. Filtro por Nome do Professor
    if (isProfessor) {
      filtered = filtered.filter(t => {
        const tProfNormalized = normalize(t.professor).replace(/^prof\.?\s*/i, '');
        return tProfNormalized.includes(professorNameNormalized) || professorNameNormalized.includes(tProfNormalized);
      });
    }

    return filtered;
  }, [turmas, isProfessor, professorNameNormalized, currentUser.unidade, userUnitsPermitted]);

  const unidadesDisponiveis = useMemo(() => {
    const sets = new Set(filteredTurmasByPermissions.map(t => t.unidade?.trim()).filter(Boolean));
    return Array.from(sets).sort();
  }, [filteredTurmasByPermissions]);

  const displayTurmas = useMemo(() => {
    let filtered = filteredTurmasByPermissions;

    if (selectedUnidade) {
      const unidadeBusca = normalize(selectedUnidade);
      filtered = filtered.filter(t => normalize(t.unidade) === unidadeBusca);
    }

    if (searchCurso.trim()) {
      const cursoBusca = normalize(searchCurso);
      filtered = filtered.filter(t => normalize(t.nome).includes(cursoBusca));
    }

    return filtered;
  }, [filteredTurmasByPermissions, selectedUnidade, searchCurso]);

  const getAlunosDaTurma = (turma: Turma) => {
    const tId = normalize(turma.id);
    const tNome = normalize(turma.nome);
    const tUnidade = normalize(turma.unidade);

    const idsAlunosMatriculados = matriculas
      .filter(m => {
        const mTurmaId = normalize(m.turmaId);
        const mUnidade = normalize(m.unidade);
        return mUnidade === tUnidade && (mTurmaId === tId || mTurmaId.includes(tNome) || tNome.includes(mTurmaId));
      })
      .map(m => m.alunoId);

    return alunos
      .filter(a => idsAlunosMatriculados.includes(a.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Catálogo de Turmas</h2>
          <p className="text-slate-500 font-medium">Gestão nominal de ocupação e horários das unidades.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row items-end gap-6">
          <div className="w-full md:w-1/3">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-500" /> Filtrar por Unidade
            </label>
            <div className="relative group">
              <select 
                value={selectedUnidade}
                onChange={(e) => setSelectedUnidade(e.target.value)}
                className="w-full pl-6 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option value="">Todas as Unidades</option>
                {unidadesDisponiveis.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
            </div>
          </div>

          <div className="w-full md:flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-blue-500" /> Buscar por Curso
            </label>
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Ex: Ballet, Judô, Natação..."
                value={searchCurso}
                onChange={(e) => setSearchCurso(e.target.value)}
                className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayTurmas.length > 0 ? displayTurmas.map((turma, index) => {
          const alunosTurma = getAlunosDaTurma(turma);
          const matriculadosCount = alunosTurma.length;
          const capacidade = Number(turma.capacidade || 20);
          const taxaOcupacao = Math.round((matriculadosCount / capacidade) * 100);
          const isFull = matriculadosCount >= capacidade;
          
          return (
            <div key={`${turma.id}-${index}`} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all group border-l-[6px] border-l-blue-500 flex flex-col relative">
              
              <div className="p-8 pb-4 flex items-start justify-between">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <GraduationCap className="w-7 h-7 text-blue-600" />
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isFull ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-500'}`}>
                  {isFull ? 'TURMA LOTADA' : 'VAGAS ABERTAS'}
                </div>
              </div>

              <div className="px-8 pb-6">
                <h3 className="text-2xl font-black text-slate-900 leading-tight mb-6 group-hover:text-blue-600 transition-colors truncate">{turma.nome}</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="w-8 h-8 flex items-center justify-center"><Clock className="w-5 h-5 text-slate-300" /></div>
                    <span className="text-sm font-bold">{turma.horario}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="w-8 h-8 flex items-center justify-center"><User className="w-5 h-5 text-slate-300" /></div>
                    <span className="text-sm font-bold truncate">{turma.professor}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <div className="w-8 h-8 flex items-center justify-center"><MapPin className="w-4 h-4 text-slate-300" /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">{turma.unidade}</span>
                  </div>
                </div>
              </div>

              <div className="px-8 mt-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{matriculadosCount} MATRICULADOS</span>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{capacidade} VAGAS</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${isFull ? 'bg-red-500' : 'bg-blue-600'}`} 
                      style={{ width: `${Math.min(100, taxaOcupacao)}%` }} 
                    />
                  </div>
                  <div className="flex items-center justify-between pb-8">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TAXA DE OCUPAÇÃO</span>
                    <span className={`text-[10px] font-black uppercase ${isFull ? 'text-red-500' : 'text-blue-600'}`}>{taxaOcupacao}%</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedTurma(turma)}
                className="w-full py-6 border-t border-slate-50 flex items-center justify-center gap-3 text-slate-700 hover:text-blue-600 transition-all font-black text-[11px] uppercase tracking-[0.1em] group/btn"
              >
                VER LISTA DE ALUNOS <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          );
        }) : (
          <div className="col-span-full py-32 text-center bg-white rounded-[40px] border-4 border-dashed border-slate-100">
            <AlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h4 className="text-xl font-black text-slate-400 uppercase tracking-tight">Nenhuma turma localizada</h4>
            <p className="text-slate-300 text-sm font-bold uppercase mt-1">Verifique os filtros de unidade e curso.</p>
          </div>
        )}
      </div>

      {selectedTurma && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 bg-[#0f172a] text-white relative">
              <button 
                onClick={() => setSelectedTurma(null)} 
                className="absolute top-10 right-10 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-black tracking-tight">{selectedTurma.nome}</h3>
                  <p className="text-blue-400 text-xs font-black uppercase tracking-widest mt-1">
                    {selectedTurma.unidade} • {selectedTurma.horario}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-10 max-h-[60vh] overflow-y-auto space-y-4 bg-slate-50/50">
              {getAlunosDaTurma(selectedTurma).length > 0 ? (
                getAlunosDaTurma(selectedTurma).map((aluno, idx) => (
                  <div key={aluno.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow gap-4 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shrink-0">
                        {aluno.nome.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 uppercase text-base truncate pr-2">{aluno.nome}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                           <div className="flex items-center gap-1.5 text-slate-400">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="text-[10px] font-bold uppercase tracking-wide">{formatEscolaridade(aluno)}</span>
                           </div>
                           <div className="flex items-center gap-1.5 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-[10px] font-bold uppercase tracking-wide">{formatBirthDate(aluno.dataNascimento)}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 shrink-0 w-fit">
                       <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Ativo</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-24 text-center">
                  <AlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-black uppercase tracking-tight italic">Nenhum aluno matriculado nesta turma.</p>
                </div>
              )}
            </div>
            
            <div className="p-10 bg-white border-t border-slate-50 flex items-center justify-between gap-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Total: {getAlunosDaTurma(selectedTurma).length} Estudantes
              </div>
              <button 
                onClick={() => setSelectedTurma(null)} 
                className="bg-[#0f172a] text-white px-10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95"
              >
                FECHAR LISTAGEM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurmasList;
