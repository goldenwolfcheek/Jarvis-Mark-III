// Type surface for the Electron preload bridge (electron/preload.mjs).
export interface ElectronAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  onMaximizedChanged: (cb: (isMaximized: boolean) => void) => void
  selectFolder: () => Promise<string | null>
  readDirectory: (dirPath: string) => Promise<{ name: string; isDirectory: boolean }[] | { error: string }>
  readFile: (filePath: string) => Promise<{ content?: string; error?: string }>
  writeFile: (filePath: string, content: string) => Promise<{ success?: boolean; error?: string }>
  fetchText: (url: string) => Promise<{ ok: boolean; text?: string; error?: string }>
  openExternal: (url: string) => void
  getSystemStats: () => Promise<{ cpu: number; mem: number }>
  getAppInfo: () => Promise<{ version: string; electron: string }>
  getTrayEnabled: () => Promise<boolean>
  setTrayEnabled: (enabled: boolean) => Promise<boolean>
  getBootEnabled: () => Promise<boolean>
  setBootEnabled: (enabled: boolean) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
