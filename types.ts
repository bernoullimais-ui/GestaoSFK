
export interface CursoCancelado {
  nome: string;
  unidade: string;
  dataMatricula?: string;
  dataCancelamento?: string;
}

export interface AcaoRetencao {
  alertaId: string; // alunoId + turmaId + dataUltimaPresenca
  dataAcao: string;
  usuarioLogin: string;
  unidade: string;
}

export interface Aluno {
  id: string;
  nome: string;
  unidade: string; // AKA, BUNNY, PEQUENO LICEU, DOM PEDRINHO, OFICINA
  dataNascimento: string;
  contato: string;
  etapa?: string;
  anoEscolar?: string;
  turmaEscolar?: string;
  dataMatricula?: string;
  email?: string;
  responsavel1?: string;
  whatsapp1?: string;
  responsavel2?: string;
  whatsapp2?: string;
  statusMatricula?: string;
  dataCancelamento?: string;
  cursosCanceladosDetalhes?: CursoCancelado[];
  isLead?: boolean;
}

export interface Turma {
  id: string;
  nome: string;
  unidade: string;
  horario: string;
  professor: string;
  capacidade?: number;
  valorMensal?: number;
}

export interface Matricula {
  id: string;
  alunoId: string;
  turmaId: string;
  unidade: string;
  dataMatricula?: string;
}

export interface Presenca {
  id: string;
  alunoId: string;
  turmaId: string;
  unidade: string;
  data: string;
  status: 'Presente' | 'Ausente';
  observacao?: string;
  alarme?: string; // Coluna G: "Enviado" ou vazio
}

export interface Usuario {
  nome?: string;
  login: string;
  senha?: string;
  unidade: string; // 'TODAS' para Master ou nome da unidade específica
  nivel: 'Professor' | 'Gestor' | 'Regente' | 'Estagiário' | 'Gestor Master' | 'Start' | 'Coordenador';
}

export interface AulaExperimental {
  id: string;
  estudante: string;
  unidade: string;
  sigla: string;
  curso: string;
  aula: string;
  responsavel1?: string;
  whatsapp1?: string;
  status?: 'Pendente' | 'Presente' | 'Ausente' | 'Reagendada';
  observacaoProfessor?: string;
  dataStatusAtualizado?: string;
  followUpSent?: boolean;
  lembreteEnviado?: boolean;
  convertido?: boolean;
  reagendarEnviado?: boolean; // Coluna O
  // Campos adicionais para escolaridade
  etapa?: string;
  anoEscolar?: string;
  turmaEscolar?: string;
}

export type ViewType = 'dashboard' | 'alunos' | 'frequencia' | 'relatorios' | 'turmas' | 'usuarios' | 'preparacao' | 'experimental' | 'dados-alunos' | 'churn-risk' | 'settings' | 'financeiro';
