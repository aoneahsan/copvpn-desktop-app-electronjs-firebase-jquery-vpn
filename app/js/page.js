// 'use strict';
var BASE_URL = 'https://testapi.copaccount.com/api';
var APP_URL = 'https://test.copaccount.com/';

const axios = require('axios');

$(document).ready(function () {
	userData();
});
let player = document.querySelector('lottie-player');

$('#tabs-nav li:first-child').addClass('active');
$('.tab-content').hide();
$('.tab-content:first').show();

// Click function
$('#tabs-nav li').click(function () {
	$('#tabs-nav li').removeClass('active');
	$(this).addClass('active');
	$('.tab-content').hide();

	var activeTab = $(this).find('a').attr('href');
	$(activeTab).fadeIn();
	return false;
});

/**
 * start Timer Countdowm
 */
var timer2 = '5:01';
var interval = setInterval(function () {
	var timer = timer2.split(':');
	//by parsing integer, I avoid all extra string processing
	var minutes = parseInt(timer[0], 10);
	var seconds = parseInt(timer[1], 10);
	--seconds;
	minutes = seconds < 0 ? --minutes : minutes;
	if (minutes < 0) clearInterval(interval);
	seconds = seconds < 0 ? 59 : seconds;
	seconds = seconds < 10 ? '0' + seconds : seconds;
	//minutes = (minutes < 10) ?  minutes : minutes;
	$('#countdown').html(minutes + ':' + seconds);
	timer2 = minutes + ':' + seconds;
}, 1000);

/**
 * end Timer Countdowm
 */

$('.get-signin-code').click(function () {
	$('.signin-up-tabs-wrapper').css('display', 'none');
	$('.signin-w-code-wrapper').css('display', 'block');
});

$('.back-signin-code').click(function () {
	$('.signin-up-tabs-wrapper').css('display', 'block');
	$('.signin-w-code-wrapper').css('display', 'none');
});

$('#signincode-email-submit').click(function (e) {
	e.preventDefault();
	let email = $('#signincode-input').val();
	if (email.length == 0) {
		alert('Password enter valid email');
		return;
	}

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/auth/get-login-code`,
		data: {
			email: email,
		},
		headers: {
			ContentType: 'application/json',
		},
	};

	axios
		.request(config)
		.then((response) => {
			console.log(response);
			if (response?.data?.success) {
				$('#code-email').text(email);
				$('.singin-w-code-codes-wrap').css('display', 'block');
				$('.singin-w-code-email-wrap').css('display', 'none');
			}
		})
		.catch((error) => {
			console.log('Error => ', error);
		});
});

$('#signincode-otp-submit').click(function (e) {
	e.preventDefault();
	let email = $('#signincode-input').val();
	let one = $('#code-1').val();
	let two = $('#code-2').val();
	let three = $('#code-3').val();
	let four = $('#code-4').val();
	let five = $('#code-5').val();
	let six = $('#code-6').val();
	let otp = one + two + three + four + five + six;

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/auth/code-login`,
		data: {
			email: email,
			code: otp,
		},
		headers: {
			ContentType: 'application/json',
		},
	};

	axios
		.request(config)
		.then((response) => {
			if (response?.data?.success) {
				localStorage.setItem('token', response?.data?.data?.token);
				localStorage.setItem(
					'userInfo',
					JSON.stringify(response?.data?.data?.user)
				);
				userData();
			}
		})
		.catch((error) => {
			console.log('Error => ', error);
		});
});

// $(".login-button-trigger").click(function (e) {
//   e.preventDefault();
//   $(".login-wrap").css("display", "none");
//   $(".login-area-wrapper").css("display", "block");
// });

// $('#btn-redeem').click(function (e) {
//   e.preventDefault();
//   let data = localStorage.getItem('userInfo');
//   console.log(JSON.parse(data));
// });

$('.server-select-area button.selected').click(function (e) {
	e.preventDefault();
	$('.all-server-list-wrap').addClass('active');
});
$('.all-server-list-wrap .back-to-server').click(function (e) {
	e.preventDefault();
	$('.all-server-list-wrap').removeClass('active');
});

// Accordion function
var Accordion = function (el, multiple) {
	this.el = el || {};
	this.multiple = multiple || false;

	var links = this.el.find('.menu-item');
	links.on(
		'click',
		{
			el: this.el,
			multiple: this.multiple,
		},
		this.dropdown
	);
};

Accordion.prototype.dropdown = function (e) {
	var $el = e.data.el;
	($this = jQuery(this)), ($next = $this.next());

	// $next.slideToggle();
	$this.parent().toggleClass('active');

	if (!e.data.multiple) {
		$el.find('.menu-tab-content').not($next).parent().removeClass('active');
	}
};
var accordion = new Accordion(jQuery('.setting-bar-wrapper'), false);

$('.setting-item-has-child .wrap').click(function () {
	let menu = $(this).parent().data('menutype');
	menuType(menu, $(this));
	$(this).siblings('.inside-settings-pop').addClass('inside-pop-active');
	$('.menu-tab-content').css('overflow', 'hidden');
	$('.menu-tab-content').scrollTop(0);
});

$('.setting-item-has-child .inside-settings-pop .menu-title').click(function (
	e
) {
	$(this).parent().removeClass('inside-pop-active');
	$('.menu-tab-content').css('overflow', 'auto');
	// $('.menu-tab-content').css('height', '100vh');
});

$('.setting-item').on('click', function (e) {
	// e.preventDefault();
	let dtype = $(this).data('type');
	if (dtype == 'GetPremium') {
		shell.openExternal('https://copvpn.com/pricing/');
	}

	if (dtype == 'CustomerSupport') {
		shell.openExternal('https://copvpn.com/');
	}
});

$('.button-pre .unlock').on('click', function (e) {
	e.preventDefault();
	shell.openExternal('https://copvpn.com/pricing/');
});

$('#accordion')
	.find('.accordion-toggle')
	.click(function () {
		// modified from union deisgn+code at http://uniondesign.ca/simple-accordion-without-jquery-ui/
		// mc 4/2/2015
		//Expand or collapse this panel
		var isActive = $(this).hasClass('active');
		$('.accordion-toggle').removeClass('active');
		if (!isActive) {
			$(this).toggleClass('active');
		}

		$(this).next().slideToggle('fast');
		//Hide the other panels
		$('.accordion-content').not($(this).next()).slideUp('fast');
	});

$('input#enable-split-tunnel').change(function () {
	if ($(this).is(':checked')) {
		$('.split-tunnel-show-hide').addClass('show-tunnel');
	} else {
		$('.split-tunnel-show-hide').removeClass('show-tunnel');
	}
});

$('.pass-forget').click(function () {
	$('.signin-up-tabs-wrapper').css('display', 'none');
	$('.reset-pass-form').css('display', 'block');
});

$('.back-reset-pass').click(function () {
	$('.signin-up-tabs-wrapper').css('display', 'block');
	$('.reset-pass-form').css('display', 'none');
});

$('.move-to-reset-code').click(function (e) {
	e.preventDefault();
	let email = $('#reset-email').val();
	if (email.length == 0 && pass.length == 0) {
		alert('Please enter the valid email and password');
		return;
	}
	$('#forget-token').val('');
	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/user/forgot-password`,
		data: {
			email: email,
		},
		headers: {
			ContentType: 'application/json',
		},
	};
	axios
		.request(config)
		.then((response) => {
			console.log(response);
			if (response?.data?.success) {
				$('#forget-email').text(email);
				$('.reset-email').css('display', 'none');
				$('.reset-code').css('display', 'block');
			}
		})
		.catch((error) => {
			console.log('Error => ', error);
		});
});

$('#forget-resend-again').on('click', function (e) {
	e.preventDefault();
	alert('forget-resend');
});

$('.move-to-confirm-pass').click(function (e) {
	e.preventDefault();
	let Forgot1 = $('#forget-1').val();
	let Forgot2 = $('#forget-2').val();
	let Forgot3 = $('#forget-3').val();
	let Forgot4 = $('#forget-4').val();
	let Forgot5 = $('#forget-5').val();
	let Forgot6 = $('#forget-6').val();

	let otp = Forgot1 + Forgot2 + Forgot3 + Forgot4 + Forgot5 + Forgot6;

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/auth/reset-password-by-code`,
		data: {
			email: email,
			code: otp,
		},
		headers: {
			ContentType: 'application/json',
		},
	};
	console.log(otp);
	axios
		.request(config)
		.then((response) => {
			console.log(response);
			if (response?.data?.success) {
				$('#forget-token').val(response?.data?.data?.reset_token);
				$('.confirm-pass-form').css('display', 'block');
				$('.reset-code').css('display', 'none');
			}
		})
		.catch((error) => {
			console.log('Error => ', error);
		});
});

$('#forget-pass-set').on('click', function (e) {
	e.preventDefault();
	let pass = $('#pass').val();
	let confpass = $('#forget-conf-pass').val();
	let reset_token = $('#forget-token').val();
	if (pass != confpass) {
		alert('Password does not match.');
		return;
	}

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/auth/reset-password`,
		data: {
			token: reset_token,
			email: email,
			password: pass,
			password_confirmation: confpass,
		},
		headers: {
			ContentType: 'application/json',
		},
	};

	axios
		.request(config)
		.then((response) => {
			console.log(response);
			if (response?.data?.success) {
				$('.login-wrap').css('display', 'none');
				$('.login-area-wrapper').css('display', 'block');
			}
		})
		.catch((error) => {
			console.log('Error => ', error);
		});
});

$('.move-to-pass-change').click(function (e) {
	e.preventDefault();
	let userInfo = JSON.parse(localStorage.getItem('userInfo'));
	let one = $('#one').val();
	let two = $('#two').val();
	let three = $('#three').val();
	let four = $('#four').val();
	let five = $('#five').val();
	let six = $('#six').val();
	let otp = one + two + three + four + five + six;

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/auth/reset-password-by-code`,
		data: {
			email: userInfo.email,
			code: otp,
		},
		headers: {
			ContentType: 'application/json',
		},
	};

	axios
		.request(config)
		.then((response) => {
			console.log(response);
			if (response?.data?.success) {
				$('#resetToken').val(response?.data?.data?.reset_token);
				$('.change-pass-form-wrapper').css('display', 'block');
				$('.change-pass-code-inside').css('display', 'none');
			}
		})
		.catch((error) => {
			console.log('Error => ', error);
		});
	// $('.change-pass-form-wrapper').css('display', 'block');
	//     $('.change-pass-code-inside').css('display', 'none');
});

$('.chngpass').on('click', function (e) {
	e.preventDefault();
	let userInfo = JSON.parse(localStorage.getItem('userInfo'));
	// $(this).siblings('.menu-item').click();
	let passToken = $('#resetToken').val();
	let NewPassword = $('#NewPassword').val();
	let ConfirmPass = $('#ConfirmPass').val();

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/auth/reset-password`,
		data: {
			token: `${passToken}`,
			email: `${userInfo.email}`,
			password: `${NewPassword}`,
			password_confirmation: `${ConfirmPass}`,
		},
		headers: {
			ContentType: 'application/json',
		},
	};

	axios
		.request(config)
		.then((response) => {
			console.log(response);
			if (response?.data?.success) {
				// $('.change-pass-form-wrapper').css('display', 'block');
				// $('.change-pass-code-inside').css('display', 'none');
			}
		})
		.catch((error) => {
			console.log('Error => ', error);
		});
});

$('.close-trigger').click(function (e) {
	e.preventDefault();
	$(this).siblings('.menu-item').click();
});

$('.close-popup-remove-device').click(function (e) {
	e.preventDefault();
	$('.remove-device-popup').removeClass('active');
});

$('#btn-dependency-problem').click(function (e) {
	e.preventDefault();
	$('.dependency-problem').removeClass('active');
	setTimeout(function () {
		player.stop();
		$('#connect-btn').trigger('click');
	}, 2000);
});

$('#subscribe').on('click', function (e) {
	e.preventDefault();
	alert('subscribe');
});

$('#play-store').on('click', function (e) {
	e.preventDefault();
	let url = JSON.parse(localStorage.getItem('aboutUs'));
	shell.openExternal(url.playstore_url);
});

$('#app-store').on('click', function (e) {
	e.preventDefault();
	let url = JSON.parse(localStorage.getItem('aboutUs'));
	shell.openExternal(url.app_store_url);
});

$('.followUs').on('click', function (e) {
	e.preventDefault();
	let url = JSON.parse(localStorage.getItem('aboutUs'));

	switch ($(this).data('follow')) {
		case 'facebook':
			shell.openExternal(url.facebook_url);
			break;
		case 'instagram':
			shell.openExternal(url.instagram_url);
			break;
		case 'linked-in':
			shell.openExternal(url.linkedin_url);
			break;
		case 'twitter':
			shell.openExternal(url.twitter_url);
			break;
	}
});

$('#btn-signup').click(function (e) {
	e.preventDefault();
	let policy = $('#policy').is(':checked');
	let marketing = $('#marketing-mail').is(':checked');
	let email = $('#email').val();
	let pass = $('#pass').val();
	let cpass = $('#conf-pass').val();

	if (email.length == 0 && pass.length == 0 && cpass.length == 0) {
		data = {
			type: 'Wearing',
			message: 'Please enter the valid email and password',
		};
		ipcRenderer.send('show_message', data);
		return;
	}

	if (pass != cpass) {
		data = {
			type: 'Wearing',
			message: 'Password are not match',
		};
		ipcRenderer.send('show_message', data);
		return;
	}

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/user/signup`,
		data: {
			email: email,
			password: pass,
			password_confirmation: cpass,
			agreement: policy === true ? 1 : 1,
			newsletter: marketing === true ? 1 : 1,
		},
		headers: {
			ContentType: 'application/json',
		},
	};
	axios
		.request(config)
		.then((response) => {
			// console.log(response);
			if (response?.data?.status) {
				localStorage.setItem('token', response?.data?.data?.token);
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

$('#btn-signin').on('click', function (e) {
	e.preventDefault();

	let email = $('#signin-email').val();
	let pass = $('#signin-password').val();

	userLogin(email, pass);
});

$('#google-signin').on('click', function (e) {
	e.preventDefault();
	shell.openExternal(`${APP_URL}desktop-app/google/login`);
});

$('#apple-signin').on('click', function (e) {
	e.preventDefault();
	shell.openExternal(`${APP_URL}desktop-app/apple/login`);
});

$('#google-signup').on('click', function (e) {
	e.preventDefault();
	shell.openExternal(`${APP_URL}desktop-app/google/login`);
});

$('#apple-signup').on('click', function (e) {
	e.preventDefault();
	shell.openExternal(`${APP_URL}desktop-app/apple/login`);
});

////////======================================================////////////////////////////

var allServer = [];
var isPressed_str = '';
var isPressed = isPressed_str === 'true'; // "cast" to Boolean

$('button.connect-vpn').click(function (e) {
	e.preventDefault();
	$('.center-connection-area').toggleClass('connected');
	$(this).siblings('lottie-player').css('display', 'block');

	isPressed_str = this.getAttribute('data-connect');
	isPressed = !isPressed; // toggle

	if (isPressed) {
		player.play();
		connectOpenVPN(true);
		// player.stop();
	} else {
		disconnectOpenVPN();
	}

	this.setAttribute('data-connect', isPressed);
	// player.stop();
	// $(this).parent('connected-btn-area').toggleClass('connected');

	// $(this).siblings('lottie-player').play();
	// setTimeout(function () {
	//   $(this).siblings('lottie-player').css('opacity', '0');
	// }, 1000);
});

// let play = document.querySelector('.connect-vpn');
// play.onclick = function () {
//   player.play();
// };

$('.logout').click(function (e) {
	e.preventDefault();
	let token = localStorage.getItem('token');

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/user/logout/`,
		// data:{
		//     email: email,
		//     password: pass
		// },
		headers: {
			ContentType: 'application/json',
			Authorization: `Bearer ${token}`,
		},
	};

	axios
		.request(config)
		.then((response) => {
			if (response?.data?.status) {
				// console.log(response);
				disconnectOpenVPN();
				localStorage.removeItem('token');
				localStorage.removeItem('userInfo');
				localStorage.removeItem('servers');
				localStorage.removeItem('aboutUs');

				$(this).siblings('.menu-item').click();
				$('.login-wrap').css('display', 'block');
				$('.login-area-wrapper').css('display', 'none');
			}
		})
		.catch((error) => {
			console.log('Error => ', error);
		});
});

function userLogin(email, pass) {
	localStorage.clear();
	if (email.length == 0 && pass.length == 0) {
		data = {
			type: 'Wearing',
			message: 'Please enter the valid email and password',
		};
		ipcRenderer.send('show_message', data);
		return;
	}

	let os = '';
	if (process.platform == 'win32') {
		os = 'Windows';
	} else if (process.platform == 'darwin') {
		os = 'macOS';
	} else if (process.platform == 'linux') {
		os = 'Linux';
	}

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/user/login/`,
		data: {
			email: email,
			password: pass,
			device_brand: os,
			device_os: os,
			device_model: 'Desktop',
			device_os_version: require('os').release(),
		},
		headers: {
			ContentType: 'application/json',
		},
	};
	axios
		.request(config)
		.then((response) => {
			// console.log(response);
			if (response?.data?.status) {
				localStorage.setItem('token', response?.data?.data?.token);
				localStorage.setItem(
					'userInfo',
					JSON.stringify(response?.data?.data?.user)
				);
				userData();
			}
		})
		.catch((error) => {
			console.log('Error => ', error);
		});
}

function menuType(type, content) {
	console.log(content);
	let token = localStorage.getItem('token');
	let userInfo = JSON.parse(localStorage.getItem('userInfo'));

	switch (type) {
		case 'ChangePassword':
			console.log('arowdata =>', type);
			const config = {
				method: 'post',
				maxBodyLength: Infinity,
				url: `${BASE_URL}/auth/forgot-password`,
				data: {
					email: userInfo.email,
				},
				headers: {
					ContentType: 'application/json',
					Authorization: `Bearer ${token}`,
				},
			};

			if (token != null && token.length > 0) {
				axios
					.request(config)
					.then((response) => {
						if (response?.data?.success === true) {
						}
					})
					.catch((error) => {
						console.log('servers => ', error);
					});
			}
			break;
		case 'DevicesList':
			connectedDeviceList();
			break;
		default:
			return;
	}
}

function removeDevice(id) {
	$('.remove-device-popup').data('remove', id);
	$('.remove-device-popup').addClass('active');
}

$('#remove-confirmation').click(function () {
	let data = $(this).parent().parent().data('remove');
	console.log(data);
	let userInfo = JSON.parse(localStorage.getItem('userInfo'));
	let token = localStorage.getItem('token');

	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/user/terminate-device/`,
		data: {
			user_id: userInfo.id,
			device_id: data,
		},
		headers: {
			ContentType: 'application/json',
			Authorization: `Bearer ${token}`,
		},
	};

	if (token != null && token.length > 0) {
		axios
			.request(config)
			.then((response) => {
				if (response?.data?.success === true) {
					$('.remove-device-popup').removeClass('active');
					connectedDeviceList();
				}
			})
			.catch((error) => {
				console.log('servers => ', error);
			});
	}
});

function userData() {
	let token = localStorage.getItem('token');
	let userInfo = JSON.parse(localStorage.getItem('userInfo'));

	serverListData();
	if (token != null && token.length > 0) {
		ServerList();
		// connectedDeviceList();
		appContent();
		$('.userEmail').html(userInfo.email);
		$('.login-wrap').css('display', 'none');
		$('.login-area-wrapper').css('display', 'block');
	}
}

function ServerList() {
	let token = localStorage.getItem('token');
	let servers = JSON.parse(localStorage.getItem('servers'));
	const config = {
		method: 'get',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/servers/`,
		headers: {
			ContentType: 'application/json',
			Authorization: `Bearer ${token}`,
		},
	};

	if (token != null && token.length > 0 && servers == null) {
		axios
			.request(config)
			.then((response) => {
				// console.log(response);
				if (response?.data?.success) {
					localStorage.setItem(
						'servers',
						JSON.stringify(response?.data?.data?.vpn_servers)
					);
					serverListData();
				}
			})
			.catch((error) => {
				console.log('servers => ', error);
			});
	}
}

function stateNameData(stateData, flag) {
	stateData.flag = flag;
	allServer.push(stateData);
	// console.log(stateData);
	let conf = stateData.configurations.openvpn.toString();
	let state =
		'<div class="country-server-item">' +
		'<div class="name">' +
		'<img src="../assets/star.svg" alt="star" />' +
		'<span id="serverName" onclick="selectServer(' +
		stateData.id +
		');">' +
		stateData.name +
		'</span>' +
		'</div>' +
		'<div class="right">' +
		'<div class="network">' +
		'<img src="../assets/network.svg" alt="network" />' +
		'</div>' +
		'<div class="server-selected">' +
		'<input type="radio" name="vpnserver" id="" onclick="selectServer(' +
		stateData.id +
		');"/>' +
		'</div>' +
		'<div class="premium">' +
		'<img src="../assets/crown.png" alt="crown" />' +
		'</div>' +
		'</div>' +
		'</div>';
	return state;
}

function selectServer(serverId) {
	// console.log(serverId);
	// var img = document.querySelector('img[name="edit-save"]');
	$.each(allServer, function (s, server) {
		if (serverId == server.id) {
			// console.log(server.configurations.openvpn);
			$('#serverFlag').attr('src', server.flag);
			$('.selected .name').html(server.name);
			getOvpnFile(server.configurations.openvpn);

			if (isPressed) {
				disconnectOpenVPN();

				if ($('#status').text() == 'Disconnected') {
					$('#status').text('Reconnecting....');
					$('#connect-btn').attr('data-connect', false);
					$('.center-connection-area').removeClass('connected');
					isPressed = false;
					setTimeout(function () {
						$('#connect-btn').trigger('click');
					}, 2000);
				}
			}
		}
	});

	$('.all-server-list-wrap').removeClass('active');
}

function serverListData() {
	let servers = JSON.parse(localStorage.getItem('servers'));
	if (servers == null) return;

	let countryName = [];
	let server = '';
	let tabs = '';
	// console.log(servers);
	$.each(servers, function (c, country) {
		tabs += `<li><a href="#${country.name.replace(/\s/g, '')}">${
			country.name
		}</a></li>`;
		countryName.push({ name: country.name, country: country.countries });
	});
	$('#server-tabs-nav').html(tabs);

	$.each(countryName, function (c, cn) {
		switch (cn.name) {
			case 'Free':
				server += `<div id="${cn.name.replace(/\s/g, '')}" class="tab-content">
            <div class="server-toggle-wrapper">`;
				$.each(cn.country, function (l, lc) {
					if (l == 0) {
						$('#serverFlag').attr('src', lc.vpn_servers[0].flag);
						$('.selected .name').html(lc.vpn_servers[0].name);
						getOvpnFile(lc.vpn_servers[0].configurations.openvpn);
					}

					let countryData = '<div class="server-by-country">';
					$.each(lc.vpn_servers, function (s, state) {
						countryData += stateNameData(state, lc?.flag_url);
					});
					countryData += '</div>';

					server += `<div class="server-item">
              <h3 class="server-head">
                <div class="left">
                  <img src="${lc?.flag_url}" alt="${lc?.name}" />
                </div>
                <div class="right">
                  <h3>${lc?.name}</h3>
                  <p>${lc?.vpn_servers?.length} servers available</p>
                </div>
              </h3>
            ${countryData}
            </div>`;
				});
				server += `</div></div>`;
				break;
			case 'High Speed':
				server += `<div id="${cn.name.replace(/\s/g, '')}" class="tab-content">
            <div class="server-toggle-wrapper">`;
				$.each(cn.country, function (l, lc) {
					// console.log(cn);
					let countryData = '<div class="server-by-country">';
					$.each(lc.vpn_servers, function (s, state) {
						countryData += stateNameData(state, lc?.flag_url);
					});
					countryData += '</div>';

					server += `<div class="server-item">
              <h3 class="server-head">
                <div class="left">
                  <img src="${lc?.flag_url}" alt="${lc?.name}" />
                </div>
                <div class="right">
                  <h3>${lc?.name}</h3>
                  <p>${lc?.vpn_servers?.length} servers available</p>
                </div>
              </h3>
            ${countryData}
            </div>`;
				});
				server += `</div></div>`;
				break;
			case 'Streaming':
				server += `<div id="${cn.name.replace(/\s/g, '')}" class="tab-content">
            <div class="server-toggle-wrapper">`;
				$.each(cn.country, function (l, lc) {
					// console.log(cn);
					let countryData = '<div class="server-by-country">';
					$.each(lc.vpn_servers, function (s, state) {
						countryData += stateNameData(state, lc?.flag_url);
					});
					countryData += '</div>';

					server += `<div class="server-item">
              <h3 class="server-head">
                <div class="left">
                  <img src="${lc?.flag_url}" alt="${lc?.name}" />
                </div>
                <div class="right">
                  <h3>${lc?.name}</h3>
                  <p>${lc?.vpn_servers?.length} servers available</p>
                </div>
              </h3>
            ${countryData}
            </div>`;
				});
				server += `</div></div>`;
				break;
			case 'Gaming':
				server += `<div id="${cn.name.replace(/\s/g, '')}" class="tab-content">
            <div class="server-toggle-wrapper">`;
				$.each(cn.country, function (l, lc) {
					// console.log(cn);
					let countryData = '<div class="server-by-country">';
					$.each(lc.vpn_servers, function (s, state) {
						countryData += stateNameData(state, lc?.flag_url);
					});
					countryData += '</div>';

					server += `<div class="server-item">
              <h3 class="server-head">
                <div class="left">
                  <img src="${lc?.flag_url}" alt="${lc?.name}" />
                </div>
                <div class="right">
                  <h3>${lc?.name}</h3>
                  <p>${lc?.vpn_servers?.length} servers available</p>
                </div>
              </h3>
            ${countryData}
            </div>`;
				});
				server += `</div></div>`;
				break;
		}
	});
	$('#tabs-content').html(server);
	serverTab();
}

function serverTab() {
	// Show the first tab and hide the rest
	$('#server-tabs-nav li:first-child').addClass('active');
	$('.all-server-list-wrap .tab-content:first').show();

	// Click function
	$('#server-tabs-nav li').on('click', function () {
		$('#server-tabs-nav li').removeClass('active');
		$(this).addClass('active');
		$('.tab-content').hide();

		var activeTab = $(this).find('a').attr('href');
		$(activeTab).fadeIn();
		return false;
	});

	// Accordion function
	var Accordion = function (el, multiple) {
		this.el = el || {};
		this.multiple = multiple || false;

		var links = this.el.find('.server-head');
		links.on(
			'click',
			{
				el: this.el,
				multiple: this.multiple,
			},
			this.dropdown
		);
	};
	Accordion.prototype.dropdown = function (e) {
		var $el = e.data.el;
		($this = $(this)), ($next = $this.next());

		$next.slideToggle();
		$this.parent().toggleClass('open');

		if (!e.data.multiple) {
			$el
				.find('.server-by-country')
				.not($next)
				.slideUp()
				.parent()
				.removeClass('open');
		}
	};
	var accordion = new Accordion($('.server-toggle-wrapper'), false);
	// $('.servers-wrapper .server-item:first-child .server-head').click();
	$('.server-toggle-wrapper .server-item:first-child .server-head')
		.click()
		.next('.server-by-country')
		.slideDown();
}

function connectedDeviceList() {
	let data = '';
	let token = localStorage.getItem('token');
	let userInfo = JSON.parse(localStorage.getItem('userInfo'));
	const config = {
		method: 'post',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/user/connected-device-list`,
		data: {
			user_id: token != null ? userInfo.id : null,
		},
		headers: {
			ContentType: 'application/json',
			Authorization: `Bearer ${token}`,
		},
	};

	if (token != null && token.length > 0) {
		axios
			.request(config)
			.then((response) => {
				if (response?.data?.success && response?.data?.data[0].length > 0) {
					// console.log(response);
					$.each(response?.data?.data[0], function (d, device) {
						// console.log(device);
						data += `<div class="device">
              <div class="inner">
              <div class="top">
                <svg
                width="17"
                height="20"
                viewBox="0 0 17 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                >
                <path
                  d="M9.46498 1.73402C9.82578 1.24128 10.2893 0.832809 10.8235 0.536866C11.3578 0.240923 11.9499 0.0645743 12.559 0.0200195C12.6111 0.586468 12.5477 1.15759 12.3727 1.69885C12.1977 2.24011 11.9148 2.74025 11.541 3.16902C11.21 3.63049 10.7665 3.99957 10.2526 4.24113C9.73866 4.48268 9.17146 4.58868 8.60498 4.54902C8.54555 4.04583 8.59131 3.53578 8.73935 3.0512C8.88739 2.56662 9.13449 2.11809 9.46498 1.73402ZM8.77198 5.67202C9.43798 5.67202 10.672 4.75702 12.282 4.75702C13.0404 4.72472 13.7942 4.88916 14.4702 5.23435C15.1462 5.57955 15.7215 6.09376 16.14 6.72702C15.4872 7.10585 14.9464 7.65065 14.5723 8.30611C14.1982 8.96157 14.0042 9.70434 14.01 10.459C14.014 11.3131 14.2673 12.1474 14.7387 12.8596C15.2102 13.5717 15.8793 14.1308 16.664 14.468C16.664 14.468 14.805 19.689 12.305 19.689C11.154 19.689 10.259 18.913 9.04698 18.913C7.81098 18.913 6.58498 19.713 5.78598 19.713C3.49598 19.72 0.60498 14.765 0.60498 10.784C0.60498 6.86702 3.05198 4.81202 5.34698 4.81202C6.83898 4.81202 7.99698 5.67202 8.77198 5.67202Z"
                  fill="#999999"
                />
                </svg>
                <span>${device.device_brand}</span>
                <div class="remove-app" onclick="removeDevice(${device.id})">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  focusable="false"
                >
                  <path
                  d="m8 7.152 4.575-4.576c.235-.235.615-.235.827 0a.566.566 0 0 1 0 .848L8.847 8l4.555 4.575c.255.235.255.615 0 .828-.212.255-.592.255-.827 0L8 8.846l-4.576 4.556a.566.566 0 0 1-.848 0c-.235-.213-.235-.593 0-.828L7.152 8 2.576 3.424a.6.6 0 0 1 .848-.848L8 7.152Z"
                  fill="#2A2B32"
                  ></path>
                </svg>
                </div>
              </div>
              <div class="line"></div>
              <div class="bottom">
                <span>${device.device_model}</span>
                <span>${device.device_os_version}</span>
              </div>
              </div>
            </div>`;
					});
					$('.devices-wrap').html(data);
				}
			})
			.catch((error) => {
				console.log('connected Device => ', error);
			});
	}
}

function appContent() {
	let token = localStorage.getItem('token');
	const config = {
		method: 'get',
		maxBodyLength: Infinity,
		url: `${BASE_URL}/content`,
		headers: {
			ContentType: 'application/json',
			Authorization: `Bearer ${token}`,
		},
	};

	if (token != null && token.length > 0) {
		axios
			.request(config)
			.then((response) => {
				// console.log(response);
				if (response?.data?.success) {
					localStorage.setItem('aboutUs', JSON.stringify(response?.data?.data));
					$('.description').html(response?.data?.data?.about_us_description);
				}
			})
			.catch((error) => {
				console.log('aboutus => ', error);
			});
	}
}
