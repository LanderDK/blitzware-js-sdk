import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import nodePolyfills from "rollup-plugin-polyfill-node";

export default {
  input: "src/index.ts",
  output: {
    file: "dist/blitzware-js-sdk.js",
    format: "umd",
    name: "BlitzWareAuth",
    sourcemap: true,
  },
  plugins: [
    resolve({
      browser: true,
    }),
    commonjs(),
    nodePolyfills(),
    typescript(),
  ],
};
