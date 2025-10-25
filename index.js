import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'fs';
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { createBareServer } from "@tomphttp/bare-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import wisp from "wisp-server-node";
import request from '@cypress/request';
import chalk from 'chalk';
import packageJson from './package.json' with { type: 'json' };

const __dirname = path.resolve();
const server = http.createServer();
const bareServer = createBareServer('/seal/');
const app = express(server);
const version = packageJson.version;
const discord = 'https://discord.gg/unblocking';

// -------------------- VISIT COUNTER --------------------
const counterFile = path.join(__dirname, 'visits.json');
let visitCount = 0;

// Load saved visits
if (fs.existsSync(counterFile)) {
  try {
    const data = fs.readFileSync(counterFile, 'utf8');
    const json = JSON.parse(data);
    visitCount = json.count || 0;
  } catch (err) {
    console.error('Error reading visit counter:', err);
  }
}

// Save function
function saveVisitCount() {
  fs.writeFileSync(counterFile, JSON.stringify({ count: visitCount }));
}

// API route for frontend
app.get('/api/visits', (req, res) => {
  res.json({ count: visitCount });
});

// -------------------------------------------------------

const routes = [
  { route: '/mastery', file: './static/loader.html' },
  { route: '/apps', file: './static/apps.html' },
  { route: '/gms', file: './static/gms.html' },
  { route: '/lessons', file: './static/agloader.html' },
  { route: '/info', file: './static/info.html' },
  { route: '/mycourses', file: './static/loading.html' }
];

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));

// ✅ Home page visit counter
app.get('/', (req, res) => {
  visitCount++;
  saveVisitCount();
  res.sendFile(path.join(__dirname, './static/index.html'));
});

routes.forEach(({ route, file }) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

app.get('/student', (req, res) => {
  res.redirect('/portal');
});

app.get('/worker.js', (req, res) => {
  request('https://worker.mirror.ftp.sh/worker.js', (error, response, body) => {
    if (!error && response.statusCode === 200) {
      res.setHeader('Content-Type', 'text/javascript');
      res.send(body);
    } else {
      res.status(500).send('Error fetching worker script');
    }
  });
});

app.use((req, res) => {
  res.statusCode = 404;
  res.sendFile(path.join(__dirname, './static/404.html'));
});

server.on("request", (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else app(req, res);
});

server.on("upgrade", (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else if (req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else socket.end();
});

server.on('listening', () => {
  console.log(chalk.bgBlue.white.bold(`  Welcome to Doge V4, user!  `) + '\n');
  console.log(chalk.cyan('-----------------------------------------------'));
  console.log(chalk.green('  🌟 Status: ') + chalk.bold('Active'));
  console.log(chalk.green('  🌍 Port: ') + chalk.bold(chalk.yellow(server.address().port)));
  console.log(chalk.green('  🕒 Time: ') + chalk.bold(new Date().toLocaleTimeString()));
  console.log(chalk.cyan('-----------------------------------------------'));
  console.log(chalk.magenta('📦 Version: ') + chalk.bold(version));
  console.log(chalk.magenta('🔗 URL: ') + chalk.underline('http://localhost:' + server.address().port));
  console.log(chalk.cyan('-----------------------------------------------'));
  console.log(chalk.blue('💬 Discord: ') + chalk.underline(discord));
  console.log(chalk.cyan('-----------------------------------------------'));
});

function shutdown(signal) {
  console.log(chalk.bgRed.white.bold(`  Shutting Down (Signal: ${signal})  `) + '\n');
  console.log(chalk.red('-----------------------------------------------'));
  console.log(chalk.yellow('  🛑 Status: ') + chalk.bold('Shutting Down'));
  console.log(chalk.yellow('  🕒 Time: ') + chalk.bold(new Date().toLocaleTimeString()));
  console.log(chalk.red('-----------------------------------------------'));
  console.log(chalk.blue('  Exiting immediately...'));
  process.exit(1);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen({ port: 8001 });
