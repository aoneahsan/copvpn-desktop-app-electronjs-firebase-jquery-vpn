export const createServer = (socketFile: string) => {
  console.log('[SERVER] Creating server.');
  var server = netSocket
    .createServer(function (stream) {
      console.log('Connection acknowledged.');
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
