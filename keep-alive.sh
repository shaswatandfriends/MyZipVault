#!/bin/bash
# This script keeps the Next.js server alive
cd /home/z/my-project

while true; do
  NODE_OPTIONS="--max-old-space-size=384" node .next/standalone/server.js >> /home/z/my-project/server.log 2>&1
  echo "[$(date)] Server died, restarting..." >> /home/z/my-project/server-restarts.log
  sleep 2
done
