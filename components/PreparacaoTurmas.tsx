
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

interface PreparacaoTurmasProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  currentUser: Usuario;
}

const PreparacaoTurmas: React.FC<PreparacaoTurmasProps> = ({ alunos, turmas, matriculas, currentUser }) => {
  const normalize = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  // Normalização rigorosa que remove espaços e hifens para comparação de igualdade técnica
  const normalizeStrict = (t: string) => 
    normalize(t).replace(/[\s-]/g, '');

  const isMaster = currentUser.nivel === 'Gestor Master' || currentUser.nivel === 'Start' || normalize(currentUser.unidade) === 'todas';
  const isRegente = currentUser.nivel === 'Regente';
  
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
    // Normalização pedagógica
    if (e === 'EDUCACAO INFANTIL') e = 'EI';
    else if (e === 'ENSINO FUNDAMENTAL') e = 'EF';
    else if (e === 'ENSINO MEDIO') e = 'EM';
    
    const hasTurma = turmaEsc && normalize(turmaEsc) !== 'nao sei' && normalize(turmaEsc) !== 'não sei' && turmaEsc !== '';
    // Usamos ESPAÇO como separador para bater com o padrão de nome de usuário (ex: "EI-G2 A")
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

  const siglasExistentes = useMemo(() => {
    const set = new Set<string>();
    const unidadestr = currentUser.unidade || '';
    const userUnits = normalize(unidadestr).split(',').map(u => u.trim()).filter(Boolean);
    const userNameStrict = normalizeStrict(currentUser.nome || '');

    alunos.forEach(aluno => {
      if (normalize(aluno.statusMatricula) === 'cancelado') return;
      
      // Filtro de Unidade
      if (!isMaster && userUnits.length > 0) {
        const alunoUnit = normalize(aluno.unidade);
        const matchUnit = userUnits.some(u => alunoUnit.includes(u) || u.includes(alunoUnit));
        if (!matchUnit) return;
      }

      const sigla = formatEscolaridade(aluno);
      if (sigla) {
        if (isRegente) {
          // Comparação rigorosa (remove hífens e espaços de ambos os lados)
          if (normalizeStrict(sigla) === userNameStrict) {
            set.add(sigla);
          }
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
  }, [alunos, currentUser, isMaster, isRegente]);

  const [filtroSigla, setFiltroSigla] = useState('');
  const [filtroDia, setFiltroDia] = useState(idHoje);

  useEffect(() => {
    if (isRegente && siglasExistentes.length > 0) {
      setFiltroSigla(siglasExistentes[0]);
    } else if (isRegente && siglasExistentes.length === 0) {
      setFiltroSigla('');
    }
  }, [isRegente, siglasExistentes]);

  const studentsToPrepare = useMemo(() => {
    const unidadestr = currentUser.unidade || '';
    const userUnits = normalize(unidadestr).split(',').map(u => u.trim()).filter(Boolean);

    const daySynonyms: Record<string, string[]> = {
      'seg': ['seg', '2a', '2ª', 'segunda'],
      'ter': ['ter', '3a', '3ª', 'terça'],
      'qua': ['qua', '4a', '4ª', 'quarta'],
      'qui': ['qui', '5a', '5ª', 'quinta'],
      'sex': ['sex', '6a', '6ª', 'sexta']
    };

    const targetSynonyms = daySynonyms[filtroDia] || [filtroDia];

    const filteredAlunos = alunos.filter(a => {
      if (normalize(a.statusMatricula) === 'cancelado') return false;
      if (!isMaster && userUnits.length > 0) {
        const alunoUnit = normalize(a.unidade);
        if (!userUnits.some(u => alunoUnit.includes(u) || u.includes(alunoUnit))) return false;
      }
      
      const siglaAluno = formatEscolaridade(a);
      if (isRegente) {
        // Regente só vê o que bate com o filtro (que já está travado na sigla dele)
        if (!filtroSigla || normalizeStrict(siglaAluno) !== normalizeStrict(filtroSigla)) return false;
      } else if (filtroSigla) {
        if (normalizeStrict(siglaAluno) !== normalizeStrict(filtroSigla)) return false;
      }
      
      return true;
    });

    const result: any[] = [];
    for (const a of filteredAlunos) {
      const mats = matriculas.filter(m => m.alunoId === a.id);
      const studentClassesOnDay: Turma[] = [];

      for (const m of mats) {
        const t = turmas.find(turma => {
          const tId = normalize(turma.id);
          const tNome = normalize(turma.nome);
          const tUnidade = normalize(turma.unidade);
          const mTurmaId = normalize(m.turmaId);
          return normalize(m.unidade) === tUnidade && (tId === mTurmaId || mTurmaId.includes(tNome) || tNome.includes(mTurmaId));
        });

        if (t) {
          const horarioNorm = normalize(t.horario);
          if (targetSynonyms.some(syn => horarioNorm.includes(syn))) {
            studentClassesOnDay.push(t);
          }
        }
      }

      if (studentClassesOnDay.length > 0) {
        result.push({ 
          aluno: a, 
          sigla: formatEscolaridade(a),
          turmas: studentClassesOnDay.sort((x, y) => x.horario.localeCompare(y.horario)) 
        });
      }
    }

    return result.sort((x, y) => {
      const weightX = getSchoolWeight(x.sigla);
      const weightY = getSchoolWeight(y.sigla);
      if (weightX !== weightY) return weightX - weightY;
      return x.aluno.nome.localeCompare(y.aluno.nome);
    });
  }, [alunos, matriculas, turmas, filtroSigla, filtroDia, isMaster, currentUser.unidade, isRegente]);

  const diasSemana = [
    { id: 'seg', label: 'Segunda-feira' },
    { id: 'ter', label: 'Terça-feira' },
    { id: 'qua', label: 'Quarta-feira' },
    { id: 'qui', label: 'Quinta-feira' },
    { id: 'sex', label: 'Sexta-feira' }
  ];

  const labelDiaAtivo = diasSemana.find(d => d.id === filtroDia)?.label || 'Hoje';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Preparação</h2>
          <p className="text-slate-500 font-medium text-sm">Listagem nominal de estudantes conforme escolaridade e grade horária.</p>
        </div>
        <button className="bg-amber-50 text-amber-700 px-6 py-3 rounded-2xl flex items-center gap-3 border border-amber-100 shadow-sm hover:bg-amber-100 transition-all font-black text-[10px] uppercase tracking-widest self-start">
          <ClipboardCheck className="w-5 h-5 text-amber-600" />
          Rotina de Saída
        </button>
      </div>

      <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 ml-1 tracking-widest">
              SIGLA ESCOLAR / ESCOLARIDADE
            </label>
            <div className="relative group">
              <BookOpen className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
              <select 
                value={filtroSigla}
                onChange={(e) => setFiltroSigla(e.target.value)}
                disabled={isRegente}
                className={`w-full pl-14 pr-12 py-5 border-2 rounded-3xl outline-none transition-all font-black text-sm appearance-none cursor-pointer ${
                  isRegente ? 'bg-slate-50 border-slate-50 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-indigo-600'
                } ${filtroSigla ? 'border-indigo-600 ring-4 ring-indigo-50' : ''}`}
              >
                {!isRegente && <option value="">🌟 EXIBIR TODOS OS MEUS ESTUDANTES</option>}
                {siglasExistentes.map(s => <option key={s} value={s}>{s}</option>)}
                {isRegente && siglasExistentes.length === 0 && <option value="">Nenhuma sigla vinculada ao seu nome</option>}
              </select>
              {!isRegente && <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />}
              {isRegente && <Lock className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-4 ml-1 tracking-widest">
              DIA DA SEMANA (GRADE DO DIA)
            </label>
            <div className="relative group">
              <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400" />
              <select 
                value={filtroDia}
                onChange={(e) => setFiltroDia(e.target.value)}
                className="w-full pl-14 pr-12 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 outline-none transition-all font-black text-sm appearance-none cursor-pointer text-slate-700"
              >
                {diasSemana.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden min-h-[500px] flex flex-col">
        <div className="px-10 py-8 bg-[#0f172a] text-white flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight leading-none mb-2">Estudantes Localizados</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
              Listagem nominal para {labelDiaAtivo}
            </p>
          </div>
          <div className="bg-indigo-600 px-5 py-2.5 rounded-2xl border border-indigo-500 shadow-lg flex items-center gap-3">
             <span className="text-xs font-black uppercase">{studentsToPrepare.length} Alunos</span>
          </div>
        </div>

        <div className="px-10 py-4 border-b border-slate-100 bg-slate-50/30 grid grid-cols-12 gap-6">
          <div className="col-span-7 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estudante</div>
          <div className="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividades em {labelDiaAtivo}</div>
        </div>

        <div className="flex-1">
          {studentsToPrepare.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {studentsToPrepare.map((item, idx) => {
                const sigla = item.sigla;
                return (
                  <div key={idx} className="px-10 py-8 grid grid-cols-12 gap-6 items-center hover:bg-slate-50/50 transition-colors">
                    <div className="col-span-7 space-y-2">
                      <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter leading-none">{item.aluno.nome}</h4>
                      <div className="flex items-center gap-3">
                         <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">
                           {sigla || 'S/S'}
                         </span>
                         <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                           {item.aluno.unidade}
                         </span>
                      </div>
                    </div>
                    <div className="col-span-5 flex flex-wrap gap-3">
                      {item.turmas.map((t: Turma, tIdx: number) => (
                        <div key={tIdx} className="bg-emerald-50 border border-emerald-100 px-5 py-3 rounded-2xl flex items-center gap-4 group transition-all hover:bg-emerald-100">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-emerald-900 uppercase leading-none mb-1">{t.nome}</span>
                            <span className="text-[9px] font-black text-emerald-600/70 uppercase tracking-widest leading-none">{t.horario}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-40 text-center flex flex-col items-center justify-center space-y-6">
              <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center shadow-inner">
                <AlertCircle className="w-10 h-10 text-slate-200" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-2xl font-black text-slate-300 uppercase tracking-tighter mb-2">Nenhum estudante localizado</h4>
                <p className="text-slate-300 text-[11px] font-black uppercase tracking-widest px-10">
                  {isRegente && siglasExistentes.length === 0 
                    ? `Nenhuma sigla encontrada vinculada ao nome "${currentUser.nome}"`
                    : "Não localizamos registros com aulas para este dia nesta sigla."
                  }
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
