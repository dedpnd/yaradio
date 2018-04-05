'use strict';
const path = require('path');
const fs = require('fs');
const electron = require('electron');
const menu = require('./menu');
const config = require('./config');

const app = electron.app;

require('electron-debug')({enabled: true});
require('electron-context-menu')();

let win;
let isQuitting = false;

const isAlreadyRunning = app.makeSingleInstance(() => {
	if (win) {
		if (win.isMinimized()) {
			win.restore();
		}

		win.show();
	}
});

if (isAlreadyRunning) {
	app.quit();
}

function createMainWindow() {
	const lastWindowState = config.get('lastWindowState');
	const iconPath = path.join(__dirname, 'static/Icon.png'); // ??? process.platform === 'linux' && 
	
	const win = new electron.BrowserWindow({
		title: app.getName(),
		show: false,
		x: lastWindowState.x,
		y: lastWindowState.y,
		width: lastWindowState.width,
		height: lastWindowState.height,
		icon: iconPath,
		minWidth: 800,
		minHeight: 700,
		titleBarStyle: 'hidden-inset',
		autoHideMenuBar: true,
		backgroundColor: '#fff',
		webPreferences: {
			preload: path.join(__dirname, 'browser.js'),
			nodeIntegration: false,
			plugins: true
		}
	});

	if (process.platform === 'darwin') {
		win.setSheetOffset(40);
	}

	win.loadURL('https://radio.yandex.ru/');

	const appIcon = new electron.Tray(iconPath);

	let contextMenu = electron.Menu.buildFromTemplate([
		{
				label: 'Show App', click: function () {
						win.show();
				}
		},
		{
				label: 'Quit', click: function () {
						isQuitting = true;
						app.quit();
				}
		}
	]);

	appIcon.setContextMenu(contextMenu);
	appIcon.addListener('click', (e)=>{
		e.preventDefault();
		if (win.isVisible()){
			win.hide();
		} else {
			win.show();
		}
	})

	win.on('close', e => {
		if (!isQuitting) {
			e.preventDefault();

			if (process.platform === 'darwin') {
				app.hide();
			} else {
				win.hide();
			}
		}
	});

	win.on('page-title-updated', e => {
		e.preventDefault();
	});

	win.on('show', function () {
		appIcon.setHighlightMode('always')
	})

	return win;
}

app.on('ready', () => {
	win = createMainWindow();
	menu.create(win);

	electron.globalShortcut.register('MediaPlayPause', () => win.send('play'));
	electron.globalShortcut.register('MediaNextTrack', () => win.send('next'));

	const page = win.webContents;
	const argv = require('minimist')(process.argv.slice(1));

	page.on('dom-ready', () => {
		page.insertCSS(fs.readFileSync(path.join(__dirname, 'browser.css'), 'utf8'));

		if (argv.minimize) {
			win.minimize();
		} else {
			win.show();
		}
	});

	// Open new link in electron for authorizations
	// page.on('new-window', (e, url) => {
	// 	e.preventDefault();
	// 	electron.shell.openExternal(url);
	// });
});

app.on('activate', () => win.show());

app.on('before-quit', () => {
	isQuitting = true;

	electron.globalShortcut.unregister('MediaPlayPause');
	electron.globalShortcut.unregister('MediaNextTrack');

	if (!win.isFullScreen()) {
		config.set('lastWindowState', win.getBounds());
	}
});
