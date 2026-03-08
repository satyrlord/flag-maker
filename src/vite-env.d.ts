/// <reference types="vite/client" />

import type { LeftbarConfig } from "./ui/leftbarConfig";

declare module "@/ui/leftbar-config.json" {
  const value: LeftbarConfig;
  export default value;
}
