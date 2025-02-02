export function getCurrentYear(): number {
    return new Date().getFullYear();
}

export const debounce = <F extends (...args: any[]) => any>(fn: F, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: Parameters<F>) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
};

export function formatPrice(price: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
  return formatter.format(price);
}
