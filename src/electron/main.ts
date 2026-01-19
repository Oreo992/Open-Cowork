import { app, BrowserWindow, ipcMain, dialog, shell } from "electron"
import { ipcMainHandle, isDev, DEV_PORT } from "./util.js";
import { getPreloadPath, getUIPath, getIconPath } from "./pathResolver.js";
import { getStaticData, pollResources } from "./test.js";
import { handleClientEvent, sessions } from "./ipc-handlers.js";
import { generateSessionTitle } from "./libs/util.js";
import { checkEnvironment, getInstallInstructions } from "./libs/env-check.js";
import type { ClientEvent } from "./types.js";
import "./libs/claude-settings.js";

app.on("ready", () => {
    const isMac = process.platform === "darwin";

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            preload: getPreloadPath(),
        },
        icon: getIconPath(),
        titleBarStyle: isMac ? "hiddenInset" : "default",
        frame: !isMac, // Windows 使用默认窗口框架
        backgroundColor: "#FAF9F6",
        ...(isMac ? { trafficLightPosition: { x: 15, y: 18 } } : {})
    });

    if (isDev()) mainWindow.loadURL(`http://localhost:${DEV_PORT}`)
    else mainWindow.loadFile(getUIPath());

    // 在生产环境也可以用 Ctrl+Shift+I 打开开发者工具（用于调试）
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.control && input.shift && input.key.toLowerCase() === 'i') {
            mainWindow.webContents.toggleDevTools();
            event.preventDefault();
        }
    });

    pollResources(mainWindow);

    ipcMainHandle("getStaticData", () => {
        return getStaticData();
    });

    // Handle client events
    ipcMain.on("client-event", (_, event: ClientEvent) => {
        handleClientEvent(event);
    });

    // Handle session title generation
    ipcMainHandle("generate-session-title", async (_: any, userInput: string | null) => {
        return await generateSessionTitle(userInput);
    });

    // Handle recent cwds request
    ipcMainHandle("get-recent-cwds", (_: any, limit?: number) => {
        const boundedLimit = limit ? Math.min(Math.max(limit, 1), 20) : 8;
        return sessions.listRecentCwds(boundedLimit);
    });

    // Handle directory selection
    ipcMainHandle("select-directory", async () => {
        console.log('[select-directory] Handler called');

        // Get the focused window or the first available window
        let win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

        if (!win || win.isDestroyed()) {
            console.error('[select-directory] No window available');
            return null;
        }

        // Ensure window is visible and focused before showing dialog
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();

        // Wait a bit for window to be fully ready (helps with portable exe)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Re-get window reference after delay
        win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        if (!win || win.isDestroyed()) {
            console.error('[select-directory] Window lost after delay');
            return null;
        }

        try {
            console.log('[select-directory] Showing dialog...');
            const result = await dialog.showOpenDialog(win, {
                properties: ['openDirectory'],
                title: '选择工作目录'
            });
            console.log('[select-directory] Dialog result:', result);

            if (result.canceled || result.filePaths.length === 0) {
                return null;
            }

            return result.filePaths[0];
        } catch (error) {
            console.error('[select-directory] Failed to show directory dialog:', error);
            return null;
        }
    });

    // Handle environment check
    ipcMainHandle("check-environment", () => {
        return checkEnvironment();
    });

    // Handle get install instructions
    ipcMainHandle("get-install-instructions", () => {
        return getInstallInstructions();
    });

    // Handle opening external URL
    ipcMainHandle("open-external", async (_: any, url: string) => {
        await shell.openExternal(url);
    });
})
