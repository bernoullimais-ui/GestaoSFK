
import React, { useState, useMemo, useEffect } from 'react';
import { ClipboardList, Calendar, MapPin, Search, BookOpen, Clock, Lock, GraduationCap, ChevronDown, Users } from 'lucide-react';
import { Aluno, Turma, Matricula, Usuario } from '../types';

interface PreparacaoTurmasProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  currentUser: Usuario;
}

// Lista Exclusiva conforme solicitado pelo usuário
const SIGLAS_VALIDAS = [
  "EI-Grupo 4 A", "EI-Grupo 5 A",
  "EF-1º A", "EF-1º B", "EF-2º A", "EF-2º B", "EF-3º A", "EF-3º B", "EF-4º A", "EF-5º A", "EF-5º B",
  "EF-6º A", "EF-6º B", "EF-6º C", "EF-7º A", "EF-7º B", "EF-7º C", "EF-7º D",
  "EF-8º A", "EF-8º B", "EF-8º C", "EF-9º A", "EF-9º B", "EF-9º C", "EF-9º D",
  "EM-1ª A", "EM-1ª B", "EM-1ª C", "EM-1ª D", "EM-1ª E",
  "EM-2ª A", "EM-2ª B", "EM-2ª C", "EM-2ª D", "EM-2ª E",
  "EM-3ª A", "EM-3ª B", "EM-3ª C", "EM-3ª D"
];

const PreparacaoTurmas: React.FC<PreparacaoTurmasProps> = ({ alunos, turmas, matriculas, currentUser }) => {
  const isRegente = currentUser.nivel === 'Regente';
  
  const idHoje = useMemo(() => {
    const d = new Date().getDay();
    if (d === 0 || d === 6) return 'seg';
    const map: Record<number, string> = { 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex' };
    return map[d] || 'seg';
  }, []);

  const [filtroSigla, setFiltroSigla] = useState(isRegente ? (currentUser.nome || '') : '');
  const [filtroDia, setFiltroDia] = useState(idHoje);

  useEffect(() => {
    if (isRegente) {
      setFiltroSigla(currentUser.nome || '');
    }
  }, [currentUser, isRegente]);

  const diasSemana = [
    { id: 'seg', label: 'Segunda-feira' },
    { id: 'ter', label: 'Terça-feira' },
    { id: 'qua', label: 'Quarta-feira' },
    { id: 'qui', label: 'Quinta-feira' },
    { id: 'sex', label: 'Sexta-feira' },
  ];

  // Função de Formatação para match com a lista exclusiva
  const formatEscolaridade = (aluno: Aluno) => {
    let etapa = (aluno.etapa || '').toUpperCase().trim();
    let ano = (aluno.anoEscolar || '').trim();
    let turmaLetra = (aluno.turmaEscolar || '').trim();
    
    // Normalização extra
    if (etapa.includes('INFANTIL')) etapa = 'EI';
    else if (etapa.includes('FUNDAMENTAL')) etapa = 'EF';
    else if (etapa.includes('MEDIO')) etapa = 'EM';

    // Limpeza agressiva do ano caso ainda contenha "ano" ou "série"
    ano = ano.replace(/\s*ano\s*$/i, '').replace(/\s*série\s*$/i, '').replace(/\s*serie\s*$/i, '').trim();

    if (!etapa || !ano) return 'Sem Classificação';
    
    // Constrói a sigla no padrão: [Etapa]-[Ano] [Turma]
    return `${etapa}-${ano}${turmaLetra ? ' ' + turmaLetra : ''}`.trim();
  };

  // Filtra estudantes que dão match com a sigla e o dia selecionado
  const resultPreparacao = useMemo(() => {
    if (!filtroSigla || !filtroDia) return [];
    const siglaBusca = filtroSigla.toLowerCase().trim();

    const diaTerms: Record<string, string[]> = {
      'seg': ['seg', 'segunda', '2ª'],
      'ter': ['ter', 'terça', 'terca', '3ª'],
      'qua': ['qua', 'quarta', '4ª'],
      'qui': ['qui', 'quinta', '5ª'],
      'sex': ['sex', 'sexta', '6ª']
    };

    return alunos
      .filter(aluno => {
        const siglaAluno = formatEscolaridade(aluno).toLowerCase().trim();
        return siglaAluno === siglaBusca;
      })
      .map(aluno => {
        const matriculasAluno = matriculas.filter(m => m.alunoId === aluno.id);
        const turmasDoDia = matriculasAluno
          .map(m => turmas.find(t => t.id === m.turmaId))
          .filter((t): t is Turma => {
            if (!t) return false;
            const h = t.horario.toLowerCase();
            return diaTerms[filtroDia]?.some(term => h.includes(term)) || false;
          });
        
        return { aluno, turmas: turmasDoDia };
      })
      .filter(item => item.turmas.length > 0)
      .sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome));
  }, [alunos, turmas, matriculas, filtroSigla, filtroDia]);

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
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">
            Sigla Escolar {isRegente && <span className="text-blue-500 font-black">(FIXADO)</span>}
          </label>
          <div className="relative group">
            <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <select 
              value={filtroSigla}
              disabled={isRegente}
              onChange={(e) => setFiltroSigla(e.target.value)}
              className={`w-full pl-12 pr-10 py-3 border-2 rounded-2xl outline-none transition-all font-bold appearance-none ${
                isRegente 
                ? 'bg-blue-50 border-blue-200 text-blue-700 cursor-not-allowed shadow-inner' 
                : 'bg-slate-50 border-slate-100 text-slate-700 focus:border-blue-500 hover:border-slate-300'
              }`}
            >
              <option value="">Selecione a Sigla (Ex: EI-Grupo 4 A)</option>
              {SIGLAS_VALIDAS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {!isRegente && (
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            )}
          </div>
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

      {filtroSigla && filtroDia && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Estudantes em Cursos Extras</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{filtroSigla} • {diasSemana.find(d => d.id === filtroDia)?.label}</p>
            </div>
            <span className="bg-blue-600 px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-blue-500/20">{resultPreparacao.length} Alunos</span>
          </div>

          <div className="p-4">
            {resultPreparacao.length > 0 ? (
              <div className="space-y-3">
                {resultPreparacao.map(({ aluno, turmas }) => (
                  <div key={aluno.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black shadow-inner">
                        {aluno.nome.charAt(0)}
                      </div>
                      <p className="font-bold text-slate-800 leading-tight">{aluno.nome}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {turmas.map(t => (
                        <div key={t.id} className="flex items-center gap-2 bg-white border border-blue-100 px-3 py-1.5 rounded-xl shadow-sm">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs font-black text-blue-700 uppercase">{t.nome}</span>
                          <span className="text-[9px] font-bold text-slate-400 border-l border-slate-200 pl-2 ml-1">{t.horario.split(' ')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border-2 border-dashed border-slate-100">
                   <Users className="w-8 h-8 text-slate-200" />
                </div>
                <p className="text-slate-400 italic font-medium">Nenhum aluno da sigla "{filtroSigla}" possui cursos agendados para este dia.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PreparacaoTurmas;
