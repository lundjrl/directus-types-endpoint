export const maybeAddTrailingSemicolon = (
    str: string,
    addTrailingSemicolon = false,
) => {
    if (!addTrailingSemicolon) return str;
    return `${str};`;
};
