/** Preview-mode stand-in for "firebase/app". */
const apps: { name: string; options: Record<string, unknown> }[] = [];

export function initializeApp(options: Record<string, unknown> = {}) {
  const app = { name: "[DEFAULT]", options };
  apps.push(app);
  return app;
}

export const getApps = () => apps;
export const getApp = () => apps[0];
