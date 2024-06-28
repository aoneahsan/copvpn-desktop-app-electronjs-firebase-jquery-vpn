import { sep } from 'path';
import { miscDir, openVPNExecCmd, ovpnDir } from 'src/constants';
import { getPidByName, log } from '.';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

let connectingTimeout: any = null;

const connectOpenVPN = (withoutPass: boolean) => {
  let aConnectingServer = null;

  let ovpnPath = ovpnDir + sep + 'tempFile.ovpn';
  let fpOpenVPNStats = miscDir + 'OpenVPN.status';
  let openvpn: ChildProcessWithoutNullStreams | null = null;

  // if (process.platform == 'win32') {
  //   let args = [];
  //   if (withoutPass) {
  //     args = [
  //       '--verb',
  //       '11',
  //       '--config',
  //       ovpnPath,
  //       '--status',
  //       fpOpenVPNStats,
  //       '1',
  //       '--auth-nocache',
  //       '--inactive',
  //       '3600',
  //       '--ping',
  //       '1',
  //       '--ping-exit',
  //       '5',
  //     ];
  //   } else {
  //     args = [
  //       '--verb',
  //       '11',
  //       '--config',
  //       ovpnPath,
  //       '--auth-user-pass',
  //       'tmpCredentials.name', // TODO: Need to check this "tmpCredentials.name" this was a variable
  //       '--status',
  //       fpOpenVPNStats,
  //       '1',
  //       '--auth-nocache',
  //       '--inactive',
  //       '3600',
  //       '--ping',
  //       '1',
  //       '--ping-exit',
  //       '5',
  //     ];
  //   }
  //   let cmd = openVPNExecCmd + ' ' + args.join(' ');
  //   log('starting ' + cmd, true);
  //   openvpn = spawn(openVPNExecCmd, args) as ChildProcessWithoutNullStreams;
  //   openvpn.on('error', err => {
  //     log('error: ' + err, true);
  //     // disconnectOpenVPN(null, 2000, withoutPass);
  //   });
  //   openvpn.stdout.on('data', data => {
  //     let msg = data.toString();
  //     log('stdout: ' + msg, true);
  //     if (
  //       msg.includes('AUTH_FAILED') ||
  //       msg.includes('authfile') ||
  //       msg.includes('Enter Auth Username')
  //     ) {
  //       clearTimeout(connectingTimeout);
  //       // disconnectOpenVPN(null, 2000, withoutPass);
  //     }
  //   });
  //   openvpn.stderr.on('data', data => {
  //     let msg = data.toString();
  //     log('stderr: ' + msg, true);
  //     if (
  //       msg.includes('AUTH_FAILED') ||
  //       msg.includes('authfile') ||
  //       msg.includes('Enter Auth Username')
  //     ) {
  //       clearTimeout(connectingTimeout);

  //       // disconnectOpenVPN(null, 2000, withoutPass);
  //     }
  //     // disconnectOpenVPN(null, 2000, withoutPass);
  //   });
  //   openvpn.on('close', code => {
  //     log(`child process exited with code ${code}`, true);

  //     // disconnectOpenVPN(null, 2000, withoutPass);
  //   });
  //   connectingTimeout = setTimeout(function () {
  //     console.log('Timeout: connectOpenVPN ' + connectTimeoutMillisec + 'ms');
  //     console.log('withoutPass ' + withoutPass);
  //     onConnectedCallback(withoutPass);
  //   }, connectTimeoutMillisec);
  // } else {
  // darwin, linux
  let fpOpenVpnLog = miscDir + 'OpenVPN.log';
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
  // }
};
