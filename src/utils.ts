export function chunk<T>(array: T[], size: number) {
    return array.reduce(
        (acc, _, i) => (i % size ? acc : [...acc, array.slice(i, i + size)]),
        []
    );
}
