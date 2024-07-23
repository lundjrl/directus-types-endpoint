export const toPascalCase = (str: string) => {
    if (!str) return '';

    return str
        .split(' ')
        .flatMap((x) => x.split('_'))
        .flatMap((y) => y.split('-'))
        .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
        .join('');
};
