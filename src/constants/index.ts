import { homedir } from 'os';
import { sep } from 'path';

export const appDir = homedir() + sep + 'CopApp' + sep;
export const ovpnDir = appDir + 'ovpn';
export const miscDir = appDir + 'ms';
export const openVPNExecCmd = 'openvpn';
export const logFile = miscDir + 'CopVPNApp.log';
