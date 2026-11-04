import { renderTutorial } from './render.js';
import { cssEscape, highlightAnnotations, readLocatedAnnotations } from './highlight.js';
import zh from '../locale/zh.json';
import en from '../locale/en.json';

const NS = 'tutorialReview';
const PANEL_ID = 'tutorial-review';
const STORAGE_KEY = 'dsh.tutorial-review.lesson';
const DICTIONARIES = { zh, en };

export function createPlugin(React) {
  const h = React.createElement;
  const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React;

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
    const [focusAnn, setFocusAnn] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshedAt, setRefreshedAt] = useState(null);
    const [railOpen, setRailOpen] = useState(false);
    const [navOpen, setNavOpen] = useState(false);
    const activeSource = useRef('mark');
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
    const annotationById = useMemo(() => new Map(annotations.map((item) => [item.id, item])), [annotations]);
    const locatedOrder = useMemo(() => new Map(located.map((item) => [item.id, item.index])), [located]);
    const sortedAnnotations = useMemo(() => {
      const positioned = annotations
        .filter((item) => locatedOrder.has(item.id))
        .sort((a, b) => locatedOrder.get(a.id) - locatedOrder.get(b.id));
      const missing = annotations.filter((item) => !locatedOrder.has(item.id));
      return { positioned, missing };
    }, [annotations, locatedOrder]);

    const rendered = useMemo(() => {
      if (!doc) return { html: '', error: false };
      return renderTutorial(doc.source, { lessonId: doc.lessonId });
    }, [doc]);

    const handleLocated = useCallback((next) => {
      setLocated((previous) => (sameLocated(previous, next) ? previous : next));
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
        if (target) await loadDoc(target, { keepActive: true });
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

    const noteCount = annotations.length;
    const searchActive = query.trim().length > 0;

    return h(
      'div',
      { className: 'tr-root' },
      h('style', null, STYLES),
      h(
        'aside',
        { className: `tr-nav${navOpen ? ' is-open' : ''}`, 'aria-label': t('panel') },
        h(
          'div',
          { className: 'tr-nav-head' },
          h('div', { className: 'tr-nav-kicker' }, t('title')),
          h('p', { className: 'tr-nav-sub' }, t('subtitle')),
        ),
        h(
          'label',
          { className: 'tr-search' },
          searchIcon(),
          h('input', {
            type: 'search',
            value: query,
            onChange: (event) => setQuery(event.target.value),
            placeholder: t('search'),
            'aria-label': t('search'),
          }),
          query
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'tr-search-clear',
                  onClick: () => setQuery(''),
                  'aria-label': t('clearSearch'),
                },
                '×',
              )
            : null,
        ),
        h(
          'div',
          { className: 'tr-nav-scroll' },
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
                    (sum, section) => sum + section.lessons.reduce((n, lesson) => n + (lesson.annotationCount || 0), 0),
                    0,
                  );
                  return h(
                    'section',
                    { className: 'tr-course', key: item.id },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'tr-course-head',
                        onClick: () => toggleCourse(item.id),
                        'aria-expanded': !isCollapsed,
                      },
                      h('span', { className: 'tr-chevron', 'data-collapsed': isCollapsed ? '1' : '0' }, chevronIcon()),
                      h('span', { className: 'tr-course-title' }, item.title),
                      h('span', { className: 'tr-course-count' }, `${count} ${t('lessons')}`),
                      notes > 0 ? h('span', { className: 'tr-course-notes' }, notes) : null,
                    ),
                    isCollapsed
                      ? null
                      : item.sections.map((section, sectionIndex) =>
                          h(
                            'div',
                            { className: 'tr-section', key: `${item.id}-${section.title || 'root'}-${sectionIndex}` },
                            section.title && (sectionIndex > 0 || item.sections.length > 1)
                              ? h('div', { className: 'tr-section-title' }, section.title)
                              : null,
                            section.lessons.map((lesson) =>
                              h(
                                'button',
                                {
                                  type: 'button',
                                  key: lesson.lessonId,
                                  className: `tr-lesson${lesson.lessonId === selectedId ? ' is-active' : ''}`,
                                  onClick: () => selectLesson(lesson.lessonId),
                                  'aria-current': lesson.lessonId === selectedId ? 'page' : undefined,
                                  title: lesson.title,
                                },
                                h('span', { className: 'tr-lesson-title' }, lesson.title),
                                lesson.annotationCount > 0
                                  ? h('span', { className: 'tr-lesson-notes', title: t('annotations') }, lesson.annotationCount)
                                  : null,
                              ),
                            ),
                          ),
                        ),
                  );
                }),
        ),
        h(
          'div',
          { className: 'tr-nav-foot' },
          h(
            'span',
            null,
            `${manifest?.totalLessons || 0} ${t('lessons')} · ${manifest?.totalAnnotations || 0} ${t('notes')}`,
          ),
          refreshedAt ? h('span', { className: 'tr-foot-time' }, `· ${formatTime(refreshedAt)}`) : null,
        ),
      ),
      h(
        'main',
        { className: 'tr-main' },
        h(
          'header',
          { className: 'tr-toolbar' },
          h(
            'div',
            { className: 'tr-crumbs' },
            h(
              'button',
              {
                type: 'button',
                className: 'tr-crumb-root',
                onClick: () => {
                  setQuery('');
                },
              },
              t('title'),
            ),
            course ? h('span', { className: 'tr-crumb-sep' }, '/') : null,
            course ? h('span', { className: 'tr-crumb-course' }, course.title) : null,
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
              noteCount > 0 ? h('span', { className: 'tr-btn-count' }, noteCount) : null,
            ),
            h(
              'button',
              {
                type: 'button',
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
                h(
                  'button',
                  { type: 'button', className: 'tr-primary', onClick: refresh },
                  t('retry'),
                ),
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
                      h(
                        'button',
                        { type: 'button', className: 'tr-primary', onClick: () => loadDoc(selectedId) },
                        t('retry'),
                      ),
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
                                h(
                                  'button',
                                  { type: 'button', className: 'tr-primary', onClick: () => loadDoc(selectedId) },
                                  t('retry'),
                                ),
                              )
                            : null,
                          rendered.error ? h('div', { className: 'tr-parse-error', dangerouslySetInnerHTML: { __html: rendered.html } }) : null,
                          docError
                            ? null
                            : h(MemoDocumentBody, {
                                html: rendered.html,
                                annotations,
                                activeId,
                                focusAnn,
                                onSelect: handleMarkSelect,
                                onLocated: handleLocated,
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
        { className: `tr-rail${railOpen ? ' is-open' : ''}`, 'aria-label': t('annotations') },
        h(
          'div',
          { className: 'tr-rail-head' },
          h('h2', null, t('annotations')),
          h('span', { className: 'tr-rail-count' }, noteCount),
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
          { className: 'tr-rail-scroll' },
          noteCount === 0
            ? h('div', { className: 'tr-rail-empty' }, h('p', null, t('noAnnotations')))
            : h(
                'ol',
                { className: 'tr-notes' },
                sortedAnnotations.positioned.map((annotation, index) =>
                  h(NoteCard, {
                    key: annotation.key,
                    annotation,
                    index: index + 1,
                    active: annotation.id === activeId,
                    onSelect: handleRailSelect,
                    onRef: (node) => {
                      if (node) cardRefs.current.set(annotation.id, node);
                      else cardRefs.current.delete(annotation.id);
                    },
                    t,
                  }),
                ),
              ),
          sortedAnnotations.missing.length > 0
            ? h(
                'section',
                { className: 'tr-missing' },
                h('h3', null, t('unlocated')),
                h('p', null, t('unlocatedHint')),
                sortedAnnotations.missing.map((annotation, index) =>
                  h(NoteCard, {
                    key: annotation.key,
                    annotation,
                    index: null,
                    missing: true,
                    active: annotation.id === activeId,
                    onSelect: handleRailSelect,
                    onRef: null,
                    t,
                    extraKey: index,
                  }),
                ),
              )
            : null,
          noteCount > 0 ? h('p', { className: 'tr-rail-foot' }, t('subtitle')) : null,
        ),
      ),
      navOpen ? h('button', { type: 'button', className: 'tr-nav-backdrop', onClick: () => setNavOpen(false), 'aria-label': t('close') }) : null,
      railOpen ? h('button', { type: 'button', className: 'tr-rail-backdrop', onClick: () => setRailOpen(false), 'aria-label': t('close') }) : null,
    );
  }

  function DocumentBody({ html, annotations, activeId, focusAnn, onSelect, onLocated }) {
    const containerRef = useRef(null);
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    useLayoutEffect(() => {
      const container = containerRef.current;
      if (!container) return undefined;
      const cleanup = highlightAnnotations(container, annotations);
      onLocated(readLocatedAnnotations(container, annotations));
      return cleanup;
    }, [html, annotations, onLocated]);

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
      if (mark) mark.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, [focusAnn]);

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

  function NoteCard({ annotation, index, active, missing, onSelect, onRef, t }) {
    return h(
      'li',
      {
        className: `tr-note${active ? ' is-active' : ''}${missing ? ' is-missing' : ''}`,
        ref: onRef,
        onClick: () => onSelect(annotation.id),
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(annotation.id);
          }
        },
        role: 'button',
        tabIndex: 0,
      },
      h(
        'div',
        { className: 'tr-note-head' },
        h('span', { className: 'tr-note-index' }, index ?? '·'),
        h('span', { className: 'tr-note-cat' }, annotation.category),
        missing ? h('span', { className: 'tr-note-missing-tag' }, t('unlocated')) : null,
      ),
      h('blockquote', { className: 'tr-note-quote' }, `“${annotation.quote}”`),
      h('p', { className: 'tr-note-comment' }, annotation.comment),
    );
  }

  function NavSkeleton({ rows = 6 }) {
    return h(
      'div',
      { className: 'tr-skeleton', 'aria-hidden': 'true' },
      Array.from({ length: 3 }, (_, group) =>
        h(
          'div',
          { className: 'tr-skeleton-group', key: group },
          h('div', { className: 'tr-skeleton-bar tr-skeleton-head' }),
          Array.from({ length: rows - group }, (_, row) => h('div', { className: 'tr-skeleton-bar', key: row })),
        ),
      ),
    );
  }

  function DocSkeleton() {
    return h(
      'div',
      { className: 'tr-doc-skeleton', 'aria-hidden': 'true' },
      h('div', { className: 'tr-skeleton-bar tr-skeleton-title' }),
      h('div', { className: 'tr-skeleton-bar tr-skeleton-line' }),
      h('div', { className: 'tr-skeleton-bar tr-skeleton-line tr-skeleton-short' }),
      h('div', { className: 'tr-skeleton-gap' }),
      Array.from({ length: 8 }, (_, index) => h('div', { className: 'tr-skeleton-bar tr-skeleton-line', key: index })),
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

function svg(child, options = {}, overrides = {}) {
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
      ...overrides,
    },
    child,
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
      id: count === 1 ? base : `${base}-${count}`,
      key: `${base}-${index}`,
    };
  });
}

function sameLocated(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item.id === b[index].id && item.index === b[index].index);
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
  box-shadow: inset 2px 0 0 var(--tr-accent);
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
