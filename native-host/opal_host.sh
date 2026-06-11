#!/bin/bash
echo "started at $(date), PATH=$PATH, USER=$USER" >> "$HOME/Library/Application Support/opal-firefox/opal_host.log"
exec /usr/bin/python3 "$(dirname "$0")/opal_host.py"
