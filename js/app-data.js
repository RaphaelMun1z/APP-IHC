"use strict";

// Dados demonstrativos compartilhados. Nenhuma senha é armazenada no navegador.
(() => {
  const keys = { classes: "ipb-turmas-v1", lessons: "ipb-aulas-v1", observations: "ipb-avaliacoes-v1", attendance: "ipb-presencas-v1", session: "ipb-sessao-v1" };
  const students = ["Ana Clara Santos", "Bruno Oliveira", "Camila Rodrigues", "Daniel Ferreira", "Eduarda Costa", "Felipe Almeida", "Gabriela Lima", "Henrique Martins", "Isabela Souza", "João Pedro Ribeiro", "Larissa Carvalho", "Lucas Barbosa", "Mariana Gomes", "Pedro Henrique Alves", "Vitória Nascimento"].map((nome, i) => ({ id: `aluno-${String(i + 1).padStart(2, "0")}`, nome }));
  const criteria = [
    ["conhecimento-conteudo", "Conhecimento do conteúdo"], ["criatividade", "Criatividade"], ["objetividade", "Objetividade"], ["concisao", "Concisão"], ["participacao", "Participação"], ["escuta-ativa-foco", "Escuta ativa e foco"], ["reatividade", "Reatividade"], ["espirito-equipe", "Espírito de equipe"], ["proatividade", "Proatividade"], ["capacidade-argumentacao", "Capacidade de argumentação"]
  ].map(([id, nome]) => ({ id, nome }));
  const teachers = [{ id: "professor-01", nome: "Mariana Oliveira" }, { id: "professor-02", nome: "Rafael Santos" }];
  const courses = [
    { id: "formacao", nome: "Formação integral", modulos: [
      { id: "identidade", nome: "Módulo 1 · Identidade e valores", licoes: ["Quem sou eu", "Minhas habilidades", "Valores no dia a dia", "Escolhas e consequências"] },
      { id: "convivencia", nome: "Módulo 2 · Convivência", licoes: ["Respeito às diferenças", "Escuta e diálogo", "Cooperação", "Resolução de conflitos"] }
    ] },
    { id: "projeto", nome: "Projeto de vida", modulos: [
      { id: "caminhos", nome: "Módulo 1 · Meus caminhos", licoes: ["Sonhos e objetivos", "Reconhecendo oportunidades", "Planejamento pessoal", "Primeiros passos"] },
      { id: "comunidade", nome: "Módulo 2 · Comunidade", licoes: ["Meu lugar no mundo", "Cuidado com o outro", "Ações em comunidade", "Projeto coletivo"] }
    ] }
  ];
  const defaults = [
    { id: "6a", nome: "6º ano A", cursoId: "formacao", moduloId: "identidade", professorId: "professor-01", dias: [1, 3], inicio: "08:00", fim: "08:50" },
    { id: "6b", nome: "6º ano B", cursoId: "formacao", moduloId: "convivencia", professorId: "professor-01", dias: [2, 4], inicio: "09:00", fim: "09:50" },
    { id: "7a", nome: "7º ano A", cursoId: "projeto", moduloId: "caminhos", professorId: "professor-02", dias: [1, 3], inicio: "10:00", fim: "10:50" },
    { id: "7b", nome: "7º ano B", cursoId: "projeto", moduloId: "comunidade", professorId: "professor-02", dias: [2, 4], inicio: "11:00", fim: "11:50" }
  ].map(t => ({ ...t, ativa: true, alunoIds: students.map(a => a.id) }));
  const clone = value => JSON.parse(JSON.stringify(value));
  let storageError = false;
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return clone(fallback);
      const value = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value) !== Array.isArray(fallback)) throw new Error("Formato inválido");
      return value;
    } catch { storageError = true; return clone(fallback); }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { throw new Error("Não foi possível salvar. Verifique se o armazenamento do navegador está disponível e tente novamente."); }
  }
  function session() {
    try {
      const value = JSON.parse(sessionStorage.getItem(keys.session));
      return value && ["professor", "coordenacao"].includes(value.perfil) ? value : null;
    } catch { return null; }
  }
  function login(username, password) {
    const role = username.trim().toLowerCase();
    if (!["professor", "coordenacao"].includes(role) || password !== "ipb123") throw new Error("Usuário ou senha incorretos.");
    const user = role === "professor" ? { id: "professor-01", nome: "Mariana Oliveira", perfil: role } : { id: "coordenacao-01", nome: "Coordenação pedagógica", perfil: role };
    try { sessionStorage.setItem(keys.session, JSON.stringify(user)); }
    catch { throw new Error("Permita o armazenamento do navegador para acessar a demonstração."); }
    return user;
  }
  const allClasses = () => read(keys.classes, defaults);
  const classes = (includeArchived = false) => allClasses().filter(t => (includeArchived || t.ativa) && (session()?.perfil === "coordenacao" || t.professorId === session()?.id));
  const getClass = id => classes(true).find(t => t.id === id);
  function requireClass(id) { const turma = getClass(id); if (!turma) throw new Error("Turma não disponível para este perfil."); return turma; }
  const course = id => courses.find(c => c.id === id);
  const moduleFor = (courseId, moduleId) => course(courseId)?.modulos.find(m => m.id === moduleId);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  function previousClassDate(weekday) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    let daysBack = (date.getDay() - weekday + 7) % 7;
    if (!daysBack) daysBack = 7;
    date.setDate(date.getDate() - daysBack);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }
  const demoLessons = defaults.map((turma, index) => ({
    id: `demo-aula-${turma.id}`, turmaId: turma.id, data: previousClassDate(turma.dias[0]),
    cursoId: turma.cursoId, moduloId: turma.moduloId, tipo: ["regular", "revisao", "PR1", "PR2"][index],
    licoes: [moduleFor(turma.cursoId, turma.moduloId).licoes[index % 4]],
    notas: ["Atividade em grupo e conversa de encerramento.", "Revisao do conteudo com participacao da turma.", "Atividade individual e troca de ideias.", "Projeto coletivo iniciado em sala."][index],
    professorId: turma.professorId, atualizadoEm: new Date().toISOString()
  }));
  const demoAttendance = Object.fromEntries(defaults.map(turma => {
    const data = previousClassDate(turma.dias[0]);
    const chamada = Object.fromEntries(students.map((aluno, index) => [aluno.id, index % 5 === 0 ? "falta" : "presente"]));
    return [turma.id, { [data]: chamada }];
  }));
  const demoObservations = Object.fromEntries(defaults.map((turma, turmaIndex) => {
    const data = previousClassDate(turma.dias[0]);
    const alunos = students.map((aluno, studentIndex) => ({
      id: aluno.id, nome: aluno.nome,
      avaliacoes: Object.fromEntries(criteria.map((criterio, criterionIndex) => {
        const mark = (studentIndex + criterionIndex + turmaIndex) % 4;
        return [criterio.id, mark === 0 ? null : mark === 1 ? "nao-ok" : "ok"];
      }))
    }));
    return [turma.id, { [data]: { alunos, atualizadoEm: new Date().toISOString(), professorId: turma.professorId } }];
  }));
  function seedDemoData() {
    const seeds = [[keys.classes, defaults], [keys.lessons, demoLessons], [keys.attendance, demoAttendance], [keys.observations, demoObservations]];
    try {
      for (const [key, value] of seeds) if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
    } catch { storageError = true; }
  }
  seedDemoData();
  const formatDate = value => value ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value + "T12:00:00")) : "—";
  const schedule = turma => `${turma.dias.map(d => ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][d]).join(" e ")} · ${turma.inicio}–${turma.fim}`;
  const roster = id => { const turma = getClass(id); return students.filter(a => turma?.alunoIds.includes(a.id)); };
  const lessons = () => { const ids = new Set(classes(true).map(t => t.id)); return read(keys.lessons, []).filter(a => ids.has(a.turmaId)); };
  function saveLesson(lesson) {
    const turma = requireClass(lesson.turmaId);
    if (!turma.ativa) throw new Error("Esta turma está arquivada.");
    const modulo = moduleFor(lesson.cursoId, lesson.moduloId);
    if (!modulo || !lesson.licoes?.length || lesson.licoes.some(l => !modulo.licoes.includes(l))) throw new Error("Selecione o módulo e pelo menos uma lição.");
    if (!lesson.data || lesson.data > today()) throw new Error("Escolha a data de uma aula já realizada.");
    if (!["regular", "revisao", "PR1", "PR2", "PR3"].includes(lesson.tipo)) throw new Error("Selecione o tipo de aula.");
    const items = read(keys.lessons, []);
    const previous = lesson.id && items.find(a => a.id === lesson.id);
    if (previous) requireClass(previous.turmaId);
    if (items.some(a => a.id !== lesson.id && a.turmaId === lesson.turmaId && a.data === lesson.data)) throw new Error("Já existe uma aula nesta data para a turma. Abra o registro no Histórico para editá-lo.");
    const saved = { ...lesson, id: previous?.id || crypto.randomUUID(), professorId: previous?.professorId || session().id, atualizadoEm: new Date().toISOString() };
    write(keys.lessons, [...items.filter(a => a.id !== saved.id), saved]);
    return saved;
  }
  function attendance() {
    let values = read(keys.attendance, {});
    if (Object.keys(values).some(k => /^\d{4}-\d{2}-\d{2}$/.test(k))) values = { "6a": values };
    return Object.fromEntries(classes(true).map(t => [t.id, values[t.id] || {}]));
  }
  const observations = () => { const all = read(keys.observations, {}); return Object.fromEntries(classes(true).map(t => [t.id, all[t.id] || {}])); };
  function saveObservation(turmaId, date, values) {
    const turma = requireClass(turmaId);
    if (!turma.ativa) throw new Error("Esta turma está arquivada.");
    if (!date || date > today()) throw new Error("Escolha uma data válida, até hoje.");
    const all = read(keys.observations, {});
    all[turmaId] ||= {};
    all[turmaId][date] = { alunos: clone(values), atualizadoEm: new Date().toISOString(), professorId: session().id };
    write(keys.observations, all);
  }
  function saveClass(turma) {
    if (session()?.perfil !== "coordenacao") throw new Error("Acesso exclusivo da coordenação.");
    if (!turma.nome.trim() || !moduleFor(turma.cursoId, turma.moduloId) || !teachers.some(p => p.id === turma.professorId)) throw new Error("Preencha os dados da turma.");
    if (!turma.dias.length || !turma.inicio || !turma.fim || turma.fim <= turma.inicio) throw new Error("Escolha os dias e um horário final posterior ao inicial.");
    if (!turma.alunoIds.length) throw new Error("Selecione pelo menos um aluno.");
    const items = allClasses();
    if (items.some(t => t.id !== turma.id && t.nome.toLocaleLowerCase() === turma.nome.trim().toLocaleLowerCase())) throw new Error("Já existe uma turma com esse nome.");
    const saved = { ...turma, nome: turma.nome.trim(), id: turma.id || crypto.randomUUID() };
    write(keys.classes, [...items.filter(t => t.id !== saved.id), saved]);
    return saved;
  }
  function history() {
    const result = lessons().map(a => ({ id: a.id, tipo: "aula", turmaId: a.turmaId, data: a.data, titulo: "Registro de aula", resumo: a.licoes.join(" · "), registro: a }));
    for (const [turmaId, dates] of Object.entries(attendance())) for (const [data, values] of Object.entries(dates)) {
      const present = Object.values(values).filter(v => v === "presente").length;
      const absent = Object.values(values).filter(v => v === "falta").length;
      if (present + absent) result.push({ id: `frequencia-${turmaId}-${data}`, tipo: "frequencia", turmaId, data, titulo: "Frequência", resumo: `${present} presentes · ${absent} faltas`, registro: values });
    }
    for (const [turmaId, dates] of Object.entries(observations())) for (const [data, value] of Object.entries(dates)) {
      const marks = (value.alunos || []).flatMap(a => Object.values(a.avaliacoes));
      result.push({ id: `avaliacao-${turmaId}-${data}`, tipo: "avaliacao", turmaId, data, titulo: "Avaliação observacional", resumo: `${marks.filter(v => v === "ok").length} OK · ${marks.filter(v => v === "nao-ok").length} Não OK`, registro: value });
    }
    return result.sort((a, b) => b.data.localeCompare(a.data) || a.titulo.localeCompare(b.titulo));
  }
  window.AppData = Object.freeze({ keys, students, criteria, teachers, courses, today, formatDate, schedule, course, moduleFor, session, login, logout: () => sessionStorage.removeItem(keys.session), classes, getClass, roster, lessons, saveLesson, attendance, observations, saveObservation, saveClass, history, hasStorageError: () => storageError });
})();
