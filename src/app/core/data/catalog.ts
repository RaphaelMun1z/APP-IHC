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
  ['conhecimento-conteudo', 'Conhecimento do conteúdo'],
  ['criatividade', 'Criatividade'],
  ['objetividade', 'Objetividade'],
  ['concisao', 'Concisão'],
  ['participacao', 'Participação'],
  ['escuta-ativa-foco', 'Escuta ativa e foco'],
  ['reatividade', 'Reatividade'],
  ['espirito-equipe', 'Espírito de equipe'],
  ['proatividade', 'Proatividade'],
  ['capacidade-argumentacao', 'Capacidade de argumentação'],
].map(([id, nome]) => ({ id, nome }));
export const teachers: readonly Person[] = [
  { id: 'professor-01', nome: 'Mariana Oliveira' },
  { id: 'professor-02', nome: 'Rafael Santos' },
];
export const courses: readonly Course[] = [
  {
    id: 'formacao',
    nome: 'Formação integral',
    modulos: [
      {
        id: 'identidade',
        nome: 'Módulo 1 · Identidade e valores',
        licoes: [
          'Quem sou eu',
          'Minhas habilidades',
          'Valores no dia a dia',
          'Escolhas e consequências',
        ],
      },
      {
        id: 'convivencia',
        nome: 'Módulo 2 · Convivência',
        licoes: [
          'Respeito às diferenças',
          'Escuta e diálogo',
          'Cooperação',
          'Resolução de conflitos',
        ],
      },
    ],
  },
  {
    id: 'projeto',
    nome: 'Projeto de vida',
    modulos: [
      {
        id: 'caminhos',
        nome: 'Módulo 1 · Meus caminhos',
        licoes: [
          'Sonhos e objetivos',
          'Reconhecendo oportunidades',
          'Planejamento pessoal',
          'Primeiros passos',
        ],
      },
      {
        id: 'comunidade',
        nome: 'Módulo 2 · Comunidade',
        licoes: [
          'Meu lugar no mundo',
          'Cuidado com o outro',
          'Ações em comunidade',
          'Projeto coletivo',
        ],
      },
    ],
  },
];
export const defaultClasses: readonly SchoolClass[] = [
  {
    id: '6a',
    nome: '6º ano A',
    cursoId: 'formacao',
    moduloId: 'identidade',
    professorId: 'professor-01',
    dias: [1, 3],
    inicio: '08:00',
    fim: '08:50',
  },
  {
    id: '6b',
    nome: '6º ano B',
    cursoId: 'formacao',
    moduloId: 'convivencia',
    professorId: 'professor-01',
    dias: [2, 4],
    inicio: '09:00',
    fim: '09:50',
  },
  {
    id: '7a',
    nome: '7º ano A',
    cursoId: 'projeto',
    moduloId: 'caminhos',
    professorId: 'professor-02',
    dias: [1, 3],
    inicio: '10:00',
    fim: '10:50',
  },
  {
    id: '7b',
    nome: '7º ano B',
    cursoId: 'projeto',
    moduloId: 'comunidade',
    professorId: 'professor-02',
    dias: [2, 4],
    inicio: '11:00',
    fim: '11:50',
  },
].map((t) => ({ ...t, ativa: true, alunoIds: students.map((a) => a.id) }));
