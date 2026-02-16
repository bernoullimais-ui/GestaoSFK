
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
  Users,
  Activity,
  CheckCircle2
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

  const filteredTurmas = useMemo(() => {
    let result = [...turmas];
    
    if (isMaster) {
      // Gestor Master vê tudo
    } else if (isProfessor) {
      result = result.filter(t => {
        const tProfNormalized = normalize(t.professor).replace(/^prof\.?\s*/i, '');
        return tProfNormalized.includes(professorNameNormalized) || professorNameNormalized.includes(tProfNormalized);
      });
    } else if (currentUser.unidade !== 'TODAS') {
      const userUnits = normalize(currentUser.unidade).split(',').map(u => u.trim()).filter(Boolean);
      result = result.filter(t => userUnits.some(u => normalize(t.unidade).includes(u) || u.includes(normalize(t.unidade))));
    }

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
      
    const uniqueIds = Array.from(new Set(idsAlunosMatriculados));
    return alunos.filter(a => uniqueIds.includes(a.id) && normalize(a.statusMatricula || 'ativo') === 'ativo');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Turmas e Matrículas</h2>
          <p className="text-slate-500 font-medium">Gestão de ocupação e listagem nominal por curso.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-blue-500" /> FILTRAR UNIDADE
          </label>
          <div className="relative group">
            <select 
              value={selectedUnidade}
              onChange={(e) => setSelectedUnidade(e.target.value)}
              className="w-full pl-6 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
            >
              <option value="">Todas as Unidades</option>
              {unidadesDisponiveis.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text" 
            placeholder="Buscar por Curso ou Professor..." 
            value={searchCurso}
            onChange={(e) => setSearchCurso(e.target.value)}
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTurmas.map((turma) => {
          const alunosNaTurma = getAlunosDaTurma(turma);
          const matriculadosCount = alunosNaTurma.length;
          const capacidade = Number(turma.capacidade) || 20;
          const ocupacaoPct = Math.min(100, Math.round((matriculadosCount / capacidade) * 100));
          
          return (
            <div key={turma.id} className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300">
              <div className="p-10 space-y-6 flex-1">
                <div className="flex justify-between items-start">
                  <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-8 h-8" />
                  </div>
                  <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100">
                    {turma.unidade}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight">{turma.nome}</h3>
                  <div className="flex items-center gap-2 text-slate-400 mt-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">{turma.horario}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Professor(a)</p>
                    <p className="text-sm font-black text-slate-700 uppercase">{turma.professor || '--'}</p>
                  </div>
                </div>

                {/* Bloco de Taxa de Ocupação Solicitado */}
                <div className="pt-6 space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-black uppercase tracking-tighter">{matriculadosCount} MATRICULADOS</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{capacidade} VAGAS</span>
                  </div>
                  
                  <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${ocupacaoPct >= 90 ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${ocupacaoPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TAXA DE OCUPAÇÃO</span>
                    <span className="text-sm font-black text-blue-600">{ocupacaoPct}%</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedTurma(turma)}
                className="w-full bg-slate-50 hover:bg-indigo-600 hover:text-white p-6 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all border-t border-slate-100"
              >
                VER LISTA NOMINAL <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {selectedTurma && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-[#0f172a] p-10 text-white flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">{selectedTurma.nome}</h3>
                <div className="flex items-center gap-4 mt-3">
                   <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{selectedTurma.unidade}</span>
                   </div>
                   <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{selectedTurma.horario}</span>
                   </div>
                </div>
              </div>
              <button onClick={() => setSelectedTurma(null)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getAlunosDaTurma(selectedTurma).length > 0 ? getAlunosDaTurma(selectedTurma).map((aluno, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4 group hover:border-indigo-200 transition-all">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm">{idx + 1}</div>
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase leading-none">{aluno.nome}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Estudante Ativo</p>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-20 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-widest">Nenhuma matrícula ativa nesta turma.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-10 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg shadow-indigo-600/20">
                   {getAlunosDaTurma(selectedTurma).length} Estudantes Ativos
                 </div>
                 <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Vagas: {selectedTurma.capacidade || 20}
                 </div>
               </div>
               <button onClick={() => setSelectedTurma(null)} className="font-black text-[11px] text-slate-400 uppercase hover:text-slate-600 transition-colors">Fechar Painel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurmasList;
