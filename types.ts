
export interface CursoCancelado {
  nome: string;
  dataMatricula?: string;
  dataCancelamento?: string;
}

export interface AcaoRetencao {
  alertaId: string; // alunoId + turmaId + dataUltimaPresenca
  dataAcao: string;
  usuarioLogin: string;
}

export interface Aluno {
  id: string;
  nome: string;
  dataNascimento: string;
  contato: string;
  etapa?: string;
  anoEscolar?: string;
  turmaEscolar?: string;
  plano?: string; // Novo: Captura o plano (Coluna D da Base)
  // Campos detalhados para Gestão
  dataMatricula?: string;
  email?: string;
  responsavel1?: string;
  whatsapp1?: string;
  responsavel2?: string;
  whatsapp2?: string;
  statusMatricula?: string;
  dataCancelamento?: string;
  cursosCancelados?: string[];
  cursosCanceladosDetalhes?: CursoCancelado[];
  isLead?: boolean;
}

export interface Turma {
  id: string;
  nome: string;
  horario: string;
  professor: string;
  capacidade?: number;
  valorMensal?: number; // Novo: Captura o valor (Coluna E das Turmas)
}

export interface Matricula {
  id: string;
  alunoId: string;
  turmaId: string;
  dataMatricula?: string;
}

export interface Presenca {
  id: string;
  alunoId: string;
  turmaId: string;
  data: string;
  status: 'Presente' | 'Ausente';
  observacao?: string;
}

export interface Usuario {
  nome?: string;
  login: string;
  senha?: string;
  nivel: 'Professor' | 'Gestor' | 'Regente' | 'Estagiário' | 'Gestor Master' | 'Start';
  token?: string;
}

export interface AulaExperimental {
  id: string;
  estudante: string;
  sigla: string;
  curso: string;
  aula: string;
  responsavel1?: string;
  whatsapp1?: string;
  status?: 'Pendente' | 'Presente' | 'Ausente';
  observacaoProfessor?: string;
  dataStatusAtualizado?: string;
  confirmationSent?: boolean;
  followUpSent?: boolean;
  convertido?: boolean;
}

export type ViewType = 'dashboard' | 'alunos' | 'frequencia' | 'relatorios' | 'turmas' | 'usuarios' | 'preparacao' | 'experimental' | 'dados-alunos' | 'churn-risk' | 'settings';
