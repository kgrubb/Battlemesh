let nextEventId = 1
const clients = new Set()
let tickInterval = null

const createPublicState = (state) => ({
  teams: state.teams,
  capturePoints: state.capturePoints,
  gameActive: state.gameActive,
  gameStartTime: state.gameStartTime,
  activityFeed: state.activityFeed,
  nodes: state.nodes
})

function startTick(getStateFn) {
  if (tickInterval) return
  tickInterval = setInterval(() => {
    try {
      if (!getStateFn) return
      publish('state', createPublicState(getStateFn()))
    } catch {
      // Ignore tick errors
    }
  }, 1000)
}

export function subscribe(event) {
  const { req, res, getState } = event
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  res.write(': connected\n\n')

  try {
    send(res, 'state', createPublicState(getState()))
  } catch {
    // Ignore send errors
  }

  const hb = setInterval(() => {
    try {
      res.write(': hb\n\n')
    } catch {
      // Ignore heartbeat errors
    }
  }, 20000)

  const client = { res, hb }
  clients.add(client)
  startTick(getState)
  req.on('close', () => close(client))
}

export function close(client) {
  if (!client) return
  try {
    clearInterval(client.hb)
    client.res.end()
  } catch {
    // Ignore close errors
  }
  clients.delete(client)
}

function send(res, event, payload) {
  const id = nextEventId++
  const data = JSON.stringify(payload)
  res.write(`id: ${id}\n`)
  res.write(`event: ${event}\n`)
  res.write(`data: ${data}\n\n`)
}

export function publish(event, payload) {
  for (const client of clients) {
    try {
      send(client.res, event, payload)
    } catch {
      close(client)
    }
  }
}

export function publishState(state) {
  publish('state', createPublicState(state))
}


