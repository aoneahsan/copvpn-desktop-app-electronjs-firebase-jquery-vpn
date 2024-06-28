import os from 'os';
import { ipcRenderer, net } from 'electron';
import path from 'path';
import netSocket from 'net';
import { exec, spawn } from 'child_process';
import sudo from 'sudo-prompt';
import https from 'https';
import isOnline from 'is-online';
import fs from 'fs';
import publicIp from 'public-ip';
import ps from 'ps-node';

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

let connectedBeginTime = Date.now();
let connectTimeoutMillisec = 5000;
let aSelectedServer = null;
let resourcesDir = process.resourcesPath + path.sep; // "." + path.sep + "resources" + path.sep + "app" + path.sep;
let appDir = os.homedir() + path.sep + 'CopApp' + path.sep;
let ovpnDir = appDir + 'ovpn';
let miscDir = appDir + 'ms';
let openVPNExecCmd = 'openvpn';
let openvpn = null;
let openvpnPID = 0;
let connectingTimeout = null;
let tmpCredentials = null;
let openVpnMacOs = 'openvpn-darwin-arm64';

let fpOpenVPNStats = null;
let fpOpenVpnLog = null;
let offline = true;
let socketConnections = {};
let socket = null;
let socketFile = '/tmp/vpnapp.sock';
let helperOnline = false;
let cliName = 'helper-cli';
let incompatibleCertExit = false;
let aConnectingServer = null;

appDir = path.resolve(appDir) + path.sep;
ovpnDir = path.resolve(ovpnDir) + path.sep;
miscDir = path.resolve(miscDir) + path.sep;

let cliLogFilePath = miscDir + 'CopVPNApp-helper.log';
let cliPath = miscDir + cliName;

let tempOvpn = 'tempFile.ovpn';
let tempOvpnPath = ovpnDir + tempOvpn;
const cfgFilePath = path.normalize(miscDir + 'VPNApp.cfg');

mkDirByPathSync(appDir);
mkDirByPathSync(ovpnDir);
mkDirByPathSync(miscDir);

/*
 ※ Config Server Option
――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― */
const __hostDomain = 'shareing.copaccount.com',
  __protocol = 'https:';

// ―― » Full URI ends with trailing slash
// ―― » __httpServer output: https://domain.com/
const __httpServer = __protocol + '//' + __hostDomain + '/';
// > ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― ^

let settings = {
  killSwitch: false,
  alwasysOn: false,
  runOnStartup: false,
  vpnDebug: false,
};

// Helper functions - [Level-0]
function show(element) {
  element.style.display = '';
}
function click(elem) {
  console.log('programmatic click');
  console.log('programmatic click=>>> ', elem);
  let clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: false,
  });
  elem.dispatchEvent(clickEvent);
  elem.focus();
}
function loadCfg() {
  let jsonData = null;
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
  isOnline().then(online => {
    if (online) {
      if (offline) {
        offline = false;
      }
    } else {
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
let logFile = fs.openSync(miscDir + 'CopVPNApp.log', 'w');
fs.writeFileSync(cfgFilePath, JSON.stringify(settings));

function log(message, alsoWiteToConsole = false) {
  if (alsoWiteToConsole) {
    console.log(message);
  }
  fs.writeSync(logFile, message + '\n\r');
}

function deleteAllFilesInDirectory(dirPath) {
  console.log('Call: deleteAllFilesInDirectory(' + dirPath + ')');
  let files = fs.readdirSync(dirPath);
  for (let i = 0; i < files.length; i++) {
    fs.unlinkSync(dirPath + files[i]);
  }
}

function zeroPad(num, size) {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

function timeDifference(end, start) {
  let difference = end - start;
  let daysDifference = Math.floor(difference / 1000 / 60 / 60 / 24);
  difference -= daysDifference * 1000 * 60 * 60 * 24;
  let hoursDifference = Math.floor(difference / 1000 / 60 / 60);
  difference -= hoursDifference * 1000 * 60 * 60;
  let minutesDifference = Math.floor(difference / 1000 / 60);
  difference -= minutesDifference * 1000 * 60;
  let secondsDifference = Math.floor(difference / 1000);
  return (
    zeroPad(hoursDifference, 2) +
    ':' +
    zeroPad(minutesDifference, 2) +
    ':' +
    zeroPad(secondsDifference, 2)
  );
}

function getPidByName(name) {
  let foundPid = 0;
  ps.lookup(
    {
      command: name,
    },
    function (err, resultList) {
      if (err) {
        throw new Error(err);
      }
      if (resultList) {
        if (resultList[0]) foundPid = resultList[0].pid;
      }
    }
  );
  return foundPid;
}

function doesProcessExist(pid) {
  let exist = false;
  try {
    process.kill(pid, 0);
    exist = true;
  } catch (e) {
    exist = false;
  }
  return exist;
}

// function to start the VPN Server - [Important]
function createServer(socketFile) {
  console.log('[SERVER] Creating server.');
  let server = netSocket
    .createServer(function (stream) {
      console.log('Connection acknowledged.');
      uiStatus.innerText = 'Disconnected';

      // Store all connections so we can terminate them if the server closes.
      // An object is better than an array for these.
      let self = Date.now();
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
              let cmd;
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
          } else if (data.id === 'openvpn-disconnect') {
            console.log('[SERVER] OpenVPN killed.');
          } else if (data.id === '__initok') {
            console.log('[SERVER] Client initialised successfully.');
            helperOnline = true;
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
    });
  return server;
}

// function to handle the vpn disconnect callback - [Important]
function onDisconnectedCallback(onDisconnected, withoutPass) {
  console.log(
    'Call: onDisconnectedCallback(' + onDisconnected + ',' + withoutPass + ')'
  );
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
    } else if (uiStatus.innerText == 'Reconnecting...') {
      console.log('Status: reconnecting...');
      connectOpenVPN(withoutPass);
    } else {
      console.log('Status: continue ' + uiStatus.innerText);
      click(aSelectedServer);
    }
  }
  if (onDisconnected) onDisconnected();
}

// function to check if socketFile exists and based on that createServer called - [Important]
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

// function to start helper cli - [Important]
function startCLI() {
  console.log('Call: startCLI()');
  let options = {
    name: 'CopVPN',
  };
  sudo.exec(
    'chmod +x ' + cliPath + ' && ' + cliPath + ' &> ' + cliLogFilePath,
    options,
    (error, stdout, stderr) => {
      if (error) {
        log('err:' + error.toString(), true);
      }
      if (stdout) {
        log('stdout: ' + stdout.toString(), false);
      }
      if (stderr) {
        let msg = stderr.toString();
        log('stderr: ' + msg, true);
      }
    }
  );
  let ex = fs.existsSync(cliPath);
  console.log(ex);
  showHidePopUp(false);
}

// function to fetch helper cli - [Important]
function fetchCLI(platform) {
  console.log('Call: fetchCLI (' + platform + ')');
  showHidePopUp(true, 'Downloading the helper add-on, please wait...');
  let child = spawn('uname', ['-m']);
  child.stdout.on('data', data => {
    log('System architecture - ' + data.toString().trim(), true);
    if (process.platform == 'darwin') {
      openVpnMacOs = 'openvpn-darwin-' + data.toString().trim();
      openVPNExecCmd = path.resolve(resourcesDir + openVpnMacOs);
      console.log('openvpn exec command: ' + openVPNExecCmd);
    }
    let arch = 'helper-cli-' + platform + '-' + data.toString().trim();
    let href = 'remotevpn/helper-cli/' + arch;
    console.log(__httpServer + href);
    let localFilePath = miscDir + 'helper-cli';
    let file = fs.createWriteStream(localFilePath);
    https.get(__httpServer + href, function (response) {
      console.log('writing file: ' + localFilePath);
      response.pipe(file);
      file
        .on('finish', function () {
          file.close(() => {
            startCLI();
          });
        })
        .on('error', err => {
          log(err, true);
          fs.unlink(localFilePath);
        });
    });
  });
}

// function to check if helper cli is available and based on the result fetch or start the cli - [Important]
function checkCLI(platform) {
  console.log('Call: checkCLI (' + platform + ') ' + cliPath);
  try {
    let ex = fs.existsSync(cliPath);
    console.log(ex);
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

// function to end the socketConnections clients - [Important]
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

// this is to close the internet connection and to restart it if the renew value is true (on win/mac/linux) - [Important]
function killSwitch(renew = false) {
  if (settings.killSwitch == false) return;
  log(
    'Kill Switch: Shutting down all internet connection (resume cmd: (win32) ipconfig /renew, (linux) nmcli networking on, (mac) ifconfig en0 up)',
    true
  );
  let cmd = '';
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
}

// to update the VPN speed in the UI elements, read, write rate and IP value of the connection - [Important]
let dnsTimeoutCount = 0;
let updateOpenVPNStatsTimeout = null;
function updateOpenVPNStats() {
  if (updateOpenVPNStatsTimeout) {
    if (openvpnPID != 0) {
      if (doesProcessExist(openvpnPID) == false) killSwitch();
    }
    let fileContents = fs.readFileSync(fpOpenVPNStats).toString();
    let read = 0;
    let written = 0;
    let tokens = fileContents.split('\n');
    for (let i = 0; i < tokens.length; ++i) {
      let token = tokens[i];
      if (token.includes('TUN/TAP read bytes')) {
        let subTokens = token.split(',');
        read = parseInt(subTokens[1]);
        if (isNaN(read)) {
          read = 0;
        }
      }
      if (token.includes('TUN/TAP write bytes')) {
        let subTokens = token.split(',');
        written = parseInt(subTokens[1]);
        if (isNaN(written)) {
          written = 0;
        }
      }
    }
    written = written / 1024;
    let writtenUnits = 'kb';
    if (written > 1024) {
      written = written / 1024;
      writtenUnits = 'mb';
    }
    read = read / 1024;
    let readUnits = 'kb';
    if (read > 1024) {
      read = read / 1024;
      readUnits = 'mb';
    }
    uiSent.textContent = read.toFixed(2) + readUnits;
    uiReceived.textContent = written.toFixed(2) + writtenUnits;
    uiUptime.textContent = timeDifference(Date.now(), connectedBeginTime);
    publicIp
      .v4()
      .then(ip => {
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
  }
  updateOpenVPNStatsTimeout = setTimeout(updateOpenVPNStats, 1000);
}

// reset the vpn connect and restart it by calling the onDisconnectCallback handler
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

// connection callback function to update the UI based on variables
function onConnectedCallback(withoutPass) {
  console.log('Call: onConnectedCallback(' + withoutPass + ')');
  if (openvpn != null && (tmpCredentials != null || withoutPass)) {
    uiStatus.innerText = 'Connected';
    player.stop();
    connectedBeginTime = Date.now();
    if (updateOpenVPNStatsTimeout == null) {
      updateOpenVPNStats();
    }
  }
}

// function to connect to openvpn - [IMPORTANT]
function connectOpenVPN(withoutPass) {
  console.log('Call: connectOpenVPN(' + withoutPass + ')');
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
    aConnectingServer = aSelectedServer;

    let ovpnPath = ovpnDir + path.sep + 'tempFile.ovpn';
    fpOpenVPNStats = miscDir + 'OpenVPN.status';

    if (process.platform == 'win32') {
      let args = [];
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
      let cmd = openVPNExecCmd + ' ' + args.join(' ');
      log('starting ' + cmd, true);
      openvpn = spawn(openVPNExecCmd, args);
      openvpn.on('error', err => {
        log('error: ' + err, true);
        disconnectOpenVPN(null, 2000, withoutPass);
      });
      openvpn.stdout.on('data', data => {
        let msg = data.toString();
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
      openvpn.stderr.on('data', data => {
        let msg = data.toString();
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
      openvpn.on('close', code => {
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
      let cmd =
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
        '--auth-nocache ' +
        '--status "' +
        fpOpenVPNStats +
        '" 1 ' +
        '--inactive 3600 --ping 1 --ping-exit 5';
      log('starting: ' + cmd, true);
      console.log('socketConnections => ', socketConnections);
      if (helperOnline && Object.keys(socketConnections).length) {
        let connectionParams = {
          openVPNExecCmd: openVPNExecCmd,
          fpOpenVpnLog: fpOpenVpnLog,
          ovpnPath: ovpnPath,
          withoutPass: withoutPass ? 'True' : 'False',
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
          }
          if (stdout) log('stdout: ' + stdout.toString(), false);
          if (stderr) {
            let msg = stderr.toString();
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
          let msg = fs.readFileSync(fpOpenVpnLog).toString();
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
                    let msg = stderr.toString();
                    log('stderr: ' + msg, true);
                    if (msg.includes('Request dismissed')) {
                      return;
                    }
                  }
                  if (!error) {
                    disableServerTabs();
                  }
                }
              );
            }
            incompatibleCertExit = true;
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
          }
          msg = null;
        }
      });
    }
  }
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
                let msg = stderr.toString();
                log('stderr: ' + msg, true);
                if (msg.includes('Request dismissed')) {
                  return;
                }
              }
              if (!error) {
                openvpn = null;
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
              let msg = stderr.toString();
              log('stderr: ' + msg, true);
              if (msg.includes('Request dismissed')) {
                return;
              }
            }
            if (!error) {
              openvpn = null;
              onDisconnectedCallback(onDisconnected, withoutPass);
            }
          }
        );
      }
    }
  }
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

function updateLocalDirectory(netConst) {
  console.log('Call: updateLocalDirectory()');
  log('platform: ' + process.platform, true);

  if (process.platform == 'win32') {
    if (fs.existsSync('C:\\Program Files\\OpenVPN\\bin\\openvpn.exe')) {
      openVPNExecCmd = 'C:\\Program Files\\OpenVPN\\bin\\openvpn.exe';
      log('OpenVPN found at "' + openVPNExecCmd + '"', true);
    } else if (
      fs.existsSync('C:\\Program Files (x86)\\OpenVPN\\bin\\openvpn.exe')
    ) {
      openVPNExecCmd = 'C:\\Program Files (x86)\\OpenVPN\\bin\\openvpn.exe';
      log('OpenVPN found at "' + openVPNExecCmd + '"', true);
    } else {
      console.warn('Running Installer');

      // ―― » Start v2.5.x
      let msiInstallerPath = resourcesDir + 'openvpn-win64.msi';
      let execCMDArgs = `/i "${path.resolve(
        msiInstallerPath
      )}" ADDLOCAL=OpenVPN,Drivers.TAPWindows6,Drivers /qn /quiet /norestart`;
      let installer = spawn('msiexec', [execCMDArgs], {
        detached: true,
        cwd: os.homedir(),
        env: process.env,
        shell: true,
      });

      installer.on('error', err => {
        log('installer:error: ' + err, true);
      });
      installer.stdout.on('data', data => {
        let msg = data.toString();
        log('installer:stdout: ' + msg, true);
      });
      installer.stderr.on('data', data => {
        let msg = data.toString();
        log('installer:stderr: ' + msg, true);
      });
      installer.on('close', code => {
        log(`installer: child process exited with code ${code}`, true);

        if (fs.existsSync('C:\\Program Files\\OpenVPN\\bin\\openvpn.exe')) {
          openVPNExecCmd = 'C:\\Program Files\\OpenVPN\\bin\\openvpn.exe';
          log('OpenVPN intalled at "' + openVPNExecCmd + '"', true);
        } else if (
          fs.existsSync('C:\\Program Files (x86)\\OpenVPN\\bin\\openvpn.exe')
        ) {
          openVPNExecCmd = 'C:\\Program Files (x86)\\OpenVPN\\bin\\openvpn.exe';
          log('OpenVPN intalled at "' + openVPNExecCmd + '"', true);
        } else {
          log('OpenVPN installation failed. Please install OpenVPN', true);
        }
      });

      installer.unref();
      // ―― » .: End v2.5.x
    }
  } else {
    useSocket();
    checkCLI(process.platform);
    if (process.platform == 'linux') {
      let IsOpenvpnInstalled = false;
      let trySpawnOpenVpn = spawn(openVPNExecCmd, ['--version'], {
        shell: true,
      });
      trySpawnOpenVpn.on('error', err => {
        log('error: ' + err, true);
      });
      trySpawnOpenVpn.stdout.on('data', data => {
        let msg = data.toString();
        log('stdout: ' + msg, true);
        IsOpenvpnInstalled = true;
      });
      trySpawnOpenVpn.stderr.on('data', data => {
        let msg = data.toString();
        log('stderr: ' + msg, true);
      });
      trySpawnOpenVpn.on('close', code => {
        log(`child process exited with code ${code}`, true);
        if (IsOpenvpnInstalled) {
          log('openvpn is already installed', true);
        } else {
          log('installing openvpn...', true);
          let aptGetInstallCmd = 'apt-get --yes install openvpn'; // --force-yes --allow-downgrades --allow-remove-essential --allow-change-held-packages
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
});

ipcRenderer.on('version', (event, text) => {
  uiVersion.innerText = text;
});

ipcRenderer.on('download-progress', (event, text) => {
  console.log(`${text}%`);
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
    .then(response => {
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
    .catch(error => {
      console.log('Error => ', error);
    });
});

async function getOvpnFile(fileData) {
  // console.log("writing ovpn file: " + fileData);
  let jsonString = fileData.replace(/[\r\n]+/gm, '\n');
  if (fileData != null && fileData.length > 0) {
    await fs.writeFileSync(tempOvpnPath, jsonString, {
      encoding: 'utf8',
    });
  }
}
