/*
 * Copyright (c) 2013, Intel Corporation.
 *
 * This program is licensed under the terms and conditions of the
 * Apache License, version 2.0.  The full text of the Apache License is at
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 */
define(['stapes'], function (Stapes) {
  'use strict';

  var Sound = function (file) {
    var self = this;

    this.ready = false;
    this.isPlaying = false;

    this.audio = new Audio(file);
    this.audio.autoplay = false;
    this.audio.buffer = true;

    this.audio.addEventListener('canplay', function () {
      self.ready = true;
      self.emit('ready');
    });

    this.audio.addEventListener('pause', function () {
      self.audio.currentTime = 0;
      self.isPlaying = false;
    });

    this.audio.addEventListener('play', function () {
      self.isPlaying = true;
    });

    Stapes.mixinEvents(this);
  };

  Sound.prototype.play = function () {
    if (this.ready && !this.isPlaying) {
      this.audio.play();
    }
  };

  Sound.prototype.stop = function () {
    if (this.ready && this.isPlaying) {
      this.audio.pause();
    }
  };

  return Sound;
});
