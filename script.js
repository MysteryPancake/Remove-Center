"use strict";

var source;
var canvas;
var player;
var context;
var frame = 0;
var size = 1;
var text = "DROP STEREO AUDIO HERE!";
var nags = ["STEREO AUDIO PLEASE!", "I SAID STEREO!", "PLEASE, STEREO!", "STEREO ONLY!", "NOT MONO! STEREO!"];
var requestFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(e) { return window.setTimeout(e, 1000 / 60); };
var cancelFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.oCancelAnimationFrame || window.msCancelAnimationFrame || function(id) { window.clearTimeout(id); };

function setup() {
	canvas = document.getElementById("canvas");
	context = canvas.getContext("2d", { alpha: false });
	player = new (window.AudioContext || window.webkitAudioContext)();
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
		var reader = new FileReader();
		reader.onload = function() {
			text = "THANKS!";
			player.decodeAudioData(this.result, function(buffer) {
				play(buffer);
			});
		};
		reader.readAsArrayBuffer(file);
	}
}

function play(buffer) {
	if (buffer.numberOfChannels === 2) {
		var audio = [];
		var left = buffer.getChannelData(0);
		var right = buffer.getChannelData(1);
		for (var i = 0; i < left.length; i++) {
			audio.push(left[i] - right[i]);
		}
		var mono = player.createBuffer(1, buffer.length, buffer.sampleRate);
		mono.getChannelData(0).set(audio);
		if (source) {
			source.stop();
		}
		source = player.createBufferSource();
		source.buffer = mono;
		source.connect(player.destination);
		source.start();
	} else {
		text = nags[Math.floor(Math.random() * nags.length)];
		size = 1;
	}
}

function draw() {
	context.fillStyle = "black";
	context.fillRect(0, 0, canvas.width, canvas.height);
	if (source && source.buffer) {
		waveform(source.buffer.getChannelData(0));
	} else {
		context.fillStyle = "white";
		context.textAlign = "center";
		context.font = canvas.width * size + "px Arial";
		context.fillText(text, canvas.width * 0.5, canvas.height * 0.5);
		if (size > 0.05) {
			size -= 0.05;
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
	var block = Math.floor(audio.length / lines);
	var gap = canvas.width / lines;
	context.beginPath();
	for (var i = 0; i < lines; i++) {
		var key = Math.floor(block * i);
		var x = i * gap;
		var y = 4 + audio[key] * canvas.height * 0.5;
		context.moveTo(x, y);
		context.lineTo(x, -y);
	}
	context.stroke();
	context.restore();
}