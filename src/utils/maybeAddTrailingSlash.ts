export const maybeAddTrailingSlash = (
    str: string,
    addTrailingSlash = false,
) => {
    if (!addTrailingSlash) return str;
    return `${str};`;
};
