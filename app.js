const express = require('express');
const app = express();
const media = require("./media.js");

var http = require('http').Server(app);
var io = require('socket.io')(http);

var httpPort = process.env.PORT || 3000;
http.listen(httpPort, function () {
  console.log(`Opened server on http://localhost:${httpPort}`);
});

// scan content
media.generateDb();
// autoplay (TEST) 5s after launch
setTimeout(media.startAutoplay, 5000);

// serve static files
app.use(express.static('public'));

// client websocket routes
io.on('connection', function (socket) {
  // request feed
  socket.on('load', function (params) {
    if (true) {
      // media.loadAll(params, function (elements) {
      //   io.emit('load', elements);
      // });
      media.loadMediaFeed({}, function (elements) {
        // send media items one at a time
        elements.forEach(element => {
          io.emit('addmediaitem', element);
        });
      });
      media.loadChannelList({}, function (elements) {
        io.emit('channellist', elements);
      });
      media.loadConfiguration(function (elements) {
        io.emit('configuration', elements);
      });
    } else {
      media.loadFeed(function (elements) {
        io.emit('load', elements);
      });
    }
  });
  // request editor
  socket.on('loadeditor', function (msg) {
    media.loadEditor(msg, function (elements) {
      io.emit('loadeditor', elements);
    });
  });
  // request channel
  socket.on('loadchannel', function (msg) {
    media.loadChannel(msg, function (elements) {
      io.emit('loadchannel', elements);
    });
  });
  // request output graphic
  socket.on('loadoutput', function () {
    media.loadOutput(function (elements) {
      io.emit('loadoutput', elements);
    });
  });
  // get now playing
  socket.on('nowplaying', function () {
    media.nowPlaying(function (playbackStatus) {
      io.emit('nowplaying', (playbackStatus));
      // io.emit('nowplaying2', (playbackStatus));
    });
  });
  // update config
  socket.on('updateconfig', function (msg) {
    media.updateConfig(msg);
  });
  // DEPRECATED upload config
  socket.on('uploadconfig', function (msg) {
    media.uploadConfig(msg, function () {
      media.loadOutput(function (elements) {
        io.emit('loadoutput', elements);
      });
    });
  });
  // upload config file
  socket.on('updateconfigfile', function (msg) {
    // update in memory
    media.uploadConfig(msg, function () {
      // save to disk
      media.saveConfig();
      // send config back to client
      media.loadConfiguration(function (elements) {
        io.emit('configuration', elements);
      });
    });
  })
  // save config file
  socket.on('saveconfig', function () {
    media.saveConfig();
  });
  // play demo
  socket.on('play', function (dirAndVersion) {
    media.stopAutoplay();
    media.playLocalMedia(dirAndVersion);
  });
  socket.on('playURL', function (msg) {
    media.stopAutoplay();
    media.playRemoteMedia(msg);
  });
  socket.on('reloadpage', function () {
    media.reloadPage();
  });
  // autoplay
  socket.on('autoplay', function (msg) {
    media.startAutoplay(msg);
  });
  // set autoplay time range
  socket.on('setautoplaytimerange', function (msg) {
    media.setAutoplayTimeRange(msg);
  });
  // set crossfade time
  socket.on('setcrossfadetime', function (msg) {
    media.setCrossfadeTime(msg);
  });
  // create media
  socket.on('createmedia', function (msg) {
    media.createMedia(msg, function (mediaDirectory) {
      io.emit('changedmedia', JSON.stringify({
        page: 'editor',
        disk: mediaDirectory
      }));
    });
  });
  // create media as copy
  socket.on('duplicatemedia', function (msg) {
    media.duplicateMedia(msg, function (mediaDirectory) {
      io.emit('changedmedia', JSON.stringify({
        page: 'editor',
        disk: mediaDirectory
      }));
    });
  });
  // create media from URL
  socket.on('createmediaURL', function (msg) {
    media.createMediaFromURL(msg);
  });
  // rename media
  socket.on('renamemedia', function (msg) {
    media.renameMedia(msg, function () {
      io.emit('changedmedia', JSON.stringify({
        page: 'editor',
        disk: msg.directory
      }));
    });
  });
  // delete media
  socket.on('deletemedia', function (msg) {
    media.deleteMedia(msg, function () {
      // update client
      io.emit('unloadmediaitem', msg);
    });
  });
  // create file
  socket.on('createfile', function (msg) {
    media.createFile(msg, function () {
      io.emit('changedmedia', JSON.stringify({
        page: 'editor',
        disk: msg
      }));
    });
  });
  // rename file
  socket.on('renamefile', function (msg) {
    media.renameFile(msg, function () {
      io.emit('changedmedia', JSON.stringify({
        page: 'editor',
        disk: msg.directory
      }));
    });
  });
  // update file
  socket.on('updatefile', function (msg) {
    media.updateFile(msg);
  });
  // remove file
  socket.on('removefile', function (msg) {
    media.removeFile(msg, function () {
      io.emit('changedmedia', JSON.stringify({
        page: 'editor',
        disk: msg.directory
      }));
    });
  });
  // general config update handler
  socket.on('config/update', function (msg) {
    // make object in old style of update
    var updateObj = {
      [msg.name]: msg.value
    }
    // look which setting is being updated
    switch (msg.name) {
      case 'brightness':
        media.setBrightness(updateObj);
        break;
      case 'desaturation':
        media.setDesaturation(updateObj);
        break;
      case 'gamma':
        media.setGamma(updateObj);
        break;
      case 'blur':
        media.setBlur(updateObj);
        break;
      case 'fade':
        media.setCrossfadeTime(updateObj);
        break;
      case 'autoplayMinRange':
        media.setAutoplayTimeRange(updateObj);
        break;
      case 'autoplayMaxRange':
        media.setAutoplayTimeRange(updateObj);
        break;
      default:
        console.log(`error parsing ${JSON.stringify(msg)}`);
    }
  });
  // set brightness
  socket.on('setbrightness', function (msg) {
    // update media
    media.setBrightness(msg);
  });
  // set blur
  socket.on('setblur', function (msg) {
    // update media
    media.setBlur(msg);
  });
  // set desaturation
  socket.on('setdesaturation', function (msg) {
    // update media
    media.setDesaturation(msg);
  });
  // set gamma
  socket.on('setgamma', function (msg) {
    // update media
    media.setGamma(msg);
  });
  // save version (DAT)
  socket.on('saveversion', function (msg) {
    media.saveVersion(msg);
  });
  // create channel
  socket.on('createchannel', function (msg) {
    if (msg.length > 0)
      media.createChannel(msg);
  });
  // create channel and add media to it
  socket.on('addnewchannel', function (msg) {
    // msg[0] is media directory and [1] is new channel name
    if (msg[1].length > 0) {
      // create channel
      media.createChannel(msg[1], () => {
        // add media to channel
        media.createConnection(msg, () => {
          // get updated list of channels from db
          media.loadChannelList({}, function (elements) {
            // send updated channel list back to client
            io.emit('channellist', elements);
            // load updated media item and send back to client
            media.loadMediaItem(msg[0], updatedMediaItem => {
              io.emit('updatemediaitem', updatedMediaItem);
            });
          });  
        });
      });
    } else {
      console.log(`error adding new channel: name too short`);
    }
  });
  // delete connection
  socket.on('deleteconnection', function (msg) {
    media.deleteConnection(msg);
  });
  // create connection
  socket.on('createconnection', function (msg) {
    media.createConnection(msg);
  });
  // get logs
  socket.on('getlogs', function () {
    media.getLogs(function (logs) {
      io.emit('getlogs', logs);
    });
  });
  // restart component
  socket.on('restartservice', function (msg) {
    media.restartService(msg);
  });
  // shutdown/reboot system
  socket.on('systempower', function (msg) {
    media.systemPower(msg);
  });
});

// events from media.js

// send media item to clients
media.eventEmitter.on('addmediaitem', function (mediaItem) {
  io.emit('addmediaitem', mediaItem);
});