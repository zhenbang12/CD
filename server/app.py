#!/usr/bin/env python3
"""
EcoHotel OS - Unified Backend & Static File Server
Serves Web Dashboard static assets (index.html, js/, css/) on port 8000
and provides shared REST API + Server-Sent Events (SSE) for real-time
two-way synchronization between Web PWA and Flutter Mobile App.
"""

import os
import sys
import json
import time
import queue
import random
import threading
from urllib.parse import urlparse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
INITIAL_DATA_FILE = os.path.join(DATA_DIR, 'initial_data.json')
DB_FILE = os.path.join(DATA_DIR, 'hotel_db.json')

# Thread-safe database state
db_lock = threading.Lock()
db_state = {}

# Active SSE client queues
sse_clients = []
sse_lock = threading.Lock()

def load_db():
    global db_state
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                db_state = json.load(f)
                print(f"[DB] Loaded database from {DB_FILE}")
                return
        except Exception as e:
            print(f"[DB] Error reading {DB_FILE}: {e}")

    if os.path.exists(INITIAL_DATA_FILE):
        with open(INITIAL_DATA_FILE, 'r', encoding='utf-8') as f:
            db_state = json.load(f)
            save_db()
            print(f"[DB] Initialized database from {INITIAL_DATA_FILE}")
    else:
        db_state = {"rooms": [], "ecoVouchers": [], "repairTickets": [], "utilityMeters": []}
        save_db()

def save_db():
    try:
        tmp_file = DB_FILE + ".tmp"
        with open(tmp_file, 'w', encoding='utf-8') as f:
            json.dump(db_state, f, indent=2)
        os.replace(tmp_file, DB_FILE)
    except Exception as e:
        print(f"[DB] Failed to save database: {e}")

def broadcast_event(event_type, payload):
    message = json.dumps({"type": event_type, "payload": payload, "timestamp": time.time()})
    with sse_lock:
        stale = []
        for q in sse_clients:
            try:
                q.put_nowait(message)
            except Exception:
                stale.append(q)
        for q in stale:
            if q in sse_clients:
                sse_clients.remove(q)

class EcoHotelHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS for Flutter Web / Mobile clients
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == '/api/events':
            self.handle_sse()
            return
        elif path == '/api/db':
            with db_lock:
                self.send_json_response(200, db_state)
            return
        elif path == '/api/rooms':
            with db_lock:
                rooms = db_state.get('rooms', [])
                self.send_json_response(200, {"rooms": rooms})
            return
        elif path == '/api/vouchers':
            with db_lock:
                vouchers = db_state.get('ecoVouchers', [])
                self.send_json_response(200, {"vouchers": vouchers})
            return
        elif path == '/api/defects':
            with db_lock:
                tickets = db_state.get('repairTickets', [])
                self.send_json_response(200, {"tickets": tickets})
            return
        elif path == '/api/meters':
            with db_lock:
                meters = db_state.get('utilityMeters', [])
                self.send_json_response(200, {"meters": meters})
            return
        elif path == '/api/interactions':
            with db_lock:
                interactions = db_state.get('guestInteractions', [])
                self.send_json_response(200, {"interactions": interactions})
            return
        elif path == '/api/health':
            self.send_json_response(200, {"status": "ok", "service": "EcoHotel OS API", "time": time.time()})
            return

        # Otherwise serve static files from BASE_DIR
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.read_json_body()

        if path == '/api/rooms/preference':
            self.handle_room_preference(body)
        elif path == '/api/rooms/status':
            self.handle_room_status(body)
        elif path == '/api/rooms/override':
            self.handle_room_override(body)
        elif path == '/api/vouchers/claim':
            self.handle_voucher_claim(body)
        elif path == '/api/vouchers/redeem':
            self.handle_voucher_redeem(body)
        elif path == '/api/defects':
            self.handle_create_defect(body)
        elif path == '/api/meters/reading':
            self.handle_meter_reading(body)
        elif path == '/api/interactions':
            self.handle_create_interaction(body)
        elif path == '/api/sync':
            self.handle_bulk_sync(body)
        else:
            self.send_json_response(404, {"error": "Not Found", "path": path})

    def read_json_body(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length == 0:
                return {}
            raw = self.rfile.read(length).decode('utf-8')
            return json.loads(raw)
        except Exception as e:
            print(f"[API] Error parsing body: {e}")
            return {}

    def send_json_response(self, code, data):
        payload = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def handle_sse(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()

        client_queue = queue.Queue(maxsize=100)
        with sse_lock:
            sse_clients.append(client_queue)

        # Send initial connection event
        try:
            self.wfile.write(b"data: {\"type\": \"connected\"}\n\n")
            self.wfile.flush()
        except Exception:
            return

        try:
            while True:
                try:
                    msg = client_queue.get(timeout=20.0)
                    self.wfile.write(f"data: {msg}\n\n".encode('utf-8'))
                    self.wfile.flush()
                except queue.Empty:
                    # Keep-alive heartbeat comment
                    self.wfile.write(b": heartbeat\n\n")
                    self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
            pass
        finally:
            with sse_lock:
                if client_queue in sse_clients:
                    sse_clients.remove(client_queue)

    def handle_room_preference(self, body):
        room_number = str(body.get('roomNumber', ''))
        pref = body.get('servicePreference', 'STANDARD')
        towel = bool(body.get('towelReuse', False))
        linen_days = int(body.get('linenDelayDays', 0))

        with db_lock:
            rooms = db_state.setdefault('rooms', [])
            room = next((r for r in rooms if str(r.get('roomNumber')) == room_number), None)
            if not room:
                self.send_json_response(404, {"error": f"Room {room_number} not found"})
                return

            room['servicePreference'] = pref
            room['towelReuse'] = towel
            room['linenDelayDays'] = linen_days

            if 'choiceConfirmedAt' in body:
                room['choiceConfirmedAt'] = body['choiceConfirmedAt']
            if 'isChoiceLocked' in body:
                room['isChoiceLocked'] = body['isChoiceLocked']

            if pref == 'OPT_OUT_CLEANING':
                room['cleaningStatus'] = 'Skipped (Opt-Out)'
            elif pref == 'LINEN_DELAY':
                room['cleaningStatus'] = 'Light Service Only'
            else:
                room['cleaningStatus'] = 'Active Clean List'

            # Standardized baseline historical points per room
            base_points_map = {
                '101': 0, '102': 0, '103': 0, '201': 0, '202': 10,
                '203': 0, '301': 0, '302': 0, '303': 0, '304': 5
            }
            base = base_points_map.get(room_number, 0)

            # Recalculate today's eco-points
            today_pts = 0
            if pref == 'OPT_OUT_CLEANING':
                today_pts += 15
            elif pref == 'LINEN_DELAY':
                today_pts += (12 if linen_days >= 3 else 10)
            if towel:
                today_pts += 5

            room['ecoPointsEarned'] = base + today_pts

            # Record Guest Interaction Log (Deduplicated within 60 seconds)
            action_desc = f"Selected {pref.replace('_', ' ').title()}{' + Towel Reuse' if towel else ''}"
            now_iso = time.strftime('%Y-%m-%d %H:%M:%S')
            interactions = db_state.setdefault('guestInteractions', [])
            
            recent_duplicate = next(
                (i for i in interactions[:10]
                 if str(i.get('roomNumber')) == room_number
                 and i.get('action') == 'PWA_SERVICE_SELECTION'
                 and i.get('details') == action_desc
                 and i.get('timestamp', '')[:16] == now_iso[:16]),
                None
            )
            new_log = None
            if not recent_duplicate:
                new_log = {
                    "id": f"GIL-{int(time.time() * 1000) % 100000:04d}",
                    "roomNumber": room_number,
                    "timestamp": now_iso,
                    "action": "PWA_SERVICE_SELECTION",
                    "details": action_desc,
                    "pointsEarned": today_pts
                }
                interactions.insert(0, new_log)

            # Log guest interaction for this preference change
            import time as _time
            interaction = {
                "id": f"GIL-{int(_time.time() * 1000) % 100000}",
                "roomNumber": room_number,
                "timestamp": _time.strftime('%Y-%m-%d %H:%M:%S'),
                "action": "PWA_SERVICE_SELECTION",
                "details": f"Selected {pref}{' + Towel Reuse' if towel else ''}",
                "pointsEarned": today_pts,
                "source": "mobile"
            }
            interactions = db_state.setdefault('guestInteractions', [])
            interactions.insert(0, interaction)

            save_db()
            broadcast_event('room_updated', room)
            if new_log:
                broadcast_event('interaction_logged', new_log)

        self.send_json_response(200, {"success": True, "room": room, "interaction": new_log})

    def handle_room_status(self, body):
        room_number = str(body.get('roomNumber', ''))
        status = body.get('cleaningStatus', 'Active Clean List')

        with db_lock:
            rooms = db_state.setdefault('rooms', [])
            room = next((r for r in rooms if str(r.get('roomNumber')) == room_number), None)
            if not room:
                self.send_json_response(404, {"error": f"Room {room_number} not found"})
                return

            room['cleaningStatus'] = status
            save_db()
            broadcast_event('room_updated', room)

        self.send_json_response(200, {"success": True, "room": room})

    def handle_room_override(self, body):
        room_number = str(body.get('roomNumber', ''))
        reason = body.get('reason', 'Supervisor Override')

        with db_lock:
            rooms = db_state.setdefault('rooms', [])
            room = next((r for r in rooms if str(r.get('roomNumber')) == room_number), None)
            if not room:
                self.send_json_response(404, {"error": f"Room {room_number} not found"})
                return

            room['servicePreference'] = 'OVERRIDDEN'
            room['cleaningStatus'] = 'Active Clean List'
            room['overrideReason'] = reason

            # Log Supervisor Override
            now_iso = time.strftime('%Y-%m-%d %H:%M:%S')
            interactions = db_state.setdefault('guestInteractions', [])
            log_entry = {
                "id": f"GIL-{int(time.time() * 1000) % 100000:04d}",
                "roomNumber": room_number,
                "timestamp": now_iso,
                "action": "SUPERVISOR_OVERRIDE",
                "details": f"Reinstated to active clean list: {reason}",
                "pointsEarned": 0
            }
            interactions.insert(0, log_entry)

            save_db()
            broadcast_event('room_updated', room)
            broadcast_event('interaction_logged', log_entry)

        self.send_json_response(200, {"success": True, "room": room})

    def handle_voucher_claim(self, body):
        room_number = str(body.get('roomNumber', ''))
        tier_key = body.get('tierKey', '')

        tiers = {
            'tier-dining': {'title': '15% Farm-to-Table Dining Voucher', 'cost': 25, 'desc': 'Valid at Ocean Reef Bistro.', 'prefix': 'VM26-ECO'},
            'tier-geopark': {'title': 'Langkawi UNESCO Geopark Mangrove Pass', 'cost': 30, 'desc': 'Zero-emission solar boat eco-safari.', 'prefix': 'VM26-TRP'},
            'tier-canopy': {'title': 'Rainforest Canopy Walk & Eco-Trek', 'cost': 45, 'desc': 'Guided rainforest eco-trek.', 'prefix': 'VM26-SAF'}
        }
        tier = tiers.get(tier_key)
        if not tier:
            self.send_json_response(400, {"error": "Invalid reward tier"})
            return

        with db_lock:
            rooms = db_state.setdefault('rooms', [])
            room = next((r for r in rooms if str(r.get('roomNumber')) == room_number), None)
            if not room:
                self.send_json_response(404, {"error": f"Room {room_number} not found"})
                return

            cost = tier['cost']
            # Milestone Validation: cumulative ecoPointsEarned must reach the milestone cost
            if room.get('ecoPointsEarned', 0) < cost:
                self.send_json_response(400, {"error": f"Milestone requires {cost} points (Current balance: {room.get('ecoPointsEarned', 0)})"})
                return

            claimed_tiers = room.setdefault('claimedTiers', [])
            vouchers = db_state.setdefault('ecoVouchers', [])

            # Check if matching voucher already unlocked for this room and tier
            voucher = next(
                (v for v in vouchers
                 if str(v.get('roomNumber')) == room_number and v.get('rewardTitle') == tier['title']),
                None
            )

            if tier_key in claimed_tiers and voucher:
                # Already claimed this milestone tier
                self.send_json_response(200, {"success": True, "voucher": voucher, "room": room, "alreadyClaimed": True})
                return

            if tier_key not in claimed_tiers:
                claimed_tiers.append(tier_key)

            # NOTE: Cumulative milestone system does NOT deduct points from room balance!

            if not voucher:
                client_code = body.get('code')
                voucher_code = client_code if (client_code and not any(v.get('code') == client_code for v in vouchers)) else f"{tier['prefix']}-{random.randint(1000, 9999)}"
                voucher = {
                    "code": voucher_code,
                    "roomNumber": room['roomNumber'],
                    "guestName": room['guestName'],
                    "rewardTitle": tier['title'],
                    "description": tier['desc'],
                    "pointsCost": cost,
                    "issueDate": time.strftime('%Y-%m-%d %H:%M'),
                    "expiryDate": "2026-08-25",
                    "isRedeemed": False
                }
                vouchers.insert(0, voucher)

            # Log Milestone Interaction Event
            now_iso = time.strftime('%Y-%m-%d %H:%M:%S')
            interactions = db_state.setdefault('guestInteractions', [])
            log_entry = {
                "id": f"GIL-{int(time.time() * 1000) % 100000:04d}",
                "roomNumber": room_number,
                "timestamp": now_iso,
                "action": "VOUCHER_UNLOCKED",
                "details": f"Milestone reached ({cost} pts) -> Voucher {voucher['code']} unlocked ({tier['title']})",
                "pointsEarned": 0
            }
            interactions.insert(0, log_entry)

            save_db()
            broadcast_event('voucher_claimed', {"room": room, "voucher": voucher})
            broadcast_event('interaction_logged', log_entry)

        self.send_json_response(200, {"success": True, "voucher": voucher, "room": room})

    def handle_voucher_redeem(self, body):
        code = str(body.get('code', ''))
        with db_lock:
            vouchers = db_state.setdefault('ecoVouchers', [])
            voucher = next((v for v in vouchers if v.get('code') == code), None)
            if not voucher:
                self.send_json_response(404, {"error": f"Voucher {code} not found"})
                return

            voucher['isRedeemed'] = True
            save_db()
            broadcast_event('voucher_redeemed', voucher)

        self.send_json_response(200, {"success": True, "voucher": voucher})

    def handle_create_defect(self, body):
        with db_lock:
            tickets = db_state.setdefault('repairTickets', [])
            ticket = dict(body)
            if 'id' not in ticket:
                ticket['id'] = f"TKT-{int(time.time() * 1000) % 100000}"
            tickets.insert(0, ticket)
            save_db()
            broadcast_event('defect_created', ticket)

        self.send_json_response(200, {"success": True, "ticket": ticket})

    def handle_meter_reading(self, body):
        meter_id = str(body.get('meterId', ''))
        reading = float(body.get('reading', 0.0))

        with db_lock:
            meters = db_state.setdefault('utilityMeters', [])
            meter = next((m for m in meters if m.get('meterId') == meter_id), None)
            if not meter:
                self.send_json_response(404, {"error": f"Meter {meter_id} not found"})
                return

            meter['lastReading'] = reading
            meter['lastReadingTime'] = time.strftime('%Y-%m-%d %H:%M')
            baseline = float(meter.get('baselineDaily', 0.0))
            if baseline > 0 and reading > (baseline * 1.15):
                meter['status'] = 'Anomaly Alert'
            else:
                meter['status'] = 'Normal'

            save_db()
            broadcast_event('meter_updated', meter)

        self.send_json_response(200, {"success": True, "meter": meter})

    def handle_create_interaction(self, body):
        with db_lock:
            interactions = db_state.setdefault('guestInteractions', [])
            interaction = dict(body)
            if 'id' not in interaction:
                interaction['id'] = f"GIL-{int(time.time() * 1000) % 100000}"
            if 'timestamp' not in interaction:
                interaction['timestamp'] = time.strftime('%Y-%m-%d %H:%M:%S')
            interactions.insert(0, interaction)
            save_db()
            broadcast_event('interaction_created', interaction)

        self.send_json_response(200, {"success": True, "interaction": interaction})

    def handle_bulk_sync(self, body):
        with db_lock:
            for key, val in body.items():
                if isinstance(val, (list, dict)):
                    db_state[key] = val
            save_db()
            broadcast_event('bulk_synced', {"keys": list(body.keys())})

        self.send_json_response(200, {"success": True})

def run(primary_port=3000, secondary_port=8000):
    try:
        if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

    load_db()

    servers = []
    ports = [primary_port]
    if secondary_port and secondary_port != primary_port:
        ports.append(secondary_port)

    for p in ports:
        try:
            srv = ThreadingHTTPServer(('', p), EcoHotelHandler)
            servers.append((p, srv))
        except Exception as e:
            print(f"[EcoHotel OS] Notice: Port {p} unavailable: {e}")

    if not servers:
        print("[EcoHotel OS] Error: Could not bind to any port!")
        return

    print("==================================================")
    print(f"[EcoHotel OS] Unified Production Server Running")
    for p, _ in servers:
        print(f"   Dashboard & Static: http://localhost:{p}/")
        print(f"   REST Database API:  http://localhost:{p}/api/db")
        print(f"   Real-time SSE:      http://localhost:{p}/api/events")
    print("==================================================")

    for p, srv in servers[1:]:
        t = threading.Thread(target=srv.serve_forever, daemon=True)
        t.start()

    try:
        servers[0][1].serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        for _, srv in servers:
            srv.server_close()

if __name__ == '__main__':
    p1 = 3000
    p2 = 8000
    if len(sys.argv) > 1:
        try:
            p1 = int(sys.argv[1])
        except ValueError:
            pass
    if len(sys.argv) > 2:
        try:
            p2 = int(sys.argv[2])
        except ValueError:
            pass
    run(p1, p2)

