#!/bin/bash
# BattleMesh Development Script
# Usage: ./dev.sh [nodes]
# Example: ./dev.sh 3    (starts 1 admin + 3 capture nodes)

NODES=${1:-1}

cleanup() {
  # Disable trap to prevent re-entry
  trap - INT TERM
  
  # Kill all background jobs and their children
  jobs -p | xargs -r kill -TERM 2>/dev/null
  
  # Give processes a moment to terminate gracefully
  sleep 0.2
  
  # Force kill any remaining processes
  jobs -p | xargs -r kill -KILL 2>/dev/null
  
  exit 0
}
trap cleanup INT TERM

echo "🎮 BattleMesh: 1 admin + $NODES capture node(s)"
echo "Admin: http://localhost:3000"

NUXT_PUBLIC_NODE_MODE=admin PORT=3000 LOAD_PREVIOUS_STATE=true npm run dev &
sleep 2

for i in $(seq 1 $NODES); do
  PORT=$((3000 + i))
  echo "Node $i: http://localhost:$PORT"
  PORT=$PORT \
  NUXT_PUBLIC_NODE_MODE=capture-point \
  NUXT_PUBLIC_ADMIN_URL=ws://localhost:3000/api/websocket \
  npm run dev &
  
  # Small delay to prevent build race conditions
  sleep 1
done

echo "Press Ctrl+C to stop"
wait

