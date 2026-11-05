import { renderTutorial } from './render.js';
import { cssEscape, highlightAnnotations, normalizeSpace, readAnnotationPositions, readLocatedAnnotations } from './highlight.js';
import { createUi, cn } from './ui.js';
import { TAILWIND_CSS } from './generated-css.js';
import zh from '../locale/zh.json';
import en from '../locale/en.json';

const NS = 'tutorialReview';
const PANEL_ID = 'tutorial-review';
const STORAGE_KEY = 'dsh.tutorial-review.lesson';
const ENHANCE_CACHE_PREFIX = 'dsh.tutorial-review.enhance.v2:';
const DICTIONARIES = { zh, en };

export function createPlugin(React) {
  const h = React.createElement;
  const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React;
  const ui = createUi(h);
  const { Button, Badge, Input, Separator, Skeleton } = ui;

  function fallbackT(key, vars) {
    const lang = typeof navigator !== 'undefined' && String(navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    return interpolate(DICTIONARIES[lang]?.[key] ?? DICTIONARIES.zh[key] ?? key, vars);
  }

  function PanelIcon({ size = 16, active } = {}) {
    return h(
      'svg',
      {
        width: size,
        height: size,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: active ? 1.9 : 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      },
      h('path', { d: 'M6.5 3.75h7.6L19 8.6v10.15a1.5 1.5 0 0 1-1.5 1.5h-11a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z' }),
      h('path', { d: 'M14 3.9v4.8h4.8' }),
      h('path', { d: 'M8.25 12.2h6.4M8.25 15.6h4.2' }),
      h('path', { d: 'M7.1 18.8h6.1', strokeWidth: 3.2, opacity: 0.32 }),
    );
  }

  function ReviewPage(props) {
    const t = typeof props.t === 'function' ? props.t : fallbackT;
    const [manifest, setManifest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [notice, setNotice] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [doc, setDoc] = useState(null);
    const [docLoading, setDocLoading] = useState(false);
    const [docError, setDocError] = useState('');
    const [query, setQuery] = useState('');
    const [collapsed, setCollapsed] = useState(() => new Set());
    const [activeId, setActiveId] = useState('');
    const [located, setLocated] = useState([]);
    const [positions, setPositions] = useState([]);
    const [focusAnn, setFocusAnn] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshedAt, setRefreshedAt] = useState(null);
    const [railOpen, setRailOpen] = useState(false);
    const [navOpen, setNavOpen] = useState(false);
    const [assistByLesson, setAssistByLesson] = useState({});
    const [enhanceByLesson, setEnhanceByLesson] = useState({});
    const [enhanceNonce, setEnhanceNonce] = useState(0);
    const [selectionMenu, setSelectionMenu] = useState(null);
    const [copiedId, setCopiedId] = useState('');
    const forceEnhance = useRef(false);
    const enhanceRequests = useRef(new Map());
    const enhanceSeq = useRef(new Map());
    const activeSource = useRef('mark');
    const assistSeq = useRef(0);
    const docRequest = useRef(0);
    const cardRefs = useRef(new Map());
    const mounted = useRef(true);

    useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
      };
    }, []);

    const fetchJson = useCallback(async (url) => {
      const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) {
        let detail = '';
        try {
          const body = await response.json();
          detail = body?.message || body?.error || '';
        } catch {
          detail = '';
        }
        throw new Error(detail || `HTTP ${response.status}`);
      }
      return response.json();
    }, []);

    const loadDoc = useCallback(
      async (lessonId, options = {}) => {
        if (!lessonId) return;
        const request = ++docRequest.current;
        setDocLoading(true);
        setDocError('');
        try {
          const next = await fetchJson(`/api/tutorial-review/doc?path=${encodeURIComponent(lessonId)}&t=${Date.now()}`);
          if (!mounted.current || request !== docRequest.current) return;
          setDoc(next);
          setSelectedId(lessonId);
          setNotice('');
          if (!options.keepActive) {
            setActiveId('');
            setFocusAnn(null);
          }
          setLocated([]);
          setPositions([]);
          try {
            localStorage.setItem(STORAGE_KEY, lessonId);
          } catch {
            /* storage may be unavailable */
          }
        } catch (error) {
          if (!mounted.current || request !== docRequest.current) return;
          setDocError(error instanceof Error ? error.message : String(error));
          setDoc(null);
        } finally {
          if (mounted.current && request === docRequest.current) setDocLoading(false);
        }
      },
      [fetchJson],
    );

    useEffect(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        setLoadError('');
        try {
          const nextManifest = await fetchJson(`/api/tutorial-review/manifest?t=${Date.now()}`);
          if (cancelled) return;
          setManifest(nextManifest);
          setRefreshedAt(new Date());
          const lessons = flattenLessons(nextManifest);
          let saved = '';
          try {
            saved = localStorage.getItem(STORAGE_KEY) || '';
          } catch {
            saved = '';
          }
          const preferred = lessons.find((lesson) => lesson.annotationCount > 0)?.lessonId;
          const target = lessons.some((lesson) => lesson.lessonId === saved) ? saved : preferred || lessons[0]?.lessonId;
          if (target) await loadDoc(target);
        } catch (error) {
          if (cancelled) return;
          setLoadError(error instanceof Error ? error.message : String(error));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [fetchJson, loadDoc]);

    const lessons = useMemo(() => flattenLessons(manifest), [manifest]);
    const cachedEnhanceCounts = useMemo(() => {
      const counts = {};
      if (!manifest) return counts;
      for (const lesson of lessons) {
        const cached = readEnhanceCache(`${ENHANCE_CACHE_PREFIX}${lesson.lessonId}`, lesson.mtime);
        if (cached) counts[lesson.lessonId] = countEnhanceData(cached.data);
      }
      return counts;
    }, [manifest, lessons]);
    const autoCountFor = (lesson) => {
      if (!lesson) return 0;
      const entry = enhanceByLesson[lesson.lessonId];
      if (entry?.data) return countEnhanceData(entry.data);
      return cachedEnhanceCounts[lesson.lessonId] || 0;
    };
    const totalAutoCount = useMemo(
      () =>
        lessons.reduce((sum, lesson) => {
          const entry = enhanceByLesson[lesson.lessonId];
          return sum + (entry?.data ? countEnhanceData(entry.data) : cachedEnhanceCounts[lesson.lessonId] || 0);
        }, 0),
      [lessons, enhanceByLesson, cachedEnhanceCounts],
    );
    const currentIndex = lessons.findIndex((lesson) => lesson.lessonId === selectedId);
    const currentLesson = currentIndex >= 0 ? lessons[currentIndex] : null;
    const course = useMemo(() => {
      if (!manifest || !doc) return null;
      return manifest.courses.find((item) => item.id === doc.courseId) || null;
    }, [manifest, doc]);

    const filteredCourses = useMemo(() => {
      if (!manifest) return [];
      const term = query.trim().toLowerCase();
      if (!term) return manifest.courses;
      return manifest.courses
        .map((item) => {
          const sections = item.sections
            .map((section) => ({
              ...section,
              lessons: section.lessons.filter((lesson) => matchesQuery(lesson, item, term)),
            }))
            .filter((section) => section.lessons.length > 0);
          return { ...item, sections };
        })
        .filter((item) => item.sections.length > 0);
    }, [manifest, query]);

    const annotations = useMemo(() => normalizeAnnotations(doc?.annotations || []), [doc]);
    const assistAnnotations = useMemo(
      () => (doc?.lessonId ? assistByLesson[doc.lessonId] || [] : []).map((item) => ({ ...item, kind: 'assist', key: item.id })),
      [assistByLesson, doc?.lessonId],
    );
    const enhanceEntry = useMemo(
      () => (doc?.lessonId ? enhanceByLesson[doc.lessonId] : undefined),
      [enhanceByLesson, doc?.lessonId],
    );
    const enhanceData = enhanceEntry?.data;
    const proofreadAnnotations = useMemo(() => {
      if (!doc?.lessonId || !enhanceData?.issues?.length) return [];
      return enhanceData.issues.map((issue, index) => ({
        id: `enh-proof-${doc.lessonId}-${index}`,
        kind: 'proofread',
        issueType: issue.type === 'typo' ? 'typo' : 'grammar',
        quote: issue.quote,
        category: issue.type === 'typo' ? t('typo') : t('grammar'),
        suggestion: issue.suggestion,
        reason: issue.reason,
        comment: issue.reason,
        key: `enh-proof-${index}`,
      }));
    }, [doc?.lessonId, enhanceData, t]);
    const internalLinkAnnotations = useMemo(() => {
      if (!doc?.lessonId || !enhanceData?.internalLinks?.length) return [];
      return enhanceData.internalLinks.map((link, index) => ({
        id: `enh-in-${doc.lessonId}-${index}`,
        kind: 'link',
        linkType: 'internal',
        quote: link.quote,
        category: t('internalLinks'),
        title: link.title,
        lessonId: link.lessonId,
        reason: link.reason,
        comment: link.reason,
        key: `enh-in-${index}`,
      }));
    }, [doc?.lessonId, enhanceData, t]);
    const externalLinkAnnotations = useMemo(() => {
      if (!doc?.lessonId || !enhanceData?.externalLinks?.length) return [];
      return enhanceData.externalLinks.map((link, index) => ({
        id: `enh-ex-${doc.lessonId}-${index}`,
        kind: 'link',
        linkType: 'external',
        quote: link.quote,
        category: t('externalLinks'),
        title: link.title,
        url: link.url,
        domain: link.domain,
        snippet: link.snippet,
        reason: link.reason,
        comment: link.reason,
        key: `enh-ex-${index}`,
      }));
    }, [doc?.lessonId, enhanceData, t]);
    const reviewEnhanceAnnotations = useMemo(
      () => [...proofreadAnnotations, ...internalLinkAnnotations, ...externalLinkAnnotations],
      [proofreadAnnotations, internalLinkAnnotations, externalLinkAnnotations],
    );
    const allAnnotations = useMemo(
      () => [...annotations, ...assistAnnotations, ...reviewEnhanceAnnotations],
      [annotations, assistAnnotations, reviewEnhanceAnnotations],
    );
    const annotationById = useMemo(() => new Map(allAnnotations.map((item) => [item.id, item])), [allAnnotations]);
    const positionById = useMemo(() => new Map(positions.map((item) => [item.id, item.start])), [positions]);
    const reviewCards = useMemo(() => {
      const cards = [...annotations, ...reviewEnhanceAnnotations];
      return cards.sort((a, b) => {
        const left = positionById.get(a.id);
        const right = positionById.get(b.id);
        if (left == null && right == null) return 0;
        if (left == null) return 1;
        if (right == null) return -1;
        return left - right;
      });
    }, [annotations, reviewEnhanceAnnotations, positionById]);
    const locatedOrder = useMemo(() => new Map(located.map((item) => [item.id, item.index])), [located]);
    const rendered = useMemo(() => {
      if (!doc) return { html: '', error: false };
      return renderTutorial(doc.source, { lessonId: doc.lessonId });
    }, [doc]);

    const handleLocated = useCallback((next) => {
      setLocated((previous) => (sameLocated(previous, next) ? previous : next));
    }, []);

    const handlePositions = useCallback((next) => {
      setPositions((previous) => (samePositions(previous, next) ? previous : next));
    }, []);

    const handleMarkSelect = useCallback((id) => {
      if (!id) return;
      activeSource.current = 'mark';
      setActiveId(id);
    }, []);

    const handleRailSelect = useCallback((id) => {
      if (!id) return;
      activeSource.current = 'rail';
      setActiveId(id);
      setFocusAnn({ id, token: Date.now() });
    }, []);

    useEffect(() => {
      if (!activeId || activeSource.current !== 'mark') return;
      const card = cardRefs.current.get(activeId);
      if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [activeId]);

    useEffect(() => {
      setRailOpen(false);
    }, [selectedId]);

    const selectLesson = useCallback(
      (lessonId) => {
        if (!lessonId) return;
        if (lessonId === selectedId) {
          setRailOpen(false);
          setNavOpen(false);
          return;
        }
        loadDoc(lessonId);
        setNavOpen(false);
      },
      [loadDoc, selectedId],
    );

    const refresh = useCallback(async () => {
      if (refreshing) return;
      setRefreshing(true);
      try {
        const nextManifest = await fetchJson(`/api/tutorial-review/manifest?t=${Date.now()}`);
        setManifest(nextManifest);
        setRefreshedAt(new Date());
        const available = flattenLessons(nextManifest);
        const preferred = available.find((lesson) => lesson.annotationCount > 0)?.lessonId;
        const target = available.some((lesson) => lesson.lessonId === selectedId) ? selectedId : preferred || available[0]?.lessonId;
        if (target) {
          forceEnhance.current = true;
          await loadDoc(target, { keepActive: true });
        }
        setEnhanceNonce((nonce) => nonce + 1);
        setLoadError('');
        setNotice('');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!manifest) setLoadError(message);
        else setNotice(message);
      } finally {
        if (mounted.current) setRefreshing(false);
      }
    }, [fetchJson, loadDoc, manifest, refreshing, selectedId]);

    const toggleCourse = useCallback((courseId) => {
      setCollapsed((previous) => {
        const next = new Set(previous);
        if (next.has(courseId)) next.delete(courseId);
        else next.add(courseId);
        return next;
      });
    }, []);

    const goRelative = useCallback(
      (offset) => {
        const next = lessons[currentIndex + offset];
        if (next) loadDoc(next.lessonId);
      },
      [currentIndex, lessons, loadDoc],
    );

    const addAssist = useCallback((lessonId, item) => {
      setAssistByLesson((previous) => ({
        ...previous,
        [lessonId]: [...(previous[lessonId] || []), item],
      }));
    }, []);

    const updateAssist = useCallback((lessonId, id, patch) => {
      setAssistByLesson((previous) => {
        const list = previous[lessonId] || [];
        return {
          ...previous,
          [lessonId]: list.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        };
      });
    }, []);

    const replaceAssist = useCallback((lessonId, id, items) => {
      setAssistByLesson((previous) => {
        const list = previous[lessonId] || [];
        const index = list.findIndex((item) => item.id === id);
        const next = list.filter((item) => item.id !== id);
        const at = index < 0 ? next.length : index;
        next.splice(at, 0, ...items);
        return { ...previous, [lessonId]: next };
      });
    }, []);

    const runAssist = useCallback(
      async ({ task, selection, context = '', scope = 'selection' }, existingId) => {
        const lessonId = doc?.lessonId;
        if (!lessonId || !selection) return;
        const id = existingId || `assist-${Date.now()}-${(assistSeq.current += 1)}`;
        if (existingId) {
          updateAssist(lessonId, existingId, { status: 'loading', error: '', comment: '' });
        } else {
          addAssist(lessonId, {
            id,
            kind: 'assist',
            assistType: task,
            quote: selection,
            category: assistLabel(task, t),
            comment: '',
            status: 'loading',
            createdAt: Date.now(),
            context,
            scope,
          });
        }
        setActiveId(id);
        setSelectionMenu(null);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 120000);
        try {
          const response = await fetch('/api/tutorial-review/assist', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ task, lessonId, selection, context, scope }),
            signal: controller.signal,
          });
          let payload = null;
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }
          if (!response.ok) throw new Error(payload?.message || `HTTP ${response.status}`);
          if (!payload || payload.kind !== task) throw new Error(t('assistFailed'));
          const links = Array.isArray(payload.links) ? payload.links : [];
          const linkTask = task === 'internal-links' || task === 'external-links';
          if (linkTask && links.length > 0) {
            const cards = links.map((link, index) => ({
              id: `${id}-${index}`,
              kind: 'assist',
              assistType: task,
              quote: link.quote || selection,
              category: assistLabel(task, t),
              comment: index === 0 ? payload.note || '' : '',
              status: 'done',
              result: { ...payload, links: [link], fallback: index === 0 ? payload.fallback : false },
              note: index === 0 ? payload.note || '' : '',
              createdAt: Date.now() + index,
              context,
              scope,
            }));
            replaceAssist(lessonId, id, cards);
            setActiveId(cards[0].id);
          } else {
            updateAssist(lessonId, id, {
              status: 'done',
              result: payload,
              note: payload.note || '',
              comment: payload.note || '',
            });
          }
        } catch (error) {
          const message =
            error?.name === 'AbortError'
              ? t('assistTimeout')
              : error instanceof Error
                ? error.message
                : String(error);
          updateAssist(lessonId, id, { status: 'error', error: message, comment: '' });
        } finally {
          clearTimeout(timer);
        }
      },
      [addAssist, doc?.lessonId, replaceAssist, t, updateAssist],
    );

    const retryAssist = useCallback(
      (annotation) => {
        if (!annotation || !doc) return;
        runAssist(
          {
            task: annotation.assistType,
            selection: annotation.quote,
            context: annotation.context || '',
            scope: annotation.scope || 'selection',
          },
          annotation.id,
        );
      },
      [doc, runAssist],
    );

    const copyAssist = useCallback(async (annotation) => {
      const text = assistCopyText(annotation, t);
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else fallbackCopy(text);
        setCopiedId(annotation.id);
        setTimeout(() => {
          if (mounted.current) setCopiedId('');
        }, 1600);
      } catch {
        /* clipboard may be unavailable */
      }
    }, [t]);

    const startSelectionAssist = useCallback(
      (task) => {
        const menu = selectionMenu;
        if (!menu || !doc) return;
        window.getSelection()?.removeAllRanges();
        runAssist({ task, selection: menu.text, context: menu.context, scope: 'selection' });
      },
      [doc, runAssist, selectionMenu],
    );

    const runEnhance = useCallback(
      async (target, force = false) => {
        const lessonId = target?.lessonId;
        if (!lessonId) return;
        const mtime = target.mtime;
        const key = `${ENHANCE_CACHE_PREFIX}${lessonId}`;
        if (force) {
          try {
            localStorage.removeItem(key);
          } catch {
            /* storage may be unavailable */
          }
        } else {
          const cached = readEnhanceCache(key, mtime);
          if (cached) {
            setEnhanceByLesson((previous) => ({
              ...previous,
              [lessonId]: { status: 'done', data: cached.data, generatedAt: cached.generatedAt, mtime },
            }));
            return;
          }
        }
        if (!force && enhanceRequests.current.get(lessonId) === mtime) return;
        const seq = (enhanceSeq.current.get(lessonId) || 0) + 1;
        enhanceSeq.current.set(lessonId, seq);
        enhanceRequests.current.set(lessonId, mtime);
        setEnhanceByLesson((previous) => ({
          ...previous,
          [lessonId]: { ...(previous[lessonId] || {}), status: 'loading', mtime },
        }));

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 180000);
        try {
          const response = await fetch('/api/tutorial-review/assist', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              task: 'review-enhance',
              lessonId,
              selection: target.title,
              context: '',
              scope: 'lesson',
            }),
            signal: controller.signal,
          });
          let payload = null;
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }
          if (!response.ok) throw new Error(payload?.message || `HTTP ${response.status}`);
          if (!payload || payload.kind !== 'review-enhance') throw new Error(t('reviewEnhanceFailed'));
          if (enhanceSeq.current.get(lessonId) !== seq) return;
          const data = {
            issues: Array.isArray(payload.issues) ? payload.issues : [],
            internalLinks: Array.isArray(payload.internalLinks) ? payload.internalLinks : [],
            externalLinks: Array.isArray(payload.externalLinks) ? payload.externalLinks : [],
            note: payload.note || '',
            sourcesNote: payload.sourcesNote || '',
          };
          const generatedAt = Date.now();
          try {
            localStorage.setItem(key, JSON.stringify({ mtime, generatedAt, data }));
          } catch {
            /* storage may be unavailable */
          }
          setEnhanceByLesson((previous) => ({
            ...previous,
            [lessonId]: { status: 'done', data, generatedAt, mtime },
          }));
        } catch (error) {
          if (enhanceSeq.current.get(lessonId) !== seq) return;
          const message =
            error?.name === 'AbortError'
              ? t('assistTimeout')
              : error instanceof Error
                ? error.message
                : String(error);
          setEnhanceByLesson((previous) => ({
            ...previous,
            [lessonId]: { ...(previous[lessonId] || {}), status: 'error', error: message, mtime },
          }));
        } finally {
          clearTimeout(timer);
          if (enhanceSeq.current.get(lessonId) === seq) enhanceRequests.current.delete(lessonId);
        }
      },
      [t],
    );

    const regenerateEnhance = useCallback(() => {
      if (doc) runEnhance(doc, true);
    }, [doc, runEnhance]);

    useEffect(() => {
      if (!doc) return;
      const force = forceEnhance.current;
      forceEnhance.current = false;
      runEnhance(doc, force);
    }, [doc?.lessonId, doc?.mtime, enhanceNonce, runEnhance]);

    useEffect(() => {
      if (!doc) return undefined;
      let frame = 0;
      const clear = () => setSelectionMenu(null);
      const measure = () => {
        frame = 0;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          clear();
          return;
        }
        const range = selection.getRangeAt(0);
        const body = document.querySelector('.tr-doc-body');
        if (!body || !body.contains(range.commonAncestorContainer)) {
          clear();
          return;
        }
        const startElement =
          range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
        if (!startElement || startElement.closest?.('pre, code, [data-no-annotate]')) {
          clear();
          return;
        }
        const text = normalizeSpace(selection.toString());
        if (text.length < 4) {
          clear();
          return;
        }
        const rect =
          typeof range.getBoundingClientRect === 'function'
            ? range.getBoundingClientRect()
            : startElement.getBoundingClientRect?.();
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          clear();
          return;
        }
        const half = Math.min(140, Math.max(70, window.innerWidth / 2 - 12));
        const left = Math.min(
          window.innerWidth - half - 8,
          Math.max(half + 8, rect.left + rect.width / 2),
        );
        let top = rect.bottom + 10;
        if (top + 82 > window.innerHeight) top = Math.max(16, rect.top - 72);
        setSelectionMenu({ text, context: readSelectionContext(range), left, top });
      };
      const schedule = () => {
        if (frame) return;
        frame = requestAnimationFrame(measure);
      };
      const hide = () => setSelectionMenu(null);
      document.addEventListener('selectionchange', schedule);
      document.addEventListener('mouseup', schedule);
      document.addEventListener('keyup', schedule);
      window.addEventListener('scroll', hide, true);
      window.addEventListener('resize', hide);
      return () => {
        if (frame) cancelAnimationFrame(frame);
        document.removeEventListener('selectionchange', schedule);
        document.removeEventListener('mouseup', schedule);
        document.removeEventListener('keyup', schedule);
        window.removeEventListener('scroll', hide, true);
        window.removeEventListener('resize', hide);
        setSelectionMenu(null);
      };
    }, [doc?.lessonId]);

    const assistCount = assistAnnotations.length;
    const enhanceCount = reviewEnhanceAnnotations.length;
    const noteCount = annotations.length + enhanceCount;
    const enhanceLoading = enhanceEntry?.status === 'loading';
    const searchActive = query.trim().length > 0;

    return h(
      'div',
      { className: 'tr-root font-tr' },
      h('style', null, `@layer components {${STYLES}}`),
      h('style', null, TAILWIND_CSS),
      h(
        'aside',
        { className: cn('tr-nav border-r border-tr-border bg-tr-muted/40', navOpen && 'is-open'), 'aria-label': t('panel') },
        h(
          'div',
          { className: 'flex flex-col gap-1 border-b border-tr-border px-4 pb-3 pt-5' },
          h('div', { className: 'text-[15px] font-semibold tracking-tight text-tr-fg' }, t('title')),
          h('p', { className: 'm-0 text-[11px] leading-relaxed text-tr-tertiary' }, t('subtitle')),
        ),
        h(
          'div',
          { className: 'relative m-3' },
          h('span', { className: 'pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-tr-tertiary' }, searchIcon()),
          h(Input, {
            type: 'search',
            value: query,
            onChange: (event) => setQuery(event.target.value),
            placeholder: t('search'),
            'aria-label': t('search'),
            className: 'pl-8 pr-8',
          }),
          query
            ? h(
                Button,
                {
                  variant: 'ghost',
                  size: 'icon-xs',
                  className: 'absolute right-1 top-1 text-tr-tertiary',
                  onClick: () => setQuery(''),
                  'aria-label': t('clearSearch'),
                },
                '×',
              )
            : null,
        ),
        h(
          'div',
          { className: 'tr-nav-scroll px-2 py-2' },
          loading && !manifest
            ? h(NavSkeleton, { rows: 7 })
            : filteredCourses.length === 0
              ? h(
                  'div',
                  { className: 'tr-nav-empty' },
                  h('p', null, searchActive ? t('noResults') : t('empty')),
                  searchActive ? null : h('p', { className: 'tr-muted' }, t('emptyHint')),
                )
              : filteredCourses.map((item) => {
                  const isCollapsed = !searchActive && collapsed.has(item.id);
                  const count = item.sections.reduce((sum, section) => sum + section.lessons.length, 0);
                  const notes = item.sections.reduce(
                    (sum, section) =>
                      sum +
                      section.lessons.reduce(
                        (n, lesson) => n + (lesson.annotationCount || 0) + autoCountFor(lesson),
                        0,
                      ),
                    0,
                  );
                  return h(
                    'section',
                    { className: 'tr-course', key: item.id },
                    h(
                      'button',
                      {
                        type: 'button',
                        className:
                          'group flex w-full items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-[11.5px] font-medium text-tr-fg transition-colors hover:bg-tr-muted',
                        onClick: () => toggleCourse(item.id),
                        'aria-expanded': !isCollapsed,
                      },
                      h('span', { className: 'tr-chevron', 'data-collapsed': isCollapsed ? '1' : '0' }, chevronIcon()),
                      h('span', { className: 'tr-course-title' }, item.title),
                      h('span', { className: 'text-[10px] font-normal text-tr-tertiary' }, `${count} ${t('lessons')}`),
                      notes > 0 ? h(Badge, { variant: 'warn', className: 'px-1.5 py-0 text-[9px]' }, notes) : null,
                    ),
                    isCollapsed
                      ? null
                      : item.sections.map((section, sectionIndex) =>
                          h(
                            'div',
                            { className: 'tr-section', key: `${item.id}-${section.title || 'root'}-${sectionIndex}` },
                            section.title && (sectionIndex > 0 || item.sections.length > 1)
                              ? h('div', { className: 'px-2 pb-1 pt-2 text-[9.5px] font-medium uppercase tracking-wide text-tr-tertiary' }, section.title)
                              : null,
                            section.lessons.map((lesson) => {
                              const notes = (lesson.annotationCount || 0) + autoCountFor(lesson);
                              return h(
                                'button',
                                {
                                  type: 'button',
                                  key: lesson.lessonId,
                                  className: cn(
                                    'tr-lesson group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-[11.5px] leading-snug text-tr-secondary transition-colors hover:bg-tr-muted hover:text-tr-fg',
                                    lesson.lessonId === selectedId && 'is-active bg-tr-accent/10 font-medium text-tr-fg',
                                  ),
                                  onClick: () => selectLesson(lesson.lessonId),
                                  'aria-current': lesson.lessonId === selectedId ? 'page' : undefined,
                                  title: lesson.title,
                                },
                                h('span', { className: 'tr-lesson-title' }, lesson.title),
                                notes > 0
                                  ? h(Badge, { variant: 'warn', className: 'tr-lesson-notes ml-auto mt-0.5 px-1.5 py-0 text-[9px]', title: t('annotations') }, notes)
                                  : null,
                              );
                            }),
                          ),
                        ),
                  );
                }),
        ),
        h(
          'div',
          { className: 'flex flex-wrap gap-1 border-t border-tr-border px-4 py-2 text-[10px] text-tr-tertiary' },
          h(
            'span',
            null,
            `${manifest?.totalLessons || 0} ${t('lessons')} · ${(manifest?.totalAnnotations || 0) + totalAutoCount} ${t('notes')}`,
          ),
          refreshedAt ? h('span', { className: 'tr-foot-time' }, `· ${formatTime(refreshedAt)}`) : null,
        ),
      ),
      h(
        'main',
        { className: 'tr-main' },
        h(
          'header',
          { className: 'tr-toolbar border-b border-tr-border bg-tr-bg/95' },
          h(
            'div',
            { className: 'flex min-w-0 items-center gap-1.5 text-[11px] text-tr-tertiary' },
            h(
              'button',
              {
                type: 'button',
                className: 'tr-crumb-root text-tr-tertiary transition-colors hover:text-tr-fg',
                onClick: () => {
                  setQuery('');
                },
              },
              t('title'),
            ),
            course ? h('span', { className: 'tr-crumb-sep' }, '/') : null,
            course ? h('span', { className: 'truncate text-tr-secondary' }, course.title) : null,
          ),
          h(
            'div',
            { className: 'tr-toolbar-actions' },
            h(
              'button',
              {
                type: 'button',
                className: 'tr-icon-btn tr-nav-toggle',
                onClick: () => setNavOpen((open) => !open),
                'aria-label': t('panel'),
                title: t('panel'),
              },
              listIcon(),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'tr-icon-btn tr-rail-toggle',
                onClick: () => setRailOpen((open) => !open),
                'aria-label': t('annotations'),
                title: t('annotations'),
              },
              noteIcon(),
              noteCount > 0 ? h(Badge, { variant: 'accent', className: 'absolute -right-1 -top-1 px-1 py-0 text-[8px]' }, noteCount) : null,
            ),
            h(
              Button,
              {
                variant: 'outline',
                size: 'sm',
                className: 'tr-refresh',
                onClick: refresh,
                disabled: refreshing || loading,
                title: t('refresh'),
              },
              h('span', { className: refreshing ? 'tr-spin' : '' }, refreshIcon()),
              h('span', null, refreshing ? t('refreshing') : t('refresh')),
            ),
          ),
        ),
        notice
          ? h(
              'div',
              { className: 'tr-notice', role: 'status' },
              h('span', null, t('refreshFailed')),
              h('span', { className: 'tr-notice-detail' }, notice),
              h(
                'button',
                { type: 'button', className: 'tr-notice-close', onClick: () => setNotice(''), 'aria-label': t('close') },
                '×',
              ),
            )
          : null,
        h(
          'div',
          { className: 'tr-scroll' },
          loadError
            ? h(
                'div',
                { className: 'tr-state tr-state-error' },
                h('h2', null, t('loadFailed')),
                h('p', null, loadError),
                h(Button, { variant: 'default', size: 'sm', onClick: refresh }, t('retry')),
              )
            : loading && !manifest
              ? h(DocSkeleton)
              : !doc
                ? docError
                  ? h(
                      'div',
                      { className: 'tr-state tr-state-error' },
                      h('h2', null, t('loadFailed')),
                      h('p', null, docError),
                      h(Button, { variant: 'default', size: 'sm', onClick: () => loadDoc(selectedId) }, t('retry')),
                    )
                  : h(
                      'div',
                      { className: 'tr-state tr-state-empty' },
                      h('div', { className: 'tr-empty-mark' }, noteIcon(30)),
                      h('h2', null, t('selectLesson')),
                      h('p', null, t('selectHint')),
                      manifest
                        ? h(
                            'p',
                            { className: 'tr-muted' },
                            `${manifest.totalLessons} ${t('lessons')} · ${manifest.totalAnnotations} ${t('notes')}`,
                          )
                        : null,
                    )
                : h(
                    'div',
                    { className: 'tr-reader' },
                    docLoading && !doc ? h(DocSkeleton) : null,
                    doc
                      ? h(
                          'article',
                          { className: 'tr-article', key: doc.lessonId },
                          h(
                            'header',
                            { className: 'tr-doc-head' },
                            h(
                              'div',
                              { className: 'tr-doc-kicker' },
                              course ? course.title : doc.courseId,
                              (currentLesson?.sectionTitle || doc.section) ? h('span', { className: 'tr-kicker-sep' }, '·') : null,
                              currentLesson?.sectionTitle || doc.section
                                ? h('span', null, currentLesson?.sectionTitle || doc.section)
                                : null,
                            ),
                            h('h1', null, doc.title),
                            doc.description ? h('p', { className: 'tr-doc-desc' }, doc.description) : null,
                            h(
                              'div',
                              { className: 'tr-doc-meta' },
                              currentLesson
                                ? h('span', null, t('readingTime', { minutes: currentLesson.readingMinutes }))
                                : null,
                              h('span', { className: 'tr-meta-dot' }, '·'),
                              h(
                                'span',
                                { className: noteCount > 0 ? 'tr-meta-notes' : 'tr-meta-muted' },
                                t('noteCount', { count: noteCount }),
                              ),
                              doc.mtime
                                ? h('span', { className: 'tr-meta-dot' }, '·')
                                : null,
                              doc.mtime
                                ? h('span', { className: 'tr-meta-muted' }, formatDate(doc.mtime))
                                : null,
                            ),
                          ),
                          docError
                            ? h(
                                'div',
                                { className: 'tr-state tr-state-error tr-inline-state' },
                                h('p', null, docError),
                                h(Button, { variant: 'default', size: 'sm', onClick: () => loadDoc(selectedId) }, t('retry')),
                              )
                            : null,
                          rendered.error ? h('div', { className: 'tr-parse-error', dangerouslySetInnerHTML: { __html: rendered.html } }) : null,
                          docError
                            ? null
                            : h(MemoDocumentBody, {
                                html: rendered.html,
                                annotations: allAnnotations,
                                activeId,
                                focusAnn,
                                onSelect: handleMarkSelect,
                                onLocated: handleLocated,
                                onPositions: handlePositions,
                              }),
                          noteCount === 0 && !docError
                            ? h('div', { className: 'tr-no-notes' }, noteIcon(18), h('span', null, t('noAnnotations')))
                            : null,
                          h(
                            'footer',
                            { className: 'tr-doc-foot' },
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'tr-page-btn',
                                disabled: currentIndex <= 0,
                                onClick: () => goRelative(-1),
                              },
                              arrowIcon('left'),
                              h(
                                'span',
                                null,
                                h('span', { className: 'tr-page-btn-kicker' }, t('previous')),
                                h('span', { className: 'tr-page-btn-title' }, currentIndex > 0 ? lessons[currentIndex - 1].title : '—'),
                              ),
                            ),
                            h(
                              'button',
                              {
                                type: 'button',
                                className: 'tr-page-btn tr-page-next',
                                disabled: currentIndex < 0 || currentIndex >= lessons.length - 1,
                                onClick: () => goRelative(1),
                              },
                              h(
                                'span',
                                null,
                                h('span', { className: 'tr-page-btn-kicker' }, t('next')),
                                h(
                                  'span',
                                  { className: 'tr-page-btn-title' },
                                  currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1].title : '—',
                                ),
                              ),
                              arrowIcon('right'),
                            ),
                          ),
                        )
                      : null,
                  ),
        ),
      ),
      h(
        'aside',
        { className: cn('tr-rail border-l border-tr-border bg-tr-muted/30', railOpen && 'is-open'), 'aria-label': t('annotations') },
        h(
          'div',
          { className: 'flex items-center gap-2 border-b border-tr-border px-4 pb-2 pt-4' },
          h('h2', { className: 'm-0 min-w-0 flex-1 text-[12px] font-semibold tracking-tight' }, t('annotations')),
          h(Badge, { variant: 'muted', className: 'px-1.5 py-0 text-[9px]' }, noteCount),
          h(
            'button',
            {
              type: 'button',
              className: 'tr-icon-btn tr-rail-close',
              onClick: () => setRailOpen(false),
              'aria-label': t('close'),
            },
            '×',
          ),
        ),
        h(
          'div',
          { className: 'flex items-center gap-2 border-b border-tr-border bg-tr-bg/60 px-3 py-2' },
          h(
            'span',
            { className: 'min-w-0 flex-1 truncate text-[9.5px] text-tr-tertiary' },
            enhanceEntry?.status === 'loading'
              ? t('reviewEnhanceLoadingShort')
              : enhanceEntry?.status === 'error'
                ? t('reviewEnhanceFailedShort')
                : enhanceEntry?.generatedAt
                  ? `${t('reviewEnhanceUpdated')} · ${formatTime(new Date(enhanceEntry.generatedAt))}`
                  : t('reviewEnhanceAuto'),
          ),
          h(
            Button,
            {
              variant: 'outline',
              size: 'xs',
              className: 'tr-rail-rerun',
              onClick: regenerateEnhance,
              disabled: !doc || enhanceLoading,
              title: t('reviewEnhanceAgain'),
            },
            h('span', { className: enhanceLoading ? 'tr-spin' : '' }, refreshIcon()),
            h('span', null, enhanceLoading ? t('reviewEnhanceLoadingShort') : t('reviewEnhanceAgain')),
          ),
        ),
        h(
          'div',
          { className: 'tr-rail-scroll p-2.5' },
          noteCount === 0 && assistCount === 0 && !enhanceEntry
            ? h(
                'div',
                { className: 'flex flex-col gap-2 px-3 py-8 text-[11px] leading-relaxed text-tr-tertiary' },
                h('p', null, t('noAnnotations')),
                h('p', { className: 'tr-assist-empty-hint' }, t('assistEmpty')),
              )
            : h(
                React.Fragment,
                null,
                enhanceEntry?.status === 'loading'
                  ? h(
                      'div',
                      {
                        className:
                          'tr-proof-status is-loading flex items-center gap-2 rounded-md border border-tr-border bg-tr-bg px-3 py-2.5 text-[10.5px] text-tr-tertiary',
                      },
                      h('span', { className: 'tr-spin' }, refreshIcon()),
                      h('span', null, t('reviewEnhanceLoading')),
                    )
                  : enhanceEntry?.status === 'error'
                    ? h(
                        'div',
                        {
                          className:
                            'tr-proof-status is-error flex flex-col items-start gap-2 rounded-md border border-tr-danger/20 bg-tr-danger/5 px-3 py-2.5 text-[10.5px] text-tr-danger',
                        },
                        h('p', { className: 'm-0 leading-relaxed' }, enhanceEntry.error || t('reviewEnhanceFailed')),
                        h(
                          Button,
                          { variant: 'outline', size: 'xs', onClick: regenerateEnhance },
                          t('retry'),
                        ),
                      )
                    : enhanceEntry?.status === 'done' && enhanceCount === 0
                      ? h(
                          'div',
                          {
                            className:
                              'tr-proof-status is-clean flex items-center gap-2 rounded-md border border-tr-success/20 bg-tr-success/5 px-3 py-2.5 text-[10.5px] text-tr-success',
                          },
                          h('span', { className: 'flex h-4 w-4 items-center justify-center rounded-full bg-tr-success/15 text-[10px] font-semibold', 'aria-hidden': 'true' }, '✓'),
                          h('span', null, enhanceData?.note || t('reviewEnhanceClean')),
                        )
                      : null,
                reviewCards.length > 0
                  ? h(
                      'ol',
                      { className: 'tr-notes tr-review-feed flex flex-col gap-2' },
                      reviewCards.map((annotation) => {
                        const isReview = annotation.kind === 'review';
                        const index = isReview ? locatedOrder.get(annotation.id) : null;
                        const missing = isReview && !locatedOrder.has(annotation.id);
                        return h(NoteCard, {
                          key: annotation.key,
                          annotation,
                          index: index ?? null,
                          missing,
                          active: annotation.id === activeId,
                          onSelect: handleRailSelect,
                          onRef: (node) => {
                            if (node) cardRefs.current.set(annotation.id, node);
                            else cardRefs.current.delete(annotation.id);
                          },
                          onNavigate: selectLesson,
                          onRetryAssist: annotation.kind === 'assist' ? retryAssist : undefined,
                          onCopy: copyAssist,
                          copied: copiedId === annotation.id,
                          t,
                        });
                      }),
                    )
                  : null,
                enhanceData?.sourcesNote && enhanceCount > 0
                  ? h('p', { className: 'tr-assist-note tr-sources-note' }, enhanceData.sourcesNote)
                  : null,
                assistCount > 0
                  ? h(
                      'section',
                      { className: 'tr-assist-section mt-4 border-t border-tr-border pt-3' },
                      h('h3', { className: 'm-0 px-1 pb-2 text-[9.5px] font-semibold uppercase tracking-wide text-tr-tertiary' }, t('assistTitle')),
                      h(
                        'ul',
                        { className: 'm-0 flex list-none flex-col gap-2 p-0' },
                        assistAnnotations.map((annotation) =>
                          h(NoteCard, {
                            key: annotation.key,
                            annotation,
                            index: null,
                            active: annotation.id === activeId,
                            onSelect: handleRailSelect,
                            onRef: (node) => {
                              if (node) cardRefs.current.set(annotation.id, node);
                              else cardRefs.current.delete(annotation.id);
                            },
                            onNavigate: selectLesson,
                            onRetryAssist: retryAssist,
                            onCopy: copyAssist,
                            copied: copiedId === annotation.id,
                            t,
                          }),
                        ),
                      ),
                    )
                  : null,
                noteCount > 0 ? h('p', { className: 'mt-4 border-t border-tr-border px-1 pt-3 text-[9.5px] leading-relaxed text-tr-tertiary' }, t('assistDisclaimer')) : null,
              ),
        ),
      ),
      selectionMenu
        ? h(
            'div',
            {
              className: 'tr-selection-menu rounded-card border border-tr-border-strong bg-tr-bg p-1.5 shadow-xl',
              style: { left: selectionMenu.left, top: selectionMenu.top },
              onMouseDown: (event) => event.preventDefault(),
              role: 'menu',
              'aria-label': t('assistTitle'),
            },
            h('span', { className: 'px-2 pb-0.5 pt-1 text-[9px] font-semibold uppercase tracking-wide text-tr-tertiary' }, t('assistTitle')),
            h(
              'div',
              { className: 'grid grid-cols-2 gap-1' },
              [
                ['optimize', t('optimize')],
                ['expand', t('expand')],
              ].map(([task, label]) =>
                h(
                  Button,
                  {
                    variant: 'ghost',
                    size: 'sm',
                    role: 'menuitem',
                    key: task,
                    className: 'tr-selection-action justify-start px-2',
                    onClick: () => startSelectionAssist(task),
                  },
                  label,
                ),
              ),
            ),
          )
        : null,
      navOpen ? h('button', { type: 'button', className: 'tr-nav-backdrop', onClick: () => setNavOpen(false), 'aria-label': t('close') }) : null,
      railOpen ? h('button', { type: 'button', className: 'tr-rail-backdrop', onClick: () => setRailOpen(false), 'aria-label': t('close') }) : null,
    );
  }

  function DocumentBody({ html, annotations, activeId, focusAnn, onSelect, onLocated, onPositions }) {
    const containerRef = useRef(null);
    const flashTimer = useRef(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) return undefined;
      const cleanup = highlightAnnotations(container, annotations);
      onLocated(readLocatedAnnotations(container, annotations));
      onPositions(readAnnotationPositions(container));
      return cleanup;
    }, [html, annotations, onLocated, onPositions]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const marks = container.querySelectorAll('mark.tr-annotation');
      for (const mark of marks) mark.classList.toggle('is-active', mark.dataset.annId === activeId);
    }, [activeId]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container || !focusAnn?.id) return;
      const mark = container.querySelector(`mark.tr-annotation[data-ann-id="${cssEscape(focusAnn.id)}"]`);
      if (!mark) return;
      mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
      mark.classList.remove('is-flashing');
      void mark.offsetWidth;
      mark.classList.add('is-flashing');
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => mark.classList.remove('is-flashing'), 1800);
    }, [focusAnn]);

    useEffect(
      () => () => {
        clearTimeout(flashTimer.current);
      },
      [],
    );

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return undefined;
      const onClick = (event) => {
        const mark = event.target.closest?.('mark.tr-annotation');
        if (mark) {
          event.preventDefault();
          onSelectRef.current?.(mark.dataset.annId);
        }
        const link = event.target.closest?.('a[data-internal-link]');
        if (link) event.preventDefault();
      };
      const onKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const mark = event.target.closest?.('mark.tr-annotation');
        if (!mark) return;
        event.preventDefault();
        onSelectRef.current?.(mark.dataset.annId);
      };
      container.addEventListener('click', onClick);
      container.addEventListener('keydown', onKeyDown);
      return () => {
        container.removeEventListener('click', onClick);
        container.removeEventListener('keydown', onKeyDown);
      };
    }, []);

    return h('div', { className: 'tr-doc-body', ref: containerRef, dangerouslySetInnerHTML: { __html: html } });
  }

  const MemoDocumentBody = React.memo(DocumentBody);

  function NoteCard({ annotation, index, active, missing, onSelect, onRef, t, onNavigate, onRetryAssist, onCopy, copied }) {
    const assist = annotation.kind === 'assist';
    const proof = annotation.kind === 'proofread';
    const link = annotation.kind === 'link';
    const proofType = proof ? (annotation.issueType === 'typo' ? 'typo' : 'grammar') : '';
    const linkType = link ? (annotation.linkType === 'external' ? 'external' : 'internal') : '';
    const badgeVariant = proof
      ? proofType === 'typo'
        ? 'danger'
        : 'warn'
      : link
        ? linkType === 'external'
          ? 'accent'
          : 'success'
        : assist
          ? 'accent'
          : 'muted';
    const badgeText = proof
      ? proofType === 'typo'
        ? '错'
        : '句'
      : link
        ? linkType === 'external'
          ? '外'
          : '内'
        : assist
          ? '✦'
          : index ?? '·';
    return h(
      'li',
      {
        ref: onRef,
        onClick: () => onSelect(annotation.id),
        onKeyDown:
          assist || proof || link
            ? undefined
            : (event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(annotation.id);
                }
              },
        role: assist || proof || link ? undefined : 'button',
        tabIndex: assist || proof || link ? undefined : 0,
        className: cn(
          'tr-note group relative flex min-w-0 cursor-pointer flex-col rounded-card border border-tr-border bg-tr-bg p-3 text-tr-fg shadow-sm transition-colors',
          'hover:border-tr-border-strong',
          active && 'border-tr-border-strong ring-2 ring-tr-accent/10',
          missing && 'opacity-80',
          assist && 'tr-note-assist',
          proof && `tr-note-proof tr-proof-${proofType}`,
          link && `tr-note-link tr-link-${linkType}`,
        ),
      },
      h(
        'div',
        { className: 'flex items-center gap-2' },
        h(
          Badge,
          {
            variant: badgeVariant,
            className: 'h-5 min-w-5 justify-center rounded-md px-1 text-[9px] font-semibold',
          },
          badgeText,
        ),
        h('span', { className: 'tr-note-cat min-w-0 flex-1 truncate text-[10px] font-medium text-tr-secondary' }, annotation.category),
        assist || proof || link
          ? h(Badge, { variant: 'outline', className: 'ml-auto px-1.5 py-0 text-[8px]' }, 'AI')
          : null,
        assist && annotation.status === 'loading'
          ? h('span', { className: 'text-[9px] text-tr-tertiary' }, t('generatingShort'))
          : null,
        missing
          ? h(Badge, { variant: 'outline', className: 'px-1.5 py-0 text-[8px]' }, t('unlocated'))
          : null,
      ),
      proof
        ? h(ProofreadDiff, { annotation })
        : h(
            'blockquote',
            {
              className:
                'tr-note-quote mb-2 mt-2 overflow-hidden rounded-md border-l-2 border-tr-border-strong bg-tr-muted/60 px-2.5 py-2 text-[11px] leading-relaxed text-tr-secondary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4]',
            },
            `“${annotation.quote}”`,
          ),
      proof
        ? h(ProofreadCardBody, { annotation, t, onCopy, copied })
        : link
          ? h(LinkCardBody, { annotation, t, onNavigate, onCopy, copied })
          : assist
            ? h(AssistCardBody, {
                annotation,
                t,
                onNavigate,
                onRetry: onRetryAssist,
                onCopy,
                copied,
              })
            : h('p', { className: 'm-0 text-[12px] leading-relaxed text-tr-fg' }, annotation.comment),
    );
  }

  function ProofreadDiff({ annotation }) {
    const parts = diffText(annotation.quote, annotation.suggestion);
    return h(
      'div',
      {
        className:
          'tr-proof-diff mb-2 mt-2 rounded-md border-l-2 border-tr-border-strong bg-tr-muted/60 px-2.5 py-2 text-[11px] leading-relaxed text-tr-fg',
        role: 'group',
        'aria-label': '原文与建议的差异',
      },
      parts.map((part, index) =>
        part.type === 'del'
          ? h('del', { key: index, className: 'tr-diff-del rounded-sm bg-tr-danger/10 px-0.5 text-tr-danger line-through decoration-1' }, part.text)
          : part.type === 'ins'
            ? h('ins', { key: index, className: 'tr-diff-add rounded-sm bg-tr-success/10 px-0.5 text-tr-success no-underline' }, part.text)
            : h(React.Fragment, { key: index }, part.text),
      ),
    );
  }

  function ProofreadCardBody({ annotation, t, onCopy, copied }) {
    return h(
      'div',
      { className: 'tr-proof-body' },
      h('p', { className: 'm-0 text-[10.5px] leading-relaxed text-tr-secondary' }, annotation.reason),
      h(
        'div',
        { className: 'flex justify-end pt-2' },
        h(
          Button,
          {
            variant: 'ghost',
            size: 'xs',
            onClick: (event) => {
              event.stopPropagation();
              onCopy?.(annotation);
            },
          },
          copied ? t('copied') : t('copy'),
        ),
      ),
    );
  }

  function AssistCardBody({ annotation, t, onNavigate, onRetry, onCopy, copied }) {
    if (annotation.status === 'loading') {
      return h(
        'div',
        { className: 'py-1' },
        h('div', { className: 'tr-assist-skeleton' }, h('span'), h('span'), h('span')),
        h('p', { className: 'mt-2 text-[10.5px] text-tr-tertiary' }, t('generating')),
      );
    }
    if (annotation.status === 'error') {
      return h(
        'div',
        { className: 'py-1' },
        h('p', { className: 'mb-2 text-[11px] leading-relaxed text-tr-danger' }, annotation.error || t('assistFailed')),
        h(
          Button,
          {
            variant: 'outline',
            size: 'xs',
            onClick: (event) => {
              event.stopPropagation();
              onRetry?.(annotation);
            },
          },
          t('retry'),
        ),
      );
    }

    const result = annotation.result || {};
    let body = null;
    if (annotation.assistType === 'optimize') {
      body = h(
        'div',
        { className: 'tr-assist-block' },
        h('div', { className: 'mb-1 text-[9px] font-semibold uppercase tracking-wide text-tr-tertiary' }, t('optimized')),
        h('p', { className: 'tr-assist-rewrite m-0 whitespace-pre-wrap rounded-md border-l-2 border-tr-border-strong bg-tr-muted/60 px-2.5 py-2 text-[11.5px] leading-relaxed text-tr-fg' }, result.rewrite || ''),
        Array.isArray(result.notes) && result.notes.length > 0
          ? h(
              'ul',
              { className: 'mt-2 list-disc space-y-1 pl-4 text-[10.5px] leading-relaxed text-tr-secondary' },
              result.notes.map((note, index) => h('li', { key: index }, note)),
            )
          : null,
      );
    } else if (annotation.assistType === 'expand') {
      body = h(
        'div',
        { className: 'tr-assist-block' },
        h('div', { className: 'mb-1 text-[9px] font-semibold uppercase tracking-wide text-tr-tertiary' }, t('directions')),
        h(
          'ol',
          { className: 'm-0 list-decimal space-y-2 pl-4 text-[11.5px] leading-relaxed text-tr-fg' },
          (result.directions || []).map((direction, index) =>
            h(
              'li',
              { key: index },
              h('strong', null, direction.title),
              h('p', { className: 'mt-0.5 text-[10.5px] leading-relaxed text-tr-secondary' }, direction.detail),
            ),
          ),
        ),
      );
    } else if (annotation.assistType === 'internal-links') {
      const links = result.links || [];
      body = h(
        'div',
        { className: 'tr-assist-block' },
        links.length === 0
          ? h('p', { className: 'm-0 text-[10.5px] leading-relaxed text-tr-tertiary' }, t('noLinkSuggestions'))
          : h(
              'div',
              { className: 'flex flex-col gap-2' },
              links.map((link) =>
                h(
                  'div',
                  { className: 'border-l-2 border-tr-accent/30 pl-2', key: link.lessonId },
                  h(
                    'button',
                    {
                      type: 'button',
                      className: 'text-left text-[11.5px] font-semibold text-tr-accent hover:underline',
                      onClick: (event) => {
                        event.stopPropagation();
                        onNavigate?.(link.lessonId);
                      },
                      title: t('openLesson'),
                    },
                    link.title,
                    ' ↗',
                  ),
                  h('p', { className: 'mt-0.5 text-[10.5px] leading-relaxed text-tr-secondary' }, link.reason),
                ),
              ),
            ),
      );
    } else if (annotation.assistType === 'external-links') {
      const links = result.links || [];
      body = h(
        'div',
        { className: 'tr-assist-block' },
        links.length === 0
          ? h('p', { className: 'm-0 text-[10.5px] leading-relaxed text-tr-tertiary' }, t('noLinkSuggestions'))
          : h(
              'div',
              { className: 'flex flex-col gap-2' },
              links.map((link) =>
                h(
                  'div',
                  { className: 'border-l-2 border-tr-accent/30 pl-2', key: link.url },
                  h(
                    'a',
                    {
                      className: 'text-left text-[11.5px] font-semibold text-tr-accent hover:underline',
                      href: link.url,
                      target: '_blank',
                      rel: 'noreferrer noopener',
                      onClick: (event) => event.stopPropagation(),
                      title: t('openLink'),
                    },
                    link.title,
                    ' ↗',
                  ),
                  link.domain ? h('span', { className: 'block text-[9px] text-tr-tertiary' }, link.domain) : null,
                  h('p', { className: 'mt-0.5 text-[10.5px] leading-relaxed text-tr-secondary' }, link.reason),
                  link.snippet ? h('p', { className: 'mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-tr-tertiary' }, link.snippet) : null,
                ),
              ),
            ),
      );
    } else {
      body = h('p', { className: 'm-0 text-[12px] leading-relaxed text-tr-fg' }, annotation.comment || '');
    }

    return h(
      'div',
      { className: 'tr-assist-body' },
      body,
      result.fallback ? h('p', { className: 'mt-2 text-[9.5px] leading-relaxed text-tr-warn' }, t('fallbackNote')) : null,
      result.note ? h('p', { className: 'mt-2 text-[9.5px] leading-relaxed text-tr-tertiary' }, result.note) : null,
      h(
        'div',
        { className: 'flex justify-end pt-2' },
        h(
          Button,
          {
            variant: 'ghost',
            size: 'xs',
            onClick: (event) => {
              event.stopPropagation();
              onCopy?.(annotation);
            },
          },
          copied ? t('copied') : t('copy'),
        ),
      ),
    );
  }

  function LinkCardBody({ annotation, t, onNavigate, onCopy, copied }) {
    const external = annotation.linkType === 'external';
    return h(
      'div',
      { className: 'tr-link-body' },
      h('div', { className: 'mb-1 text-[9px] font-semibold uppercase tracking-wide text-tr-tertiary' }, external ? t('externalLinks') : t('internalLinks')),
      external
        ? h(
            'a',
            {
              className: 'inline text-[11.5px] font-semibold text-tr-accent hover:underline',
              href: annotation.url,
              target: '_blank',
              rel: 'noreferrer noopener',
              onClick: (event) => event.stopPropagation(),
              title: t('openLink'),
            },
            annotation.title,
            ' ↗',
          )
        : h(
            'button',
            {
              type: 'button',
              className: 'inline text-[11.5px] font-semibold text-tr-accent hover:underline',
              onClick: (event) => {
                event.stopPropagation();
                onNavigate?.(annotation.lessonId);
              },
              title: t('openLesson'),
            },
            annotation.title,
            ' ↗',
          ),
      annotation.domain ? h('span', { className: 'block text-[9px] text-tr-tertiary' }, annotation.domain) : null,
      h('p', { className: 'mt-1 text-[10.5px] leading-relaxed text-tr-secondary' }, annotation.reason),
      annotation.snippet ? h('p', { className: 'mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-tr-tertiary' }, annotation.snippet) : null,
      h(
        'div',
        { className: 'flex justify-end pt-2' },
        h(
          Button,
          {
            variant: 'ghost',
            size: 'xs',
            onClick: (event) => {
              event.stopPropagation();
              onCopy?.(annotation);
            },
          },
          copied ? t('copied') : t('copy'),
        ),
      ),
    );
  }

  function NavSkeleton({ rows = 6 }) {
    return h(
      'div',
      { className: 'flex flex-col gap-4 px-4 py-4', 'aria-hidden': 'true' },
      Array.from({ length: 3 }, (_, group) =>
        h(
          'div',
          { className: 'flex flex-col gap-1.5', key: group },
          h(Skeleton, { className: 'mb-1 h-2.5 w-24' }),
          Array.from({ length: rows - group }, (_, row) =>
            h(Skeleton, {
              key: row,
              className: cn('h-2', row % 3 === 0 ? 'w-[88%]' : row % 3 === 1 ? 'w-[72%]' : 'w-[60%]'),
            }),
          ),
        ),
      ),
    );
  }

  function DocSkeleton() {
    return h(
      'div',
      { className: 'mx-auto flex w-full max-w-[720px] flex-col gap-3 px-8 py-10', 'aria-hidden': 'true' },
      h(Skeleton, { className: 'mb-2 h-7 w-2/3' }),
      h(Skeleton, { className: 'h-3 w-full' }),
      h(Skeleton, { className: 'h-3 w-4/5' }),
      h(Skeleton, { className: 'my-3 h-3 w-full' }),
      Array.from({ length: 8 }, (_, index) =>
        h(Skeleton, {
          key: index,
          className: cn('h-3', index % 4 === 3 ? 'w-3/4' : 'w-full'),
        }),
      ),
    );
  }

function refreshIcon() {
  return svg(
    h('path', { d: 'M20.5 11a8.5 8.5 0 0 0-14.9-5.4L3.5 7.7' }),
    h('path', { d: 'M3.5 3.7v4h4' }),
    h('path', { d: 'M3.5 13a8.5 8.5 0 0 0 14.9 5.4l2.1-2.1' }),
    h('path', { d: 'M20.5 20.3v-4h-4' }),
  );
}

function noteIcon(size = 16) {
  return svg(
    h('path', { d: 'M5.5 3.75h8.2l4.8 4.8v11.7H5.5a1.5 1.5 0 0 1-1.5-1.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z' }),
    h('path', { d: 'M13.5 3.9v4.8h4.8' }),
    h('path', { d: 'M7.5 12h6M7.5 15.2h4' }),
    h('path', { d: 'M3.2 18.8h6.8', strokeWidth: 3, opacity: 0.35 }),
    { width: size, height: size },
  );
}

function searchIcon() {
  return svg(h('circle', { cx: 10.5, cy: 10.5, r: 6.5 }), h('path', { d: 'm15.4 15.4 4.1 4.1' }), { className: 'tr-search-icon' });
}

function chevronIcon() {
  return svg(h('path', { d: 'm8 10 4 4 4-4' }), { width: 14, height: 14 });
}

function proofIcon() {
  return svg(
    h('path', { d: 'M4.8 19.2 6.1 14l9.2-9.2a2.1 2.1 0 0 1 3 3L9 17.1l-4.2 2.1Z' }),
    h('path', { d: 'm13.7 6.6 3.7 3.7' }),
    h('path', { d: 'M15.8 4.5h1.2M16.4 3.9v1.2' }),
    { width: 15, height: 15 },
  );
}

function listIcon() {
  return svg(
    h('path', { d: 'M4.5 7h15M4.5 12h15M4.5 17h9' }),
    { width: 16, height: 16 },
  );
}

function arrowIcon(direction) {
  return svg(
    h('path', { d: direction === 'left' ? 'M19 12H5m6-6-6 6 6 6' : 'M5 12h14m-6-6 6 6-6 6' }),
    { width: 15, height: 15, className: 'tr-arrow' },
  );
}

function svg(...args) {
  const last = args[args.length - 1];
  const props = last && typeof last === 'object' && !last.$$typeof ? args.pop() : {};
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: 16,
      height: 16,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      ...props,
    },
    args,
  );
}


  const MemoReviewPage = React.memo(ReviewPage);

  return {
    inject: ['slots', 'locale'],
    apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, DICTIONARIES), 'tutorial-review: dictionaries');
      const t = typeof ctx.locale.bind === 'function' ? ctx.locale.bind(NS) : fallbackT;
      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 40,
            label: () => t('panel'),
            locale: NS,
          },
          PanelIcon,
        ),
      );
      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({ t }),
          },
          MemoReviewPage,
        ),
      );
    },
  };
}

function readEnhanceCache(key, mtime) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || value.mtime !== mtime || !value.data) return null;
    return value;
  } catch {
    return null;
  }
}

function countEnhanceData(data) {
  if (!data) return 0;
  return (data.issues?.length || 0) + (data.internalLinks?.length || 0) + (data.externalLinks?.length || 0);
}

function flattenLessons(manifest) {
  if (!manifest || !Array.isArray(manifest.courses)) return [];
  const out = [];
  for (const course of manifest.courses) {
    for (const section of course.sections || []) {
      for (const lesson of section.lessons || []) {
        out.push({ ...lesson, courseId: course.id, courseTitle: course.title, sectionTitle: section.title });
      }
    }
  }
  return out;
}

function assistLabel(task, t) {
  const key = {
    optimize: 'optimize',
    expand: 'expand',
    'internal-links': 'internalLinks',
    'external-links': 'externalLinks',
  }[task];
  return t(key || 'assistTitle');
}

function diffText(before, after) {
  const a = Array.from(String(before == null ? '' : before));
  const b = Array.from(String(after == null ? '' : after));
  if (a.length === 0) return b.length ? [{ type: 'ins', text: b.join('') }] : [];
  if (b.length === 0) return [{ type: 'del', text: a.join('') }];
  if (a.length * b.length > 120000) return simpleDiff(a, b);

  const table = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    const row = table[i];
    const next = table[i + 1];
    for (let j = b.length - 1; j >= 0; j -= 1) {
      row[j] = a[i] === b[j] ? next[j + 1] + 1 : Math.max(next[j], row[j + 1]);
    }
  }
  const parts = [];
  const push = (type, text) => {
    const last = parts[parts.length - 1];
    if (last && last.type === type) last.text += text;
    else parts.push({ type, text });
  };
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      push('same', a[i]);
      i += 1;
      j += 1;
    } else if (j < b.length && (i >= a.length || table[i][j + 1] > table[i + 1][j])) {
      push('ins', b[j]);
      j += 1;
    } else {
      push('del', a[i]);
      i += 1;
    }
  }
  return parts;
}

function simpleDiff(a, b) {
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < a.length - prefix &&
    suffix < b.length - prefix &&
    a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  const parts = [];
  if (prefix > 0) parts.push({ type: 'same', text: a.slice(0, prefix).join('') });
  if (a.length - suffix > prefix) parts.push({ type: 'del', text: a.slice(prefix, a.length - suffix).join('') });
  if (b.length - suffix > prefix) parts.push({ type: 'ins', text: b.slice(prefix, b.length - suffix).join('') });
  if (suffix > 0) parts.push({ type: 'same', text: a.slice(a.length - suffix).join('') });
  return parts;
}

function assistCopyText(annotation, t) {
  if (annotation.kind === 'proofread') {
    return `${annotation.quote}
→ ${annotation.suggestion}
${annotation.reason}`;
  }
  if (annotation.kind === 'link') {
    return `${annotation.title}${annotation.url ? ` ${annotation.url}` : ''}\n${annotation.reason}\n${annotation.quote}`;
  }
  const result = annotation.result || {};
  if (annotation.assistType === 'optimize') return result.rewrite || '';
  if (annotation.assistType === 'expand') {
    return (result.directions || [])
      .map((direction, index) => `${index + 1}. ${direction.title}\n${direction.detail}`)
      .join('\n\n');
  }
  if (annotation.assistType === 'internal-links') {
    return (result.links || []).map((link) => `${link.title}\n${link.reason}`).join('\n\n');
  }
  if (annotation.assistType === 'external-links') {
    return (result.links || []).map((link) => `${link.title} ${link.url}\n${link.reason}`).join('\n\n');
  }
  return annotation.quote || '';
}

function fallbackCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try {
    document.execCommand('copy');
  } finally {
    area.remove();
  }
}

function readSelectionContext(range) {
  const start =
    range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
  const block =
    start?.closest?.('p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th') ||
    start?.closest?.('.tr-doc-body');
  const paragraph = normalizeSpace(block?.textContent || '');
  const selected = normalizeSpace(range.toString());
  const heading = previousHeading(block);
  return [
    heading ? `上一级标题：${heading}` : '',
    paragraph ? `所在段落：${paragraph.slice(0, 1600)}` : '',
    selected && !paragraph.includes(selected) ? `选中内容：${selected.slice(0, 1600)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function previousHeading(element) {
  const scope = element?.closest('.tr-doc-body') || element;
  let node = element;
  while (node && node !== scope?.parentElement) {
    let previous = node.previousElementSibling;
    while (previous) {
      if (/^H[1-6]$/.test(previous.tagName)) return normalizeSpace(previous.textContent).slice(0, 120);
      previous = previous.previousElementSibling;
    }
    node = node.parentElement;
  }
  return '';
}

function matchesQuery(lesson, course, term) {
  return [lesson.title, lesson.description, lesson.lessonId, course.title]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(term);
}

function normalizeAnnotations(items) {
  const seen = new Map();
  return items.map((item, index) => {
    const base = typeof item.id === 'string' && item.id ? item.id : `note-${index + 1}`;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return {
      ...item,
      kind: item.kind || 'review',
      id: count === 1 ? base : `${base}-${count}`,
      key: `${base}-${index}`,
    };
  });
}

function sameLocated(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item.id === b[index].id && item.index === b[index].index);
}

function samePositions(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item.id === b[index].id && item.start === b[index].start);
}

function interpolate(template, vars) {
  if (!vars) return String(template);
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (vars[key] == null ? `{${key}}` : String(vars[key])));
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
  } catch {
    return '';
  }
}

function formatTime(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(value);
  } catch {
    return '';
  }
}

const STYLES = `
.tr-root {
  --tr-border: var(--dsw-alias-border-l2, rgba(0,0,0,.09));
  --tr-border-strong: var(--dsw-alias-border-l3, rgba(0,0,0,.14));
  --tr-bg: var(--dsw-alias-bg-base, #fff);
  --tr-bg-soft: var(--dsw-alias-bg-layer-1, #f7f7f8);
  --tr-bg-softer: var(--dsw-alias-bg-layer-2, #f2f2f4);
  --tr-text: var(--dsw-alias-label-primary, #16181d);
  --tr-text-2: var(--dsw-alias-label-secondary, #5b6270);
  --tr-text-3: var(--dsw-alias-label-tertiary, #8b93a1);
  --tr-accent: var(--dsw-alias-brand-primary, #2f6fed);
  --tr-warn: var(--dsw-alias-state-warn-primary, #d97706);
  --tr-success: var(--dsw-alias-state-success-primary, #1a7f4b);
  --tr-error: var(--dsw-alias-state-error-primary, #c0392b);
  --tr-highlight: color-mix(in srgb, var(--tr-warn) 20%, transparent);
  --tr-highlight-active: color-mix(in srgb, var(--tr-warn) 34%, transparent);
  --tr-radius: var(--dsw-radius-lg, 12px);
  --tr-radius-sm: var(--dsw-radius-md, 8px);
  --tr-font: var(--dsw-font-base-16-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif);
  --tr-font-doc: var(--dsw-font-markdown-base-font-family, var(--tr-font));
  --tr-font-mono: var(--dsw-font-markdown-code-font-family, ui-monospace, SFMono-Regular, Menlo, monospace);
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(220px, 264px) minmax(0, 1fr) minmax(292px, 348px);
  color: var(--tr-text);
  background: var(--tr-bg);
  font-family: var(--tr-font);
  overflow: hidden;
  position: relative;
}
.tr-nav {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  border-right: .5px solid var(--tr-border);
  background: var(--tr-bg-soft);
}
.tr-nav-head { padding: 22px 18px 12px; }
.tr-nav-kicker {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -.01em;
}
.tr-nav-sub {
  margin: 6px 0 0;
  color: var(--tr-text-3);
  font-size: 11.5px;
  line-height: 1.5;
}
.tr-search {
  margin: 2px 14px 10px;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 9px;
  border: .5px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
  color: var(--tr-text-3);
}
.tr-search:focus-within { border-color: var(--tr-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--tr-accent) 14%, transparent); }
.tr-search-icon { flex: none; }
.tr-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--tr-text);
  font: inherit;
  font-size: 12.5px;
}
.tr-search input::placeholder { color: var(--tr-text-3); }
.tr-search-clear {
  border: 0;
  background: transparent;
  color: var(--tr-text-3);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}
.tr-nav-scroll { flex: 1; min-height: 0; overflow: auto; padding: 2px 8px 16px; }
.tr-course { margin-bottom: 6px; }
.tr-course-head {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--tr-text);
  padding: 7px 6px;
  border-radius: 7px;
  cursor: pointer;
  text-align: left;
  font: inherit;
}
.tr-course-head:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.045)); }
.tr-chevron { display: inline-flex; color: var(--tr-text-3); transition: transform .16s ease; }
.tr-chevron[data-collapsed="1"] { transform: rotate(-90deg); }
.tr-course-title { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tr-course-count { color: var(--tr-text-3); font-size: 10.5px; white-space: nowrap; }
.tr-course-notes {
  color: var(--tr-warn);
  background: var(--tr-highlight);
  border-radius: 999px;
  min-width: 16px;
  height: 16px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
}
.tr-section { margin: 1px 0 6px; }
.tr-section-title {
  padding: 7px 10px 3px 21px;
  color: var(--tr-text-3);
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: .015em;
}
.tr-lesson {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--tr-text-2);
  text-align: left;
  padding: 7px 8px 7px 20px;
  border-radius: 7px;
  cursor: pointer;
  font: inherit;
  font-size: 12.5px;
  line-height: 1.45;
}
.tr-lesson:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.045)); color: var(--tr-text); }
.tr-lesson.is-active {
  background: var(--dsw-alias-interactive-bg-active, color-mix(in srgb, var(--tr-accent) 10%, transparent));
  color: var(--tr-text);
  font-weight: 500;
}
.tr-lesson-title { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.tr-lesson-notes {
  flex: none;
  margin-top: 1px;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--tr-highlight);
  color: var(--tr-warn);
  font-size: 10px;
  font-weight: 600;
}
.tr-nav-foot {
  border-top: .5px solid var(--tr-border);
  padding: 10px 16px;
  color: var(--tr-text-3);
  font-size: 10.5px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.tr-foot-time { color: var(--tr-text-3); }
.tr-main { min-width: 0; min-height: 0; display: flex; flex-direction: column; background: var(--tr-bg); }
.tr-notice {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 22px;
  border-bottom: .5px solid color-mix(in srgb, var(--tr-warn) 24%, transparent);
  background: color-mix(in srgb, var(--tr-warn) 8%, var(--tr-bg));
  color: var(--tr-text-2);
  font-size: 11.5px;
}
.tr-notice-detail { color: var(--tr-text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
.tr-notice-close { border: 0; background: transparent; color: var(--tr-text-3); cursor: pointer; font-size: 16px; line-height: 1; padding: 0 2px; }
.tr-toolbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 22px;
  min-height: 48px;
  border-bottom: .5px solid var(--tr-border);
}
[data-platform="darwin"] .tr-toolbar { padding-top: calc(10px + var(--dsh-frame-top-clearance, 0px)); }
[data-platform="darwin"] .tr-nav-head,
[data-platform="darwin"] .tr-rail-head { padding-top: calc(20px + var(--dsh-frame-top-clearance, 0px)); }
.tr-crumbs { display: flex; align-items: center; gap: 6px; min-width: 0; font-size: 11.5px; color: var(--tr-text-3); }
.tr-crumb-root { border: 0; background: transparent; color: var(--tr-text-3); cursor: pointer; font: inherit; padding: 0; }
.tr-crumb-root:hover { color: var(--tr-text); }
.tr-crumb-course { color: var(--tr-text-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tr-crumb-sep { color: var(--tr-text-3); }
.tr-toolbar-actions { display: flex; align-items: center; gap: 6px; flex: none; }
.tr-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: .5px solid var(--tr-border);
  border-radius: 7px;
  background: var(--tr-bg);
  color: var(--tr-text-2);
  font: inherit;
  font-size: 11.5px;
  cursor: pointer;
}
.tr-refresh:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.045)); color: var(--tr-text); }
.tr-refresh:disabled { opacity: .55; cursor: default; }
.tr-icon-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--tr-text-2);
  cursor: pointer;
}
.tr-icon-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.045)); color: var(--tr-text); }
.tr-rail-toggle { display: none; }
.tr-nav-toggle { display: none; }
.tr-nav-backdrop { display: none; }
.tr-btn-count {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 14px;
  height: 14px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--tr-warn);
  color: #fff;
  font-size: 9px;
  line-height: 14px;
  font-weight: 700;
}
.tr-spin { display: inline-flex; animation: tr-spin .9s linear infinite; }
@keyframes tr-spin { to { transform: rotate(360deg); } }
.tr-scroll { flex: 1; min-height: 0; overflow: auto; scroll-behavior: smooth; }
.tr-reader { max-width: 880px; margin: 0 auto; padding: 34px clamp(22px, 5vw, 52px) 80px; }
.tr-doc-head { border-bottom: .5px solid var(--tr-border); padding-bottom: 22px; margin-bottom: 30px; }
.tr-doc-kicker { color: var(--tr-text-3); font-size: 11px; letter-spacing: .02em; text-transform: uppercase; display: flex; gap: 6px; flex-wrap: wrap; }
.tr-kicker-sep { opacity: .6; }
.tr-doc-head h1 {
  margin: 10px 0 0;
  font-size: clamp(25px, 3vw, 32px);
  line-height: 1.25;
  letter-spacing: -.022em;
  font-weight: 650;
  color: var(--tr-text);
}
.tr-doc-desc { margin: 10px 0 0; color: var(--tr-text-2); font-size: 14px; line-height: 1.7; }
.tr-doc-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-top: 13px; color: var(--tr-text-3); font-size: 11px; }
.tr-meta-dot { opacity: .5; }
.tr-meta-notes { color: var(--tr-warn); font-weight: 500; }
.tr-meta-muted { color: var(--tr-text-3); }
.tr-doc-body {
  font-family: var(--tr-font-doc);
  font-size: 16.25px;
  line-height: 1.92;
  color: var(--tr-text);
  overflow-wrap: anywhere;
}
.tr-doc-body > :first-child { margin-top: 0; }
.tr-doc-body p { margin: 0 0 17px; }
.tr-doc-body h1, .tr-doc-body h2, .tr-doc-body h3, .tr-doc-body h4, .tr-doc-body h5, .tr-doc-body h6 {
  color: var(--tr-text);
  letter-spacing: -.015em;
  line-height: 1.35;
  scroll-margin-top: 22px;
}
.tr-doc-body h2 { font-size: 23px; font-weight: 650; margin: 42px 0 14px; }
.tr-doc-body h3 { font-size: 18px; font-weight: 650; margin: 30px 0 10px; }
.tr-doc-body h4 { font-size: 16px; font-weight: 650; margin: 24px 0 8px; }
.tr-doc-body h1 { font-size: 27px; font-weight: 650; margin: 34px 0 14px; }
.tr-doc-body a { color: var(--tr-accent); text-decoration: none; border-bottom: .5px solid color-mix(in srgb, var(--tr-accent) 45%, transparent); }
.tr-doc-body a:hover { border-bottom-color: var(--tr-accent); }
.tr-doc-body .tr-internal-link { color: var(--tr-text-2); border-bottom-style: dotted; cursor: default; }
.tr-doc-body strong { font-weight: 650; }
.tr-doc-body ul, .tr-doc-body ol { margin: 0 0 17px; padding-left: 1.35em; }
.tr-doc-body li { margin: 4px 0; }
.tr-doc-body li > p { margin-bottom: 6px; }
.tr-doc-body blockquote {
  margin: 22px 0;
  padding: 2px 0 2px 16px;
  border-left: 2.5px solid var(--tr-border-strong);
  color: var(--tr-text-2);
}
.tr-doc-body blockquote p:last-child { margin-bottom: 0; }
.tr-doc-body hr { border: 0; border-top: .5px solid var(--tr-border); margin: 32px 0; }
.tr-doc-body img { display: block; max-width: 100%; height: auto; border-radius: var(--tr-radius-sm); border: .5px solid var(--tr-border); margin: 18px auto; }
.tr-doc-body .tr-inline-code {
  font-family: var(--tr-font-mono);
  font-size: .87em;
  padding: 2px 5px;
  border-radius: 4px;
  background: var(--dsw-alias-markdown-inline-code, var(--tr-bg-softer));
  border: .5px solid var(--tr-border);
}
.tr-doc-body .tr-math { font-family: var(--tr-font-mono); font-size: .9em; color: var(--tr-text-2); }
.tr-doc-body .tr-math-block { overflow-x: auto; padding: 12px 14px; background: var(--tr-bg-soft); border-radius: var(--tr-radius-sm); margin: 18px 0; }
.tr-doc-body .tr-code {
  position: relative;
  margin: 20px 0;
  padding: 30px 16px 15px;
  overflow: auto;
  border: .5px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  background: var(--dsw-alias-markdown-code-block, var(--tr-bg-soft));
  font-family: var(--tr-font-mono);
  font-size: 12.25px;
  line-height: 1.7;
  tab-size: 2;
}
.tr-doc-body .tr-code code { font: inherit; white-space: pre; }
.tr-code-lang {
  position: absolute;
  top: 8px;
  left: 13px;
  color: var(--tr-text-3);
  font-family: var(--tr-font-mono);
  font-size: 9.5px;
  letter-spacing: .03em;
  text-transform: uppercase;
}
.tr-table-wrap { overflow-x: auto; margin: 20px 0; border: .5px solid var(--tr-border); border-radius: var(--tr-radius-sm); }
.tr-doc-body table { width: 100%; border-collapse: collapse; font-size: 13px; line-height: 1.6; }
.tr-doc-body th, .tr-doc-body td { padding: 8px 12px; border-bottom: .5px solid var(--tr-border); text-align: left; vertical-align: top; }
.tr-doc-body th { background: var(--tr-bg-soft); font-weight: 600; }
.tr-doc-body tr:last-child td { border-bottom: 0; }
.tr-source-mark { background: color-mix(in srgb, var(--tr-accent) 10%, transparent); color: inherit; border-radius: 3px; padding: 0 2px; }
.tr-takeaway {
  margin: 24px 0;
  padding: 16px 20px;
  border-radius: var(--tr-radius-sm);
  background: color-mix(in srgb, var(--tr-accent) 6%, var(--tr-bg));
  border: .5px solid color-mix(in srgb, var(--tr-accent) 20%, transparent);
  border-left: 3px solid var(--tr-accent);
}
.tr-takeaway p:last-child, .tr-callout p:last-child, .tr-author-note p:last-child { margin-bottom: 0; }
.tr-callout {
  margin: 22px 0;
  padding: 15px 18px;
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg-soft);
  border: .5px solid var(--tr-border);
}
.tr-component-label {
  color: var(--tr-text-3);
  font-family: var(--tr-font);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.tr-takeaway .tr-component-label { color: var(--tr-accent); }
.tr-author-note {
  margin: 22px 0;
  padding: 14px 18px;
  border-radius: var(--tr-radius-sm);
  background: color-mix(in srgb, var(--tr-warn) 6%, var(--tr-bg));
  border: .5px solid color-mix(in srgb, var(--tr-warn) 18%, transparent);
  font-size: 14px;
  line-height: 1.8;
  color: var(--tr-text-2);
}
.tr-author-note .tr-component-label { color: var(--tr-warn); }
.tr-author-anchor { border-bottom: 1px dashed color-mix(in srgb, var(--tr-warn) 55%, transparent); }
.tr-author-anchor-mark { color: var(--tr-warn); font-size: .7em; margin-left: 2px; vertical-align: super; }
.tr-steps { padding-left: 1.3em; }
.tr-step { margin: 10px 0; }
.tr-chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 22px 0;
  padding: 14px;
  border-radius: var(--tr-radius);
  background: var(--tr-bg-soft);
  border: .5px solid var(--tr-border);
}
.tr-chat-message { display: flex; flex-direction: column; gap: 4px; max-width: 88%; }
.tr-from-user { align-self: flex-end; align-items: flex-end; }
.tr-from-assistant { align-self: flex-start; }
.tr-chat-who { color: var(--tr-text-3); font-family: var(--tr-font); font-size: 10px; }
.tr-chat-body {
  padding: 9px 13px;
  border-radius: 11px;
  background: var(--tr-bg);
  border: .5px solid var(--tr-border);
  font-size: 14.5px;
  line-height: 1.7;
}
.tr-from-user .tr-chat-body { background: color-mix(in srgb, var(--tr-accent) 9%, var(--tr-bg)); border-color: color-mix(in srgb, var(--tr-accent) 18%, transparent); }
.tr-chat-body p { margin: 0; }
.tr-thinking { color: var(--tr-text-3); font-style: italic; }
.tr-thinking-block, .tr-tool-call {
  margin: 16px 0;
  padding: 10px 14px;
  border: .5px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg-soft);
  font-size: 13.5px;
  line-height: 1.7;
}
.tr-thinking-block summary, .tr-tool-call summary { cursor: pointer; color: var(--tr-text-2); font-weight: 500; }
.tr-quiz {
  margin: 26px 0;
  padding: 18px 20px;
  border-radius: var(--tr-radius);
  background: var(--tr-bg-soft);
  border: .5px solid var(--tr-border);
}
.tr-quiz h4 { margin: 0; font-size: 17px; }
.tr-quiz-question { margin: 8px 0 14px; color: var(--tr-text); font-size: 14.5px; }
.tr-quiz-options { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 7px; }
.tr-quiz-option {
  position: relative;
  padding: 9px 34px 9px 13px;
  border: .5px solid var(--tr-border);
  border-radius: 8px;
  background: var(--tr-bg);
  font-size: 13.5px;
  line-height: 1.6;
}
.tr-quiz-option p { margin: 0; }
.tr-quiz-correct { border-color: color-mix(in srgb, var(--tr-success) 35%, transparent); background: color-mix(in srgb, var(--tr-success) 7%, var(--tr-bg)); }
.tr-quiz-check { position: absolute; right: 12px; top: 9px; color: var(--tr-success); font-weight: 700; }
.tr-quiz-explain, .tr-quiz-takeaway { border-top: .5px dashed var(--tr-border-strong); padding-top: 12px; margin-top: 12px; }
.tr-quiz-explain-label { color: var(--tr-text-3); font-family: var(--tr-font); font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.tr-quiz-explain p, .tr-quiz-takeaway p { margin: 5px 0 0; color: var(--tr-text-2); font-size: 13.5px; line-height: 1.7; }
.tr-quiz-takeaway p { color: var(--tr-text); }
.tr-embed {
  margin: 22px 0;
  padding: 20px;
  border: 1px dashed var(--tr-border-strong);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg-soft);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}
.tr-embed-kicker { color: var(--tr-text-3); font-family: var(--tr-font); font-size: 9.5px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
.tr-embed-name { color: var(--tr-text); font-family: var(--tr-font-mono); font-size: 12px; }
.tr-embed-hint { color: var(--tr-text-3); font-family: var(--tr-font); font-size: 11px; }
.tr-embed-link { font-family: var(--tr-font); font-size: 13px; }
.tr-component { margin: 18px 0; }
.tr-citation { color: var(--tr-text-2); }
.tr-parse-error { color: var(--tr-error); font-size: 13px; padding: 12px; border: .5px solid var(--tr-error); border-radius: 8px; }
.tr-no-notes {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--tr-text-3);
  font-size: 12px;
  border-top: .5px solid var(--tr-border);
  margin-top: 36px;
  padding-top: 14px;
}
.tr-doc-foot { display: flex; gap: 12px; margin-top: 48px; border-top: .5px solid var(--tr-border); padding-top: 18px; }
.tr-page-btn {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 13px;
  border: .5px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
  color: var(--tr-text-2);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.tr-page-btn:hover:not(:disabled) { background: var(--tr-bg-soft); color: var(--tr-text); }
.tr-page-btn:disabled { opacity: .4; cursor: default; }
.tr-page-btn > span { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.tr-page-next { text-align: right; flex-direction: row-reverse; }
.tr-page-btn-kicker { color: var(--tr-text-3); font-size: 9.5px; text-transform: uppercase; letter-spacing: .04em; }
.tr-page-btn-title { font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tr-arrow { flex: none; color: var(--tr-text-3); }
.tr-state { min-height: 55vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 24px; gap: 8px; }
.tr-state h2 { margin: 6px 0 0; font-size: 19px; font-weight: 600; }
.tr-state p { margin: 0; color: var(--tr-text-3); font-size: 13px; max-width: 420px; line-height: 1.65; }
.tr-state-error h2 { color: var(--tr-error); }
.tr-empty-mark { color: var(--tr-text-3); opacity: .8; }
.tr-muted { color: var(--tr-text-3); }
.tr-primary {
  margin-top: 8px;
  height: 30px;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: var(--tr-accent);
  color: #fff;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.tr-inline-state { min-height: 0; padding: 24px; margin: 20px 0; border: .5px solid var(--tr-border); border-radius: var(--tr-radius); }
.tr-nav-empty { padding: 24px 12px; color: var(--tr-text-3); font-size: 12px; line-height: 1.6; }
.tr-nav-empty p { margin: 0 0 4px; }
.tr-skeleton { padding: 8px 10px; display: flex; flex-direction: column; gap: 14px; }
.tr-skeleton-group { display: flex; flex-direction: column; gap: 8px; }
.tr-skeleton-bar { height: 12px; border-radius: 5px; background: var(--dsw-alias-bg-skeleton, var(--tr-bg-softer)); animation: tr-pulse 1.8s ease-in-out infinite; }
.tr-skeleton-head { width: 60%; height: 14px; margin-bottom: 4px; }
.tr-skeleton-group .tr-skeleton-bar:not(.tr-skeleton-head) { width: 88%; }
.tr-skeleton-group .tr-skeleton-bar:nth-child(3n) { width: 72%; }
.tr-doc-skeleton { max-width: 780px; margin: 50px auto; padding: 0 48px; display: flex; flex-direction: column; gap: 12px; }
.tr-skeleton-title { width: 55%; height: 28px; }
.tr-skeleton-line { width: 100%; height: 13px; }
.tr-skeleton-short { width: 68%; }
.tr-skeleton-gap { height: 18px; }
@keyframes tr-pulse { 0%,100% { opacity: .55; } 50% { opacity: 1; } }
.tr-rail {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-left: .5px solid var(--tr-border);
  background: var(--tr-bg-soft);
}
.tr-rail-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 20px 16px 12px;
  border-bottom: .5px solid var(--tr-border);
}
.tr-rail-head h2 { margin: 0; font-size: 12.5px; font-weight: 600; flex: 1; }
.tr-rail-count {
  min-width: 19px;
  height: 19px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--tr-highlight);
  color: var(--tr-warn);
  font-size: 10px;
  font-weight: 700;
}
.tr-rail-close { display: none; font-size: 18px; }
.tr-rail-scroll { flex: 1; min-height: 0; overflow: auto; padding: 12px 10px 24px; }
.tr-rail-empty { padding: 28px 12px; color: var(--tr-text-3); font-size: 12px; line-height: 1.7; }
.tr-notes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.tr-note {
  border: .5px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
  padding: 12px 13px;
  cursor: pointer;
  transition: border-color .16s ease, box-shadow .16s ease, transform .16s ease;
}
.tr-note:hover { border-color: var(--tr-border-strong); }
.tr-note.is-active {
  border-color: color-mix(in srgb, var(--tr-warn) 55%, transparent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tr-warn) 10%, transparent);
}
.tr-note-head { display: flex; align-items: center; gap: 6px; margin-bottom: 7px; }
.tr-note-index {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  background: var(--tr-warn);
  color: #fff;
  font-size: 9.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.tr-note-cat { color: var(--tr-text-3); font-size: 10px; flex: 1; }
.tr-note-missing-tag { color: var(--tr-text-3); font-size: 9.5px; border: .5px solid var(--tr-border); border-radius: 999px; padding: 1px 5px; }
.tr-note-quote {
  margin: 0 0 8px;
  padding-left: 9px;
  border-left: 2px solid color-mix(in srgb, var(--tr-warn) 55%, transparent);
  color: var(--tr-text-2);
  font-size: 11.5px;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tr-note-comment { margin: 0; color: var(--tr-text); font-size: 12px; line-height: 1.72; }
.tr-note.is-missing { opacity: .82; }
.tr-missing { margin-top: 22px; border-top: .5px solid var(--tr-border); padding-top: 14px; }
.tr-missing h3 { margin: 0 0 4px; font-size: 11.5px; font-weight: 600; color: var(--tr-text-2); }
.tr-missing > p { margin: 0 0 10px; color: var(--tr-text-3); font-size: 10.5px; line-height: 1.6; }
.tr-missing .tr-note { margin-bottom: 8px; }
.tr-rail-foot { margin: 22px 4px 0; padding-top: 12px; border-top: .5px solid var(--tr-border); color: var(--tr-text-3); font-size: 10px; line-height: 1.6; }
.tr-rail-backdrop { display: none; }
.tr-annotation {
  background: var(--tr-highlight);
  border-bottom: 1.5px solid color-mix(in srgb, var(--tr-warn) 70%, transparent);
  border-radius: 2px;
  padding: 0 1px;
  cursor: pointer;
  transition: background .14s ease, border-color .14s ease;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}
.tr-annotation:hover, .tr-annotation.is-active { background: var(--tr-highlight-active); border-bottom-color: var(--tr-warn); }
.tr-annotation:focus-visible { outline: 2px solid var(--tr-warn); outline-offset: 1px; }
.tr-annotation-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  margin-left: 3px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--tr-warn);
  color: #fff;
  font-family: var(--tr-font);
  font-size: 8.5px;
  font-weight: 700;
  line-height: 1;
  vertical-align: super;
  font-style: normal;
}

.tr-toolbar { position: relative; }
.tr-link-wrap { position: relative; }
.tr-link-trigger svg { color: var(--tr-text-3); }
.tr-link-menu {
  position: absolute;
  top: 36px;
  right: 0;
  width: min(310px, 78vw);
  z-index: 45;
  padding: 8px;
  border: .5px solid var(--tr-border-strong);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
  box-shadow: 0 12px 34px rgba(0,0,0,.16);
}
.tr-link-menu-title { margin: 2px 4px 7px; color: var(--tr-text-3); font-size: 10.5px; line-height: 1.5; }
.tr-link-menu-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--tr-text);
  text-align: left;
  padding: 8px 8px;
  cursor: pointer;
  font: inherit;
}
.tr-link-menu-item:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.045)); }
.tr-link-menu-icon { color: var(--tr-text-3); flex: none; margin-top: 1px; }
.tr-link-menu-item > span:last-child { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tr-link-menu-item strong { font-size: 12px; font-weight: 550; }
.tr-link-menu-item small { color: var(--tr-text-3); font-size: 10.5px; line-height: 1.45; }
.tr-selection-menu {
  position: fixed;
  z-index: 70;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 7px;
  border: .5px solid var(--tr-border-strong);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
  box-shadow: 0 14px 40px rgba(0,0,0,.2);
}
.tr-selection-menu-label {
  padding: 1px 4px;
  color: var(--tr-text-3);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: .05em;
  text-transform: uppercase;
  white-space: nowrap;
}
.tr-selection-menu-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
.tr-selection-action {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--tr-text);
  padding: 7px 10px;
  cursor: pointer;
  font: inherit;
  font-size: 11.5px;
  white-space: nowrap;
  text-align: left;
}
.tr-selection-action:hover { background: color-mix(in srgb, var(--tr-accent) 9%, transparent); color: var(--tr-accent); }
.tr-assist-section { margin-top: 18px; border-top: .5px solid var(--tr-border); padding-top: 12px; }
.tr-assist-section > h3 {
  margin: 0 4px 8px;
  color: var(--tr-text-2);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .02em;
}
.tr-assist-empty-hint { margin-top: 8px !important; }
.tr-note-index-ai { background: var(--tr-accent); font-size: 11px; }
.tr-note-ai-badge {
  color: var(--tr-accent);
  border: .5px solid color-mix(in srgb, var(--tr-accent) 32%, transparent);
  border-radius: 999px;
  padding: 1px 5px;
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: .04em;
}
.tr-note-loading { color: var(--tr-text-3); font-size: 9.5px; margin-left: auto; }
.tr-assist-loading { padding: 4px 0 2px; }
.tr-assist-loading p { margin: 8px 0 0; color: var(--tr-text-3); font-size: 10.5px; line-height: 1.5; }
.tr-assist-skeleton { display: flex; flex-direction: column; gap: 5px; }
.tr-assist-skeleton span {
  display: block;
  height: 7px;
  border-radius: 4px;
  background: var(--dsw-alias-bg-skeleton, var(--tr-bg-softer));
  animation: tr-pulse 1.8s ease-in-out infinite;
}
.tr-assist-skeleton span:nth-child(1) { width: 92%; }
.tr-assist-skeleton span:nth-child(2) { width: 76%; }
.tr-assist-skeleton span:nth-child(3) { width: 58%; }
.tr-assist-error { padding: 5px 0 2px; }
.tr-assist-error p { margin: 0 0 8px; color: var(--tr-error); font-size: 11px; line-height: 1.55; }
.tr-assist-retry,
.tr-assist-copy {
  border: .5px solid var(--tr-border);
  border-radius: 6px;
  background: var(--tr-bg-soft);
  color: var(--tr-text-2);
  padding: 4px 8px;
  cursor: pointer;
  font: inherit;
  font-size: 10px;
}
.tr-assist-retry:hover,
.tr-assist-copy:hover { color: var(--tr-text); background: var(--tr-bg-softer); }
.tr-assist-actions { display: flex; justify-content: flex-end; margin-top: 9px; }
.tr-assist-label {
  color: var(--tr-text-3);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
  margin-bottom: 5px;
}
.tr-assist-rewrite {
  margin: 0;
  padding: 9px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--tr-accent) 5%, var(--tr-bg-soft));
  color: var(--tr-text);
  font-size: 12px;
  line-height: 1.72;
  white-space: pre-wrap;
}
.tr-assist-notes { margin: 8px 0 0; padding-left: 16px; color: var(--tr-text-2); font-size: 11px; line-height: 1.6; }
.tr-assist-notes li { margin: 3px 0; }
.tr-assist-directions { margin: 0; padding-left: 16px; color: var(--tr-text); font-size: 11.5px; line-height: 1.65; }
.tr-assist-directions li { margin: 0 0 8px; }
.tr-assist-directions strong { font-size: 11.5px; font-weight: 600; }
.tr-assist-directions p { margin: 3px 0 0; color: var(--tr-text-2); }
.tr-assist-links { display: flex; flex-direction: column; gap: 9px; }
.tr-assist-link { border-left: 2px solid color-mix(in srgb, var(--tr-accent) 32%, transparent); padding-left: 8px; }
.tr-assist-link-title {
  display: inline;
  border: 0;
  background: transparent;
  color: var(--tr-accent);
  padding: 0;
  cursor: pointer;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  text-align: left;
  text-decoration: none;
}
.tr-assist-link-title:hover { text-decoration: underline; }
.tr-assist-domain { display: block; color: var(--tr-text-3); font-size: 9px; margin-top: 1px; }
.tr-assist-link-reason { margin: 3px 0 0; color: var(--tr-text-2); font-size: 10.5px; line-height: 1.6; }
.tr-assist-snippet { margin: 3px 0 0; color: var(--tr-text-3); font-size: 10px; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tr-assist-muted { margin: 0; color: var(--tr-text-3); font-size: 10.5px; line-height: 1.55; }
.tr-assist-fallback { margin: 8px 0 0; color: var(--tr-warn); font-size: 9.5px; line-height: 1.5; }
.tr-assist-note { margin: 7px 0 0; color: var(--tr-text-3); font-size: 9.5px; line-height: 1.5; }
.tr-annotation-assist {
  background: color-mix(in srgb, var(--tr-accent) 13%, transparent);
  border-bottom-color: color-mix(in srgb, var(--tr-accent) 65%, transparent);
}
.tr-annotation-assist:hover, .tr-annotation-assist.is-active {
  background: color-mix(in srgb, var(--tr-accent) 22%, transparent);
  border-bottom-color: var(--tr-accent);
}
.tr-annotation-assist .tr-annotation-index { background: var(--tr-accent); }
@media (prefers-reduced-motion: reduce) {
  .tr-assist-skeleton span { animation: none; }
}


.tr-proof-trigger { position: relative; }
.tr-btn-count.tr-proof-count { background: var(--tr-error); }
.tr-proof-section { margin-top: 18px; border-top: .5px solid var(--tr-border); padding-top: 12px; }
.tr-proof-idle .tr-proof-start { margin-top: 0; }
.tr-proof-head { display: flex; align-items: center; gap: 8px; margin: 0 4px 8px; }
.tr-proof-head h3 { margin: 0; flex: 1; color: var(--tr-text-2); font-size: 11px; font-weight: 600; letter-spacing: .02em; }
.tr-proof-tag {
  color: var(--tr-text-3);
  border: .5px solid var(--tr-border);
  border-radius: 999px;
  padding: 1px 6px;
  font-size: 8.5px;
  line-height: 1.5;
  white-space: nowrap;
}
.tr-proof-tag.is-error { color: var(--tr-error); border-color: color-mix(in srgb, var(--tr-error) 32%, transparent); }
.tr-proof-tag.is-clean { color: var(--tr-success); border-color: color-mix(in srgb, var(--tr-success) 32%, transparent); }
.tr-proof-tag.is-loading { color: var(--tr-text-3); }
.tr-proof-status {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 11px;
  border: .5px solid var(--tr-border);
  border-radius: var(--tr-radius-sm);
  background: var(--tr-bg);
  color: var(--tr-text-2);
  font-size: 10.5px;
  line-height: 1.55;
}
.tr-proof-status.is-loading { color: var(--tr-text-3); }
.tr-proof-status.is-error { color: var(--tr-error); flex-direction: column; align-items: flex-start; }
.tr-proof-status.is-clean { color: var(--tr-success); }
.tr-proof-status p { margin: 0 0 2px; }
.tr-proof-check {
  width: 17px;
  height: 17px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--tr-success) 14%, transparent);
  color: var(--tr-success);
  font-size: 10px;
  font-weight: 700;
  flex: none;
}
.tr-proof-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.tr-note-proof.tr-proof-typo { background: color-mix(in srgb, var(--tr-error) 4%, var(--tr-bg)); }
.tr-note-proof.tr-proof-grammar { background: color-mix(in srgb, var(--tr-warn) 4%, var(--tr-bg)); }
.tr-note-index-proof { font-size: 9px; }
.tr-note-index-typo { background: var(--tr-error); }
.tr-note-index-grammar { background: var(--tr-warn); }
.tr-proof-body { padding-top: 2px; }
.tr-proof-label {
  color: var(--tr-text-3);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.tr-proof-suggestion {
  margin: 0;
  padding: 7px 9px;
  border-radius: 6px;
  background: var(--tr-bg-soft);
  color: var(--tr-text);
  font-size: 11.5px;
  line-height: 1.65;
}
.tr-proof-reason { margin: 6px 0 0; color: var(--tr-text-2); font-size: 10.5px; line-height: 1.55; }
.tr-proof-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
.tr-proof-start {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  border: .5px solid var(--tr-border);
  border-radius: 6px;
  background: var(--tr-bg-soft);
  color: var(--tr-text-2);
  padding: 5px 9px;
  cursor: pointer;
  font: inherit;
  font-size: 10.5px;
}
.tr-proof-start:hover:not(:disabled) { color: var(--tr-text); background: var(--tr-bg-softer); }
.tr-proof-start:disabled { opacity: .55; cursor: default; }
.tr-annotation-proof-typo {
  background: color-mix(in srgb, var(--tr-error) 14%, transparent);
  border-bottom-color: color-mix(in srgb, var(--tr-error) 65%, transparent);
  border-bottom-style: wavy;
}
.tr-annotation-proof-grammar {
  background: color-mix(in srgb, var(--tr-warn) 16%, transparent);
  border-bottom-color: color-mix(in srgb, var(--tr-warn) 65%, transparent);
  border-bottom-style: wavy;
}
.tr-annotation-proof-typo:hover, .tr-annotation-proof-typo.is-active {
  background: color-mix(in srgb, var(--tr-error) 24%, transparent);
  border-bottom-color: var(--tr-error);
}
.tr-annotation-proof-grammar:hover, .tr-annotation-proof-grammar.is-active {
  background: color-mix(in srgb, var(--tr-warn) 26%, transparent);
  border-bottom-color: var(--tr-warn);
}
.tr-annotation-proof-typo .tr-annotation-index { background: var(--tr-error); }
.tr-annotation-proof-grammar .tr-annotation-index { background: var(--tr-warn); }
.tr-selection-menu-actions .tr-selection-action:last-child:nth-child(odd) { grid-column: 1 / -1; }

.tr-enhance-trigger { position: relative; }
.tr-note-link.tr-link-internal {
  background: color-mix(in srgb, var(--tr-success) 4%, var(--tr-bg));
}
.tr-note-link.tr-link-external {
  background: color-mix(in srgb, var(--tr-accent) 4%, var(--tr-bg));
}
.tr-note-index-link { font-size: 9px; }
.tr-note-index-internal { background: var(--tr-success); }
.tr-note-index-external { background: var(--tr-accent); }
.tr-link-body { padding-top: 2px; }
.tr-link-label {
  color: var(--tr-text-3);
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.tr-link-title {
  display: inline;
  border: 0;
  background: transparent;
  color: var(--tr-success);
  padding: 0;
  cursor: pointer;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  text-align: left;
  text-decoration: none;
}
.tr-note-link.tr-link-external .tr-link-title { color: var(--tr-accent); }
.tr-link-title:hover { text-decoration: underline; }
.tr-link-domain { display: block; color: var(--tr-text-3); font-size: 9px; margin-top: 1px; }
.tr-link-reason { margin: 4px 0 0; color: var(--tr-text-2); font-size: 10.5px; line-height: 1.6; }
.tr-link-snippet { margin: 3px 0 0; color: var(--tr-text-3); font-size: 10px; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.tr-link-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
.tr-annotation-link-internal {
  background: color-mix(in srgb, var(--tr-success) 14%, transparent);
  border-bottom-color: color-mix(in srgb, var(--tr-success) 65%, transparent);
}
.tr-annotation-link-external {
  background: color-mix(in srgb, var(--tr-accent) 13%, transparent);
  border-bottom-color: color-mix(in srgb, var(--tr-accent) 65%, transparent);
}
.tr-annotation-link-internal:hover, .tr-annotation-link-internal.is-active {
  background: color-mix(in srgb, var(--tr-success) 24%, transparent);
  border-bottom-color: var(--tr-success);
}
.tr-annotation-link-external:hover, .tr-annotation-link-external.is-active {
  background: color-mix(in srgb, var(--tr-accent) 22%, transparent);
  border-bottom-color: var(--tr-accent);
}
.tr-annotation-link-internal .tr-annotation-index { background: var(--tr-success); }
.tr-annotation-link-external .tr-annotation-index { background: var(--tr-accent); }

/* Unified review card surface */
.tr-note {
  --tr-note-accent: var(--tr-text-3);
  --tr-flash: var(--tr-note-accent);
  position: relative;
  border: .5px solid var(--tr-border);
  border-radius: 9px;
  background: var(--tr-bg);
  padding: 11px 12px 10px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .025);
  transition: border-color .15s ease, box-shadow .15s ease;
}
.tr-note:hover { border-color: var(--tr-border-strong); box-shadow: 0 2px 8px rgba(0, 0, 0, .05); }
.tr-note.is-active {
  border-color: var(--tr-border-strong);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--tr-note-accent) 11%, transparent), 0 2px 10px rgba(0, 0, 0, .06);
}
.tr-note.tr-note-assist { --tr-note-accent: var(--tr-accent); background: var(--tr-bg); }
.tr-note.tr-note-proof.tr-proof-typo { --tr-note-accent: var(--tr-error); background: var(--tr-bg); }
.tr-note.tr-note-proof.tr-proof-grammar { --tr-note-accent: var(--tr-warn); background: var(--tr-bg); }
.tr-note.tr-note-link.tr-link-internal { --tr-note-accent: var(--tr-success); background: var(--tr-bg); }
.tr-note.tr-note-link.tr-link-external { --tr-note-accent: var(--tr-accent); background: var(--tr-bg); }
.tr-note-head { display: flex; align-items: center; gap: 7px; margin: 0 0 8px; }
.tr-note .tr-note-index,
.tr-note .tr-note-index-ai,
.tr-note .tr-note-index-proof,
.tr-note .tr-note-index-typo,
.tr-note .tr-note-index-grammar,
.tr-note .tr-note-index-link,
.tr-note .tr-note-index-internal,
.tr-note .tr-note-index-external {
  width: 20px;
  height: 20px;
  min-width: 20px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--tr-note-accent) 13%, var(--tr-bg));
  color: var(--tr-note-accent);
  border: .5px solid color-mix(in srgb, var(--tr-note-accent) 28%, transparent);
  font-size: 9.5px;
  font-weight: 700;
  padding: 0;
}
.tr-note-cat { flex: 1; min-width: 0; color: var(--tr-text-2); font-size: 10px; font-weight: 500; line-height: 1.4; }
.tr-note-ai-badge {
  margin-left: auto;
  flex: none;
  border: .5px solid var(--tr-border);
  border-radius: 999px;
  background: transparent;
  color: var(--tr-text-3);
  padding: 0 5px;
  font-size: 8px;
  line-height: 15px;
  font-weight: 600;
  letter-spacing: .02em;
}
.tr-note-loading { margin-left: 0; }
.tr-note-quote {
  margin: 0 0 8px;
  padding: 7px 9px;
  border-left: 2px solid var(--tr-border-strong);
  border-radius: 0 6px 6px 0;
  background: var(--tr-bg-soft);
  color: var(--tr-text-2);
  font-size: 11px;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tr-note-comment { margin: 0; color: var(--tr-text); font-size: 12px; line-height: 1.72; }
.tr-proof-body, .tr-assist-body, .tr-link-body { padding: 0; }
.tr-proof-label, .tr-link-label, .tr-assist-label {
  color: var(--tr-text-3);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .05em;
  text-transform: uppercase;
  margin: 0 0 4px;
}
.tr-proof-diff {
  margin: 0 0 8px;
  padding: 7px 9px;
  border-left: 2px solid var(--tr-border-strong);
  border-radius: 0 6px 6px 0;
  background: var(--tr-bg-soft);
  color: var(--tr-text);
  font-size: 11.5px;
  line-height: 1.75;
  overflow-wrap: anywhere;
}
.tr-diff-del {
  color: var(--tr-error);
  background: color-mix(in srgb, var(--tr-error) 14%, transparent);
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  border-radius: 2px;
  padding: 0 1px;
}
.tr-diff-add {
  color: var(--tr-success);
  background: color-mix(in srgb, var(--tr-success) 15%, transparent);
  text-decoration: none;
  border-radius: 2px;
  padding: 0 1px;
}
.tr-proof-suggestion, .tr-assist-rewrite {
  margin: 0;
  padding: 8px 9px;
  border-left: 2px solid var(--tr-border-strong);
  border-radius: 0 6px 6px 0;
  background: var(--tr-bg-soft);
  color: var(--tr-text);
  font-size: 11.5px;
  line-height: 1.68;
  white-space: pre-wrap;
}
.tr-proof-reason { margin: 6px 0 0; color: var(--tr-text-2); font-size: 10.5px; line-height: 1.6; }
.tr-link-title { color: var(--tr-note-accent); font-size: 11.5px; font-weight: 600; }
.tr-link-domain { color: var(--tr-text-3); font-size: 9px; margin-top: 1px; }
.tr-link-reason { margin: 4px 0 0; color: var(--tr-text-2); font-size: 10.5px; line-height: 1.6; }
.tr-link-snippet { margin: 3px 0 0; color: var(--tr-text-3); font-size: 10px; line-height: 1.55; }
.tr-proof-actions, .tr-link-actions, .tr-assist-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
.tr-assist-copy, .tr-assist-retry {
  border: .5px solid var(--tr-border);
  border-radius: 6px;
  background: transparent;
  color: var(--tr-text-3);
  padding: 3px 8px;
  cursor: pointer;
  font: inherit;
  font-size: 9.5px;
  line-height: 1.5;
}
.tr-assist-copy:hover, .tr-assist-retry:hover { color: var(--tr-text); border-color: var(--tr-border-strong); background: var(--tr-bg-soft); }
.tr-proof-section { margin-top: 16px; border-top: .5px solid var(--tr-border); padding-top: 12px; }
.tr-proof-head { display: flex; align-items: center; gap: 8px; margin: 0 2px 8px; }
.tr-proof-head h3, .tr-assist-section > h3 {
  margin: 0;
  flex: 1;
  color: var(--tr-text-3);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .05em;
  text-transform: uppercase;
}
.tr-assist-section { margin-top: 16px; border-top: .5px solid var(--tr-border); padding-top: 12px; }
.tr-assist-section > h3 { margin: 0 2px 8px; }
.tr-proof-tag {
  color: var(--tr-text-3);
  border: .5px solid var(--tr-border);
  border-radius: 999px;
  padding: 1px 6px;
  font-size: 8.5px;
  line-height: 1.5;
  white-space: nowrap;
}
.tr-proof-tag.is-error { color: var(--tr-error); border-color: color-mix(in srgb, var(--tr-error) 32%, transparent); }
.tr-proof-tag.is-clean { color: var(--tr-success); border-color: color-mix(in srgb, var(--tr-success) 32%, transparent); }
.tr-proof-status { border: .5px solid var(--tr-border); border-radius: 8px; padding: 10px 11px; background: var(--tr-bg); }
.tr-proof-status + .tr-notes, .tr-proof-status + .tr-review-feed { margin-top: 10px; }
.tr-sources-note { margin: 10px 4px 0; }
.tr-rail-tools {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: .5px solid var(--tr-border);
  background: var(--tr-bg-soft);
}
.tr-rail-status {
  flex: 1;
  min-width: 0;
  color: var(--tr-text-3);
  font-size: 9.5px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tr-rail-rerun {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 8px;
  border: .5px solid var(--tr-border);
  border-radius: 6px;
  background: var(--tr-bg);
  color: var(--tr-text-2);
  cursor: pointer;
  font: inherit;
  font-size: 9.5px;
  flex: none;
}
.tr-rail-rerun:hover:not(:disabled) { color: var(--tr-text); border-color: var(--tr-border-strong); }
.tr-rail-rerun:disabled { opacity: .55; cursor: default; }
.tr-rail-rerun .tr-spin { display: inline-flex; }
.tr-proof-start { border-radius: 7px; }
.tr-annotation { --tr-flash: var(--tr-warn); }
.tr-annotation-assist { --tr-flash: var(--tr-accent); }
.tr-annotation-proof-typo { --tr-flash: var(--tr-error); }
.tr-annotation-proof-grammar { --tr-flash: var(--tr-warn); }
.tr-annotation-link-internal { --tr-flash: var(--tr-success); }
.tr-annotation-link-external { --tr-flash: var(--tr-accent); }
mark.tr-annotation.is-flashing {
  position: relative;
  z-index: 2;
  animation: tr-locate-flash 1.2s ease-out 1;
}
@keyframes tr-locate-flash {
  0% {
    background: color-mix(in srgb, var(--tr-flash) 18%, transparent);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--tr-flash) 0%, transparent);
  }
  25% {
    background: color-mix(in srgb, var(--tr-flash) 42%, transparent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--tr-flash) 24%, transparent);
  }
  65% {
    background: color-mix(in srgb, var(--tr-flash) 28%, transparent);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--tr-flash) 0%, transparent);
  }
  100% {
    background: color-mix(in srgb, var(--tr-flash) 18%, transparent);
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--tr-flash) 0%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  mark.tr-annotation.is-flashing { animation: none; outline: 2px solid var(--tr-flash); outline-offset: 2px; }
}
@media (max-width: 1180px) {
  .tr-root { grid-template-columns: minmax(200px, 236px) minmax(0, 1fr); }
  .tr-rail {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: min(360px, 88vw);
    z-index: 30;
    border-left: .5px solid var(--tr-border-strong);
    box-shadow: -18px 0 42px rgba(0,0,0,.14);
    transform: translateX(102%);
    transition: transform .2s ease;
  }
  .tr-rail.is-open { transform: translateX(0); }
  .tr-rail-toggle { display: inline-flex; }
  .tr-rail-close { display: inline-flex; }
  .tr-rail-backdrop {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 25;
    border: 0;
    background: color-mix(in srgb, #000 18%, transparent);
    cursor: pointer;
  }
}
@media (max-width: 820px) {
  .tr-root { grid-template-columns: minmax(0, 1fr); }
  .tr-nav {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: min(286px, 84vw);
    z-index: 32;
    border-right: .5px solid var(--tr-border-strong);
    box-shadow: 18px 0 42px rgba(0,0,0,.14);
    transform: translateX(-102%);
    transition: transform .2s ease;
  }
  .tr-nav.is-open { transform: translateX(0); }
  .tr-nav-toggle { display: inline-flex; }
  .tr-nav-backdrop {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 31;
    border: 0;
    background: color-mix(in srgb, #000 18%, transparent);
    cursor: pointer;
  }
  .tr-reader { padding: 24px 20px 60px; }
  .tr-toolbar { padding-left: 14px; padding-right: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .tr-spin, .tr-skeleton-bar { animation: none; }
  .tr-rail { transition: none; }
  .tr-scroll { scroll-behavior: auto; }
}
`;
