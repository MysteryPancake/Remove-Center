"use strict";

var source;
var canvas;
var player;
var sample;
var context;
var processor;
var frame = 0;
var textSize = 1;
var fileName = "output";
var text = "DROP STEREO AUDIO HERE!";
var formatNags = ["AUDIO FILES PLEASE!", "I SAID AUDIO!", "PLEASE, AUDIO!", "AUDIO ONLY!"];
var stereoNags = ["STEREO AUDIO PLEASE!", "I SAID STEREO!", "PLEASE, STEREO!", "STEREO ONLY!", "NOT MONO! STEREO!"];
var requestFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(e) { return window.setTimeout(e, 1000 / 60); };
var cancelFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.oCancelAnimationFrame || window.msCancelAnimationFrame || function(id) { window.clearTimeout(id); };

function setup() {
	canvas = document.getElementById("canvas");
	context = canvas.getContext("2d", { alpha: false });
	window.addEventListener("resize", resize);
	window.addEventListener("orientationchange", resize);
	resize();
	window.addEventListener("dragenter", drag);
	window.addEventListener("dragover", drag);
	window.addEventListener("drop", drop);
	if (window.ontouchstart) {
		window.addEventListener("touchstart", clicked);
	} else {
		window.addEventListener("mousedown", clicked);
	}
	player = new (window.AudioContext || window.webkitAudioContext)();
	processor = player.createScriptProcessor(2048, 2, 1);
	processor.onaudioprocess = function(e) {
		var left = e.inputBuffer.getChannelData(0);
		var right = e.inputBuffer.getChannelData(1);
		var output = e.outputBuffer.getChannelData(0);
		for (var i = 0; i < left.length; i++) {
			output[i] = left[i] - right[i];
		}
		sample = output.slice();
	};
}

function resize() {
	cancelFrame(frame);
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	frame = requestFrame(draw);
}

function decode(file) {
	if (file.type.startsWith("audio") || file.type.startsWith("video")) {
		var reader = new FileReader();
		reader.onload = function() {
			text = "THANKS!";
			player.decodeAudioData(this.result, function(buffer) {
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
					fileName = file.name.replace(/\.[^/.]+$/, "");
				} else {
					text = stereoNags[Math.floor(Math.random() * stereoNags.length)];
					textSize = 1;
				}
			});
		};
		reader.readAsArrayBuffer(file);
	} else {
		text = formatNags[Math.floor(Math.random() * formatNags.length)];
		textSize = 1;
	}
}

function drag(e) {
	e.preventDefault();
	e.dataTransfer.dropEffect = "copy";
}

function drop(e) {
	e.preventDefault();
	if (e.dataTransfer && e.dataTransfer.files) {
		decode(e.dataTransfer.files[0]);
	}
}

function writeString(view, offset, str) {
	for (var i = 0; i < str.length; i++) {
		view.setUint8(offset + i, str.charCodeAt(i));
	}
}

function removeCenter(input, output, offset) {
	var left = input.getChannelData(0);
	var right = input.getChannelData(1);
	for (var i = 0; i < left.length; i++, offset += 2) {
		var s = Math.max(-1, Math.min(1, left[i] - right[i]));
		output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
	}
}

function clicked(e) {
	e.preventDefault();
	if (source) {
		var data = source.buffer;
		var buffer = new ArrayBuffer(44 + data.length * 2);
		var view = new DataView(buffer);
		writeString(view, 0, "RIFF");
		view.setUint32(4, 36 + data.length * 2, true);
		writeString(view, 8, "WAVE");
		writeString(view, 12, "fmt ");
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, 1, true);
		view.setUint32(24, data.sampleRate, true);
		view.setUint32(28, data.sampleRate * 2, true);
		view.setUint16(32, 2, true);
		view.setUint16(34, 16, true);
		writeString(view, 36, "data");
		view.setUint32(40, data.length * 2, true);
		removeCenter(data, view, 44);
		var blob = new Blob([view], { type: "audio/wav" });
		var url = window.URL.createObjectURL(blob);
		var download = document.getElementById("download");
		download.href = url;
		download.download = fileName + ".wav";
		download.click();
		window.URL.revokeObjectURL(url);
	} else {
		document.getElementById("file").click();
	}
}

function upload(e) {
	decode(e.files[0]);
}

function draw() {
	context.fillStyle = "black";
	context.fillRect(0, 0, canvas.width, canvas.height);
	if (sample) {
		var lines = 256;
		var key = Math.floor(sample.length / lines);
		context.save();
		context.lineWidth = 2;
		context.strokeStyle = "white";
		context.translate(0, canvas.height * 0.5);
		context.beginPath();
		for (var i = 0; i < lines; i++) {
			var x = i * canvas.width / lines;
			var y = 2 + sample[Math.floor(i * key)] * canvas.height * 0.5;
			context.moveTo(x, y);
			context.lineTo(x, -y);
		}
		context.stroke();
		context.restore();
	} else {
		context.fillStyle = "white";
		context.textAlign = "center";
		context.textBaseline = "middle";
		context.font = canvas.width * textSize + "px Arial";
		context.fillText(text, canvas.width * 0.5, canvas.height * 0.5);
		if (textSize > 0.05) {
			textSize -= 0.05;
		}
	}
	frame = requestFrame(draw);
}
