// --------------------------------------------------------------------------
// Sequencer API
// This section defines the main API that will be used for playing and looping
// each sound at specific durations on user configured beats.
// --------------------------------------------------------------------------

// Sound is just a wrapper around the standard JS Audio object. Wrapping it
// allows us to decide how it will start and stop on our own terms,
// specifically facilitating the idea of looping a sound
class Sound {
  constructor (url, name, rate = 1) {
    this.audio = new Audio(url)
    this.rate = rate
    this.name = name
  }

  set rate (rate) {
    this.audio.playbackRate = rate
  }

  set volume (volume) {
    this.audio.volume = volume
  }

  stop () {
    // If we just start and stop at full volume, we need to first set the
    // volume to 0 to reduce / elminate audio artifact caused by truncating a
    // soundwave mid-cycle.  Apparently `AudioContext` has more fine grained
    // controls for gain, so consider using that in the future.
    this.volume = 0
    this.audio.pause()
    this.audio.currentTime = 0
  }

  play (duration = 1000, volume = 1) {
    this.volume = volume
    this.audio.play()
    // 10ms shouldn't be observable to anyone and will prevent that Audio interface
    // from tripping over itself (trying to play when we've already issued a stop)
    // since that entire interface is async
    setTimeout(() => this.stop(), duration - 10)
  }
}

// The Channel object is just a bit map representing each beat / sub-beat
// for a sound to be played and looped on.
class Channel {
  constructor (sound, sequence = new Array(16).fill(0), bpm = 120) {
    this.sound = sound
    this.sequence = sequence
    this.beat = 0
    this.bpm = bpm
    this.events = []
  }

  set bpm (bpm) {
    // Not knowing exactly how most drum sequencers translate time signatures
    // into interface, I took a guess after looking at a couple other
    // sequencers in the wild; we'll divide each beat into 4 sub-beats. This
    // isn't really 4/4 time, but I think a lot of sequencers do this sort of
    // thing to allow syncopation and more complex rhythms. Eventually, I
    // suspect this would be something that should be user configurable
    this.duration = (60 / bpm) * (1000 / 4)

    // The actual audible portion of sounds are ~1s in length, so if we go
    // above 60bpm, play the sound twice as fast so we don't clip so much of
    // the audio. This is hacky; eventually, we would want to use audio files
    // that are trimmed appropriately and then adjust the length of the sounds
    // a bit more intentionally.
    if (bpm > 60) {
      this.sound.rate = 2
    }
  }

  clear () {
    this.sequence = new Array(16).fill(0)
  }

  playBeat () {
    // Set the volume to 0 if there's nothing to play for this channel during
    // the given beat
    if (this.sequence[this.beat]) {
      let eventName = `beat-${this.sound.name}-${this.beat}`
      this.events[this.beat] = this.events[this.beat] || new Event(eventName)
      document.dispatchEvent(this.events[this.beat])
      this.sound.play(this.duration)
    } else {
      this.sound.play(this.duration, 0)
    }

    // Augment the beat position after playing it and loop back to 0 if need be
    this.beat += 1
    if (this.beat >= this.sequence.length) this.beat = 0
  }

  loop () {
    this.interval = setInterval(() => {
      this.playBeat()
    }, this.duration)
  }

  stop () {
    clearInterval(this.interval)
    this.beat = 0
  }
}

// The Sequencer is the orchestrator for each of the channels.
class Sequencer {
  constructor (channels, bpm = 120) {
    this.channels = channels
    this.bpm = bpm
  }

  play () {
    this.channels.forEach(c => c.loop())
  }

  stop () {
    this.channels.forEach(c => c.stop())
  }

  get bpm () {
    return this.__bpm
  }

  set bpm (bpm) {
    this.__bpm = bpm
    this.channels.forEach(c => { c.bpm = bpm })
  }
}

const sounds = [
  'hat', 'kick', 'snare', 'tom', 'hat-open', 'ride', 'sidestick', 'ride-bell'
].map(s => new Sound(`sounds/${s}.wav`, s))

const channels = sounds.map(s => new Channel(s))

const sequencer = new Sequencer(channels)

// We'll load in a pre-defined sequence to get the user started; this is the Afrika
// Bambaataa sequence found here: http://808.pixll.de/anzeigen.php?m=15
sequencer.channels[0].sequence = [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1]
sequencer.channels[1].sequence = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]
sequencer.channels[2].sequence = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
sequencer.channels[7].sequence = [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0]
