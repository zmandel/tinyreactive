export type Store<T> = {
  get(): T;
  set(newState: T): void;
  patch(partial: Partial<T>): void;
  subscribe(
    callback: (value: any, isInit: boolean) => void,
    selector?: (state: T) => any
  ): () => void;
};

export declare function createStore<T>(initialState: T): Store<T>;

declare const _default: {
  createStore: typeof createStore;
};

export default _default;
