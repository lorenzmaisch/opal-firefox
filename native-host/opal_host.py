#!/usr/bin/python3
"""Opal Firefox Native Messaging Host — reads pre-computed state from the LaunchAgent poller."""
import sys
import json
import struct
from pathlib import Path

STATE_FILE = Path.home() / "Library/Application Support/opal-firefox/state.json"


def read_message():
    raw = sys.stdin.buffer.read(4)
    if not raw or len(raw) < 4:
        return None
    return json.loads(sys.stdin.buffer.read(struct.unpack("=I", raw)[0]))


def send_message(obj):
    encoded = json.dumps(obj).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("=I", len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()


while True:
    msg = read_message()
    if msg is None:
        break
    try:
        state = json.loads(STATE_FILE.read_text())
    except Exception as e:
        state = {"active": False, "domains": [], "categories": [],
                 "allowedDomains": [], "error": f"State file unreadable: {e}"}
    send_message(state)
