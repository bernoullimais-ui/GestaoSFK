
import { Aluno, Turma, Matricula, Usuario } from './types';

export const UNIDADES_SFK = ['AKA', 'BUNNY', 'PEQUENO LICEU', 'DOM PEDRINHO', 'OFICINA'];

export const INITIAL_ALUNOS: Aluno[] = [];
export const INITIAL_TURMAS: Turma[] = [];
export const INITIAL_MATRICULAS: Matricula[] = [];
export const INITIAL_PRESENCAS: any[] = [];

export const INITIAL_USUARIOS: Usuario[] = [
  { login: 'SFK', senha: 'SFK', nivel: 'Start', nome: 'Configuração SFK', unidade: 'TODAS' },
  { login: 'admin', senha: 'sfk', nivel: 'Gestor Master', unidade: 'TODAS' }
];
