<script lang="ts">
	import { slide } from 'svelte/transition';
	import { mainState, getAllWidgets } from '$lib/engine/engine.svelte';
	import { activeUserIDs, sanitizeUserID, type InspectableWithProps } from '$lib/property/inspectable.svelte';

	type CompletionKind =
		| 'command'
		| 'prop-target'
		| 'prop-property'
		| 'osc-server'
		| 'osc-address'
		| 'bind-server'
		| 'bind-address';

	type Completion = {
		label: string;
		insertText: string;
		detail?: string;
		kind: CompletionKind;
		/** Replacement range in the full input string */
		replaceStart: number;
		replaceEnd: number;
		/** Desired cursor position after applying */
		cursorAfter?: number;
	};

	let {
		targets,
		property = $bindable(),
		definition,
		onStartEdit = null,
		onUpdate = null
	} = $props();

	let initExpression = $derived(property.expressionValue);
	let propValue = $derived(property ? property.getResolved() : { current: null, raw: null });
	let errorMessage = $derived(propValue.error);
	let warningMessage = $derived(propValue.warning);

	let inputEl: HTMLInputElement | null = $state(null);
	let completionListEl: HTMLDivElement | null = $state(null);
	let isFocused = $state(false);
	let draft = $state('');
	let cursor = $state(0);
	let completions = $state([] as Completion[]);
	let completionIndex = $state(0);
	let displayValue = $derived(isFocused ? draft : (property?.expressionValue ?? ''));

	type SyntaxToken = { text: string; kind: 'plain' | 'fn' | 'string' | 'punct' | 'target' | 'property' };

	function tokenizeForSyntax(textRaw: string): SyntaxToken[] {
		const text = String(textRaw ?? '');
		if (text.length === 0) return [{ text: '', kind: 'plain' }];

		const out: SyntaxToken[] = [];
		let i = 0;
		let inQuote: string | null = null;
		let escaped = false;

		const push = (kind: SyntaxToken['kind'], t: string) => {
			if (!t) return;
			const last = out.at(-1);
			if (last && last.kind === kind) last.text += t;
			else out.push({ kind, text: t });
		};

		const isIdent = (c: string) => /[a-zA-Z_]/.test(c);
		const isIdentPart = (c: string) => /[a-zA-Z0-9_]/.test(c);

		while (i < text.length) {
			const ch = text[i];

			if (inQuote) {
				push('string', ch);
				if (escaped) {
					escaped = false;
					i++;
					continue;
				}
				if (ch === '\\') {
					escaped = true;
					i++;
					continue;
				}
				if (ch === inQuote) {
					inQuote = null;
				}
				i++;
				continue;
			}

			if (ch === "'" || ch === '"' || ch === '`') {
				inQuote = ch;
				push('string', ch);
				i++;
				continue;
			}

			// highlight function names
			if (isIdent(ch)) {
				let j = i + 1;
				while (j < text.length && isIdentPart(text[j])) j++;
				const ident = text.slice(i, j);
				if (ident === 'prop' || ident === 'osc' || ident === 'bind') push('fn', ident);
				else push('plain', ident);
				i = j;
				continue;
			}

			// highlight separators that matter
			if (ch === ':' || ch === '(' || ch === ')' || ch === ',' ) {
				push('punct', ch);
				i++;
				continue;
			}
			if (ch === '/') {
				push('punct', ch);
				i++;
				continue;
			}

			push('plain', ch);
			i++;
		}

		return out;
	}

	let syntaxTokens = $derived.by(() => tokenizeForSyntax(displayValue));

	function scrollActiveCompletionIntoView() {
		if (!completionListEl) return;
		const items = completionListEl.querySelectorAll<HTMLButtonElement>('button[role="option"]');
		const el = items[completionIndex];
		if (!el) return;
		el.scrollIntoView({ block: 'nearest' });
	}

	function updateCursorFromEl() {
		if (!inputEl) return;
		cursor = inputEl.selectionStart ?? draft.length;
	}

	function commitDraft() {
		if (!property) return;
		let newValue = draft;
		if (definition?.filterFunction) {
			newValue = definition.filterFunction(newValue);
		}
		property.expressionValue = newValue.trim() === '' ? undefined : newValue;
	}

	function tokenForInsert(token: unknown): string {
		return String(token ?? '').trim();
	}

	function tokenForMatch(token: unknown): string {
		return sanitizeUserID(String(token ?? ''));
	}

	function preferredToken(obj: any): string {
		const userID = tokenForInsert(obj?.userID);
		if (userID) return userID;
		return tokenForInsert(obj?.autoID);
	}

	function resolveRelativeWidgetPath(base: InspectableWithProps, relPath: string): InspectableWithProps | null {
		const baseAuto = String((base as any)?.autoID ?? '').trim();
		if (!baseAuto) return null;
		const wanted = tokenForMatch(`${baseAuto}.${relPath}`);
		if (!wanted) return null;
		const allWidgets = getAllWidgets();
		for (const w of allWidgets) {
			if (tokenForMatch((w as any)?.autoID ?? '') === wanted) return w as any;
		}
		return null;
	}

	function resolvePropTarget(owner: InspectableWithProps | undefined, selectorRaw: string): InspectableWithProps | null {
		if (!owner) return null;
		const selector = String(selectorRaw ?? '').trim();
		const parts = selector
			.split('.')
			.map((p) => p.trim())
			.filter(Boolean);

		const startsWithThis = parts[0]?.toLowerCase() === 'this';
		if (startsWithThis) parts.shift();

		const isRelativeSelector = selector === '' || startsWithThis || parts[0]?.toLowerCase() === 'parent';
		if (isRelativeSelector) {
			let parentHops = 0;
			while (parts[0]?.toLowerCase() === 'parent') {
				parentHops++;
				parts.shift();
			}
			const base = owner.getAncestor(parentHops);
			if (!base) return null;
			if (parts.length === 0) return base;
			return resolveRelativeWidgetPath(base, parts.join('.'));
		}

		let trailingParents = 0;
		while (parts.length > 0 && parts[parts.length - 1].toLowerCase() === 'parent') {
			trailingParents++;
			parts.pop();
		}
		const tokenRaw = parts.join('.');
		const token = tokenForMatch(tokenRaw);
		let target = (activeUserIDs as any)[token] as InspectableWithProps | undefined;
		if (!target) {
			const allWidgets = getAllWidgets();
			for (const w of allWidgets) {
				if (tokenForMatch((w as any)?.autoID ?? '') === token) {
					target = w as any;
					break;
				}
			}
		}
		if (!target) return null;
		if (trailingParents > 0) {
			return target.getAncestor(trailingParents);
		}
		return target;
	}

	function listPropTargets(owner: InspectableWithProps | undefined): Array<{ token: string; detail?: string }> {
		const out: Array<{ token: string; detail?: string }> = [];

		if (owner) {
			out.push({ token: 'this', detail: 'current target' });
			let parentCount = 0;
			let cur: InspectableWithProps | null = owner;
			while (parentCount < 6) {
				cur = cur?.getParent?.() ?? null;
				if (!cur) break;
				parentCount++;
				out.push({ token: Array.from({ length: parentCount }, () => 'parent').join('.'), detail: 'ancestor' });
			}
		}

		for (const k of Object.keys(activeUserIDs)) {
			out.push({ token: k, detail: 'userID' });
		}

		for (const w of getAllWidgets()) {
			const t = preferredToken(w);
			if (t) out.push({ token: t, detail: 'widget' });
		}

		const seen: Record<string, true> = {};
		return out
			.map((x) => ({ token: tokenForInsert(x.token), detail: x.detail }))
			.filter((x) => {
				if (!x.token) return false;
				const key = tokenForMatch(x.token);
				if (!key) return false;
				if (seen[key]) return false;
				seen[key] = true;
				return true;
			})
			.sort((a, b) => a.token.localeCompare(b.token));
	}

	function listServerTargets(): Array<{ token: string; detail?: string; server?: any }> {
		const out: Array<{ token: string; detail?: string; server?: any }> = [];
		for (const s of mainState.servers ?? []) {
			const token = preferredToken(s);
			if (token) out.push({ token, detail: 'server', server: s });
		}
		for (const k of Object.keys(activeUserIDs)) {
			const obj: any = (activeUserIDs as any)[k];
			if (!obj) continue;
			const t = tokenForInsert(k);
			const type = String(obj?.iType ?? '').toLowerCase();
			if (type.includes('server')) out.push({ token: t, detail: 'server', server: obj });
		}
		const seen: Record<string, true> = {};
		return out
			.map((x) => ({ ...x, token: tokenForInsert(x.token) }))
			.filter((x) => {
				if (!x.token) return false;
				const key = tokenForMatch(x.token);
				if (!key) return false;
				if (seen[key]) return false;
				seen[key] = true;
				return true;
			})
			.sort((a, b) => a.token.localeCompare(b.token));
	}

	function listTargetProperties(target: InspectableWithProps | null): string[] {
		if (!target) return [];
		const keys = target
			.getAllSingleProps()
			.map((p) => String(p.keyPath ?? ''))
			.filter(Boolean)
			.map((k) => (k.startsWith('custom.') ? `advanced.${k.slice('custom.'.length)}` : k));
		const seen: Record<string, true> = {};
		const out = keys.filter((k) => {
			if (seen[k]) return false;
			seen[k] = true;
			return true;
		});
		out.sort((a, b) => a.localeCompare(b));
		return out;
	}

	function listOscAddresses(server: any | null): string[] {
		if (!server) return [];
		const map = (server as any).addressMap as Record<string, any> | undefined;
		if (map) {
			return Object.keys(map).sort((a, b) => a.localeCompare(b));
		}
		return [];
	}

	function splitOscAddressPrefix(prefix: string): {
		dirPrefix: string;
		segmentPrefix: string;
		segmentStartOffset: number;
	} {
		// prefix is the user-typed address prefix from the start of the address to the cursor.
		// Examples:
		//  - "/states/"   => dirPrefix "/states/", segmentPrefix "",  segmentStartOffset 8
		//  - "/states/f"  => dirPrefix "/states/", segmentPrefix "f", segmentStartOffset 8
		//  - "/"          => dirPrefix "/",       segmentPrefix "",  segmentStartOffset 1
		if (!prefix.startsWith('/')) {
			return { dirPrefix: '', segmentPrefix: prefix, segmentStartOffset: 0 };
		}
		if (prefix.endsWith('/')) {
			return { dirPrefix: prefix, segmentPrefix: '', segmentStartOffset: prefix.length };
		}
		const lastSlash = prefix.lastIndexOf('/');
		const dirPrefix = prefix.slice(0, lastSlash + 1);
		const segmentPrefix = prefix.slice(lastSlash + 1);
		return { dirPrefix, segmentPrefix, segmentStartOffset: lastSlash + 1 };
	}

	function listOscAddressLevel(
		server: any | null,
		dirPrefix: string,
		segmentPrefix: string
	): Array<{ segment: string; hasChildren: boolean }> {
		if (!server || !dirPrefix.startsWith('/')) return [];
		const seen = new Map<string, { hasChildren: boolean }>();
		for (const addr of listOscAddresses(server)) {
			if (!addr.startsWith(dirPrefix)) continue;
			const rest = addr.slice(dirPrefix.length);
			if (!rest) continue;
			const nextSlash = rest.indexOf('/');
			const segment = nextSlash === -1 ? rest : rest.slice(0, nextSlash);
			if (!segment) continue;
			if (segmentPrefix && !segment.startsWith(segmentPrefix)) continue;
			const hasChildren = nextSlash !== -1;
			const cur = seen.get(segment);
			if (!cur) seen.set(segment, { hasChildren });
			else if (hasChildren) cur.hasChildren = true;
		}
		return Array.from(seen.entries())
			.map(([segment, v]) => ({ segment, hasChildren: v.hasChildren }))
			.sort((a, b) => a.segment.localeCompare(b.segment));
	}

	function isWordChar(ch: string, mode: 'word' | 'path'): boolean {
		if (mode === 'word') return /[a-zA-Z]/.test(ch);
		return /[a-zA-Z0-9_.]/.test(ch);
	}

	function scanFragmentStart(text: string, pos: number, mode: 'word' | 'path'): number {
		let i = Math.max(0, pos);
		while (i > 0) {
			const ch = text[i - 1];
			if (!isWordChar(ch, mode)) break;
			i--;
		}
		return i;
	}

	function findOpenStringAt(text: string, pos: number): { quote: string; start: number } | null {
		let quote: string | null = null;
		let start = -1;
		let escaped = false;
		for (let i = 0; i < pos; i++) {
			const ch = text[i];
			if (escaped) {
				escaped = false;
				continue;
			}
			if (ch === '\\') {
				escaped = true;
				continue;
			}
			if (quote) {
				if (ch === quote) {
					quote = null;
					start = -1;
				}
				continue;
			}
			if (ch === "'" || ch === '"' || ch === '`') {
				quote = ch;
				start = i;
			}
		}
		if (!quote || start < 0) return null;
		return { quote, start };
	}

	function findEnclosingCall(text: string, pos: number): { name: 'prop' | 'osc' | 'bind'; openParen: number } | null {
		let inQuote: string | null = null;
		let escaped = false;
		let depth = 0;
		const stack: Array<{ name: 'prop' | 'osc' | 'bind'; openParen: number; openDepth: number }> = [];

		const isIdent = (c: string) => /[a-zA-Z_]/.test(c);
		const isIdentPart = (c: string) => /[a-zA-Z0-9_]/.test(c);

		for (let i = 0; i < pos; i++) {
			const ch = text[i];
			if (escaped) {
				escaped = false;
				continue;
			}
			if (inQuote) {
				if (ch === '\\') {
					escaped = true;
					continue;
				}
				if (ch === inQuote) inQuote = null;
				continue;
			}
			if (ch === "'" || ch === '"' || ch === '`') {
				inQuote = ch;
				continue;
			}

			if (ch === '(') {
				depth++;
				continue;
			}
			if (ch === ')') {
				depth = Math.max(0, depth - 1);
				while (stack.length > 0 && stack[stack.length - 1].openDepth > depth) {
					stack.pop();
				}
				continue;
			}

			if (!isIdent(ch)) continue;

			// parse identifier
			let j = i;
			while (j < pos && isIdentPart(text[j])) j++;
			const ident = text.slice(i, j);
			if (ident !== 'prop' && ident !== 'osc' && ident !== 'bind') {
				i = j - 1;
				continue;
			}
			// must be followed by optional spaces then '('
			let k = j;
			while (k < pos && /\s/.test(text[k])) k++;
			if (text[k] !== '(') {
				i = j - 1;
				continue;
			}
			// consume '('
			depth++;
			stack.push({ name: ident as any, openParen: k, openDepth: depth });
			i = k;
		}

		const top = stack.at(-1);
		return top ? { name: top.name, openParen: top.openParen } : null;
	}

	function computeCompletions(text: string, pos: number): Completion[] {
		const out: Completion[] = [];
		const owner = property?.owner;
		const openCall = findEnclosingCall(text, pos);

		// If we're inside the first-argument string of prop/osc/bind, complete within that string.
		if (openCall) {
			const afterParen = openCall.openParen + 1;
			let i = afterParen;
			while (i < text.length && /\s/.test(text[i])) i++;
			const quote = text[i];
			if (quote === "'" || quote === '"' || quote === '`') {
				const strStart = i;
				// find closing quote (best-effort, respecting escapes)
				let escaped = false;
				let strEnd = -1;
				for (let j = strStart + 1; j < text.length; j++) {
					const ch = text[j];
					if (escaped) {
						escaped = false;
						continue;
					}
					if (ch === '\\') {
						escaped = true;
						continue;
					}
					if (ch === quote) {
						strEnd = j;
						break;
					}
				}
				if (pos > strStart && (strEnd === -1 || pos <= strEnd)) {
					const cursorInString = Math.max(0, pos - (strStart + 1));
					const strContent = text.slice(strStart + 1, strEnd === -1 ? text.length : strEnd);

					if (openCall.name === 'prop') {
						const colonIndex = strContent.indexOf(':');
						if (colonIndex === -1 || cursorInString <= colonIndex) {
							// target selector completion
							const fragStartInStr = scanFragmentStart(strContent, cursorInString, 'path');
							const prefix = strContent.slice(fragStartInStr, cursorInString);
							const candidates = listPropTargets(owner);
							for (const c of candidates) {
								if (prefix && !tokenForMatch(c.token).startsWith(tokenForMatch(prefix))) continue;
								const shouldAddColon = colonIndex === -1;
								const insert = shouldAddColon ? `${c.token}:` : c.token;
								const replaceStart = (strStart + 1) + fragStartInStr;
								const replaceEnd = pos;
								out.push({
									label: c.token,
									insertText: insert,
									detail: c.detail,
									kind: 'prop-target',
									replaceStart,
									replaceEnd,
									cursorAfter: replaceStart + insert.length
								});
							}
						} else {
							// property completion
							const selector = strContent.slice(0, colonIndex);
							const target = resolvePropTarget(owner, selector);
							const propPrefixStart = scanFragmentStart(strContent, cursorInString, 'path');
							const prefix = strContent.slice(propPrefixStart, cursorInString);
							for (const key of listTargetProperties(target)) {
								if (prefix && !key.startsWith(prefix)) continue;
								const replaceStart = (strStart + 1) + propPrefixStart;
								const replaceEnd = pos;
								out.push({
									label: key,
									insertText: key,
									kind: 'prop-property',
									replaceStart,
									replaceEnd,
									cursorAfter: replaceStart + key.length
								});
							}
						}
					}

					if (openCall.name === 'osc' || openCall.name === 'bind') {
						const sep = strContent.indexOf(':/');
						const isBind = openCall.name === 'bind';
						const serverList = listServerTargets();
						const defaultServer = mainState.servers?.at(0) ?? null;
						const resolveServer = (tokenRaw: string): any | null => {
								const token = tokenForMatch(tokenRaw);
							if (!token) return defaultServer;
							const fromActive = (activeUserIDs as any)[token];
							if (fromActive) return fromActive;
								return (mainState.servers ?? []).find((s: any) => tokenForMatch((s as any)?.autoID ?? '') === token) ?? null;
						};

						if (sep === -1) {
							if (strContent.trim().startsWith('/')) {
								// address completion on default server
								const addressStartInStr = 0;
								const typedPrefix = strContent.slice(addressStartInStr, cursorInString);
								const { dirPrefix, segmentPrefix, segmentStartOffset } = splitOscAddressPrefix(typedPrefix);
								const segmentStartInStr = addressStartInStr + segmentStartOffset;
								for (const c of listOscAddressLevel(defaultServer, dirPrefix, segmentPrefix)) {
									const insert = c.segment + (c.hasChildren ? '/' : '');
									const replaceStart = (strStart + 1) + segmentStartInStr;
									const replaceEnd = pos;
									out.push({
										label: c.segment + (c.hasChildren ? '/' : ''),
										insertText: insert,
										kind: isBind ? 'bind-address' : 'osc-address',
										replaceStart,
										replaceEnd,
										cursorAfter: replaceStart + insert.length
									});
								}
							} else {
								// server completion
								const fragStartInStr = scanFragmentStart(strContent, cursorInString, 'path');
								const prefix = strContent.slice(fragStartInStr, cursorInString);
								for (const s of serverList) {
									if (prefix && !tokenForMatch(s.token).startsWith(tokenForMatch(prefix))) continue;
									const insert = `${s.token}:/`;
									const replaceStart = (strStart + 1) + fragStartInStr;
									const replaceEnd = pos;
									out.push({
										label: s.token,
										insertText: insert,
										detail: s.detail,
										kind: isBind ? 'bind-server' : 'osc-server',
										replaceStart,
										replaceEnd,
										cursorAfter: replaceStart + insert.length
									});
								}
							}
						} else {
							// we have server:/address
							if (cursorInString <= sep) {
								const fragStartInStr = scanFragmentStart(strContent, cursorInString, 'path');
								const prefix = strContent.slice(fragStartInStr, cursorInString);
								for (const s of serverList) {
									if (prefix && !tokenForMatch(s.token).startsWith(tokenForMatch(prefix))) continue;
									const replaceStart = (strStart + 1) + fragStartInStr;
									const replaceEnd = pos;
									out.push({
										label: s.token,
										insertText: s.token,
										detail: s.detail,
										kind: isBind ? 'bind-server' : 'osc-server',
										replaceStart,
										replaceEnd,
										cursorAfter: replaceStart + s.token.length
									});
								}
							} else {
								const serverToken = strContent.slice(0, sep);
								const srv = resolveServer(serverToken);
								// Address starts at the '/' in ":/".
								const addressStartInStr = sep + 1;
								const typedPrefix = strContent.slice(addressStartInStr, cursorInString);
								const { dirPrefix, segmentPrefix, segmentStartOffset } = splitOscAddressPrefix(typedPrefix);
								const segmentStartInStr = addressStartInStr + segmentStartOffset;
								for (const c of listOscAddressLevel(srv, dirPrefix, segmentPrefix)) {
									const insert = c.segment + (c.hasChildren ? '/' : '');
									const replaceStart = (strStart + 1) + segmentStartInStr;
									const replaceEnd = pos;
									out.push({
										label: c.segment + (c.hasChildren ? '/' : ''),
										insertText: insert,
										kind: isBind ? 'bind-address' : 'osc-address',
										replaceStart,
										replaceEnd,
										cursorAfter: replaceStart + insert.length
									});
								}
							}
						}
					}
				}
			}
		}

		// command completion (top-level)
		const openString = findOpenStringAt(text, pos);
		if (!openString) {
			const fragStart = scanFragmentStart(text, pos, 'word');
			const prefix = text.slice(fragStart, pos);
			const isAppropriate = prefix.length > 0 || text.trim() === '';
			if (isAppropriate) {
				const commands: Array<{ name: 'prop' | 'osc' | 'bind'; detail: string }> = [
					{ name: 'prop', detail: "read another property's value" },
					{ name: 'osc', detail: 'read OSC node value' },
					{ name: 'bind', detail: 'bind property to OSC node' }
				];
				for (const c of commands) {
					if (prefix && !c.name.startsWith(prefix)) continue;
					const insert = `${c.name}('')`;
					const replaceStart = fragStart;
					const replaceEnd = pos;
					// cursor inside quotes
					out.push({
						label: `${c.name}()` ,
						insertText: insert,
						detail: c.detail,
						kind: 'command',
						replaceStart,
						replaceEnd,
						cursorAfter: replaceStart + `${c.name}('`.length
					});
				}
			}
		}

		return out;
	}

	function refreshCompletions() {
		const next = computeCompletions(draft, cursor);
		completions = next;
		completionIndex = 0;
	}

	function applyCompletion(c: Completion) {
		const before = draft.slice(0, c.replaceStart);
		const after = draft.slice(c.replaceEnd);
		const nextDraft = before + c.insertText + after;
		const nextCursor = c.cursorAfter ?? (c.replaceStart + c.insertText.length);
		draft = nextDraft;
		cursor = nextCursor;
		completions = computeCompletions(nextDraft, nextCursor);
		completionIndex = 0;

		queueMicrotask(() => {
			if (!inputEl) return;
			inputEl.focus();
			inputEl.setSelectionRange(nextCursor, nextCursor);
			scrollActiveCompletionIntoView();
		});
	}
</script>

<div class="expression-editor-property">
	<div class="input-wrapper">
		<div class="syntax-overlay" aria-hidden="true">
			{#each syntaxTokens as t, idx (idx)}
				<span class={[`tok-${t.kind}`]}>{t.text}</span>
			{/each}
		</div>
	<input
		type="text"
		class="text-property {property.bindingMode ? 'binding' : ''}"
		disabled={definition.readOnly}
		bind:this={inputEl}
		value={displayValue}
		oninput={(e) => {
			draft = (e.target as HTMLInputElement).value;
			updateCursorFromEl();
			refreshCompletions();
		}}
		onclick={() => {
			updateCursorFromEl();
			refreshCompletions();
		}}
		onkeyup={(e) => {
			// Avoid resetting selection after completion navigation.
			if (
				e.key === 'ArrowDown' ||
				e.key === 'ArrowUp' ||
				e.key === 'Enter' ||
				e.key === 'Tab' ||
				e.key === 'Escape'
			) {
				return;
			}
			updateCursorFromEl();
			refreshCompletions();
		}}
		onfocus={() => {
			isFocused = true;
			draft = property?.expressionValue ?? '';
			queueMicrotask(() => {
				updateCursorFromEl();
				refreshCompletions();
			});
			onStartEdit && onStartEdit(initExpression);
		}}
		onblur={() => {
			isFocused = false;
			commitDraft();
			// completions = [];
			// completionIndex = 0;
			// onUpdate && onUpdate();
		}}
		onkeydown={(e) => {
			if (completions.length > 0) {
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					completionIndex = Math.min(completionIndex + 1, completions.length - 1);
					queueMicrotask(scrollActiveCompletionIntoView);
					return;
				}
				if (e.key === 'ArrowUp') {
					e.preventDefault();
					completionIndex = Math.max(completionIndex - 1, 0);
					queueMicrotask(scrollActiveCompletionIntoView);
					return;
				}
				if (e.key === 'Enter' || e.key === 'Tab') {
					e.preventDefault();
					applyCompletion(completions[completionIndex]);
					return;
				}
				if (e.key === 'Escape') {
					e.preventDefault();
					completions = [];
					completionIndex = 0;
					return;
				}
			}

			if (e.key === 'Enter') {
				commitDraft();
				onUpdate && onUpdate();
				(e.target as HTMLInputElement).blur();
			}
		}}
	/>
	{#if isFocused && completions.length > 0}
		<div
			class="completion-list"
			role="listbox"
			aria-label="Expression autocomplete"
			bind:this={completionListEl}
		>
			{#each completions.slice(0, 30) as c, idx (c.label + ':' + c.kind + ':' + idx)}
				<button
					type="button"
					role="option"
					aria-selected={idx === completionIndex}
					tabindex={-1}
					class={['completion-item', idx === completionIndex && 'active']}
					onmousedown={(e) => {
						e.preventDefault();
						applyCompletion(c);
					}}
				>
					<div class="completion-label">{c.label}</div>
					{#if c.detail}
						<div class="completion-detail">{c.detail}</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
	</div>
	{#if errorMessage != null}
		<div class="error-message" transition:slide={{ duration: 200 }}>
			{errorMessage}
		</div>
	{/if}

	{#if warningMessage != null}
		<div class="warning-message" transition:slide={{ duration: 200 }}>
			{warningMessage}
		</div>
	{/if}
</div>

<style>
	.expression-editor-property {
		display: flex;
		flex-direction: column;
		width: 100%;
		gap: 0.25rem;
	}

	.input-wrapper {
		position: relative;
		width: 100%;
	}

	.text-property {
		height: 100%;
		box-sizing: border-box;
		font-size: 0.75rem;
		width: 100%;
		color: var(--expression-color);
	}

	/* Syntax overlay: keep input editable, but show colored text behind it */
	.syntax-overlay {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		bottom: 0;
		pointer-events: none;
		white-space: pre;
		overflow: hidden;
		box-sizing: border-box;
		padding: 0.1rem 0.4rem;
		border-radius: var(--border-radius-medium);
		font-size: 0.75rem;
		line-height: normal;
		color: var(--text-color);
	}

	/* Make the input text transparent so the overlay shows through */
	.text-property {
		background-color: transparent;
		color: transparent;
		caret-color: var(--expression-color);
	}

	.text-property.binding {
		caret-color: var(--binding-color);
	}

	.tok-plain {
		color: rgba(from var(--text-color) r g b / 85%);
	}
	.tok-fn {
		color: var(--accent-color);
	}
	.tok-string {
		color: var(--expression-color);
	}
	.tok-punct {
		color: rgba(from var(--text-color) r g b / 55%);
	}
	.tok-target {
		color: rgba(from var(--accent-color) r g b / 90%);
	}
	.tok-property {
		color: rgba(from var(--binding-color) r g b / 90%);
	}

	.text-property.binding {
		color: transparent;
	}

	.text-property:disabled {
		background-color: var(--inspector-input-disabled-bg);
		color: rgba(from var(--text-color) r g b / 50%);
	}

	.completion-list {
		position: absolute;
		left: 0;
		right: 0;
		top: calc(100% + 0.25rem);
		z-index: 50;
		background-color: rgba(from var(--bg-color) r g b / 90%);
		border: 1px solid rgba(from var(--border-color) r g b / 30%);
		border-radius: var(--border-radius-medium);
		max-height: 14rem;
		overflow: auto;
		padding: 0.25rem;
		backdrop-filter: blur(0.3rem);
	}

	.completion-item {
		padding: 0.25rem 0.35rem;
		border-radius: 0.25rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		width: 100%;
		text-align: left;
	}

	.completion-item:hover,
	.completion-item.active {
		background-color: rgba(from var(--accent-color) r g b / 20%);
	}

	.completion-label {
		font-size: 0.75rem;
		color: var(--text-color);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.completion-detail {
		font-size: 0.65rem;
		color: rgba(from var(--text-color) r g b / 70%);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.error-message {
		padding: 0.25rem;
		background-color: rgba(from var(--error-color) r g b / 20%);
		color: var(--error-color);
		font-size: 0.75rem;
		border-radius: 4px;
	}

	.warning-message {
		padding: 0.25rem;
		background-color: rgba(from var(--warning-color) r g b / 10%);
		color: var(--warning-color);
		font-size: 0.75rem;
		border-radius: 4px;
	}
</style>
