export default {
    entry: {
        index: "src/index.ts",
        core: "src/entries/core.ts",
        react: "src/entries/react.ts",
        dom: "src/entries/dom.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
};