export const getTabSpaceCount = (numberOfSpaces = 2, useTabs = false) => {
    let spaces = '';
    for (let i = 0; i < numberOfSpaces; i++) {
        spaces += useTabs ? `\t` : ' ';
    }
    return spaces;
};
