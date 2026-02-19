
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Search, 
  BookOpen, 
  Clock, 
  Lock, 
  ChevronDown, 
  AlertCircle, 
  ClipboardCheck,
  UserCheck,
  GraduationCap
} from 'lucide-react';
import { Aluno, Turma, Matricula, Usuario } from '../types';

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

interface PreparacaoTurmasProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  currentUser: Usuario;
}

const PreparacaoTurmas: React.FC<PreparacaoTurmasProps> = ({ alunos, turmas, matriculas, currentUser }) => {
  const normalize = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const normalizeStrict = (t: string) => 
    normalize(t).replace(/[\s-]/g, '');

  const isMaster = currentUser.nivel === 'Gestor Master' || currentUser.nivel === 'Start' || normalize(currentUser.unidade) === 'todas';
  const isProfessor = currentUser.nivel === 'Professor' || currentUser.nivel === 'Estagiário';
  const isRegente = currentUser.nivel === 'Regente';
  const profNameNorm = normalize(currentUser.nome || currentUser.login);
  
  const userUnits = useMemo(() => 
    normalize(currentUser.unidade).split(',').map(u => u.trim()).filter(Boolean), 
    [currentUser.unidade]
  );

  // Turmas permitidas para o usuário (por Professor ou por Unidade)
  const myTurmasIds = useMemo(() => {
    if (isMaster) return new Set(turmas.map(t => t.id));
    
    return new Set(turmas.filter(t => {
      const tUnitNorm = normalize(t.unidade);
      const hasUnitAccess = userUnits.some(u => tUnitNorm.includes(u) || u.includes(tUnitNorm));
      
      if (isProfessor) {
        const tProf = normalize(t.professor).replace(/^prof\.?\s*/i, '');
        const profMatch = tProf.includes(profNameNorm) || profNameNorm.includes(tProf);
        return profMatch && hasUnitAccess;
      }
      
      // Gestor / Coordenador / Regente
      return hasUnitAccess;
    }).map(t => t.id));
  }, [turmas, profNameNorm, isMaster, isProfessor, userUnits]);

  const idHoje = useMemo(() => {
    const d = new Date().getDay();
    if (d === 0 || d === 6) return 'seg';
    const map: Record<number, string> = { 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex' };
    return map[d] || 'seg';
  }, []);

  const formatEscolaridade = (aluno: Aluno) => {
    const etapa = (aluno.etapa || '').trim();
    const turmaEsc = (aluno.turmaEscolar || '').trim();
    if (!etapa) return "";
    
    let e = etapa.toUpperCase();
    if (e === 'EDUCACAO INFANTIL') e = 'EI';
    else if (e === 'ENSINO FUNDAMENTAL') e = 'EF';
    else if (e === 'ENSINO MEDIO') e = 'EM';
    
    const hasTurma = turmaEsc && normalize(turmaEsc) !== 'nao sei' && normalize(turmaEsc) !== 'não sei' && turmaEsc !== '';
    return hasTurma ? `${e} ${turmaEsc}` : e;
  };

  const getSchoolWeight = (sigla: string) => {
    const s = normalize(sigla);
    if (s.includes('ei')) {
      if (s.includes('g2')) return 10;
      if (s.includes('g3')) return 20;
      if (s.includes('g4')) return 30;
      if (s.includes('g5')) return 40;
      return 50;
    }
    if (s.includes('ef')) {
      const numMatch = s.match(/(\d+)/);
      if (numMatch) return 100 + parseInt(numMatch[1]);
      return 199;
    }
    if (s.includes('em')) {
      const numMatch = s.match(/(\d+)/);
      if (numMatch) return 300 + parseInt(numMatch[1]);
      return 399;
    }
    return 1000;
  };

  // Siglas vinculadas aos alunos permitidos
  const siglasExistentes = useMemo(() => {
    const set = new Set<string>();
    const userNameStrict = normalizeStrict(currentUser.nome || '');

    alunos.forEach(aluno => {
      if (normalize(aluno.statusMatricula) === 'cancelado') return;
      
      // Restrição de Unidade para não-Master
      if (!isMaster) {
        const studentUnitNorm = normalize(aluno.unidade);
        const hasUnitAccess = userUnits.some(u => studentUnitNorm.includes(u) || u.includes(studentUnitNorm));
        if (!hasUnitAccess) return;
      }

      // Restrição de Professor (deve estar matriculado em uma turma do professor)
      if (isProfessor) {
        const isMeuAluno = matriculas.some(m => m.alunoId === aluno.id && myTurmasIds.has(m.turmaId));
        if (!isMeuAluno) return;
      }

      const sigla = formatEscolaridade(aluno);
      if (sigla) {
        if (isRegente) {
          if (normalizeStrict(sigla) === userNameStrict) set.add(sigla);
        } else {
          set.add(sigla);
        }
      }
    });

    return Array.from(set).sort((a, b) => {
      const weightA = getSchoolWeight(a);
      const weightB = getSchoolWeight(b);
      if (weightA !== weightB) return weightA - weightB;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [alunos, matriculas, myTurmasIds, isProfessor, isRegente, isMaster, userUnits, currentUser.nome]);

  const [filtroSigla, setFiltroSigla] = useState('');
  const [filtroDia, setFiltroDia] = useState(idHoje);

  useEffect(() => {
    if (isRegente && siglasExistentes.length > 0) {
      setFiltroSigla(siglasExistentes[0]);
    }
  }, [isRegente, siglasExistentes]);

  const studentsToPrepare = useMemo(() => {
    const daySynonyms: Record<string, string[]> = {
      'seg': ['seg', '2a', '2ª', 'segunda'],
      'ter': ['ter', '3a', '3ª', 'terça'],
      'qua': ['qua', '4a', '4ª', 'quarta'],
      'qui': ['qui', '5a', '5ª', 'quinta'],
      'sex': ['sex', '6a', '6ª', 'sexta']
    };

    const targetSynonyms = daySynonyms[filtroDia] || [filtroDia];

    return alunos.filter(a => {
      if (normalize(a.statusMatricula) === 'cancelado') return false;
      
      // Restrição de Unidade para não-Master (Gestores, etc)
      if (!isMaster) {
        const studentUnitNorm = normalize(a.unidade);
        const hasUnitAccess = userUnits.some(u => studentUnitNorm.includes(u) || u.includes(studentUnitNorm));
        if (!hasUnitAccess) return false;
      }

      // Regra do Professor
      if (isProfessor) {
        const isMeuAluno = matriculas.some(m => m.alunoId === a.id && myTurmasIds.has(m.turmaId));
        if (!isMeuAluno) return false;
      }

      const siglaAluno = formatEscolaridade(a);
      if (filtroSigla && normalizeStrict(siglaAluno) !== normalizeStrict(filtroSigla)) return false;
      
      // Verificar se tem aula no dia selecionado nas turmas acessíveis
      const mats = matriculas.filter(m => m.alunoId === a.id && myTurmasIds.has(m.turmaId));
      const aulasDoDia = mats.some(m => {
        const t = turmas.find(turma => turma.id === m.turmaId || normalize(m.turmaId).includes(normalize(turma.nome)));
        if (!t) return false;
        const horarioNorm = normalize(t.horario);
        return targetSynonyms.some(syn => horarioNorm.includes(syn));
      });

      return aulasDoDia;
    }).map(a => {
      const mats = matriculas.filter(m => m.alunoId === a.id && myTurmasIds.has(m.turmaId));
      const classes = mats.map(m => turmas.find(t => t.id === m.turmaId || normalize(m.turmaId).includes(normalize(t.nome))))
        .filter(t => t && targetSynonyms.some(syn => normalize(t.horario).includes(syn))) as Turma[];

      return { aluno: a, sigla: formatEscolaridade(a), turmas: classes.sort((x, y) => x.horario.localeCompare(y.horario)) };
    }).sort((x, y) => {
      const weightX = getSchoolWeight(x.sigla);
      const weightY = getSchoolWeight(y.sigla);
      if (weightX !== weightY) return weightX - weightY;
      return x.aluno.nome.localeCompare(y.aluno.nome);
    });
  }, [alunos, matriculas, turmas, filtroSigla, filtroDia, isProfessor, isMaster, userUnits, myTurmasIds]);

  const diasSemana = [
    { id: 'seg', label: 'Segunda-feira' },
    { id: 'ter', label: 'Terça-feira' },
    { id: 'qua', label: 'Quarta-feira' },
    { id: 'qui', label: 'Quinta-feira' },
    { id: 'sex', label: 'Sexta-feira' }
  ];

  const labelDiaAtivo = diasSemana.find(d => d.id === filtroDia)?.label || 'Hoje';

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto p-4 md:p-0">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Preparação</h2>
          <p className="text-slate-500 font-medium text-[10px] md:text-sm">
            {isProfessor ? 'Minha listagem para saída escolar.' : `Estudantes - ${isMaster ? 'Gestão Global' : currentUser.unidade}`}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 md:p-10 rounded-[24px] md:rounded-[40px] shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-10">
          <div>
            <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase mb-2 md:mb-4 ml-1 tracking-widest">
              SIGLA ESCOLAR / ESCOLARIDADE
            </label>
            <div className="relative group">
              <BookOpen className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-indigo-500" />
              <select 
                value={filtroSigla}
                onChange={(e) => setFiltroSigla(e.target.value)}
                disabled={isRegente}
                className={`w-full pl-10 md:pl-14 pr-8 md:pr-12 py-3 md:py-5 border-2 rounded-xl md:rounded-3xl outline-none transition-all font-black text-xs md:text-sm appearance-none cursor-pointer ${
                  isRegente ? 'bg-slate-50 border-slate-50 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-indigo-600'
                } ${filtroSigla ? 'border-indigo-600 ring-2 md:ring-4 ring-indigo-50' : ''}`}
              >
                {!isRegente && <option value="">🌟 TODAS AS MINHAS SIGLAS</option>}
                {siglasExistentes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {!isRegente && <ChevronDown className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />}
              {isRegente && <Lock className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-3 md:w-4 h-3 md:h-4 text-slate-300" />}
            </div>
          </div>

          <div>
            <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase mb-2 md:mb-4 ml-1 tracking-widest">
              DIA DA SEMANA
            </label>
            <div className="relative group">
              <Calendar className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-indigo-400" />
              <select 
                value={filtroDia}
                onChange={(e) => setFiltroDia(e.target.value)}
                className="w-full pl-10 md:pl-14 pr-8 md:pr-12 py-3 md:py-5 bg-slate-50 border-2 border-slate-100 rounded-xl md:rounded-2xl focus:border-indigo-600 outline-none transition-all font-black text-xs md:text-sm appearance-none cursor-pointer text-slate-700"
              >
                {diasSemana.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[24px] md:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-[300px] flex flex-col">
        <div className="px-6 py-4 md:px-10 md:py-8 bg-[#0f172a] text-white flex items-center justify-between">
          <div>
            <h3 className="text-sm md:text-xl font-black uppercase tracking-tight leading-none mb-1 md:mb-2">Estudantes</h3>
            <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">
              {labelDiaAtivo}
            </p>
          </div>
          <div className="bg-indigo-600 px-3 py-1.5 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl border border-indigo-500 shadow-lg flex items-center gap-2">
             <span className="text-[10px] md:text-xs font-black uppercase">{studentsToPrepare.length} Alunos</span>
          </div>
        </div>

        <div className="flex-1">
          {studentsToPrepare.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {studentsToPrepare.map((item, idx) => (
                <div key={idx} className="px-6 py-4 md:px-10 md:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <h4 className="text-sm md:text-xl font-black text-slate-800 uppercase tracking-tight leading-tight truncate">{item.aluno.nome}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                       <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-tighter">
                         {item.sigla || 'S/S'}
                       </span>
                       <span className={`text-[8px] md:text-[9px] font-black uppercase px-2 py-0.5 rounded border shadow-sm ${getUnidadeStyle(item.aluno.unidade)}`}>
                         {item.aluno.unidade}
                       </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.turmas.map((t: Turma, tIdx: number) => (
                      <div key={tIdx} className="bg-emerald-50 border border-emerald-100 px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-3">
                        <div className="w-1.5 md:w-2.5 h-1.5 md:h-2.5 rounded-full bg-emerald-500" />
                        <div className="flex flex-col">
                          <span className="text-[10px] md:text-sm font-black text-emerald-900 uppercase leading-none mb-0.5 md:mb-1">{t.nome}</span>
                          <span className="text-[7px] md:text-[9px] font-black text-emerald-600/70 uppercase tracking-widest leading-none">{t.horario}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 md:py-40 text-center flex flex-col items-center justify-center space-y-4 md:space-y-6">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-[32px] md:rounded-[40px] flex items-center justify-center shadow-inner">
                <AlertCircle className="w-8 h-8 md:w-10 md:h-10 text-slate-200" />
              </div>
              <div className="max-w-md mx-auto px-4">
                <h4 className="text-base md:text-2xl font-black text-slate-300 uppercase tracking-tighter mb-1 md:mb-2">Nenhum estudante localizado</h4>
                <p className="text-slate-300 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-center">
                  Não localizamos aulas para este dia e sigla selecionados.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreparacaoTurmas;
