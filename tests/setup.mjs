/* eslint-disable no-undef */
// Mock Web APIs that aren't available in test environment

global.navigator = {
  ...global.navigator,
  bluetooth: {
    requestDevice: vi.fn()
  },
  serial: {
    requestPort: vi.fn()
  },
  geolocation: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(() => 1),
    clearWatch: vi.fn()
  },
  vibrate: vi.fn()
}

global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 0
    setTimeout(() => {
      this.readyState = 1
      if (this.onopen) this.onopen()
    }, 0)
  }
  
  send() {}
  close() {
    this.readyState = 3
    if (this.onclose) this.onclose()
  }
}

