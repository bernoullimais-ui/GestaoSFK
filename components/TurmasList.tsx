
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
  BookOpen,
  Users,
  Globe
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

  const isMaster = currentUser.nivel === 'Gestor Master' || currentUser.nivel === 'Start';
  const isProfessor = currentUser.nivel === 'Professor' || currentUser.nivel === 'Estagiário';
  
  const normalize = (text: string) => 
    String(text || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const professorNameNormalized = normalize(currentUser.nome || currentUser.login);

  const formatEscolaridade = (aluno: Aluno) => {
    const e = (aluno.etapa || '').toUpperCase();
    const a = (aluno.anoEscolar || '').toUpperCase();
    const t = (aluno.turmaEscolar || '').toUpperCase();
    let res = e.includes('INFANTIL') ? 'EI' : e.includes('FUNDAMENTAL') ? 'EF' : e.includes('MEDIO') ? 'EM' : e;
    if (a) res += `-${a}`;
    if (t && t !== 'NÃO SEI') res += ` ${t}`;
    return res || '--';
  };

  const formatDisplayDate = (dateVal: any) => {
    if (!dateVal || dateVal === "") return '--/--/--';
    // Formato esperado YYYY-MM-DD vindo do parseSheetDate no App.tsx
    const parts = String(dateVal).split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0].substring(2)}`;
    return dateVal;
  };

  const filteredTurmas = useMemo(() => {
    let result = [...turmas];
    
    // FILTRO DE ACESSO HIERÁRQUICO
    if (isMaster) {
      // Gestor Master ignora unidades e vê tudo.
    } else if (isProfessor) {
      result = result.filter(t => {
        const tProfNormalized = normalize(t.professor).replace(/^prof\.?\s*/i, '');
        return tProfNormalized.includes(professorNameNormalized) || professorNameNormalized.includes(tProfNormalized);
      });
    } else if (currentUser.unidade !== 'TODAS') {
      const userUnits = normalize(currentUser.unidade).split(',').map(u => u.trim()).filter(Boolean);
      result = result.filter(t => userUnits.some(u => normalize(t.unidade).includes(u) || u.includes(normalize(t.unidade))));
    }

    // Filtros Manuais da Interface
    if (selectedUnidade) {
       result = result.filter(t => normalize(t.unidade) === normalize(selectedUnidade));
    }
    
    if (searchCurso.trim()) {
       const b = normalize(searchCurso);
       result = result.filter(t => normalize(t.nome).includes(b) || normalize(t.professor).includes(b));
    }

    return result;
  }, [turmas, isMaster, isProfessor, professorNameNormalized, currentUser.unidade, selectedUnidade, searchCurso]);

  const unidadesDisponiveis = useMemo(() => {
    const list = isMaster ? turmas : filteredTurmas;
    const sets = new Set(list.map(t => t.unidade?.trim()).filter(Boolean));
    return Array.from(sets).sort();
  }, [turmas, filteredTurmas, isMaster]);

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
      
    return alunos.filter(a => idsAlunosMatriculados.includes(a.id)).sort((a, b) => a.nome.localeCompare(b.nome));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <GraduationCap className="w-8 h-8 text-indigo-600" /> Grade de Turmas
          </h2>
          <p className="text-slate-500 font-medium">Controle de ocupação e horários por modalidade.</p>
        </div>
        {isMaster && (
          <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-indigo-200">
            <Globe className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Visualização Global Master</span>
          </div>
        )}
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-72 relative">
          <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <select 
            value={selectedUnidade}
            onChange={(e) => setSelectedUnidade(e.target.value)}
            className="w-full pl-14 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm appearance-none cursor-pointer shadow-inner"
          >
            <option value="">Todas as Unidades</option>
            {unidadesDisponiveis.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text" 
            placeholder="Buscar por curso ou professor..." 
            value={searchCurso}
            onChange={(e) => setSearchCurso(e.target.value)}
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-500 outline-none font-bold text-sm transition-all shadow-inner"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTurmas.length > 0 ? filteredTurmas.map((turma, idx) => {
          const alunosNaTurma = getAlunosDaTurma(turma);
          const capacidade = turma.capacidade || 20;
          const pct = Math.round((alunosNaTurma.length / capacidade) * 100);
          const isFull = pct >= 100;

          return (
            <div key={`${turma.id}-${idx}`} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all group flex flex-col">
              <div className="p-8 pb-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isFull ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                    {isFull ? 'TURMA LOTADA' : 'VAGAS DISPONÍVEIS'}
                  </div>
                </div>

                <h3 className="text-2xl font-black text-slate-900 leading-tight mb-6 truncate">{turma.nome}</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-slate-500">
                    <Clock className="w-5 h-5 text-slate-300" />
                    <span className="text-sm font-bold">{turma.horario}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <User className="w-5 h-5 text-slate-300" />
                    <span className="text-sm font-bold truncate">{turma.professor}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <MapPin className="w-4 h-4 text-slate-300" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{turma.unidade}</span>
                  </div>
                </div>
              </div>

              <div className="px-8 pb-8 mt-auto">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{alunosNaTurma.length} MATRICULADOS</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{capacidade} VAGAS</span>
                 </div>
                 <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full transition-all duration-1000 ${isFull ? 'bg-red-500' : 'bg-indigo-600'}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                 </div>
              </div>

              <button 
                onClick={() => setSelectedTurma(turma)}
                className="w-full py-6 bg-slate-50 border-t border-slate-100 font-black text-[11px] text-slate-400 uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-center gap-3"
              >
                VER LISTA NOMINAL <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        }) : (
          <div className="col-span-full py-24 text-center">
             <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <h3 className="text-xl font-black text-slate-400 uppercase">Nenhuma turma localizada</h3>
             <p className="text-slate-300 text-sm font-medium mt-1">Ajuste os filtros ou a unidade no seu perfil.</p>
          </div>
        )}
      </div>

      {selectedTurma && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="p-10 bg-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-1">{selectedTurma.nome}</h3>
                  <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest">{selectedTurma.unidade} | {selectedTurma.horario}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTurma(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-10 max-h-[50vh] overflow-y-auto space-y-4">
               {getAlunosDaTurma(selectedTurma).map((aluno) => (
                 <div key={aluno.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group/item">
                   <div className="flex items-center gap-5">
                     <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center font-black text-indigo-600 group-hover/item:scale-110 transition-transform">{aluno.nome.charAt(0)}</div>
                     <div>
                        <span className="font-black text-slate-800 uppercase text-base block leading-none mb-1.5 tracking-tight">{aluno.nome}</span>
                        <div className="flex items-center gap-4">
                           <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                             <Calendar className="w-3.5 h-3.5 text-blue-400" /> {formatDisplayDate(aluno.dataNascimento)}
                           </span>
                           <span className="text-[9px] font-black text-indigo-400 uppercase flex items-center gap-1.5">
                             <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> {formatEscolaridade(aluno)}
                           </span>
                        </div>
                     </div>
                   </div>
                 </div>
               ))}
               {getAlunosDaTurma(selectedTurma).length === 0 && (
                 <div className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-bold text-sm uppercase">Nenhum aluno matriculado nesta turma.</p>
                 </div>
               )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-center">
              <button onClick={() => setSelectedTurma(null)} className="bg-indigo-950 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-900 transition-all shadow-lg active:scale-95">FECHAR LISTAGEM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurmasList;
