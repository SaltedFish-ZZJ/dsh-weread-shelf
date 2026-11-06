window.__ModuleLoader__.load({
  id: '@local/dsh-weread-shelf',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useMemo, useRef, useState } = React;

    const API = '/api/weread';
    const STORE_PAGE = 'https://weread.qq.com/web/category/books';
    const PANEL_ID = 'weread-shelf';
    const BRAND = '#8B3A2E';

    const isZh = () => {
      const lang = (typeof navigator !== 'undefined' && navigator.language) || 'zh';
      return !/^en/i.test(lang);
    };

    const COPY = {
      zh: {
        title: '书屿',
        sub: '微信读书 · 你读过的地方',
        shelf: '书架',
        notes: '笔记',
        stats: '统计',
        ask: '问屿',
        search: '搜书架，回车顺带到书城找',
        storeSearch: '去书城找',
        refresh: '刷新',
        loading: '正在翻书…',
        empty: '书架还是空的',
        emptyHint: '去微信读书加几本书，回来这里刷新一下就行。',
        all: '全部',
        reading: '在读',
        finished: '读完',
        notStarted: '未开始',
        count: (n) => `共 ${n} 本`,
        finishedBadge: '已读完',
        progress: '进度',
        minutes: '分钟',
        hours: '小时',
        readTime: '阅读时长',
        readDays: '阅读天数',
        daily: '日均',
        compare: '较上期',
        trend: '阅读时长',
        byHour: '什么时候读',
        byCategory: '读什么',
        topBooks: '读得最多',
        noData: '还没有数据',
        emptyPeriod: '这个周期还没有阅读记录，换到「今年」或「总计」看看。',
        byWeekday: '一周里哪天读',
        noteDensity: '笔记密度',
        calendar: '阅读日历',
        calendarHint: '过去一年，每一格是一天',
        calendarLoading: '正在回读过去一年…',
        streak: '连续阅读',
        progressWall: '书架进度',
        progressWallHint: '每本书读到哪儿',
        idle: '搁置',
        showAll: '展开全部',
        showLess: '收起',
        bars: '柱状',
        lines: '折线',
        less: '少',
        more: '多',
        daysUnit: '天',
        highlights: '划线',
        thoughts: '想法',
        chapters: '目录',
        intro: '简介',
        readNow: '打开阅读',
        noReaderLink: '这本书没有可用的阅读链接',
        storeHint: '先输一个书名或作者，再去书城找',
        openStore: '书城首页',
        storeEmpty: '书城里也没找到',
        close: '关闭',
        openedWindow: '已在独立窗口打开微信读书',
        companion: '陪读台',
        companionHint: '左边问，右边记。阅读窗口已开，读完回来接着写。',
        notePlaceholder: '随手记一句：这页让你想到什么、哪里没懂…',
        saveNote: '记下来',
        saving: '保存中…',
        settings: '设置',
        autoSplit: '打开阅读后自动进入陪读台',
        autoSplitHint: '关掉后，点「打开阅读」只开窗口，不切分栏。',
        vaultFolder: 'Obsidian 子目录',
        saveSettings: '保存设置',
        settingsSaved: '设置已保存',
        noNotes: '这里还没有划线',
        aiCompanion: 'AI 陪读',
        save: '存进知识库',
        saved: '已存进 Obsidian',
        notConfigured: '还没连上微信读书',
        notConfiguredHint: '在微信读书 App「我 → 设置 → 微信读书 Skill」拿 API Key，粘到这里。Key 只存在本机凭据库。',
        apiKey: '微信读书 API Key',
        keyConnected: '已连接（Key 只存在本机凭据库）',
        keyMissing: '还没连接',
        keySaved: 'Key 已更新',
        keyCleared: 'Key 已清除',
        disconnect: '清除 Key',
        archiveBook: '整本存进知识库',
        archiving: '归档中…',
        archived: '已归档',
        items: '条（划线 + 想法）',
        keyPlaceholder: 'wrk-...',
        connect: '连接',
        connecting: '验证中…',
        disconnect: '断开',
        noHighlights: '这本书还没有划线',
        noThoughts: '还没写下想法',
        noChapters: '拿不到目录',
        aiAsk: '想聊哪段？直接问。',
        aiGreeting: (name) => `我在。想聊聊《${name}》，还是想先过一遍你划过的线？`,
        aiGlobal: '我是屿。可以帮你挑下一本、串起几本书里的说法，或者看看你最近读得偏什么。',
        send: '回车发送',
        thinking: '想着…',
        aiError: 'AI 这会儿没接上：',
        back: '返回',
        reload: '重新加载',
        readerHint: '微信读书可能在拦内嵌页面。',
        openNewTab: '新标签打开',
        notesOf: '本有笔记',
        allNotes: '本书的划线按时间倒序',
        where: '位置',
        error: '出错了',
        retry: '重试',
        source: '微信读书',
      },
      en: {
        title: 'Book Isle',
        sub: 'WeRead · where you have read',
        shelf: 'Shelf',
        notes: 'Notes',
        stats: 'Stats',
        ask: 'Ask',
        search: 'Search your shelf',
        storeSearch: 'Search store',
        refresh: 'Refresh',
        loading: 'Turning pages…',
        empty: 'Your shelf is empty',
        emptyHint: 'Add books in WeRead, then refresh here.',
        all: 'All',
        reading: 'Reading',
        finished: 'Finished',
        notStarted: 'Unread',
        count: (n) => `${n} books`,
        finishedBadge: 'Finished',
        progress: 'Progress',
        minutes: 'min',
        hours: 'h',
        readTime: 'Read time',
        readDays: 'Days read',
        daily: 'Daily avg',
        compare: 'vs previous',
        trend: 'Reading time',
        byHour: 'When you read',
        byCategory: 'What you read',
        topBooks: 'Most read',
        noData: 'No data yet',
        emptyPeriod: 'No reading in this period — try This year or All time.',
        byWeekday: 'Which day of the week',
        noteDensity: 'Note density',
        calendar: 'Reading calendar',
        calendarHint: 'Every day of the past year',
        calendarLoading: 'Reading back the past year…',
        streak: 'Day streak',
        progressWall: 'Shelf progress',
        progressWallHint: 'How far you got in each book',
        idle: 'Never opened',
        showAll: 'Show all',
        showLess: 'Collapse',
        bars: 'Bars',
        lines: 'Lines',
        less: 'Less',
        more: 'More',
        daysUnit: 'days',
        highlights: 'Highlights',
        thoughts: 'Thoughts',
        chapters: 'Chapters',
        intro: 'About',
        readNow: 'Open reader',
        noReaderLink: 'No reader link for this book',
        storeHint: 'Type a title or author first, then search the store',
        openStore: 'Store home',
        storeEmpty: 'Nothing matched in the store either',
        close: 'Close',
        openedWindow: 'Opened WeRead in a separate window',
        companion: 'Reading desk',
        companionHint: 'Ask on the left, capture on the right. The reader is open in its own window.',
        notePlaceholder: 'One line: what struck you, what is unclear…',
        saveNote: 'Capture',
        saving: 'Saving…',
        settings: 'Settings',
        autoSplit: 'Open the reading desk after launching the reader',
        autoSplitHint: 'Off: opening the reader leaves the panel untouched.',
        vaultFolder: 'Obsidian subfolder',
        saveSettings: 'Save settings',
        settingsSaved: 'Settings saved',
        noNotes: 'No highlights here yet',
        aiCompanion: 'AI companion',
        save: 'Save to vault',
        saved: 'Saved to Obsidian',
        notConfigured: 'WeRead is not connected',
        notConfiguredHint: 'Grab an API key in the WeRead app (Me → Settings → WeRead Skill) and paste it here.',
        apiKey: 'WeRead API key',
        keyConnected: 'Connected (the key stays in the local credential store)',
        keyMissing: 'Not connected yet',
        keySaved: 'Key updated',
        keyCleared: 'Key cleared',
        disconnect: 'Clear key',
        archiveBook: 'Archive whole book',
        archiving: 'Archiving…',
        archived: 'Archived',
        items: 'entries (highlights + thoughts)',
        keyPlaceholder: 'wrk-...',
        connect: 'Connect',
        connecting: 'Checking…',
        disconnect: 'Disconnect',
        noHighlights: 'No highlights yet',
        noThoughts: 'No thoughts yet',
        noChapters: 'No chapters available',
        aiAsk: 'Ask about anything you read',
        aiGreeting: (name) => `I am here. Shall we talk about “${name}”, or go through your highlights first?`,
        aiGlobal: 'I can pick your next book, connect ideas across your shelf, or show what you have been reading lately.',
        send: 'Enter to send',
        thinking: 'Thinking…',
        aiError: 'AI is not reachable: ',
        back: 'Back',
        reload: 'Reload',
        readerHint: 'WeRead may be blocking the embedded page.',
        openNewTab: 'Open in new tab',
        notesOf: 'with notes',
        allNotes: 'Highlights, newest first',
        where: 'at',
        error: 'Something broke',
        retry: 'Retry',
        source: 'WeRead',
      },
    };
    const T = isZh() ? COPY.zh : COPY.en;

    // ------------------------------------------------------------ styles
    const V = (name, fallback) => `var(--dsw-alias-${name}, ${fallback})`;
// 纸本 · 书店。固定配色，不跟主题变量走——纸就是纸，深色主题里也是纸。
    const SERIF = 'Georgia, "Songti SC", SimSun, "Noto Serif SC", serif';
    const SANS = '"Segoe UI", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';

    const C = {
      base: '#F5F0E5',
      l1: '#FFFDF7',
      l2: '#EBE3D1',
      border: '#D8CFBC',
      border2: '#C3B79F',
      text: '#221F1B',
      dim: '#7A7266',
      brand: BRAND,
      ok: '#3F6B4F',
      warn: '#A26A22',
    };

    const S = {
      root: {
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: C.base,
        color: C.text,
        font: `13px/1.6 ${SANS}`,
        overflow: 'hidden',
      },
      header: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 22px 12px',
        borderBottom: `2px solid ${C.text}`,
        flex: 'none',
      },
      brand: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
      seal: {
        width: 27,
        height: 54,
        flex: 'none',
        background: BRAND,
        border: '1px solid #6A2A20',
        boxShadow: 'inset 0 0 0 2px rgba(247,242,231,.34)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5px 0',
        boxSizing: 'border-box',
      },
      sealText: {
        writingMode: 'vertical-rl',
        fontFamily: SERIF,
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: 5,
        lineHeight: 1,
        color: '#FBF6EA',
      },
      brandCol: { display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 },
      brandTitle: { fontFamily: SERIF, fontSize: 22, fontWeight: 600, letterSpacing: 2.4, lineHeight: 1.1 },
      plate: {
        border: `1px solid ${C.border2}`,
        background: 'rgba(255,253,247,.62)',
        padding: '16px 18px 14px',
        boxShadow: '0 1px 0 rgba(34,31,27,.06)',
      },
      brandSub: { fontSize: 11, color: C.dim, letterSpacing: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
      grow: { flex: 1, minWidth: 0 },
      tabs: { display: 'flex', gap: 18, padding: 0, background: 'transparent', borderRadius: 0, flex: 'none' },
      tab: {
        appearance: 'none',
        border: 0,
        borderBottom: '2px solid transparent',
        background: 'transparent',
        color: C.dim,
        font: 'inherit',
        fontSize: 12.5,
        letterSpacing: 0.4,
        padding: '1px 0 8px',
        borderRadius: 0,
        cursor: 'pointer',
      },
      tabOn: { color: C.text, fontWeight: 600, borderBottom: `2px solid ${C.brand}`, background: 'transparent', boxShadow: 'none' },
      input: {
        flex: 1,
        minWidth: 0,
        height: 32,
        padding: '0 11px',
        borderRadius: 0,
        border: `1px solid ${C.border}`,
        background: C.l1,
        color: C.text,
        font: 'inherit',
        outline: 'none',
      },
      field: {
        width: '100%',
        boxSizing: 'border-box',
        padding: '8px 10px',
        fontSize: 13,
        borderRadius: 0,
        border: `1px solid ${C.border}`,
        background: C.l1,
        color: C.text,
        font: 'inherit',
      },
      primary: {
        appearance: 'none',
        border: `1px solid ${C.brand}`,
        background: C.brand,
        color: '#FFFDF7',
        fontWeight: 600,
        fontSize: 13,
        letterSpacing: 0.4,
        height: 34,
        padding: '0 16px',
        borderRadius: 0,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      },
      ghost: {
        appearance: 'none',
        border: `1px solid ${C.border}`,
        background: 'transparent',
        color: C.text,
        fontWeight: 500,
        fontSize: 13,
        letterSpacing: 0.3,
        height: 34,
        padding: '0 14px',
        borderRadius: 0,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      },
      link: {
        appearance: 'none',
        border: 0,
        background: 'transparent',
        color: C.dim,
        fontSize: 11.5,
        padding: 0,
        cursor: 'pointer',
        textDecoration: 'underline',
        textUnderlineOffset: 3,
      },
      body: { flex: 1, minHeight: 0, overflow: 'auto', padding: '18px 22px 30px' },
      grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '26px 20px' },
      card: {
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
        cursor: 'pointer',
        border: 0,
        padding: 0,
        background: 'transparent',
        textAlign: 'left',
        color: 'inherit',
        font: 'inherit',
      },
      coverBox: {
        position: 'relative',
        width: '100%',
        aspectRatio: '3 / 4',
        boxSizing: 'border-box',
        padding: 6,
        border: `1px solid ${C.border}`,
        background: C.l1,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(34,31,27,.10)',
      },
      coverImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
      coverFallback: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        boxSizing: 'border-box',
        fontFamily: SERIF,
        fontWeight: 600,
        fontSize: 13,
        color: '#8A8071',
        background: '#E7DECD',
        textAlign: 'center',
        overflow: 'hidden',
      },
      coverFallbackText: {
        display: '-webkit-box',
        WebkitLineClamp: 4,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        lineHeight: 1.45,
        letterSpacing: 0.4,
        wordBreak: 'break-all',
      },
      bookTitle: {
        fontFamily: SERIF,
        fontSize: 14.5,
        fontWeight: 600,
        lineHeight: 1.45,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      },
      bookMeta: { fontSize: 11.5, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      barTrack: { height: 2, borderRadius: 0, background: C.border, overflow: 'hidden' },
      barFill: { height: '100%', borderRadius: 0, background: C.brand },
      badge: {
        position: 'absolute',
        top: 6,
        left: 6,
        fontSize: 10,
        letterSpacing: 0.6,
        padding: '2px 6px',
        borderRadius: 0,
        background: BRAND,
        color: '#FFFDF7',
        fontWeight: 600,
      },
      row: { display: 'flex', alignItems: 'center', gap: 12 },
      sectionTitle: {
        fontSize: 11.5,
        fontWeight: 600,
        color: C.text,
        letterSpacing: 1.6,
      },
      panelCard: { borderTop: `1px solid ${C.border}`, borderRadius: 0, background: 'transparent', padding: '14px 0 0' },
      chips: { display: 'flex', gap: 18, flexWrap: 'wrap' },
      chip: {
        appearance: 'none',
        border: 0,
        borderBottom: '1px solid transparent',
        background: 'transparent',
        color: C.dim,
        fontSize: 12.5,
        letterSpacing: 0.3,
        padding: '2px 0 5px',
        borderRadius: 0,
        cursor: 'pointer',
      },
      chipOn: { borderBottom: `1px solid ${C.brand}`, color: C.brand, fontWeight: 600, background: 'transparent' },
      tile: {
        flex: '1 1 130px',
        minWidth: 118,
        borderTop: `1px solid ${C.border}`,
        padding: '10px 0 0',
        background: 'transparent',
      },
      tileLabel: { fontSize: 10.5, color: C.dim, letterSpacing: 1.4 },
      tileValue: { fontFamily: SERIF, fontSize: 25, fontWeight: 400, letterSpacing: -0.2, marginTop: 3, lineHeight: 1.15 },
      tileDelta: { fontSize: 11.5, marginTop: 2 },
      chart: { display: 'flex', alignItems: 'flex-end', gap: 6, height: 150, paddingTop: 18 },
      chartCol: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
      chartValue: { fontSize: 10.5, color: C.dim, whiteSpace: 'nowrap' },
      chartBar: { width: '100%', maxWidth: 34, borderRadius: '2px 2px 0 0', background: C.brand, minHeight: 2 },
      chartLabel: { fontSize: 10.5, color: C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' },
      hbarRow: { display: 'grid', gridTemplateColumns: '96px 1fr 52px', alignItems: 'center', gap: 10, marginBottom: 8 },
      hbarLabel: { fontSize: 12, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
      hbarTrack: { height: 6, borderRadius: 0, background: C.l2, overflow: 'hidden' },
      hbarFill: { height: '100%', borderRadius: 0, background: C.brand },
      hbarValue: { fontSize: 11.5, color: C.dim, textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
      empty: { padding: '48px 20px', textAlign: 'center', color: C.dim },
      setup: { maxWidth: 460, margin: '48px auto', border: `1px solid ${C.border}`, borderRadius: 0, padding: 24, background: C.l1 },
      hero: { display: 'flex', gap: 20, alignItems: 'flex-start' },
      heroCover: { width: 104, flex: 'none', aspectRatio: '3 / 4', boxSizing: 'border-box', padding: 4, border: `1px solid ${C.border}`, background: C.l1, overflow: 'hidden', boxShadow: '0 2px 6px rgba(34,31,27,.12)' },
      heroTitle: { fontFamily: SERIF, fontSize: 21, fontWeight: 600, lineHeight: 1.4, letterSpacing: 0.4 },
      heroMeta: { fontSize: 12, color: C.dim, marginTop: 4 },
      actions: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 },
      listItem: {
        border: `1px solid ${C.border}`,
        borderRadius: 0,
        padding: '11px 13px',
        marginBottom: 8,
        background: C.l1,
      },
      quote: { fontFamily: SERIF, fontSize: 14, lineHeight: 1.8 },
      quoteMeta: { fontSize: 11, color: C.dim, marginTop: 5, display: 'flex', gap: 10, alignItems: 'center' },
      drawer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 'min(420px, 92%)',
        background: C.base,
        borderLeft: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-10px 0 24px rgba(34,31,27,.12)',
        zIndex: 20,
      },
      drawerHead: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: `1px solid ${C.border}`, flex: 'none' },
      chat: { flex: 1, minHeight: 0, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 },
      bubble: { padding: '9px 12px', borderRadius: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, lineHeight: 1.7, maxWidth: '100%' },
      bubbleMe: { background: 'rgba(139,58,46,.07)', border: `1px solid rgba(139,58,46,.28)`, alignSelf: 'flex-end' },
      bubbleAi: { background: C.l1, border: `1px solid ${C.border}`, alignSelf: 'flex-start' },
      composer: { flex: 'none', borderTop: `1px solid ${C.border}`, padding: 10, display: 'flex', gap: 8, alignItems: 'flex-end' },
      textarea: {
        flex: 1,
        minHeight: 34,
        maxHeight: 120,
        resize: 'none',
        padding: '7px 10px',
        borderRadius: 0,
        border: `1px solid ${C.border}`,
        background: C.l1,
        color: C.text,
        font: 'inherit',
        outline: 'none',
      },
      toast: {
        position: 'absolute',
        left: '50%',
        bottom: 22,
        transform: 'translateX(-50%)',
        background: 'rgba(34,31,27,.92)',
        color: '#FFFDF7',
        fontSize: 12,
        padding: '7px 14px',
        borderRadius: 0,
        zIndex: 40,
      },
      readerHead: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: `1px solid ${C.border}`, flex: 'none' },
      iframe: { flex: 1, minHeight: 0, width: '100%', border: 0, display: 'block', background: '#fff' },
      inlineWarn: { flex: 'none', padding: '7px 14px', fontSize: 12, lineHeight: 1.5, color: '#8a5a00', background: '#fff7e6', borderBottom: `1px solid ${C.border}` },
      split: { display: 'flex', flex: 1, minHeight: 0 },
      pane: { display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, flex: '1 1 50%' },
      paneSplit: { borderLeft: `1px solid ${C.border}` },
      paneHead: { flex: 'none', padding: '9px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 },
      paneTitle: { fontFamily: SERIF, fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: 0.3 },
      chipRow: { display: 'flex', gap: 14, flex: 'none' },
      paneBody: { flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
      capture: { flex: 'none', borderTop: `1px solid ${C.border}`, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
      sheetMask: { position: 'absolute', inset: 0, background: 'rgba(34,31,27,.38)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40, padding: 24, overflowY: 'auto' },
      sheet: {
        width: 'min(440px, 100%)',
        maxHeight: '100%',
        overflowY: 'auto',
        background: C.base,
        border: `1px solid ${C.border2}`,
        borderRadius: 0,
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        boxShadow: '0 18px 50px rgba(34,31,27,.32)',
      },
      fieldLabel: { fontSize: 12, color: C.dim },
      sheetDivider: { height: 1, background: C.border, margin: '2px 0' },
      overlay: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        background: 'rgba(245,240,229,.97)',
        padding: 24,
        textAlign: 'center',
      },
    };

    // ------------------------------------------------------------ helpers
    const coverUrl = (url) => (url ? `${API}/cover?u=${encodeURIComponent(url)}` : '');

    // Views listen here so one 401 anywhere can reopen the connect card once.
    const authHooks = new Set();

    async function api(path, init) {
      const options = { ...init };
      if (init && init.body && typeof init.body !== 'string') {
        options.body = JSON.stringify(init.body);
        options.headers = { 'content-type': 'application/json' };
      }
      const response = await fetch(API + path, options);
      const text = await response.text();
      let payload;
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = {};
      }
      if (!response.ok) {
        const error = new Error(payload?.error?.message || `HTTP ${response.status}`);
        error.code = payload?.error?.code;
        error.status = response.status;
        if (response.status === 401) {
          for (const hook of authHooks) {
            try { hook(error.code || 'auth'); } catch {}
          }
        }
        throw error;
      }
      return payload;
    }

    async function streamAsk(body, onEvent) {
      const response = await fetch(`${API}/ask`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text();
        let message = `HTTP ${response.status}`;
        try {
          message = JSON.parse(text)?.error?.message || message;
        } catch {}
        throw new Error(message);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let cut;
        while ((cut = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, cut);
          buffer = buffer.slice(cut + 2);
          for (const line of block.split('\n')) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw) continue;
            try {
              onEvent(JSON.parse(raw));
            } catch {}
          }
        }
      }
    }

    const human = (seconds, unitLong) => {
      const total = Math.max(0, Math.round(Number(seconds) || 0));
      if (total < 60) return `${total} 秒`;
      const hours = Math.floor(total / 3600);
      const minutes = Math.round((total % 3600) / 60);
      if (hours && minutes) return `${hours} 小时 ${minutes} 分`;
      if (hours) return `${hours} 小时`;
      return `${minutes} ${unitLong ? '分钟' : '分'}`;
    };

    const shortTime = (seconds) => {
      const total = Math.max(0, Math.round(Number(seconds) || 0));
      if (total < 60) return `${total}s`;
      if (total < 3600) return `${Math.round(total / 60)}m`;
      return `${(total / 3600).toFixed(1)}h`;
    };

    const dateLabel = (ms) => {
      const date = new Date(Number(ms) || 0);
      if (Number.isNaN(date.getTime())) return '';
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    const dayStamp = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    // ------------------------------------------------------------ primitives
    function Btn(props) {
      const { kind = 'ghost', style, children, ...rest } = props;
      return h('button', { type: 'button', style: { ...S[kind], ...style }, ...rest }, children);
    }

    function Cover(props) {
      const { book, style, compact } = props;
      const [broken, setBroken] = useState(false);
      const src = coverUrl(book && book.cover);
      useEffect(() => {
        setBroken(false);
      }, [src]);
      return h(
        'div',
        { style: { ...S.coverBox, ...style } },
        src && !broken
          ? h('img', {
              src,
              alt: '',
              loading: 'lazy',
              referrerPolicy: 'no-referrer',
              style: S.coverImg,
              onError: () => setBroken(true),
            })
          : compact
            ? null
            : h('div', { style: S.coverFallback }, h('span', { style: S.coverFallbackText }, (book && book.title ? book.title.slice(0, 16) : '?'))),
        book && book.finished && !compact ? h('span', { style: S.badge }, T.finishedBadge) : null,
      );
    }

    function Bar(props) {
      const percent = Math.max(0, Math.min(100, Number(props.value) || 0));
      return h(
        'div',
        { style: { ...S.barTrack, ...props.style } },
        h('div', { style: { ...S.barFill, width: `${percent}%`, background: props.color || BRAND } }),
      );
    }

    function BookCard(props) {
      const { book, onOpen } = props;
      const percent = book.finished ? 100 : Math.round(book.progress || 0);
      return h(
        'button',
        { type: 'button', style: S.card, onClick: () => onOpen(book), title: book.title },
        h(Cover, { book }),
        h('div', { style: S.bookTitle }, book.title || '未命名'),
        h('div', { style: S.bookMeta }, [book.author || '佚名', book.noteCount ? `${book.noteCount} 划线` : ''].filter(Boolean).join(' · ')),
        h(Bar, { value: percent }),
        h(
          'div',
          { style: { fontSize: 10.5, letterSpacing: 0.8, color: C.dim } },
          book.finished ? T.finishedBadge : percent ? `${percent}%` : T.notStarted,
        ),
      );
    }

    // ------------------------------------------------------------ charts (no legend: labels sit on the chart)
    const SERIES = ['#8B3A2E', '#B07B2E', '#3F6B4F', '#3F5D7A', '#7A5C4B', '#8A6A8E', '#5C6B73'];
    const heatTone = (level) =>
      ['rgba(34,31,27,.04)', 'rgba(139,58,46,.18)', 'rgba(139,58,46,.38)', 'rgba(139,58,46,.62)', '#8B3A2E'][level] ||
      'rgba(34,31,27,.04)';

    function TrendChart(props) {
      const { points, shape } = props;
      if (!points || !points.length) return h('div', { style: { ...S.empty, padding: 20 } }, T.noData);
      const max = Math.max(...points.map((p) => p.seconds), 1);
      const labeled = points.length <= 14;
      if (shape === 'line') {
        const width = 600;
        const height = 132;
        const padY = 16;
        const span = points.length > 1 ? width : 0;
        const xy = points.map((point, index) => [
          points.length > 1 ? (index / (points.length - 1)) * span : width / 2,
          height - padY - (point.seconds / max) * (height - padY * 2),
        ]);
        const line = xy.map(([x, y]) => `${Math.round(x)},${Math.round(y)}`).join(' ');
        const area = `0,${height - padY} ${line} ${Math.round(xy[xy.length - 1][0])},${height - padY}`;
        return h(
          'div',
          null,
          h(
            'svg',
            { viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', style: { width: '100%', height: 132, display: 'block' } },
            h('polygon', { points: area, fill: 'rgba(139,58,46,.13)' }),
            h('polyline', {
              points: line,
              fill: 'none',
              stroke: BRAND,
              strokeWidth: 2,
              strokeLinejoin: 'round',
              strokeLinecap: 'round',
              vectorEffect: 'non-scaling-stroke',
            }),
          ),
          h(
            'div',
            { style: { display: 'flex', marginTop: 6 } },
            points.map((point, index) =>
              h(
                'div',
                {
                  key: index,
                  title: `${point.label} · ${human(point.seconds)}`,
                  style: { flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10.5, color: C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                },
                point.label,
              ),
            ),
          ),
        );
      }
      return h(
        'div',
        { style: S.chart },
        points.map((point, index) =>
          h(
            'div',
            { style: S.chartCol, key: index, title: `${point.label} · ${human(point.seconds)}` },
            h('div', { style: S.chartValue }, labeled ? shortTime(point.seconds) : point.seconds === max ? shortTime(point.seconds) : ''),
            h('div', {
              style: {
                ...S.chartBar,
                height: `${Math.max(2, Math.round((point.seconds / max) * 104))}px`,
                opacity: point.seconds ? 1 : 0.25,
              },
            }),
            h('div', { style: S.chartLabel }, point.label),
          ),
        ),
      );
    }

    function HourClock(props) {
      const { hours } = props;
      if (!hours || !hours.length) return h('div', { style: { ...S.empty, padding: 20 } }, T.noData);
      // preferTime walks 24 slots starting at 06:00.
      const max = Math.max(...hours, 1);
      const peak = hours.indexOf(max);
      const size = 252;
      const center = size / 2;
      const inner = 46;
      const outer = 96;
      const spokes = hours.map((seconds, index) => {
        const hour = (6 + index) % 24;
        const angle = ((hour / 24) * 360 - 90) * (Math.PI / 180);
                const ratio = seconds > 0 ? Math.sqrt(seconds / max) : 0;
        const length = seconds > 0 ? 8 + ratio * 42 : 3;
        const isPeak = index === peak && seconds > 0;
        return h('line', {
          key: index,
          x1: center + Math.cos(angle) * inner,
          y1: center + Math.sin(angle) * inner,
          x2: center + Math.cos(angle) * (inner + length),
          y2: center + Math.sin(angle) * (inner + length),
          stroke: isPeak ? BRAND : seconds ? 'rgba(139,58,46,.40)' : 'rgba(34,31,27,.16)',
          strokeWidth: isPeak ? 7 : 5,
          strokeLinecap: 'round',
        });
      });
      const ticks = [0, 3, 6, 9, 12, 15, 18, 21].map((hour) => {
        const angle = ((hour / 24) * 360 - 90) * (Math.PI / 180);
        return h(
          'text',
          {
            key: `t${hour}`,
            x: center + Math.cos(angle) * (outer + 16),
            y: center + Math.sin(angle) * (outer + 14),
            fill: C.dim,
            fontSize: 10,
            textAnchor: 'middle',
          },
          String(hour),
        );
      });
      const peakHour = (6 + peak) % 24;
      return h(
        'div',
        { style: { display: 'flex', justifyContent: 'center' } },
        h(
          'svg',
          { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
          h('circle', { cx: center, cy: center, r: inner - 10, fill: 'none', stroke: C.border, strokeWidth: 1 }),
          spokes,
          ticks,
          h(
            'text',
            { x: center, y: center - 2, fill: C.text, fontSize: 15, fontWeight: 650, textAnchor: 'middle' },
            `${String(peakHour).padStart(2, '0')}:00`,
          ),
          h(
            'text',
            { x: center, y: center + 16, fill: C.dim, fontSize: 10.5, textAnchor: 'middle' },
            human(hours[peak] || 0),
          ),
        ),
      );
    }

    function CategoryDonut(props) {
      const { categories } = props;
      const rows = (categories || []).filter((item) => item.title && item.seconds > 0).slice(0, 7);
      if (!rows.length) return h('div', { style: { ...S.empty, padding: 20 } }, T.noData);
      const total = rows.reduce((sum, row) => sum + row.seconds, 0) || 1;
      const size = 226;
      const center = size / 2;
      const radius = 68;
      const thickness = 22;
      const circumference = 2 * Math.PI * radius;
      let walked = 0;
      const arcs = rows.map((row, index) => {
        const share = row.seconds / total;
        const dash = share * circumference;
        const angle = ((walked + share / 2) * 360 - 90) * (Math.PI / 180);
        walked += share;
        return h(
          'g',
          { key: index },
          h('circle', {
            cx: center,
            cy: center,
            r: radius,
            fill: 'none',
            stroke: SERIES[index % SERIES.length],
            strokeWidth: thickness,
            strokeDasharray: `${Math.max(0, dash - 2)} ${circumference - Math.max(0, dash - 2)}`,
            strokeDashoffset: -((walked - share) * circumference),
            transform: `rotate(-90 ${center} ${center})`,
            strokeLinecap: 'butt',
          }),
          share >= 0.07
            ? h(
                'text',
                {
                  x: center + Math.cos(angle) * (radius + thickness / 2 + 12),
                  y: center + Math.sin(angle) * (radius + thickness / 2 + 12) + 4,
                  fill: C.dim,
                  fontSize: 10,
                  textAnchor: Math.cos(angle) > 0.15 ? 'start' : Math.cos(angle) < -0.15 ? 'end' : 'middle',
                },
                `${row.title.slice(0, 6)} ${Math.round(share * 100)}%`,
              )
            : null,
        );
      });
      return h(
        'div',
        { style: { display: 'flex', justifyContent: 'center' } },
        h(
          'svg',
          { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
          arcs,
          h('text', { x: center, y: center - 2, fill: C.text, fontSize: 14, fontWeight: 650, textAnchor: 'middle' }, shortTime(total)),
          h('text', { x: center, y: center + 14, fill: C.dim, fontSize: 10, textAnchor: 'middle' }, rows[0].title.slice(0, 8)),
        ),
      );
    }

    function CalendarHeat(props) {
      const { data } = props;
      if (!data) return h('div', { style: { ...S.empty, padding: 24 } }, T.calendarLoading);
      const parse = (value) => {
        const [year, month, day] = String(value).split('-').map(Number);
        return new Date(year, month - 1, day);
      };
      const start = parse(data.start);
      const end = parse(data.end);
      const weeks = [];
      const cursor = new Date(start);
      while (cursor <= end) {
        const week = [];
        for (let step = 0; step < 7; step += 1) {
          const day = new Date(cursor.getTime());
          day.setDate(day.getDate() + step);
          week.push(day);
        }
        weeks.push(week);
        cursor.setDate(cursor.getDate() + 7);
      }
      const stamp = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const tone = (seconds) => {
        if (!seconds) return 0;
        const ratio = Math.sqrt(Math.min(1, seconds / Math.max(1, data.max)));
        return ratio > 0.72 ? 4 : ratio > 0.46 ? 3 : ratio > 0.22 ? 2 : 1;
      };
      let lastMonth = -1;
      return h(
        'div',
        null,
        h(
          'div',
          { style: { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 } },
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 3, flex: 'none', paddingTop: 15 } },
            ['一', '', '三', '', '五', '', '日'].map((label, index) => h('div', { key: index, style: { height: 12, fontSize: 9, color: C.dim, lineHeight: '12px', width: 13 } }, label)),
          ),
          weeks.map((week, index) => {
            const first = week[0];
            const label = first.getMonth() !== lastMonth ? `${first.getMonth() + 1}月` : '';
            lastMonth = first.getMonth();
            return h(
              'div',
              { key: index, style: { display: 'flex', flexDirection: 'column', gap: 3, flex: 'none' } },
              h('div', { style: { height: 12, fontSize: 9, color: C.dim, whiteSpace: 'nowrap' } }, label),
              week.map((day, dayIndex) => {
                const key = stamp(day);
                const seconds = data.days[key] || 0;
                const future = day > end;
                return h('div', {
                  key: dayIndex,
                  title: `${key} · ${seconds ? human(seconds) : '没有阅读'}`,
                  style: { width: 12, height: 12, borderRadius: 3, background: future ? 'transparent' : heatTone(tone(seconds)), border: future ? 'none' : `1px solid ${seconds ? 'transparent' : C.border}` },
                });
              }),
            );
          }),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, fontSize: 10, color: C.dim } },
          T.less,
          [0, 1, 2, 3, 4].map((level) => h('div', { key: level, style: { width: 11, height: 11, borderRadius: 3, background: heatTone(level) } })),
          T.more,
        ),
      );
    }

    function WeekdayChart(props) {
      const { days } = props;
      if (!days) return h('div', { style: { ...S.empty, padding: 20 } }, T.calendarLoading);
      const totals = [0, 0, 0, 0, 0, 0, 0];
      for (const [key, seconds] of Object.entries(days)) {
        const [year, month, day] = key.split('-').map(Number);
        const weekday = new Date(year, month - 1, day).getDay();
        totals[(weekday + 6) % 7] += Number(seconds) || 0;
      }
      const max = Math.max(...totals, 1);
      const labels = ['一', '二', '三', '四', '五', '六', '日'];
      return h(
        'div',
        { style: { display: 'flex', alignItems: 'flex-end', gap: 8, height: 138, paddingTop: 22 } },
        totals.map((seconds, index) =>
          h(
            'div',
            { key: index, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }, title: `${labels[index]} · ${human(seconds)}` },
            h('div', { style: { fontSize: 10, color: C.dim, whiteSpace: 'nowrap' } }, seconds ? shortTime(seconds) : ''),
            h('div', {
              style: {
                width: '100%',
                maxWidth: 30,
                height: `${Math.max(3, Math.round((seconds / max) * 92))}px`,
                borderRadius: '4px 4px 2px 2px',
                background: index >= 5 ? '#B9A992' : BRAND,
              },
            }),
            h('div', { style: { fontSize: 10.5, color: C.dim } }, labels[index]),
          ),
        ),
      );
    }

    function NoteScatter(props) {
      const { books } = props;
      const rows = (books || []).filter((book) => (book.noteCount || book.reviewCount) && book.progress !== null);
      if (!rows.length) return h('div', { style: { ...S.empty, padding: 20 } }, T.noData);
      const width = 320;
      const height = 158;
      const padL = 26;
      const padB = 20;
      const maxNotes = Math.max(...rows.map((book) => (book.noteCount || 0) + (book.reviewCount || 0)), 1);
      const dots = rows.map((book, index) => {
        const notes = (book.noteCount || 0) + (book.reviewCount || 0);
        const x = padL + (Math.max(0, Math.min(100, book.progress || 0)) / 100) * (width - padL - 10);
        const y = height - padB - (Math.sqrt(notes / maxNotes) * (height - padB - 12));
        return h('circle', {
          key: index,
          cx: x,
          cy: y,
          r: 3.5 + (notes / maxNotes) * 4,
          fill: book.finished ? C.ok : 'rgba(139,58,46,.55)',
          stroke: C.base,
          strokeWidth: 1,
        });
      });
      return h(
        'svg',
        { viewBox: `0 0 ${width} ${height}`, style: { width: '100%', height: 158, display: 'block' } },
        h('line', { x1: padL, y1: height - padB, x2: width - 6, y2: height - padB, stroke: C.border, strokeWidth: 1 }),
        h('line', { x1: padL, y1: 8, x2: padL, y2: height - padB, stroke: C.border, strokeWidth: 1 }),
        h('text', { x: padL - 4, y: 12, fill: C.dim, fontSize: 9, textAnchor: 'end' }, '笔记'),
        h('text', { x: width - 6, y: height - 6, fill: C.dim, fontSize: 9, textAnchor: 'end' }, '进度 →'),
        dots,
      );
    }

    function ProgressWall(props) {
      const { books, onOpen } = props;
      const [scope, setScope] = useState(null);
      const [expanded, setExpanded] = useState(false);
      const pool = (books || []).filter((book) => book.progress !== null && book.progress !== undefined);
      const reading = pool.filter((book) => (book.progress || 0) > 0 && (book.progress || 0) < 100);
      const done = pool.filter((book) => (book.progress || 0) >= 100);
      const idle = pool.filter((book) => !(book.progress || 0));
      const active = scope || (reading.length ? "reading" : "all");
      const byRecent = (a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0);
      const rows = (active === "reading" ? reading : active === "idle" ? idle : active === "finished" ? done : pool).slice();
      rows.sort(active === "all" ? (a, b) => (b.progress || 0) - (a.progress || 0) : byRecent);
      const limit = 18;
      const visible = expanded ? rows : rows.slice(0, limit);
      if (!pool.length) return h("div", { style: { ...S.empty, padding: 20 } }, T.noData);
      const chips = [["reading", T.reading, reading.length], ["idle", T.idle, idle.length], ["finished", T.finished, done.length], ["all", T.all, pool.length]];
      return h(
        "div",
        null,
        h(
          "div",
          { style: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 10 } },
          chips.map(([id, label, total]) =>
            h(
              "button",
              {
                key: id,
                type: "button",
                onClick: () => {
                  setScope(id);
                  setExpanded(false);
                },
                style: { ...S.chip, ...(active === id ? S.chipOn : {}) },
              },
              `${label} ${total}`,
            ),
          ),
          h("span", { style: { flex: 1 } }),
          rows.length > limit
            ? h("button", { type: "button", onClick: () => setExpanded(!expanded), style: S.chip }, expanded ? T.showLess : `${T.showAll} ${rows.length}`)
            : null,
        ),
        h(
          "div",
          { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 12 } },
          visible.map((book) => {
          const percent = Math.max(0, Math.min(100, Math.round(book.progress || 0)));
          const size = 62;
          const center = size / 2;
          const radius = 25;
          const circumference = 2 * Math.PI * radius;
          return h(
            'button',
            {
              type: 'button',
              key: book.bookId,
              title: `${book.title} · ${percent}%`,
              onClick: () => onOpen && onOpen(book),
              style: { appearance: 'none', border: `1px solid ${C.border}`, background: C.base, borderRadius: 10, padding: '10px 6px 8px', cursor: 'pointer', font: 'inherit', color: 'inherit' },
            },
            h(
              'svg',
              { width: size, height: size, viewBox: `0 0 ${size} ${size}`, style: { display: 'block', margin: '0 auto' } },
              h('circle', { cx: center, cy: center, r: radius, fill: 'none', stroke: C.l2, strokeWidth: 6 }),
              h('circle', {
                cx: center,
                cy: center,
                r: radius,
                fill: 'none',
                stroke: percent >= 100 ? C.ok : BRAND,
                strokeWidth: 6,
                strokeLinecap: 'round',
                strokeDasharray: `${(percent / 100) * circumference} ${circumference}`,
                transform: `rotate(-90 ${center} ${center})`,
              }),
              h('text', { x: center, y: center + 4, fill: C.text, fontSize: 12, fontWeight: 650, textAnchor: 'middle' }, `${percent}%`),
            ),
            h(
              'div',
              { style: { fontSize: 10.5, color: C.dim, marginTop: 6, lineHeight: 1.35, height: 28, overflow: 'hidden' } },
              book.title,
            ),
          );
          }),
        ),
      );
    }

    function TopBooks(props) {
      const { books } = props;
      const rows = (books || []).slice(0, 6);
      if (!rows.length) return h('div', { style: { ...S.empty, padding: 20 } }, T.noData);
      const max = Math.max(...rows.map((row) => row.seconds), 1);
      return h(
        'div',
        null,
        rows.map((row, index) =>
          h(
            'div',
            { style: { display: 'grid', gridTemplateColumns: '20px 1fr 54px', alignItems: 'center', gap: 10, marginBottom: 9 }, key: index },
            h('div', { style: { fontSize: 11.5, color: index < 3 ? BRAND : C.dim, fontWeight: 700 } }, String(index + 1)),
            h(
              'div',
              { style: { minWidth: 0 } },
              h('div', { style: { ...S.bookTitle, fontSize: 12.5 } }, row.title || '未命名'),
              h('div', { style: S.barTrack, marginTop: 4 }, h('div', { style: { ...S.barFill, width: `${Math.max(3, (row.seconds / max) * 100)}%` } })),
            ),
            h('div', { style: S.hbarValue }, shortTime(row.seconds)),
          ),
        ),
      );
    }

    // ------------------------------------------------------------ setup
    function SetupCard(props) {
      const { onSaved, onCancel } = props;
      const [key, setKey] = useState('');
      const [state, setState] = useState({ busy: false, error: '' });
      const submit = async () => {
        if (!key.trim() || state.busy) return;
        setState({ busy: true, error: '' });
        try {
          await api('/key', { method: 'POST', body: { key: key.trim() } });
          setKey('');
          setState({ busy: false, error: '' });
          onSaved();
        } catch (error) {
          setState({ busy: false, error: error.message });
        }
      };
      return h(
        'div',
        { style: S.setup },
        h('div', { style: { fontSize: 15, fontWeight: 650 } }, T.notConfigured),
        h('p', { style: { color: C.dim, fontSize: 12.5, lineHeight: 1.7, margin: '8px 0 14px' } }, T.notConfiguredHint),
        h('input', {
          style: { ...S.input, width: '100%', boxSizing: 'border-box' },
          placeholder: T.keyPlaceholder,
          value: key,
          onChange: (event) => setKey(event.target.value),
          onKeyDown: (event) => {
            if (event.key === 'Enter') submit();
          },
        }),
        state.error ? h('div', { style: { color: C.warn, fontSize: 12, marginTop: 8 } }, state.error) : null,
        h(
          'div',
          { style: { marginTop: 14, display: 'flex', gap: 8 } },
          h(Btn, { kind: 'primary', onClick: submit, disabled: state.busy }, state.busy ? T.connecting : T.connect),
          onCancel ? h(Btn, { onClick: onCancel }, T.close) : null,
        ),
      );
    }

    // ------------------------------------------------------------ shelf
    function ShelfView(props) {
      const { onOpen, onAskShelf, onToast } = props;
      const [data, setData] = useState(null);
      const [state, setState] = useState({ loading: true, error: '' });
      const [filter, setFilter] = useState('all');
      const [query, setQuery] = useState('');
      const [store, setStore] = useState(null);

      const load = useCallback(async () => {
        setState({ loading: true, error: '' });
        try {
          const payload = await api('/shelf');
          setData(payload);
          setState({ loading: false, error: '' });
          const ids = (payload.books || []).filter((book) => !book.finished && !book.progress).slice(0, 30).map((book) => book.bookId);
          if (ids.length) {
            api('/progress?ids=' + encodeURIComponent(ids.join(',')))
              .then((result) => {
                setData((current) => {
                  if (!current) return current;
                  return {
                    ...current,
                    books: current.books.map((book) => ({
                      ...book,
                      progress: result.progress?.[book.bookId]?.percent ?? book.progress,
                    })),
                  };
                });
              })
              .catch(() => {});
          }
        } catch (error) {
          setState({ loading: false, error: error.message });
        }
      }, []);

      useEffect(() => {
        load();
      }, [load]);

      const books = useMemo(() => {
        const list = (data && data.books) || [];
        const keyword = query.trim().toLowerCase();
        return list
          .filter((book) => {
            if (!keyword) return true;
            return `${book.title} ${book.author}`.toLowerCase().includes(keyword);
          })
          .filter((book) => {
            if (filter === 'reading') return !book.finished;
            if (filter === 'finished') return book.finished;
            if (filter === 'unread') return !book.finished && !book.progress;
            return true;
          })
          .sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0));
      }, [data, filter, query]);

      const openUrl = async (url) => {
        if (!url) {
          onToast(T.noReaderLink);
          return;
        }
        try {
          await api('/open', { method: 'POST', body: { url } });
        } catch (error) {
          window.open(url, '_blank', 'noopener');
        }
      };

      const runSearch = async () => {
        const keyword = query.trim();
        if (!keyword) {
          onToast(T.storeHint);
          return;
        }
        try {
          const result = await api('/search?q=' + encodeURIComponent(keyword));
          const list = result.results || [];
          setStore(list);
          if (!list.length) onToast(T.storeEmpty);
        } catch (error) {
          onToast(error.message);
        }
      };

      const toolbar = h(
        'div',
        { style: { marginBottom: 18 } },
        h(
          'div',
          { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
          h('input', {
            style: { ...S.input, maxWidth: 300 },
            placeholder: T.search,
            value: query,
            onChange: (event) => setQuery(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') runSearch();
            },
          }),
          h(Btn, { onClick: runSearch }, T.storeSearch),
          h(Btn, { onClick: () => openUrl(STORE_PAGE) }, T.openStore),
          h('div', { style: S.grow }),
          h(Btn, { onClick: load }, T.refresh),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 14 } },
          h(
            'div',
            { style: S.chips },
            [
              ['all', T.all],
              ['reading', T.reading],
              ['finished', T.finished],
              ['unread', T.notStarted],
            ].map(([id, label]) =>
              h(
                'button',
                { type: 'button', key: id, style: { ...S.chip, ...(filter === id ? S.chipOn : {}) }, onClick: () => setFilter(id) },
                label,
              ),
            ),
          ),
          h('div', { style: S.grow }),
          h('div', { style: { fontSize: 11.5, color: C.dim, letterSpacing: 0.6 } }, data ? T.count((data.books || []).length) : ''),
        ),
      );

      let content;
      if (state.loading) content = h('div', { style: S.empty }, T.loading);
      else if (state.error) content = h('div', { style: S.empty }, `${T.error}：${state.error}`, h('div', { style: { marginTop: 10 } }, h(Btn, { onClick: load }, T.retry)));
      else if (!books.length)
        content = h(
          'div',
          { style: S.empty },
          h('div', { style: { fontSize: 14, fontWeight: 600 } }, T.empty),
          h('div', { style: { marginTop: 6, fontSize: 12.5 } }, T.emptyHint),
        );
      else content = h('div', { style: S.grid }, books.map((book) => h(BookCard, { key: book.bookId, book, onOpen })));

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } },
        h(
          'div',
          { style: { ...S.body, flex: 'none', overflow: 'visible', paddingBottom: 0 } },
          toolbar,
          store && store.length
            ? h(
                'div',
                { style: { ...S.panelCard, marginBottom: 14 } },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 } },
                  h('div', { style: { ...S.sectionTitle, flex: 1 } }, `${T.storeSearch} · ${query.trim()}`),
                  h(
                    'button',
                    { type: 'button', onClick: () => setStore(null), style: { appearance: 'none', border: 'none', background: 'transparent', color: C.dim, fontSize: 11.5, font: 'inherit', cursor: 'pointer', padding: 0 } },
                    T.close,
                  ),
                ),
                store.slice(0, 8).map((item, index) => {
                  const url = item.readerLink || item.deepLink || '';
                  const score = item.rating || item.newRating || 0;
                  return h(
                    'button',
                    {
                      type: 'button',
                      key: item.bookId || index,
                      onClick: () => openUrl(url),
                      style: {
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        width: '100%',
                        textAlign: 'left',
                        padding: '7px 0',
                        background: 'transparent',
                        font: 'inherit',
                        color: 'inherit',
                        cursor: 'pointer',
                        border: 'none',
                        borderTop: index ? `1px solid ${C.border}` : 'none',
                      },
                    },
                    h('div', { style: { ...S.bookTitle, flex: 1 } }, item.title),
                    h('div', { style: S.bookMeta }, item.author),
                    score ? h('div', { style: { fontSize: 11.5, color: C.warn } }, `${(score / 10).toFixed(1)}★`) : null,
                  );
                }),
              )
            : null,
        ),
        h('div', { style: S.body }, content),
      );
    }

    // ------------------------------------------------------------ notes
    function NotesView(props) {
      const { onOpen } = props;
      const [state, setState] = useState({ loading: true, data: null, error: '' });
      useEffect(() => {
        api('/notes')
          .then((data) => setState({ loading: false, data, error: '' }))
          .catch((error) => setState({ loading: false, data: null, error: error.message }));
      }, []);
      if (state.loading) return h('div', { style: S.empty }, T.loading);
      if (state.error) return h('div', { style: S.empty }, `${T.error}：${state.error}`);
      const books = [...((state.data && state.data.books) || [])].sort(
        (a, b) => (b.noteCount || 0) + (b.reviewCount || 0) - ((a.noteCount || 0) + (a.reviewCount || 0)),
      );
      if (!books.length) return h('div', { style: S.empty }, T.noHighlights);
      return h(
        'div',
        { style: S.body },
        books.map((book) =>
          h(
            'button',
            {
              type: 'button',
              key: book.bookId,
              style: { ...S.listItem, display: 'flex', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left', font: 'inherit', color: 'inherit', cursor: 'pointer' },
              onClick: () => onOpen(book),
            },
            h(Cover, { book: { title: book.title, cover: book.cover }, compact: true, style: { width: 44, flex: 'none', boxShadow: 'none' } }),
            h(
              'div',
              { style: { flex: 1, minWidth: 0 } },
              h('div', { style: S.bookTitle }, book.title),
              h('div', { style: { ...S.bookMeta, marginTop: 2 } }, `${book.author || '佚名'} · 划线 ${book.noteCount || 0} · 想法 ${book.reviewCount || 0}`),
            ),
            h('div', { style: { fontSize: 12, color: C.dim } }, `${Math.round(book.progress || 0)}%`),
          ),
        ),
      );
    }

    // ------------------------------------------------------------ stats
    function StatsView(props) {
      const { onOpen } = props;
      const [mode, setMode] = useState('annually');
      const [shape, setShape] = useState('bars');
      const [state, setState] = useState({ loading: true, data: null, error: '' });
      const [cal, setCal] = useState(null);
      const [calError, setCalError] = useState('');
      const [wall, setWall] = useState([]);

      const load = useCallback((next) => {
        setState((current) => ({ ...current, loading: true, error: '' }));
        api('/stats?mode=' + encodeURIComponent(next))
          .then((data) => setState({ loading: false, data, error: '' }))
          .catch((error) => setState({ loading: false, data: null, error: error.message }));
      }, []);

      useEffect(() => {
        load(mode);
      }, [load, mode]);

      const loadCalendar = useCallback(() => {
        setCalError('');
        api('/calendar?weeks=53')
          .then((data) => setCal(data))
          .catch((error) => setCalError(error.message));
      }, []);

      useEffect(() => {
        loadCalendar();
      }, [loadCalendar]);

      // The wall wants every shelf book's percent; shelf already carries most of them.
      useEffect(() => {
        let alive = true;
        api('/shelf')
          .then(async (shelf) => {
            const books = (shelf && shelf.books) || [];
            const byId = { ...(shelf && shelf.progress) };
            const missing = books.filter((book) => book.progress === null || book.progress === undefined).map((book) => book.bookId);
            for (let index = 0; index < missing.length; index += 60) {
              try {
                const result = await api('/progress?ids=' + encodeURIComponent(missing.slice(index, index + 60).join(',')));
                Object.assign(byId, result.progress || {});
              } catch {
                // A wall missing a few books is still worth drawing.
              }
            }
            if (!alive) return;
            setWall(books.map((book) => ({ ...book, progress: book.progress ?? byId[book.bookId]?.percent ?? 0 })));
          })
          .catch(() => {});
        return () => {
          alive = false;
        };
      }, []);

      const data = state.data;

      const streak = useMemo(() => {
        if (!cal || !cal.days) return 0;
        const cursor = new Date();
        let count = 0;
        while (count < 400) {
          if (!cal.days[dayStamp(cursor)]) break;
          count += 1;
          cursor.setDate(cursor.getDate() - 1);
        }
        return count;
      }, [cal]);

      const tiles = [
        { label: T.readTime, value: data ? human(data.totalSeconds) : '—', delta: data && data.compare !== null ? { value: data.compare, label: T.compare } : null },
        { label: T.readDays, value: data ? `${data.readDays || 0} ${T.daysUnit}` : '—' },
        { label: T.daily, value: data ? human(data.dayAverageSeconds) : '—' },
        { label: T.streak, value: `${streak} ${T.daysUnit}` },
      ];

      const points = useMemo(() => {
        if (!data || !data.buckets) return [];
        // Buckets are local period starts: annually = months, overall = years, weekly/monthly = days.
        // Drop periods that have not happened yet, and leading years with nothing in them.
        const now = Date.now();
        const list = data.buckets.filter((bucket) => bucket.at <= now);
        if (mode === 'overall') {
          const first = list.findIndex((bucket) => bucket.seconds > 0);
          const years = first < 0 ? [] : list.slice(first);
          return years.map((bucket) => ({ ...bucket, label: `${new Date(bucket.at).getFullYear()}` }));
        }
        if (mode === 'annually') {
          return list.slice(-12).map((bucket) => ({ ...bucket, label: `${new Date(bucket.at).getMonth() + 1}月` }));
        }
        return list.slice(-14).map((bucket) => ({ ...bucket, label: dateLabel(bucket.at) }));
      }, [data, mode]);

      const modeChips = [
        ['weekly', '本周'],
        ['monthly', '本月'],
        ['annually', '今年'],
        ['overall', '总计'],
      ];

      return h(
        'div',
        { style: S.body },
        h(
          'div',
          { style: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 } },
          h(
            'div',
            { style: S.chips },
            modeChips.map(([id, label]) =>
              h('button', { type: 'button', key: id, style: { ...S.chip, ...(mode === id ? S.chipOn : {}) }, onClick: () => setMode(id) }, label),
            ),
          ),
          h('div', { style: S.grow }),
          state.loading ? h('div', { style: { fontSize: 12, color: C.dim } }, T.loading) : null,
        ),
        state.error
          ? h('div', { style: { ...S.empty, padding: 24 } }, `${T.error}：${state.error}`, h('div', { style: { marginTop: 10 } }, h(Btn, { onClick: () => load(mode) }, T.retry)))
          : null,
        state.error
          ? null
          : h(
              'div',
              { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
              data && !state.loading && !data.totalSeconds
                ? h('div', { style: { ...S.panelCard, fontSize: 12.5, color: C.dim } }, T.emptyPeriod)
                : null,
              h(
                'div',
                { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
                tiles.map((tile, index) =>
                  h(
                    'div',
                    { style: S.tile, key: index },
                    h('div', { style: S.tileLabel }, tile.label),
                    h('div', { style: S.tileValue }, tile.value),
                    tile.delta
                      ? h(
                          'div',
                          { style: { ...S.tileDelta, color: tile.delta.value >= 0 ? C.ok : C.warn } },
                          `${tile.delta.value >= 0 ? '+' : ''}${Math.round(tile.delta.value * 100)}% ${tile.delta.label}`,
                        )
                      : null,
                  ),
                ),
              ),
              h(
                'div',
                { style: S.plate },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 } },
                  h('div', { style: S.sectionTitle }, T.calendar),
                  h('div', { style: { fontSize: 11, color: C.dim } }, T.calendarHint),
                  h('div', { style: S.grow }),
                  cal && streak ? h('div', { style: { fontSize: 11.5, color: C.dim } }, `${T.streak} ${streak} ${T.daysUnit}`) : null,
                ),
                calError
                  ? h(
                      'div',
                      { style: { ...S.empty, padding: 16 } },
                      `${T.error}：${calError}`,
                      h('div', { style: { marginTop: 8 } }, h(Btn, { onClick: loadCalendar }, T.retry)),
                    )
                  : h(CalendarHeat, { data: cal }),
              ),
              h(
                'div',
                { style: S.panelCard },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                  h('div', { style: S.sectionTitle }, T.trend),
                  h('div', { style: S.grow }),
                  h(
                    'div',
                    { style: S.chips },
                    [
                      ['bars', T.bars],
                      ['line', T.lines],
                    ].map(([id, label]) =>
                      h('button', { type: 'button', key: id, style: { ...S.chip, ...(shape === id ? S.chipOn : {}) }, onClick: () => setShape(id) }, label),
                    ),
                  ),
                ),
                h(TrendChart, { points, shape }),
              ),
              h(
                'div',
                { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 } },
                h(
                  'div',
                  { style: S.panelCard },
                  h('div', { style: { ...S.sectionTitle, marginBottom: 6 } }, T.byHour),
                  h(HourClock, { hours: data ? data.hours : [] }),
                ),
                h(
                  'div',
                  { style: S.panelCard },
                  h('div', { style: { ...S.sectionTitle, marginBottom: 6 } }, T.byCategory),
                  h(CategoryDonut, { categories: data ? data.categories : [] }),
                ),
              ),
              h(
                'div',
                { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 } },
                h(
                  'div',
                  { style: S.panelCard },
                  h('div', { style: { ...S.sectionTitle, marginBottom: 6 } }, T.byWeekday),
                  h(WeekdayChart, { days: cal ? cal.days : null }),
                ),
                h(
                  'div',
                  { style: S.panelCard },
                  h('div', { style: { ...S.sectionTitle, marginBottom: 6 } }, T.noteDensity),
                  h(NoteScatter, { books: wall }),
                ),
              ),
              h(
                'div',
                { style: S.plate },
                h(
                  'div',
                  { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 } },
                  h('div', { style: S.sectionTitle }, T.progressWall),
                  h('div', { style: { fontSize: 11, color: C.dim } }, T.progressWallHint),
                ),
                h(ProgressWall, { books: wall, onOpen }),
              ),
              h(
                'div',
                { style: S.panelCard },
                h('div', { style: { ...S.sectionTitle, marginBottom: 10 } }, T.topBooks),
                h(TopBooks, { books: data ? data.longest : [] }),
              ),
            ),
      );
    }

    // ------------------------------------------------------------ AI drawer
    function AiDrawer(props) {
      const { mode, book, onClose, onToast, seed } = props;
      const [messages, setMessages] = useState([]);
      const [input, setInput] = useState('');
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const listRef = useRef(null);

      useEffect(() => {
        setMessages([]);
        setError('');
        setInput(seed || '');
      }, [mode, book && book.bookId, seed]);

      useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, [messages, busy]);

      const send = async () => {
        const question = input.trim();
        if (!question || busy) return;
        const history = messages.filter((item) => item.content).map((item) => ({ role: item.role, content: item.content }));
        setInput('');
        setError('');
        setBusy(true);
        setMessages((current) => [...current, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
        try {
          await streamAsk(
            { mode, bookId: book && book.bookId, question, history },
            (event) => {
              if (event.text) {
                setMessages((current) => {
                  const next = current.slice();
                  const last = next[next.length - 1];
                  if (last && last.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + event.text };
                  return next;
                });
              } else if (event.error) {
                setError(event.error);
              }
            },
          );
        } catch (streamError) {
          setError(streamError.message);
        } finally {
          setBusy(false);
        }
      };

      const greeting = mode === 'book' && book ? T.aiGreeting(book.title) : T.aiGlobal;

      return h(
        'div',
        { style: S.drawer },
        h(
          'div',
          { style: S.drawerHead },
          h('div', { style: { minWidth: 0 } },
            h('div', { style: { fontSize: 13.5, fontWeight: 650 } }, mode === 'book' && book ? `陪读《${book.title}》` : '问屿'),
            h('div', { style: S.bookMeta }, mode === 'book' ? (book.author || '') : T.ask),
          ),
          h('div', { style: S.grow }),
          h(Btn, { onClick: onClose }, '关闭'),
        ),
        h(
          'div',
          { style: S.chat, ref: listRef },
          h('div', { style: { ...S.bubble, ...S.bubbleAi, color: C.dim } }, greeting),
          messages.map((item, index) =>
            h(
              'div',
              { key: index, style: { ...S.bubble, ...(item.role === 'user' ? S.bubbleMe : S.bubbleAi) } },
              item.content || (busy && index === messages.length - 1 ? T.thinking : ''),
            ),
          ),
          messages.length && messages[messages.length - 1].content && mode === 'book'
            ? h(
                'div',
                { style: { alignSelf: 'flex-start' } },
                h(
                  'button',
                  {
                    type: 'button',
                    style: S.link,
                    onClick: async () => {
                      try {
                        await api('/save', {
                          method: 'POST',
                          body: {
                            bookId: book.bookId,
                            title: book.title,
                            author: book.author,
                            kind: 'insight',
                            text: messages[messages.length - 1].content,
                          },
                        });
                        onToast(T.saved);
                      } catch (saveError) {
                        onToast(saveError.message);
                      }
                    },
                  },
                  T.save,
                ),
              )
            : null,
          error ? h('div', { style: { ...S.bubble, background: 'rgba(201,138,18,.10)', color: C.warn } }, `${T.aiError}${error}`) : null,
        ),
        h(
          'div',
          { style: S.composer },
          h('textarea', {
            style: S.textarea,
            rows: 1,
            placeholder: T.aiAsk,
            value: input,
            onChange: (event) => setInput(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            },
          }),
          h(Btn, { kind: 'primary', onClick: send, disabled: busy || !input.trim() }, busy ? T.thinking : '发送'),
        ),
      );
    }

    // ------------------------------------------------------------ detail
    function DetailView(props) {
      const { seed, onBack, onToast, onAsk } = props;
      const [state, setState] = useState({ loading: true, data: null, error: '' });
      const [tab, setTab] = useState('intro');
      const [saving, setSaving] = useState('');
      const [archiving, setArchiving] = useState(false);

      useEffect(() => {
        let alive = true;
        setState({ loading: true, data: null, error: '' });
        api('/book?id=' + encodeURIComponent(seed.bookId))
          .then((data) => alive && setState({ loading: false, data, error: '' }))
          .catch((error) => alive && setState({ loading: false, data: null, error: error.message }));
        return () => {
          alive = false;
        };
      }, [seed.bookId]);

      const info = (state.data && state.data.info) || {};
      const book = { ...seed, ...info };
      const progress = state.data && state.data.progress;
      const percent = book.finished ? 100 : Math.round((progress && progress.percent) || seed.progress || 0);
      const highlights = (state.data && state.data.highlights) || [];
      const thoughts = (state.data && state.data.thoughts) || [];
      const chapters = (state.data && state.data.chapters) || [];

      const save = async (kind, text, where) => {
        setSaving(text.slice(0, 20));
        try {
          await api('/save', { method: 'POST', body: { bookId: book.bookId, title: book.title, author: book.author, kind, text, where } });
          onToast(T.saved);
        } catch (error) {
          onToast(error.message);
        } finally {
          setSaving('');
        }
      };

      const archive = async () => {
        if (archiving) return;
        setArchiving(true);
        try {
          const result = await api('/archive', {
            method: 'POST',
            body: { bookId: book.bookId, title: book.title, author: book.author },
          });
          onToast(result.unchanged ? result.message : `${T.archived} ${result.added} ${T.items}`);
        } catch (error) {
          onToast(error.message);
        } finally {
          setArchiving(false);
        }
      };

      const tags = [
        ['intro', T.intro],
        ['chapters', `${T.chapters} ${chapters.length}`],
        ['highlights', `${T.highlights} ${highlights.length}`],
        ['thoughts', `${T.thoughts} ${thoughts.length}`],
      ];

      let body;
      if (state.loading) body = h('div', { style: S.empty }, T.loading);
      else if (tab === 'highlights') {
        body = highlights.length
          ? highlights.map((item, index) =>
              h(
                'div',
                { style: S.listItem, key: item.bookmarkId || index },
                h('div', { style: S.quote }, item.markText),
                h(
                  'div',
                  { style: S.quoteMeta },
                  item.chapter ? h('span', null, item.chapter) : null,
                  item.at ? h('span', null, dateLabel(item.at)) : null,
                  h(
                    'button',
                    { type: 'button', style: { ...S.link, marginLeft: 'auto' }, onClick: () => save('highlight', item.markText, item.chapter) },
                    saving === item.markText.slice(0, 20) ? '保存中…' : T.save,
                  ),
                  h('button', { type: 'button', style: S.link, onClick: () => onAsk(book, `我划了这段话：「${item.markText}」。它放在这本书里是什么意思？帮我拆解一下。`) }, '问屿'),
                ),
              ),
            )
          : h('div', { style: S.empty }, T.noHighlights);
      } else if (tab === 'thoughts') {
        body = thoughts.length
          ? thoughts.map((item, index) =>
              h(
                'div',
                { style: S.listItem, key: item.reviewId || index },
                h('div', { style: S.quote }, item.content),
                h(
                  'div',
                  { style: S.quoteMeta },
                  item.chapter ? h('span', null, item.chapter) : null,
                  item.at ? h('span', null, dateLabel(item.at)) : null,
                  h(
                    'button',
                    { type: 'button', style: { ...S.link, marginLeft: 'auto' }, onClick: () => save('thought', item.content, item.chapter) },
                    T.save,
                  ),
                ),
              ),
            )
          : h('div', { style: S.empty }, T.noThoughts);
      } else if (tab === 'chapters') {
        body = chapters.length
          ? chapters.map((chapter, index) =>
              h(
                'div',
                {
                  key: chapter.chapterUid || index,
                  style: { padding: '7px 2px', borderBottom: `1px solid ${C.border}`, fontSize: 12.5, color: chapter.level > 1 ? C.dim : C.text },
                },
                chapter.title,
              ),
            )
          : h('div', { style: S.empty }, T.noChapters);
      } else {
        body = book.intro
          ? h('div', { style: { ...S.quote, color: C.dim, whiteSpace: 'pre-wrap' } }, book.intro)
          : h('div', { style: S.empty }, T.noData);
      }

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } },
        h(
          'div',
          { style: { ...S.body, flex: 'none', overflow: 'visible', paddingBottom: 0 } },
          h(Btn, { onClick: onBack, style: { marginBottom: 12 } }, T.back),
          h(
            'div',
            { style: S.hero },
            h(
              'div',
              { style: S.heroCover },
              h(Cover, { book, style: { width: '100%', height: '100%', aspectRatio: 'auto', boxShadow: 'none', borderRadius: 0 } }),
            ),
            h(
              'div',
              { style: { minWidth: 0, flex: 1 } },
              h('div', { style: S.heroTitle }, book.title || '未命名'),
              h(
                'div',
                { style: S.heroMeta },
                [
                  book.author || '佚名',
                  book.newRating ? `${(book.newRating / 10).toFixed(1)}★` : '',
                  book.category || '',
                  percent ? `进度 ${percent}%` : T.notStarted,
                ]
                  .filter(Boolean)
                  .join(' · '),
              ),
              h('div', { style: { maxWidth: 320, marginTop: 10 } }, h(Bar, { value: percent })),
              h(
                'div',
                { style: S.actions },
                h(Btn, {
                  kind: 'primary',
                  onClick: () => props.onOpenReader(book),
                }, T.readNow),
                h(Btn, { onClick: () => onAsk(book) }, T.aiCompanion),
                h(Btn, { onClick: archive, disabled: archiving }, archiving ? T.archiving : T.archiveBook),
              ),
            ),
          ),
        ),
        h(
          'div',
          { style: { padding: '0 18px', borderBottom: `1px solid ${C.border}`, flex: 'none', display: 'flex', gap: 4, overflowX: 'auto' } },
          tags.map(([id, label], index) => [
            index === 2
              ? h('span', { key: 'tab-sep', style: { width: 1, flex: 'none', background: C.border, margin: '7px 4px' } })
              : null,
            h(
              'button',
              {
                type: 'button',
                key: id,
                onClick: () => setTab(id),
                style: {
                  appearance: 'none',
                  border: 0,
                  background: 'transparent',
                  color: tab === id ? C.text : C.dim,
                  font: 'inherit',
                  fontSize: 12.5,
                  fontWeight: tab === id ? 650 : 500,
                  padding: '9px 8px',
                  borderBottom: `2px solid ${tab === id ? BRAND : 'transparent'}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                },
              },
              label,
            ),
          ]),
        ),
        h('div', { style: S.body }, body),
      );
    }

    // ------------------------------------------------------------ companion desk
    function CompanionView(props) {
      const { seed, onBack, onToast } = props;
      const [data, setData] = useState({ loading: true, info: {}, highlights: [], thoughts: [] });
      const [tab, setTab] = useState('highlights');
      const [messages, setMessages] = useState([]);
      const [input, setInput] = useState('');
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const [note, setNote] = useState('');
      const [savingNote, setSavingNote] = useState(false);
      const listRef = useRef(null);

      useEffect(() => {
        let alive = true;
        setData({ loading: true, info: {}, highlights: [], thoughts: [] });
        setMessages([]);
        api('/book?id=' + encodeURIComponent(seed.bookId))
          .then((payload) => {
            if (!alive) return;
            setData({
              loading: false,
              info: payload.info ?? {},
              highlights: payload.highlights ?? [],
              thoughts: payload.thoughts ?? [],
            });
          })
          .catch((requestError) => alive && setData({ loading: false, info: {}, highlights: [], thoughts: [], error: requestError.message }));
        return () => {
          alive = false;
        };
      }, [seed.bookId]);

      useEffect(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, [messages, busy]);

      const book = { ...seed, ...(data.info || {}) };

      const send = async () => {
        const question = input.trim();
        if (!question || busy) return;
        const history = messages.filter((item) => item.content).map((item) => ({ role: item.role, content: item.content }));
        setInput('');
        setError('');
        setBusy(true);
        setMessages((current) => [...current, { role: 'user', content: question }, { role: 'assistant', content: '' }]);
        try {
          await streamAsk({ mode: 'book', bookId: seed.bookId, question, history }, (event) => {
            if (event.text) {
              setMessages((current) => {
                const next = current.slice();
                const last = next[next.length - 1];
                if (last && last.role === 'assistant') next[next.length - 1] = { ...last, content: last.content + event.text };
                return next;
              });
            } else if (event.error) {
              setError(event.error);
            }
          });
        } catch (streamError) {
          setError(streamError.message);
        } finally {
          setBusy(false);
        }
      };

      const capture = async () => {
        const value = note.trim();
        if (!value) return;
        setSavingNote(true);
        try {
          await api('/save', {
            method: 'POST',
            body: { bookId: seed.bookId, title: book.title, author: book.author, kind: 'note', text: value },
          });
          setNote('');
          onToast(T.saved);
        } catch (saveError) {
          onToast(saveError.message);
        } finally {
          setSavingNote(false);
        }
      };

      const entries = tab === 'highlights' ? data.highlights : data.thoughts;

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
        h(
          'div',
          { style: S.paneHead },
          h(Btn, { onClick: onBack }, T.back),
          h('div', { style: { minWidth: 0, flex: 1, display: 'flex', alignItems: 'baseline', gap: 8 } },
            h('div', { style: { fontSize: 13.5, fontWeight: 650, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, book.title || '未命名'),
            h('div', { style: { fontSize: 11.5, color: C.dim } }, T.companionHint),
          ),
        ),
        h(
          'div',
          { style: S.split },
          h(
            'div',
            { style: S.pane },
            h('div', { style: S.paneHead }, h('div', { style: S.paneTitle }, `陪读《${book.title || ''}》`)),
            h(
              'div',
              { style: S.paneBody, ref: listRef },
              h('div', { style: { ...S.bubble, ...S.bubbleAi, color: C.dim } }, T.aiGreeting(book.title)),
              messages.map((item, index) =>
                h(
                  'div',
                  { key: index, style: { ...S.bubble, ...(item.role === 'user' ? S.bubbleMe : S.bubbleAi) } },
                  item.content || (busy && index === messages.length - 1 ? T.thinking : ''),
                ),
              ),
              error ? h('div', { style: { ...S.bubble, background: 'rgba(201,138,18,.10)', color: C.warn } }, `${T.aiError}${error}`) : null,
            ),
            h(
              'div',
              { style: S.composer },
              h('textarea', {
                style: S.textarea,
                rows: 1,
                placeholder: T.aiAsk,
                value: input,
                onChange: (event) => setInput(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                },
              }),
              h(Btn, { kind: 'primary', onClick: send, disabled: busy || !input.trim() }, busy ? T.thinking : '发送'),
            ),
          ),
          h(
            'div',
            { style: { ...S.pane, ...S.paneSplit } },
            h(
              'div',
              { style: S.paneHead },
              h('div', { style: S.paneTitle }, '划线与随记'),
              h('div', { style: S.grow }),
              h(
                'div',
                { style: S.chipRow },
                h('button', { type: 'button', style: { ...S.chip, ...(tab === 'highlights' ? S.chipOn : {}) }, onClick: () => setTab('highlights') }, `${T.highlights} ${data.highlights.length}`),
                h('button', { type: 'button', style: { ...S.chip, ...(tab === 'thoughts' ? S.chipOn : {}) }, onClick: () => setTab('thoughts') }, `${T.thoughts} ${data.thoughts.length}`),
              ),
            ),
            h(
              'div',
              { style: S.paneBody },
              data.loading
                ? h('div', { style: S.empty }, T.loading)
                : entries.length
                  ? entries.map((item, index) =>
                      h(
                        'div',
                        { key: item.bookmarkId || item.reviewId || index, style: S.listItem },
                        h('div', { style: S.quote }, tab === 'highlights' ? item.markText : item.content),
                        h(
                          'div',
                          { style: S.quoteMeta },
                          item.chapter ? h('span', null, item.chapter) : null,
                          item.markText && tab === 'highlights'
                            ? h('button', {
                                type: 'button',
                                style: S.link,
                                onClick: async () => {
                                  try {
                                    await api('/save', {
                                      method: 'POST',
                                      body: { bookId: seed.bookId, title: book.title, author: book.author, kind: 'highlight', text: item.markText, where: item.chapter },
                                    });
                                    onToast(T.saved);
                                  } catch (saveError) {
                                    onToast(saveError.message);
                                  }
                                },
                              }, T.save)
                            : null,
                        ),
                      ),
                    )
                  : h('div', { style: S.empty }, T.noNotes),
            ),
            h(
              'div',
              { style: S.capture },
              h('textarea', {
                style: { ...S.textarea, minHeight: 58, resize: 'vertical' },
                rows: 2,
                placeholder: T.notePlaceholder,
                value: note,
                onChange: (event) => setNote(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault();
                    capture();
                  }
                },
              }),
              h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
                h(Btn, { kind: 'primary', onClick: capture, disabled: savingNote || !note.trim() }, savingNote ? T.saving : T.saveNote),
              ),
            ),
          ),
        ),
      );
    }

    // ------------------------------------------------------------ settings sheet
    function SettingsSheet(props) {
      const { initial, onSaved, onClose, configured, onKeyChanged } = props;
      const [apiKey, setApiKey] = useState('');
      const [keyState, setKeyState] = useState({ busy: false, error: '', note: '' });
      const [draft, setDraft] = useState(initial || {});
      const [saving, setSaving] = useState(false);

      const saveKey = async () => {
        if (!apiKey.trim() || keyState.busy) return;
        setKeyState({ busy: true, error: '', note: '' });
        try {
          await api('/key', { method: 'POST', body: { key: apiKey.trim() } });
          setApiKey('');
          setKeyState({ busy: false, error: '', note: T.keySaved });
          if (onKeyChanged) onKeyChanged();
        } catch (error) {
          setKeyState({ busy: false, error: error.message, note: '' });
        }
      };

      const clearKey = async () => {
        if (keyState.busy) return;
        setKeyState({ busy: true, error: '', note: '' });
        try {
          await api('/key', { method: 'DELETE' });
          setKeyState({ busy: false, error: '', note: T.keyCleared });
          if (onKeyChanged) onKeyChanged();
        } catch (error) {
          setKeyState({ busy: false, error: error.message, note: '' });
        }
      };

      const save = async () => {
        setSaving(true);
        try {
          const result = await api('/settings', { method: 'POST', body: draft });
          onSaved(result.settings || draft);
          onClose();
        } catch (error) {
          onSaved(draft, error.message);
          onClose();
        } finally {
          setSaving(false);
        }
      };

      return h(
        'div',
        { style: S.sheetMask, onClick: onClose },
        h(
          'div',
          { style: S.sheet, onClick: (event) => event.stopPropagation() },
          h(
            'div',
            { style: { fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: C.text, letterSpacing: 1.4, paddingBottom: 10, borderBottom: `1px solid ${C.border}` } },
            T.settings,
          ),
          h(
            'label',
            { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.text, cursor: 'pointer' } },
            h('input', {
              type: 'checkbox',
              checked: draft.autoSplit !== false,
              style: { accentColor: BRAND, width: 14, height: 14, margin: 0 },
              onChange: (event) => setDraft({ ...draft, autoSplit: event.target.checked }),
            }),
            T.autoSplit,
          ),
          h('div', { style: S.fieldLabel }, T.autoSplitHint),
          h('div', { style: S.fieldLabel }, T.vaultFolder),
          h('input', {
            style: S.field,
            value: draft.folder || '',
            onChange: (event) => setDraft({ ...draft, folder: event.target.value }),
          }),
          h('div', { style: S.sheetDivider }),
          h('div', { style: { fontSize: 13, fontWeight: 650, color: C.text } }, T.apiKey),
          h('div', { style: S.fieldLabel }, configured ? T.keyConnected : T.keyMissing),
          h('input', {
            type: 'password',
            style: S.field,
            placeholder: T.keyPlaceholder,
            value: apiKey,
            onChange: (event) => setApiKey(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') saveKey();
            },
          }),
          keyState.error ? h('div', { style: { color: C.warn, fontSize: 12 } }, keyState.error) : null,
          keyState.note ? h('div', { style: { color: C.ok, fontSize: 12 } }, keyState.note) : null,
          h('div', { style: { display: 'flex', gap: 8 } },
            h(Btn, { onClick: saveKey, disabled: keyState.busy || !apiKey.trim() }, T.connect),
            h(Btn, { onClick: clearKey, disabled: keyState.busy || !configured }, T.disconnect),
          ),
          h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 } },
            h(Btn, { onClick: onClose }, '取消'),
            h(Btn, { kind: 'primary', onClick: save, disabled: saving }, saving ? T.saving : T.saveSettings),
          ),
        ),
      );
    }

    // ------------------------------------------------------------ panel
    function Panel() {
      const [tab, setTab] = useState('shelf');
      const [configured, setConfigured] = useState(null);
      const [book, setBook] = useState(null);
      const [ai, setAi] = useState(null);
      const [toast, setToast] = useState('');
      const [seeded, setSeeded] = useState('');
      const [split, setSplit] = useState(null);
      const [settings, setSettings] = useState(null);
      const [showSettings, setShowSettings] = useState(false);
      const [forceSetup, setForceSetup] = useState(false);

      const showToast = useCallback((message) => {
        setToast(message);
        setTimeout(() => setToast(''), 2200);
      }, []);

      const check = useCallback(() => {
        api('/state')
          .then((state) => setConfigured(Boolean(state.configured)))
          .catch(() => setConfigured(false));
      }, []);

      useEffect(() => {
        check();
      }, [check]);

      // One expired key triggers every view's 401; surface the card instead of a wall of errors.
      useEffect(() => {
        const hook = () => setForceSetup(true);
        authHooks.add(hook);
        return () => authHooks.delete(hook);
      }, []);

      useEffect(() => {
        api('/settings')
          .then((payload) => setSettings(payload.settings || {}))
          .catch(() => setSettings({}));
      }, []);

      const ask = useCallback((target, prompt) => {
        setAi({ mode: target ? 'book' : 'global', book: target });
        if (prompt) setSeeded(prompt);
      }, []);

      if (configured === null) return h('div', { style: S.root }, h('div', { style: S.empty }, T.loading));
      if (!configured || forceSetup) {
        return h(
          'div',
          { style: S.root },
          h(SetupCard, {
            onSaved: () => {
              setForceSetup(false);
              check();
            },
            onCancel: configured ? () => setForceSetup(false) : null,
          }),
        );
      }

      const openBook = (target) => {
        setSplit(null);
        setBook(target);
      };


      let main;
      if (split) {
        main = h(CompanionView, { seed: split, onBack: () => setSplit(null), onToast: showToast });
      } else if (book) {
        main = h(DetailView, {
          seed: book,
          onBack: () => setBook(null),
          onToast: showToast,
          onAsk: ask,
          onOpenReader: async (target) => {
            const url = target.readerLink || target.deepLink;
            if (!url) {
              showToast(T.noReaderLink);
              return;
            }
            try {
              const result = await api('/open', { method: 'POST', body: { url } });
              if (result?.mode === 'app-window') showToast(T.openedWindow);
              if (settings?.autoSplit !== false) setSplit(target);
            } catch (error) {
              window.open(url, '_blank', 'noopener');
              showToast(error.message);
            }
          },
        });
      } else if (tab === 'shelf') {
        main = h(ShelfView, { onOpen: openBook, onAskShelf: () => ask(null), onToast: showToast });
      } else if (tab === 'notes') {
        main = h(NotesView, { onOpen: openBook });
      } else {
        main = h(StatsView, { onOpen: openBook });
      }

      return h(
        'div',
        { style: { ...S.root, position: 'relative' } },
        h(
          'div',
          { style: S.header },
          h(
            'div',
            { style: S.brand },
            h('div', { style: S.seal }, h('span', { style: S.sealText }, T.title)),
            h('div', { style: S.brandCol }, h('div', { style: S.brandSub }, T.sub)),
          ),
          h('div', { style: S.grow }),
          h(
            'div',
            { style: S.tabs },
            [
              ['shelf', T.shelf],
              ['notes', T.notes],
              ['stats', T.stats],
            ].map(([id, label]) =>
              h(
                'button',
                { type: 'button', key: id, style: { ...S.tab, ...(tab === id && !book ? S.tabOn : {}) }, onClick: () => { setTab(id); setBook(null); } },
                label,
              ),
            ),
          ),
          h(Btn, { onClick: () => setShowSettings(true) }, T.settings),
          h(Btn, { kind: 'primary', onClick: () => ask(book, '') }, T.ask),
        ),
        main,
        showSettings
          ? h(SettingsSheet, {
              initial: settings || {},
              configured: Boolean(configured),
              onKeyChanged: () => {
                check();
                setForceSetup(false);
              },
              onSaved: (next, message) => {
                setSettings(next);
                showToast(message || T.settingsSaved);
              },
              onClose: () => setShowSettings(false),
            })
          : null,
        ai
          ? h(AiDrawer, {
              mode: ai.mode,
              book: ai.book,
              onClose: () => setAi(null),
              onToast: showToast,
              seed: seeded,
            })
          : null,
        toast ? h('div', { style: S.toast }, toast) : null,
      );
    }

    // ------------------------------------------------------------ sidebar icon
    function ShelfIcon(props) {
      const size = (props && props.size) || 20;
      const active = Boolean(props && props.active);
      const color = active ? 'currentColor' : 'currentColor';
      return h(
        'svg',
        { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', style: { opacity: active ? 1 : 0.72, color } },
        h('path', {
          d: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h5A1.5 1.5 0 0 1 12 5.5V19a1.6 1.6 0 0 0-1.2-.5H5.5A1.5 1.5 0 0 1 4 17V5.5Z',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }),
        h('path', {
          d: 'M20 5.5A1.5 1.5 0 0 0 18.5 4h-5A1.5 1.5 0 0 0 12 5.5V19a1.6 1.6 0 0 1 1.2-.5h5.3a1.5 1.5 0 0 0 1.5-1.5V5.5Z',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M7 8h2.5M7 11h2.5M14.5 8H17M14.5 11H17', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', opacity: 0.7 }),
      );
    }

    // ------------------------------------------------------------ registration
    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 20, label: T.title }, ShelfIcon),
        );
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: PANEL_ID }, Panel));
      },
    };
  },
});