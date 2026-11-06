/**
 * WeRead official "Agent Skill" gateway client.
 *
 * Transport: POST https://i.weread.qq.com/api/agent/gateway
 * Auth:      Authorization: Bearer wrk-xxxxxxxx
 * Body:      { api_name, skill_version, ...business params }  (params flattened, never nested)
 */

const GATEWAY = 'https://i.weread.qq.com/api/agent/gateway';
const SKILL_VERSION = '1.0.5';
const TIMEOUT_MS = 25_000;

export class WereadError extends Error {
  constructor(message, code = 'weread-error') {
    super(message);
    this.name = 'WereadError';
    this.code = code;
  }
}

/** Timestamps in the gateway are unix seconds. */
function ts(seconds) {
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function createWeread({ getKey }) {
  const cache = new Map();

  function cached(key, ttlMs, producer) {
    const hit = cache.get(key);
    const now = Date.now();
    if (hit && now - hit.at < ttlMs) return hit.value;
    const value = Promise.resolve()
      .then(producer)
      .catch((error) => {
        cache.delete(key);
        throw error;
      });
    cache.set(key, { at: now, value });
    return value;
  }

  async function call(apiName, params = {}) {
    const key = await getKey();
    if (!key) throw new WereadError('还没有配置微信读书 API Key', 'no-key');

    let response;
    try {
      response = await fetch(GATEWAY, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ api_name: apiName, skill_version: SKILL_VERSION, ...params }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new WereadError(`连不上微信读书网关：${error?.message ?? error}`, 'network');
    }

    const body = await response.text();
    let data = null;
    try {
      data = body ? JSON.parse(body) : null;
    } catch {
      data = null;
    }

    if (response.status === 401 || response.status === 403) {
      throw new WereadError('API Key 无效或已失效，请重新获取', 'auth');
    }
    if (!response.ok) {
      throw new WereadError(`微信读书网关返回 ${response.status}${body ? `：${body.slice(0, 200)}` : ''}`, 'http');
    }
    if (!data || typeof data !== 'object') {
      throw new WereadError('微信读书网关返回了空响应', 'bad-response');
    }
    if (data.errcode !== undefined && Number(data.errcode) !== 0) {
      const code = String(data.errcode);
      const message = data.errmsg || data.errmessage || data.message || `接口错误 ${code}`;
      throw new WereadError(String(message), code === '-2012' || code === '401' ? 'auth' : 'api');
    }
    return data;
  }

  async function listInterfaces() {
    return call('/_list');
  }

  function normalizeBook(raw) {
    if (!raw) return null;
    return {
      bookId: String(raw.bookId ?? ''),
      title: text(raw.title),
      author: text(raw.author),
      cover: text(raw.cover),
      category: text(raw.category),
      readerLink: text(raw.readerLink),
      deepLink: text(raw.deepLink),
      lastReadAt: ts(raw.readUpdateTime),
      finished: Number(raw.finishReading) === 1,
      secret: Number(raw.secret) === 1,
      pinned: Number(raw.isTop) === 1,
      kind: 'book',
    };
  }

  function normalizeAlbum(entry) {
    const info = entry?.albumInfo ?? {};
    const extra = entry?.albumInfoExtra ?? {};
    return {
      bookId: String(info.albumId ?? ''),
      title: text(info.name),
      author: text(info.authorName),
      cover: text(info.cover),
      category: '有声书',
      tracks: Number(info.trackCount) || 0,
      finished: Number(info.finish) === 1,
      secret: Number(extra.secret) === 1,
      pinned: Number(extra.isTop) === 1,
      lastReadAt: ts(extra.lectureReadUpdateTime),
      kind: 'album',
    };
  }

  const shelf = () =>
    cached('shelf', 60_000, async () => {
      const data = await call('/shelf/sync');
      const books = Array.isArray(data.books) ? data.books.map(normalizeBook).filter(Boolean) : [];
      const albums = Array.isArray(data.albums) ? data.albums.map(normalizeAlbum) : [];
      const archive = Array.isArray(data.archive)
        ? data.archive.map((group) => ({
            name: text(group?.name),
            bookIds: Array.isArray(group?.bookIds) ? group.bookIds.map(String) : [],
          }))
        : [];
      return {
        books,
        albums,
        archive,
        hasArticles: Boolean(data.mp),
        total: books.length + albums.length + (data.mp ? 1 : 0),
        fetchedAt: Date.now(),
      };
    });

  const notebooks = () =>
    cached('notebooks', 120_000, async () => {
      const books = [];
      let lastSort;
      let guard = 0;
      for (;;) {
        guard += 1;
        if (guard > 30) break;
        const params = { count: 100 };
        if (lastSort !== undefined) params.lastSort = lastSort;
        const data = await call('/user/notebooks', params);
        const page = Array.isArray(data.books) ? data.books : [];
        books.push(...page);
        if (!Number(data.hasMore) || page.length === 0) break;
        lastSort = page[page.length - 1]?.sort;
        if (lastSort === undefined) break;
      }
      return {
        totalBookCount: Number(books.length),
        books: books.map((entry) => ({
          bookId: String(entry?.book?.bookId ?? entry?.bookId ?? ''),
          title: text(entry?.book?.title),
          author: text(entry?.book?.author),
          cover: text(entry?.book?.cover),
          noteCount: Number(entry?.noteCount) || 0,
          reviewCount: Number(entry?.reviewCount) || 0,
          bookmarkCount: Number(entry?.bookmarkCount) || 0,
          totalNotes:
            (Number(entry?.noteCount) || 0) +
            (Number(entry?.reviewCount) || 0) +
            (Number(entry?.bookmarkCount) || 0),
          progress: Number(entry?.readingProgress) || 0,
          finished: Number(entry?.markedStatus) === 1,
          lastNoteAt: ts(entry?.sort),
        })),
      };
    });

  const progress = (bookId) =>
    cached(`progress:${bookId}`, 120_000, async () => {
      const data = await call('/book/getprogress', { bookId });
      const book = data.book ?? {};
      return {
        bookId,
        percent: Number(book.progress) || 0,
        chapterUid: book.chapterUid ?? null,
        chapterOffset: book.chapterOffset ?? null,
        readingSeconds: Number(book.recordReadingTime) || 0,
        updatedAt: ts(book.updateTime),
        finishedAt: ts(book.finishTime),
        started: Boolean(book.isStartReading),
      };
    });

  const bookInfo = (bookId) =>
    cached(`info:${bookId}`, 30 * 60_000, async () => {
      const data = await call('/book/info', { bookId });
      return {
        ...(normalizeBook(data) ?? { bookId }),
        intro: text(data.intro),
        publisher: text(data.publisher),
        publishTime: text(data.publishTime),
        isbn: text(data.isbn),
        wordCount: Number(data.wordCount) || 0,
        rating: Number(data.newRating) || 0,
        ratingCount: Number(data.newRatingCount) || 0,
        translator: text(data.translator),
      };
    });

  const chapters = (bookId) =>
    cached(`chapters:${bookId}`, 30 * 60_000, async () => {
      const data = await call('/book/chapterinfo', { bookId });
      return (Array.isArray(data.chapters) ? data.chapters : []).map((chapter) => ({
        uid: chapter?.chapterUid ?? null,
        idx: Number(chapter?.chapterIdx) || 0,
        title: text(chapter?.title),
        level: Number(chapter?.level) || 1,
        wordCount: Number(chapter?.wordCount) || 0,
        paid: Number(chapter?.paid) === 1,
        price: Number(chapter?.price) || 0,
      }));
    });

  /** Highlights (划原文) grouped by chapter, newest first inside a chapter. */
  const highlights = (bookId) =>
    cached(`highlights:${bookId}`, 120_000, async () => {
      const data = await call('/book/bookmarklist', { bookId });
      const chapterTitles = new Map(
        (Array.isArray(data.chapters) ? data.chapters : []).map((chapter) => [
          String(chapter?.chapterUid ?? ''),
          text(chapter?.title),
        ]),
      );
      return (Array.isArray(data.updated) ? data.updated : [])
        .map((item) => ({
          id: String(item?.bookmarkId ?? ''),
          chapterUid: String(item?.chapterUid ?? ''),
          chapter: chapterTitles.get(String(item?.chapterUid ?? '')) || '',
          markText: text(item?.markText),
          createdAt: ts(item?.createTime),
          range: text(item?.range),
          color: item?.colorStyle ?? null,
        }))
        .filter((item) => item.markText)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    });

  /** My thoughts/reviews on one book. */
  const thoughts = (bookId) =>
    cached(`thoughts:${bookId}`, 120_000, async () => {
      const reviews = [];
      let synckey = 0;
      for (let guard = 0; guard < 10; guard += 1) {
        const data = await call('/review/list/mine', { bookid: bookId, count: 50, synckey });
        const page = Array.isArray(data.reviews) ? data.reviews : [];
        for (const entry of page) {
          const review = entry?.review ?? {};
          reviews.push({
            id: String(review.reviewId ?? ''),
            content: text(review.content),
            abstract: text(review.abstract),
            chapterUid: review.chapterUid != null ? String(review.chapterUid) : '',
            chapter: text(review.chapterName),
            createdAt: ts(review.createTime),
            star: Number(review.star) || 0,
            range: text(review.range),
          });
        }
        if (!Number(data.hasMore) || page.length === 0) break;
        synckey = Number(data.synckey) || 0;
        if (!synckey) break;
      }
      return reviews;
    });

  const search = (keyword, count = 20) =>
    call('/store/search', { keyword, count }).then((data) => {
      const raw = Array.isArray(data.results) ? data.results : Array.isArray(data.books) ? data.books : [];
      // /store/search answers with buckets: [{ title: '电子书', books: [{ searchIdx, bookInfo }] }].
      const flat = [];
      for (const item of raw) {
        if (Array.isArray(item?.books)) {
          for (const entry of item.books) flat.push(entry?.bookInfo ?? entry);
        } else {
          flat.push(item?.bookInfo ?? item);
        }
      }
      const seen = new Set();
      return flat
        .map((info) => {
          const book = normalizeBook(info);
          if (!book || !book.bookId) return null;
          if (seen.has(book.bookId)) return null;
          seen.add(book.bookId);
          return {
            ...book,
            rating: Number(info?.newRating) || 0,
            ratingCount: Number(info?.newRatingCount) || 0,
          };
        })
        .filter(Boolean);
    });

  const readData = () =>
    cached('readdata', 5 * 60_000, async () => {
      const data = await call('/readdata/detail', { mode: 'annually' });
      return normalizeReadData(data);
    });

  return {
    call,
    listInterfaces,
    shelf,
    notebooks,
    progress,
    bookInfo,
    chapters,
    highlights,
    thoughts,
    search,
    readData,
    invalidate() {
      cache.clear();
    },
  };
}

function normalizeReadData(data) {
  const base = data?.baseData?.data ?? data?.baseData ?? data ?? {};
  const yearly = data?.annualData?.data ?? data?.annualData ?? {};
  const pickSeconds = (value) => Number(value) || 0;
  const days = [
    ...(Array.isArray(base.readTime) ? base.readTime : []),
    ...(Array.isArray(base.readTimes) ? base.readTimes : []),
  ];
  return {
    totalSeconds: pickSeconds(base.totalReadTime),
    readDays: Number(base.readDays) || 0,
    totalBooks: Number(base.totalReadBooks ?? base.readBookCount) || 0,
    compareSeconds: pickSeconds(base.compareReadTime),
    daily: days.map((item) => ({
      date: text(item?.date ?? item?.readTime?.date),
      seconds: pickSeconds(item?.seconds ?? item?.readTime ?? item?.readTimes),
    })),
    yearly,
    raw: data,
  };
}