var fs = require('fs');

/**
 * Set sketch player LED coord mapping
 */
exports.map_positions = function (req, res) {
    // get new led map from HTTP post body
    const newLeds = JSON.parse(req.body.leds);
    // duplicate new led map into hyperion format
    const newConfig = Array();
    for (var i = 0; i < newLeds.leds.length; i++) {
        var newConf = {
            index: i,
            hscan: {
                mininum: newLeds.leds[i].x,
                maximum: (newLeds.leds[i].x + 0.1111)
            },
            vscan: {
                mininum: newLeds.leds[i].y,
                maximum: (newLeds.leds[i].y + 0.1111)
            }
        };
        newConfig.push(newConf);
    }
    // create config directory if doesnt exist
    if (!fs.existsSync(res.locals.configStaticPath)) {
        console.log('creating config directory');
        fs.mkdirSync(res.locals.configStaticPath);
    }

    // read hyperion config template then add new led coords and save
    fs.readFile('./libs/controller/hyperion_segments/hyperion.template.json', function (err, data) {
        if (err) {
            console.log('wefaf' + err);
            return res.apiError({
                success: false,
                note: 'could not read config template (hyperion json)'
            });
        }
        try {
            // save new hyperion config
            const ledConfig = JSON.parse(data);
            ledConfig.leds = newConfig;
            const jsonLedConfig = JSON.stringify(ledConfig, null, 2);
            fs.writeFile(res.locals.configStaticPath + 'hyperion.config.json', jsonLedConfig, 'utf8', (fserr) => {
                if (fserr) {
                    console.log(fserr);
                    res.apiResponse({
                        success: false,
                        note: 'Error saving file...',
                        error: fserr
                    });
                } else {
                    // save new leds.json
                    const jsonNewLeds = JSON.stringify(newLeds, null, 2);
                    fs.writeFile(res.locals.configStaticPath + 'leds.json', jsonNewLeds, 'utf8', (fserr) => {
                        if (fserr) {
                            console.log(fserr);
                            res.apiResponse({
                                success: false,
                                note: 'Error saving file...',
                                error: fserr
                            });
                        } else {
                            console.log('File saved');
                        }
                    });
                    console.log('File saved');
                }
            });
            return res.apiResponse({
                success: true
            });
        } catch (exception) {
            console.log('wedwddfaf' + exception);
            return res.apiError({
                success: false
            });
        }
    });
    // console.log(ledConfig);
    // if (!isDplayerConnected) {
    // 	console.log('no');

    // 	return res.apiError({
    // 		success: false
    // 	});

    // } else {
    // 	console.log('yes');

    // 	return res.apiResponse({
    // 		success: true
    // 	});
    // }
};

/**
 * Setup LED output configuration
 */
exports.config_arduino = function (req, res) {

    // get request body from HTTP post
    var config = {
        "ledcount": parseInt(req.body.numLeds, 10),
        "chipset": req.body.ledChip,
        "order": req.body.ledOrder,
        "platform": req.body.boardType,
        "datapin": req.body.dataPin
    };
    if (req.body.clockPin) {
        config.clockpin = req.body.clockPin;
    }

    // create config directory if doesnt exist
    if (!fs.existsSync(res.locals.configStaticPath)) {
        console.log('creating config directory');
        fs.mkdirSync(res.locals.configStaticPath);
    }
    // write config file
    fs.writeFile(res.locals.configStaticPath + 'setup.json', JSON.stringify(config, null, 4), 'utf8', function (err) {
        if (err) {
            console.log('error saving setup json' + err);
            return res.apiError({
                success: false,
                note: 'couldnt save setup json'
            });
        } else {
            console.log('saved setup config json');
        }
    });
    // check if arduino is installed
    var commandExists = require('command-exists');
    commandExists('arduino', function (err, commandExists) {
        if (!commandExists) {
            console.log('arduino not available');
            return res.apiError({
                success: false,
                note: 'arduino not available'
            });
        } else {

            // if(moduleAvailable('arduino')){
            // 	console.log('arduino available');
            // return res.apiResponse({
            // 	success: true
            // });
            // }else{
            // console.log('arduino not available');
            // return res.apiError({
            // 	success: false,
            // 	note: 'arduino not available'
            // });
            // }

            // setup arduino
            // if (true) {
            // construct arduino file
            fs.writeFile("./libs/controller/arduino_segments/form_setup.ino", '#include "FastLED.h"\n', function (err) {
                if (err) {
                    console.log('error starting arduino file');
                    console.log(err);
                    return res.apiError({
                        success: false,
                        note: 'could not write arduino file'
                    });
                }
                var define1 = '#define DATA_PIN ' + req.body.dataPin + '\n';
                var define3 = '#define NUM_LEDS ' + req.body.numLeds + '\n';
                var define4 = '#define COLOR_ORDER ' + req.body.ledOrder + '\n';
                var define5 = '#define LED_TYPE ' + req.body.ledChip + '\n';
                var defines;
                if (!req.body.clockPin) {
                    defines = define1.concat(define3, define4, define5);
                } else if (req.body.clockPin) {
                    var define2 = '#define CLOCK_PIN ' + req.body.clockPin + '\n';
                    defines = define1.concat(define2, define3, define4, define5);
                }
                fs.appendFile("./libs/controller/arduino_segments/form_setup.ino", defines, function (err) {
                    if (err) {
                        console.log('error adding defines to arduino file');
                        console.log(err);
                        return res.apiError({
                            success: false,
                            note: 'could not input settings to arduino file'
                        });
                    }
                    fs.readFile("./libs/controller/arduino_segments/template.txt", (err, contents) => {
                        if (err) {
                            console.log('error reading template arduino file');
                            console.log(err);
                            return res.apiError({
                                success: false,
                                note: 'could not read arduino template file'
                            });
                        }
                        fs.appendFile("./libs/controller/arduino_segments/form_setup.ino", contents, function (err) {
                            if (err) {
                                console.log('error adding arduino template to file');
                                console.log(err);
                                return res.apiError({
                                    success: false,
                                    note: 'could not add arduino template to file'
                                });
                            }
                            console.log('finished creating arduino file!');
                            // compile and upload new arduino file
                            const exec = require('child_process').exec;
                            console.log('starting arduino compile & upload');
                            var syncArduino = exec('./libs/controller/arduino_segments/compileupload.sh', (err, stdout, stderr) => {
                                console.log('out: ' + `${stdout}`);
                                console.log('errors:' + `${stderr}`);
                                if (err !== null) {
                                    console.log(`exec error: ${error}`);
                                    return res.apiError({
                                        success: false,
                                        note: 'could not run arduino compile and upload script'
                                    });
                                } // ref: https://stackoverflow.com/a/44667294
                                if (!err) {
                                    console.log('no erroi');
                                    return res.apiResponse({
                                        success: true,
                                        note: 'settings for arduino compiled and uploaded'
                                    });
                                } else {
                                    console.log('errors');
                                    return res.apiError({
                                        success: false,
                                        note: 'could not run arduino compile and upload script'
                                    });
                                }
                            });

                        });
                    });
                });
            });
        }
    });

    // return res.apiResponse({
    // 	success: true
    // });

    // if (!isDplayerConnected) {
    // 	console.log('player error: player not connected');

    // 	return res.apiError({
    // 		success: false
    // 	});

    // } else {
    // 	console.log('player is connected');

    // 	return res.apiResponse({
    // 		success: true
    // 	});
    // }
};

const net = require('net');
/**
 * Set hyperion brightness
 */
exports.set_brightness = function (req, res) {

    var val = parseFloat(req.params.val);

    var jsonCommand = {
        command: "transform",
        transform: {
            luminanceGain: val
        }
    };

    var client = new net.Socket();
    client.setTimeout(1500);
    client.connect(19444, 'localhost', function () {
        console.log('Connected');
        const string = JSON.stringify(jsonCommand) + "\n";
        client.write(string);
    });

    client.on('error', (error) => {
        console.log('error setting brightness');
        console.log(error);
        return res.apiResponse({
            error: error
        });
    });

    client.on('data', function (data) {
        console.log('Received: ' + data);
        client.destroy(); // kill client after server's response
        res.apiResponse({
            success: true,
            response: data
        });
    });

    // hyperion.getOn((error, response) => {
    // 	if (error) {
    // 		console.log('error setting hyperion brightness - no connection?');
    // 		console.log(error);
    // 		return res.apiResponse({
    // 			error: error
    // 		})
    // 	}

    // 	const col = hyperion.color.rgb(val, val, val);
    // 	hyperion.setBrightness(col.value(), (error, response) => {
    // 		if (error) {
    // 			console.log('error setting hyperion brightness - no connection?');
    // 			console.log(error);
    // 			return res.apiResponse({
    // 				error: error
    // 			})
    // 		}
    // 		res.apiResponse({
    // 			success: true,
    // 			response: response
    // 		})
    // 	})
    // })
};