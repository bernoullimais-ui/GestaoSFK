
import React, { useMemo, useState } from 'react';
import { 
    Users, 
    GraduationCap, 
    ClipboardCheck, 
    UserPlus, 
    AlertTriangle, 
    ArrowRight, 
    ShieldCheck,
    UserX,
    MessageCircle,
    Zap,
    Send,
    Loader2,
    X,
    Target,
    Activity
} from 'lucide-react';
import { Presenca, Usuario, Aluno, Matricula, Turma, ViewType, AulaExperimental, AcaoRetencao } from '../types';

interface DashboardProps {
  user: Usuario;
  alunosCount: number;
  turmasCount: number;
  turmas?: Turma[];
  presencas: Presenca[];
  alunos?: Aluno[];
  matriculas?: Matricula[];
  experimentais?: AulaExperimental[];
  onUpdateExperimental?: (updated: AulaExperimental) => Promise<void>;
  acoesRetencao?: AcaoRetencao[];
  onNavigate?: (view: ViewType) => void;
  isLoading?: boolean;
  whatsappConfig?: { url: string; token: string; };
  msgTemplateExperimental?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  alunosCount, 
  turmasCount, 
  turmas = [],
  presencas, 
  alunos = [],
  matriculas = [],
  experimentais = [],
  onUpdateExperimental,
  acoesRetencao = [],
  onNavigate,
  isLoading = false,
  whatsappConfig,
  msgTemplateExperimental = "Olá *{{responsavel}}*, como foi a aula de *{{estudante}}* hoje na SFK?"
}) => {
  const isGestorOrCoordenador = user.nivel === 'Gestor' || user.nivel === 'Gestor Master' || user.nivel === 'Coordenador';
  const isProfessor = user.nivel === 'Professor' || user.nivel === 'Estagiário';
  
  const normalize = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const professorName = normalize(user.nome || user.login);

  const statsData = useMemo(() => {
    let filteredAlunos = alunos;
    let filteredMatriculas = matriculas;
    let filteredTurmas = turmas;
    
    // Filtro de Permissões e Unidades
    if (isProfessor) {
      filteredTurmas = turmas.filter(t => {
        const prof = normalize(t.professor).replace(/^prof\.?\s*/i, '');
        return prof.includes(professorName) || professorName.includes(prof);
      });
      const myTurmaIds = new Set(filteredTurmas.map(t => t.id));
      filteredMatriculas = matriculas.filter(m => {
        // Professor vê alunos cujas matrículas batem com o curso/unidade onde ele leciona
        return filteredTurmas.some(t => {
            const mCurso = normalize(m.turmaId.split('-')[0]);
            const mUnidade = normalize(m.unidade);
            const tNome = normalize(t.nome);
            const tUnidade = normalize(t.unidade);
            return tUnidade === mUnidade && (tNome.includes(mCurso) || mCurso.includes(tNome));
        });
      });
      const myStudentIds = new Set(filteredMatriculas.map(m => m.alunoId));
      filteredAlunos = alunos.filter(a => myStudentIds.has(a.id));
    } else if (user.unidade !== 'TODAS') {
      const userUnits = normalize(user.unidade).split(',').map(u => u.trim());
      filteredAlunos = alunos.filter(a => userUnits.some(u => normalize(a.unidade).includes(u) || u.includes(normalize(a.unidade))));
      filteredMatriculas = matriculas.filter(m => userUnits.some(u => normalize(m.unidade).includes(u) || u.includes(normalize(m.unidade))));
      filteredTurmas = turmas.filter(t => userUnits.some(u => normalize(t.unidade).includes(u) || u.includes(normalize(t.unidade))));
    }

    // 1. Alunos Cadastrados
    const totalCadastrados = filteredAlunos.length;

    // 2. Alunos Ativos (Únicos)
    const activeStudentIds = new Set(filteredMatriculas.map(m => m.alunoId));
    const totalAtivos = activeStudentIds.size;

    // 3. Matrículas Ativas
    const totalMatriculas = filteredMatriculas.length;

    // 4 e 5. Turmas Ativas e Ocupação Média
    // Lógica Segura: Percorremos a aba Turmas e verificamos quantos alunos da aba Base batem com ela
    let turmasComAlunosCount = 0;
    let sumMatriculasInTurmas = 0;
    let sumCapacidadeInTurmas = 0;

    filteredTurmas.forEach(turma => {
      const tNomeNorm = normalize(turma.nome);
      const tUnidadeNorm = normalize(turma.unidade);

      // Encontrar matrículas que batem com esta turma específica
      const matriculadosNaTurma = filteredMatriculas.filter(m => {
        const mCursoNorm = normalize(m.turmaId.split('-')[0]);
        const mUnidadeNorm = normalize(m.unidade);
        // Match flexível: Curso contém Nome da Turma ou vice-versa na mesma unidade
        return mUnidadeNorm === tUnidadeNorm && (tNomeNorm.includes(mCursoNorm) || mCursoNorm.includes(tNomeNorm));
      });

      if (matriculadosNaTurma.length > 0) {
        turmasComAlunosCount++;
        sumMatriculasInTurmas += matriculadosNaTurma.length;
        sumCapacidadeInTurmas += (turma.capacidade || 20);
      }
    });

    const ocupacaoMediaValue = sumCapacidadeInTurmas > 0 
      ? Math.round((sumMatriculasInTurmas / sumCapacidadeInTurmas) * 100) 
      : 0;

    return {
      totalAlunos: totalCadastrados,
      alunosAtivos: totalAtivos,
      matriculasAtivas: totalMatriculas,
      turmasAtivas: turmasComAlunosCount,
      ocupacaoMedia: ocupacaoMediaValue
    };
  }, [isProfessor, turmas, matriculas, alunos, professorName, user.unidade]);

  const slugify = (t: string) => String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300(\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  const churnPending = useMemo(() => {
    if (!isGestorOrCoordenador || presencas.length === 0) return 0;
    const userUnits = user.unidade !== 'TODAS' ? normalize(user.unidade).split(',').map(u => u.trim()) : null;

    const groups: Record<string, Presenca[]> = {};
    presencas.forEach(p => {
      if (userUnits && !userUnits.some(u => normalize(p.unidade).includes(u) || u.includes(normalize(p.unidade)))) return;
      const key = `${slugify(p.alunoId)}|${slugify(p.unidade)}|${slugify(p.turmaId)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    let count = 0;
    for (const key in groups) {
      const sorted = [...groups[key]].sort((a, b) => b.data.localeCompare(a.data));
      const ultimas3 = sorted.slice(0, 3);
      if (ultimas3.length >= 3 && ultimas3.every(p => p.status === 'Ausente')) {
        const alertaId = `risk|${key}|${sorted[0].data}`;
        if (!acoesRetencao?.some(a => a.alertaId === alertaId)) count++;
      }
    }
    return count;
  }, [isGestorOrCoordenador, presencas, acoesRetencao, user.unidade]);

  const stats = [
    { label: 'Alunos Cadastrados', value: statsData.totalAlunos, icon: UserPlus, color: 'bg-slate-700' },
    { label: 'Alunos Ativos', value: statsData.alunosAtivos, icon: Users, color: 'bg-blue-600' },
    { label: 'Matrículas Ativas', value: statsData.matriculasAtivas, icon: ClipboardCheck, color: 'bg-emerald-600' },
    { label: 'Turmas Ativas', value: statsData.turmasAtivas, icon: GraduationCap, color: 'bg-purple-600' },
    { label: 'Ocupação Média', value: `${statsData.ocupacaoMedia}%`, icon: Activity, color: 'bg-indigo-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painel de Controle</h2>
          <p className="text-slate-500 font-medium">Unidade de Acesso: <span className="text-indigo-600 font-black uppercase">{user.unidade}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isGestorOrCoordenador && churnPending > 0 && (
            <div className="bg-red-50 border-2 border-red-100 rounded-[32px] p-8 flex flex-col items-center justify-between shadow-xl animate-in slide-in-from-top-4">
               <div className="flex items-center gap-6 mb-6 w-full">
                 <div className="w-16 h-16 bg-red-500 text-white rounded-2xl flex items-center justify-center shrink-0">
                   <AlertTriangle className="w-8 h-8" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-red-900">Alerta de Evasão</h3>
                   <p className="text-red-700 text-sm font-bold uppercase">{churnPending} Estudantes com risco crítico.</p>
                 </div>
               </div>
               <button onClick={() => onNavigate && onNavigate('churn-risk')} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-lg active:scale-95">
                GERENCIAR RETENÇÃO <ArrowRight className="w-4 h-4" />
               </button>
            </div>
          )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`${stat.color} p-3.5 rounded-2xl text-white shadow-lg shadow-current/10`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 mt-0.5">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
