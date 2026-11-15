import type { ActivatedRouteSnapshot, Router } from '@angular/router';
import { safeReturn } from '../auth/auth.guards';

export function navigationUrl(router: Router): string {
  const navigation = router.currentNavigation();
  return router.serializeUrl(
    navigation?.finalUrl ?? navigation?.extractedUrl ?? router.parseUrl(router.url),
  );
}

/** Recover the originating class list even from a record/editor return chain. */
function findClassListReturn(raw: string | null, router: Router): string {
  for (let depth = 0; raw && depth < 10; depth++) {
    const safe = safeReturn(raw);
    const tree = router.parseUrl(safe);
    const path = tree.root.children['primary']?.segments.map((segment) => segment.path).join('/');
    if (path === 'turmas') return safe;
    raw = tree.queryParamMap.get('retorno');
  }
  return '/turmas';
}
export function classListReturn(route: ActivatedRouteSnapshot, router: Router): string {
  return findClassListReturn(route.queryParamMap.get('retorno'), router);
}
export function classListReturnFromUrl(url: string, router: Router): string {
  return findClassListReturn(router.parseUrl(url).queryParamMap.get('retorno'), router);
}

/** Path identity wins over legacy query parameters. */
export function contextParam(route: ActivatedRouteSnapshot, key: string): string | null {
  for (const node of [...route.pathFromRoot].reverse()) {
    const value = node.paramMap.get(key);
    if (value) return value;
  }
  return route.queryParamMap.get(key);
}
export function returnTo(route: ActivatedRouteSnapshot, fallback: string): string {
  const raw = route.queryParamMap.get('retorno');
  const safe = safeReturn(raw);
  return raw && (safe !== '/inicio' || raw === '/inicio') ? safe : fallback;
}
