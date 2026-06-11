#!/usr/bin/python3
"""Opal Firefox State Poller — runs as a LaunchAgent with full user permissions.
Reads Opal's Group Container and writes state.json for the native messaging host.
"""
import json, os
from pathlib import Path
from datetime import datetime

CONTAINER  = Path.home() / "Library/Group Containers/UJ5VMXTKY2.group.com.withopal.opal"
BASE       = CONTAINER / "BlockConfig"
STATE_FILE = Path.home() / "Library/Application Support/opal-firefox/state.json"
APPLE_EPOCH = 978307200


def opal_day(dt):
    return 1 if dt.isoweekday() == 7 else dt.isoweekday() + 1


def in_time_range(now, start, end):
    cur = now.hour * 60 + now.minute
    return (start.get("hour", 0) * 60 + start.get("minute", 0)
            <= cur <
            end.get("hour", 23) * 60 + end.get("minute", 59))


def check_session():
    """Returns (active, name) for a manual timer session."""
    # Try the dynamic session files first (full access from LaunchAgent)
    sessions_dir = CONTAINER / "Blocking/Sessions"
    if sessions_dir.exists():
        now_unix = datetime.now().timestamp()
        for name in os.listdir(sessions_dir):
            if not name.endswith(".json"):
                continue
            try:
                d = json.loads((sessions_dir / name).read_text())
                created  = d.get("creationDate", 0) + APPLE_EPOCH
                duration = d.get("duration", 0)
                if d.get("isAlwaysOn") or (duration > 0 and now_unix < created + duration):
                    return True, d.get("name", "Focus Session")
            except Exception:
                pass

    # Fall back to sessionConfiguration.dat
    path = BASE / "sessionConfiguration.dat"
    if path.exists():
        try:
            cfg = json.loads(path.read_text())
            if cfg.get("isAlwaysOn"):
                return True, "Focus Session"
            created  = cfg.get("creationDate", 0) + APPLE_EPOCH
            duration = cfg.get("duration", 0)
            if duration > 0 and datetime.now().timestamp() < created + duration:
                return True, "Focus Session"
        except Exception:
            pass

    return False, None


def check_schedule():
    """Returns (active, name) for a scheduled block."""
    schedules_dir = CONTAINER / "Blocking/Schedules"
    if schedules_dir.exists():
        now = datetime.now()
        today = opal_day(now)
        for name in os.listdir(schedules_dir):
            if not name.endswith(".json"):
                continue
            try:
                d = json.loads((schedules_dir / name).read_text())
                if today not in d.get("repeatDays", []):
                    continue
                t = d.get("time", {})
                if in_time_range(now, t.get("startTime", {}), t.get("endTime", {})):
                    label = (d.get("emoji", "") + " " + d.get("name", "")).strip()
                    return True, label or "Scheduled Block"
            except Exception:
                pass

    # Fall back to scheduleConfiguration.dat (no name available)
    path = BASE / "scheduleConfiguration.dat"
    if path.exists():
        try:
            cfg = json.loads(path.read_text())
            now = datetime.now()
            if opal_day(now) not in cfg.get("repeatDays", []):
                return False, None
            tr = cfg.get("timeRange", cfg.get("time", {}))
            if in_time_range(now, tr.get("startTime", {}), tr.get("endTime", {})):
                return True, "Scheduled Block"
        except Exception:
            pass

    return False, None


def get_block_content():
    path = BASE / "blockingContent.dat"
    if not path.exists():
        return [], [], []
    cfg = json.loads(path.read_text())
    domains, categories, allowed = [], [], []
    for bl in cfg.get("shieldedContent", {}).get("blocklist", []):
        for wt in bl.get("websiteTokens", []):
            d = wt.get("website", {}).get("domain")
            if d and d not in domains:
                domains.append(d)
        for ct in bl.get("categoryTokens", []):
            cid = ct.get("id")
            if cid and cid not in categories:
                categories.append(cid)
    for wt in cfg.get("alwaysAllowedContent", {}).get("websiteTokens", []):
        d = wt.get("website", {}).get("domain")
        if d:
            allowed.append(d)
    return domains, categories, allowed


try:
    session_active, session_name   = check_session()
    schedule_active, schedule_name = check_schedule()
    active = session_active or schedule_active
    name   = session_name or schedule_name or None
    domains, categories, allowed = get_block_content() if active else ([], [], [])
    state = {"active": active, "sessionName": name,
             "domains": domains, "categories": categories, "allowedDomains": allowed}
except Exception as e:
    state = {"active": False, "sessionName": None, "domains": [],
             "categories": [], "allowedDomains": [], "error": str(e)}

STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
STATE_FILE.write_text(json.dumps(state))
