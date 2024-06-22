const { exec, spawn } = require('child_process');
const sudo = require('sudo-prompt');
const electron = require('electron');
const { BrowserWindow, app } = require('electron');
const { dialog, Tray } = require('electron');
const path = require('path');
const url = require('url');
const nativeImage = require('electron').nativeImage;
const ipcMain = electron.ipcMain;
const { autoUpdater } = require('electron-updater');
const os = require('os');
// const exec = require('child_process').exec;

const fs = require('fs');

// const {	GoogleAuthProvider,OAuthProvider,getAuth,signInWithPopup,} = require('firebase/auth');
// const firebaseConfig = require('./js/firebase-config');

let mainWindow;
let myWindow = null;

const dispatch = (data) => {
	win.webContents.send('message', data);
};

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

// electron.dialog.showErrorBox("Root required", "Please run this program as root/Administrator");

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
		// tray.setHighlightMode('never')
		tray.setToolTip('CopVPN');
	});
	mainWindow.on('hide', () => {
		// tray.setHighlightMode('always')
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

	// mainWindow.once('ready-to-show', () => {
	//   mainWindow.show();
	// });

	splash.once('ready-to-show', () => {
		splash.show();
	});

	setTimeout(function () {
		splash.close();
		mainWindow.center();
		mainWindow.show();
		// cliStart();
	}, 5000);

	// mainWindow.webContents.openDevTools();

	// mainWindow.webContents.on('did-finish-load', () => {
	//   const networkInterfaces = os.networkInterfaces();
	//   const macAddresses = {};
	//   const osVersion = os.release();
	//   Object.keys(networkInterfaces).forEach((interfaceName) => {
	//     const addresses = networkInterfaces[interfaceName].filter(iface => !iface.internal);
	//     if (addresses.length > 0) {
	//       macAddresses[interfaceName] = addresses[0].mac;
	//     }
	//   });
	//   exec("ioreg -l | grep IOPlatformSerialNumber | awk '{print $4}' | tr -d '\"'", (error, stdout) => {
	//     console.log('SerialNo. ',stdout.trim());
	//   });
	//   console.log('macAddress: ', macAddresses.en0);
	//   console.log('osVersion: ', osVersion);
	//   // win.webContents.send('mac-address', macAddresses);
	// });
}

if (!gotTheLock) {
	app.quit();
} else {
	app.on('second-instance', (event, commandLine, workingDirectory) => {
		// Someone tried to run a second instance, we should focus our window.
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
		let string = decodeURI(commandLine.pop());
		let token = string.split('://');
		// the commandLine is array of strings in which last element is deep link url
		// dialog.showErrorBox('Welcome Back', `You arrived from: ${commandLine.pop()}`)
		// dialog.showErrorBox('welcome to CopVPN', `Please wait for data verification...`)
		mainWindow.webContents.send('sso_login', token[1].replace(/\//g, ''));
	});

	// Create mainWindow, load the rest of the app, etc...
	// app.whenReady().then(() => {
	//   createMainWindow()
	// })
}

ipcMain.on('show_message', (event, args) => {
	// console.log(result);
	dialog.showErrorBox(args.type, args.message);
});

// ipcMain.on('app_password_ask', (event, args) => {
//   // console.log(args);
//   event.preventDefault();
//   const options = {
//     message: "Are you sure you want to Close?",
//     type: "warning",
//     buttons: ["Exit"],
//     defaultId: 0,
//     title: "Confirm Close",
//     detail: "This will shutdown the application !!!"
//   };

//   dialog.showMessageBox(null, options
//   ).then((res) => {
//       console.log(res.response);
//       if(res.response === 0){
//         app.quit()
//       }
//   });
// })

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

app.on('open-url', (event, url) => {
	let string = decodeURI(url);
	let token = string.split('://');
	// dialog.showErrorBox('welcome to CopVPN', `Please wait for data verification...`)
	mainWindow.webContents.send('sso_login', token[1].replace(/\//g, ''));
});

app.on('ready', function () {
	createMainWindow();
	// autoUpdater.checkForUpdatesAndNotify()

	mainWindow.webContents.on('did-finish-load', () => {
		mainWindow.webContents.send('version', app.getVersion());
	});
});

/*New Update Available*/

// autoUpdater.on('checking-for-update', () => {
//   dispatch('Checking for update...')
// })

// autoUpdater.on('update-available', (info) => {
//   dispatch('Update available.')
// })

// autoUpdater.on('update-not-available', (info) => {
//   dispatch('Update not available.')
// })

// autoUpdater.on('error', (err) => {
//   dispatch('Error in auto-updater. ' + err)
// })

// autoUpdater.on('download-progress', (progressObj) => {
//   // let log_message = "Download speed: " + progressObj.bytesPerSecond
//   // log_message = log_message + ' - Downloaded ' + progressObj.percent + '%'
//   // log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')'
//   // dispatch(log_message)

//   mainWindow.webContents.send('download-progress', progressObj.percent)

// })

// autoUpdater.on('update-downloaded', (info) => {
//   dispatch('Update downloaded')
// })

// app.setAsDefaultProtocolClient("myfirstblog");

app
	.whenReady()
	.then(() => {
		// myWindow = createWindow();
		myWindow = splash();
	})
	.catch((_err) => {
		return false;
	});
