import { winter } from "../plugin/winter";

export default {
  plugins: [
    winter({
      entry: "./server.js",
    }),
  ],
};
