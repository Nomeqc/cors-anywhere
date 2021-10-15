let Service = require('node-windows').Service;

let svc = new Service({
    name: 'cors-anywhere', //服务名称
    description: '代理请求以支持跨域;下载文件支持指定文件名', //描述
    script: './server.js', //nodejs项目要启动的文件路径
    wait: '1', //程序崩溃后重启的时间间隔
    grow: '0.25', //重启等待时间成长值，比如第一次1秒，第二次就是1.25秒
    maxRestarts: '40' //60秒内最大重启次数
});

svc.on('install', () => {
    svc.start();
    console.log('install complete.');
});

//监听卸载事件
svc.on('uninstall', () => {
    console.log('Uninstall complete.');
    console.log('The service exists', svc.exists);
});

//防止程序运行2次

svc.on('alreadyinstalled', () => {
    console.log('This service is already installed.');
})

//如果存在就卸载
if (svc.exists) return svc.uninstall();
//不存在就安装
svc.install();