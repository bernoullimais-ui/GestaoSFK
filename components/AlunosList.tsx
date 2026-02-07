
import React, { useState, useMemo } from 'react';
import { Search, Calendar, Database, BookOpen, Phone, GraduationCap, Filter } from 'lucide-react';
import { Aluno, Turma, Matricula } from '../types';

interface AlunosListProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
  userNivel: 'Professor' | 'Gestor' | 'Regente' | 'Estagiário' | 'Gestor Master';
}

const AlunosList: React.FC<AlunosListProps> = ({ alunos, turmas, matriculas, userNivel }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurmaFilter, setSelectedTurmaFilter] = useState('');
  const isGestor = userNivel === 'Gestor' || userNivel === 'Gestor Master';

  const filteredAlunos = useMemo(() => {
    return alunos.filter(aluno => {
      const matchesName = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesTurma = true;
      if (selectedTurmaFilter) {
        matchesTurma = matriculas.some(m => m.alunoId === aluno.id && m.turmaId === selectedTurmaFilter);
      }
      return matchesName && matchesTurma;
    });
  }, [alunos, searchTerm, selectedTurmaFilter, matriculas]);

  const formatEscolaridade = (aluno: Aluno) => {
    const etapa = (aluno.etapa || '').toUpperCase().trim();
    const ano = (aluno.anoEscolar || '').trim();
    const turmaLetra = (aluno.turmaEscolar || '').trim();
    if (!etapa || !ano) return '--';
    
    return `${etapa}-${ano}${turmaLetra ? ' ' + turmaLetra : ''}`.trim();
  };

  const formatBirthDate = (dateVal: string | Date | undefined) => {
    if (!dateVal) return '--';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '--';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = String(d.getFullYear()).substring(2);
      return `${day}/${month}/${year}`;
    } catch (e) { return '--'; }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Alunos Ativos</h2>
          <p className="text-slate-500">
            {isGestor ? 'Gestão completa dos dados sincronizados.' : 'Consulta de alunos vinculados às suas turmas.'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl border border-blue-100">
          <Database className="w-4 h-4" />
          <span className="text-xs font-bold uppercase">Cloud Sync Ativo</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
          
          <div className="relative w-full md:w-72">
            <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={selectedTurmaFilter}
              onChange={(e) => setSelectedTurmaFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700 appearance-none cursor-pointer"
            >
              <option value="">Todos os Cursos</option>
              {turmas.map(t => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-500 text-sm border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Nome do Aluno</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Escolaridade</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Nascimento</th>
                {isGestor && <th className="px-6 py-4 font-semibold uppercase tracking-wider">Contato</th>}
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">CURSOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredAlunos.length > 0 ? filteredAlunos.map((aluno) => {
                const turmasRelacionadas = turmas.filter(t => matriculas.some(m => m.alunoId === aluno.id && m.turmaId === t.id));
                return (
                  <tr key={aluno.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4"><div className="font-bold text-slate-900">{aluno.nome}</div></td>
                    <td className="px-6 py-4"><div className="text-xs bg-blue-50 px-2 py-1 rounded w-fit">{formatEscolaridade(aluno)}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-bold">{formatBirthDate(aluno.dataNascimento)}</div></td>
                    {isGestor && <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm">{aluno.contato || '--'}</div></td>}
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {turmasRelacionadas.map(t => (
                          <span key={t.id} className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{t.nome}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={isGestor ? 5 : 4} className="px-6 py-12 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AlunosList;
