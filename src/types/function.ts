// TODO: colocar any como permitido em arquivos do /types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction<R = any> = (...args: any[]) => R;
