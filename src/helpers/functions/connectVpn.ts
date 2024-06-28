import { sep } from 'path';
import { miscDir, openVPNExecCmd, ovpnDir } from 'src/constants';
import { getPidByName, log } from '.';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

export const connectOpenVPN = (withoutPass: boolean) => {
  let ovpnPath = ovpnDir + sep + 'tempFile.ovpn';
  let fpOpenVPNStats = miscDir + 'OpenVPN.status';
  let openvpn: ChildProcessWithoutNullStreams | null = null;

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
};
