export function getCurrentYear(): number {
    return new Date().getFullYear();
}

export function debounce<T extends (...args: any[]) => any>( // eslint-disable-line @typescript-eslint/no-explicit-any
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: Parameters<T>) { // eslint-disable-line @typescript-eslint/no-explicit-any
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
}

export function formatPrice(price: number, currency = 'USD'): string {
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
    return formatter.format(price);
}
