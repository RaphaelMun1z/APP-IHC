import type { Student, Criterion, Person, Course, SchoolClass } from '../models/domain';

export const students: readonly Student[] = [
  'Ana Clara Santos',
  'Bruno Oliveira',
  'Camila Rodrigues',
  'Daniel Ferreira',
  'Eduarda Costa',
  'Felipe Almeida',
  'Gabriela Lima',
  'Henrique Martins',
  'Isabela Souza',
  'João Pedro Ribeiro',
  'Larissa Carvalho',
  'Lucas Barbosa',
  'Mariana Gomes',
  'Pedro Henrique Alves',
  'Vitória Nascimento',
].map((nome, i) => ({ id: `aluno-${String(i + 1).padStart(2, '0')}`, nome }));

export const criteria: readonly Criterion[] = [
  ['dominio-conteudo', 'Domínio do conteúdo'],
  ['raciocinio-analitico', 'Raciocínio analítico'],
  ['aplicacao-pratica', 'Aplicação prática'],
  ['pensamento-critico', 'Pensamento crítico'],
  ['argumentacao', 'Argumentação'],
  ['comunicacao', 'Comunicação'],
  ['colaboracao', 'Colaboração'],
  ['autonomia', 'Autonomia'],
  ['organizacao', 'Organização'],
  ['entrega-prazo', 'Entrega no prazo'],
].map(([id, nome]) => ({ id, nome }));

export const teachers: readonly Person[] = [
  { id: 'professor-01', nome: 'Mariana Oliveira' },
  { id: 'professor-02', nome: 'Rafael Santos' },
];

export const courses: readonly Course[] = [
  {
    id: 'formacao',
    nome: 'Ciência da Computação',
    modulos: [
      {
        id: 'identidade',
        nome: '3º período · Engenharia de Software',
        licoes: [
          'Requisitos funcionais e não funcionais',
          'Modelagem UML e casos de uso',
          'Arquitetura de aplicações',
          'Testes e qualidade de software',
        ],
      },
      {
        id: 'convivencia',
        nome: '5º período · Banco de Dados',
        licoes: [
          'Modelagem relacional',
          'Normalização de dados',
          'Consultas SQL e junções',
          'Transações e concorrência',
        ],
      },
    ],
  },
  {
    id: 'projeto',
    nome: 'Administração',
    modulos: [
      {
        id: 'caminhos',
        nome: '2º período · Fundamentos de Gestão',
        licoes: [
          'Funções e níveis organizacionais',
          'Planejamento e definição de metas',
          'Estruturas organizacionais',
          'Liderança e tomada de decisão',
        ],
      },
      {
        id: 'comunidade',
        nome: '4º período · Gestão Financeira',
        licoes: [
          'Leitura de demonstrativos financeiros',
          'Custos fixos e variáveis',
          'Fluxo de caixa e orçamento',
          'Indicadores de desempenho',
        ],
      },
    ],
  },
];

export const defaultClasses: readonly SchoolClass[] = [
  {
    id: '6a',
    nome: 'Ciência da Computação · 3º período A',
    cursoId: 'formacao',
    moduloId: 'identidade',
    professorId: 'professor-01',
    dias: [1, 3],
    inicio: '08:00',
    fim: '09:40',
  },
  {
    id: '6b',
    nome: 'Ciência da Computação · 5º período B',
    cursoId: 'formacao',
    moduloId: 'convivencia',
    professorId: 'professor-01',
    dias: [2, 4],
    inicio: '10:00',
    fim: '11:40',
  },
  {
    id: '7a',
    nome: 'Administração · 2º período A',
    cursoId: 'projeto',
    moduloId: 'caminhos',
    professorId: 'professor-02',
    dias: [1, 3],
    inicio: '19:00',
    fim: '20:40',
  },
  {
    id: '7b',
    nome: 'Administração · 4º período B',
    cursoId: 'projeto',
    moduloId: 'comunidade',
    professorId: 'professor-02',
    dias: [2, 4],
    inicio: '20:50',
    fim: '22:30',
  },
].map((turma) => ({ ...turma, ativa: true, alunoIds: students.map((aluno) => aluno.id) }));
