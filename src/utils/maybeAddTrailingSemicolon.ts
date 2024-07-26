export const maybeAddTrailingSemicolon = (
    str: string,
    addTrailingSlash = false,
) => {
    if (!addTrailingSlash) return str;
    return `${str};`;
};
