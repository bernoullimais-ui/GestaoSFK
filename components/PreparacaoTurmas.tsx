
import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardList, Calendar, MapPin, Search, BookOpen, Clock, Lock, GraduationCap, ChevronDown, Users, AlertCircle, ShieldCheck } from 'lucide-react';
import { Aluno, Turma, Matricula, Usuario } from '../types';

interface PreparacaoTurmasProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  currentUser: Usuario;
}

const PreparacaoTurmas: React.FC<PreparacaoTurmasProps> = ({ alunos, turmas, matriculas, currentUser }) => {
  const isGestorOrCoordenador = currentUser.nivel === 'Gestor' || currentUser.nivel === 'Gestor Master' || currentUser.nivel === 'Coordenador';
  const isRegente = currentUser.nivel === 'Regente';
  const isProfessor = currentUser.nivel === 'Professor' || currentUser.nivel === 'Estagiário';
  
  const idHoje = useMemo(() => {
    const d = new Date().getDay();
    if (d === 0 || d === 6) return 'seg';
    const map: Record<number, string> = { 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex' };
    return map[d] || 'seg';
  }, []);

  const normalize = (t: string) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const professorName = normalize(currentUser.nome || currentUser.login);

  // 1. Identifica as turmas em que o usuário logado é o professor
  const myTurmasDocente = useMemo(() => {
    return turmas.filter(t => {
      const profInSheet = normalize(t.professor).replace(/^prof\.?\s*/i, '');
      return profInSheet.includes(professorName) || professorName.includes(profInSheet);
    });
  }, [turmas, professorName]);

  // 2. Filtra as matrículas que pertencem às modalidades/unidades que este professor leciona
  const myMatriculas = useMemo(() => {
    // Para Regente ou Coordenador (Gestor-like), consideramos as matrículas das unidades permitidas
    if (isRegente || isGestorOrCoordenador) return matriculas;
    if (!isProfessor) return matriculas;
    
    return matriculas.filter(m => {
      const mCursoNorm = normalize(m.turmaId.split('-')[0].split('(')[0]);
      const mUnidadeNorm = normalize(m.unidade);
      
      return myTurmasDocente.some(t => {
        const tNomeNorm = normalize(t.nome.split('-')[0].split('(')[0]);
        const tUnidadeNorm = normalize(t.unidade);
        
        // Match flexível de unidade
        const unidadesBatem = tUnidadeNorm === mUnidadeNorm || tUnidadeNorm.includes(mUnidadeNorm) || mUnidadeNorm.includes(tUnidadeNorm);
        const cursosBatem = tNomeNorm === mCursoNorm || tNomeNorm.includes(mCursoNorm) || mCursoNorm.includes(tNomeNorm);

        return unidadesBatem && cursosBatem;
      });
    });
  }, [matriculas, isProfessor, isRegente, isGestorOrCoordenador, myTurmasDocente]);

  // Lista de IDs de alunos vinculados a este professor (apenas para Professor)
  const studentsWithMyTurmas = useMemo(() => new Set(myMatriculas.map(m => m.alunoId)), [myMatriculas]);

  const compareSiglas = (a: string, b: string) => {
    const getWeight = (s: string) => {
      if (s.startsWith('EI')) return 1;
      if (s.startsWith('EF')) return 2;
      if (s.startsWith('EM')) return 3;
      return 4;
    };
    const wA = getWeight(a);
    const wB = getWeight(b);
    if (wA !== wB) return wA - wB;
    const nA = parseInt(a.replace(/\D/g, '')) || 0;
    const nB = parseInt(b.replace(/\D/g, '')) || 0;
    if (nA !== nB) return nA - nB;
    return a.localeCompare(b);
  };

  const formatEscolaridade = (aluno: Aluno) => {
    const etapaRaw = (aluno.etapa || '').toUpperCase().trim();
    const anoRaw = (aluno.anoEscolar || '').toUpperCase().trim();
    const turmaRaw = (aluno.turmaEscolar || '').toUpperCase().trim();
    let etapa = '';
    if (etapaRaw.includes('INFANTIL')) etapa = 'EI';
    else if (etapaRaw.includes('FUNDAMENTAL')) etapa = 'EF';
    else if (etapaRaw.includes('MEDIO')) etapa = 'EM';
    else etapa = etapaRaw;
    let ano = anoRaw.replace('GRUPO', 'G').replace('ANO', '').replace('SÉRIE', '').replace('SERIE', '').replace(/\s+/g, '').trim();
    if (!etapa && !ano) return '';
    let siglaBase = (etapa && ano) ? `${etapa}-${ano}` : (etapa || ano);
    return `${siglaBase}${turmaRaw ? ' ' + turmaRaw : ''}`.trim();
  };

  const siglasExistentes = useMemo(() => {
    const set = new Set<string>();
    const unidadestr = currentUser.unidade || '';
    const userUnits = normalize(unidadestr).split(',').map(u => u.trim()).filter(Boolean);

    alunos.forEach(aluno => {
      const status = normalize(aluno.statusMatricula || 'ativo');
      if (status === 'cancelado') return;
      
      if (isProfessor) {
        if (!studentsWithMyTurmas.has(aluno.id)) return;
      } else if (isRegente || isGestorOrCoordenador) {
        // Filtro por unidade
        if (unidadestr !== 'TODAS' && userUnits.length > 0) {
          const alunoUnit = normalize(aluno.unidade);
          const hasAccess = userUnits.some(u => alunoUnit.includes(u) || u.includes(alunoUnit));
          if (!hasAccess) return;
        }
      }

      const sigla = formatEscolaridade(aluno);
      if (sigla) set.add(sigla);
    });
    return Array.from(set).sort(compareSiglas);
  }, [alunos, currentUser, isProfessor, isRegente, isGestorOrCoordenador, studentsWithMyTurmas]);

  const [filtroSigla, setFiltroSigla] = useState('');
  const [filtroDia, setFiltroDia] = useState(idHoje);

  // Auto-seleção para Regente
  useEffect(() => {
    if (isRegente && !filtroSigla && siglasExistentes.length > 0) {
      const userNameNorm = normalize(currentUser.nome || '');
      const match = siglasExistentes.find(s => normalize(s) === userNameNorm);
      if (match) setFiltroSigla(match);
    }
  }, [isRegente, siglasExistentes, currentUser.nome, filtroSigla]);

  const diasSemana = [
    { id: 'seg', label: 'Segunda-feira' },
    { id: 'ter', label: 'Terça-feira' },
    { id: 'qua', label: 'Quarta-feira' },
    { id: 'qui', label: 'Quinta-feira' },
    { id: 'sex', label: 'Sexta-feira' },
  ];

  const resultPreparacao = useMemo(() => {
    if (!filtroSigla) return [];
    
    const siglaBusca = normalize(filtroSigla);
    const exibirTodos = filtroSigla === 'EXIBIR_TODOS';
    const unidadestr = currentUser.unidade || '';
    const userUnits = normalize(unidadestr).split(',').map(u => u.trim()).filter(Boolean);

    const diaTerms: Record<string, string[]> = {
      'seg': ['seg', 'segunda', '2ª', '2a'],
      'ter': ['ter', 'terça', 'terca', '3ª', '3a'],
      'qua': ['qua', 'quarta', '4ª', '4a'],
      'qui': ['qui', 'quinta', '5ª', '5a'],
      'sex': ['sex', 'sexta', '6ª', '6a']
    };

    const alunosFiltrados = alunos.filter(aluno => {
      const status = normalize(aluno.statusMatricula || 'ativo');
      if (status === 'cancelado') return false;

      if (isProfessor) {
        if (!studentsWithMyTurmas.has(aluno.id)) return false;
      } else if (isRegente || isGestorOrCoordenador) {
        if (unidadestr !== 'TODAS' && userUnits.length > 0) {
          const alunoUnit = normalize(aluno.unidade);
          const hasAccess = userUnits.some(u => alunoUnit.includes(u) || u.includes(alunoUnit));
          if (!hasAccess) return false;
        }
      }
      
      if (exibirTodos) return true;
      const siglaAluno = normalize(formatEscolaridade(aluno));
      return siglaAluno === siglaBusca;
    });

    return alunosFiltrados
      .map(aluno => {
        const alunoMats = matriculas.filter(m => m.alunoId === aluno.id);
        const alunoUnidadeNorm = normalize(aluno.unidade);

        // Turmas que esse aluno frequenta
        const turmasDoDia = turmas.filter(t => {
          // Filtro de Unidade: Match flexível para permitir "Dom Pedrinho" encontrar "Escola Dom Pedrinho"
          const tUnidadeNorm = normalize(t.unidade);
          const unidadeBate = tUnidadeNorm === alunoUnidadeNorm || tUnidadeNorm.includes(alunoUnidadeNorm) || alunoUnidadeNorm.includes(tUnidadeNorm);
          
          if (!unidadeBate) return false;

          // Filtro de Professor: Se for professor, ele só vê a turma dele.
          if (isProfessor) {
            const isMyTurma = myTurmasDocente.some(mt => mt.id === t.id);
            if (!isMyTurma) return false;
          }

          const tNomeNorm = normalize(t.nome.split('-')[0].split('(')[0]);
          
          const estaMatriculado = alunoMats.some(m => {
            const mCursoNorm = normalize(m.turmaId.split('-')[0].split('(')[0]);
            return mCursoNorm === tNomeNorm || tNomeNorm.includes(mCursoNorm) || mCursoNorm.includes(tNomeNorm);
          });
          
          if (!estaMatriculado) return false;

          const h = normalize(t.horario);
          return diaTerms[filtroDia]?.some(term => h.includes(term));
        });

        const uniqueMap = new Map<string, Turma>();
        turmasDoDia.forEach(t => {
          const key = `${normalize(t.nome)}-${normalize(t.horario)}`;
          if (!uniqueMap.has(key)) uniqueMap.set(key, t);
        });

        return { aluno, sigla: formatEscolaridade(aluno), turmas: Array.from(uniqueMap.values()) };
      })
      .filter(item => item.turmas.length > 0)
      .sort((a, b) => {
        const siglaComp = compareSiglas(a.sigla, b.sigla);
        if (siglaComp !== 0) return siglaComp;
        return a.aluno.nome.localeCompare(b.aluno.nome);
      });
  }, [alunos, turmas, myTurmasDocente, matriculas, filtroSigla, filtroDia, currentUser, isProfessor, isRegente, isGestorOrCoordenador, studentsWithMyTurmas]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Preparação</h2>
          <p className="text-slate-500">Listagem de estudantes por Estágio, Ano e Turma.</p>
        </div>
        <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase">Fila de Saída</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Sigla Escolar</label>
          <div className="relative group">
            <BookOpen className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isRegente ? 'text-blue-400' : 'text-slate-300'}`} />
            <select 
              value={filtroSigla}
              onChange={(e) => setFiltroSigla(e.target.value)}
              className={`w-full pl-12 pr-10 py-3 border-2 rounded-2xl outline-none transition-all font-bold appearance-none bg-slate-50 border-slate-100 text-slate-700 focus:border-blue-500 ${
                isRegente ? 'border-blue-50 text-blue-900 shadow-inner' : ''
              }`}
            >
              <option value="">Selecione a Sigla...</option>
              {(isGestorOrCoordenador || isProfessor) && (
                <option value="EXIBIR_TODOS" className="text-blue-600 font-black">🌟 EXIBIR TODOS OS MEUS ESTUDANTES</option>
              )}
              {siglasExistentes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          {isRegente && (
            <p className="mt-2 text-[10px] font-bold text-blue-400 uppercase tracking-tighter flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Selecionado automaticamente: {currentUser.nome}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Dia da Semana</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <select 
              value={filtroDia}
              onChange={(e) => setFiltroDia(e.target.value)}
              className="w-full pl-12 pr-10 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none hover:border-slate-300"
            >
              {diasSemana.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {filtroSigla ? (
        <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4">
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <th className="px-8 py-5">Estudante</th>
                   <th className="px-8 py-5">Atividades em {diasSemana.find(d => d.id === filtroDia)?.label}</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {resultPreparacao.length > 0 ? resultPreparacao.map(({ aluno, sigla, turmas }) => (
                   <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                     <td className="px-8 py-6">
                       <p className="font-bold text-slate-800 text-lg leading-tight">{aluno.nome}</p>
                       <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{sigla}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">{aluno.unidade}</span>
                       </div>
                     </td>
                     <td className="px-8 py-6">
                       <div className="flex flex-wrap gap-2">
                         {turmas.map(t => (
                           <div key={t.id} className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl shadow-sm flex items-center gap-3">
                             <div className="w-2 h-2 rounded-full bg-emerald-500" />
                             <div>
                               <p className="text-[11px] font-black text-emerald-900 leading-none">{t.nome}</p>
                               <p className="text-[10px] font-bold text-emerald-600/70 mt-1 uppercase">{t.horario}</p>
                             </div>
                           </div>
                         ))}
                       </div>
                     </td>
                   </tr>
                 )) : (
                   <tr>
                     <td colSpan={2} className="px-8 py-20 text-center">
                       <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                       <h3 className="text-xl font-bold text-slate-400">Nenhum estudante com atividades</h3>
                       <p className="text-slate-300 text-sm mt-1">
                         {filtroSigla === 'EXIBIR_TODOS' 
                           ? `Não localizamos nenhum estudante seu com aulas para ${diasSemana.find(d => d.id === filtroDia)?.label.toLowerCase()}.`
                           : `Não localizamos estudantes da sigla ${filtroSigla} com aulas para ${diasSemana.find(d => d.id === filtroDia)?.label.toLowerCase()}.`}
                       </p>
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-20 rounded-[40px] text-center">
           <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
           <p className="text-slate-400 font-bold">Selecione uma Sigla Escolar ou use "Exibir Todos" para visualizar a lista.</p>
        </div>
      )}
    </div>
  );
};

export default PreparacaoTurmas;
