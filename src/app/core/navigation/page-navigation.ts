import { Injectable, computed, inject } from '@angular/core';
import { NavigationEnd, Router, type UrlTree } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ClassesStore } from '../../features/classes/classes.store';
import { HistoryStore } from '../../features/history/history.store';
import { navigationUrl } from './context';
import { safeReturn } from '../auth/auth.guards';
import { formatDate } from '../../shared/utils/dates';

export interface BreadcrumbItem {
  readonly label: string;
  readonly url: string;
}
export interface PageInformation {
  readonly title: string;
  readonly crumbs: readonly BreadcrumbItem[];
  readonly parent: string;
  readonly context?: string;
}

@Injectable({ providedIn: 'root' })
export class PageNavigation {
  private readonly router = inject(Router);
  private readonly classes = inject(ClassesStore);
  private readonly history = inject(HistoryStore);
  readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: navigationUrl(this.router) },
  );
  readonly page = computed<PageInformation>(() => {
    const tree = this.router.parseUrl(this.url());
    const segments = tree.root.children['primary']?.segments.map((segment) => segment.path) ?? [];
    const root = segments[0] ?? 'inicio';
    const query = tree.queryParamMap;
    const home: BreadcrumbItem = { label: 'Início', url: '/inicio' };
    const classes: BreadcrumbItem = { label: 'Turmas', url: '/turmas' };
    const audit: BreadcrumbItem = { label: 'Auditoria', url: '/historico' };
    const record = this.history
      .records()
      .find(
        (item) =>
          (root !== 'turmas' || item.turmaId === segments[1]) &&
          item.id ===
            (root === 'historico'
              ? segments[1]
              : root === 'turmas'
                ? segments[3]
                : query.get('id')),
      );
    const classId = root === 'turmas' ? segments[1] : (query.get('turma') ?? record?.turmaId);
    const group = this.classes.get(classId ?? '');
    const classUrl = `/turmas/${encodeURIComponent(classId ?? '')}`;
    const groupCrumb: BreadcrumbItem = {
      label: group?.nome ?? 'Turma indisponível',
      url: classUrl + '/visao-geral',
    };
    const contextual = root === 'turmas' && !!segments[1];
    const crumbs: BreadcrumbItem[] = contextual ? [home, classes, groupCrumb] : [home];
    let title = 'Início';
    let parent = '/inicio';
    let context: string | undefined;
    const add = (label: string, url: string) => crumbs.push({ label, url });
    const recordLabel = record
      ? `${record.titulo} · ${formatDate(record.data)}`
      : 'Registro indisponível';
    if (contextual) {
      context = undefined;
      const section = segments[2] ?? 'visao-geral';
      parent = '/turmas';
      const lessonSection = section === 'registros' ? segments[4] : undefined;
      const labels: Record<string, string> = {
        alunos: 'Alunos',
        aulas: 'Aulas',
        frequencia: 'Frequência',
        avaliacoes: 'Avaliações',
        gerenciar: 'Gerenciar turma',
      };
      if (section === 'registros') {
        if (record?.tipo === 'aula') add('Aulas', classUrl + '/aulas');
        else if (record)
          add(
            record.tipo === 'frequencia' ? 'Frequência' : 'Avaliações',
            classUrl + (record.tipo === 'frequencia' ? '/frequencia' : '/avaliacoes'),
          );
        title = recordLabel;
        add(title, classUrl + '/registros/' + encodeURIComponent(segments[3] ?? ''));
        if (lessonSection && labels[lessonSection]) {
          title = labels[lessonSection];
          add(title, this.url());
          parent = classUrl + '/registros/' + encodeURIComponent(segments[3] ?? '');
        } else {
          parent = crumbs.at(-2)!.url;
        }
      } else if (section !== 'visao-geral') {
        title = labels[section] ?? 'Página não encontrada';
        add(title, classUrl + '/' + section);
        parent = groupCrumb.url;
        if (section === 'aulas' && segments[3]) {
          title = segments[3] === 'nova' ? 'Registrar aula' : 'Editar aula';
          add(title, this.url());
          parent = classUrl + '/aulas';
        }
      }
      const subpage =
        section === 'registros'
          ? `${recordLabel}${lessonSection && labels[lessonSection] ? ` · ${labels[lessonSection]}` : ''}`
          : section === 'visao-geral'
            ? 'Visão geral'
            : section === 'aulas' && segments[3]
              ? segments[3] === 'nova'
                ? 'Registrar aula'
                : 'Editar aula'
              : (labels[section] ?? 'Página não encontrada');
      title = `${group?.nome ?? 'Turma indisponível'} · ${subpage}`;
    } else if (root === 'turmas') {
      title = 'Minhas turmas';
      add('Turmas', '/turmas');
    } else if (root === 'historico') {
      title = 'Auditoria';
      crumbs.push(audit);
      if (segments[1]) {
        title = recordLabel;
        add(title, this.url());
        parent = '/historico';
      }
    } else if (root === 'turma-form') {
      title = classId ? 'Editar turma' : 'Nova turma';
      if (group) {
        crumbs.push(classes, groupCrumb);
        parent = groupCrumb.url;
      } else {
        crumbs.push(classes);
        parent = '/turmas';
      }
      add(title, this.url());
    } else if (['registro-aula', 'presencas', 'avaliacao'].includes(root)) {
      if (group) {
        crumbs.push(classes, groupCrumb);
        parent = groupCrumb.url;
      }
      if (root === 'registro-aula') {
        if (group) add('Aulas', classUrl + '/aulas');
        title = query.has('id') ? 'Editar aula' : 'Registrar aula';
        parent = group ? classUrl + '/aulas' : '/turmas';
      } else title = root === 'presencas' ? 'Frequência' : 'Avaliações';
      add(title, this.url());
    } else if (root !== 'inicio') {
      title = 'Página não encontrada';
      add(title, this.url());
    }
    return { title, crumbs, parent, context };
  });
  readonly back = computed<UrlTree>(() => {
    const raw = this.router.parseUrl(this.url()).queryParamMap.get('retorno');
    const candidate = safeReturn(raw);
    return this.router.parseUrl(
      raw && (candidate !== '/inicio' || raw === '/inicio') && candidate !== this.url()
        ? candidate
        : this.page().parent,
    );
  });
}
