import { Config } from "@remotion/cli/config";
import { webpackOverride } from "./src/remotion/webpack-override";

Config.setVideoImageFormat("jpeg");
Config.setEntryPoint("./src/remotion/index.ts");
Config.setChromiumOpenGlRenderer("angle");
Config.overrideWebpackConfig(webpackOverride);
