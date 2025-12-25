import { browser } from '$app/environment';
import { page } from '$app/state';

export type UrlQueryValue = string | string[];

export const requestContext = $state({
    method: 'GET' as string
});

export function setRequestContext(patch: { method?: string }) {
    if (patch.method != null) requestContext.method = String(patch.method).toUpperCase();
}

export const urlInfo = $state({
    href: '' as string,
    origin: '' as string,
    protocol: '' as string,
    host: '' as string,
    hostname: '' as string,
    port: '' as string,
    pathname: '' as string,
    search: '' as string,
    hash: '' as string,
    query: {} as Record<string, UrlQueryValue>,
    params: {} as Record<string, string>,
    routeId: null as string | null,
    method: requestContext.method
});

function buildQuery(searchParams: URLSearchParams): Record<string, UrlQueryValue> {
    const out: Record<string, UrlQueryValue> = {};
    for (const key of new Set(Array.from(searchParams.keys()))) {
        const all = searchParams.getAll(key);
        out[key] = all.length <= 1 ? (all[0] ?? '') : all;
    }
    return out;
}

if (browser) {
    $effect.root(() => {
        $effect(() => {
            const url = page.url;
            urlInfo.href = url.href;
            urlInfo.origin = url.origin;
            urlInfo.protocol = url.protocol;
            urlInfo.host = url.host;
            urlInfo.hostname = url.hostname;
            urlInfo.port = url.port;
            urlInfo.pathname = url.pathname;
            urlInfo.search = url.search;
            urlInfo.hash = url.hash;
            urlInfo.query = buildQuery(url.searchParams);
            urlInfo.params = { ...(page.params ?? {}) };
            urlInfo.routeId = (page as any).route?.id ?? null;
        });
    });
}

export function urlGet(path: string, fallback?: unknown): unknown {
    const p = String(path ?? '').trim();
    if (p === '') return urlInfo.href;

    // Common fields
    if (p === 'href') return urlInfo.href;
    if (p === 'origin') return urlInfo.origin;
    if (p === 'protocol') return urlInfo.protocol;
    if (p === 'host') return urlInfo.host;
    if (p === 'hostname') return urlInfo.hostname;
    if (p === 'port') return urlInfo.port;
    if (p === 'pathname') return urlInfo.pathname;
    if (p === 'search') return urlInfo.search;
    if (p === 'hash') return urlInfo.hash;
    if (p === 'routeId') return urlInfo.routeId;
    if (p === 'method') return urlInfo.method;

    // Query params: query.foo
    if (p.startsWith('query.')) {
        const k = p.slice('query.'.length);
        const v = (urlInfo.query as any)[k];
        return v ?? fallback;
    }

    // Route params: params.id
    if (p.startsWith('params.')) {
        const k = p.slice('params.'.length);
        const v = (urlInfo.params as any)[k];
        return v ?? fallback;
    }

    return fallback;
}
