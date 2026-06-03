#!/bin/bash
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=384"
export PORT=3000
export HOSTNAME=0.0.0.0

# Write PID file
echo $$ > /home/z/my-project/server.pid

# Keep trying to restart if it dies
while true; do
  node .next/standalone/server.js
  echo "Server died at $(date), restarting in 3s..." >> /home/z/my-project/server-restarts.log
  sleep 3
done
