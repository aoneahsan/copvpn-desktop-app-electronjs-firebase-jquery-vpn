const electron = require('electron');
const { BrowserWindow, app } = require('electron');
const { dialog, Tray } = require('electron');
const path = require('path');
const url = require('url');
const nativeImage = require('electron').nativeImage;
const ipcMain = electron.ipcMain;

let mainWindow;

if (process.defaultApp) {
	if (process.argv.length >= 2) {
		app.setAsDefaultProtocolClient('electron-fiddle', process.execPath, [
			path.resolve(process.argv[1]),
		]);
	}
} else {
	app.setAsDefaultProtocolClient('electron-fiddle');
}
const gotTheLock = app.requestSingleInstanceLock();

function createMainWindow() {
	var iconPath = path.join(__dirname, 'favicon.png');
	console.log(iconPath);
	mainWindow = new BrowserWindow({
		title: 'CopVPN',
		icon: iconPath,
		width: 900,
		height: 700,
		frame: false,
		resizable: true,
		maximizable: false,
		fullscreen: false,
		autoHideMenuBar: true,
		transparent: false,
		show: false,
		webPreferences: {
			enableRemoteModule: true,
			nodeIntegration: true,
			contextIsolation: false,
			devTools: !app.isPackaged,
		},
	});

	var iconPngPath = path.join(process.resourcesPath, 'favicon.png');
	var image = nativeImage.createFromPath(iconPngPath);
	var tray = new Tray(image);

	tray.on('click', () => {
		mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
	});
	mainWindow.on('show', () => {
		tray.setToolTip('CopVPN');
	});
	mainWindow.on('hide', () => {
		tray.setToolTip('CopVPN');
	});

	ipcMain.on('minimize', () => {
		mainWindow.minimize();
	});

	ipcMain.on('tray_hide', () => {
		mainWindow.hide();
	});

	ipcMain.handle('open_dialog', async () => {
		let reply = false;

		await dialog
			.showOpenDialog(mainWindow, {
				title: 'Add VPN Profiles',
				properties: ['openFile', 'multiSelections'],
				filters: [
					{
						name: 'CopVPN',
						extensions: ['ovpn'],
					},
				],
			})
			.then((result) => {
				if (result.canceled) {
					reply = false;
					return result.canceled;
				}
				reply = result.filePaths;
			})
			.catch((err) => {
				console.log(err);
			});

		return reply;
	});

	ipcMain.on('close', () => {
		mainWindow.close();
	});

	mainWindow.loadURL(
		url.format({
			pathname: path.join(__dirname, 'html', 'index.html'),
			protocol: 'file:',
			slashes: true,
		})
	);

	var splash = new BrowserWindow({
		width: 500,
		height: 300,
		transparent: true,
		frame: false,
		alwaysOnTop: true,
	});

	splash.loadFile(path.join(__dirname, 'html', 'splash.html'));
	splash.setAlwaysOnTop(true, 'screen');
	splash.center();

	splash.once('ready-to-show', () => {
		splash.show();
	});

	setTimeout(function () {
		splash.close();
		mainWindow.center();
		mainWindow.show();
	}, 5000);
}

if (!gotTheLock) {
	app.quit();
} else {
	app.on('second-instance', (e, commandLine, workingDirectory) => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
		let string = decodeURI(commandLine.pop());
		let token = string.split('://');
		mainWindow.webContents.send('sso_login', token[1].replace(/\//g, ''));
	});
}

ipcMain.on('show_message', (e, args) => {
	dialog.showErrorBox(args.type, args.message);
});

const getTheLock = app.requestSingleInstanceLock();
if (!getTheLock) {
	app.quit();
} else {
	app.on('second-instance', (event, commandLine, workingDirectory) => {
		console.log(event);
		if (mainWindow) {
			if (mainWindow.isMinimized()) {
				mainWindow.restore();
				mainWindow.focus();
			}
		}
	});
}

app.on('open-url', (e, url) => {
	let string = decodeURI(url);
	let token = string.split('://');
	mainWindow.webContents.send('sso_login', token[1].replace(/\//g, ''));
});

app.on('ready', function () {
	createMainWindow();
	mainWindow.webContents.on('did-finish-load', () => {
		mainWindow.webContents.send('version', app.getVersion());
	});
});

app
	.whenReady()
	.then(() => {
		myWindow = splash();
	})
	.catch((_err) => {
		return false;
	});
