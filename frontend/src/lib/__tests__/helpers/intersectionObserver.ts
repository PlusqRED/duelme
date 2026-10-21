/**
 * An IntersectionObserver a test drives: it keeps what it observes, and `report` tells it that a
 * target crossed into view or out of it. Install it with `vi.stubGlobal('IntersectionObserver', …)`.
 */
export class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly observed = new Set<Element>();
  readonly root: Element | Document | null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[];
  private readonly callback: IntersectionObserverCallback;

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit = {}) {
    this.callback = callback;
    this.root = options.root ?? null;
    this.rootMargin = options.rootMargin ?? '0px';
    this.thresholds = [options.threshold ?? 0].flat();
    FakeIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  report(target: Element, isIntersecting: boolean) {
    const rect = target.getBoundingClientRect();
    const entry: IntersectionObserverEntry = {
      target,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: rect,
      intersectionRect: rect,
      rootBounds: null,
      time: 0,
    };
    this.callback([entry], this);
  }

  /** The observer watching `target`, the last one made if several do. */
  static watching(target: Element): FakeIntersectionObserver {
    const observer = FakeIntersectionObserver.instances.findLast((instance) => instance.observed.has(target));
    if (!observer) {
      throw new Error('Nothing observes this element');
    }
    return observer;
  }
}
