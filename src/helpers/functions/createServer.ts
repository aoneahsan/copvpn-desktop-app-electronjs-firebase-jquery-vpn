import { createServer as netCreateServer } from 'net';

export const createServer = (socketFile: string) => {
  console.log('[SERVER] Creating server.');
  let server = netCreateServer(function (stream) {
    let self = Date.now();
    let socketConnections: Record<number, any> = {};
    socketConnections[self] = stream;
    let socket = stream;

    stream.on('end', function () {
      console.log('[SERVER] Client disconnected.');
      delete socketConnections[self];
    });

    // Messages are buffers. use toString
    stream.on('data', function (msg) {
      let msgStr = msg.toString();

      console.log('[SERVER] Client:', msgStr);

      let data;
      try {
        data = JSON.parse(msgStr);
      } catch (err) {
        console.log('createServer => ', err);
      }

      if (data?.type === 'error') {
        if (data.id.startsWith('connect')) {
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
};
