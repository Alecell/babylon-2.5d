import { AnyFunction } from "../../types/function";

export class Events<E extends Record<string, AnyFunction<void>>> {
    private events: { [K in keyof E]?: E[K][] } = {};

    addListener<K extends keyof E>(event: K, cb: E[K]): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event]!.push(cb);
    }

    emit<K extends keyof E>(event: K, ...args: Parameters<E[K]>): void {
        const callbacks = this.events[event];
        if (callbacks) {
            for (let i = 0; i < callbacks.length; i++) callbacks[i](...args);
        } else {
            throw new Error(`[Event.emit] Event "${String(event)}" don't have any listeners`);
        }
    }
}
