
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
  CheckCircle2,
  Calendar,
  BookOpen
} from 'lucide-react';
import { Turma, Matricula, Aluno, Usuario } from '../types';

// Função padronizada para cores por unidade conforme identidade visual SFK
const getUnidadeStyle = (unidade: string) => {
  const u = String(unidade || '').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (u.includes('AKA')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (u.includes('BUNNY')) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (u.includes('LICEU')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (u.includes('PEDRINHO')) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (u.includes('OFICINA')) return 'bg-rose-100 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

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
  
  const normalize = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const professorNameNormalized = normalize(currentUser.nome || currentUser.login);

  const parseDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return null;
    try {
      let s = String(dateVal).trim().toLowerCase();
      const ptMonths: Record<string, number> = {
        jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
        jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11
      };
      const ptMatch = s.match(/(\d{1,2})\s+de\s+([a-z]{3})[^\s]*\s+de\s+(\d{4})/);
      if (ptMatch) return new Date(parseInt(ptMatch[3]), ptMonths[ptMatch[2]] || 0, parseInt(ptMatch[1]));
      const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dmy) return new Date(parseInt(dmy[3]) < 100 ? 2000 + parseInt(dmy[3]) : parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
      const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (iso) return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
  };

  const formatBirthDate = (dateVal: any) => {
    const date = parseDate(dateVal);
    if (!date) return '--/--/--';
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).substring(2)}`;
  };

  const formatEscolaridade = (aluno: Aluno) => {
    const e = (aluno.etapa || '').toUpperCase();
    const t = (aluno.turmaEscolar || '').toUpperCase();
    let res = e.includes('INFANTIL') ? 'EI' : e.includes('FUNDAMENTAL') ? 'EF' : e.includes('MEDIO') ? 'EM' : e;
    if (t && t !== 'NÃO SEI' && t !== '' && t !== 'NAO SEI') res += ` ${t}`;
    return res || '--';
  };

  const filteredTurmas = useMemo(() => {
    let result = [...turmas];
    
    if (!isMaster) {
      if (isProfessor) {
        result = result.filter(t => {
          const tProfNormalized = normalize(t.professor).replace(/^prof\.?\s*/i, '');
          return tProfNormalized.includes(professorNameNormalized) || professorNameNormalized.includes(tProfNormalized);
        });
      } else if (currentUser.unidade !== 'TODAS') {
        const userUnits = normalize(currentUser.unidade).split(',').map(u => u.trim()).filter(Boolean);
        result = result.filter(t => userUnits.some(u => normalize(t.unidade).includes(u) || u.includes(normalize(t.unidade))));
      }
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
        const mCursoNome = mTurmaId.split('-')[0].trim();
        
        const unitMatch = mUnidade === tUnidade || mUnidade === "";
        const nameMatch = mTurmaId === tId || mCursoNome === tNome || mTurmaId.startsWith(tNome + "-");
        
        return unitMatch && nameMatch;
      })
      .map(m => m.alunoId);
      
    const uniqueIds = Array.from(new Set(idsAlunosMatriculados));
    return alunos
      .filter(a => uniqueIds.includes(a.id) && normalize(a.statusMatricula) === 'ativo')
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight">Turmas e Matrículas</h2>
          <p className="text-slate-500 font-medium text-sm">Gestão de ocupação e listagem nominal por curso.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest">
            <MapPin className="w-3.5 h-3.5 text-blue-500 inline mr-1" /> FILTRAR UNIDADE
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
            className="w-full pl-14 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:border-blue-500 transition-all text-slate-700"
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
                  {/* Aplicação do selo colorido dinâmico por unidade */}
                  <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${getUnidadeStyle(turma.unidade)}`}>
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
          <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-[#0f172a] text-white flex items-center justify-between">
               <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Lista Nominal</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">
                    {selectedTurma.nome} • {selectedTurma.unidade}
                  </p>
               </div>
               <button onClick={() => setSelectedTurma(null)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">
                  <X className="w-6 h-6" />
               </button>
            </div>
            <div className="p-8 space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
               {getAlunosDaTurma(selectedTurma).length > 0 ? getAlunosDaTurma(selectedTurma).map((aluno, idx) => (
                  <div key={aluno.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 uppercase leading-none truncate">{aluno.nome}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-100 shadow-sm">
                        <BookOpen className="w-3 h-3 text-purple-600" />
                        <span className="text-[9px] font-black text-purple-700 uppercase tracking-widest leading-none">
                          {formatEscolaridade(aluno)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 shadow-sm">
                        <Calendar className="w-3 h-3 text-blue-500" />
                        <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest leading-none">
                          {formatBirthDate(aluno.dataNascimento)}
                        </span>
                      </div>
                    </div>
                  </div>
               )) : (
                  <div className="py-20 text-center flex flex-col items-center gap-4">
                     <AlertCircle className="w-12 h-12 text-slate-200" />
                     <p className="text-slate-400 font-black uppercase text-xs">Nenhum aluno matriculado nesta turma.</p>
                  </div>
               )}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
               <button onClick={() => setSelectedTurma(null)} className="px-10 py-4 bg-indigo-950 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-900 transition-all shadow-xl">
                  FECHAR LISTA
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurmasList;
