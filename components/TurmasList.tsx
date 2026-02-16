
import React, { useState, useMemo } from 'react';
import { GraduationCap, Clock, User, ArrowRight, X, Users, Database, Search, Calendar, UserCheck } from 'lucide-react';
import { Turma, Matricula, Aluno, Usuario } from '../types';

interface TurmasListProps {
  turmas: Turma[];
  matriculas: Matricula[];
  alunos: Aluno[];
  currentUser: Usuario;
}

const TurmasList: React.FC<TurmasListProps> = ({ turmas, matriculas, alunos, currentUser }) => {
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isProfessor = currentUser.nivel === 'Professor';
  const professorName = (currentUser.nome || currentUser.login).toLowerCase().trim();

  const displayTurmas = useMemo(() => {
    let filtered = turmas;
    if (isProfessor) {
      filtered = filtered.filter(t => {
        const tProf = t.professor.toLowerCase().replace('prof.', '').trim();
        return tProf.includes(professorName) || professorName.includes(tProf);
      });
    }
    return filtered.filter(t => 
      t.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.professor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.horario.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [turmas, searchTerm, isProfessor, professorName]);

  const getAlunosDaTurma = (turmaId: string) => {
    const idsMatriculados = matriculas.filter(m => m.turmaId === turmaId).map(m => m.alunoId);
    return alunos
      .filter(a => idsMatriculados.includes(a.id))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  };

  const formatEscolaridade = (aluno: Aluno) => {
    const etapa = (aluno.etapa || '').toUpperCase().trim();
    let ano = (aluno.anoEscolar || '').trim();
    const turmaLetra = (aluno.turmaEscolar || '').trim();
    if (!etapa || !ano) return '--';
    ano = ano.replace(/\s*ano\s*$/i, '').replace(/\s*série\s*$/i, '').replace(/\s*serie\s*$/i, '').trim();
    return `${etapa}-${ano}${turmaLetra ? ' ' + turmaLetra : ''}`.trim();
  };

  const parseDate = (dateVal: any): Date => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return new Date(0);
    
    // Suporte a datas seriais do Excel/Sheets
    if (typeof dateVal === 'number' || (!isNaN(Number(dateVal)) && String(dateVal).length < 8 && !String(dateVal).includes('/') && !String(dateVal).includes('-'))) {
      const serial = Number(dateVal);
      return new Date((serial - 25569) * 86400 * 1000);
    }

    try {
      let s = String(dateVal).trim().toLowerCase();
      
      // Limpeza de ruídos
      if (s.includes(',')) s = s.split(',')[0].trim();

      // Formato ISO YYYY-MM-DD
      const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (isoMatch) {
        return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]), 12, 0, 0);
      }

      // Formato DD/MM/YYYY ou DD/MM/YY
      const dateMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) {
        const d = parseInt(dateMatch[1]);
        const m = parseInt(dateMatch[2]);
        let y = parseInt(dateMatch[3]);
        if (y < 100) y += (y < 50 ? 2000 : 1900);
        return new Date(y, m - 1, d, 12, 0, 0);
      }

      const monthsMap: Record<string, number> = {
        'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
        'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
      };

      // Formato extenso: "01 de fev de 2026"
      if (s.includes(' de ')) {
        const parts = s.split(/\s+/);
        const day = parseInt(parts[0]);
        const monthPart = parts.find(p => monthsMap[p.replace('.', '').substring(0, 3)] !== undefined);
        const yearPart = parts.find(p => /^\d{4}$/.test(p));

        if (!isNaN(day) && monthPart && yearPart) {
           const monthIndex = monthsMap[monthPart.replace('.', '').substring(0, 3)];
           return new Date(parseInt(yearPart), monthIndex, day, 12, 0, 0);
        }
      }

      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        d.setHours(12, 0, 0, 0);
        return d;
      }
    } catch (e) {}
    return new Date(0);
  };

  const formatDisplayDate = (dateVal: any) => {
    const date = parseDate(dateVal);
    if (date.getTime() === 0) return '--';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Turmas Ativas</h2>
          <p className="text-slate-500 font-medium">Horários e listas sincronizados da planilha com controle de capacidade.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-xl shadow-slate-900/10">
          <Database className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">FONTE: GOOGLE SHEETS</span>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100">
        <div className="relative w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
          <input 
            type="text" 
            placeholder="Consultar turma por nome, professor ou horário (Ex: Judô, 09:00)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {displayTurmas.map((turma) => {
          const alunosTurma = getAlunosDaTurma(turma.id);
          const matriculadosCount = alunosTurma.length;
          const capacidade = turma.capacidade || 15;
          const taxaOcupacao = Math.min(100, Math.round((matriculadosCount / capacidade) * 100));
          const isLotada = taxaOcupacao >= 100;
          
          return (
            <div key={turma.id} className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all border-l-[6px] border-l-blue-500 flex flex-col group">
              <div className="p-8 flex-1">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-blue-50 rounded-2xl">
                    <GraduationCap className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${isLotada ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                    {isLotada ? 'TURMA LOTADA' : 'VAGAS ABERTAS'}
                  </div>
                </div>
                
                <h3 className="text-2xl font-black text-slate-800 mb-6 truncate">{turma.nome}</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-slate-500">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-bold">{turma.horario}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <User className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-bold">{turma.professor}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2">
                       <Users className="w-4 h-4 text-blue-600" />
                       <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{matriculadosCount} MATRICULADOS</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{capacidade} VAGAS</span>
                  </div>
                  
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${isLotada ? 'bg-red-500' : 'bg-blue-600'}`}
                      style={{ width: `${taxaOcupacao}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TAXA DE OCUPAÇÃO</span>
                    <span className="text-[11px] font-black text-blue-600">{taxaOcupacao}%</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedTurma(turma)} 
                className="w-full py-5 bg-slate-50 border-t border-slate-100 text-slate-600 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-900 hover:text-white transition-all group"
              >
                Ver Lista de Alunos 
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>

      {selectedTurma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 bg-blue-600 text-white flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Lista de Estudantes (A-Z)</h3>
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mt-1">
                  {selectedTurma.nome} • {selectedTurma.horario}
                </p>
              </div>
              <button 
                onClick={() => setSelectedTurma(null)} 
                className="p-3 bg-white/20 hover:bg-white/30 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="px-8 py-5">Nome do Aluno</th>
                    <th className="px-8 py-5">Escolaridade</th>
                    <th className="px-8 py-5">Data de Nascimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {getAlunosDaTurma(selectedTurma.id).length > 0 ? (
                    getAlunosDaTurma(selectedTurma.id).map(aluno => (
                      <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-lg">
                              {aluno.nome.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-800">{aluno.nome}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                            {formatEscolaridade(aluno)}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-slate-500">
                          {formatDisplayDate(aluno.dataNascimento)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-8 py-20 text-center">
                        <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold italic">Nenhum aluno matriculado nesta turma.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedTurma(null)} 
                className="px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
              >
                Fechar Lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurmasList;
