export class Deferred<T> implements Promise<T> {
  [Symbol.toStringTag] = "Deferred";
  // biome-ignore lint: ok
  readonly then: Promise<T>["then"];
  readonly catch: Promise<T>["catch"];
  readonly finally: Promise<T>["finally"];
  readonly resolve!: (value: T) => void;
  readonly reject!: (reason?: any) => void;
  constructor() {
    const promise = new Promise<T>((resolve, reject) => {
      // @ts-expect-error
      this.resolve = resolve;
      // @ts-expect-error
      this.reject = reject;
    });
    // biome-ignore lint: ok
    this.then = promise.then.bind(promise);
    this.catch = promise.catch.bind(promise);
    this.finally = promise.finally.bind(promise);
  }
}

export class DeferredAsyncIterator<T> implements AsyncIterator<T> {
  private _queue: Array<T> = [];
  private _deferred?: Deferred<IteratorResult<T, any>>;
  private _done = false;

  // === tx === //

  push(value: T) {
    if (this._done) return;
    if (this._deferred) {
      this._deferred.resolve({ value, done: false });
      this._deferred = undefined;
    } else {
      this._queue.push(value);
    }
  }

  finish(value?: T) {
    this._done = true;
    if (this._deferred) {
      this._deferred.resolve({ value, done: true });
      this._deferred = undefined;
    }
  }

  finishWithError(error: any) {
    this._done = true;
    if (this._deferred) {
      this._deferred.reject(error);
      this._deferred = undefined;
    }
  }

  // === rx === //

  next(...[_value]: [] | [any]): Promise<IteratorResult<T, any>> {
    if (this._queue.length > 0) {
      return Promise.resolve({ value: this._queue.shift()!, done: false });
    }
    if (this._done) {
      return Promise.resolve({ value: undefined, done: true });
    }
    this._deferred = new Deferred<IteratorResult<T, any>>();
    return this._deferred;
  }

  return(value?: any): Promise<IteratorResult<T, any>> {
    this.finish(value);
    return Promise.resolve({ value, done: true });
  }

  throw(e?: any): Promise<IteratorResult<T, any>> {
    this.finishWithError(e);
    return Promise.reject(e);
  }
}
