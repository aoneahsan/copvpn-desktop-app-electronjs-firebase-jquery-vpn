/*
 * Author contact info: smfkarim.24@gmail.com
 */
'use strict';

const os = require('os');
const { ipcRenderer, net } = require('electron');
const path = require('path');
const netSocket = require('net');
const { exec, spawn } = require('child_process');
const sudo = require('sudo-prompt');
const https = require('https');
const isOnline = require('is-online');
const fs = require('fs');
const publicIp = require('public-ip');
const ps = require('ps-node');

const uiCloseBtn = document.getElementById('close-btn');
const uiMinimizeBtn = document.getElementById('minimize-btn');
const uitrayBtn = document.getElementById('tray-btn');
const uiStatus = document.getElementById('status');
const uiUptime = document.getElementById('uptime');
const uiVersion = document.getElementById('version');
const uiSent = document.getElementById('sent');
const uiIP = document.getElementById('serverip');
const uiReceived = document.getElementById('received');
const uiOptKillSwitch = document.getElementById('opt-kill-switch');
const uiAlwaysOn = document.getElementById('always-on');
const uiRunOnStartup = document.getElementById('run-on-startup');
const uiVpnDebug = document.getElementById('vpn-debug');

var connectedBeginTime = Date.now();
var connectTimeoutMillisec = 5000;
var aSelectedServer = null;
var resourcesDir = process.resourcesPath + path.sep; // "." + path.sep + "resources" + path.sep + "app" + path.sep;
var appDir = os.homedir() + path.sep + 'CopApp' + path.sep;
var ovpnDir = appDir + 'ovpn';
var miscDir = appDir + 'ms';
var openVPNExecCmd = 'openvpn';
var openvpn = null;
var openvpnPID = 0;
var connectingTimeout = null;
var tmpCredentials = null;
var openVpnMacOs = 'openvpn-darwin-arm64';

var fpOpenVPNStats = null;
var fpOpenVpnLog = null;
var offline = true;
var socketConnections = {};
var socket = null;
var socketFile = '/tmp/vpnapp.sock';
var helperOnline = false;
var cliName = 'helper-cli';
var tempOvpn = 'tempFile.ovpn';
var incompatibleCertExit = false;

appDir = path.resolve(appDir) + path.sep;
ovpnDir = path.resolve(ovpnDir) + path.sep;
miscDir = path.resolve(miscDir) + path.sep;
var cliLogFilePath = miscDir + 'CopVPNApp-helper.log';
var cliPath = miscDir + cliName;

var tempOvpnPath = ovpnDir + tempOvpn;
const cfgFilePath = path.normalize(miscDir + 'VPNApp.cfg');

console.log(appDir);
console.log(ovpnDir);
console.log(miscDir);

mkDirByPathSync(appDir);
mkDirByPathSync(ovpnDir);
mkDirByPathSync(miscDir);

/*
 ※ Config Server Option
――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― */
const __hostDomain = 'shareing.copaccount.com',
	__protocol = 'https:',
	__port = 443,
	__directory = 'remotevpn'; // ―― » Without trailing slash

// ―― » Full URI ends with trailing slash
// ―― » __httpServer output: https://domain.com/
const __httpServer = __protocol + '//' + __hostDomain + '/';
// ―― » __vpnServer output: https://domain.com:port/directory/
const __vpnServer = `${__protocol}//${__hostDomain}:${__port}/${__directory}/`;
// > ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― ^

var settings = {
	killSwitch: false,
	alwasysOn: false,
	runOnStartup: false,
	vpnDebug: false,
};

function hide(element) {
	element.style.display = 'none';
}

function show(element) {
	element.style.display = '';
}

function click(elem) {
	console.log('programmatic click');
	console.log('programmatic click=>>> ', elem);
	var clickEvent = new MouseEvent('click', {
		view: window,
		bubbles: true,
		cancelable: false,
	});
	elem.dispatchEvent(clickEvent);
	elem.focus();
}

function loadCfg() {
	var jsonData = null;
	try {
		jsonData = fs.readFileSync(cfgFilePath);
	} catch (err) {
		console.log(err);
		fs.writeFileSync(cfgFilePath, JSON.stringify(settings));
	}
	if (jsonData) {
		settings = JSON.parse(jsonData);
		uiOptKillSwitch.checked = settings.killSwitch;
		uiAlwaysOn.checked = settings.alwasysOn;
		uiRunOnStartup.checked = settings.runOnStartup;
		uiVpnDebug.checked = settings.vpnDebug;
	}
}
loadCfg();

function liveCheck() {
	isOnline().then((online) => {
		if (online) {
			if (offline) {
				// uiStatusLight.className = 'status-light-on';
				// uiConnectButton.className = 'btn-green';
				// uiConnectButton.disabled = false;
				offline = false;
			}
		} else {
			// uiStatusLight.className = 'status-light-off';
			// uiConnectButton.className = 'btn-gray';
			// uiConnectButton.disabled = true;
			offline = true;
		}
	});
}

liveCheck();
setInterval(function () {
	liveCheck();
}, 5000);

deleteAllFilesInDirectory(miscDir);

fs.closeSync(fs.openSync(miscDir + 'OpenVPN.log', 'w'));
fs.closeSync(fs.openSync(miscDir + 'OpenVPN.status', 'w'));
var logFile = fs.openSync(miscDir + 'CopVPNApp.log', 'w');
fs.writeFileSync(cfgFilePath, JSON.stringify(settings));

function log(message, alsoWiteToConsole = false) {
	if (alsoWiteToConsole) {
		console.log(message);
	}
	fs.writeSync(logFile, message + '\n\r');
}

function deleteAllFilesInDirectory(dirPath) {
	console.log('Call: deleteAllFilesInDirectory(' + dirPath + ')');
	var files = fs.readdirSync(dirPath);
	for (var i = 0; i < files.length; i++) {
		fs.unlinkSync(dirPath + files[i]);
	}
}

function zeroPad(num, size) {
	var s = num + '';
	while (s.length < size) s = '0' + s;
	return s;
}

function timeDifference(end, start) {
	var difference = end - start;
	var daysDifference = Math.floor(difference / 1000 / 60 / 60 / 24);
	difference -= daysDifference * 1000 * 60 * 60 * 24;
	var hoursDifference = Math.floor(difference / 1000 / 60 / 60);
	difference -= hoursDifference * 1000 * 60 * 60;
	var minutesDifference = Math.floor(difference / 1000 / 60);
	difference -= minutesDifference * 1000 * 60;
	var secondsDifference = Math.floor(difference / 1000);
	return (
		/*daysDifference + 'd ' +*/ zeroPad(hoursDifference, 2) +
		':' +
		zeroPad(minutesDifference, 2) +
		':' +
		zeroPad(secondsDifference, 2)
	);
}

function getPidByName(name) {
	var foundPid = 0;
	ps.lookup(
		{
			command: name,
			/*arguments: args,*/
		},
		function (err, resultList) {
			if (err) {
				throw new Error(err);
			}
			/*resultList.forEach(function(process) {
			if(process) {
				console.log( 'PID: %s, COMMAND: %s, ARGUMENTS: %s', process.pid, process.command, process.arguments );
			}
		});*/
			if (resultList) {
				if (resultList[0]) foundPid = resultList[0].pid;
			}
		}
	);
	return foundPid;
}

function doesProcessExist(pid) {
	var exist = false;
	try {
		process.kill(pid, 0);
		exist = true;
	} catch (e) {
		exist = false;
	}
	return exist;
}

function createServer(socketFile) {
	console.log('[SERVER] Creating server.');
	var server = netSocket
		.createServer(function (stream) {
			console.log('Connection acknowledged.');
			// uiConnectBtn.disabled = false;
			uiStatus.innerText = 'Disconnected';

			// Store all connections so we can terminate them if the server closes.
			// An object is better than an array for these.
			var self = Date.now();
			socketConnections[self] = stream;
			socket = stream;
			stream.on('end', function () {
				console.log('[SERVER] Client disconnected.');
				delete socketConnections[self];
			});

			// Messages are buffers. use toString
			stream.on('data', function (msg) {
				msg = msg.toString();

				console.log('[SERVER] Client:', msg);

				let data;
				try {
					data = JSON.parse(msg);
				} catch (err) {
					console.log('createServer => ', err);
				}

				if (data?.type === 'error') {
					console.log('[SERVER] Got error: ' + data.id);
					if (data.id.startsWith('connect')) {
						resetConnection(data.withoutPass === 'True' ? true : undefined);
						// show(uiErrorDependency);
						let error = '';
						if (data.id.includes('libpkcs11')) {
							console.log('error ==> ', data.data);
							error =
								'You do not have a required dependency. Please install it by running this command:\n"brew install libpkcs11-helper"';
						} else {
							error =
								'Woops, something went wrong. Please report this to the support:\n' +
								data.data;
						}
						DependencyPopUp(true, error);
					} else if (data.id.startsWith('killswitch')) {
						if (process.platform === 'linux' && data?.networking === 'true') {
							var cmd;
							if (data.renew === 'true') {
								cmd = 'nmcli nm enable true';
							} else {
								cmd = 'nmcli nm enable false';
							}
							socket.write(
								'{"id": "killswitch", "cmd": "' +
									cmd +
									'"}, "renew": "false", "networking": "false"}'
							);
						}
					}
				} else if (data?.type === 'success') {
					if (data.id === 'openvpn-started') {
						console.log('[SERVER] OpenVPN started successfully.');
						// stream.write('disconnect');
					} else if (data.id === 'openvpn-disconnect') {
						console.log('[SERVER] OpenVPN killed.');
					} else if (data.id === '__initok') {
						console.log('[SERVER] Client initialised successfully.');
						helperOnline = true;
						// stream.write('start-connection');
						// stream.write("disconnect")
					} else if (data.id === 'killswitch') {
						internetEnabled = data.renew;
					}
				}
			});
		})
		.listen(socketFile)
		.on('connection', function (socket) {
			console.log('[SERVER] Client connected.');
			console.log('[SERVER] Sending init.');
			socket.write('{"id": "__init"}');
			//console.log(Object.keys(socket));
		});
	return server;
}

function onDisconnectedCallback(onDisconnected, withoutPass) {
	console.log(
		'Call: onDisconnectedCallback(' + onDisconnected + ',' + withoutPass + ')'
	);
	// uiLocation.textContent = "-";
	uiUptime.textContent = '-';
	uiSent.textContent = '-';
	uiReceived.textContent = '-';
	uiIP.textContent = '-';
	console.log('openvpn => ', openvpn);
	if (openvpn == null) {
		aConnectedServer = aConnectingServer = null;
		if (uiStatus.innerText == 'Disconnecting...') {
			console.log('Status: disconnecting... -> disconnected');
			uiStatus.innerText = 'Disconnected';
			// if (aConnectedServer) {
			// 	aConnectedServer.style = "";
			// }
			// if (aFastestServer) {
			// 	aFastestServer.style = "";
			// }
			// enableServerTabs();
			// liServerTabs.forEach((it) => {
			// 	var button = it.getElementsByTagName("button")[0];
			// 	if (button) show(button);
			// });
			// click(aSelectedServer);
		} else if (uiStatus.innerText == 'Reconnecting...') {
			console.log('Status: reconnecting...');
			connectOpenVPN(withoutPass);
		} else {
			console.log('Status: continue ' + uiStatus.innerText);
			// enableServerTabs();
			click(aSelectedServer);
			//if (tmpCredentials)
			//  show(uiLogoutButton);
		}
	}
	// matchButtonStatus();
	if (onDisconnected) onDisconnected();
}

function useSocket() {
	// check for failed cleanup
	console.log('Checking for leftover socket.');
	fs.stat(socketFile, function (err, stats) {
		if (err) {
			// start server
			console.log('No leftover socket found.');
			socket = createServer(socketFile);
			return;
		}
		// remove file then start server
		console.log('Removing leftover socket.');
		fs.unlink(socketFile, function (err) {
			if (err) {
				// This should never happen.
				console.error(err);
				process.exit(0);
			}
			socket = createServer(socketFile);
			return;
		});
	});
}

function startCLI() {
	console.log('Call: startCLI()');
	// let cliPath = resourcesDir + cliName;
	var options = {
		name: 'CopVPN',
		// icns: path.join(process.resourcesPath, 'favicon.png'), // (optional)
	};
	sudo.exec(
		'chmod +x ' + cliPath + ' && ' + cliPath + ' &> ' + cliLogFilePath,
		options,
		(error, stdout, stderr) => {
			if (error) {
				log('err:' + error.toString(), true);
				// ipcRenderer.send('app_password_ask');
			}
			if (stdout) {
				log('stdout: ' + stdout.toString(), false);
			}
			if (stderr) {
				var msg = stderr.toString();
				log('stderr: ' + msg, true);
			}
		}
	);
	let ex = fs.existsSync(cliPath);
	console.log(ex);
	showHidePopUp(false);
}

function fetchCLI(platform) {
	console.log('Call: fetchCLI (' + platform + ')');
	showHidePopUp(true, 'Downloading the helper add-on, please wait...');
	var child = spawn('uname', ['-m']);
	child.stdout.on('data', (data) => {
		log('System architecture - ' + data.toString().trim(), true);
		if (process.platform == 'darwin') {
			// Exec bash install script from "./resources/app/openvpn-install-2.4.6-I602"?
			/*var absPath = path.resolve(openVPNExecCmd);
			log(absPath, true);
			if (absPath.length == 0) {*/
			openVpnMacOs = 'openvpn-darwin-' + data.toString().trim();
			openVPNExecCmd = path.resolve(resourcesDir + openVpnMacOs);
			console.log('openvpn exec command: ' + openVPNExecCmd);
			//}
		}
		var arch = 'helper-cli-' + platform + '-' + data.toString().trim();

		var href = 'remotevpn/helper-cli/' + arch;
		console.log(__httpServer + href);
		var localFilePath = miscDir + 'helper-cli';
		var file = fs.createWriteStream(localFilePath);
		https.get(__httpServer + href, function (response) {
			console.log('writing file: ' + localFilePath);
			response.pipe(file);
			file
				.on('finish', function () {
					file.close(() => {
						startCLI();
					});
				})
				.on('error', (err) => {
					log(err, true);
					fs.unlink(localFilePath);
				});
		});
	});
}

function checkCLI(platform) {
	console.log('Call: checkCLI (' + platform + ') ' + cliPath);
	try {
		let ex = fs.existsSync(cliPath);
		console.log(ex);
		// fetchCLI(platform);
		if (ex) {
			console.log('CLI exists, initialising.', true);
			startCLI();
		} else {
			console.log('Need to install CLI');
			fetchCLI(platform);
		}
	} catch (err) {
		console.log(err);
	}
}

function cleanup() {
	console.log('\n', 'Terminating.', '\n');
	if (Object.keys(socketConnections).length) {
		let clients = Object.keys(socketConnections);
		while (clients.length) {
			let client = clients.pop();
			socketConnections[client].end();
		}
	}
}

var internetEnabled = true;
function killSwitch(renew = false) {
	if (settings.killSwitch == false) return;
	log(
		'Kill Switch: Shutting down all internet connection (resume cmd: (win32) ipconfig /renew, (linux) nmcli networking on, (mac) ifconfig en0 up)',
		true
	);
	var cmd = '';
	if (process.platform == 'win32') {
		if (renew == true) cmd = 'ipconfig /renew';
		else cmd = 'ipconfig /release';
		exec(cmd, function (error, stdout, stderr) {
			if (error) log('error: ' + error.toString(), true);
			if (stdout) log('stdout: ' + stdout.toString(), true);
			if (stderr) log('stderr: ', +stderr.toString(), true);
			if ((error && stderr) == false) {
				internetEnabled = renew;
			}
		});
	} else {
		// linux, darwin
		if (process.platform == 'linux') {
			// https://wiki.gnome.org/Projects/NetworkManager/nmcli
			if (renew == true) cmd = 'nmcli networking on'; // 0.9.10
			else cmd = 'nmcli networking off';
		}
		if (process.platform == 'darwin') {
			if (renew == true) cmd = 'ifconfig en0 up';
			else cmd = 'ifconfig en0 down';
		}
		if (helperOnline) {
			socket.write(
				'{"id": "killswitch", "cmd": "' +
					cmd +
					'", "renew": "' +
					(renew ? 'true' : 'false') +
					'", "networking": "true"}'
			);
			return;
		}
		sudo.exec(cmd, { name: 'CopVPN' }, function (error, stdout, stderr) {
			if (error) log('error:' + error.toString(), true);
			if (stdout) log('stdout: ' + stdout.toString(), false);
			if (stderr) log('stderr: ' + stderr.toString(), true);
			if (error || stderr) {
				if (process.platform == 'linux') {
					if (renew == true) cmd = 'nmcli nm enable true'; // 0.9.8
					else cmd = 'nmcli nm enable false';
					sudo.exec(cmd, { name: 'CopVPN' }, function (error, stdout, stderr) {
						if (error) log('error:' + error.toString(), true);
						if (stdout) log('stdout: ' + stdout.toString(), false);
						if (stderr) log('stderr: ' + stderr.toString(), true);
						if ((error && stderr) == false) {
							internetEnabled = renew;
						}
					});
				}
			} else internetEnabled = renew;
		});
	}
	//console.log("internetEnabled=" + internetEnabled);
}

var dnsTimeoutCount = 0;
var updateOpenVPNStatsTimeout = null;
function updateOpenVPNStats() {
	if (updateOpenVPNStatsTimeout) {
		if (openvpnPID != 0) {
			if (doesProcessExist(openvpnPID) == false) killSwitch();
		}
		var fileContents = fs.readFileSync(fpOpenVPNStats).toString();
		var read = 0;
		var written = 0;
		var tokens = fileContents.split('\n');
		for (var i = 0; i < tokens.length; ++i) {
			var token = tokens[i];
			if (token.includes('TUN/TAP read bytes')) {
				var subTokens = token.split(',');
				read = parseInt(subTokens[1]);
				if (isNaN(read)) {
					read = 0;
				}
			}
			if (token.includes('TUN/TAP write bytes')) {
				var subTokens = token.split(',');
				written = parseInt(subTokens[1]);
				if (isNaN(written)) {
					written = 0;
				}
			}
		}
		written = written / 1024;
		var writtenUnits = 'kb';
		if (written > 1024) {
			written = written / 1024;
			writtenUnits = 'mb';
		}
		read = read / 1024;
		var readUnits = 'kb';
		if (read > 1024) {
			read = read / 1024;
			readUnits = 'mb';
		}
		uiSent.textContent = read.toFixed(2) + readUnits;
		uiReceived.textContent = written.toFixed(2) + writtenUnits;
		uiUptime.textContent = timeDifference(Date.now(), connectedBeginTime);
		publicIp
			.v4()
			.then((ip) => {
				dnsTimeoutCount = 0;
				if (updateOpenVPNStatsTimeout) {
					uiIP.textContent = ip;
				}
			})
			.catch(function (e) {
				if (updateOpenVPNStatsTimeout && dnsTimeoutCount++ > 2) {
					log('DNS Error: ' + e.toString(), true);
					disconnectOpenVPN();
					killSwitch();
				}
			});
		/*publicIp.v6().then(ip => {
		  uiIP.textContent = ip;
		});*/
	}
	updateOpenVPNStatsTimeout = setTimeout(updateOpenVPNStats, 1000);
}

function resetConnection(withoutPass) {
	console.log('Call(local): resetConnection');
	clearTimeout(connectingTimeout);
	connectingTimeout = null;
	clearTimeout(updateOpenVPNStatsTimeout);
	dnsTimeoutCount = 0;
	updateOpenVPNStatsTimeout = null;
	uiStatus.innerText = 'Disconnecting...';
	openvpn = null;
	onDisconnectedCallback(null, withoutPass);
}

function onConnectedCallback(withoutPass) {
	console.log('Call: onConnectedCallback(' + withoutPass + ')');
	if (openvpn != null && (tmpCredentials != null || withoutPass)) {
		// uiLoginStatus.textContent = "";
		uiStatus.innerText = 'Connected';
		player.stop();
		// aConnectedServer = aConnectingServer;
		// aConnectingServer = null;
		// if (aSelectedServer == aConnectedServer) {
		// 	click(aConnectedServer);
		// }
		// else if (aConnectedServer) {
		// 	aConnectedServer.classList.add("server-tab-connected");
		// }
		// if (connectedOnce == false) {
		// 	connectedOnce = true;
		// 	connectTimeoutMillisec = 8000;
		// }
		// uiLocation.textContent = aConnectedServer.parentElement.getAttribute("server");
		connectedBeginTime = Date.now();
		if (updateOpenVPNStatsTimeout == null) {
			updateOpenVPNStats();
		}
		// hide(uiLogoutButton);
	}
	// enableServerTabs();
	// matchButtonStatus();
}

////// =================

function connectOpenVPN(withoutPass) {
	console.log('Call: connectOpenVPN(' + withoutPass + ')');
	// return;
	/*if (uiStatus.innerText == "disconnected") {
	  if (internetEnabled == false)
	  killSwitch(true); // renew
	}*/

	if (uiStatus.innerText == 'Connected') {
		console.log('Status: already connected');
		disconnectOpenVPN(
			function () {
				console.log('attempt reconnnect...');
				connectOpenVPN(withoutPass);
			},
			2000,
			withoutPass
		);
		// click(aSelectedServer);
		return;
	}

	if (uiStatus.innerText == 'Disconnecting...') {
		console.log('Status: disconnecting... -> reconnecting...');
		uiStatus.innerText = 'Reconnecting...';
	} else {
		console.log('Status: continue ' + uiStatus.innerText + ' -> connecting...');
		uiStatus.innerText = 'Connecting...';
	}

	if (uiStatus.innerText == 'Connecting...') {
		// disableServerTabs();
		// hide(uiLoginButton);
		// hide(uiLogoutButton);
		aConnectingServer = aSelectedServer;
		// var ovpnPath = aSelectedServer.parentElement.getAttribute("custom") ?
		// 	customDir + aConnectingServer.parentElement.getAttribute("ovpn") :
		// 	ovpnDir + aConnectingServer.parentElement.getAttribute("ovpn");

		var ovpnPath = ovpnDir + path.sep + 'tempFile.ovpn';
		fpOpenVPNStats = miscDir + 'OpenVPN.status';

		if (process.platform == 'win32') {
			var args = [];
			if (withoutPass) {
				args = [
					'--verb',
					'11',
					'--config',
					ovpnPath,
					'--status',
					fpOpenVPNStats,
					'1',
					'--auth-nocache',
					'--inactive',
					'3600',
					'--ping',
					'1',
					'--ping-exit',
					'5',
				];
			} else {
				args = [
					'--verb',
					'11',
					'--config',
					ovpnPath,
					'--auth-user-pass',
					tmpCredentials.name,
					'--status',
					fpOpenVPNStats,
					'1',
					'--auth-nocache',
					'--inactive',
					'3600',
					'--ping',
					'1',
					'--ping-exit',
					'5',
				];
			}
			var cmd = openVPNExecCmd + ' ' + args.join(' ');
			log('starting ' + cmd, true);
			openvpn = spawn(openVPNExecCmd, args);
			openvpn.on('error', (err) => {
				log('error: ' + err, true);
				disconnectOpenVPN(null, 2000, withoutPass);
			});
			openvpn.stdout.on('data', (data) => {
				var msg = data.toString();
				log('stdout: ' + msg, true);
				if (
					msg.includes('AUTH_FAILED') ||
					msg.includes('authfile') ||
					msg.includes('Enter Auth Username')
				) {
					clearTimeout(connectingTimeout);
					disconnectOpenVPN(null, 2000, withoutPass);
				}
			});
			openvpn.stderr.on('data', (data) => {
				var msg = data.toString();
				log('stderr: ' + msg, true);
				if (
					msg.includes('AUTH_FAILED') ||
					msg.includes('authfile') ||
					msg.includes('Enter Auth Username')
				) {
					clearTimeout(connectingTimeout);
					uiLoginStatus.textContent = withoutPass
						? 'Required valid credentials'
						: 'Invalid username or password';
					disconnectOpenVPN(null, 2000, withoutPass);
				}
				disconnectOpenVPN(null, 2000, withoutPass);
			});
			openvpn.on('close', (code) => {
				log(`child process exited with code ${code}`, true);
				if (uiStatus.innerText == 'Reconnecting...') {
					connectOpenVPN(withoutPass);
				} else {
					disconnectOpenVPN(null, 2000, withoutPass);
				}
			});
			openvpnPID = getPidByName('openvpn');
			connectingTimeout = setTimeout(function () {
				console.log('Timeout: connectOpenVPN ' + connectTimeoutMillisec + 'ms');
				console.log('withoutPass ' + withoutPass);
				onConnectedCallback(withoutPass);
			}, connectTimeoutMillisec);
		} else {
			// darwin, linux
			fpOpenVpnLog = miscDir + 'OpenVPN.log';
			var cmd =
				'"' +
				openVPNExecCmd +
				'" ' +
				'--daemon CopVPN ' +
				'--log "' +
				fpOpenVpnLog +
				'" ' +
				'--config "' +
				ovpnPath +
				'" ' +
				// (withoutPass ? "" : "--auth-user-pass \"" + tmpCredentials.name + "\" ") +
				'--auth-nocache ' +
				'--status "' +
				fpOpenVPNStats +
				'" 1 ' +
				'--inactive 3600 --ping 1 --ping-exit 5';
			log('starting: ' + cmd, true);
			console.log('socketConnections => ', socketConnections);
			if (helperOnline && Object.keys(socketConnections).length) {
				var connectionParams = {
					openVPNExecCmd: openVPNExecCmd,
					fpOpenVpnLog: fpOpenVpnLog,
					ovpnPath: ovpnPath,
					withoutPass: withoutPass ? 'True' : 'False',
					// tmpCredentialsName: tmpCredentials?.name,
					fpOpenVPNStats: fpOpenVPNStats,
				};
				socket.write(
					'{"id": "start-connection", "data": ' +
						JSON.stringify(connectionParams) +
						'}'
				);
			} else {
				sudo.exec(cmd, { name: 'CopVPN' }, function (error, stdout, stderr) {
					if (error) {
						log('err:' + error.toString(), true);
						console.log('Something went wrong, try again...');
						resetConnection(withoutPass);
						// connectOpenVPN();
					}
					if (stdout) log('stdout: ' + stdout.toString(), false);
					if (stderr) {
						var msg = stderr.toString();
						log('stderr: ' + msg, true);
						if (msg.includes('Request dismissed')) {
							resetConnection(withoutPass);
							return;
						}
					}
					if ((error && stderr) == false) openvpnPID = getPidByName('openvpn');
				});
			}
			incompatibleCertExit = false;
			fs.watchFile(fpOpenVpnLog, function (curr, prev) {
				log('watching ' + fpOpenVpnLog, true);
				if (curr.mtime > prev.mtime) {
					var msg = fs.readFileSync(fpOpenVpnLog).toString();
					log(msg, true);
					if (
						msg.includes('AUTH_FAILED') ||
						msg.includes('authfile') ||
						msg.includes('Enter Auth Username')
					) {
						uiLoginStatus.textContent = withoutPass
							? 'Required valid credentials'
							: 'Invalid username or password';
						resetConnection(withoutPass);
						uiUsernameInput.style.color = '#F16FF9';
						uiPasswordInput.style.color = '#F16FF9';
						logout(true);
					} else if (msg.includes('CA signature digest algorithm too weak')) {
						if (incompatibleCertExit) {
							return;
						}
						resetConnection(withoutPass);
						if (helperOnline) {
							socket.write('{"id": "disconnect"}');
						} else {
							sudo.exec(
								'pkill -SIGINT openvpn',
								{ name: 'CopVPN' },
								function (error, stdout, stderr) {
									if (error) log('err:' + error.toString(), true);
									if (stdout) log('stdout: ' + stdout.toString(), false);
									if (stderr) {
										var msg = stderr.toString();
										log('stderr: ' + msg, true);
										if (msg.includes('Request dismissed')) {
											return;
										}
									}
									if (!error) {
										disableServerTabs();
										// if (aFastestServer) {
										// 	aFastestServer.classList.remove("server-tab-connected");
										// }
										// if (aConnectedServer) {
										// 	aConnectedServer.classList.remove("server-tab-connected");
										// }
									}
								}
							);
						}
						incompatibleCertExit = true;
						// uiOvpnPath.innerHTML = ovpnPath;
						console.log(uiIncompatibleWarning);
						show(uiIncompatibleWarning);
					} else if (openvpn == null) {
						openvpn = {};
						connectingTimeout = setTimeout(function () {
							console.log(
								'Timeout: connectOpenVPN ' + connectTimeoutMillisec + 'ms'
							);
							onConnectedCallback(withoutPass);
						}, connectTimeoutMillisec);
						//log("connected", true);
						//onConnectedCallback(); // Success
					}
					msg = null;
				}
			});
		}
	}
	// matchButtonStatus();
}

function disconnectOpenVPN(
	onDisconnected,
	timeout = 2000,
	withoutPass = false
) {
	console.log(
		'Call: disconnectOpenVPN(' +
			onDisconnected +
			',' +
			timeout +
			',' +
			withoutPass +
			')'
	);
	if (process.platform == 'win32') {
		if (openvpn) {
			clearTimeout(updateOpenVPNStatsTimeout);
			dnsTimeoutCount = 0;
			updateOpenVPNStatsTimeout = null;
			fpOpenVPNStats = null;
			uiStatus.innerText = 'Disconnecting...';
			openvpn.kill('SIGINT');
			openvpn = null;
			// disableServerTabs();
			// if (aFastestServer) {
			// 	aFastestServer.classList.remove("server-tab-connected");
			// }
			// if (aConnectedServer) {
			// 	aConnectedServer.classList.remove("server-tab-connected");
			// }
			setTimeout(function () {
				console.log('Timeout: disconnectOpenVPN ' + timeout + 'ms');
				onDisconnectedCallback(onDisconnected, withoutPass);
			}, timeout);
		}
	} else {
		if (openvpn) {
			clearTimeout(updateOpenVPNStatsTimeout);
			dnsTimeoutCount = 0;
			updateOpenVPNStatsTimeout = null;
			fpOpenVPNStats = null;
			uiStatus.innerText = 'Disconnecting...';
			fs.unwatchFile(fpOpenVpnLog);
			if (helperOnline && Object.keys(socketConnections).length) {
				socket.write('{"id": "disconnect"}');
				openvpn = null;
				// disableServerTabs();
				// if (aFastestServer) {
				// 	aFastestServer.classList.remove("server-tab-connected");
				// }
				// if (aConnectedServer) {
				// 	aConnectedServer.classList.remove("server-tab-connected");
				// }
				onDisconnectedCallback(onDisconnected, withoutPass);
			} else {
				if (process.platform === 'darwin') {
					sudo.exec(
						'pgrep ' + openVpnMacOs + ' | xargs sudo kill -9',
						{ name: 'CopVPN' },
						function (error, stdout, stderr) {
							if (error) log('err:' + error.toString(), true);
							if (stdout) log('stdout: ' + stdout.toString(), false);
							if (stderr) {
								var msg = stderr.toString();
								log('stderr: ' + msg, true);
								if (msg.includes('Request dismissed')) {
									return;
								}
							}
							if (!error) {
								openvpn = null;
								// disableServerTabs();
								// if (aFastestServer) {
								// 	aFastestServer.classList.remove("server-tab-connected");
								// }
								// if (aConnectedServer) {
								// 	aConnectedServer.classList.remove("server-tab-connected");
								// }
								onDisconnectedCallback(onDisconnected, withoutPass);
							}
						}
					);
					return;
				}
				sudo.exec(
					'pkill -SIGINT openvpn',
					{ name: 'CopVPN' },
					function (error, stdout, stderr) {
						if (error) log('err:' + error.toString(), true);
						if (stdout) log('stdout: ' + stdout.toString(), false);
						if (stderr) {
							var msg = stderr.toString();
							log('stderr: ' + msg, true);
							if (msg.includes('Request dismissed')) {
								return;
							}
						}
						if (!error) {
							openvpn = null;
							// disableServerTabs();
							// if (aFastestServer) {
							// 	aFastestServer.classList.remove("server-tab-connected");
							// }
							// if (aConnectedServer) {
							// 	aConnectedServer.classList.remove("server-tab-connected");
							// }
							onDisconnectedCallback(onDisconnected, withoutPass);
						}
					}
				);
			}
		}
	}
	// matchButtonStatus();
}

function mkDirByPathSync(pathToCreate) {
	pathToCreate.split(path.sep).reduce((prevPath, folder) => {
		const currentPath = path.join(prevPath, folder, path.sep);
		if (!fs.existsSync(currentPath)) {
			fs.mkdirSync(currentPath);
		}
		return currentPath;
	}, '');
}

const getOvpnFile = async (fileData) => {
	// console.log("writing ovpn file: " + fileData);
	var jsonString = fileData.replace(/[\r\n]+/gm, '\n');
	if (fileData != null && fileData.length > 0) {
		await fs.writeFileSync(tempOvpnPath, jsonString, {
			encoding: 'utf8',
		});
	}
};

function updateLocalDirectory(netConst) {
	console.log('Call: updateLocalDirectory()');

	// function getRemoteFile(href, filename, onComplete) {
	// 	https.get(__httpServer + href, function (response) {

	// 		if (filename.includes("...") || filename.includes("..>")) {
	// 			var localFilePath = ovpnDir + decodeURIComponent(href);
	// 		} else var localFilePath = ovpnDir + filename;

	// 		var fd = fs.openSync(localFilePath, 'w');
	// 		response.on('data', function (d) {
	// 			fs.writeSync(fd, d);
	// 		});
	// 		response.on('end', function () {
	// 			fs.closeSync(fd);
	// 			onComplete();
	// 		});
	// 	})
	// }

	// function serverListNotFound() {
	// 	deleteAllFilesInDirectory(ovpnDir);
	// 	serverListUpdateFromLocalDirectory(function () {
	// 		if (!aSelectedServer && liServerTabs.length > 0)
	// 			click(liServerTabs[0]);
	// 		pingFastestServer(customDir, function () {
	// 			hide(uiServerListSpanAll);
	// 			uiServerListDiv.style.top = "118px";
	// 		});
	// 	});
	// }

	// https.get(__vpnServer, function (response) {
	// 	let htmlResponse = '';
	// 	response.on('data', function (d) {
	// 		let htmlData = d.toString();
	// 		htmlResponse += htmlData;

	// 		// ―― » Process response
	// 		if (d.includes("</html>")) {
	// 			// console.log("CONTENTS: " + htmlResponse);
	// 			const dom = new JSDOM(htmlResponse);
	// 			const links = dom.window.document.getElementsByTagName("a");
	// 			var remoteFilesURL = [];
	// 			var remoteFilesNames = [];
	// 			var filesRead = 0;
	// 			var filesTotal = 0;

	// 			for (var i = 0; i < links.length; ++i) {
	// 				var link = links[i];
	// 				if (link.href.includes(".ovpn.ovpn") || (link.href.includes("/" + __directory + "/") && link.href.includes(".ovpn"))) {
	// 					console.log(link.href + " " + link.textContent);
	// 					remoteFilesURL.push(link.href);
	// 					remoteFilesNames.push(link.textContent);
	// 					++filesTotal;
	// 				}
	// 			}

	// 			var localFileNames = fs.readdirSync(ovpnDir);

	// 			// delete local files to match remote server list
	// 			for (var i = 0; i < localFileNames.length; ++i) {
	// 				if (remoteFilesNames.includes(localFileNames[i]) == false) {
	// 					fs.unlinkSync(ovpnDir + path.sep + localFileNames[i]);
	// 				}
	// 			}

	// 			// read remote files
	// 			for (var i = 0; i < remoteFilesNames.length; ++i) {
	// 				if (localFileNames.includes(remoteFilesNames[i])) {
	// 					console.log("skip existing: " + localFileNames[i]);
	// 					--filesTotal;
	// 					continue;
	// 				}
	// 				console.log("getting remote file: " + remoteFilesURL[i]);
	// 				getRemoteFile(remoteFilesURL[i], remoteFilesNames[i], function () {
	// 					++filesRead;
	// 					if (filesRead == filesTotal) {
	// 						console.log("updating list from local directory");
	// 						serverListUpdateFromLocalDirectory(function () {
	// 							if (!aSelectedServer && liServerTabs.length > 0)
	// 								click(liServerTabs[0]);
	// 							pingFastestServer(ovpnDir);
	// 						});
	// 					}
	// 				});
	// 			}
	// 			// no files updated
	// 			if (filesTotal == 0) {
	// 				serverListUpdateFromLocalDirectory(function () {
	// 					if (!aSelectedServer && liServerTabs.length > 0)
	// 						click(liServerTabs[0]);
	// 					pingFastestServer(ovpnDir);
	// 				});
	// 			}
	// 		}
	// 	});

	// }).on('error', function (e) {
	// 	log(e, true);
	// 	// serverListNotFound();
	// });

	log('platform: ' + process.platform, true);

	if (process.platform == 'win32') {
		if (fs.existsSync('C:\\Program Files\\OpenVPN\\bin\\openvpn.exe')) {
			openVPNExecCmd = 'C:\\Program Files\\OpenVPN\\bin\\openvpn.exe';
			log('OpenVPN found at "' + openVPNExecCmd + '"', true);
			// alert("OpenVPN found at \"" + openVPNExecCmd + "\"");
		} else if (
			fs.existsSync('C:\\Program Files (x86)\\OpenVPN\\bin\\openvpn.exe')
		) {
			openVPNExecCmd = 'C:\\Program Files (x86)\\OpenVPN\\bin\\openvpn.exe';
			log('OpenVPN found at "' + openVPNExecCmd + '"', true);
			//   alert("OpenVPN found at \"" + openVPNExecCmd + "\"");
		} else {
			// alert(
			// 	`P#: ${app.getAppPath()}
			// 	\n P2: ${process.resourcesPath}
			// 	\n PS: ${path.sep}
			// 	\n PX: ${msiInstallerPath}`
			// );

			console.warn('Running Installer');

			// ―― » Start v2.5.x
			// var msiInstallerName = "openvpn-win64.msi";
			var msiInstallerPath = resourcesDir + 'openvpn-win64.msi';

			// var execCMD = `start /wait msiexec /i ${resourcesDir}openvpn-win64.msi /passive`;
			// var execCMD = `msiexec /i ${resourcesDir}openvpn-win64.msi /qn /norestart`;
			// var execCMDArgs = `/i ${path.resolve(msiInstallerPath).replace('Program Files', 'PROGRA~1')} /qn /norestart`;

			var execCMDArgs = `/i "${path.resolve(
				msiInstallerPath
			)}" ADDLOCAL=OpenVPN,Drivers.TAPWindows6,Drivers /qn /quiet /norestart`;
			var installer = spawn('msiexec', [execCMDArgs], {
				detached: true,
				cwd: os.homedir(),
				env: process.env,
				shell: true,
			});

			installer.on('error', (err) => {
				log('installer:error: ' + err, true);
				// alert("installer:error: " + err.toString());
			});
			installer.stdout.on('data', (data) => {
				var msg = data.toString();
				log('installer:stdout: ' + msg, true);
				// alert("installer:stdout: " + msg.toString());
			});
			installer.stderr.on('data', (data) => {
				var msg = data.toString();
				log('installer:stderr: ' + msg, true);
				// alert("installer:stderr: " + msg.toString());
			});
			installer.on('close', (code) => {
				log(`installer: child process exited with code ${code}`, true);
				// alert(`installer: child process exited with code ${code} \n Path: "${msiInstallerPath}"`);

				// log("> Restarting app", true);
				// app.relaunch();
				// app.quit();

				if (fs.existsSync('C:\\Program Files\\OpenVPN\\bin\\openvpn.exe')) {
					openVPNExecCmd = 'C:\\Program Files\\OpenVPN\\bin\\openvpn.exe';
					log('OpenVPN intalled at "' + openVPNExecCmd + '"', true);
					// alert(`OpenVPN intalled at "${openVPNExecCmd}"`);
				} else if (
					fs.existsSync('C:\\Program Files (x86)\\OpenVPN\\bin\\openvpn.exe')
				) {
					openVPNExecCmd = 'C:\\Program Files (x86)\\OpenVPN\\bin\\openvpn.exe';
					log('OpenVPN intalled at "' + openVPNExecCmd + '"', true);
					// alert(`OpenVPN intalled at "${openVPNExecCmd}"`);
				} else {
					log('OpenVPN installation failed. Please install OpenVPN', true);
					// alert("OpenVPN installation failed. Please install OpenVPN");
				}
			});

			installer.unref();
			// ―― » .: End v2.5.x
		}
	} else {
		useSocket();
		checkCLI(process.platform);
		if (process.platform == 'linux') {
			var IsOpenvpnInstalled = false;
			// var trySpawnOpenVpn = spawn(openVPNExecCmd, [""], {/*uid:0, gid:0,*/ shell:true}); // spawn("sudo", ["apt-get", "install", "openvpn"]);
			var trySpawnOpenVpn = spawn(openVPNExecCmd, ['--version'], {
				shell: true,
			});
			trySpawnOpenVpn.on('error', (err) => {
				log('error: ' + err, true);
			});
			trySpawnOpenVpn.stdout.on('data', (data) => {
				var msg = data.toString();
				log('stdout: ' + msg, true);
				IsOpenvpnInstalled = true;
			});
			trySpawnOpenVpn.stderr.on('data', (data) => {
				var msg = data.toString();
				log('stderr: ' + msg, true);
			});
			trySpawnOpenVpn.on('close', (code) => {
				log(`child process exited with code ${code}`, true);
				if (IsOpenvpnInstalled) {
					log('openvpn is already installed', true);
				} else {
					log('installing openvpn...', true);
					var aptGetInstallCmd = 'apt-get --yes install openvpn'; // --force-yes --allow-downgrades --allow-remove-essential --allow-change-held-packages
					log(aptGetInstallCmd, true);
					sudo.exec(
						aptGetInstallCmd,
						{ name: 'CopVPN' },
						function (error, stdout, stderr) {
							if (error) log('err:' + error.toString(), true);
							if (stdout) log('stdout: ' + stdout.toString(), false);
							if (stderr) log('stderr: ' + stderr.toString(), true);
						}
					);
				}
			});
		}
	}
}

function showHidePopUp(status, Text = '') {
	if (status) {
		$('#helper-text').text(Text);
		$('.helper-popup').addClass('active');
	} else {
		$('.helper-popup').removeClass('active');
	}
}

function DependencyPopUp(status, Text = '') {
	if (status) {
		$('#error-report').text(Text);
		$('.dependency-problem').addClass('active');
	} else {
		$('.helper-popup').removeClass('active');
	}
}

updateLocalDirectory(net);

//////==========================================================

uiOptKillSwitch.addEventListener('input', function (e) {
	settings.killSwitch = e.srcElement.checked;
	console.log('Input: kill switch (' + settings.killSwitch + ')');
	fs.writeFileSync(cfgFilePath, JSON.stringify(settings));
});

uiAlwaysOn.addEventListener('input', function (e) {
	settings.alwasysOn = e.srcElement.checked;
	console.log('Input: AlwaysOn (' + settings.alwasysOn + ')');
	fs.writeFileSync(cfgFilePath, JSON.stringify(settings));
});

uiRunOnStartup.addEventListener('input', function (e) {
	settings.runOnStartup = e.srcElement.checked;
	console.log('Input: Run On Startup (' + settings.runOnStartup + ')');
	fs.writeFileSync(cfgFilePath, JSON.stringify(settings));
});

uiVpnDebug.addEventListener('input', function (e) {
	settings.vpnDebug = e.srcElement.checked;
	console.log('Input: vpn Debug info (' + settings.vpnDebug + ')');
	fs.writeFileSync(cfgFilePath, JSON.stringify(settings));
});

uiCloseBtn.addEventListener('click', function (e) {
	disconnectOpenVPN();
	if (helperOnline) {
		socket.write('{"id": "__exit"}');
		cleanup();
	}
	ipcRenderer.send('close');
});

// Minimize button
uiMinimizeBtn.addEventListener('click', function (e) {
	ipcRenderer.send('minimize');
});

uitrayBtn.addEventListener('click', function (e) {
	ipcRenderer.send('tray_hide');
});

//#region auto update
ipcRenderer.on('message', (event, text) => {
	console.log(text);
	// let message = document.createElement('div')
	// message.innerHTML = text
	// container.appendChild(message)
});

ipcRenderer.on('version', (event, text) => {
	uiVersion.innerText = text;
});

ipcRenderer.on('download-progress', (event, text) => {
	console.log(`${text}%`);
	// progressBar.style.width = `${text}%`
});

ipcRenderer.on('sso_login', (event, result) => {
	console.log(result);

	const config = {
		method: 'get',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/user/user-data`,
		headers: {
			ContentType: 'application/json',
			Authorization: `Bearer ${result}`,
		},
	};
	axios
		.request(config)
		.then((response) => {
			console.log(response);
			if (response?.data?.success) {
				console.log('hi');
				localStorage.setItem('token', result);
				localStorage.setItem(
					'userInfo',
					JSON.stringify(response?.data?.data?.user)
				);
				userData();
				$('.login-wrap').css('display', 'none');
				$('.login-area-wrapper').css('display', 'block');
			}
		})
		.catch((error) => {
			console.log('Error => ', error);
		});
});

//#endregion
