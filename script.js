"use strict";

var source;
var canvas;
var player;
var sample;
var context;
var processor;
var frame = 0;
var textSize = 1;
var text = "DROP STEREO AUDIO HERE!";
var formatNags = ["AUDIO FILES PLEASE!", "I SAID AUDIO!", "PLEASE, AUDIO!", "AUDIO ONLY!"];
var stereoNags = ["STEREO AUDIO PLEASE!", "I SAID STEREO!", "PLEASE, STEREO!", "STEREO ONLY!", "NOT MONO! STEREO!"];
var requestFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(e) { return window.setTimeout(e, 1000 / 60); };
var cancelFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.oCancelAnimationFrame || window.msCancelAnimationFrame || function(id) { window.clearTimeout(id); };

function setup() {
	canvas = document.getElementById("canvas");
	context = canvas.getContext("2d", { alpha: false });
	player = new (window.AudioContext || window.webkitAudioContext)();
	processor = player.createScriptProcessor(2048, 2, 1);
	processor.onaudioprocess = function(e) {
		var left = e.inputBuffer.getChannelData(0);
		var right = e.inputBuffer.getChannelData(1);
		var output = e.outputBuffer.getChannelData(0);
		for (var i = 0; i < left.length; i++) {
			output[i] = left[i] - right[i];
		}
		sample = output;
	};
	window.addEventListener("resize", resize);
	window.addEventListener("orientationchange", resize);
	resize();
	window.addEventListener("dragenter", drag);
	window.addEventListener("dragover", drag);
	window.addEventListener("drop", drop);
}

function resize() {
	cancelFrame(frame);
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	frame = requestFrame(draw);
}

function drag(e) {
	e.dataTransfer.dropEffect = "copy";
	e.preventDefault();
}

function drop(e) {
	e.preventDefault();
	if (e.dataTransfer && e.dataTransfer.files) {
		var file = e.dataTransfer.files[0];
		if (file.type.match("audio.*")) {
			var reader = new FileReader();
			reader.onload = function() {
				text = "THANKS!";
				player.decodeAudioData(this.result, function(buffer) {
					play(buffer);
				});
			};
			reader.readAsArrayBuffer(file);
		} else {
			text = formatNags[Math.floor(Math.random() * formatNags.length)];
			textSize = 1;
		}
	}
}

function play(buffer) {
	if (buffer.numberOfChannels === 2) {
		if (source) {
			source.disconnect();
			source.stop();
		}
		source = player.createBufferSource();
		source.buffer = buffer;
		source.connect(processor);
		processor.connect(player.destination);
		source.start();
	} else {
		text = stereoNags[Math.floor(Math.random() * stereoNags.length)];
		textSize = 1;
	}
}

function draw() {
	context.fillStyle = "black";
	context.fillRect(0, 0, canvas.width, canvas.height);
	if (sample) {
		waveform(sample);
	} else {
		context.fillStyle = "white";
		context.textAlign = "center";
		context.font = canvas.width * textSize + "px Arial";
		context.fillText(text, canvas.width * 0.5, canvas.height * 0.5);
		if (textSize > 0.05) {
			textSize -= 0.05;
		}
	}
	frame = requestFrame(draw);
}

function waveform(audio) {
	var lines = 256;
	context.save();
	context.lineWidth = 2;
	context.strokeStyle = "white";
	context.translate(0, canvas.height * 0.5);
	context.beginPath();
	for (var i = 0; i < lines; i++) {
		var x = i * canvas.width / lines;
		var y = 4 + audio[i] * canvas.height;
		context.moveTo(x, y);
		context.lineTo(x, -y);
	}
	context.stroke();
	context.restore();
}
